# MedClinic Pro — Handoff Completo
> Actualizado: 2026-04-10 | Rama: `main` | Último commit: `b13acca`

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
ADMIN       → /dashboard          (dueño/médico principal — acceso COMPLETO)
DOCTOR      → /agenda             (médico — acceso COMPLETO)
STAFF       → /dashboard          (administrativo — acceso RESTRINGIDO)
```

### STAFF — restricciones específicas
- **Sidebar:** solo Dashboard, Agenda, Pacientes, Cobros, Configuración
- **Pacientes/[id]:** solo tab Recetas (puede ver/imprimir, NO crear ni editar recetas)
- **Pacientes/[id]:** SÍ puede editar datos personales del paciente
- **Configuración:** solo tabs Horarios y Catálogo (no Perfil, Usuarios, Pagos, etc.)
- **Asistente IA:** oculto en dashboard

### ADMIN — igual que DOCTOR (acceso completo)
- Tabs completos en expediente: Consultas, Recetas, Laboratorio
- Crear notas clínicas, recetas, ver laboratorios

### Patrón correcto de checks
```typescript
// Expediente paciente — restringir solo STAFF
const isReadOnly = userRole === 'STAFF'

// Dashboard/layout — ambos roles van al panel admin
const isAdmin = userRole === 'ADMIN' || userRole === 'STAFF'
```

---

## 5. Archivos críticos

### Frontend `apps/web/src/`

| Archivo | Qué hace |
|---------|----------|
| `lib/api.ts` | Cliente API + `getUserRole()` + singleton Supabase + token cache TTL |
| `app/(auth)/login/page.tsx` | Login — redirect por rol, supabase singleton a nivel módulo |
| `app/auth/invite/page.tsx` | Activación cuenta — supabase singleton a nivel módulo (crítico) |
| `app/(dashboard)/dashboard/page.tsx` | KPIs + quick actions diferenciados por rol |
| `app/(dashboard)/pacientes/[id]/page.tsx` | Expediente — roles, tabs, audit trail, PatientProfileModal |
| `app/(dashboard)/cobros/page.tsx` | Facturación Día/Semana/Mes — counts del período correcto |
| `app/(dashboard)/configuracion/page.tsx` | Config — tabs filtradas por rol |
| `app/(dashboard)/recetas/[id]/page.tsx` | Impresión de receta — botón "Ver perfil completo" |
| `components/layout/sidebar.tsx` | `h-screen sticky` — Cerrar sesión siempre visible |
| `components/billing/invoice-detail-dialog.tsx` | Modal factura — badge "Registrado por" |
| `components/billing/new-invoice-dialog.tsx` | Nueva factura — 16 aseguradoras mexicanas |

### Backend `apps/api/src/`

| Archivo | Qué hace |
|---------|----------|
| `routes/billing.ts` | insurerName, recordedByName, paidInvoiceCount por período |
| `routes/prescriptions.ts` | GET / y /:id usan `requireStaff` (STAFF puede ver/imprimir) |
| `routes/patients.ts` | PATCH guarda lastModifiedByName + lastModifiedAt |
| `routes/configuracion.ts` | Invite: type:'invite' nuevos / type:'recovery' existentes |
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

### B. getUserRole() — JWT cacheado
```typescript
// En api.ts — decodifica role del JWT sin llamar getSession() extra
export async function getUserRole(): Promise<string | null>

// En componentes:
const [userRole, setUserRole] = useState<string | null>(null)
useEffect(() => { getUserRole().then(r => setUserRole(r)) }, [])
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

### Autenticación y roles
- Login → redirige por rol: SUPER_ADMIN→/superadmin, ADMIN/STAFF→/dashboard, DOCTOR→/agenda
- Invitación vía email Resend con link de activación `/auth/invite`
- Reenviar invitación: funciona para nuevos (invite) y existentes (recovery)
- Detección de rol via JWT — sin extra llamadas a Supabase

### Expediente de paciente
- Tabs por rol: ADMIN/DOCTOR ven Consultas+Recetas+Lab, STAFF solo Recetas
- Modal "Ver perfil completo" debajo del avatar — todos los campos readonly + botón Editar
- Audit trail: "Modificado por [Nombre] · timestamp" en hero y en modal perfil
- Signos vitales: solo muestra valores capturados (oculta nulls)
- Notas clínicas con firma digital, edición de examen físico como texto libre

### Facturación (Cobros)
- Vista Día / Semana / Mes con gráfica de ingresos
- KPI "X facturas" muestra count del período seleccionado (no de toda la BD)
- Badge "Registrado por [Nombre] · fecha" en el modal de detalle de factura
- 16 aseguradoras mexicanas de gastos médicos en el selector de método de pago
- Columna Aseguradora en tabla (muestra insurerName del pago)
- Columna Concepto muestra descripción real del primer ítem

### Recetas
- STAFF puede ver e imprimir recetas (GET usa requireStaff)
- Botón "Ver perfil completo" en página de impresión
- Print page con CSS media query + window.print()

### Sidebar
- `h-screen sticky top-0` — Configuración y Cerrar sesión siempre visibles sin importar el scroll
- STAFF ve menú reducido (4 items + Config)

### Configuración
- STAFF: solo tabs Horarios y Catálogo
- Todos los demás roles: todos los tabs

### Cards / UI
- `border border-gray-300 shadow-sm` en todos los cards del sitio
- Headers de cards `bg-gray-200 border-b border-gray-300`
- Avatar iniciales `bg-[#4E2DD2]/20`

### Laboratorio
- Upload PDF, análisis con IA (Claude claude-sonnet-4-5), notas médico
- Edit mode toggle — checkboxes solo visibles al activar modo edición
- Delete múltiple de estudios

---

## 9. Pendientes / bugs conocidos ⚠️

| # | Descripción | Prioridad |
|---|-------------|-----------|
| 1 | **RecordPaymentDialog** no tiene campo insurerName (solo NewInvoiceDialog) | Media |
| 2 | **Warm-up ping** — cold start Vercel 2-4s. Sugerido: llamar endpoint barato al login | Baja |
| 3 | **WhatsApp PDF** — pdfUrl se invalida al editar receta | Baja |
| 4 | **Ruta /resultados** en sidebar — verificar si existe o eliminar | Media |
| 5 | **Dashboard clínica** — nombre de clínica no se muestra en header | Baja |
| 6 | **Asistente IA KPIs** — datos de ejemplo, no conectados a BD real | Baja |
| 7 | **Prisma migrations** — BD sin historial de migrations | Técnica |

---

## 10. Catálogos incluidos

### Aseguradoras México (gastos médicos)
```
AXA Seguros, GNP Seguros, Mapfre, MetLife, BBVA Seguros,
Seguros Monterrey NY Life, Allianz, Zurich, Cigna, Bupa,
SURA, HDI Seguros, Banorte Seguros, Inbursa Seguros,
Seguros Atlas, Otro
```
Ubicación: `apps/web/src/components/billing/new-invoice-dialog.tsx`

---

## 11. Comandos útiles

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

## 12. Contexto de negocio

- **Mercado:** LATAM, enfoque México (CURP, SPEI, aseguradoras locales, WhatsApp)
- **Modelo:** SaaS — un SuperAdmin gestiona múltiples clínicas independientes
- **Usuarios tipo clínica:** ADMIN (dueño médico) + DOCTORs + STAFF (recepcionista/admin)
- **Canal pacientes:** WhatsApp (principal), email
- **Flujo típico:** STAFF agenda cita + registra cobro → DOCTOR atiende + firma nota → STAFF imprime receta
- **Proyecto separado NO tocar:** `doctor-calendar` (github.com/ghorta74-b2d/doctor-calendar)
