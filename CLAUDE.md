# MedClinic Pro — Guía para Claude

## Proyecto
SaaS de gestión clínica para LATAM. Monorepo pnpm + Turborepo.

**WD:** `/Users/gerardohorta/Library/Mobile Documents/com~apple~CloudDocs/B2D Automation/CLAUDE/CLINIC/medclinic-pro`  
**Repo:** `https://github.com/ghorta74-b2d/medclinic-pro`  
**Prod:** `https://mediaclinic.mx`  
**Último commit:** `f1f7b5c` — 2026-06-03 (✅ pusheado y desplegado en prod; `origin/main`=`f1f7b5c`)

## Stack

| App | Tech | URL prod |
|---|---|---|
| `apps/web` | Next.js 16 App Router, Tailwind, TypeScript ESM | mediaclinic.mx |
| `apps/api` | Fastify 5, Prisma, **CommonJS** | medclinic-api.vercel.app |
| `packages/shared` | Types, constants, helpers compartidos | — |

- **DB:** Supabase `gzojhcjymqtjswxqgkgk` (sa-east-1) — acceso solo vía Prisma
- **Auth:** Supabase Auth, roles en `user_metadata.role`: `ADMIN | DOCTOR | STAFF | SUPER_ADMIN`
- **Email:** Resend, from siempre `noreply@mediaclinic.mx`
- **Pagos:** Stripe live mode, 14 días de trial
- **Deploy:** `git push origin main` → Vercel auto-deploya web + api

## Reglas CRÍTICAS

### Nunca romper
- `apps/api` es **CommonJS** — no importar paquetes ESM-only (nanoid v5, etc.)
- `@fastify/cors` requiere `methods` array explícito: `['GET','POST','PUT','PATCH','DELETE','OPTIONS','HEAD']`
- `apps/api/generated/` — NO commitar, se regenera con `prisma generate` en build
- `LabResult.delete()` — SIEMPRE soft delete, nunca hard delete
- `bucket clinical-files` — nunca `public: true`
- `from:` de Resend — SIEMPRE `noreply@mediaclinic.mx`
- `app/landing/` — NO TOCAR, backup de landing original
- NO `@fastify/compress` — incompatible con Vercel serverless

### Commits y deploys
- Claude hace `git commit`, el **usuario hace `git push`** (nunca Claude)
- Nunca `--no-verify`, nunca `--force` en main

### Usuarios
- `ghorta74@gmail.com` = **SUPER_ADMIN** sin `clinic_id` → solo accede a `/superadmin`
- `c5@b2d.mx` = ADMIN clínica `cmnr49xsl00004ev0ziey0sk2` → panel de clínica

## Módulos clave

### RxE — Receta Electrónica (`/r/[slug]`)
- Landing pública sin auth: `apps/web/src/app/r/[slug]/page.tsx`
- Mapa farmacias: **Leaflet 1.9.4** + CartoDB Dark tiles — sin Google Maps API
  - `pharmacy-map.tsx`: geo-filter ≤20km, ordenado por distancia, click → Google Maps directions
  - `import 'leaflet/dist/leaflet.css'` en el componente + `await import('leaflet')` en useEffect
- Dispensación: `getDispensingCategory(medicationName)` en `medclinic-shared` → 4 categorías
  - `fisica` (naranja): antibióticos TODOS, opioides, ansiolíticos, antipsicóticos, anticonvulsivos, antidepresivos, corticoides, insulina, anticoagulantes, hormonas
  - `libre` (verde): todo lo demás
- `PrescriptionCard` en `apps/web/src/components/prescriptions/prescription-card.tsx` — tarjeta unificada usada en `/recetas` y `pacientes/[id]`

### Superadmin (`/superadmin`)
- Solo accesible con rol `SUPER_ADMIN`
- Gestión de clínicas, farmacias/campañas (monetización RxE)
- `ghorta74@gmail.com` va aquí automáticamente por middleware

### Farmacias / Campañas
- Admin en `/superadmin/farmacias`
- Datos en DB: tabla `PharmacyCampaign` + `PharmacyBranch`
- ⚠️ Hay datos placeholder/seed con teléfonos `+52555555...` — deben borrarse desde el panel

### Consulta IA (`/consulta-ia`)
- Transcripción **en el navegador** con Web Speech API (`webkitSpeechRecognition`) — **solo Chrome/Edge**.
  En Safari/Firefox se muestra una tarjeta bloqueante "Disponible solo en Google Chrome"
  (`speechRecognitionSupported()` en `consulta-ia/page.tsx`). NO hay STT server-side ni se guarda audio.
- Backend `POST /api/consulta-ia/process` recibe solo `{ patientId, transcriptText, durationSeconds, consentAt }`;
  Claude extrae datos clínicos estructurados. No existe endpoint de subida de audio.
- `RecordingStep` mantiene un `getUserMedia` real con el `deviceId` elegido (Web Speech API sola ignora el device),
  medidor de nivel RMS y detección de pérdida de mic (`track.onended`). Helpers: `micErrorMessage`, `audioConstraints`.

### Loader de marca
- `components/ui/ecg-loader.tsx` — `<EcgLoader />` es el loader **universal** del sitio (animación ECG).
  Prop `viewport` (centra en ventana, `min-h-[70vh]`) vs `fullPage` (sección). `app/(dashboard)/loading.tsx` lo usa.
- Spinners inline de **botones** siguen siendo `Loader2` (intencional). No usar spinners circulares para página/sección.

### Agenda (`/agenda`) — rediseñada 2026-06-03
- `components/agenda/agenda-shell.tsx` = orquestador (estado vista/fecha/médico, fetch SWR de citas **+ bloqueos**, contadores, toolbar). La página solo monta `<AgendaShell/>`.
- Rejilla real: `time-grid.tsx` (Día/Semana, 09–19h, línea de "ahora", auto-scroll) + `day-view`/`week-view`/`month-view`. `event-block.tsx` = `AgendaEvent` (cita + bloqueo rayado).
- Interacción **pointer events propios** (sin deps): `hooks/use-grid-interaction.ts` (drag-create **snap 30 min**, mover, redimensionar con persistencia optimista + rollback), `use-overlap-layout.ts` (lanes), `use-now-line.ts`. Color por médico: `doctorColor()` en `medclinic-shared`.
- **Horarios pasados sombreados** y no se pueden capturar (rejilla + editor).
- `event-editor.tsx` = crear/editar responsivo (Dialog desktop / Sheet móvil). Toggle Cita/Bloqueo. Paciente **buscar o + Nuevo**. Médico obligatorio (foco) en "Todos". Motivo = catálogo `COMPLAINTS` por especialidad + "Otro". **NO** hay "Tipo de consulta" (se quitó). Modalidad sí. Reasignar inline (cambia médico → dispara flujo backend).
- **Clic en una cita → navega a `/agenda/[id]`** (detalle completo); el editor inline es solo para crear y para editar **bloqueos**.
- Bloqueos: modelo Prisma `ScheduleBlock` + enum `BlockReason`, rutas `routes/blocks.ts` (`/api/blocks` CRUD), `api.blocks`. Tabla `schedule_blocks` **ya aplicada en prod** (RLS on, sin políticas; backend usa Postgres directo). NO suman a contadores.
- `availability` (backend): marca no disponibles los slots **ocupados Y pasados de hoy** (vía `utcOffset`). Reagendar/reasignar/alta solo ven futuros y libres.
- Reasignación: `PATCH /appointments/:id` valida conflicto del **nuevo médico** (cita y bloqueo) → 409. Notifica + email a ambos médicos. El panel del detalle exige elegir horario si el actual no está libre con el nuevo médico.

### Detalle de cita (`/agenda/[id]`)
- Acciones: confirmar, cancelar, reagendar (slots), reasignar (slots), iniciar consulta. Botones de acción primaria en **azul**.
- **"Iniciar consulta"** → pone la cita `IN_PROGRESS` y navega al **expediente** del paciente (`/pacientes/[id]`, pestaña Consultas) para revisar historial. NO auto-abre la nota; el médico inicia consulta (normal o IA). El vínculo cita→nota se conserva (`_open_new_consulta` → `autoOpenAppointmentId`).

### Cobros + Dashboard
- Navegación por meses con `components/ui/period-navigator.tsx` (Día/Semana/Mes + flechas + Hoy).
- KPIs con delta vs período anterior (`components/ui/kpi-card.tsx`). Gráficos en **Recharts**.
- Backend `billing.ts`: params `from/to/chartToUtc/prevFrom/prevTo` + endpoint `GET /api/billing/trend?months=6`.
  ⚠️ `chartToUtc` acota el gráfico (sin él, un mes pasado arrastra pagos del mes actual).
- **"Pacientes atendidos"** = citas con estado `COMPLETED`. La cita pasa a COMPLETED **al FIRMAR la nota clínica** (`clinical-notes/:id/sign` → `appointment.status=COMPLETED`); "Guardar borrador" la deja `IN_PROGRESS` (a propósito, NOM-004). Si el KPI sale 0 con citas, es que no se firmaron notas.

## Pendientes al 2026-05-26

### 🔴 Críticos (manual)
1. Rotar contraseña DB en Supabase → actualizar `DATABASE_URL` + `DIRECT_URL` en Vercel API
2. Borrar sucursales placeholder de farmacias desde Superadmin
3. `RESEND_API_KEY` en Vercel medclinic-api
4. `NEXT_PUBLIC_APP_URL=https://mediaclinic.mx` en Vercel medclinic-api
5. GitHub Actions Secrets para CI

### 🟡 Medios
- MFA TOTP en Supabase Auth
- HIBP en Supabase Auth Settings
- `PLACEHOLDER_BING` en `apps/web/src/app/layout.tsx`

### 🟡 Código próxima sesión
- Rate limit: `/upload` (5/min) y `/api/consulta-ia` (10/min)
- WhatsApp webhook HMAC verificación
- Clinica Together `planId: 'PRO'` → `'profesional'`

## Comandos útiles

```bash
# Typecheck
pnpm --filter web exec tsc --noEmit
pnpm --filter api exec tsc --noEmit

# Dev
pnpm dev

# Build
pnpm build

# Logs Vercel producción
vercel logs --follow  # desde apps/web o apps/api
```
