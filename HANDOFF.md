# MedClinic Pro — Handoff Completo
> Actualizado: 2026-04-09 | Rama: `main` | Último commit: `98229f3`

---

## 1. Contexto del Proyecto

SaaS clínico multi-tenant para LATAM. Compite con Doctoralia PRO + DrChrono.  
Diferenciador: WhatsApp + voz IA nativos, CFDI/NOM-004, México-first.

**Monorepo:** `/Users/gerardohorta/Library/Mobile Documents/com~apple~CloudDocs/B2D Automation/CLAUDE/CLINIC/medclinic-pro`  
**GitHub:** `https://github.com/ghorta74-b2d/medclinic-pro`  
**Git push → Vercel auto-deploya ambos proyectos.**

---

## 2. Stack Completo

| Capa | Tech |
|------|------|
| Frontend | Next.js 14 App Router + Tailwind + shadcn (dark) |
| Backend | Fastify + TypeScript → Vercel serverless |
| ORM | Prisma + PostgreSQL (Supabase) |
| Auth | Supabase Auth (JWT con `user_metadata.role`) |
| Email | Resend (dominio `glasshaus.mx` verificado) |
| Paquetes | pnpm monorepo workspace |

**Paths del monorepo:**
- `apps/web/` → Next.js
- `apps/api/` → Fastify
- `packages/shared/` → tipos compartidos
- `apps/api/prisma/schema.prisma` → schema

---

## 3. Infraestructura Vercel

| Proyecto | ID | URL Producción |
|----------|-----|----------------|
| medclinic-web | `prj_Sg1JAPtfDrtTxAlmBcxle48x5u7W` | `https://medclinic-web.vercel.app` |
| medclinic-api | `prj_n6FzzeQYAsdUyEt12UNSC9kYQbqa` | `https://medclinic-api.vercel.app` |
| **Team ID** | `team_5b8HfRA7B0605D5MRa2BQ6qA` | `ghorta74-6617s-projects` |

**Para deployar:** `git push origin main` (desde el monorepo root).  
No hay Node.js en la máquina; usar `git push` desde terminal del usuario.

---

## 4. Variables de Entorno (ya configuradas en Vercel)

### medclinic-api
```
SUPABASE_URL=https://gzojhcjymqtjswxqgkgk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  (ver Vercel dashboard)
DATABASE_URL=postgresql://postgres.gzojhcjymqtjswxqgkgk:hyQxCpXt26SH99Kb@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.gzojhcjymqtjswxqgkgk:hyQxCpXt26SH99Kb@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://medclinic-web.vercel.app
RESEND_API_KEY=re_CPy8biA5_...  (ver Vercel dashboard)
```

### medclinic-web
```
NEXT_PUBLIC_SUPABASE_URL=https://gzojhcjymqtjswxqgkgk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_API_URL=https://medclinic-api.vercel.app
```

---

## 5. Credenciales de Acceso

| Servicio | Usuario | Contraseña/Token |
|----------|---------|-----------------|
| **SuperAdmin app** | `ghorta74@gmail.com` | `21@Homero!` |
| Supabase proyecto | `gzojhcjymqtjswxqgkgk` | via dashboard |
| Resend | cuenta B2D | dominio `glasshaus.mx` verificado |

**SuperAdmin URL:** `https://medclinic-web.vercel.app/superadmin`

---

## 6. Arquitectura de Auth

```
Login → supabase.signInWithPassword()
      → user.user_metadata.role === 'SUPER_ADMIN' → /superadmin
      → else → /agenda

Invite flow:
  POST /api/superadmin/clinics → generateInviteLink() (GoTrue REST directo)
                               → sendInviteEmail() (Resend REST directo)
  Doctor click email → /auth/invite#access_token=...
                     → setSession(access_token, refresh_token)
                     → form set-password → updateUser({password})
                     → /agenda
```

**Roles:** `SUPER_ADMIN | ADMIN | DOCTOR | STAFF`  
**En Supabase:** `user_metadata.role`

### Fix crítico de auth (sesión 2026-04-09)
En `apps/api/src/middleware/auth.ts` el `doctorId` ahora se popula tanto para `DOCTOR` como para `ADMIN`:
```typescript
// ADMIN users también tienen registro en tabla Doctor (mismo modelo)
if (meta.role === 'DOCTOR' || meta.role === 'ADMIN') {
  const doctor = await prisma.doctor.findFirst({
    where: { authUserId: supabaseUser.id, clinicId: meta.clinic_id },
    select: { id: true },
  })
  doctorId = doctor?.id
}
```
**Sin esto:** ADMIN recibe 403 en todos los endpoints con `requireDoctor` (prescripciones, notas clínicas).

---

## 7. Archivos Críticos

```
apps/web/src/
  app/(auth)/login/page.tsx                     — Login email+password, redirige por rol
  app/auth/invite/page.tsx                      — Activar cuenta (set password) post-invite
  app/superadmin/layout.tsx                     — Nav superadmin + LogoutButton
  app/superadmin/logout-button.tsx              — Client component para cerrar sesión
  app/superadmin/page.tsx                       — Dashboard superadmin
  app/superadmin/clinicas/page.tsx              — Lista de clínicas
  app/superadmin/clinicas/[id]/page.tsx         — Detalle clínica
  app/superadmin/clinicas/nueva/page.tsx        — Crear clínica
  app/superadmin/configuracion/page.tsx         — Gestión usuarios
  app/(dashboard)/agenda/page.tsx               — Agenda médica con slots
  app/(dashboard)/agenda/[id]/page.tsx          — Detalle de cita + cambio de estado
  app/(dashboard)/pacientes/page.tsx            — Lista de pacientes
  app/(dashboard)/pacientes/[id]/page.tsx       — Expediente completo (edit + tabs)
  app/(dashboard)/recetas/page.tsx              — Lista de recetas (cards 3-zonas)
  app/(dashboard)/recetas/[id]/page.tsx         — Vista impresión/PDF receta (NEW)
  app/(dashboard)/cobros/page.tsx               — Facturación
  app/(dashboard)/asistente-ia/page.tsx         — IA agents
  app/(dashboard)/dashboard/page.tsx            — Dashboard clínica
  components/agenda/new-appointment-dialog.tsx  — Dialog nueva cita (quick patient reg)
  components/patients/new-patient-dialog.tsx    — Dialog nuevo paciente (+52)
  components/prescriptions/prescription-builder.tsx — Builder recetas (create+edit)
  lib/api.ts                                    — Cliente HTTP (ver patrón crítico)

apps/api/src/
  routes/superadmin.ts          — Endpoints /api/superadmin/*
  routes/configuracion.ts       — Endpoints /api/configuracion/*
  routes/patients.ts            — CRUD pacientes
  routes/appointments.ts        — CRUD citas
  routes/prescriptions.ts       — CRUD recetas + PATCH + PDF + WhatsApp
  services/pdf.ts               — Generador PDF (usa licenseNumber, no cedula)
  middleware/auth.ts            — Guard JWT (doctorId para DOCTOR y ADMIN)
  lib/prisma.ts                 — Prisma client singleton
  lib/errors.ts                 — Helpers sendError / Errors.UNAUTHORIZED
  server.ts                     — Fastify setup + CORS
  api/index.ts                  — Handler serverless Vercel

apps/api/prisma/schema.prisma   — Modelos: Clinic, Doctor, Patient, Prescription, etc.
```

---

## 8. Patrón API Client (CRÍTICO — no romper)

En `apps/web/src/lib/api.ts`:
```typescript
// Content-Type se setea SOLO cuando hay body — no enviar en POST sin body
...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {})
```
**Por qué:** Fastify lanza 400 si recibe `Content-Type: application/json` con body vacío.

**Formato de errores del API:**
```json
{ "error": { "message": "descripción del error" } }
```
El cliente los convierte a `new Error(error?.error?.message ?? 'HTTP ${status}')`.

**Métodos disponibles en `api.ts`:**
```typescript
api.patients.list(clinicId)
api.patients.get(id)
api.patients.create(data)
api.patients.update(id, data)
api.appointments.list(clinicId, filters)
api.appointments.create(data)
api.appointments.update(id, data)
api.prescriptions.list(clinicId, filters)
api.prescriptions.get(id)
api.prescriptions.create(data)
api.prescriptions.update(id, data)          // PATCH — edit mode
api.prescriptions.generatePdf(id)
api.prescriptions.sendWhatsApp(id, phone)
api.prescriptions.searchMedications(q)
```

---

## 9. Modelo de Datos Clave

```
Clinic (1) → (N) Doctor   [clinicId]
Clinic (1) → (N) Patient  [clinicId]
Doctor — authUserId: String?     (null = invite pendiente)
Doctor — role: SUPER_ADMIN | ADMIN | DOCTOR | STAFF
Doctor — licenseNumber: String?  // Cédula profesional (NO "cedula" — ese campo NO existe)

Prescription (1) → (N) PrescriptionItem
Prescription — status: ACTIVE | CANCELLED | EXPIRED
Prescription — pdfUrl: String?   (se invalida a null cuando se editan items)
```

**Invite pendiente** = `authUserId === null`  
**Activo** = `authUserId !== null && isActive === true`

---

## 10. Sistema de Recetas — Arquitectura Completa

### Endpoints API (`/api/prescriptions`)
```
GET    /             — lista con filtros (clinicId, patientId, status, search)
GET    /:id          — detalle con patient, doctor, items
POST   /             — crear (requireDoctor)
PATCH  /:id          — editar items/instructions/followUpDate (requireDoctor)
POST   /:id/pdf      — genera PDF (usa @react-pdf/renderer — puede fallar en Vercel cold start)
POST   /:id/whatsapp — envía PDF por WhatsApp
GET    /medications/search?q= — búsqueda de medicamentos
```

### PDF — Problema conocido con Vercel
`@react-pdf/renderer` usa `yoga-layout` (binario nativo) que crashea en Vercel serverless cold start.  
**Workaround actual:** página de impresión client-side en `/recetas/[id]`.  
El botón "Ver / Imprimir" navega a esa página. El usuario usa Ctrl+P / Cmd+P → "Guardar como PDF".  
El endpoint `POST /:id/pdf` todavía existe pero no se usa en la UI principal.

### WhatsApp + PDF
El feature de WhatsApp llama a `POST /:id/whatsapp` que requiere un `pdfUrl` almacenado.  
Cuando se edita una receta con items nuevos, `pdfUrl` se invalida a `null`.  
**Estado actual:** Si se edita una receta, hay que regenerar el PDF antes de enviar por WhatsApp.  
Este flujo no está 100% pulido en la UI — pendiente de mejora.

### Vista de impresión (`/recetas/[id]/page.tsx`)
- Toolbar con "Volver" e "Imprimir / Guardar PDF" (oculto en print)
- Documento estilo receta real: encabezado clínica, datos doctor con `licenseNumber`, datos paciente, símbolo ℞, medicamentos con raya lateral azul, instrucciones, área de firma
- CSS `@media print { @page { size: Letter; margin: 0; } body { print-color-adjust: exact } }`

### PrescriptionBuilder (`prescription-builder.tsx`)
Acepta prop `existing?: ExistingPrescription` para modo edición:
```typescript
interface ExistingPrescription {
  id: string
  patientId: string
  patientName: string
  items: RxItem[]
  instructions: string
  followUpDate: string
}
```
- Cuando `existing` está presente: paciente bloqueado (no editable), title "Editar receta", llama PATCH
- Cuando `existing` es undefined: modo creación normal, llama POST

---

## 11. Sistema de Pacientes — Registro con Teléfono

### Validación de teléfono (implementada en 2026-04-09)
Todos los forms de registro de paciente usan prefijo fijo `+52`:
- Solo se capturan 10 dígitos
- Validación: `phoneDigits.length !== 10` → error en submit
- Se guarda como `+52XXXXXXXXXX` en la BD
- Al editar: `extractPhone()` quita el `+52` para mostrar solo los 10 dígitos

```typescript
// Patrón de extracción (en EditPatientModal):
function extractPhone(phone: string): string {
  if (phone?.startsWith('+52')) return phone.slice(3)
  return phone ?? ''
}
```

Archivos con esta lógica:
- `new-patient-dialog.tsx` — registro standalone
- `new-appointment-dialog.tsx` — quick registration en la agenda
- `pacientes/[id]/page.tsx` → `EditPatientModal` — edición desde expediente

### EditPatientModal (en `pacientes/[id]/page.tsx`)
Formulario completo de edición. Cubre:
- Datos básicos: nombre, teléfono (+52), email, fecha de nacimiento, género, tipo de sangre, CURP
- Dirección: calle/num, ciudad, estado
- Antecedentes médicos: alergias, condiciones crónicas, medicamentos actuales (comma-separated → array), notas
- Contacto de emergencia: nombre, teléfono
- Llama `api.patients.update(patient.id, {...})`

---

## 12. Prisma — Gotchas Importantes

### Campo `licenseNumber` vs `cedula`
El schema Prisma tiene `licenseNumber` con comentario `// Cédula profesional`.  
El código histórico usaba `cedula` — **esto causaba HTTP 500** en producción.  
Todos los selects de Doctor en `prescriptions.ts` y `services/pdf.ts` ya usan `licenseNumber`.  
Si agregas nuevas queries a Doctor, usar `licenseNumber` (nunca `cedula`).

### Migrations
La DB fue creada con SQL directo. `_prisma_migrations` está vacía.  
`prisma migrate deploy` fallaría (no hay historial de migrations).  
Usar `prisma db push` para cambios de schema si es necesario.

### Binary targets (no cambiar)
```prisma
binaryTargets = ["native", "rhel-openssl-1.0.x", "rhel-openssl-3.0.x"]
```

---

## 13. Problemas Resueltos (sesión 2026-04-09)

| Problema | Causa raíz | Fix |
|----------|-----------|-----|
| 403 Forbidden al crear receta (ADMIN) | `doctorId` solo se poblaba para rol `DOCTOR` en `auth.ts` | Cambiar a `DOCTOR \|\| ADMIN` con `findFirst` + `clinicId` |
| HTTP 500 al crear receta | `cedula: true` en select Prisma pero el campo es `licenseNumber` | `replace_all` en `prescriptions.ts` y `pdf.ts` |
| HTTP 500 al generar PDF | `yoga-layout` (binario) crashea en Vercel serverless | Reemplazar con página de impresión client-side `/recetas/[id]` |
| No se podía editar paciente creado en agenda | No había botón ni modal en `/pacientes/[id]` | `EditPatientModal` completo + botón "Editar" en header |
| Teléfono sin validación de 10 dígitos | Forms no tenían prefijo fijo ni validación | `+52` fijo + `maxLength={10}` + validate on submit |
| No se podía editar receta desde paciente | Sin botón y sin soporte edit en `PrescriptionBuilder` | Botón "Editar" + `existing` prop en builder |
| No había botón imprimir en /pacientes recetas | Tab `PrescriptionsTab` sin acciones | Botones "Ver / Imprimir" + "Editar" en cada card |
| UI de recetas en paciente muy plana | Sin jerarquía visual | Cards 3-zonas: header (doctor/fecha/status) + body (medicamentos numerados) + footer (acciones) |
| No se podía crear receta desde expediente | Sin botón en `PrescriptionsTab` | Botón "Nueva receta" con `patientId` pre-cargado |

---

## 14. Commits de Esta Sesión

```
98229f3  feat: rediseño recetas + editar receta desde paciente + vista imprimir
b43e6b3  feat(recetas): editar receta, PATCH endpoint y nueva receta desde paciente
cc8beb7  fix(prescriptions): renombrar campo cedula→licenseNumber
9b54a93  fix(auth): poblar doctorId en authUser para rol ADMIN
d43e438  feat(pacientes): editar paciente desde expediente y teléfono +52
```

---

## 15. Estado de Deploy

| Commits | Estado |
|---------|--------|
| `main` local | ✅ Al día |
| `origin/main` | ✅ Pusheado |
| Vercel | ✅ Desplegado (2026-04-09) |

---

## 16. Pendientes / Next Steps

### Alta prioridad
- [x] **Push a producción:** desplegado en Vercel el 2026-04-09
- [ ] **Test flujo completo de recetas:** crear → ver en /recetas → abrir /recetas/[id] → imprimir → editar → ver cambios
- [ ] **WhatsApp + PDF:** El `pdfUrl` se invalida al editar una receta. Hay que decidir: (a) regenerar PDF automáticamente en el PATCH, o (b) deshabilitar WhatsApp si no hay `pdfUrl`

### Media prioridad
- [ ] **Dashboard clínica** — `clinicName` hardcodeado vacío, fetching desde `/api/configuracion/clinic`
- [ ] **Asistente IA** — KPIs reales desde API
- [ ] **Facturación** — chart de ingresos con datos reales
- [ ] **Prisma migrations** — sincronizar `_prisma_migrations` con el estado actual del DB

### Baja prioridad
- [ ] Limpiar `console.log` debug en `superadmin.ts` y `api/index.ts`
- [ ] Paginación en `/api/superadmin/all-users` (actualmente `take: 200`)
- [ ] Test invite flow completo con email real

---

## 17. Endpoints Disponibles

### Superadmin
```
GET    /api/superadmin/stats
GET    /api/superadmin/clinics?q=
POST   /api/superadmin/clinics
GET    /api/superadmin/clinics/:id
PATCH  /api/superadmin/clinics/:id
POST   /api/superadmin/clinics/:id/doctors
POST   /api/superadmin/clinics/:id/doctors/:doctorId/resend-invite
PATCH  /api/superadmin/doctors/:doctorId
GET    /api/superadmin/admins
POST   /api/superadmin/admins
PATCH  /api/superadmin/admins/:userId
GET    /api/superadmin/all-users?q=&clinicId=
```

### Clinic API
```
GET/POST/PATCH   /api/patients
GET/POST/PATCH   /api/appointments
GET/POST/PATCH   /api/prescriptions
POST             /api/prescriptions/:id/pdf
POST             /api/prescriptions/:id/whatsapp
GET              /api/prescriptions/medications/search?q=
GET/PATCH        /api/configuracion/clinic
GET/POST/PATCH   /api/configuracion/doctors
GET/POST/PATCH   /api/configuracion/schedules
```

---

## 18. Supabase — Configuración Actual

- **Proyecto:** `gzojhcjymqtjswxqgkgk`
- **Site URL:** `https://medclinic-web.vercel.app`
- **Redirect URLs:** `https://medclinic-web.vercel.app/**`
- **SMTP:** Resend, sender `medclinic@glasshaus.mx`, nombre `MedClinic PRO`

---

## 19. Comandos de Debug Rápido

```typescript
// Ver logs del API en Vercel MCP:
mcp.vercel.get_runtime_logs({ projectId: 'prj_n6FzzeQYAsdUyEt12UNSC9kYQbqa', teamId: 'team_5b8HfRA7B0605D5MRa2BQ6qA' })

// Ver deployments:
mcp.vercel.list_deployments({ projectId: 'prj_n6FzzeQYAsdUyEt12UNSC9kYQbqa', teamId: 'team_5b8HfRA7B0605D5MRa2BQ6qA' })

// Ver tablas DB / queries:
mcp.supabase.execute_sql({ query: 'SELECT * FROM "Prescription" LIMIT 5' })
mcp.supabase.execute_sql({ query: 'SELECT id, "authUserId", role, "licenseNumber" FROM "Doctor" LIMIT 10' })
```

---

## 20. Convenciones de Código

- **Error format API:** siempre `{ error: { message: string } }` — nunca Fastify default
- **Auth guard:** `reply.status(401)` para no autenticado, `reply.status(403)` para no autorizado
- **requireDoctor:** endpoint solo para DOCTOR y ADMIN (ambos tienen registro en tabla Doctor)
- **Invites:** GoTrue REST directo (`/auth/v1/admin/generate_link`) + Resend REST directo — NO usar JS SDK
- **Redirect post-invite:** Siempre a `/auth/invite` (no `/dashboard`)
- **Prisma en Vercel:** `binaryTargets = ["native", "rhel-openssl-1.0.x", "rhel-openssl-3.0.x"]`
- **CORS:** `apps/api/src/server.ts` permite `medclinic-web*.vercel.app` con función origin
- **Campo Doctor cédula:** `licenseNumber` en Prisma — nunca `cedula`
- **Teléfono paciente:** guardado como `+52XXXXXXXXXX` (10 dígitos después del prefijo)
- **PDF:** No usar `@react-pdf/renderer` en endpoints Vercel — usar página de impresión client-side
