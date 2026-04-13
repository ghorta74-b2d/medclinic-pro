# MedClinic Pro — Handoff Completo
> Actualizado: 2026-04-13 | Rama: `main` | Último commit: `4c7a3ad`

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
- **Agenda page:** auto-filtra a su propio `doctorId` (via JWT — sin llamada extra)
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
| `lib/api.ts` | Cliente API + `getUserRole()` + `getOwnDoctorId()` + `sessionCache` + `readCache/writeCache` + in-memory response cache |
| `app/(dashboard)/layout.tsx` | **'use client'** — llama `warmupApi()` al montar para pre-calentar serverless |
| `app/(auth)/login/page.tsx` | Login — redirect por rol, supabase singleton a nivel módulo |
| `app/auth/invite/page.tsx` | Activación cuenta — supabase singleton a nivel módulo (crítico) |
| `app/(dashboard)/dashboard/page.tsx` | KPIs + próximas consultas **filtradas por doctorId propio** + stale-while-revalidate |
| `app/(dashboard)/agenda/page.tsx` | Agenda **rol-aware** + sessionCache + stale-while-revalidate |
| `app/(dashboard)/pacientes/page.tsx` | Lista pacientes + stale-while-revalidate |
| `app/(dashboard)/pacientes/[id]/page.tsx` | Expediente — roles, tabs, audit trail, LabResultCard clickable header |
| `app/(dashboard)/cobros/page.tsx` | Facturación Día/Semana/Mes + stale-while-revalidate |
| `app/(dashboard)/configuracion/page.tsx` | Config — tabs filtradas por rol |
| `app/(dashboard)/recetas/[id]/page.tsx` | Impresión de receta |
| `components/agenda/new-appointment-dialog.tsx` | **Rol-aware**: STAFF elige doctor, DOCTOR/ADMIN usan el suyo |
| `components/layout/sidebar.tsx` | `h-screen sticky` — Cerrar sesión siempre visible |

### Backend `apps/api/src/`

| Archivo | Qué hace |
|---------|----------|
| `routes/billing.ts` | insurerName, recordedByName, O(1) invoice numbering, parallel DB queries |
| `routes/prescriptions.ts` | GET / y /:id usan `requireStaff` (STAFF puede ver/imprimir) |
| `routes/patients.ts` | PATCH guarda lastModifiedByName + lastModifiedAt, parallel lookups |
| `routes/configuracion.ts` | Invite flow, lista doctores (sin Supabase listUsers), schedule |
| `routes/appointments.ts` | WhatsApp + reminders fire-and-forget (no `await`) |
| `middleware/auth.ts` | requireDoctor=DOCTOR+ADMIN+SUPER_ADMIN / requireStaff=+STAFF |
| `prisma/schema.prisma` | Schema fuente de verdad + 6 nuevos índices DB |

---

## 6. Arquitectura de performance (CRÍTICO — no romper)

### Problema original
Cada navegación tomaba 8-10 segundos porque:
1. Serverless Vercel se "congela" tras ~5 min de inactividad (cold start 3-8s)
2. Cada página reiniciaba `roleReady = false`
3. `initRole()` hacía 2 llamadas API en cadena: `getUserRole()` → `getSchedule()` → solo entonces cargaba datos
4. Sin caché — misma cascada en cada visita

### Solución implementada (capas)

#### Capa 1: Warm-up ping en layout
```typescript
// apps/web/src/app/(dashboard)/layout.tsx — 'use client'
useEffect(() => { warmupApi() }, [])  // Ping /health al entrar al dashboard
```
Inicia el warm-up del serverless mientras el usuario ve la UI.

#### Capa 2: sessionStorage para role + doctorId
```typescript
// api.ts
export const sessionCache = {
  getRole: () => ssGet('_mc_role'),
  getDoctorId: () => ssGet('_mc_did'),
  setRole: (v: string) => ssSet('_mc_role', v),
  setDoctorId: (v: string) => ssSet('_mc_did', v),
  clear: () => ssClear(),  // llamar en logout
}
```

#### Capa 3: Bootstrap instantáneo del estado inicial
```typescript
// En cada página con roles:
const [userRole, setUserRole] = useState<string | null>(() => sessionCache.getRole())
const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(() => sessionCache.getDoctorId())
const [roleReady, setRoleReady] = useState(() => !!sessionCache.getRole())
// roleReady = true inmediatamente en visitas de retorno → datos cargan sin esperar
```

#### Capa 4: initRole solo en primera visita
```typescript
useEffect(() => {
  if (sessionCache.getRole()) return  // Skip en visitas de retorno — 0ms

  async function initRole() {
    const role = await getUserRole()
    if (role) sessionCache.setRole(role)
    setUserRole(role)

    if (role !== 'STAFF') {
      const myId = await getOwnDoctorId()  // Lee del JWT — SIN API call
      if (myId) { sessionCache.setDoctorId(myId); setSelectedDoctorId(myId) }
    } else {
      const res = await api.configuracion.doctors()  // Solo STAFF necesita lista
      setDoctors(res.data ?? [])
    }
    setRoleReady(true)
  }
  initRole()
}, [])
```

⚠️ **NUNCA** usar `getSchedule()` para obtener el `doctorId` propio — es una llamada API innecesaria.  
`getOwnDoctorId()` lee `doctor_id` de `user_metadata` en el JWT → 0ms.

#### Capa 5: Stale-while-revalidate en todas las páginas
```typescript
// Patrón aplicado en: agenda, dashboard, cobros, pacientes
const cacheKey = `_apt_${selectedDoctorId ?? 'all'}_${dateStr}_${viewMode}`

// 1. Mostrar cache inmediatamente (0ms de percepción)
const raw = sessionStorage.getItem(cacheKey)
if (raw) {
  const { data, ts } = JSON.parse(raw)
  if (Date.now() - ts < 3 * 60 * 1000) {  // Fresco si < 3 min
    setData(data)
    setLoading(false)
  }
}

// 2. Siempre refrescar en background (silenciosamente)
const res = await api.appointments.list(params)
setData(res.data)
sessionStorage.setItem(cacheKey, JSON.stringify({ data: res.data, ts: Date.now() }))
```

Cache keys por sección:
- Agenda: `_apt_{doctorId|'all'}_{date}_{viewMode}`
- Dashboard: `_dash_{doctorId|'all'}_{todayStr}`
- Cobros: `_cobros_{doctorId|'all'}_{viewMode}_{filter}`
- Pacientes: `_pts_{page}_{search}`

#### Capa 6: Cache in-memory en api.ts para endpoints estáticos
```typescript
// En api.ts — para /doctors, /services, /types
const _responseCache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000  // 5 min

// Invalidar al mutar:
invalidateCacheFor('doctors', 'services')
```

#### Capa 7: Optimizaciones API (backend)
- **GET /doctors:** eliminada llamada `supabaseAdmin.auth.admin.listUsers()` (~500ms) → solo Prisma con `role: { not: 'STAFF' }` filter
- **Invoice numbering:** `count()` O(n) → `findFirst(orderBy: createdAt desc)` O(1) con índice
- **Appointments:** WhatsApp + scheduleReminders → fire-and-forget (sin `await`)
- **billing.ts payment-link:** 2 `invoice.update()` → 1 merged
- **Múltiples rutas:** `Promise.all()` para queries paralelas en lugar de secuenciales

---

## 7. Índices DB agregados

Migración aplicada vía Supabase MCP SQL (no CONCURRENTLY — no funciona en transacciones):

```sql
-- Invoice
CREATE INDEX IF NOT EXISTS idx_invoice_clinic_issued ON "Invoice" ("clinicId", "issuedAt");
CREATE INDEX IF NOT EXISTS idx_invoice_clinic_doctor ON "Invoice" ("clinicId", "doctorId");
CREATE INDEX IF NOT EXISTS idx_invoice_created ON "Invoice" ("createdAt");

-- PaymentRecord
CREATE INDEX IF NOT EXISTS idx_payment_invoice ON "PaymentRecord" ("invoiceId");
CREATE INDEX IF NOT EXISTS idx_payment_paid ON "PaymentRecord" ("paidAt");

-- Doctor
CREATE INDEX IF NOT EXISTS idx_doctor_clinic_active ON "Doctor" ("clinicId", "isActive");
```

---

## 8. DB — columnas agregadas con SQL directo

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

## 9. Patrones críticos — NO romper

### A. Supabase client singleton
```typescript
// SIEMPRE a nivel módulo, NUNCA dentro de un componente/función
const supabase = createBrowserClient(URL, KEY)
// Si está adentro del componente → nueva instancia cada render → pierde sesión
```

### B. getOwnDoctorId() — JWT, sin API call
```typescript
// CORRECTO — Lee doctor_id de user_metadata en el JWT cacheado
const myId = await getOwnDoctorId()

// INCORRECTO — llamada API innecesaria, eliminar donde aparezca
const schedRes = await api.configuracion.getSchedule()  // NO USAR para obtener doctorId
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

### F. @fastify/compress — NO USAR
```
Incompatible con el entry point de Vercel serverless:
app.server.emit('request', req, res)  ← no funciona con streaming de gzip
Vercel CDN ya maneja gzip/Brotli automáticamente en el edge.
```

### G. Teléfono
```
Formato DB: +52XXXXXXXXXX (prefijo fijo México, 10 dígitos)
```

### H. sessionCache.clear() en logout
```typescript
// En el handler de cerrar sesión — SIEMPRE limpiar sessionStorage
sessionCache.clear()
await supabase.auth.signOut()
```

---

## 10. Funcionalidades completas ✅

- Auth completa con roles, redirect por rol, invite, reenviar invite
- Expediente paciente: tabs por rol, modal "Ver perfil completo", audit trail, VitalsStrip
- Facturación: Día/Semana/Mes, badge "Registrado por", 16 aseguradoras MX, concepto real
- Sidebar: h-screen sticky — Cerrar sesión/Configuración siempre visibles
- Configuración: tabs restringidos para STAFF
- Recetas: STAFF puede ver/imprimir
- Laboratorio: upload PDF + análisis IA + delete múltiple + header clickable (navy cuando expandido)
- Agenda: DOCTOR/ADMIN ven su propia agenda; STAFF ve global con filtro
- Nueva cita: sin selector para DOCTOR/ADMIN; con selector para STAFF
- Dashboard: "Próximas consultas" filtrada por doctorId propio
- **Performance:** stale-while-revalidate en todas las secciones → carga instantánea en retorno

---

## 11. BUG PENDIENTE — Martha Lopez como doctor ⚠️

### El problema
Cuando se invita un usuario con rol STAFF, `POST /api/configuracion/doctors`
**SIEMPRE crea un registro en la tabla `doctors`** — incluso si el rol es STAFF.

Aparece en: selector de doctor en Nueva Cita + filtro de doctores en Agenda.

### Fix OPCIÓN A (más limpio) — filtrar en GET /doctors
```typescript
// configuracion.ts GET /doctors — filtrar por role en Prisma (ya implementado en parte)
const doctors = await prisma.doctor.findMany({
  where: { clinicId, isActive: true, role: { not: 'STAFF' } },
  orderBy: { createdAt: 'asc' },
})
return { data: doctors }
```
> Requiere que el campo `role` en la tabla `Doctor` se mantenga actualizado al momento del invite.

### Fix OPCIÓN B (más robusto) — no crear Doctor record para STAFF
En `POST /api/configuracion/doctors`, si `body.role === 'STAFF'`:
- No crear registro `Doctor`
- Hacer solo el invite de Supabase Auth con role=STAFF
- Martha Lopez existente: `UPDATE "Doctor" SET "isActive" = false WHERE id = '...'`

---

## 12. Pendientes / bugs conocidos

| # | Descripción | Prioridad |
|---|-------------|-----------|
| 1 | **Martha Lopez como doctor** — ver §11 arriba para fix | **ALTA** |
| 2 | **RecordPaymentDialog** no tiene campo insurerName (solo NewInvoiceDialog tiene) | Media |
| 3 | **sessionCache.clear()** en logout — no implementado todavía | Media |
| 4 | **WhatsApp PDF** — pdfUrl se invalida al editar receta | Baja |
| 5 | **Dashboard clínica** — nombre de clínica no se muestra en header | Baja |
| 6 | **Asistente IA KPIs** — datos de ejemplo, no conectados a BD real | Baja |
| 7 | **pdf.ts línea 114** — error TypeScript pre-existente `} | null` en interfaz (no bloquea build) | Técnica |
| 8 | **Prisma migrations** — BD sin historial de migrations | Técnica |

---

## 13. Catálogos incluidos

### Aseguradoras México (gastos médicos)
```
AXA Seguros, GNP Seguros, Mapfre, MetLife, BBVA Seguros,
Seguros Monterrey NY Life, Allianz, Zurich, Cigna, Bupa,
SURA, HDI Seguros, Banorte Seguros, Inbursa Seguros,
Seguros Atlas, Otro
```
Ubicación: `apps/web/src/components/billing/new-invoice-dialog.tsx`

---

## 14. Comandos útiles

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

## 15. Contexto de negocio

- **Mercado:** LATAM, enfoque México (CURP, SPEI, aseguradoras locales, WhatsApp)
- **Modelo:** SaaS — un SuperAdmin gestiona múltiples clínicas independientes
- **Usuarios tipo clínica:** ADMIN (dueño médico) + DOCTORs + STAFF (recepcionista)
- **Canal pacientes:** WhatsApp (principal), email
- **Flujo típico:** STAFF agenda cita + registra cobro → DOCTOR atiende + firma nota → STAFF imprime receta
- **Proyecto separado NO tocar:** `doctor-calendar` (github.com/ghorta74-b2d/doctor-calendar)

---

## 16. Historia de decisiones arquitectónicas

| Decisión | Razón |
|----------|-------|
| NO `@fastify/compress` | Incompatible con `app.server.emit('request')` en Vercel serverless; CDN ya comprime |
| NO `getSchedule()` para doctorId | `doctor_id` está en el JWT (`user_metadata`) — `getOwnDoctorId()` lo lee sin API call |
| sessionStorage para role/doctorId | Persiste en la sesión del browser → 0ms en retorno, elimina el waterfall de 2 API calls |
| `findFirst(orderBy: createdAt desc)` para invoice numbering | `count()` es O(n) y crece con la tabla; `findFirst` es O(1) con índice |
| Fire-and-forget en WhatsApp y reminders | Estos son side-effects — no deben bloquear la respuesta al usuario |
| SQL directo en Supabase (no migrations) | El schema de Prisma ya existía sin historial — se optó por consistencia con el patrón existente |
| `role: { not: 'STAFF' }` en GET /doctors | Elimina llamada a `supabaseAdmin.auth.admin.listUsers()` que tomaba ~500ms |
