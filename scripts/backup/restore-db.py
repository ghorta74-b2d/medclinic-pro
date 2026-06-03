#!/usr/bin/env python3
"""
restore-db.py — Carga un export (de export-db.py) en una BD destino vía psql.

Requisitos previos:
  - El ESQUEMA debe existir ya en el destino. Aplica las migraciones Prisma
    ANTES:  cd apps/api && DATABASE_URL=<target> npx prisma migrate deploy
    (y supabase/migrations para RLS si aplica).
  - `psql` instalado y el destino alcanzable (URL con credenciales del destino).

Cómo carga:
  - Por cada tables/<t>.ndjson: carga las líneas a una tabla temporal (CSV con
    delimitador/quote improbables para preservar el JSON intacto) y luego
    INSERT ... SELECT (json_populate_record(...)).* con
    `session_replication_role = replica` para no pelear con el orden de FKs.
  - NO restaura usuarios de Auth (la API no exporta hashes de contraseña).
    auth_users.ndjson queda en el export para manejo manual / re-invitación.

Uso:
  python3 restore-db.py --dir <export_dir_extraido> --target <postgres_url> [--truncate]

Devuelve conteos cargados por tabla (para comparar contra el manifiesto).
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile


def psql(target, sql, inputfile_args=None):
    cmd = ["psql", target, "-v", "ON_ERROR_STOP=1", "-X", "-q", "-c", sql]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or r.stdout.strip())
    return r.stdout


def load_table(target, table, ndjson_path):
    # Delimitador/quote = bytes de control improbables en JSON → la línea entera
    # entra como un único campo jsonb sin que CSV escape los backslashes.
    sql = f"""
SET session_replication_role = replica;
CREATE TEMP TABLE _imp (j jsonb);
\\copy _imp(j) FROM '{ndjson_path}' WITH (FORMAT csv, DELIMITER E'\\x01', QUOTE E'\\x02')
INSERT INTO public.{table}
  SELECT (json_populate_record(NULL::public.{table}, j::json)).*
  FROM _imp;
"""
    psql(target, sql)
    out = psql(target, f"SELECT count(*) FROM public.{table};")
    # psql -q -c devuelve la tabla; extraemos el número
    for line in out.splitlines():
        line = line.strip()
        if line.isdigit():
            return int(line)
    return -1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", required=True, help="directorio del export extraído")
    ap.add_argument("--target", required=True, help="URL Postgres destino")
    ap.add_argument("--truncate", action="store_true",
                    help="TRUNCATE cada tabla antes de cargar (idempotencia)")
    args = ap.parse_args()

    manifest_path = os.path.join(args.dir, "manifest.json")
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {"tables": {}}
    tables_dir = os.path.join(args.dir, "tables")
    files = sorted(f for f in os.listdir(tables_dir) if f.endswith(".ndjson"))

    if args.truncate:
        names = ", ".join(f"public.{f[:-7]}" for f in files)
        psql(args.target, f"SET session_replication_role = replica; TRUNCATE {names} CASCADE;")

    results = {}
    ok = True
    for f in files:
        table = f[:-7]
        path = os.path.abspath(os.path.join(tables_dir, f))
        try:
            n = load_table(args.target, table, path)
            results[table] = n
            expected = manifest.get("tables", {}).get(table)
            mark = "OK" if (expected is None or expected == n) else f"!! esperado={expected}"
            print(f"  {table:24s} cargadas={n}  {mark}")
            if expected is not None and expected != n:
                ok = False
        except Exception as e:  # noqa: BLE001
            print(f"  {table:24s} ERROR: {e}", file=sys.stderr)
            results[table] = -1
            ok = False

    print(json.dumps({"loaded": results, "match_manifest": ok}))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
