#!/usr/bin/env bash
# ============================================================================
# backup-code-assets.sh — Respaldo diario de código + assets (03:00 MX)
#
# Independiente de GitHub: produce una copia íntegra del repo y los assets y
# la deja en R2 (offsite, cifrada). Incluye:
#   1. Repo completo con historial -> `git bundle` (un solo archivo restaurable
#      con `git clone bundle`), cifrado con age.
#   2. Assets de Supabase Storage (bucket clinical-files: PDFs/QR/imágenes)
#      -> sync incremental a R2 (cada objeto cifrado con age).
#   3. Manifiesto de variables de entorno: SOLO nombres/referencias, NUNCA
#      valores. Sirve para saber qué hay que recargar al reconstruir.
#
# Uso:
#   scripts/backup/backup-code-assets.sh
#   DRY_RUN=1 scripts/backup/backup-code-assets.sh
# ============================================================================

set -euo pipefail
SCRIPT_NAME="backup-code-assets"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

STAMP="$(mx_date)"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
HC_URL="${HEALTHCHECKS_URL_CODE:-}"
DRY_RUN="${DRY_RUN:-0}"
DEST_CODE="${R2_PREFIX_CODE}"
DEST_ASSETS="${R2_PREFIX_ASSETS}"
if [[ "$DRY_RUN" == "1" ]]; then
  DEST_CODE="test/${R2_PREFIX_CODE}"; DEST_ASSETS="test/${R2_PREFIX_ASSETS}"
fi

on_error() {
  notify_failure "$HC_URL" \
    "Backup código/assets ${STAMP} FALLÓ (línea $1)" \
    "El respaldo diario de código y assets falló en $(mx_human). Revisar el job."
}
trap 'on_error $LINENO' ERR

require_env AGE_PUBLIC_KEY
r2_setup
hc_ping "$HC_URL" "/start"
log_info "Backup código/assets iniciado" "stamp=$STAMP" "dry_run=$DRY_RUN" "when=$(mx_human)"

# ---- 1. Bundle del repositorio (historial completo) -----------------------
BUNDLE="${WORKDIR}/medclinic_code_${STAMP}.bundle"
log_info "Generando git bundle (historial completo)"
git -C "$REPO_ROOT" bundle create "$BUNDLE" --all
# Verificación de integridad del bundle.
git -C "$REPO_ROOT" bundle verify "$BUNDLE" >/dev/null
BUNDLE_AGE="${BUNDLE}.age"
age -r "$AGE_PUBLIC_KEY" -o "$BUNDLE_AGE" "$BUNDLE"
rm -f "$BUNDLE"
BUNDLE_SHA="$(sha256sum "$BUNDLE_AGE" | awk '{print $1}')"
echo "sha256=${BUNDLE_SHA}" > "${BUNDLE_AGE}.sha256"
log_info "Bundle cifrado" "sha256=$BUNDLE_SHA"

upload_bundle() {
  r2 cp "$BUNDLE_AGE"            "s3://${R2_BUCKET}/${DEST_CODE}/$(basename "$BUNDLE_AGE")"
  r2 cp "${BUNDLE_AGE}.sha256"   "s3://${R2_BUCKET}/${DEST_CODE}/$(basename "$BUNDLE_AGE").sha256"
}
with_retry 4 5 -- upload_bundle
log_info "Bundle subido a R2" "dest=${DEST_CODE}/$(basename "$BUNDLE_AGE")"

# ---- 2. Manifiesto de variables de entorno (SOLO nombres) -----------------
ENV_MANIFEST="${WORKDIR}/env_manifest_${STAMP}.txt"
{
  echo "# MedClinic Pro — Manifiesto de variables de entorno"
  echo "# Generado: $(mx_human)"
  echo "# SOLO nombres/referencias. Los VALORES viven en Vercel (web+api) y"
  echo "# GitHub Actions Secrets; NUNCA se respaldan en claro."
  echo ""
  echo "## Origen: .env.example"
  if [[ -f "${REPO_ROOT}/.env.example" ]]; then
    grep -oE '^[A-Z_][A-Z0-9_]*=' "${REPO_ROOT}/.env.example" | sed 's/=$//' | sort -u
  fi
  echo ""
  echo "## Origen: .env.backup.example"
  if [[ -f "${REPO_ROOT}/.env.backup.example" ]]; then
    grep -oE '^[A-Z_][A-Z0-9_]*=' "${REPO_ROOT}/.env.backup.example" | sed 's/=$//' | sort -u
  fi
} > "$ENV_MANIFEST"
r2 cp "$ENV_MANIFEST" "s3://${R2_BUCKET}/${DEST_CODE}/$(basename "$ENV_MANIFEST")"
log_info "Manifiesto de env subido (sin valores)"

# ---- 3. Assets de Supabase Storage (incremental) --------------------------
# Lista recursiva vía REST API con service role y descarga a un espejo local,
# luego sync incremental a R2 (cada objeto se cifra con age antes de subir).
if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  log_warn "Sin SUPABASE_URL/SERVICE_ROLE_KEY: se omite respaldo de assets"
else
  BUCKET_NAME="${STORAGE_BUCKET:-clinical-files}"
  MIRROR="${WORKDIR}/assets"; mkdir -p "$MIRROR"

  # Lista no recursiva de un prefijo; imprime "file <path>" o "dir <path>".
  list_prefix() {
    local prefix="$1"
    curl -fsS -m 30 -X POST \
      "${SUPABASE_URL}/storage/v1/object/list/${BUCKET_NAME}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"prefix\":\"${prefix}\",\"limit\":1000,\"sortBy\":{\"column\":\"name\",\"order\":\"asc\"}}" \
    | python3 -c '
import json,sys
prefix = sys.argv[1]
for o in json.load(sys.stdin):
    name = o.get("name")
    if not name: continue
    full = f"{prefix}{name}"
    # Las carpetas vienen con id/metadata nulos.
    if o.get("id") is None and o.get("metadata") is None:
        print(f"dir\t{full}/")
    else:
        print(f"file\t{full}")
' "$prefix"
  }

  # Recorrido recursivo (BFS) descargando archivos.
  declare -a STACK=("")
  ASSET_COUNT=0
  while [[ ${#STACK[@]} -gt 0 ]]; do
    cur="${STACK[0]}"; STACK=("${STACK[@]:1}")
    while IFS=$'\t' read -r kind path; do
      [[ -z "$kind" ]] && continue
      if [[ "$kind" == "dir" ]]; then
        STACK+=("$path")
      else
        local_path="${MIRROR}/${path}"
        mkdir -p "$(dirname "$local_path")"
        curl -fsS -m 120 \
          "${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${path}" \
          -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
          -o "$local_path"
        ASSET_COUNT=$(( ASSET_COUNT + 1 ))
      fi
    done < <(list_prefix "$cur")
  done
  log_info "Assets descargados de Storage" "count=$ASSET_COUNT" "bucket=$BUCKET_NAME"

  # Cifrar cada asset y sync incremental a R2 (solo sube lo que cambió por tamaño/fecha).
  if (( ASSET_COUNT > 0 )); then
    ENC_DIR="${WORKDIR}/assets_enc"
    while IFS= read -r f; do
      rel="${f#"$MIRROR"/}"
      out="${ENC_DIR}/${rel}.age"
      mkdir -p "$(dirname "$out")"
      age -r "$AGE_PUBLIC_KEY" -o "$out" "$f"
    done < <(find "$MIRROR" -type f)
    sync_assets() { r2 sync "$ENC_DIR" "s3://${R2_BUCKET}/${DEST_ASSETS}/"; }
    with_retry 3 5 -- sync_assets
    log_info "Assets cifrados y sincronizados a R2" "count=$ASSET_COUNT"
  fi
fi

# ---- Éxito ----------------------------------------------------------------
hc_ping "$HC_URL" "" "OK code+assets ${STAMP} bundle_sha=${BUNDLE_SHA}"
log_info "Backup código/assets COMPLETADO"
trap - ERR
exit 0
