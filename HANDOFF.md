# MedClinic Pro — Handoff Completo
**Última actualización:** 2026-04-22 | **Branch:** `main` | **Último commit:** `7555caa`

---

## Stack y Repositorio

| Elemento | Valor |
|---|---|
| Monorepo | `/Users/gerardohorta/Library/Mobile Documents/com~apple~CloudDocs/B2D Automation/CLAUDE/CLINIC/medclinic-pro` |
| GitHub | `https://github.com/ghorta74-b2d/medclinic-pro` |
| Web (Next.js 14) | `apps/web` → `medclinic-web.vercel.app` |
| API (Fastify + Prisma) | `apps/api` → `medclinic-api.vercel.app` |
| DB | Supabase `gzojhcjymqtjswxqgkgk` (sa-east-1) |
| Auth | Supabase Auth — roles en `user_metadata.role` |
| Email | Resend, sender `medclinic@glasshaus.mx` |
| Package manager | pnpm workspaces |

**Dominio activo:** `https://mediaclinic.mx` (producción) — Vercel + DNS configurado

**Vercel:**
- Team: `team_5b8HfRA7B0605D5MRa2BQ6qA`
- Web project: `prj_Sg1JAPtfDrtTxAlmBcxle48x5u7W`
- API project: `prj_n6FzzeQYAsdUyEt12UNSC9kYQbqa`
- Deploy: `git push origin main` → Vercel auto-deploya ambos proyectos

**Prisma:**
- Schema: `apps/api/prisma/schema.prisma`
- Output: `apps/api/generated/` (NO está en git — se regenera con `prisma generate` en build Vercel)
- `apps/api/vercel.json` tiene `buildCommand: "prisma generate"` + `includeFiles: "generated/**"`

---

## Usuarios de Producción (clínica `cmnr49xsl00004ev0ziey0sk2`)

| Nombre | Email | Rol JWT | doctor_id |
|---|---|---|---|
| Gerardo Horta | `c5@b2d.mx` | ADMIN | `cmnr49y8g00024ev0so8uwvv6` |
| Paulina González | `paulina@b2d.mx` | DOCTOR | `cmnxdxb1v0001o52vmfj5tfmz` |
| Marcela Altamirano | `mrcaltamiranochan@gmail.com` | ADMIN | `cmo0ooqzo0001olngedne3gdr` |
| Martha López | `mlopez@b2d.mx` | STAFF | `cmnt6otqv00011qlg9t6l09vw` |

**SuperAdmin platform:** `ghorta74@gmail.com` (contraseña en gestor de contraseñas) → `/superadmin`

> ⚠️ **Martha López** tiene un record `Doctor` en DB con `role: STAFF` — NO borrar, tiene citas históricas asignadas.
> ⚠️ Hay 6 registros de doctor desactivados (`isActive: false`) que son duplicados de prueba — no reactivar.

---

## Modelo de Roles — Fuente de Verdad

| Funcionalidad | DOCTOR | ADMIN | STAFF |
|---|---|---|---|
| Agenda — vista por defecto | Solo sus citas | Toda la clínica | Toda la clínica |
| Agenda — filtro de médico | ❌ fijo en sus citas | ✅ Todos / Dr. X | ✅ Todos / Dr. X |
| Cobros — vista por defecto | Solo sus facturas | Toda la clínica | Toda la clínica |
| Cobros — filtro de médico | ❌ | ✅ dropdown | ✅ dropdown |
| Crear cita / factura | ✅ | ✅ | ✅ |
| Atender cita (consulta) | ✅ solo propias | ✅ propias + tomar otras | ❌ |
| Reasignar cita | ❌ | ✅ | ✅ |
| Firmar nota clínica | ✅ solo propias | ✅ cualquiera en clínica | ❌ |
| Ver expediente clínico | ✅ sus pacientes | ✅ toda la clínica | ✅ solo lectura |
| Exportar expediente ARCO | ✅ sus pacientes | ✅ toda la clínica | ❌ (403) |
| Configuración clínica | ❌ | ✅ | ❌ |
| Gestión usuarios / roles | ❌ | ✅ | ❌ |
| MFA requerido | ✅ banner | ✅ banner | ❌ |

**Plan PRO limits (clínica actual):** 4 Médicos+Admins / 1 Administrativo (STAFF)

---

## ⚠️ PATRÓN CRÍTICO DE ROLES (vigente desde 2026-04-15)

`agenda/page.tsx` y `cobros/page.tsx` siempre verifican JWT en mount. **Nunca** bootstrapear rol desde sessionStorage.

```typescript
// ✅ CORRECTO — estado inicia en null, siempre verifica JWT
const [userRole, setUserRole] = useState<string | null>(null)
const [roleReady, setRoleReady] = useState(false)

useEffect(() => {
  async function init() {
    try {
      const role = await getUserRole()   // Decodifica JWT — sin red
      if (!role) return
      const cachedRole = sessionCache.getRole()
      if (cachedRole && cachedRole !== role) sessionCache.clear()
      sessionCache.setRole(role)
      setUserRole(role)
      if (role === 'DOCTOR') {
        const myId = await getOwnDoctorId()
        if (myId) { sessionCache.setDoctorId(myId); setSelectedDoctorId(myId) }
      } else {
        sessionCache.clearDoctorId()
        setSelectedDoctorId(null)
        api.configuracion.doctors().then(res => setDoctors(res.data ?? []))
      }
    } catch {}
    finally { setRoleReady(true) }
  }
  init()
}, [])
```

```typescript
// ❌ OBSOLETO — NO usar (causaba datos cruzados entre usuarios)
const [userRole] = useState(() => sessionCache.getRole())
if (sessionCache.getRole()) return
```

---

## Estado de Cumplimiento NOM-004 / NOM-024 / LFPDPPP

### ✅ Fase 0 + Fase 1 — NOM-004 Base (commit `066ba7c`, 2026-04-15)

| Item | Descripción | Archivos |
|---|---|---|
| **Bucket privado** | `clinical-files` → `public: false`. Archivos clínicos requieren signed URL (1h). Upload guarda path relativo, no URL pública. | `lib/supabase.ts`, `lab-results.ts` |
| **Soft delete LabResult** | `deletedAt TIMESTAMPTZ` — retención 5 años NOM-004. El archivo en Storage NO se borra. | `schema.prisma`, `lab-results.ts` |
| **requireAdmin en PATCH /clinic** | Solo ADMIN/SUPER_ADMIN modifican datos de la clínica. | `configuracion.ts` |
| **auditLog completo** | `POST/PATCH /appointments`, `/patients`, `/clinical-notes`, `/lab-results` — todos generan audit trail. | `audit.ts` + rutas |
| **IP + User-Agent en auditoría** | Todos los `auditLog()` capturan `request.ip` y `user-agent` en metadata. | `audit.ts` |
| **Hard fail en auditLog** | Si el log falla, la operación lanza error (no silencio). Fire-and-forget usa `.catch()` explícito. | `audit.ts` |
| **Validación CURP algorítmica** | Dígito verificador RENAPO — no solo `length(18)`. | `patients.ts` |
| **PDF receta → nota FIRMADA** | `POST /generate-pdf` verifica `clinicalNote.status === 'SIGNED'`. | `prescriptions.ts` |
| **Enmienda → firmar antes de segunda** | `POST /:id/amend` bloquea si ya hay una enmienda DRAFT sin firmar. | `clinical-notes.ts` |
| **Etiqueta IA en llmSummary** | Guarda `llmSummaryGeneratedAt` y `llmProvider` al crear resumen con Claude. | `lab-results.ts` |
| **Versión semántica** | `package.json v1.0.0` + `GET /health` expone `version` y `app`. | `server.ts` |
| **Credenciales fuera del repo** | `.gitignore` cubre `apps/**/.env` y `apps/api/generated/`. | `.gitignore` |

### ✅ Fase 2 — Catálogos NOM-024 (commit `ba2d0dc`, 2026-04-16)

| Item | Descripción | Estado |
|---|---|---|
| **2.1 CIE-10** | Tabla `cie10_codes` + 247 códigos SSA México en prod. `GET /api/catalogs/cie10?q=`. `note-editor.tsx` búsqueda async debounce 300ms + spinner. `seed-catalogs.ts` acepta `--csv=` para los ~70k completos. | ✅ |
| **2.2 CUM COFEPRIS** | Campo `cumKey` en `Medication`. 112 medicamentos en prod. `GET /api/catalogs/cum?q=`. | ✅ |
| **2.3 Validaciones vitales** | `VitalSignsSchema`: sistólica 60-250, diastólica 40-150, FC 20-300, temp 34-42°C, FR 5-60, glucosa 20-600. | ✅ |

**Para cargar CIE-10 completo (~70k):**
```bash
cd apps/api && npx tsx prisma/seed-catalogs.ts --csv=/ruta/CIE10_SSA.csv
# CSV oficial: https://www.paho.org/es/clasificacion-internacional-enfermedades
```

### ✅ Fase 3 — Privacidad LFPDPPP + MFA (commit `83c8d26`, 2026-04-16)

| Item | Descripción | Estado |
|---|---|---|
| **3.1 Aviso de privacidad** | `new-patient-dialog.tsx`: aviso LFPDPPP expandible, doble checkbox (`privacyConsentAt` + `dataConsentAt`), requerido para crear paciente. | ✅ |
| **3.2 ARCO — Acceso** | `GET /api/patients/:id/data-export` — exporta JSON completo (datos, citas, notas, recetas, labs, seguros). Solo ADMIN/DOCTOR. Audit trail `action: EXPORT, reason: ARCO_ACCESS`. | ✅ |
| **3.3 MFA TOTP** | `/mfa-setup`: enrolamiento TOTP paso a paso (QR + clave manual + verificación). Login: segundo paso TOTP cuando factor verificado. Dashboard: banner amber para ADMIN/DOCTOR sin MFA (dismissable por sesión vía `_mc_mfa_dismissed` en sessionStorage). | ✅ |

### ✅ QA Fix — Sección Usuarios (commit `5888b5f`, 2026-04-16)

| Item | Fix |
|---|---|
| **"d" bajo nombre de Gerardo** | Especialidad solo se muestra para rol DOCTOR con valor > 1 caracter |
| **Label "Médicos" inexacto** | Renombrado a "Médicos y Admins" (el cupo incluye rol ADMIN) |
| **Barra de límite sin feedback** | Cuando `usado >= límite`: color rojo + label "Límite alcanzado" |
| **Acciones truncadas ("Ca...")** | Layout `flex-col + flex-wrap`: acciones primarias en fila 1, cambios de rol en fila 2 |
| **"Cambiar a Médico" ambiguo** | Renombrado a "Quitar Admin" |
| **DB: specialty = "d"** | Limpiado a `""` en Gerardo Horta (`cmnr49y8g`) |
| **DB: "Marcela " trailing space** | Corregido a `"Marcela"` |
| **DB: 6 registros de prueba activos** | Desactivados (`isActive = false`): g/g/g, ADMIN/ADMIN, 3 Gerardos duplicados, Gerardo Iturriaga |

---

## Fase 4 — Infraestructura (PRÓXIMA)

### Objetivo
CI/CD, tests de integración, staging environment, limpieza de sesión al logout.

### 4.1 — CI/CD GitHub Actions

```yaml
# .github/workflows/ci.yml — en cada PR
- pnpm lint (apps/web + apps/api)
- pnpm typecheck
```

Secretos requeridos en GitHub: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_WEB_PROJECT_ID`, `VERCEL_API_PROJECT_ID`

### 4.2 — Tests de integración

Framework sugerido: **Vitest** + Fastify `inject()` (sin red real).

Rutas críticas mínimas:
- `POST /api/appointments` → auditLog se crea
- `DELETE /api/patients/:id` → soft delete (`isActive: false`), no borrado físico
- `PATCH /api/configuracion/clinic` → rechaza `role !== ADMIN` con 403
- `GET /api/patients/:id/data-export` → rechaza `role === STAFF` con 403

### 4.3 — Staging

- Nuevo proyecto Supabase para staging (branch o proyecto separado)
- Proyecto Vercel "medclinic-staging" apuntando al Supabase de staging
- Branch `staging` → auto-deploya a Vercel staging

### 4.4 — sessionCache.clear() en logout

**Archivo:** `apps/web/src/components/layout/sidebar.tsx`
**Qué hacer:** Llamar `sessionCache.clear()` **antes** de `supabase.auth.signOut()` en el handler de logout.

---

## Fase 5 — Interoperabilidad (no bloquea certificación v1)

- FHIR R4: recursos `Patient`, `Encounter`, `MedicationRequest`
- ARCO completo: Rectificación (UI), Cancelación (UI con `deletedReason`), Oposición
- WhatsApp audit trail completo

---

## Archivos Clave del Proyecto

### Backend (`apps/api/src/`)

| Archivo | Responsabilidad |
|---|---|
| `middleware/auth.ts` | `authenticate()`, `requireRoles()`, `requireDoctor`, `requireStaff`, `requireAdmin` |
| `middleware/audit.ts` | `auditLog(params)` — append-only, hard fail, captura IP+UA |
| `lib/supabase.ts` | `supabase` client, `verifySupabaseToken()`, `getSignedFileUrl()`, `getSignedFileUrls()` |
| `lib/prisma.ts` | Singleton Prisma client |
| `routes/appointments.ts` | CRUD citas, takeover, reasignación, availability — con auditLog completo |
| `routes/patients.ts` | CRUD pacientes, CURP algorítmico, soft delete, ARCO export |
| `routes/clinical-notes.ts` | SOAP notes, firma electrónica, enmiendas NOM-004 |
| `routes/prescriptions.ts` | Recetas, PDF (requiere nota FIRMADA), WhatsApp |
| `routes/lab-results.ts` | Resultados lab, upload Storage privado, signed URLs, soft delete, AI summary |
| `routes/billing.ts` | Facturas e ingresos — filtro por rol |
| `routes/configuracion.ts` | Config clínica (PATCH → ADMIN), médicos, horarios, usuarios, roles |
| `routes/catalogs.ts` | `GET /api/catalogs/cie10?q=` y `/cum?q=` — requieren `requireStaff` |
| `prisma/schema.prisma` | Schema completo |
| `prisma/seed-catalogs.ts` | Seed CIE-10 (247 codes) + CUM (112 meds), acepta `--csv=` |

### Frontend (`apps/web/src/`)

| Archivo | Responsabilidad |
|---|---|
| `lib/api.ts` | Cliente API, `getUserRole()`, `getOwnDoctorId()`, `sessionCache`, `readCache/writeCache`, `api.catalogs`, `api.patients.dataExport()` |
| `app/(auth)/login/page.tsx` | Login con segundo paso TOTP si factor verificado |
| `app/(dashboard)/layout.tsx` | Banner MFA para ADMIN/DOCTOR sin TOTP configurado |
| `app/mfa-setup/page.tsx` | Enrolamiento TOTP paso a paso (QR + manual + verificación) |
| `app/(dashboard)/agenda/page.tsx` | Lista citas — patrón JWT-first correcto |
| `app/(dashboard)/cobros/page.tsx` | Facturas — patrón JWT-first correcto |
| `app/(dashboard)/configuracion/page.tsx` | Config clínica — tabs por rol, sección usuarios corregida |
| `app/(dashboard)/pacientes/[id]/page.tsx` | Expediente paciente |
| `components/patients/new-patient-dialog.tsx` | Formulario nuevo paciente + aviso LFPDPPP expandible + doble consentimiento |
| `components/clinical-notes/note-editor.tsx` | Editor SOAP, búsqueda CIE-10 async con debounce 300ms |

---

## Estado de la DB (Supabase `gzojhcjymqtjswxqgkgk`)

### Tablas con columnas agregadas vía SQL (fuera de Prisma migrations)

```sql
-- patients
ALTER TABLE patients ADD COLUMN IF NOT EXISTS "lastModifiedByName" TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS "lastModifiedAt" TIMESTAMPTZ;

-- payment_records
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS "recordedByName" TEXT;
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS "insurerName" TEXT;

-- lab_results (migración: lab_results_nom004_compliance, 2026-04-15)
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS "llmSummaryGeneratedAt" TIMESTAMPTZ;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS "llmProvider" TEXT;
CREATE INDEX IF NOT EXISTS idx_lab_results_not_deleted
  ON lab_results ("clinicId", "patientId") WHERE "deletedAt" IS NULL;

-- cie10_codes (nueva tabla, Fase 2)
-- Creada vía prisma migrate / apply_migration con modelo Cie10Code
-- 247 códigos SSA México ya insertados en prod
```

### Índices existentes
```sql
CREATE INDEX IF NOT EXISTS idx_invoice_clinic_issued ON "Invoice" ("clinicId", "issuedAt");
CREATE INDEX IF NOT EXISTS idx_invoice_clinic_doctor ON "Invoice" ("clinicId", "doctorId");
CREATE INDEX IF NOT EXISTS idx_invoice_created ON "Invoice" ("createdAt");
CREATE INDEX IF NOT EXISTS idx_payment_invoice ON "PaymentRecord" ("invoiceId");
CREATE INDEX IF NOT EXISTS idx_payment_paid ON "PaymentRecord" ("paidAt");
CREATE INDEX IF NOT EXISTS idx_doctor_clinic_active ON "Doctor" ("clinicId", "isActive");
CREATE INDEX IF NOT EXISTS idx_cie10_code ON cie10_codes (code);
CREATE INDEX IF NOT EXISTS idx_cie10_description ON cie10_codes (description);
```

### Storage
- Bucket `clinical-files`: **privado** (`public: false`) desde 2026-04-15.
- Path de archivos: `lab-results/{clinicId}/{id}/{timestamp}-{filename}`
- GET de archivos: `getSignedFileUrl()` / `getSignedFileUrls()` → signed URL con TTL 1h.
- Registros legacy con URL completa (`https://...`) se manejan por `toStoragePath()`.

### Datos de prueba en prod
```
Citas:    14 asignadas a Gerardo, 4 a Paulina, 1 a Martha
Facturas: INV-001 a INV-006 → Gerardo | INV-007 a INV-009 → Paulina | INV-010 → Gerardo
CIE-10:   247 códigos SSA México activos en tabla cie10_codes
CUM:      112 medicamentos COFEPRIS activos en tabla medications
```

### Queries útiles de depuración
```sql
-- Usuarios activos de la clínica
SELECT id, "firstName", "lastName", role, specialty, "isActive"
FROM doctors WHERE "isActive" = true ORDER BY role, "lastName";

-- Audit log reciente
SELECT "userId", action, "resourceType", "resourceId", ip, "createdAt"
FROM audit_logs ORDER BY "createdAt" DESC LIMIT 20;

-- Verificar export ARCO
SELECT action, "resourceType", metadata, "createdAt"
FROM audit_logs WHERE action = 'EXPORT' ORDER BY "createdAt" DESC;

-- Soft-deleted lab results (retención NOM-004)
SELECT id, title, "deletedAt" FROM lab_results WHERE "deletedAt" IS NOT NULL;

-- Consentimientos LFPDPPP
SELECT "firstName", "lastName", "privacyConsentAt", "dataConsentAt"
FROM patients WHERE "privacyConsentAt" IS NOT NULL ORDER BY "createdAt" DESC LIMIT 10;

-- Facturas
SELECT "invoiceNumber", "doctorId", status, total, "issuedAt"
FROM invoices ORDER BY "issuedAt" DESC LIMIT 20;
```

---

## Commits Recientes

```
7555caa  fix: Analytics desde /react — el root no exporta componente JSX  ← HEAD
25f2df7  fix: Analytics como default import (incorrecto, corregido por 7555caa)
a8a045b  fix: resolver @vercel/analytics en pnpm monorepo (transpilePackages)
e30e17c  Analytics Vercel (commit manual del usuario — solo agregó dep en package.json)
a6f137e  feat: Vercel Analytics (instalación inicial)
b4651b6  fix: ocultar usuarios inactivos y soft-delete con historial
aa4f038  fix: añadir mediaclinic.mx a CORS del API
417f7b5  fix: auth guard en dashboard layout, middleware sin session check
03b1daa  fix: login stuck en "Ingresando…" post-auth
5888b5f  fix(usuarios): corregir sección equipo — datos y UX
```

---

## ✅ Sesión 2026-04-22 — Fixes aplicados

### 1. RLS Supabase — Seguridad crítica (commit anterior a esta sesión)
Las 21 tablas tenían RLS desactivado — cualquiera con la anon key podía leer todos los datos.
- **Fix:** Migration `enable_rls_all_public_tables` aplicada en prod vía MCP Supabase
- **Estado:** ✅ Todas las tablas tienen `rowsecurity: true`
- **Nota:** Prisma usa el usuario `postgres` (bypass RLS). `service_role` también bypass. Solo `anon` key respeta RLS.

### 2. Dominio mediaclinic.mx — Root URL y CORS

**Root URL:** `apps/web/src/app/page.tsx` → re-exporta la landing en lugar de redirigir a `/dashboard`
```tsx
export { default } from './landing/page'
```

**CORS API:** `apps/api/src/server.ts` — agregado mediaclinic.mx a `allowedOrigins`
```typescript
const allowedOrigins = [
  process.env['NEXT_PUBLIC_APP_URL'],
  'http://localhost:3000',
  'https://mediaclinic.mx',
  'https://www.mediaclinic.mx',
  'https://medclinic-web.vercel.app',
  'https://medclinic-web-ghorta74-6617s-projects.vercel.app',
].filter(Boolean) as string[]
// origin check también cubre startsWith('https://mediaclinic')
```

### 3. Login stuck en "Ingresando..."
- **Causa raíz:** Middleware con session check amplio → race condition con cookies → redirect a /login → React no desmontaba el componente → `loading: true` indefinido
- **Fix:** Middleware revierte a solo restricción STAFF. Auth guard real en `(dashboard)/layout.tsx` usando browser `getSession()` con spinner mientras verifica.

### 4. Marcela Altamirano — Usuario fantasma
- **Causa:** Hard-delete fallaba silenciosamente (FK a citas/recetas). GET /users mostraba inactivos sin filtrar.
- **Fix en `apps/api/src/routes/configuracion.ts`:**
  - `GET /users`: agrega `where: { isActive: true }` 
  - `DELETE /users/:id`: soft-delete si hay historial → `isActive: false, authUserId: null` (preserva NOM-004)
- **Estado en prod:** Marcela está `isActive: false` y NO aparece en la lista.

### 5. Vercel Analytics — Instalación definitiva
- **Problema:** 4 intentos fallidos por conflicto de pnpm workspaces + exports de `@vercel/analytics` v2
- **Solución definitiva:**
  - `apps/web/next.config.mjs`: `transpilePackages: ['medclinic-shared', '@vercel/analytics']`
  - `apps/web/src/app/layout.tsx`: `import { Analytics } from '@vercel/analytics/react'`
- **Por qué:** El componente JSX React SOLO existe en el subpath `/react`. El root export son funciones `inject/track/va`. `transpilePackages` es necesario para que webpack resuelva subpaths en pnpm monorepo.
- **Estado:** Deploy `7555caa` en progreso — debería ser el primero en pasar ✅

### 6. Git refs corruptas
- **Problema:** Archivo `HEAD 2` en `.git/refs/remotes/origin/` causaba `fatal: bad object` en `git fetch`
- **Fix:** `rm ".git/refs/remotes/origin/HEAD 2"` → `git fetch origin` volvió a funcionar

---

## Reglas Críticas — No Romper

1. **NO `@fastify/compress`** — incompatible con Vercel serverless (streaming zlib)
2. **NO bootstrapear rol desde sessionStorage** — siempre verificar JWT en `init()` al mount
3. **NO `getSchedule()`** para obtener doctorId — usar `getOwnDoctorId()` del JWT
4. **Supabase client:** singleton a nivel módulo — nunca instanciar dentro de un componente
5. **Martha López:** tiene Doctor record (`cmnt6otqv`) — NO borrar, tiene citas históricas
6. **Registros de prueba:** 6 doctors con `isActive: false` — NO reactivar
7. **Cobros limit:** `200` facturas — no bajar (las primeras 6 desaparecían con límite 50)
8. **LabResult delete:** SIEMPRE soft delete (`deletedAt`) — nunca `prisma.labResult.delete()`
9. **Bucket `clinical-files`:** privado — nunca volver a `public: true`
10. **auditLog():** lanza en lugar de silenciar — fire-and-forget usa `.catch(console.error)`
11. **apps/api/generated/:** NO commitar — se regenera con `prisma generate` en build Vercel
12. **Especialidad en tabla usuarios:** solo mostrar si `role === 'DOCTOR'` y `length > 1`
13. **Doctor delete:** SIEMPRE verificar historial antes — soft-delete si tiene citas/notas/recetas
14. **CORS API:** al agregar dominio nuevo → actualizar `allowedOrigins` en `apps/api/src/server.ts`
15. **@vercel/analytics:** importar de `/react` subpath, NO del root. Requiere `transpilePackages` en next.config.mjs
16. **RLS Supabase:** todas las tablas tienen RLS activo — no desactivar. Prisma usa `postgres` user (bypass automático).

---

## Performance — Arquitectura Vigente

1. `layout.tsx` → `warmupApi()` al montar (pre-calienta serverless Vercel)
2. `sessionCache` → rol + doctorId guardados post-JWT (0ms lectura, ~100ms verificación en mount)
3. `readCache/writeCache` → listas en sessionStorage TTL 3 min
4. In-memory cache para `/doctors`, `/services`, `/types` (TTL 5-10 min) en `api.ts`
5. Backend: queries paralelas con `Promise.all()`, fire-and-forget para WhatsApp/email
6. `getSignedFileUrls()` usa batch `createSignedUrls()` de Supabase — minimiza round-trips

---

## Cómo Depurar Problemas de Rol

1. DevTools → Application → Session Storage → revisar `_mc_role` y `_mc_did`
2. Si no corresponden al usuario → `Cmd+Shift+R` (hard refresh)
3. Si persiste → verificar que `agenda/page.tsx` y `cobros/page.tsx` NO tengan `if (sessionCache.getRole()) return`
4. MFA banner que no aparece → borrar `_mc_mfa_dismissed` de Session Storage

---

## Pendientes / Deuda Técnica (Baja Prioridad)

- Paginación en cobros (límite actual 200)
- WhatsApp PDF se invalida al editar receta (URL cambia al regenerar)
- Nombre de clínica dinámico en header del dashboard
- Asistente IA KPIs no conectados a BD real
- `pdf.ts` línea 114 — error TypeScript pre-existente (no bloquea build ni deploy)
- ARCO UI completo: pantalla de Rectificación y Cancelación en expediente del paciente
- `sessionCache.clear()` en logout (`sidebar.tsx`) — pendiente desde Fase 4

## ⏳ Estado actual al cerrar sesión 2026-04-22

| Item | Estado |
|---|---|
| RLS en 21 tablas Supabase | ✅ Activado |
| Root URL → landing | ✅ Funcionando en mediaclinic.mx |
| Login stuck | ✅ Corregido |
| CORS mediaclinic.mx | ✅ Corregido |
| Dashboard/Cobros/Pacientes vacíos | ✅ Corregidos |
| Marcela en lista de usuarios | ✅ Eliminada (soft-deleted) |
| Vercel Analytics | ⏳ Deploy `7555caa` en progreso — pendiente confirmar READY |
| Git refs corruptas | ✅ Limpiadas |
