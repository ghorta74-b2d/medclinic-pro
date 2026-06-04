# Plan de Recuperación ante Desastres (DRP) — MedClinic Pro

> Estrategia de Disaster Recovery y backups de la plataforma MedClinic Pro.
> Datos clínicos sensibles bajo **NOM-004-SSA3-2012** y **LFPDPPP**.
> Última revisión: 2026-06-03 · Responsable: Gerardo (`gerardo@b2d.mx`).

---

## 1. Alcance

Cubre la recuperación de **toda** la plataforma MedClinic Pro:

- Base de datos PostgreSQL (Supabase, schemas `public`, `auth`, `storage`).
- Archivos del bucket de Storage `clinical-files` (PDFs de recetas, QR, imágenes, documentos de pacientes).
- Código fuente e historial Git completo, migraciones Prisma, seeds, configuración de infraestructura.
- Referencias de configuración externa (Stripe, Vercel) y **nombres** de variables de entorno (no sus valores).

**Fuera de alcance** (no se respaldan, son systems-of-record de terceros): el estado interno de Stripe (clientes, suscripciones, cobros — viven en Stripe), los buzones de Resend y los logs de Vercel.

---

## 2. Arquitectura y línea base (Fase 0)

| Item | Valor |
|---|---|
| Proyecto Supabase | `medclinic-pro` · ref `gzojhcjymqtjswxqgkgk` |
| Región | **sa-east-1** (São Paulo) |
| PostgreSQL | **17.6** |
| Plan Supabase | **FREE** (sin PITR ni backups gestionados descargables) |
| Tamaño BD | ~14 MB |
| Storage | bucket `clinical-files` (privado) · ~5 objetos · ~900 kB |
| Repo | `github.com/ghorta74-b2d/medclinic-pro` |
| Hosting | Vercel (web `mediaclinic.mx` + api `medclinic-api.vercel.app`) |
| Almacén de respaldo | **Cloudflare R2**, bucket `medclinic-backups` (versionado + Object Lock) |

### 🚩 Riesgo de la línea base
El proyecto corre en **Supabase FREE**: no hay PITR, los backups gestionados no son descargables y el proyecto puede **pausarse por inactividad**. En consecuencia, **los dumps lógicos de este DRP son hoy la única copia recuperable** de los expedientes. Se **recomienda fuertemente** subir a **Supabase Pro** para habilitar PITR como capa complementaria (ver §9).

---

## 3. Clasificación de datos

| Clase | Tablas / objetos | Sensibilidad | Marco legal |
|---|---|---|---|
| **Clínico (crítico)** | `patients`, `clinical_notes`, `vital_signs`, `prescriptions`(+items), `lab_results`, `appointments`, `patient_documents`, archivos en `clinical-files` | Datos personales sensibles de salud | NOM-004 (retención ~5 años), LFPDPPP |
| **Identidad** | schema `auth` (usuarios), `doctors`, `password_reset_tokens` | Personal | LFPDPPP |
| **Transaccional** | `invoices`(+items), `payment_records`, `services`, `insurances`, `clinics` | Financiero | Fiscal |
| **Monetización RxE** | `pharmacies`, `pharmacy_branches`, `pharmacy_campaigns`, `campaign_events`, `rx_events` | Negocio | — |
| **Auditoría** | `audit_logs` | Cumplimiento (trazabilidad) | NOM-004 |
| **Catálogos** | `cie10_codes`, `medications`, `appointment_types` | Públicos/reconstruibles (via seed) | — |
| **Código/config** | repo, migraciones, infra, nombres de env vars | Propiedad intelectual | — |

---

## 4. Objetivos RPO / RTO

| Tipo de dato | RPO objetivo | RPO real (solo dumps) | RTO objetivo |
|---|---|---|---|
| Datos clínicos / recetas | pocas horas | **hasta ~17 h** (hueco nocturno) | < 4 h |
| Transaccional / facturación | pocas horas | hasta ~17 h | < 4 h |
| Catálogos | 24 h | hasta ~17 h | < 4 h |
| Storage (PDFs/QR) | 24 h | 24 h | < 4 h |
| Código / configuración | 24 h | 24 h | < 1 h |

**Justificación.** Los datos clínicos exigen RPO de pocas horas porque una pérdida significa expedientes médicos irrecuperables (riesgo asistencial y legal). Con **dos dumps diarios a las 12:00 y 19:00 MX**, el peor caso es el **hueco nocturno de ~17 h** (19:00 → 12:00 del día siguiente). Para cerrar esa brecha y cumplir "pocas horas" reales se necesita **PITR (WAL continuo, Supabase Pro)** — ése es el motivo concreto del upgrade recomendado en §9. El RTO de horas (no días) es alcanzable porque la BD es pequeña (~14 MB) y la restauración a un proyecto nuevo toma minutos.

---

## 5. Topología de respaldos (regla 3-2-1)

- **3 copias:** (1) Supabase primario · (2) artefacto en el runner durante el job (efímero) · (3) Cloudflare R2 offsite.
- **2 medios:** PostgreSQL gestionado (Supabase) + object storage (R2).
- **1 offsite:** R2 en infraestructura y geografía distintas a Supabase sa-east-1.
- **Inmutabilidad:** bucket R2 con **versionado + Object Lock** → protección anti-ransomware (no se puede sobrescribir ni borrar dentro de la ventana de retención).
- **Capa 4 recomendada:** PITR de Supabase Pro (§9).

```
                  ┌──────────────────────┐
   pg_dump 2x/día │  Supabase (sa-east-1) │  ← copia 1 (primaria)
   ───────────────┤  Postgres 17 · Storage│
                  └──────────┬───────────┘
                             │ cifrado age (clave pública)
                             ▼
                  ┌──────────────────────┐
                  │ GitHub Actions runner │  ← copia 2 (efímera, en el job)
                  │ dump→checksum→smoke   │
                  └──────────┬───────────┘
                             │ aws s3 cp (TLS)
                             ▼
                  ┌──────────────────────┐
                  │ Cloudflare R2         │  ← copia 3 (offsite, INMUTABLE)
                  │ versioning+ObjectLock │
                  └──────────────────────┘
```

---

## 6. Cifrado y gestión de llaves

- **En tránsito:** TLS en todo (HTTPS a R2, conexión Postgres con SSL).
- **En reposo:** doble capa → cifrado de aplicación con **`age`** (X25519) **antes** de subir + cifrado nativo de R2.
- **Modelo de llaves (clave separada de los backups):**
  - El runner (GitHub Actions) **solo conoce la clave pública** (`AGE_PUBLIC_KEY`). Puede **cifrar**, no descifrar. Si el runner o GitHub se comprometen, los backups en R2 **no son legibles**.
  - La **clave privada `age` NUNCA toca GitHub ni R2.** Vive en el gestor de contraseñas del responsable **+ copia offline** (USB cifrado / impresión en papel guardada en lugar físico seguro).
  - Generación: `age-keygen -o medclinic-backup.agekey` → guardar el archivo offline; el "public key: age1…" es el `AGE_PUBLIC_KEY`.
- **Rotación de llaves:** anual o tras cualquier sospecha de compromiso. Procedimiento: generar par nuevo, actualizar `AGE_PUBLIC_KEY` en GitHub, conservar la clave privada vieja archivada (sigue siendo necesaria para descifrar backups previos). Documentar la fecha de rotación al final de este archivo.
- **Alternativa GPG:** si se prefiere GPG sobre age, sustituir en `lib.sh`/`backup-db.sh` `age -r` por `gpg --encrypt --recipient` y `age -d -i` por `gpg --decrypt`. El modelo (solo clave pública en CI) es idéntico.

---

## 7. Backups de base de datos (2 diarios, sin excepción)

### 7.1 Programación

| Slot | Hora México (UTC-6) | Cron UTC (GitHub Actions) | Cron VPS (`TZ=America/Mexico_City`) |
|---|---|---|---|
| Diurno | **12:09** | `9 18 * * *` | `9 12 * * *` |
| Vespertino | **19:09** | `9 1 * * *` (día siguiente UTC) | `9 19 * * *` |

> México centro = **UTC-6 fijo** (sin horario de verano desde 2023), por eso el offset es constante todo el año.
> El minuto **:09** (no :00) sigue la recomendación de GitHub: el inicio de hora es el horario más
> congestionado y donde más se retrasan o saltan los schedules. La ventana de gracia (2 h) absorbe el resto.

**Runner primario: GitHub Actions** (`.github/workflows/backup-db.yml`). Como GitHub Actions corre en **UTC** y sus schedules **pueden retrasarse o saltarse** bajo carga, el cumplimiento "sin excepción" se garantiza con el **dead-man's switch** (§7.4), no con la confianza en el scheduler.

**Alternativa runner propio (VPS).** Si se monta un servidor dedicado, usar crontab en hora local de México:

```cron
# /etc/cron.d/medclinic-backup   (asegurar TZ del sistema o exportar TZ)
CRON_TZ=America/Mexico_City
9 12 * * *  deploy  cd /opt/medclinic-pro && /usr/bin/env bash scripts/backup/backup-db.sh >> /var/log/medclinic-backup.log 2>&1
9 19 * * *  deploy  cd /opt/medclinic-pro && /usr/bin/env bash scripts/backup/backup-db.sh >> /var/log/medclinic-backup.log 2>&1
9  3 * * *  deploy  cd /opt/medclinic-pro && /usr/bin/env bash scripts/backup/backup-code-assets.sh >> /var/log/medclinic-backup.log 2>&1
```

### 7.2 Qué hace `scripts/backup/backup-db.sh`

> **Por qué export por API y no `pg_dump`:** el pooler IPv4 de Supabase (Supavisor)
> solo acepta el usuario `postgres` (cuyo password no es recuperable y no debe rotarse
> sin riesgo a producción), y la conexión directa Postgres es **IPv6-only**, inalcanzable
> desde GitHub Actions (IPv4). Por eso el backup exporta vía **API sobre HTTPS** con la
> `service_role` key: cero password de BD, cero conexión Postgres, **solo lectura**.

1. **`export-db.py`** exporta TODAS las tablas del schema `public` vía PostgREST
   (la `service_role` bypassa RLS → captura todas las filas) → un **NDJSON por tabla**,
   más los usuarios de Auth vía **Auth Admin API**, más `manifest.json` con conteos.
2. **Validación (smoke)** sobre el manifiesto: tablas clave presentes y total de filas > 0
   (las tablas clínicas no pueden venir vacías) — *un backup que no se valida no es un backup*.
3. Empaqueta en `tar.gz` y calcula **SHA-256** → sidecar `.sha256`.
4. Cifra con **`age`** (clave pública) → `medclinic_db_<YYYYMMDD>_<slot>.tar.gz.age`.
5. Sube a R2 y **verifica el tamaño del objeto remoto**.
6. Aplica **purga GFS**. 7. **Ping de éxito**; en fallo **email a `gerardo@b2d.mx`** + ping `/fail`.

> **El esquema NO va en este backup:** el DDL, las migraciones y las políticas RLS viven
> en el repositorio (`apps/api/prisma` + `supabase/migrations`) y se respaldan con el backup
> de código (§8). Recuperación = **aplicar migraciones Prisma + cargar estos datos**.
>
> **Limitación de Auth:** la Auth Admin API **no** devuelve los hashes de contraseña
> (`encrypted_password`), por diseño de GoTrue. Tras una recuperación total los usuarios
> conservan identidad, rol y metadata, pero **deben restablecer su contraseña** (o
> re-invitarse). `auth_users.ndjson` queda en el archivo para este fin.

### 7.3 Retención (GFS) y costo
- **Diarios:** cada corrida se conserva **30 días** (~60 objetos, por las 2/día).
- **Semanales:** el primer dump de cada semana ISO se conserva **12 semanas**.
- **Mensuales:** el primer dump de cada mes se conserva **12 meses**.
- Implementado en `lib.sh::purge_gfs()`. **Object Lock** impide el borrado prematuro de los respaldos recientes (anti-ransomware); los objetos aún bloqueados que la purga no puede borrar se registran y se omiten sin fallar.
- **Costo estimado:** un dump cifrado+comprimido pesa pocos MB; el histórico total ronda **<300 MB**, **dentro del free tier de R2 (10 GB)** → **~$0/mes hoy**. Proyección al crecer la BD: R2 ≈ **$0.015/GB-mes**, **egress $0** (gran ventaja para restaurar). Aun con 50 GB de histórico el costo sería <$1/mes.

### 7.4 Monitoreo y dead-man's switch (garantía "sin excepción")
- **healthchecks.io:** un check por job, con su cron y *grace period* configurados. Cada corrida hace ping `/start` al iniciar y ping de éxito al terminar. **Si el ping de éxito no llega en la ventana esperada** (porque el job no corrió, se colgó o falló), healthchecks.io **dispara alerta automáticamente**.
- **Email (Resend):** ante cualquier fallo controlado o no, `notify_failure()` envía correo a `gerardo@b2d.mx` desde `noreply@mediaclinic.mx`.
- **Reintentos con backoff:** `pg_dump` (3 intentos) y subida a R2 (4 intentos) reintentan con backoff exponencial antes de declarar fallo.
- **Configuración recomendada de cada check en healthchecks.io:**

  | Check | Schedule (cron) | Timezone | Grace |
  |---|---|---|---|
  | `db-1200` | `9 12 * * *` | America/Mexico_City | 6 h |
  | `db-1900` | `9 19 * * *` | America/Mexico_City | 6 h |
  | `code` | `9 3 * * *` | America/Mexico_City | 6 h |
  | `verify` | `9 4 * * 1` | America/Mexico_City | 6 h |

  > **Grace de 6 h:** el cron gratuito de GitHub Actions retrasa los `schedule` de forma notable
  > (se observó ~3 h en producción; los `workflow_dispatch` manuales/API, en cambio, corren al
  > instante). Una gracia de 6 h absorbe ese retraso y evita falsas alarmas. Un backup que corre
  > tarde sigue siendo válido para DR; lo que el dead-man's switch detecta es que NO corra en 6 h.
  > Si se requiriera horario exacto, la opción documentada es un disparador externo (cron-job.org u
  > otro) que invoque el workflow vía API de GitHub, o un runner propio/Vercel Pro cron.

- **Pendiente (fase posterior):** alerta por **WhatsApp** (Meta Cloud API). El gancho `alert_whatsapp()` ya existe en `lib.sh` como no-op documentado; se activará más adelante.

### 7.5 Verificación de restauración (en 3 capas)
> *"Un backup que no se ha probado no es un backup."*

1. **Cada corrida — validación de manifiesto** (en `backup-db.sh`): verifica que el export
   contiene las tablas clave y que el total de filas > 0 (tablas clínicas no vacías). Si no,
   el job falla y alerta.
2. **Semanal — `verify-backup.sh`** (`.github/workflows/verify-backup.yml`): descarga el último `.tar.gz.age` de R2 y **recompara el SHA-256** contra el sidecar → confirma que el artefacto almacenado está íntegro y es descargable, **sin descifrar** (la clave privada sigue offline).
3. **Mensual — `restore-rehearsal.sh`** (manual): con la **clave privada offline**, descarga → verifica checksum → descifra → extrae → valida el manifiesto; con `--target` además **carga los datos en una BD desechable** (`restore-db.py`) y compara los conteos cargados vs el manifiesto. Se mantiene manual a propósito para no exponer la clave de descifrado en CI.

---

## 8. Backup de código y plataforma

`scripts/backup/backup-code-assets.sh` (diario 03:00 MX, `.github/workflows/backup-code.yml`):

1. **Código + historial:** `git bundle create --all` (un solo archivo restaurable con `git clone`), verificado e independiente de GitHub, cifrado y subido a `code/`. Incluye migraciones Prisma, `supabase/migrations`, seeds y config de infra (todo está en el repo).
2. **Assets de Storage:** lista recursiva del bucket `clinical-files` vía REST API con service role, descarga, cifra cada objeto con `age` y hace **sync incremental** a `assets/` en R2.
3. **Manifiesto de env vars:** extrae **solo los nombres** de las variables desde `.env.example` y `.env.backup.example` (**nunca valores**) y lo sube como referencia para la reconstrucción.

---

## 9. Recomendación: Supabase Pro + PITR (no activado)

Para cerrar la brecha de RPO nocturna de ~17 h en datos clínicos se recomienda subir a **Supabase Pro** (~$25 USD/mes) y habilitar **Point-in-Time Recovery**:

- PITR aplica WAL continuo → permite restaurar a **cualquier segundo** dentro de la ventana de retención (RPO de minutos, no horas).
- Es **complementario**, no sustituto, de los dumps lógicos: PITR vive dentro de Supabase (misma plataforma), mientras los dumps en R2 son la copia **offsite e independiente**. Juntos cumplen 3-2-1 + RPO bajo.
- Beneficio extra: el plan Pro **elimina la pausa por inactividad** del proyecto.
- **Acción:** Dashboard Supabase → Settings → Add-ons → Point-in-Time Recovery. Documentar aquí la fecha de activación cuando se haga.

---

## 10. Matriz de escenarios de desastre y runbooks

> Antes de cualquier restauración real sobre producción, usar `restore-db.sh` (pide confirmación explícita) y avisar a los usuarios. Toda la restauración requiere la **clave privada `age` offline**.

### 10.1 Corrupción de la BD
- **Detección:** errores de integridad, datos inconsistentes, alertas de la app.
- **Acción:**
  1. Poner la app en mantenimiento (Vercel) para frenar escrituras.
  2. `scripts/backup/restore-db.sh --list` para ver backups disponibles.
  3. Recrear esquema (migraciones Prisma) y cargar el último export **sano** en un **proyecto Supabase nuevo** (no sobre el corrupto):
     ```bash
     AGE_IDENTITY_FILE=~/keys/medclinic-backup.agekey \
       scripts/backup/restore-db.sh --target "postgresql://...nuevo..." --truncate --key db/medclinic_db_YYYYMMDD_1900.tar.gz.age
     ```
  4. Validar conteos e integridad.
  5. Apuntar `DATABASE_URL`/`DIRECT_URL` en Vercel (web+api) al proyecto restaurado; redeploy.
- **Validación post-restore:** conteos de `patients`, `clinical_notes`, `appointments` coinciden con lo esperado; sin notas huérfanas.

### 10.2 Borrado accidental de registros
- **Detección:** usuario reporta datos faltantes; `audit_logs` confirma el `DELETE`.
- **Acción:** restaurar el dump previo al borrado en una **BD desechable**, exportar solo las filas afectadas y reinsertarlas en producción (no restaurar todo encima). Para `lab_results` recordar que el borrado es **soft delete** (revisar `deletedAt` antes de restaurar).

### 10.3 Ransomware / cifrado malicioso
- **Detección:** archivos/datos cifrados, nota de rescate, accesos anómalos.
- **Por qué estamos protegidos:** R2 con **Object Lock** → los respaldos recientes **no se pueden sobrescribir ni borrar** aunque el atacante tenga las credenciales del runner (que además **solo pueden cifrar**, no descifrar).
- **Acción:** rotar TODAS las credenciales (Supabase, R2, GitHub, Vercel), crear infraestructura limpia, restaurar desde el último backup inmutable verificado, restaurar assets desde `assets/`.

### 10.4 Caída de región sa-east-1
- **Detección:** Supabase status / proyecto inaccesible.
- **Acción:** crear un proyecto Supabase nuevo en **otra región**, restaurar el último dump (R2 es independiente de la región caída), reapuntar Vercel. RTO estimado < 4 h.

### 10.5 Error humano (DROP de tabla / migración mala)
- **Detección:** fallo tras deploy/migración; `audit_logs`.
- **Acción:** si es de esquema, revertir la migración Prisma y `prisma migrate deploy`; si hubo pérdida de datos, restaurar el dump previo a la migración en BD desechable y recuperar las filas. Con PITR (si se activa §9), restaurar al instante anterior al error.

### 10.6 Compromiso de credenciales
- **Detección:** accesos no reconocidos, alertas de GitHub/Supabase.
- **Acción:** rotar inmediatamente DB password, `SERVICE_ROLE_KEY`, tokens R2, secrets de GitHub, secrets de Vercel. Revisar `audit_logs`. Los backups en R2 siguen siendo ilegibles para el atacante (clave privada offline). Si las credenciales de R2 fueron comprometidas, Object Lock impide que se borren los respaldos; rotar las credenciales R2 y revisar versiones de objetos.

---

## 11. Reconstrucción total desde cero (solo con los respaldos)

**RTO estimado: 1–3 h.**

1. **Código** (~5 min): descargar el bundle de `code/`, descifrar y clonar:
   ```bash
   age -d -i ~/keys/medclinic-backup.agekey -o repo.bundle medclinic_code_YYYYMMDD.bundle.age
   git clone repo.bundle medclinic-pro && cd medclinic-pro
   pnpm install --frozen-lockfile
   ```
2. **Proyecto Supabase nuevo** (~10 min): crearlo (misma o nueva región), obtener `DATABASE_URL`/`DIRECT_URL`.
3. **Recrear esquema + restaurar datos** (~5–15 min):
   ```bash
   # a) Esquema + RLS desde el código (migraciones Prisma)
   cd apps/api && DATABASE_URL="postgresql://...nuevo..." npx prisma migrate deploy && cd -
   # b) Cargar los datos del último backup
   AGE_IDENTITY_FILE=~/keys/medclinic-backup.agekey \
     scripts/backup/restore-db.sh --target "postgresql://...nuevo..." --truncate --allow-prod
   ```
   Usuarios de Auth: re-invitar / restablecer contraseña (los hashes no se respaldan, §7.2).
4. **Restaurar Storage** (~10 min): crear el bucket `clinical-files` (privado), descargar `assets/` de R2, descifrar cada objeto y re-subirlo con el service role.
5. **Variables de entorno** (~20 min): usar el manifiesto de `code/` como checklist; recargar los **valores** (desde el gestor de contraseñas) en Vercel (web+api). Configurar también los secrets de backup.
6. **Redeploy en Vercel** (~10 min): conectar el repo, deploy de web y api, verificar dominios.
7. **Verificación** (~30 min): login, abrir un expediente, generar una receta, revisar `audit_logs`, correr `restore-rehearsal.sh` contra una copia.

---

## 12. Checklist de primera ejecución

- [ ] Crear bucket R2 `medclinic-backups` con **Versioning + Object Lock** (retención por defecto ≥ 30 días).
- [ ] Crear un token de API de R2 con permisos de lectura/escritura **solo** sobre ese bucket.
- [ ] Generar el par de llaves `age` (`age-keygen`). **Guardar la clave privada OFFLINE** (gestor + USB/papel). Anotar la pública.
- [ ] Crear 4 checks en healthchecks.io (`db-1200`, `db-1900`, `code`, `verify`) con cron+grace de §7.4.
- [ ] Cargar todos los GitHub Actions Secrets (reusar el patrón de `scripts/set-github-secrets.sh`):
      `SUPABASE_DB_URL_DIRECT`, `R2_*`, `AGE_PUBLIC_KEY`, `HEALTHCHECKS_URL_*`, `RESEND_API_KEY`, `ALERT_EMAIL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Dispatch manual de `Backup DB` con `dry_run=1` → confirmar artefacto en `test/db/` y ping recibido.
- [ ] Dispatch manual de `Backup Code + Assets` (`dry_run=1`) → confirmar bundle + assets en `test/`.
- [ ] Dispatch manual de `Verify Backup` → confirmar match de checksum.
- [ ] Correr `restore-rehearsal.sh` contra una BD desechable una vez (con la clave offline).
- [ ] Forzar un fallo (URL de BD inválida en dispatch) → confirmar **email a gerardo@b2d.mx** + ping `/fail`.
- [ ] Registrar fecha de puesta en marcha en §14.

---

## 13. Calendario de pruebas de restauración

| Frecuencia | Prueba | Automático/Manual | Responsable |
|---|---|---|---|
| Cada corrida | Smoke-restore en Postgres efímero | Automático (en `backup-db.sh`) | — |
| Semanal (lun) | Verificación de checksum del último artefacto | Automático (`verify-backup.yml`) | — |
| **Mensual** | Ensayo completo: descifrar + restaurar + validar | **Manual** (`restore-rehearsal.sh`) | Gerardo |
| Trimestral | Simulacro de reconstrucción total (§11) en proyecto desechable | Manual | Gerardo |
| Anual | Rotación de la llave `age` + revisión completa del DRP | Manual | Gerardo |

---

## 14. Bitácora (rellenar)

| Fecha | Evento | Notas |
|---|---|---|
| | Puesta en marcha de backups | |
| | Primer ensayo de restauración mensual | |
| | Rotación de llave `age` | |
| | Activación de Supabase Pro + PITR (si aplica) | |

---

## 15. Entregables y referencias

| Archivo | Rol |
|---|---|
| `DRP.md` | Este documento. |
| `scripts/backup/lib.sh` | Funciones compartidas (log, tiempo MX, healthchecks, email, purga GFS, R2). |
| `scripts/backup/export-db.py` | Exporta los datos vía API de Supabase (PostgREST + Auth Admin). |
| `scripts/backup/restore-db.py` | Carga un export en una BD destino (psql, sin pelear con FKs). |
| `scripts/backup/backup-db.sh` | Backup de BD 2×/día (orquesta export → cifra → R2). |
| `scripts/backup/verify-backup.sh` | Verificación semanal de integridad (sin descifrar). |
| `scripts/backup/restore-rehearsal.sh` | Ensayo mensual de restauración (manual, clave offline). |
| `scripts/backup/restore-db.sh` | Restauración real (interactiva, con confirmación). |
| `scripts/backup/backup-code-assets.sh` | Backup diario de código + assets + manifiesto de env. |
| `.github/workflows/backup-db.yml` | Cron 2×/día (UTC) + dispatch. |
| `.github/workflows/backup-code.yml` | Cron diario 09:00 UTC (03:00 MX). |
| `.github/workflows/verify-backup.yml` | Cron semanal. |
| `.env.backup.example` | Nombres de todas las variables del tooling de backup. |
