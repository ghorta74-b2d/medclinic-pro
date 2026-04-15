# MedClinic Pro — Handoff Completo
**Última actualización:** 2026-04-15 | **Branch:** `main` | **Último commit:** `1715e67`

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
- Deploy: `git push` → Vercel auto-deploya ambos proyectos

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

## ⚠️ PATRÓN CRÍTICO DE ROLES — Cambio Importante (2026-04-15)

### El bug que se resolvió

Cuando un usuario cambiaba de cuenta en el mismo navegador, `sessionStorage` quedaba con los datos del usuario anterior (`_mc_role`, `_mc_did`). El código anterior retornaba temprano si había datos en cache sin verificar el JWT real. Resultado: Gerardo (ADMIN) veía la agenda y cobros de Paulina (DOCTOR).

### Patrón CORRECTO (vigente)

`agenda/page.tsx` y `cobros/page.tsx` usan este patrón:

```typescript
// Estado inicia en null/false — NUNCA bootstrapped desde sessionStorage
const [userRole, setUserRole] = useState<string | null>(null)
const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null)
const [roleReady, setRoleReady] = useState(false)

useEffect(() => {
  async function init() {
    try {
      const role = await getUserRole()   // Decodifica JWT — rápido, sin red
      if (!role) return

      // Detecta cambio de cuenta → limpia sessionStorage del usuario anterior
      const cachedRole = sessionCache.getRole()
      if (cachedRole && cachedRole !== role) sessionCache.clear()

      sessionCache.setRole(role)
      setUserRole(role)

      if (role === 'DOCTOR') {
        const myId = await getOwnDoctorId()  // Lee del JWT — sin red
        if (myId) { sessionCache.setDoctorId(myId); setSelectedDoctorId(myId) }
      } else {
        // ADMIN / STAFF: vista global de clínica
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

### Patrón OBSOLETO — NO usar

```typescript
// ❌ NO USAR — este patrón era el bug
const [userRole] = useState(() => sessionCache.getRole())   // ← stale data
const [roleReady] = useState(() => !!sessionCache.getRole()) // ← stale data
if (sessionCache.getRole()) return  // ← retorna sin verificar JWT
```

### sessionCache — API completa

```typescript
import { sessionCache } from '@/lib/api'

sessionCache.getRole()        // Lee _mc_role de sessionStorage
sessionCache.setRole(v)       // Escribe _mc_role
sessionCache.getDoctorId()    // Lee _mc_did
sessionCache.setDoctorId(v)   // Escribe _mc_did
sessionCache.clearDoctorId()  // Elimina _mc_did
sessionCache.getClinicId()    // Lee _mc_cid
sessionCache.setClinicId(v)
sessionCache.clear()          // Borra todo (role + doctorId + clinicId)
```

---

## Archivos Clave

### Frontend (`apps/web/src/`)

| Archivo | Responsabilidad |
|---|---|
| `lib/api.ts` | Cliente API, `getUserRole()`, `getOwnDoctorId()`, `sessionCache`, `readCache/writeCache` |
| `app/(dashboard)/agenda/page.tsx` | Lista citas — filtro por médico para ADMIN/STAFF |
| `app/(dashboard)/agenda/[id]/page.tsx` | Detalle cita — atender, reasignar, takeover modal |
| `app/(dashboard)/cobros/page.tsx` | Facturas e ingresos — filtro médico para ADMIN/STAFF |
| `app/(dashboard)/configuracion/page.tsx` | Configuración clínica — gestión usuarios y roles |
| `app/(dashboard)/pacientes/[id]/page.tsx` | Expediente paciente — consultas, recetas, labs |
| `components/agenda/week-view.tsx` | Vista semana — click navega a detalle de cita |
| `components/agenda/month-view.tsx` | Vista mes — click navega a detalle de cita |

### Backend (`apps/api/src/routes/`)

| Archivo | Rutas clave |
|---|---|
| `appointments.ts` | `GET /api/appointments?from&to&doctorId` — filtra por clinicId siempre |
| `billing.ts` | `GET /api/billing/invoices` — DOCTOR forzado a su ID; ADMIN/STAFF ven todo |
| `configuracion.ts` | `GET /api/configuracion/doctors` — excluye STAFF; `PATCH /users/:id/role` |
| `clinical-notes.ts` | `POST /sign` — ADMIN puede firmar cualquier nota de la clínica |

### Middleware de Auth

```typescript
// request.authUser se puebla desde el JWT en cada request
request.authUser = {
  clinicId,   // user_metadata.clinic_id
  role,       // user_metadata.role
  doctorId,   // user_metadata.doctor_id
}
```

---

## Estado de la DB (Supabase `gzojhcjymqtjswxqgkgk`)

### Facturas (`invoices`)

```
INV-001 a INV-006  →  doctorId = Gerardo Horta    (ADMIN)   ← estaban "desaparecidas" por el bug
INV-007 a INV-009  →  doctorId = Paulina González (DOCTOR)
INV-010            →  doctorId = Gerardo Horta    (ADMIN)
```
Todas con `clinicId: cmnr49xsl00004ev0ziey0sk2`. ADMIN debe ver las 10 tras el fix.

### Columnas añadidas directamente con SQL (fuera de Prisma migrations)

```sql
ALTER TABLE patients ADD COLUMN IF NOT EXISTS "lastModifiedByName" TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS "lastModifiedAt" TIMESTAMPTZ;
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS "recordedByName" TEXT;
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS "insurerName" TEXT;
```

---

## Commits Esta Sesión (2026-04-15)

```
1715e67  fix(roles): eliminar confianza ciega en sessionStorage — siempre verificar JWT  ← HEAD
a92aa77  fix(roles): ADMIN/STAFF — filtro confiable, limit cobros 200, limpiar doctorId viejo
0828342  fix(agenda): ADMIN ve toda la clínica por defecto, dropdown de médico visible
0fdc767  fix: STAFF role — full clinic visibility, reassignment rights, and role management
d98ad85  fix: agenda week/month view — clicking an appointment now navigates to detail
42388f1  fix: takeover modal race condition, missing appointmentId link, and sign endpoint robustness
9ce1da0  feat: iniciar consulta abre expediente, takeover, reasignación y centro de notificaciones
```

---

## Bugs Resueltos Esta Sesión

| Bug | Causa raíz | Fix aplicado |
|---|---|---|
| ADMIN veía agenda/cobros del doctor equivocado | sessionStorage stale del usuario anterior | `init()` siempre verifica JWT; detecta cambio de cuenta y limpia cache |
| Facturas 1-6 desaparecieron | sessionStorage tenía `role=DOCTOR` + `doctor_id=Paulina` de sesión anterior | Mismo fix |
| Filtro de médicos no aparecía en ADMIN | Condición `isStaff &&` excluía ADMIN | Cambiado a `(isStaff \|\| isAdmin) &&` + spinner de carga |
| Click en cita (semana/mes) no navegaba | `div` con `cursor-pointer` sin `onClick` | Convertido a `button` con `router.push('/agenda/[id]')` |
| Takeover modal no aparecía para ADMIN | `userRole` null al hacer click | `roleReady` state — botones esperan a que el rol resuelva |
| HTTP 500 al firmar nota clínica | Sin try/catch en endpoint sign | Try/catch + ADMIN puede firmar cualquier nota de la clínica |
| `appointmentId` no se vinculaba a nota | No se propagaba desde sessionStorage al editor | Propagado a través del árbol de componentes |
| Reasignación para STAFF bloqueada | Backend no permitía rol STAFF | Añadido `'STAFF'` a roles permitidos en `PATCH /appointments/:id` |

---

## Pendientes

### Alta prioridad
1. **Verificar en producción** que el fix del JWT funciona. Tras el deploy, hacer `Cmd+Shift+R` para limpiar sessionStorage viejo antes de probar con los 3 usuarios.
2. **`sessionCache.clear()` en logout** — Si el usuario hace logout y login con otra cuenta en la misma pestaña el fix de detección de cambio de cuenta lo cubre, pero implementarlo en el handler de logout del layout es buena práctica.

### Media prioridad
3. **Paginación en cobros** — Límite actual `200`. Agregar botón "Cargar más" si la clínica crece.
4. **Nombre de clínica en header dashboard** — Pendiente desde sesiones anteriores.

### Baja prioridad
5. **WhatsApp PDF se invalida al editar receta** — Bug cosmético, poca urgencia.
6. **Asistente IA KPIs** — No conectados a BD real.
7. **pdf.ts línea 114** — Error TypeScript pre-existente, no bloquea build.

---

## Cómo Depurar Problemas de Rol

Si un usuario ve datos de otro usuario:

1. DevTools → Application → Session Storage → revisar `_mc_role` y `_mc_did`
2. Si los valores no corresponden al usuario logueado → `Cmd+Shift+R` (hard refresh)
3. Si persiste tras reload → verificar que en `agenda/page.tsx` y `cobros/page.tsx` el `useEffect` init **no** tenga `if (sessionCache.getRole()) return` (ese era el bug central)
4. Consultar DB directamente (Supabase MCP project `gzojhcjymqtjswxqgkgk`):

```sql
-- Verificar roles en DB
SELECT id, "firstName", "lastName", role, "clinicId" FROM doctors ORDER BY "createdAt";

-- Ver todas las facturas y a qué doctor pertenecen
SELECT "invoiceNumber", "doctorId", "status", "total", "issuedAt"
FROM invoices ORDER BY "issuedAt";

-- Ver citas recientes
SELECT id, "doctorId", "status", "startsAt"
FROM appointments ORDER BY "startsAt" DESC LIMIT 20;
```

---

## Reglas Críticas — No Romper

1. **NO `@fastify/compress`** — incompatible con Vercel serverless
2. **NO bootstrapear rol desde sessionStorage** — siempre verificar JWT en `init()` al mount
3. **NO `api.configuracion.getSchedule()`** para obtener doctorId — usar `getOwnDoctorId()` del JWT
4. **Supabase client:** singleton en `lib/api.ts`, nunca instanciar dentro de un componente
5. **Martha López:** tiene Doctor record en DB — no borrar, tiene citas históricas asignadas
6. **Cobros limit:** `200` facturas — no bajar a 50 (las primeras 6 facturas desaparecían con el límite anterior)

---

## Performance — Arquitectura Vigente

1. `layout.tsx` → `warmupApi()` al montar (pre-calienta serverless en Vercel)
2. `sessionCache` → rol + doctorId guardados después de verificar JWT (0ms lectura, ~100ms verificación en mount)
3. `readCache/writeCache` → datos de listas en sessionStorage con TTL 3 min
4. In-memory cache para `/doctors`, `/services`, `/types` (TTL 5-10 min) en `CACHE_TTL` en `api.ts`
5. Backend: queries paralelas con `Promise.all()`, fire-and-forget para WhatsApp/email
