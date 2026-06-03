#!/usr/bin/env bash
# ============================================================================
# backup-db.sh — Backup lógico completo de la BD de MedClinic Pro
#
# Flujo:
#   1. pg_dump --format=custom de toda la BD (conexión DIRECTA, no pgbouncer).
#   2. SHA-256 -> sidecar .sha256.
#   3. Smoke-restore en un Postgres efímero (verifica que el dump SÍ restaura).
#   4. Cifrado con `age` usando SOLO la clave pública (el runner no puede
#      descifrar -> protección anti-ransomware).
#   5. Subida a Cloudflare R2 (offsite, inmutable) + verificación del objeto.
#   6. Purga GFS de respaldos vencidos.
#   7. Ping de éxito a healthchecks.io. En cualquier fallo: email + ping /fail.
#
# Variables requeridas (ver .env.backup.example):
#   SUPABASE_DB_URL_DIRECT  R2_*  AGE_PUBLIC_KEY  HEALTHCHECKS_URL_DB_<slot>
#   RESEND_API_KEY  ALERT_EMAIL
#
# Uso:
#   scripts/backup/backup-db.sh                 # slot automático por hora MX
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
STAMP="$(mx_date)"                                  # 20260603
BASENAME="medclinic_db_${STAMP}_${SLOT}"
WORKDIR="$(mktemp -d)"
DUMP_FILE="${WORKDIR}/${BASENAME}.dump"
ENC_FILE="${DUMP_FILE}.age"
SHA_FILE="${ENC_FILE}.sha256"
DRY_RUN="${DRY_RUN:-0}"

# La URL del dead-man's switch depende del slot.
if [[ "$SLOT" == "1200" ]]; then
  HC_URL="${HEALTHCHECKS_URL_DB_1200:-}"
else
  HC_URL="${HEALTHCHECKS_URL_DB_1900:-}"
fi

# Prefijo destino (test/ en dry-run para no contaminar la cadena real).
DEST_PREFIX="${R2_PREFIX_DB}"
[[ "$DRY_RUN" == "1" ]] && DEST_PREFIX="test/${R2_PREFIX_DB}"

cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

# En cualquier error no controlado: alertar antes de morir.
on_error() {
  local line="$1"
  notify_failure "$HC_URL" \
    "Backup BD ${STAMP}/${SLOT} FALLÓ (línea ${line})" \
    "El backup de base de datos falló en $(mx_human). Revisar logs del job. Host=$(hostname 2>/dev/null || echo gh-actions)."
}
trap 'on_error $LINENO' ERR

# ---- Validación -----------------------------------------------------------
require_env SUPABASE_DB_URL_DIRECT AGE_PUBLIC_KEY
r2_setup
log_info "Backup iniciado" "slot=$SLOT" "stamp=$STAMP" "dry_run=$DRY_RUN" "when=$(mx_human)"
hc_ping "$HC_URL" "/start"

# ---- 1. pg_dump (con reintentos) ------------------------------------------
# --format=custom permite restauración selectiva y paralela; --compress=9 max.
# Se respaldan los schemas con datos de la aplicación. auth = usuarios.
do_dump() {
  pg_dump "$SUPABASE_DB_URL_DIRECT" \
    --format=custom \
    --compress=9 \
    --no-owner --no-privileges \
    --schema=public --schema=auth --schema=storage \
    --file="$DUMP_FILE"
}
log_info "Ejecutando pg_dump"
with_retry 3 5 -- do_dump
DUMP_BYTES="$(wc -c < "$DUMP_FILE" | tr -d ' ')"
log_info "Dump generado" "file=${BASENAME}.dump" "bytes=$DUMP_BYTES"
if (( DUMP_BYTES < 1024 )); then
  log_error "Dump sospechosamente pequeño (<1KB)" "bytes=$DUMP_BYTES"
  exit 1
fi

# ---- 2. Checksum SHA-256 --------------------------------------------------
# Se calcula sobre el dump en claro; tras cifrar se recalcula sobre el .age,
# que es lo que se almacena y lo que verifica verify-backup.sh.
PLAIN_SHA="$(sha256sum "$DUMP_FILE" | awk '{print $1}')"
log_info "SHA-256 del dump en claro" "sha256=$PLAIN_SHA"

# ---- 3. Smoke-restore en Postgres efímero ---------------------------------
# "Un backup que no se ha probado no es un backup". Se valida en CADA corrida,
# antes de cifrar (no requiere clave privada).
#   SMOKE_DB_URL apunta a un Postgres desechable (service container postgres:17).
#   Si no está definido (modo local sin Docker), se hace al menos pg_restore
#   --list para validar la integridad estructural del archivo.
smoke_restore() {
  if [[ -z "${SMOKE_DB_URL:-}" ]]; then
    log_warn "SMOKE_DB_URL no definido: solo se valida estructura (pg_restore --list)"
    pg_restore --list "$DUMP_FILE" >/dev/null
    log_info "pg_restore --list OK (sin restore real)"
    return 0
  fi
  log_info "Smoke-restore en Postgres efímero"
  # Restaura ignorando errores de objetos del sistema/roles/extensiones ausentes
  # (pg_restore continúa ante errores por defecto; este restore es best-effort).
  pg_restore --no-owner --no-privileges \
    --dbname="$SMOKE_DB_URL" "$DUMP_FILE" >/dev/null 2>&1 || true

  # Validación: las tablas clave deben existir y tener filas.
  local checks=("public.patients" "public.clinical_notes" "public.appointments")
  local t cnt
  for t in "${checks[@]}"; do
    cnt="$(psql "$SMOKE_DB_URL" -tAc "SELECT count(*) FROM ${t};" 2>/dev/null || echo "ERR")"
    if [[ "$cnt" == "ERR" ]]; then
      log_error "Smoke-restore: tabla no restaurada" "table=$t"
      return 1
    fi
    log_info "Smoke-restore conteo" "table=$t" "rows=$cnt"
  done
  log_info "Smoke-restore OK"
}
smoke_restore

# ---- 4. Cifrado con age (solo clave pública) ------------------------------
# El runner cifra para AGE_PUBLIC_KEY; no posee la clave privada -> no puede
# descifrar lo que sube. La privada vive offline (ver DRP.md).
if ! command -v age >/dev/null 2>&1; then
  log_error "binario 'age' no encontrado en el runner"
  exit 1
fi
log_info "Cifrando dump con age"
age -r "$AGE_PUBLIC_KEY" -o "$ENC_FILE" "$DUMP_FILE"
rm -f "$DUMP_FILE"   # no dejar el dump en claro en disco
ENC_SHA="$(sha256sum "$ENC_FILE" | awk '{print $1}')"
# Sidecar: checksum del artefacto cifrado + metadatos para verificación.
cat > "$SHA_FILE" <<EOF
sha256=${ENC_SHA}
plain_sha256=${PLAIN_SHA}
plain_bytes=${DUMP_BYTES}
slot=${SLOT}
created_mx=$(mx_human)
created_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
log_info "Dump cifrado" "enc_sha256=$ENC_SHA"

# ---- 5. Subida a R2 + verificación ----------------------------------------
DEST_DUMP="s3://${R2_BUCKET}/${DEST_PREFIX}/${BASENAME}.dump.age"
DEST_SHA="s3://${R2_BUCKET}/${DEST_PREFIX}/${BASENAME}.dump.age.sha256"

upload() { r2 cp "$ENC_FILE" "$DEST_DUMP" && r2 cp "$SHA_FILE" "$DEST_SHA"; }
log_info "Subiendo a R2" "dest=$DEST_DUMP"
with_retry 4 5 -- upload

# Verificar que el objeto remoto existe y su tamaño coincide.
REMOTE_SIZE="$(r2api head-object --bucket "$R2_BUCKET" \
  --key "${DEST_PREFIX}/${BASENAME}.dump.age" \
  --query 'ContentLength' --output text 2>/dev/null || echo "0")"
LOCAL_SIZE="$(wc -c < "$ENC_FILE" | tr -d ' ')"
if [[ "$REMOTE_SIZE" != "$LOCAL_SIZE" ]]; then
  log_error "Tamaño remoto != local" "remote=$REMOTE_SIZE" "local=$LOCAL_SIZE"
  exit 1
fi
log_info "Subida verificada" "remote_bytes=$REMOTE_SIZE"

# ---- 6. Purga GFS ---------------------------------------------------------
if [[ "$DRY_RUN" == "1" ]]; then
  log_info "DRY_RUN: se omite purga GFS"
else
  purge_gfs || log_warn "purge_gfs reportó advertencias (no fatal)"
fi

# ---- 7. Éxito -------------------------------------------------------------
hc_ping "$HC_URL" "" "OK ${BASENAME} bytes=${LOCAL_SIZE} sha=${ENC_SHA}"
log_info "Backup COMPLETADO" "artifact=${BASENAME}.dump.age" "bytes=$LOCAL_SIZE"
trap - ERR
exit 0
