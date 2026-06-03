#!/usr/bin/env bash
# ============================================================================
# backup-db.sh — Backup lógico completo de la BD de MedClinic Pro (vía API)
#
# Exporta TODOS los datos vía la API de Supabase (PostgREST + Auth Admin API),
# sin password de BD y SIN tocar producción (solo lectura). Ver export-db.py
# para el porqué (restricción IPv4/pooler) y los detalles.
#
# Flujo:
#   1. export-db.py  → NDJSON por tabla + auth_users.ndjson + manifest.json.
#   2. Validación (smoke) sobre el manifiesto: tablas clave presentes y
#      total de filas > 0  ("un backup que no se valida no es un backup").
#   3. Empaqueta en tar.gz consistente.
#   4. SHA-256 → sidecar.
#   5. Cifra con `age` usando SOLO la clave pública (anti-ransomware).
#   6. Sube a Cloudflare R2 (offsite, inmutable) + verifica el objeto remoto.
#   7. Purga GFS. 8. Ping de éxito. En cualquier fallo: email + ping /fail.
#
# Variables: SUPABASE_URL  SUPABASE_SERVICE_ROLE_KEY  R2_*  AGE_PUBLIC_KEY
#            HEALTHCHECKS_URL_DB_<slot>  RESEND_API_KEY  ALERT_EMAIL
#
# Uso:
#   scripts/backup/backup-db.sh
#   BACKUP_SLOT=1200 scripts/backup/backup-db.sh
#   DRY_RUN=1 scripts/backup/backup-db.sh       # sube a prefijo test/, no purga
# ============================================================================

set -euo pipefail
SCRIPT_NAME="backup-db"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

# ---- Configuración --------------------------------------------------------
SLOT="$(mx_slot)"
STAMP="$(mx_date)"
BASENAME="medclinic_db_${STAMP}_${SLOT}"
WORKDIR="$(mktemp -d)"
export EXPORT_DIR="${WORKDIR}/export"
TARBALL="${WORKDIR}/${BASENAME}.tar.gz"
ENC_FILE="${TARBALL}.age"
SHA_FILE="${ENC_FILE}.sha256"
DRY_RUN="${DRY_RUN:-0}"

if [[ "$SLOT" == "1200" ]]; then HC_URL="${HEALTHCHECKS_URL_DB_1200:-}"; else HC_URL="${HEALTHCHECKS_URL_DB_1900:-}"; fi

DEST_PREFIX="${R2_PREFIX_DB}"
[[ "$DRY_RUN" == "1" ]] && DEST_PREFIX="test/${R2_PREFIX_DB}"

cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT
on_error() {
  notify_failure "$HC_URL" \
    "Backup BD ${STAMP}/${SLOT} FALLÓ (línea $1)" \
    "El backup de base de datos falló en $(mx_human). Revisar logs del job."
}
trap 'on_error $LINENO' ERR

# ---- Validación -----------------------------------------------------------
require_env SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY AGE_PUBLIC_KEY
r2_setup
log_info "Backup iniciado" "slot=$SLOT" "stamp=$STAMP" "dry_run=$DRY_RUN" "when=$(mx_human)"
hc_ping "$HC_URL" "/start"

# ---- 1. Export vía API (con reintentos) -----------------------------------
log_info "Exportando datos vía API de Supabase"
with_retry 3 5 -- python3 "${SCRIPT_DIR}/export-db.py"
MANIFEST="${EXPORT_DIR}/manifest.json"
[[ -f "$MANIFEST" ]] || { log_error "No se generó manifest.json"; exit 1; }

# ---- 2. Validación (smoke) sobre el manifiesto ----------------------------
# Las tablas clave deben existir en el manifiesto (>=0 filas las vacías como
# appointment_types son válidas) y el total global debe ser > 0.
python3 - "$MANIFEST" <<'PY'
import json, sys
m = json.load(open(sys.argv[1]))
required = ["patients", "clinical_notes", "appointments", "prescriptions",
            "invoices", "audit_logs", "cie10_codes", "medications"]
tables = m.get("tables", {})
missing = [t for t in required if t not in tables]
if missing:
    print(f"VALIDACIÓN FALLÓ: faltan tablas clave en el export: {missing}", file=sys.stderr)
    sys.exit(1)
total = sum(tables.values())
if total <= 0:
    print("VALIDACIÓN FALLÓ: total de filas = 0", file=sys.stderr)
    sys.exit(1)
# Tablas clínicas que no deberían venir vacías si la app está en uso:
for t in ("patients", "clinical_notes", "appointments"):
    if tables.get(t, 0) <= 0:
        print(f"VALIDACIÓN FALLÓ: tabla clínica vacía: {t}", file=sys.stderr)
        sys.exit(1)
print(f"Validación OK: {len(tables)} tablas, {total} filas, {m.get('auth_users',0)} usuarios auth")
PY
log_info "Validación de manifiesto OK"

# ---- 3. Empaquetar (tar.gz determinista) ----------------------------------
tar -czf "$TARBALL" -C "$EXPORT_DIR" .
TAR_BYTES="$(wc -c < "$TARBALL" | tr -d ' ')"
log_info "Tarball generado" "file=${BASENAME}.tar.gz" "bytes=$TAR_BYTES"
(( TAR_BYTES < 256 )) && { log_error "Tarball sospechosamente pequeño" "bytes=$TAR_BYTES"; exit 1; }

# ---- 4. Checksum del contenido en claro -----------------------------------
PLAIN_SHA="$(sha256sum "$TARBALL" | awk '{print $1}')"

# ---- 5. Cifrado con age (solo clave pública) ------------------------------
command -v age >/dev/null 2>&1 || { log_error "binario 'age' no encontrado"; exit 1; }
age -r "$AGE_PUBLIC_KEY" -o "$ENC_FILE" "$TARBALL"
rm -f "$TARBALL"
ENC_SHA="$(sha256sum "$ENC_FILE" | awk '{print $1}')"
# Resumen de conteos para el sidecar (auditable sin descifrar).
COUNTS="$(python3 -c "import json;m=json.load(open('$MANIFEST'));print('tables=%d rows=%d auth=%d'%(len(m['tables']),sum(m['tables'].values()),m.get('auth_users',0)))")"
cat > "$SHA_FILE" <<EOF
sha256=${ENC_SHA}
plain_sha256=${PLAIN_SHA}
plain_bytes=${TAR_BYTES}
slot=${SLOT}
summary=${COUNTS}
created_mx=$(mx_human)
created_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
log_info "Tarball cifrado" "enc_sha256=$ENC_SHA" "summary=$COUNTS"

# ---- 6. Subida a R2 + verificación ----------------------------------------
DEST_DUMP="s3://${R2_BUCKET}/${DEST_PREFIX}/${BASENAME}.tar.gz.age"
DEST_SHA="${DEST_DUMP}.sha256"
upload() { r2 cp "$ENC_FILE" "$DEST_DUMP" && r2 cp "$SHA_FILE" "$DEST_SHA"; }
log_info "Subiendo a R2" "dest=$DEST_DUMP"
with_retry 4 5 -- upload
REMOTE_SIZE="$(r2api head-object --bucket "$R2_BUCKET" \
  --key "${DEST_PREFIX}/${BASENAME}.tar.gz.age" \
  --query 'ContentLength' --output text 2>/dev/null || echo "0")"
LOCAL_SIZE="$(wc -c < "$ENC_FILE" | tr -d ' ')"
[[ "$REMOTE_SIZE" == "$LOCAL_SIZE" ]] || { log_error "Tamaño remoto != local" "remote=$REMOTE_SIZE" "local=$LOCAL_SIZE"; exit 1; }
log_info "Subida verificada" "remote_bytes=$REMOTE_SIZE"

# ---- 7. Purga GFS ---------------------------------------------------------
if [[ "$DRY_RUN" == "1" ]]; then log_info "DRY_RUN: se omite purga GFS"; else purge_gfs || log_warn "purge_gfs con advertencias"; fi

# ---- 8. Éxito -------------------------------------------------------------
hc_ping "$HC_URL" "" "OK ${BASENAME} bytes=${LOCAL_SIZE} ${COUNTS}"
log_info "Backup COMPLETADO" "artifact=${BASENAME}.tar.gz.age" "bytes=$LOCAL_SIZE"
trap - ERR
exit 0
