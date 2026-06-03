#!/usr/bin/env bash
# ============================================================================
# verify-backup.sh — Verificación semanal de integridad del último respaldo
#
# Prueba que el artefacto ALMACENADO en R2 está íntegro y es descargable,
# SIN descifrarlo (no requiere la clave privada -> se mantiene offline).
#
# Flujo:
#   1. Encuentra el .age más reciente bajo db/ en R2.
#   2. Descarga el .age y su sidecar .sha256.
#   3. Recalcula SHA-256 del .age y lo compara con el sidecar.
#   4. Verifica antigüedad: el último backup no debe tener más de ~16 h
#      (entre el slot 1900 de ayer y el 1200 de hoy hay <17 h).
#   5. Ping de éxito / alerta en fallo.
#
# La verificación CON descifrado + restore real es mensual y manual:
#   scripts/backup/restore-rehearsal.sh (usa la clave privada offline).
# ============================================================================

set -euo pipefail
SCRIPT_NAME="verify-backup"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
HC_URL="${HEALTHCHECKS_URL_VERIFY:-}"
MAX_AGE_HOURS="${VERIFY_MAX_AGE_HOURS:-20}"

on_error() {
  notify_failure "$HC_URL" \
    "Verificación de backup FALLÓ (línea $1)" \
    "La verificación semanal de integridad del backup falló en $(mx_human). Revisar el job."
}
trap 'on_error $LINENO' ERR

r2_setup
hc_ping "$HC_URL" "/start"
log_info "Verificación iniciada" "when=$(mx_human)"

# ---- 1. Último .age en R2 -------------------------------------------------
LATEST="$(r2 ls "s3://${R2_BUCKET}/${R2_PREFIX_DB}/" --recursive \
  | grep -E '\.tar\.gz\.age$' | sort | tail -1)"
[[ -z "$LATEST" ]] && { log_error "No hay backups en R2"; exit 1; }

LATEST_KEY="$(echo "$LATEST" | awk '{print $4}')"
LATEST_DATE="$(echo "$LATEST" | awk '{print $1}')"   # YYYY-MM-DD (fecha de subida)
LATEST_TIME="$(echo "$LATEST" | awk '{print $2}')"
log_info "Último backup" "key=$LATEST_KEY" "uploaded=${LATEST_DATE}T${LATEST_TIME}Z"

# ---- 2. Descargar .age + sidecar ------------------------------------------
LOCAL_AGE="${WORKDIR}/$(basename "$LATEST_KEY")"
LOCAL_SHA="${LOCAL_AGE}.sha256"
r2 cp "s3://${R2_BUCKET}/${LATEST_KEY}"        "$LOCAL_AGE"
r2 cp "s3://${R2_BUCKET}/${LATEST_KEY}.sha256" "$LOCAL_SHA"

# ---- 3. Comparar checksum -------------------------------------------------
EXPECTED="$(grep '^sha256=' "$LOCAL_SHA" | head -1 | cut -d= -f2)"
ACTUAL="$(sha256sum "$LOCAL_AGE" | awk '{print $1}')"
if [[ -z "$EXPECTED" ]]; then
  log_error "Sidecar sin línea sha256="; exit 1
fi
if [[ "$EXPECTED" != "$ACTUAL" ]]; then
  log_error "CHECKSUM NO COINCIDE — artefacto corrupto" "expected=$EXPECTED" "actual=$ACTUAL"
  exit 1
fi
log_info "Checksum OK" "sha256=$ACTUAL"

# ---- 4. Antigüedad del último backup --------------------------------------
UPLOAD_EPOCH="$(${DATE_BIN} -d "${LATEST_DATE} ${LATEST_TIME}" +%s 2>/dev/null || echo 0)"
NOW_EPOCH="$(${DATE_BIN} +%s)"
AGE_H=$(( (NOW_EPOCH - UPLOAD_EPOCH) / 3600 ))
log_info "Antigüedad del último backup" "hours=$AGE_H"
if (( UPLOAD_EPOCH > 0 && AGE_H > MAX_AGE_HOURS )); then
  log_error "El último backup es demasiado viejo" "hours=$AGE_H" "max=$MAX_AGE_HOURS"
  exit 1
fi

# ---- 5. Éxito -------------------------------------------------------------
SIZE="$(wc -c < "$LOCAL_AGE" | tr -d ' ')"
hc_ping "$HC_URL" "" "OK verify key=$(basename "$LATEST_KEY") sha=$ACTUAL age_h=$AGE_H"
log_info "Verificación COMPLETADA" "key=$LATEST_KEY" "bytes=$SIZE" "age_h=$AGE_H"
trap - ERR
exit 0
