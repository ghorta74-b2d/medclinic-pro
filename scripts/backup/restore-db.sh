#!/usr/bin/env bash
# ============================================================================
# restore-db.sh — Restauración REAL de la base de datos (operación crítica)
#
# Recupera un dump cifrado de R2 y lo restaura sobre una BD destino. Esta es
# una operación POTENCIALMENTE DESTRUCTIVA: exige confirmación explícita y
# bloquea por defecto cualquier destino que parezca producción (a menos que
# se pase --allow-prod, que pide una segunda confirmación escrita).
#
# Requiere la clave privada `age` offline.
#
# Uso:
#   AGE_IDENTITY_FILE=~/keys/medclinic-backup.agekey \
#   scripts/backup/restore-db.sh --target "postgresql://..." [--key db/xxx.dump.age] [--allow-prod]
#
#   --target     URL Postgres destino (obligatorio)
#   --key        key específica en R2 (por defecto: la más reciente)
#   --allow-prod permite restaurar sobre producción (doble confirmación)
#   --list       solo lista los backups disponibles y sale
# ============================================================================

set -euo pipefail
SCRIPT_NAME="restore-db"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

TARGET_DB=""; WANT_KEY=""; ALLOW_PROD=0; LIST_ONLY=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) TARGET_DB="$2"; shift 2 ;;
    --key)    WANT_KEY="$2";  shift 2 ;;
    --allow-prod) ALLOW_PROD=1; shift ;;
    --list)   LIST_ONLY=1; shift ;;
    *) echo "Argumento desconocido: $1" >&2; exit 64 ;;
  esac
done

r2_setup

# --- Modo lista ------------------------------------------------------------
if (( LIST_ONLY == 1 )); then
  echo "Backups disponibles en R2 (db/):"
  r2 ls "s3://${R2_BUCKET}/${R2_PREFIX_DB}/" --recursive \
    | grep -E '\.dump\.age$' | awk '{printf "  %s %s  %10s bytes  %s\n",$1,$2,$3,$4}'
  exit 0
fi

[[ -z "$TARGET_DB" ]] && { echo "Falta --target" >&2; exit 64; }
require_env AGE_IDENTITY_FILE
[[ -f "$AGE_IDENTITY_FILE" ]] || { log_error "AGE_IDENTITY_FILE no existe"; exit 1; }

# --- Guardarraíl de producción ---------------------------------------------
PROD_HOST="gzojhcjymqtjswxqgkgk"
IS_PROD=0
[[ "$TARGET_DB" == *"$PROD_HOST"* ]] && IS_PROD=1

if (( IS_PROD == 1 && ALLOW_PROD == 0 )); then
  log_error "El destino parece PRODUCCIÓN ($PROD_HOST). Usa --allow-prod si es intencional."
  exit 1
fi

# --- Elegir artefacto ------------------------------------------------------
if [[ -z "$WANT_KEY" ]]; then
  WANT_KEY="$(r2 ls "s3://${R2_BUCKET}/${R2_PREFIX_DB}/" --recursive \
    | grep -E '\.dump\.age$' | sort | tail -1 | awk '{print $4}')"
fi
[[ -z "$WANT_KEY" ]] && { log_error "No hay artefacto para restaurar"; exit 1; }

# --- Confirmación interactiva ----------------------------------------------
echo "============================================================"
echo "  RESTAURACIÓN DE BASE DE DATOS — MedClinic Pro"
echo "============================================================"
echo "  Artefacto : ${WANT_KEY}"
echo "  Destino   : ${TARGET_DB%%@*}@*** (host oculto)"
echo "  Modo      : pg_restore --clean --if-exists (REEMPLAZA objetos)"
(( IS_PROD == 1 )) && echo "  ⚠️  DESTINO = PRODUCCIÓN"
echo "------------------------------------------------------------"
read -r -p "Escribe RESTORE para continuar: " confirm
[[ "$confirm" == "RESTORE" ]] || { echo "Cancelado."; exit 1; }
if (( IS_PROD == 1 )); then
  read -r -p "Confirma de nuevo escribiendo el nombre del host de prod: " host2
  [[ "$TARGET_DB" == *"$host2"* && -n "$host2" ]] || { echo "Host no coincide. Cancelado."; exit 1; }
fi

WORKDIR="$(mktemp -d)"; trap 'rm -rf "$WORKDIR"' EXIT
LOCAL_AGE="${WORKDIR}/$(basename "$WANT_KEY")"
LOCAL_DUMP="${LOCAL_AGE%.age}"

# --- Descargar, verificar, descifrar ---------------------------------------
log_info "Descargando" "key=$WANT_KEY"
r2 cp "s3://${R2_BUCKET}/${WANT_KEY}"        "$LOCAL_AGE"
r2 cp "s3://${R2_BUCKET}/${WANT_KEY}.sha256" "${LOCAL_AGE}.sha256" || true
if [[ -f "${LOCAL_AGE}.sha256" ]]; then
  EXP="$(grep '^sha256=' "${LOCAL_AGE}.sha256" | cut -d= -f2)"
  ACT="$(sha256sum "$LOCAL_AGE" | awk '{print $1}')"
  [[ "$EXP" == "$ACT" ]] || { log_error "Checksum no coincide. Abortando."; exit 1; }
  log_info "Checksum OK" "sha256=$ACT"
fi
log_info "Descifrando"
age -d -i "$AGE_IDENTITY_FILE" -o "$LOCAL_DUMP" "$LOCAL_AGE"

# --- Restaurar -------------------------------------------------------------
log_info "Restaurando (esto puede tardar)…"
pg_restore --no-owner --no-privileges --clean --if-exists \
  --dbname="$TARGET_DB" "$LOCAL_DUMP"

log_info "RESTAURACIÓN COMPLETADA" "key=$WANT_KEY"
echo "✅ Restauración terminada. Valida la aplicación y revisa conteos de tablas."
