# MedClinic Pro — Guía para Claude

## Proyecto
SaaS de gestión clínica para LATAM. Monorepo pnpm + Turborepo.

**WD:** `/Users/gerardohorta/Library/Mobile Documents/com~apple~CloudDocs/B2D Automation/CLAUDE/CLINIC/medclinic-pro`  
**Repo:** `https://github.com/ghorta74-b2d/medclinic-pro`  
**Prod:** `https://mediaclinic.mx`  
**Último commit:** `1abdff1` — 2026-06-01 (⚠️ sin pushear; `origin/main`=`e45633e`)

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

### Cobros + Dashboard
- Navegación por meses con `components/ui/period-navigator.tsx` (Día/Semana/Mes + flechas + Hoy).
- KPIs con delta vs período anterior (`components/ui/kpi-card.tsx`). Gráficos en **Recharts**.
- Backend `billing.ts`: params `from/to/chartToUtc/prevFrom/prevTo` + endpoint `GET /api/billing/trend?months=6`.
  ⚠️ `chartToUtc` acota el gráfico (sin él, un mes pasado arrastra pagos del mes actual).

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
