#!/usr/bin/env bash
# ============================================================================
# restore-rehearsal.sh — Ensayo MENSUAL de restauración (manual)
#
# Prueba el ciclo de recuperación contra el último export almacenado en R2:
#   descargar -> verificar checksum -> descifrar (clave OFFLINE) -> extraer ->
#   validar manifiesto. Si se pasa --target (BD DESECHABLE), además carga los
#   datos y compara conteos cargados vs manifiesto.
#
# La clave privada `age` NUNCA vive en CI: por eso este ensayo es manual.
#
# Uso:
#   AGE_IDENTITY_FILE=~/keys/medclinic-backup.agekey scripts/backup/restore-rehearsal.sh
#   AGE_IDENTITY_FILE=... scripts/backup/restore-rehearsal.sh --target "postgresql://...desechable..."
# ============================================================================

set -euo pipefail
SCRIPT_NAME="restore-rehearsal"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

TARGET_DB=""; WANT_KEY=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) TARGET_DB="$2"; shift 2 ;;
    --key)    WANT_KEY="$2";  shift 2 ;;
    *) echo "Argumento desconocido: $1" >&2; exit 64 ;;
  esac
done

require_env AGE_IDENTITY_FILE
[[ -f "$AGE_IDENTITY_FILE" ]] || { log_error "AGE_IDENTITY_FILE no existe"; exit 1; }
PROD_HOST="db.gzojhcjymqtjswxqgkgk"
[[ -n "$TARGET_DB" && "$TARGET_DB" == *"$PROD_HOST"* ]] && { log_error "Destino = PRODUCCIÓN. Usa una BD desechable."; exit 1; }

HC_URL="${HEALTHCHECKS_URL_VERIFY:-}"
WORKDIR="$(mktemp -d)"; trap 'rm -rf "$WORKDIR"' EXIT
r2_setup
hc_ping "$HC_URL" "/start"
log_info "Ensayo iniciado" "when=$(mx_human)"

if [[ -z "$WANT_KEY" ]]; then
  WANT_KEY="$(r2 ls "s3://${R2_BUCKET}/${R2_PREFIX_DB}/" --recursive \
    | grep -E '\.tar\.gz\.age$' | sort | tail -1 | awk '{print $4}')"
fi
[[ -z "$WANT_KEY" ]] && { log_error "No hay artefacto en R2"; exit 1; }
log_info "Artefacto" "key=$WANT_KEY"

LOCAL_AGE="${WORKDIR}/$(basename "$WANT_KEY")"
r2 cp "s3://${R2_BUCKET}/${WANT_KEY}"        "$LOCAL_AGE"
r2 cp "s3://${R2_BUCKET}/${WANT_KEY}.sha256" "${LOCAL_AGE}.sha256" || true
if [[ -f "${LOCAL_AGE}.sha256" ]]; then
  EXP="$(grep '^sha256=' "${LOCAL_AGE}.sha256" | cut -d= -f2)"
  ACT="$(sha256sum "$LOCAL_AGE" | awk '{print $1}')"
  [[ "$EXP" == "$ACT" ]] || { log_error "Checksum no coincide"; exit 1; }
  log_info "Checksum OK" "sha256=$ACT"
fi

log_info "Descifrando y extrayendo"
age -d -i "$AGE_IDENTITY_FILE" "$LOCAL_AGE" | tar -xzf - -C "$WORKDIR"
[[ -f "${WORKDIR}/manifest.json" ]] || { log_error "Sin manifest.json en el archivo"; exit 1; }

echo "=== Conteos del manifiesto (lo que contiene el backup) ==="
python3 -c "
import json
m=json.load(open('${WORKDIR}/manifest.json'))
for t,n in sorted(m['tables'].items()): print(f'  {t:24s} {n}')
print(f'  {\"TOTAL filas\":24s} {sum(m[\"tables\"].values())}')
print(f'  {\"auth_users\":24s} {m.get(\"auth_users\",0)}')
"

FAIL=0
if [[ -n "$TARGET_DB" ]]; then
  log_info "Cargando en BD desechable y comparando conteos (requiere psql + esquema aplicado)"
  python3 "${SCRIPT_DIR}/restore-db.py" --dir "$WORKDIR" --target "$TARGET_DB" --truncate || FAIL=1
else
  log_info "Modo archive-only (sin --target): se valida descifrado + manifiesto"
fi

if (( FAIL == 0 )); then
  hc_ping "$HC_URL" "" "OK rehearsal key=$(basename "$WANT_KEY")"
  echo "✅ Ensayo OK. Registra la fecha en DRP.md (§14 bitácora)."
  exit 0
else
  notify_failure "$HC_URL" "Ensayo de restauración FALLÓ" "Revisar carga en BD desechable. Artefacto: ${WANT_KEY}."
  exit 1
fi
