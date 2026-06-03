#!/usr/bin/env bash
# ============================================================================
# restore-rehearsal.sh — Ensayo MENSUAL de restauración (manual)
#
# Prueba el ciclo COMPLETO de recuperación contra una BD DESECHABLE:
#   descargar -> descifrar (clave privada OFFLINE) -> restaurar -> validar.
#
# Se corre a mano porque requiere la clave privada `age`, que NUNCA vive en
# GitHub ni en R2 (anti-ransomware). Pásala por archivo o variable:
#   AGE_IDENTITY_FILE=/ruta/segura/medclinic-backup.agekey \
#     scripts/backup/restore-rehearsal.sh "postgresql://...desechable..."
#
# La BD destino DEBE ser desechable (un proyecto Supabase de pruebas o un
# Postgres local). El script REHÚSA correr si la URL apunta a producción.
#
# Uso:
#   AGE_IDENTITY_FILE=~/keys/medclinic-backup.agekey \
#   scripts/backup/restore-rehearsal.sh <SMOKE_DB_URL> [s3-key-opcional]
# ============================================================================

set -euo pipefail
SCRIPT_NAME="restore-rehearsal"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

TARGET_DB="${1:-}"
WANT_KEY="${2:-}"   # opcional: key específica en R2; por defecto, la más reciente
HC_URL="${HEALTHCHECKS_URL_VERIFY:-}"

if [[ -z "$TARGET_DB" ]]; then
  echo "Uso: AGE_IDENTITY_FILE=... $0 <SMOKE_DB_URL> [s3-key]" >&2
  exit 64
fi
require_env AGE_IDENTITY_FILE
[[ -f "$AGE_IDENTITY_FILE" ]] || { log_error "AGE_IDENTITY_FILE no existe" "path=$AGE_IDENTITY_FILE"; exit 1; }

# --- Guardarraíl: no restaurar sobre producción ----------------------------
PROD_HOST="db.gzojhcjymqtjswxqgkgk.supabase.co"
if [[ "$TARGET_DB" == *"$PROD_HOST"* || "$TARGET_DB" == *"gzojhcjymqtjswxqgkgk.pooler"* ]]; then
  log_error "RECHAZADO: la URL destino apunta a PRODUCCIÓN. Usa una BD desechable."
  exit 1
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
r2_setup
hc_ping "$HC_URL" "/start"
log_info "Ensayo de restauración iniciado" "target=${TARGET_DB%%@*}@***" "when=$(mx_human)"

# --- 1. Elegir artefacto ---------------------------------------------------
if [[ -z "$WANT_KEY" ]]; then
  WANT_KEY="$(r2 ls "s3://${R2_BUCKET}/${R2_PREFIX_DB}/" --recursive \
    | grep -E '\.dump\.age$' | sort | tail -1 | awk '{print $4}')"
fi
[[ -z "$WANT_KEY" ]] && { log_error "No se encontró artefacto en R2"; exit 1; }
log_info "Artefacto a restaurar" "key=$WANT_KEY"

LOCAL_AGE="${WORKDIR}/$(basename "$WANT_KEY")"
LOCAL_DUMP="${LOCAL_AGE%.age}"
r2 cp "s3://${R2_BUCKET}/${WANT_KEY}"        "$LOCAL_AGE"
r2 cp "s3://${R2_BUCKET}/${WANT_KEY}.sha256" "${LOCAL_AGE}.sha256" || true

# --- 2. Verificar checksum + descifrar -------------------------------------
if [[ -f "${LOCAL_AGE}.sha256" ]]; then
  EXP="$(grep '^sha256=' "${LOCAL_AGE}.sha256" | cut -d= -f2)"
  ACT="$(sha256sum "$LOCAL_AGE" | awk '{print $1}')"
  [[ "$EXP" == "$ACT" ]] || { log_error "Checksum no coincide antes de descifrar"; exit 1; }
  log_info "Checksum verificado" "sha256=$ACT"
fi
log_info "Descifrando con clave privada offline"
age -d -i "$AGE_IDENTITY_FILE" -o "$LOCAL_DUMP" "$LOCAL_AGE"
log_info "Descifrado OK" "bytes=$(wc -c < "$LOCAL_DUMP" | tr -d ' ')"

# --- 3. Restaurar en la BD desechable --------------------------------------
log_info "Restaurando en BD desechable"
pg_restore --no-owner --no-privileges --clean --if-exists \
  --dbname="$TARGET_DB" "$LOCAL_DUMP" 2>"${WORKDIR}/restore.err" || {
    log_warn "pg_restore reportó errores no fatales (revisar restore.err)"
  }

# --- 4. Validaciones -------------------------------------------------------
FAIL=0
declare -A EXPECT_MIN=(
  ["public.patients"]=1 ["public.clinical_notes"]=1 ["public.appointments"]=1
  ["public.prescriptions"]=1 ["public.invoices"]=1 ["public.audit_logs"]=1
  ["public.cie10_codes"]=1 ["public.medications"]=1
)
for t in "${!EXPECT_MIN[@]}"; do
  cnt="$(psql "$TARGET_DB" -tAc "SELECT count(*) FROM ${t};" 2>/dev/null || echo "ERR")"
  if [[ "$cnt" == "ERR" ]]; then
    log_error "Validación: tabla ausente" "table=$t"; FAIL=1
  elif (( cnt < EXPECT_MIN[$t] )); then
    log_error "Validación: conteo bajo" "table=$t" "rows=$cnt"; FAIL=1
  else
    log_info "Validación OK" "table=$t" "rows=$cnt"
  fi
done

# Integridad referencial: ¿hay notas clínicas con paciente inexistente?
ORPHANS="$(psql "$TARGET_DB" -tAc \
  "SELECT count(*) FROM public.clinical_notes n
   LEFT JOIN public.patients p ON p.id = n.patient_id
   WHERE p.id IS NULL;" 2>/dev/null || echo "ERR")"
if [[ "$ORPHANS" == "0" ]]; then
  log_info "Integridad referencial OK (0 notas huérfanas)"
else
  log_error "Integridad referencial: notas huérfanas" "count=$ORPHANS"; FAIL=1
fi

# Validar que el schema restaurado coincide con migraciones Prisma (opcional).
if command -v prisma >/dev/null 2>&1 && [[ -f "${SCRIPT_DIR}/../../apps/api/prisma/schema.prisma" ]]; then
  log_info "Comparando schema restaurado vs schema.prisma (migrate diff)"
  if DATABASE_URL="$TARGET_DB" prisma migrate diff \
      --from-url "$TARGET_DB" \
      --to-schema-datamodel "${SCRIPT_DIR}/../../apps/api/prisma/schema.prisma" \
      --exit-code >/dev/null 2>&1; then
    log_info "Schema coincide con Prisma (sin drift)"
  else
    log_warn "Hay diferencias entre el schema restaurado y schema.prisma (revisar)"
  fi
fi

# --- 5. Resultado ----------------------------------------------------------
if (( FAIL == 0 )); then
  hc_ping "$HC_URL" "" "OK rehearsal key=$(basename "$WANT_KEY")"
  log_info "ENSAYO DE RESTAURACIÓN EXITOSO" "key=$WANT_KEY"
  echo ""
  echo "✅ Ensayo OK. Registra la fecha en DRP.md (calendario de pruebas)."
  exit 0
else
  notify_failure "$HC_URL" "Ensayo de restauración FALLÓ" \
    "El ensayo mensual de restauración detectó problemas. Artefacto: ${WANT_KEY}. Revisar logs."
  exit 1
fi
