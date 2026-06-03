#!/usr/bin/env bash
# ============================================================================
# restore-db.sh — Restauración REAL de datos (operación crítica, interactiva)
#
# Descarga un export cifrado de R2, lo descifra (clave privada OFFLINE), lo
# extrae y CARGA los datos en una BD destino vía restore-db.py.
#
# PRERREQUISITO: el ESQUEMA debe existir ya en el destino. Aplica migraciones:
#   cd apps/api && DATABASE_URL=<target> npx prisma migrate deploy
#
# Operación potencialmente destructiva (--truncate reemplaza datos). Exige
# confirmación explícita y bloquea destinos de producción salvo --allow-prod.
#
# Uso:
#   AGE_IDENTITY_FILE=~/keys/medclinic-backup.agekey \
#   scripts/backup/restore-db.sh --target "postgresql://..." [--key db/x.tar.gz.age] [--truncate] [--allow-prod] [--list]
# ============================================================================

set -euo pipefail
SCRIPT_NAME="restore-db"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

TARGET_DB=""; WANT_KEY=""; ALLOW_PROD=0; LIST_ONLY=0; TRUNCATE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) TARGET_DB="$2"; shift 2 ;;
    --key)    WANT_KEY="$2";  shift 2 ;;
    --truncate) TRUNCATE="--truncate"; shift ;;
    --allow-prod) ALLOW_PROD=1; shift ;;
    --list)   LIST_ONLY=1; shift ;;
    *) echo "Argumento desconocido: $1" >&2; exit 64 ;;
  esac
done
r2_setup

if (( LIST_ONLY == 1 )); then
  echo "Backups disponibles en R2 (db/):"
  r2 ls "s3://${R2_BUCKET}/${R2_PREFIX_DB}/" --recursive \
    | grep -E '\.tar\.gz\.age$' | awk '{printf "  %s %s  %10s bytes  %s\n",$1,$2,$3,$4}'
  exit 0
fi

[[ -z "$TARGET_DB" ]] && { echo "Falta --target" >&2; exit 64; }
require_env AGE_IDENTITY_FILE
[[ -f "$AGE_IDENTITY_FILE" ]] || { log_error "AGE_IDENTITY_FILE no existe"; exit 1; }

PROD_HOST="gzojhcjymqtjswxqgkgk"
IS_PROD=0; [[ "$TARGET_DB" == *"$PROD_HOST"* ]] && IS_PROD=1
if (( IS_PROD == 1 && ALLOW_PROD == 0 )); then
  log_error "El destino parece PRODUCCIÓN. Usa --allow-prod si es intencional."; exit 1
fi

if [[ -z "$WANT_KEY" ]]; then
  WANT_KEY="$(r2 ls "s3://${R2_BUCKET}/${R2_PREFIX_DB}/" --recursive \
    | grep -E '\.tar\.gz\.age$' | sort | tail -1 | awk '{print $4}')"
fi
[[ -z "$WANT_KEY" ]] && { log_error "No hay artefacto para restaurar"; exit 1; }

echo "============================================================"
echo "  RESTAURACIÓN DE DATOS — MedClinic Pro"
echo "  Artefacto : ${WANT_KEY}"
echo "  Destino   : ${TARGET_DB%%@*}@*** (host oculto)"
echo "  Modo      : ${TRUNCATE:-(append)}  $( ((IS_PROD)) && echo '⚠️ PRODUCCIÓN')"
echo "  Recuerda  : el esquema debe existir (prisma migrate deploy)"
echo "------------------------------------------------------------"
read -r -p "Escribe RESTORE para continuar: " confirm
[[ "$confirm" == "RESTORE" ]] || { echo "Cancelado."; exit 1; }
if (( IS_PROD == 1 )); then
  read -r -p "Confirma escribiendo el host de producción: " host2
  [[ -n "$host2" && "$TARGET_DB" == *"$host2"* ]] || { echo "No coincide. Cancelado."; exit 1; }
fi

WORKDIR="$(mktemp -d)"; trap 'rm -rf "$WORKDIR"' EXIT
LOCAL_AGE="${WORKDIR}/$(basename "$WANT_KEY")"
r2 cp "s3://${R2_BUCKET}/${WANT_KEY}"        "$LOCAL_AGE"
r2 cp "s3://${R2_BUCKET}/${WANT_KEY}.sha256" "${LOCAL_AGE}.sha256" || true
if [[ -f "${LOCAL_AGE}.sha256" ]]; then
  EXP="$(grep '^sha256=' "${LOCAL_AGE}.sha256" | cut -d= -f2)"
  ACT="$(sha256sum "$LOCAL_AGE" | awk '{print $1}')"
  [[ "$EXP" == "$ACT" ]] || { log_error "Checksum no coincide. Abortando."; exit 1; }
  log_info "Checksum OK"
fi
log_info "Descifrando y extrayendo"
age -d -i "$AGE_IDENTITY_FILE" "$LOCAL_AGE" | tar -xzf - -C "$WORKDIR"

log_info "Cargando datos en el destino"
python3 "${SCRIPT_DIR}/restore-db.py" --dir "$WORKDIR" --target "$TARGET_DB" $TRUNCATE

log_info "RESTAURACIÓN COMPLETADA" "key=$WANT_KEY"
echo "✅ Datos cargados. Revisa la app y los conteos. Usuarios Auth: ver auth_users.ndjson (re-invitar)."
