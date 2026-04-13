# MedClinic Pro — Handoff Completo
> Actualizado: 2026-04-13 | Rama: `main` | Último commit: `acdda58`

---

## 1. Repositorio y acceso rápido

```
Monorepo: /Users/gerardohorta/Library/Mobile Documents/com~apple~CloudDocs/B2D Automation/CLAUDE/CLINIC/medclinic-pro
GitHub:   https://github.com/ghorta74-b2d/medclinic-pro
Web prod: https://medclinic-web.vercel.app
API prod: https://medclinic-api.vercel.app
DB:       Supabase project gzojhcjymqtjswxqgkgk (sa-east-1)
```

**Deploy:** `git push origin main` → auto-deploy en Vercel (ambos apps).

---

## 2. Stack

| Capa | Tech |
|------|------|
| Frontend | Next.js 14 App Router, Tailwind, `apps/web` |
| Backend | Fastify + Prisma, `apps/api`, serverless en Vercel |
| DB | Supabase Postgres (`gzojhcjymqtjswxqgkgk`) |
| Auth | Supabase Auth — roles en `user_metadata.role` |
| Email | Resend, dominio `glasshaus.mx`, sender `medclinic@glasshaus.mx` |
| Shared types | `packages/medclinic-shared` |

---

## 3. Credenciales

| Cuenta | Email | Pass | Rol |
|--------|-------|------|-----|
| SuperAdmin | `ghorta74@gmail.com` | `21@Homero!` | `SUPER_ADMIN` |

**Vercel Team:** `team_5b8HfRA7B0605D5MRa2BQ6qA`  
**Web project:** `prj_Sg1JAPtfDrtTxAlmBcxle48x5u7W`  
**API project:** `prj_n6FzzeQYAsdUyEt12UNSC9kYQbqa`  
**DB password:** `hyQxCpXt26SH99Kb`  
**Supabase MCP project_id:** `gzojhcjymqtjswxqgkgk`

---

## 4. Roles y permisos

```
SUPER_ADMIN → /superadmin        (panel de todas las clínicas)
ADMIN       → /dashboard          (dueño/médico principal — VE SOLO SU PROPIA AGENDA)
DOCTOR      → /agenda             (médico — VE SOLO SU PROPIA AGENDA)
STAFF       → /dashboard          (recepcionista/admin — VE AGENDA GLOBAL DE TODOS)
```

### DOCTOR / ADMIN — agenda propia
- **Agenda page:** auto-filtra a su propio `doctorId` (via JWT + `/configuracion/schedule`)
- **Dashboard:** "Próximas consultas" filtra por su propio `doctorId`
- **Nueva cita:** sin selector de doctor — usa siempre el suyo propio

### STAFF — acceso global (para control administrativo)
- **Agenda page:** ve todas las citas + filtro de doctores visible
- **Dashboard:** ve todas las citas del día de todos los doctores
- **Nueva cita:** muestra selector de doctor para elegir a quién agendar
- **Pacientes/[id]:** solo tab Recetas (ver/imprimir, NO crear/editar)
- **Configuración:** solo tabs Horarios y Catálogo

### Patrón correcto de checks
```typescript
// Agenda / nueva cita — solo STAFF ve vista global
const isStaffRole = userRole === 'STAFF'

// Expediente paciente — restringir solo STAFF
const isReadOnly = userRole === 'STAFF'

// Dashboard layout — ambos ADMIN y STAFF van al panel admin
const isAdmin = userRole === 'ADMIN' || userRole === 'STAFF'
```

---

## 5. Archivos críticos

### Frontend `apps/web/src/`

| Archivo | Qué hace |
|---------|----------|
| `lib/api.ts` | Cliente API + `getUserRole()` + `getOwnDoctorId()` + singleton Supabase + token cache TTL |
| `app/(auth)/login/page.tsx` | Login — redirect por rol, supabase singleton a nivel módulo |
| `app/auth/invite/page.tsx` | Activación cuenta — supabase singleton a nivel módulo (crítico) |
| `app/(dashboard)/dashboard/page.tsx` | KPIs + próximas consultas **filtradas por doctorId propio** |
| `app/(dashboard)/agenda/page.tsx` | Agenda **con filtro por rol**: STAFF=global, DOCTOR/ADMIN=solo suya |
| `app/(dashboard)/pacientes/[id]/page.tsx` | Expediente — roles, tabs, audit trail, PatientProfileModal |
| `app/(dashboard)/cobros/page.tsx` | Facturación Día/Semana/Mes |
| `app/(dashboard)/configuracion/page.tsx` | Config — tabs filtradas por rol |
| `app/(dashboard)/recetas/[id]/page.tsx` | Impresión de receta |
| `components/agenda/new-appointment-dialog.tsx` | **Rol-aware**: STAFF elige doctor, DOCTOR/ADMIN usan el suyo |
| `components/layout/sidebar.tsx` | `h-screen sticky` — Cerrar sesión siempre visible |

### Backend `apps/api/src/`

| Archivo | Qué hace |
|---------|----------|
| `routes/billing.ts` | insurerName, recordedByName, paidInvoiceCount por período |
| `routes/prescriptions.ts` | GET / y /:id usan `requireStaff` (STAFF puede ver/imprimir) |
| `routes/patients.ts` | PATCH guarda lastModifiedByName + lastModifiedAt |
| `routes/configuracion.ts` | Invite flow, lista doctores, schedule |
| `routes/appointments.ts` | Filtra por `doctorId` si se pasa como query param |
| `middleware/auth.ts` | requireDoctor=DOCTOR+ADMIN+SUPER_ADMIN / requireStaff=+STAFF |
| `prisma/schema.prisma` | Schema fuente de verdad |

---

## 6. Patrones críticos — NO romper

### A. Supabase client singleton
```typescript
// SIEMPRE a nivel módulo, NUNCA dentro de un componente/función
const supabase = createBrowserClient(URL, KEY)
// Si está adentro del componente → nueva instancia cada render → pierde sesión
```

### B. getUserRole() y getOwnDoctorId() — JWT cacheado
```typescript
// En api.ts — decodifica del JWT sin llamar getSession() extra
export async function getUserRole(): Promise<string | null>
export async function getOwnDoctorId(): Promise<string | null>  // doctor_id en user_metadata

// Para DOCTOR/ADMIN — obtener su propio doctorId:
const [ownId, schedRes] = await Promise.all([
  getOwnDoctorId(),
  api.configuracion.getSchedule() as Promise<{ data: { doctorId: string } }>,
])
const myDoctorId = ownId ?? schedRes.data.doctorId
```

### C. Token cache
```typescript
let _tokenCache: { token: string; expiresAt: number } | null = null
// Invalida en 401 responses automáticamente
// TTL = JWT expiry - 60s (nunca envía token expirado)
```

### D. Reenviar invitación (configuracion.ts)
```typescript
// Sin authUserId → usuario NUEVO → type:'invite' + guardar authUserId
// Con authUserId → usuario EXISTENTE → type:'recovery' (password reset)
// Ambos redirigen a /auth/invite
```

### E. PDF en Vercel
```
NO: @react-pdf/renderer → crashea yoga-layout en serverless
SÍ: página /recetas/[id] con CSS print + window.print()
```

### F. Teléfono
```
Formato DB: +52XXXXXXXXXX (prefijo fijo México, 10 dígitos)
```

---

## 7. DB — columnas agregadas con SQL directo

No hay `_prisma_migrations`. Los cambios de schema se hacen con:
1. Editar `apps/api/prisma/schema.prisma`
2. Ejecutar SQL en Supabase MCP

```sql
-- Audit trail en pacientes
ALTER TABLE patients ADD COLUMN IF NOT EXISTS "lastModifiedByName" TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS "lastModifiedAt" TIMESTAMPTZ;

-- Registro de quién cobró y con qué aseguradora
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS "recordedByName" TEXT;
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS "insurerName" TEXT;
```

---

## 8. Funcionalidades completas ✅

- Auth completa con roles, redirect por rol, invite, reenviar invite
- Expediente paciente: tabs por rol, modal "Ver perfil completo", audit trail, VitalsStrip
- Facturación: Día/Semana/Mes, badge "Registrado por", 16 aseguradoras MX, concepto real
- Sidebar: h-screen sticky — Cerrar sesión/Configuración siempre visibles
- Configuración: tabs restringidos para STAFF
- Recetas: STAFF puede ver/imprimir
- Laboratorio: upload PDF + análisis IA + delete múltiple
- Agenda: DOCTOR/ADMIN ven su propia agenda; STAFF ve global con filtro
- Nueva cita: sin selector para DOCTOR/ADMIN; con selector para STAFF
- Dashboard: "Próximas consultas" filtrada por doctorId propio

---

## 9. BUG CRÍTICO PENDIENTE — Martha Lopez como doctor ⚠️

### El problema
Cuando se invita un usuario con rol STAFF, el endpoint `POST /api/configuracion/doctors` 
**SIEMPRE crea un registro en la tabla `doctors`** — incluso si el rol es STAFF.

Esto causa que Martha Lopez (STAFF) aparezca como doctor en:
- El selector de "Doctor" en Nueva Cita (para usuarios STAFF)
- El filtro de doctores en la Agenda

### Raíz en `apps/api/src/routes/configuracion.ts`
```typescript
// POST /api/configuracion/doctors (línea ~148)
// Crea Doctor record PRIMERO, luego invite con body.role
const doctor = await prisma.doctor.create({ ... })  // ← siempre crea, sin importar role
// Luego invita con: role: body.role ?? 'DOCTOR'     // ← puede ser 'STAFF'
```

### Fix recomendado — OPCIÓN A (más limpio)
En `GET /api/configuracion/doctors`, filtrar por rol en Supabase Auth.
El Doctor model tiene `authUserId`. Cruzar con Supabase para excluir STAFF:
```typescript
// En configuracion.ts GET /doctors
const doctors = await prisma.doctor.findMany({
  where: { clinicId, isActive: true },
})
// Filtrar: excluir doctores cuyo authUserId tiene role=STAFF en Supabase
const users = await supabaseAdmin.auth.admin.listUsers()
const staffIds = new Set(
  users.data.users
    .filter(u => u.user_metadata?.role === 'STAFF')
    .map(u => u.id)
)
return { data: doctors.filter(d => !staffIds.has(d.authUserId ?? '')) }
```

### Fix recomendado — OPCIÓN B (más simple)
No crear registro `Doctor` cuando `body.role === 'STAFF'` en el POST.
Requiere refactorizar el invite flow de STAFF para no usar este endpoint.

### Estado actual
No se creará registro Doctor para nuevos STAFF si se arregla.
Martha Lopez ya tiene registro en DB — necesita eliminarse manualmente o marcarse `isActive: false`.

---

## 10. Pendientes / bugs conocidos

| # | Descripción | Prioridad |
|---|-------------|-----------|
| 1 | **Martha Lopez como doctor** — ver §9 arriba para fix completo | **ALTA** |
| 2 | **RecordPaymentDialog** no tiene campo insurerName (solo NewInvoiceDialog tiene) | Media |
| 3 | **Warm-up ping** — cold start Vercel 2-4s | Baja |
| 4 | **WhatsApp PDF** — pdfUrl se invalida al editar receta | Baja |
| 5 | **Dashboard clínica** — nombre de clínica no se muestra en header | Baja |
| 6 | **Asistente IA KPIs** — datos de ejemplo, no conectados a BD real | Baja |
| 7 | **Prisma migrations** — BD sin historial de migrations | Técnica |

---

## 11. Catálogos incluidos

### Aseguradoras México (gastos médicos)
```
AXA Seguros, GNP Seguros, Mapfre, MetLife, BBVA Seguros,
Seguros Monterrey NY Life, Allianz, Zurich, Cigna, Bupa,
SURA, HDI Seguros, Banorte Seguros, Inbursa Seguros,
Seguros Atlas, Otro
```
Ubicación: `apps/web/src/components/billing/new-invoice-dialog.tsx`

---

## 12. Comandos útiles

```bash
# Dev local
cd "apps/web" && pnpm dev     # localhost:3000
cd "apps/api" && pnpm dev     # localhost:3001

# Deploy
git push origin main          # auto-deploy ambos en Vercel

# Regenerar Prisma client
cd apps/api && npx prisma generate

# TypeScript check
npx tsc --noEmit -p apps/web/tsconfig.json
npx tsc --noEmit -p apps/api/tsconfig.json
```

---

## 13. Contexto de negocio

- **Mercado:** LATAM, enfoque México (CURP, SPEI, aseguradoras locales, WhatsApp)
- **Modelo:** SaaS — un SuperAdmin gestiona múltiples clínicas independientes
- **Usuarios tipo clínica:** ADMIN (dueño médico) + DOCTORs + STAFF (recepcionista)
- **Canal pacientes:** WhatsApp (principal), email
- **Flujo típico:** STAFF agenda cita + registra cobro → DOCTOR atiende + firma nota → STAFF imprime receta
- **Proyecto separado NO tocar:** `doctor-calendar` (github.com/ghorta74-b2d/doctor-calendar)
