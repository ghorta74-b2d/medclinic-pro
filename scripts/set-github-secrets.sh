#!/usr/bin/env bash
# Configura los GitHub Actions secrets para medclinic-pro.
# Uso: edita las variables de abajo y corre: bash scripts/set-github-secrets.sh
#
# Dónde encontrar cada valor:
#   DATABASE_URL        → supabase.com/dashboard/project/gzojhcjymqtjswxqgkgk/settings/database
#                         → "Connection string" → Transaction mode (port 6543)
#   SUPABASE_URL        → ya configurado abajo (no cambia)
#   SUPABASE_SERVICE_ROLE_KEY → supabase.com/dashboard/project/gzojhcjymqtjswxqgkgk/settings/api
#                         → "Project API keys" → service_role
#   SUPABASE_JWT_SECRET → supabase.com/dashboard/project/gzojhcjymqtjswxqgkgk/settings/api
#                         → "JWT Settings" → JWT Secret
#   ANTHROPIC_API_KEY   → console.anthropic.com → API Keys

set -e

REPO="ghorta74-b2d/medclinic-pro"
# Exporta GH_TOKEN antes de correr: export GH_TOKEN="ghp_..."
GH_TOKEN="${GH_TOKEN:?'Falta GH_TOKEN — exporta: export GH_TOKEN=ghp_...'}"

# ── EDITA ESTOS VALORES ────────────────────────────────────────────────────────
DATABASE_URL="postgresql://postgres.gzojhcjymqtjswxqgkgk:PEGA_PASSWORD_AQUI@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
SUPABASE_URL="https://gzojhcjymqtjswxqgkgk.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="PEGA_SERVICE_ROLE_KEY_AQUI"
SUPABASE_JWT_SECRET="PEGA_JWT_SECRET_AQUI"
ANTHROPIC_API_KEY="PEGA_ANTHROPIC_API_KEY_AQUI"
# ──────────────────────────────────────────────────────────────────────────────

# Obtener la clave pública del repo para encriptar los secrets
echo "Obteniendo clave pública del repo..."
PUB_KEY_RESP=$(curl -s -H "Authorization: Bearer $GH_TOKEN" \
  "https://api.github.com/repos/$REPO/actions/secrets/public-key")

KEY_ID=$(echo "$PUB_KEY_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['key_id'])")
PUB_KEY=$(echo "$PUB_KEY_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['key'])")

echo "Key ID: $KEY_ID"

# Función para encriptar y subir un secret
set_secret() {
  local name="$1"
  local value="$2"

  encrypted=$(python3 - <<PYEOF
import base64, sys
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PublicKey
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import nacl.public

pub_key_bytes = base64.b64decode("$PUB_KEY")
pub_key = nacl.public.PublicKey(pub_key_bytes)
box = nacl.public.SealedBox(pub_key)
encrypted = box.encrypt("$value".encode())
print(base64.b64encode(encrypted).decode())
PYEOF
  )

  curl -s -X PUT \
    -H "Authorization: Bearer $GH_TOKEN" \
    -H "Content-Type: application/json" \
    "https://api.github.com/repos/$REPO/actions/secrets/$name" \
    -d "{\"encrypted_value\":\"$encrypted\",\"key_id\":\"$KEY_ID\"}" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print('  ERROR:', d.get('message','unknown'))
except:
    print('  OK')
"
  echo "✓ $name"
}

# Verificar dependencia
if ! python3 -c "import nacl" 2>/dev/null; then
  echo "Instalando PyNaCl..."
  pip3 install PyNaCl --quiet
fi

echo ""
echo "Configurando secrets en $REPO..."
set_secret "DATABASE_URL"             "$DATABASE_URL"
set_secret "SUPABASE_URL"             "$SUPABASE_URL"
set_secret "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY"
set_secret "SUPABASE_JWT_SECRET"      "$SUPABASE_JWT_SECRET"
set_secret "ANTHROPIC_API_KEY"        "$ANTHROPIC_API_KEY"

echo ""
echo "Verificando secrets configurados..."
curl -s -H "Authorization: Bearer $GH_TOKEN" \
  "https://api.github.com/repos/$REPO/actions/secrets" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); [print(' ✓', s['name']) for s in d['secrets']]"

echo ""
echo "Listo. Los secrets ya están disponibles en GitHub Actions."
