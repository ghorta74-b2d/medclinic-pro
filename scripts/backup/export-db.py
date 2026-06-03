#!/usr/bin/env python3
"""
export-db.py — Export lógico completo de la BD de MedClinic Pro vía API.

Por qué API y no pg_dump: el pooler IPv4 de Supabase (Supavisor) solo acepta el
usuario `postgres` (password no recuperable) y la conexión directa es IPv6-only
(inalcanzable desde GitHub Actions, que es IPv4). La API REST + Auth Admin API
corren sobre HTTPS/IPv4 con la service_role key, sin password de BD y SIN tocar
producción (solo lectura).

Qué exporta:
  - Todas las tablas del schema `public` (filas completas) → NDJSON por tabla.
    El service_role bypassa RLS, así que se capturan TODAS las filas.
  - Usuarios de Supabase Auth → NDJSON (vía Auth Admin API).
  - manifest.json con conteos por tabla + metadatos.

El ESQUEMA (DDL), las políticas RLS y las migraciones NO van aquí: viven en el
repositorio (apps/api/prisma + supabase/migrations) y se respaldan con el backup
de código. La recuperación = aplicar migraciones Prisma + cargar estos datos.

Limitación documentada: la Auth Admin API NO devuelve los hashes de contraseña
(`encrypted_password`), por diseño de GoTrue. Tras una recuperación total, los
usuarios conservan identidad/rol/metadata pero deben restablecer su contraseña
(o re-invitarse). Ver DRP.md §7.

Salida: escribe en $EXPORT_DIR y deja manifest.json. Imprime el manifiesto a
stdout. Exit !=0 ante cualquier fallo.

Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EXPORT_DIR.
Opcionales: EXPORT_PAGE_SIZE (default 1000).
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
EXPORT_DIR = os.environ["EXPORT_DIR"]
PAGE = int(os.environ.get("EXPORT_PAGE_SIZE", "1000"))

# Lista de respaldo si la auto-detección por OpenAPI falla. Es el schema conocido
# al 2026-06-03; la auto-detección incluye tablas nuevas automáticamente.
FALLBACK_TABLES = [
    "clinics", "doctors", "patients", "appointment_types", "appointments",
    "medications", "clinical_notes", "vital_signs", "prescriptions",
    "prescription_items", "lab_results", "insurances", "services", "invoices",
    "invoice_items", "payment_records", "telehealth_sessions", "patient_documents",
    "audit_logs", "notifications", "cie10_codes", "password_reset_tokens",
    "pharmacies", "pharmacy_branches", "pharmacy_campaigns", "campaign_events",
    "rx_events", "schedule_blocks",
]


def _req(url, extra_headers=None):
    headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
    if extra_headers:
        headers.update(extra_headers)
    req = urllib.request.Request(url, headers=headers, method="GET")
    last_err = None
    for attempt in range(1, 5):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read(), dict(resp.headers)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            last_err = e
            # 4xx que no sea 429 no se reintenta (config/permite); 5xx y 429 sí.
            code = getattr(e, "code", None)
            if code and 400 <= code < 500 and code != 429:
                raise
            time.sleep(2 ** (attempt - 1))
    raise RuntimeError(f"Request falló tras reintentos: {url}: {last_err}")


def discover_tables():
    """Detecta tablas del schema public desde el OpenAPI de PostgREST."""
    try:
        body, _ = _req(f"{SUPABASE_URL}/rest/v1/")
        spec = json.loads(body)
        defs = list(spec.get("definitions", {}).keys())
        # Filtra entradas que claramente no son tablas base.
        tables = [t for t in defs if not t.startswith("rpc/")]
        if tables:
            return sorted(set(tables))
    except Exception as e:  # noqa: BLE001
        log("WARN", "Auto-detección de tablas falló; uso lista de respaldo", error=str(e))
    return sorted(FALLBACK_TABLES)


def export_table(table):
    """Pagina una tabla vía PostgREST y la escribe como NDJSON. Devuelve filas."""
    out = os.path.join(EXPORT_DIR, "tables", f"{table}.ndjson")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    base = f"{SUPABASE_URL}/rest/v1/{urllib.parse.quote(table)}?select=*"
    offset, total = 0, 0
    with open(out, "w", encoding="utf-8") as f:
        while True:
            body, _ = _req(f"{base}&limit={PAGE}&offset={offset}")
            rows = json.loads(body)
            if not isinstance(rows, list) or not rows:
                break
            for row in rows:
                f.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
            total += len(rows)
            if len(rows) < PAGE:
                break
            offset += PAGE
    return total


def export_auth_users():
    """Exporta usuarios de Auth vía Admin API (sin hashes de contraseña)."""
    out = os.path.join(EXPORT_DIR, "auth_users.ndjson")
    page, total = 1, 0
    with open(out, "w", encoding="utf-8") as f:
        while True:
            body, _ = _req(f"{SUPABASE_URL}/auth/v1/admin/users?page={page}&per_page={PAGE}")
            data = json.loads(body)
            users = data.get("users", []) if isinstance(data, dict) else data
            if not users:
                break
            for u in users:
                f.write(json.dumps(u, ensure_ascii=False, separators=(",", ":")) + "\n")
            total += len(users)
            if len(users) < PAGE:
                break
            page += 1
    return total


def log(level, msg, **ctx):
    print(json.dumps({"level": level, "script": "export-db", "msg": msg, "ctx": ctx}))


def main():
    os.makedirs(EXPORT_DIR, exist_ok=True)
    manifest = {
        "created_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "supabase_url": SUPABASE_URL,
        "format": "ndjson-per-table",
        "schema_source": "apps/api/prisma + supabase/migrations (en backup de código)",
        "tables": {},
        "auth_users": 0,
        "errors": {},
    }

    tables = discover_tables()
    log("INFO", "Tablas a exportar", count=len(tables))
    for t in tables:
        try:
            n = export_table(t)
            manifest["tables"][t] = n
            log("INFO", "Tabla exportada", table=t, rows=n)
        except Exception as e:  # noqa: BLE001
            manifest["errors"][t] = str(e)
            log("ERROR", "Falló exportar tabla", table=t, error=str(e))

    try:
        manifest["auth_users"] = export_auth_users()
        log("INFO", "Usuarios Auth exportados", users=manifest["auth_users"])
    except Exception as e:  # noqa: BLE001
        manifest["errors"]["__auth_users__"] = str(e)
        log("ERROR", "Falló exportar usuarios Auth", error=str(e))

    with open(os.path.join(EXPORT_DIR, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    total_rows = sum(manifest["tables"].values())
    print(json.dumps({"level": "INFO", "script": "export-db", "msg": "Export terminado",
                      "ctx": {"tables": len(manifest["tables"]), "total_rows": total_rows,
                              "auth_users": manifest["auth_users"],
                              "errors": len(manifest["errors"])}}))

    # Falla si hubo errores o si no se exportó NADA (señal de problema serio).
    if manifest["errors"]:
        sys.exit(1)
    if total_rows == 0 and manifest["auth_users"] == 0:
        log("ERROR", "Export vacío: 0 filas y 0 usuarios")
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
