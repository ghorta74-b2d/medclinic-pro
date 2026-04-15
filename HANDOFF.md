# MedClinic Pro — Handoff Completo
**Última actualización:** 2026-04-15 | **Branch:** `main` | **Último commit:** `066ba7c`

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

**Vercel:**
- Team: `team_5b8HfRA7B0605D5MRa2BQ6qA`
- Web project: `prj_Sg1JAPtfDrtTxAlmBcxle48x5u7W`
- API project: `prj_n6FzzeQYAsdUyEt12UNSC9kYQbqa`
- Deploy: `git push origin main` → Vercel auto-deploya ambos proyectos

---

## Usuarios de Prueba (clínica `cmnr49xsl00004ev0ziey0sk2`)

| Nombre | Rol JWT | Rol DB | doctor_id |
|---|---|---|---|
| Gerardo Horta | ADMIN | DOCTOR | `cmnr49y8g00024ev0so8uwvv6` |
| Paulina González | DOCTOR | DOCTOR | `cmnxdxb1v0001o52vmfj5tfmz` |
| Martha López | STAFF | STAFF | `cmnt6otqv00011qlg9t6l09vw` ← tiene record Doctor pero no es médica |

**SuperAdmin platform:** `ghorta74@gmail.com` (contraseña en gestor de contraseñas) → `/superadmin`

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
| Configuración clínica | ❌ | ✅ | ❌ |
| Gestión usuarios / roles | ❌ | ✅ | ❌ |

---

## ⚠️ PATRÓN CRÍTICO DE ROLES (vigente desde 2026-04-15)

`agenda/page.tsx` y `cobros/page.tsx` siempre verifican JWT en mount. **Nunca** bootstrapear rol desde sessionStorage.

```typescript
// Estado inicia en null/false — NUNCA bootstrapped desde sessionStorage
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

**OBSOLETO — NO usar:**
```typescript
// ❌ este patrón era el bug (datos cruzados entre usuarios)
const [userRole] = useState(() => sessionCache.getRole())
if (sessionCache.getRole()) return
```

---

## Estado de Cumplimiento NOM-004 / NOM-024

### ✅ Completado (commit `066ba7c`, 2026-04-15)

| Item | Descripción | Archivos |
|---|---|---|
| **Bucket privado** | `clinical-files` → `public: false` en Supabase. Todos los archivos clínicos requieren signed URL (1h). Upload guarda path relativo, no URL pública. | `lib/supabase.ts`, `lab-results.ts` |
| **Soft delete LabResult** | `deletedAt TIMESTAMPTZ` — retención 5 años NOM-004. El archivo en Storage NO se borra. | `schema.prisma`, `lab-results.ts` |
| **requireAdmin en PATCH /clinic** | Solo ADMIN/SUPER_ADMIN pueden modificar datos de la clínica. | `configuracion.ts` |
| **auditLog en appointments** | `POST /appointments` y `PATCH /:id` normal ahora generan registro de auditoría. | `appointments.ts` |
| **IP + User-Agent en auditoría** | Todos los `auditLog()` capturan `request.ip` y `user-agent`. | `audit.ts` + 5 rutas |
| **Hard fail en auditLog** | Si el log de auditoría falla, la operación lanza error (no silencio). Operaciones fire-and-forget usan `.catch()` explícito. | `audit.ts` |
| **Validación CURP algorítmica** | Dígito verificador RENAPO — no solo `length(18)`. | `patients.ts` |
| **PDF receta → nota FIRMADA** | `POST /generate-pdf` verifica `clinicalNote.status === 'SIGNED'` antes de generar. | `prescriptions.ts` |
| **Enmienda → firmar antes de segunda** | `POST /:id/amend` bloquea nueva enmienda si ya existe una en DRAFT sin firmar. | `clinical-notes.ts` |
| **Etiqueta IA en llmSummary** | Guarda `llmSummaryGeneratedAt` y `llmProvider` al crear resumen con Claude. | `lab-results.ts` |
| **Versión semántica** | `package.json v1.0.0` + `GET /health` expone `version` y `app`. | `server.ts`, `package.json` |
| **Credenciales fuera del repo** | Contraseña SuperAdmin eliminada de HANDOFF.md. `.gitignore` cubre `apps/**/.env`. | `HANDOFF.md`, `.gitignore` |

### 🔲 Fase 2 — Próxima sesión (Catálogos Regulatorios)

| Item | Descripción | Complejidad |
|---|---|---|
| **2.1 CIE-10 completo** | Importar ~70,000 códigos SSA a tabla `CIE10Code`. Endpoint `GET /api/catalogs/cie10?q=`. Reemplazar array estático en frontend. | Alta |
| **2.2 CUM** | Importar catálogo COFEPRIS a tabla `CUMMedication`. Endpoint `GET /api/catalogs/cum?q=`. Usado en `PrescriptionItem`. | Alta |
| **2.3 Validaciones vitales** | Rangos de alerta clínica en signos vitales: PA sistólica 60-250, diastólica 40-150, temp 34-42, FC 20-300, FR 5-60. | Baja |

### 🔲 Fase 3 — Privacidad y Consentimiento

| Item | Descripción |
|---|---|
| **3.1 UI aviso de privacidad** | Modal al registrar paciente: texto de aviso + checkbox + timestamp en `privacyConsentAt`/`dataConsentAt`. |
| **3.2 Módulo ARCO básico** | `GET /api/patients/:id/data-export` (Acceso), `PATCH` para Rectificación/Cancelación. |
| **3.3 MFA** | Habilitar TOTP en Supabase Auth para ADMIN/DOCTOR. |

### 🔲 Fase 4 — Infraestructura

| Item | Descripción |
|---|---|
| **4.1 CI/CD** | GitHub Actions: lint + typecheck en cada PR. |
| **4.2 Tests de integración** | Rutas críticas: sign, soft delete, requireAdmin. |
| **4.3 Staging** | Proyecto Vercel + Supabase branch separados. |
| **4.4 sessionCache.clear() en logout** | Layout: limpiar cache al hacer sign out. |

### 🔲 Fase 5 — Interoperabilidad (no bloquea certificación v1)

FHIR R4: `Patient`, `Encounter`, `MedicationRequest`. WhatsApp audit trail. ARCO completo.

---

## Archivos Clave

### Backend (`apps/api/src/`)

| Archivo | Responsabilidad |
|---|---|
| `middleware/auth.ts` | `authenticate()`, `requireRoles()`, `requireDoctor`, `requireStaff`, `requireAdmin` |
| `middleware/audit.ts` | `auditLog(params)` — append-only, hard fail, captura IP+UA en metadata |
| `lib/supabase.ts` | `supabase` client, `verifySupabaseToken()`, `getSignedFileUrl()`, `getSignedFileUrls()` |
| `lib/prisma.ts` | Singleton Prisma client |
| `routes/appointments.ts` | CRUD citas, takeover, reasignación, availability — con auditLog completo |
| `routes/patients.ts` | CRUD pacientes, CURP validado algorítmicamente, soft delete |
| `routes/clinical-notes.ts` | SOAP notes, firma electrónica, enmiendas NOM-004 |
| `routes/prescriptions.ts` | Recetas, PDF (requiere nota FIRMADA), WhatsApp |
| `routes/lab-results.ts` | Resultados lab, upload a Storage privado, signed URLs, soft delete, AI summary |
| `routes/billing.ts` | Facturas e ingresos — filtro por rol |
| `routes/configuracion.ts` | Config clínica (PATCH requiere ADMIN), médicos, horarios, usuarios |
| `prisma/schema.prisma` | Schema completo — ver sección DB más abajo |

### Frontend (`apps/web/src/`)

| Archivo | Responsabilidad |
|---|---|
| `lib/api.ts` | Cliente API, `getUserRole()`, `getOwnDoctorId()`, `sessionCache`, `readCache/writeCache` |
| `app/(dashboard)/agenda/page.tsx` | Lista citas — patrón JWT-first correcto |
| `app/(dashboard)/cobros/page.tsx` | Facturas — patrón JWT-first correcto |
| `app/(dashboard)/configuracion/page.tsx` | Configuración clínica — tabs por rol |
| `app/(dashboard)/pacientes/[id]/page.tsx` | Expediente paciente |

---

## Estado de la DB (Supabase `gzojhcjymqtjswxqgkgk`)

### Columnas agregadas con SQL (fuera de Prisma migrations)

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
```

### Índices existentes
```sql
CREATE INDEX IF NOT EXISTS idx_invoice_clinic_issued ON "Invoice" ("clinicId", "issuedAt");
CREATE INDEX IF NOT EXISTS idx_invoice_clinic_doctor ON "Invoice" ("clinicId", "doctorId");
CREATE INDEX IF NOT EXISTS idx_invoice_created ON "Invoice" ("createdAt");
CREATE INDEX IF NOT EXISTS idx_payment_invoice ON "PaymentRecord" ("invoiceId");
CREATE INDEX IF NOT EXISTS idx_payment_paid ON "PaymentRecord" ("paidAt");
CREATE INDEX IF NOT EXISTS idx_doctor_clinic_active ON "Doctor" ("clinicId", "isActive");
```

### Storage
- Bucket `clinical-files`: **privado** (`public: false`) desde 2026-04-15.
- Archivos se suben con path relativo (ej. `lab-results/clinicId/id/ts-file.pdf`).
- Los GETs generan signed URLs de 1 hora vía `getSignedFileUrl()` / `getSignedFileUrls()`.
- Registros previos con URL completa (`https://...`) también se manejan por la función `toStoragePath()`.

### Facturas de prueba
```
INV-001 a INV-006  →  Gerardo Horta (ADMIN)
INV-007 a INV-009  →  Paulina González (DOCTOR)
INV-010            →  Gerardo Horta (ADMIN)
```

---

## Commits Recientes

```
066ba7c  feat(compliance): NOM-004/NOM-024 — Fase 0 + Fase 1 completa  ← HEAD
1715e67  fix(roles): eliminar confianza ciega en sessionStorage — siempre verificar JWT
a92aa77  fix(roles): ADMIN/STAFF — filtro confiable, limit cobros 200, limpiar doctorId viejo
0828342  fix(agenda): ADMIN ve toda la clínica por defecto, dropdown de médico visible
0fdc767  fix: STAFF role — full clinic visibility, reassignment rights, and role management
```

---

## Reglas Críticas — No Romper

1. **NO `@fastify/compress`** — incompatible con Vercel serverless (streaming zlib)
2. **NO bootstrapear rol desde sessionStorage** — siempre verificar JWT en `init()` al mount
3. **NO `getSchedule()`** para obtener doctorId — usar `getOwnDoctorId()` del JWT
4. **Supabase client:** singleton en `lib/api.ts` (frontend) y `lib/supabase.ts` (backend) — nunca instanciar dentro de un componente
5. **Martha López:** tiene Doctor record en DB — no borrar, tiene citas históricas asignadas
6. **Cobros limit:** `200` facturas — no bajar a 50 (las primeras 6 facturas desaparecían con límite anterior)
7. **LabResult delete:** SIEMPRE soft delete (`deletedAt`) — nunca `prisma.labResult.delete()` — retención NOM-004 5 años
8. **Bucket `clinical-files`:** privado — nunca volver a `public: true`. Usar `getSignedFileUrl()` para servir archivos.
9. **auditLog():** ahora lanza en lugar de silenciar — llamadas fire-and-forget deben usar `.catch(console.error)` explícito

---

## Inicio de la Fase 2 — Guía para el próximo chat

### Objetivo
Implementar los catálogos regulatorios requeridos por NOM-024-SSA3-2012 y NOM-004-SSA3-2012:
1. **CIE-10 completo** (~70,000 códigos SSA)
2. **CUM** (Catálogo Universal de Medicamentos COFEPRAC)
3. **Validaciones clínicas en signos vitales**

### Tarea 2.1 — CIE-10 completo

**Estado actual:** El archivo `packages/shared/src/constants/cie10.ts` tiene solo ~50 diagnósticos hardcodeados como array estático. El schema `ClinicalNote.diagnoses` es `Json[]` que almacena `{ code, description, type }`.

**Qué construir:**
1. Nuevo modelo en `schema.prisma`:
```prisma
model Cie10Code {
  id          String @id @default(cuid())
  code        String @unique  // e.g. "A00.0"
  description String           // e.g. "Cólera debida a Vibrio cholerae"
  chapter     String?          // e.g. "I"
  block       String?          // e.g. "A00-A09"
  isActive    Boolean @default(true)

  @@index([code])
  @@index([description])
  @@map("cie10_codes")
}
```
2. Script de seed/import que lea el CSV oficial SSA y poblar la tabla (CSV disponible en el portal DGIS).
3. Endpoint nuevo: `GET /api/catalogs/cie10?q=tuberculosis` → búsqueda por código o descripción, devuelve máximo 20 resultados.
4. Registrar la ruta en `server.ts`.
5. Frontend: reemplazar el array estático en el componente de diagnósticos por una búsqueda en tiempo real al endpoint.

**Fuente del catálogo:** El CSV de CIE-10 versión SSA México está disponible públicamente. Contiene ~70,000 códigos en español. Buscar "CIE-10 OPS catálogo descarga" o usar la fuente de PAHO/OPS.

### Tarea 2.2 — CUM (Catálogo Universal de Medicamentos)

**Estado actual:** `Medication` en schema.prisma existe pero está vacío en producción. `PrescriptionItem` tiene fallback de texto libre.

**Qué construir:**
1. Poblar la tabla `Medication` con el catálogo COFEPRAC (CUM). CSV descargable desde el portal COFEPRAC.
2. Agregar campo `cumKey String?` al modelo `Medication` para el identificador oficial.
3. Endpoint `GET /api/catalogs/cum?q=amoxicilina` → busca en `Medication` por nombre/marca.
4. Frontend: el buscador de medicamentos en recetas ya existe (`GET /api/prescriptions/medications/search`) — solo hay que poblar la tabla.

### Tarea 2.3 — Validaciones clínicas en signos vitales

**Estado actual:** `VitalSignsSchema` en `clinical-notes.ts` solo tiene `spo2Percent` con `min(0)/max(100)`. Los demás campos no tienen validación clínica.

**Qué agregar en `VitalSignsSchema`:**
```typescript
systolicBp:    z.number().int().min(60).max(250).optional(),
diastolicBp:   z.number().int().min(40).max(150).optional(),
heartRateBpm:  z.number().int().min(20).max(300).optional(),
temperatureC:  z.number().min(34).max(42).optional(),
respiratoryRate: z.number().int().min(5).max(60).optional(),
glucoseMgDl:   z.number().int().min(20).max(600).optional(),
```

---

## Performance — Arquitectura Vigente

1. `layout.tsx` → `warmupApi()` al montar (pre-calienta serverless en Vercel)
2. `sessionCache` → rol + doctorId guardados después de verificar JWT (0ms lectura, ~100ms verificación en mount)
3. `readCache/writeCache` → datos de listas en sessionStorage con TTL 3 min
4. In-memory cache para `/doctors`, `/services`, `/types` (TTL 5-10 min) en `api.ts`
5. Backend: queries paralelas con `Promise.all()`, fire-and-forget para WhatsApp/email
6. `getSignedFileUrls()` usa batch `createSignedUrls()` de Supabase para minimizar round-trips en listas

---

## Cómo Depurar Problemas de Rol

1. DevTools → Application → Session Storage → revisar `_mc_role` y `_mc_did`
2. Si no corresponden al usuario → `Cmd+Shift+R` (hard refresh)
3. Si persiste → verificar que `agenda/page.tsx` y `cobros/page.tsx` NO tengan `if (sessionCache.getRole()) return`
4. Supabase MCP project `gzojhcjymqtjswxqgkgk`:

```sql
SELECT id, "firstName", "lastName", role, "clinicId" FROM doctors ORDER BY "createdAt";
SELECT "invoiceNumber", "doctorId", "status", "total", "issuedAt" FROM invoices ORDER BY "issuedAt";
SELECT id, "doctorId", "status", "startsAt" FROM appointments ORDER BY "startsAt" DESC LIMIT 20;
-- Verificar soft-deleted lab results
SELECT id, title, "deletedAt" FROM lab_results WHERE "deletedAt" IS NOT NULL;
```

---

## Pendientes de Baja Prioridad

- `sessionCache.clear()` en logout (cubierto por detección de cambio de cuenta)
- Paginación en cobros (límite actual 200)
- WhatsApp PDF se invalida al editar receta
- Nombre de clínica en header dashboard
- Asistente IA KPIs no conectados a BD
- `pdf.ts` línea 114 — error TypeScript pre-existente (no bloquea build ni deploy)
