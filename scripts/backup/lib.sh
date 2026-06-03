#!/usr/bin/env bash
# ============================================================================
# lib.sh — Funciones compartidas del tooling de backup de MedClinic Pro
#
# Se obtiene con `source` desde los demás scripts. NO ejecutar directamente.
# Todo secreto se lee por variable de entorno; nada hardcodeado.
#
# Convenciones:
#   - Zona horaria de negocio: America/Mexico_City (UTC-6 fijo, sin DST).
#   - Logs estructurados en JSON a stdout (los captura GitHub Actions / cron).
#   - Códigos de salida: 0 OK, !=0 fallo (dispara alerta + ping de fail).
# ============================================================================

set -euo pipefail

# Zona horaria de negocio. Se usa para fechar y elegir el slot (1200/1900).
export MX_TZ="America/Mexico_City"

# Prefijos lógicos dentro del bucket R2 (un solo bucket, varios prefijos).
readonly R2_PREFIX_DB="db"
readonly R2_PREFIX_CODE="code"
readonly R2_PREFIX_ASSETS="assets"

# ----------------------------------------------------------------------------
# Logging estructurado
# ----------------------------------------------------------------------------
# Uso: log <nivel> <mensaje> [clave=valor ...]
log() {
  local level="$1"; shift
  local msg="$1"; shift
  local ts
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  local extra="{}"
  if [[ $# -gt 0 ]]; then
    extra="{"
    local first=1
    local kv
    for kv in "$@"; do
      local k="${kv%%=*}"
      local v="${kv#*=}"
      [[ $first -eq 1 ]] && first=0 || extra+=","
      extra+="\"${k}\":\"${v//\"/\\\"}\""
    done
    extra+="}"
  fi
  printf '{"ts":"%s","level":"%s","script":"%s","msg":"%s","ctx":%s}\n' \
    "$ts" "$level" "${SCRIPT_NAME:-backup}" "${msg//\"/\\\"}" "$extra"
}
log_info()  { log "INFO"  "$@"; }
log_warn()  { log "WARN"  "$@"; }
log_error() { log "ERROR" "$@" >&2; }

# ----------------------------------------------------------------------------
# Validación de entorno
# ----------------------------------------------------------------------------
# Uso: require_env VAR1 VAR2 ...  -> aborta si alguna falta o está vacía.
require_env() {
  local missing=()
  local v
  for v in "$@"; do
    if [[ -z "${!v:-}" ]]; then
      missing+=("$v")
    fi
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    log_error "Faltan variables de entorno requeridas" "vars=${missing[*]}"
    exit 78  # EX_CONFIG
  fi
}

# ----------------------------------------------------------------------------
# Tiempo en zona horaria de México
# ----------------------------------------------------------------------------
mx_date()      { TZ="$MX_TZ" date +%Y%m%d; }              # 20260603
mx_timestamp() { TZ="$MX_TZ" date +%Y%m%d_%H%M%S; }       # 20260603_120015
mx_human()     { TZ="$MX_TZ" date "+%Y-%m-%d %H:%M:%S %Z"; }

# Devuelve el slot del backup según la hora de México:
#   - 1200 si la corrida es de la mañana/mediodía (00:00–15:59 MX)
#   - 1900 si es de la tarde/noche (16:00–23:59 MX)
# Permite override explícito con la variable BACKUP_SLOT (útil para tests
# y para forzar el slot desde el workflow).
mx_slot() {
  if [[ -n "${BACKUP_SLOT:-}" ]]; then
    echo "$BACKUP_SLOT"
    return
  fi
  local hour
  hour="$(TZ="$MX_TZ" date +%H)"
  # 10#$hour fuerza base decimal (evita error con "08"/"09" como octal).
  if (( 10#$hour < 16 )); then echo "1200"; else echo "1900"; fi
}

# ----------------------------------------------------------------------------
# Reintentos con backoff exponencial
# ----------------------------------------------------------------------------
# Uso: with_retry <intentos> <segundos_base> -- comando args...
with_retry() {
  local attempts="$1"; local base="$2"; shift 2
  [[ "$1" == "--" ]] && shift
  local n=1
  local delay
  until "$@"; do
    if (( n >= attempts )); then
      log_error "Comando falló tras ${attempts} intentos" "cmd=$1"
      return 1
    fi
    delay=$(( base * (2 ** (n - 1)) ))
    log_warn "Reintento ${n}/${attempts} en ${delay}s" "cmd=$1"
    sleep "$delay"
    (( n++ ))
  done
  return 0
}

# ----------------------------------------------------------------------------
# Healthchecks.io — dead-man's switch
# ----------------------------------------------------------------------------
# Cada check tiene su propia URL (un secreto por job). Si no se define la URL,
# se omite el ping (modo local) sin romper.
#   hc_ping <url>          -> success
#   hc_ping <url> /start   -> inicio de ejecución
#   hc_ping <url> /fail    -> fallo (con cuerpo = últimas líneas del log)
hc_ping() {
  local url="${1:-}"
  local suffix="${2:-}"
  [[ -z "$url" ]] && { log_warn "Sin HEALTHCHECKS URL; se omite ping"; return 0; }
  curl -fsS -m 10 --retry 3 --retry-delay 2 \
    --data-raw "${3:-}" \
    "${url}${suffix}" >/dev/null 2>&1 \
    || log_warn "Ping a healthchecks.io falló" "suffix=${suffix:-success}"
}

# ----------------------------------------------------------------------------
# Alerta por email (Resend)
# ----------------------------------------------------------------------------
# Requiere RESEND_API_KEY y ALERT_EMAIL. From fijo institucional.
send_alert_email() {
  local subject="$1"; local body="$2"
  if [[ -z "${RESEND_API_KEY:-}" || -z "${ALERT_EMAIL:-}" ]]; then
    log_warn "Sin RESEND_API_KEY/ALERT_EMAIL; se omite email"
    return 0
  fi
  local payload
  payload="$(cat <<JSON
{
  "from": "MedClinic Backups <noreply@mediaclinic.mx>",
  "to": ["${ALERT_EMAIL}"],
  "subject": "${subject}",
  "text": $(printf '%s' "$body" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
}
JSON
)"
  curl -fsS -m 15 -X POST "https://api.resend.com/emails" \
    -H "Authorization: Bearer ${RESEND_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$payload" >/dev/null 2>&1 \
    && log_info "Alerta enviada por email" "to=${ALERT_EMAIL}" \
    || log_warn "Envío de email de alerta falló"
}

# ----------------------------------------------------------------------------
# Alerta por WhatsApp — PENDIENTE (fase posterior)
# ----------------------------------------------------------------------------
# Gancho declarado a propósito. Se activará en una fase futura usando la
# Meta Cloud API (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN ya existen
# en el proyecto). Hoy es un no-op que solo deja rastro en el log.
alert_whatsapp() {
  local msg="$1"
  log_info "alert_whatsapp (pendiente, no implementado)" "preview=${msg:0:60}"
  return 0
}

# ----------------------------------------------------------------------------
# Notificación unificada de fallo: email + (futuro) WhatsApp + ping de fail.
# Uso: notify_failure <hc_url> <asunto> <cuerpo>
# ----------------------------------------------------------------------------
notify_failure() {
  local hc_url="$1"; local subject="$2"; local body="$3"
  log_error "FALLO: ${subject}"
  send_alert_email "🔴 [MedClinic Backup] ${subject}" "$body"
  alert_whatsapp "🔴 ${subject}"
  hc_ping "$hc_url" "/fail" "$body"
}

# ----------------------------------------------------------------------------
# Cliente S3 para Cloudflare R2
# ----------------------------------------------------------------------------
# Exporta las credenciales en el formato que espera el AWS CLI y define un
# wrapper `r2` que siempre pasa el endpoint de R2. R2 es S3-compatible.
r2_setup() {
  require_env R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_ENDPOINT R2_BUCKET
  export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
  export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
  export AWS_DEFAULT_REGION="auto"          # R2 ignora la región pero el CLI la exige
  export AWS_REQUEST_CHECKSUM_CALCULATION="when_required"  # compat R2 (AWS CLI v2.23+)
  export AWS_RESPONSE_CHECKSUM_VALIDATION="when_required"
}

# Wrapper: r2 <subcomando-s3> ...   (p.ej. r2 cp file s3://bucket/key)
r2() {
  aws s3 "$@" --endpoint-url "$R2_ENDPOINT"
}
# Wrapper para la API s3api (head-object, list-object-versions, etc.)
r2api() {
  aws s3api "$@" --endpoint-url "$R2_ENDPOINT"
}

# ----------------------------------------------------------------------------
# Purga GFS (Grandfather-Father-Son) sobre el prefijo db/ de R2
# ----------------------------------------------------------------------------
# Política:
#   - Diarios:   conservar TODO lo de los últimos 30 días.
#   - Semanales: conservar el primer dump de cada semana ISO, últimas 12 semanas.
#   - Mensuales: conservar el primer dump de cada mes, últimos 12 meses.
#   - El resto se elimina. Los objetos aún bajo Object Lock no se podrán borrar:
#     se registra y se continúa (no es error — es la protección anti-ransomware).
#
# Requiere GNU date (los runners de GitHub Actions usan Linux). En macOS local,
# instalar coreutils y exportar DATE_BIN=gdate.
DATE_BIN="${DATE_BIN:-date}"

purge_gfs() {
  local keep_daily_days="${RETENTION_DAILY_DAYS:-30}"
  local keep_weekly="${RETENTION_WEEKLY_WEEKS:-12}"
  local keep_monthly="${RETENTION_MONTHLY_MONTHS:-12}"

  local now_epoch; now_epoch="$($DATE_BIN +%s)"
  local daily_cutoff=$(( now_epoch - keep_daily_days * 86400 ))
  local weekly_cutoff=$(( now_epoch - keep_weekly * 7 * 86400 ))
  local monthly_cutoff=$(( now_epoch - keep_monthly * 31 * 86400 ))

  log_info "Iniciando purga GFS" \
    "daily=${keep_daily_days}d" "weekly=${keep_weekly}w" "monthly=${keep_monthly}m"

  # Listado de objetos .age bajo db/ (el .sha256 sigue al .age que conserva).
  local keys
  keys="$(r2 ls "s3://${R2_BUCKET}/${R2_PREFIX_DB}/" --recursive \
    | awk '{print $4}' | grep -E '\.dump\.age$' || true)"
  [[ -z "$keys" ]] && { log_info "Sin objetos para purgar"; return 0; }

  # Sets de "ya conservado" por semana/mes para quedarnos con el primero.
  declare -A seen_week seen_month
  local key fname datepart filedate fileepoch keep reason yweek ymonth

  # Procesar en orden cronológico ascendente (más viejos primero) para que
  # el "primero de la semana/mes" sea el más antiguo de ese período.
  while IFS= read -r key; do
    [[ -z "$key" ]] && continue
    fname="$(basename "$key")"                       # medclinic_db_20260603_1200.dump.age
    datepart="$(echo "$fname" | grep -oE '[0-9]{8}' | head -1)"
    [[ -z "$datepart" ]] && { log_warn "Nombre sin fecha; se conserva por seguridad" "key=$key"; continue; }
    filedate="${datepart:0:4}-${datepart:4:2}-${datepart:6:2}"
    fileepoch="$($DATE_BIN -d "$filedate" +%s 2>/dev/null || echo 0)"

    keep=0; reason=""
    if (( fileepoch >= daily_cutoff )); then
      keep=1; reason="daily"
    else
      yweek="$($DATE_BIN -d "$filedate" +%G-%V 2>/dev/null || echo "")"
      ymonth="${datepart:0:6}"
      if (( fileepoch >= weekly_cutoff )) && [[ -z "${seen_week[$yweek]:-}" ]]; then
        keep=1; reason="weekly"; seen_week[$yweek]=1
      elif (( fileepoch >= monthly_cutoff )) && [[ -z "${seen_month[$ymonth]:-}" ]]; then
        keep=1; reason="monthly"; seen_month[$ymonth]=1
      fi
    fi

    if (( keep == 1 )); then
      log_info "Conservar" "key=$key" "reason=$reason"
    else
      log_info "Purgar" "key=$key"
      if r2 rm "s3://${R2_BUCKET}/${key}" 2>/dev/null \
         && r2 rm "s3://${R2_BUCKET}/${key%.age}.sha256" 2>/dev/null; then
        log_info "Purgado" "key=$key"
      else
        log_warn "No se pudo purgar (¿Object Lock vigente?)" "key=$key"
      fi
    fi
  done <<< "$(echo "$keys" | sort -t_ -k3,4)"

  log_info "Purga GFS completada"
}
