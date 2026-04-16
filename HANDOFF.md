# MedClinic Pro — Handoff Completo
**Última actualización:** 2026-04-16 | **Branch:** `main` | **Último commit:** `ba2d0dc`

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

### ✅ Completado — Fase 0 + Fase 1 (commit `066ba7c`, 2026-04-15)

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

### ✅ Fase 2 — Completada (commit `ba2d0dc`, 2026-04-16)

| Item | Descripción | Estado |
|---|---|---|
| **2.1 CIE-10 completo** | Tabla `cie10_codes` + 247 códigos SSA en prod. `GET /api/catalogs/cie10?q=`. `note-editor.tsx` usa búsqueda async con debounce 300ms. `seed-catalogs.ts` soporta `--csv=` para los ~70k completos. | ✅ |
| **2.2 CUM** | Campo `cumKey` en `medications`. 112 medicamentos COFEPRIS en prod. `GET /api/catalogs/cum?q=`. | ✅ |
| **2.3 Validaciones vitales** | `VitalSignsSchema`: sistólica 60-250, diastólica 40-150, FC 20-300, temp 34-42°C, FR 5-60, glucosa 20-600. | ✅ |

**Para cargar CIE-10 completo (~70k):**
```bash
cd apps/api && npx tsx prisma/seed-catalogs.ts --csv=/ruta/CIE10_SSA.csv
# CSV: https://www.paho.org/es/clasificacion-internacional-enfermedades
```

### 🔲 Fase 3 — Privacidad y Consentimiento (próxima)

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
ba2d0dc  feat(compliance): Fase 2 — Catálogos Regulatorios NOM-024/NOM-004  ← HEAD
066ba7c  feat(compliance): NOM-004/NOM-024 — Fase 0 + Fase 1 completa
1715e67  fix(roles): eliminar confianza ciega en sessionStorage — siempre verificar JWT
a92aa77  fix(roles): ADMIN/STAFF — filtro confiable, limit cobros 200, limpiar doctorId viejo
0828342  fix(agenda): ADMIN ve toda la clínica por defecto, dropdown de médico visible
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

## Inicio de la Fase 3 — Guía para el próximo chat

### Objetivo
Implementar los requisitos de privacidad LFPDPPP y acceso seguro:
1. **UI aviso de privacidad** al registrar paciente
2. **Módulo ARCO básico** (export, rectificación, cancelación)
3. **MFA** Supabase Auth para ADMIN/DOCTOR

### Tarea 3.1 — UI Aviso de Privacidad

**Estado actual:** Los campos `privacyConsentAt` y `dataConsentAt` existen en `Patient` pero no hay UI que los capture. El registro de paciente es el formulario en `apps/web/src/app/(dashboard)/pacientes/`.

**Qué construir:**
1. Modal en el formulario de registro de paciente (nuevo y edición) con:
   - Texto del aviso de privacidad simplificado (LFPDPPP)
   - Checkbox "He leído y acepto el aviso de privacidad"
   - Checkbox "Acepto el tratamiento de mis datos para fines médicos"
   - Timestamp de consentimiento → `privacyConsentAt` y `dataConsentAt`
2. Validación: no se puede crear paciente sin ambos checkboxes marcados
3. El `PATCH /api/patients/:id` ya acepta estos campos

### Tarea 3.2 — Módulo ARCO básico

**Qué construir:**
1. `GET /api/patients/:id/data-export` → devuelve JSON con todo el expediente del paciente (datos personales, notas, recetas, resultados de laboratorio). Solo ADMIN/DOCTOR de la misma clínica.
2. `PATCH /api/patients/:id` ya permite Rectificación (campos del perfil).
3. Cancelación: `PATCH /api/patients/:id` con `{ isActive: false }` + `deletedReason` (campo nuevo).
4. Frontend: tab "Privacidad" en la configuración o en el expediente del paciente.

### Tarea 3.3 — MFA Supabase Auth

**Qué construir:**
1. Habilitar TOTP en Supabase Auth (Auth → MFA en el dashboard de Supabase — proyecto `gzojhcjymqtjswxqgkgk`)
2. Frontend: pantalla de enrolamiento MFA al primer login de ADMIN/DOCTOR
3. Verificar en `apps/web/src/middleware.ts` (si existe) o en el layout protegido

**Archivos relevantes Fase 3:**
- `apps/web/src/app/(dashboard)/pacientes/` → formulario de paciente
- `apps/api/src/routes/patients.ts` → agregar endpoint ARCO
- `apps/web/src/lib/api.ts` → agregar `api.patients.dataExport(id)`

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
