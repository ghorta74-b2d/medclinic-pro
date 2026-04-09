# MedClinic Pro — Handoff Completo
> Actualizado: 2026-04-09 | Rama: `main` | 56 commits

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
**En API guard:** `apps/api/src/routes/superadmin.ts` → `requireSuperAdmin` hook  
**Clinic users guard:** `apps/api/src/middleware/auth.ts`

---

## 7. Archivos Críticos

```
apps/web/src/
  app/(auth)/login/page.tsx          — Login email+password, redirige por rol
  app/auth/invite/page.tsx           — Activar cuenta (set password) post-invite
  app/superadmin/layout.tsx          — Nav superadmin + LogoutButton
  app/superadmin/logout-button.tsx   — Client component para cerrar sesión
  app/superadmin/page.tsx            — Dashboard superadmin
  app/superadmin/clinicas/page.tsx   — Lista de clínicas
  app/superadmin/clinicas/[id]/page.tsx    — Detalle clínica
  app/superadmin/clinicas/nueva/page.tsx  — Crear clínica
  app/superadmin/configuracion/page.tsx   — Gestión usuarios
  app/(dashboard)/cobros/page.tsx    — Facturación
  app/(dashboard)/asistente-ia/page.tsx   — IA agents
  app/(dashboard)/dashboard/page.tsx — Dashboard clínica
  lib/api.ts                         — Cliente HTTP (IMPORTANTE: ver patrón abajo)

apps/api/src/
  routes/superadmin.ts               — Todos los endpoints /api/superadmin/*
  routes/configuracion.ts            — Endpoints /api/configuracion/*
  middleware/auth.ts                 — Guard JWT para rutas de clínica
  lib/prisma.ts                      — Prisma client singleton
  lib/errors.ts                      — Helpers sendError / Errors.UNAUTHORIZED
  server.ts                          — Fastify setup + CORS
  api/index.ts                       — Handler serverless Vercel

apps/api/prisma/schema.prisma        — Modelos: Clinic, Doctor, Patient, etc.
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

---

## 9. Endpoints Superadmin Disponibles

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

---

## 10. Modelo de Datos Clave

```
Clinic (1) → (N) Doctor   [clinicId]
Clinic (1) → (N) Patient  [clinicId]
Doctor — authUserId: String? (null = invite pendiente)
Doctor — role: SUPER_ADMIN | ADMIN | DOCTOR | STAFF
```

**Invite pendiente** = `authUserId === null`  
**Activo** = `authUserId !== null && isActive === true`

---

## 11. Problemas Resueltos en Esta Sesión

| Problema | Causa raíz | Fix |
|----------|-----------|-----|
| "HTTP 400" en resend-invite | Fastify rechazaba Content-Type:json sin body | Conditional Content-Type en api.ts |
| Invite link → localhost:3000 | `NEXT_PUBLIC_APP_URL` no configurado en API | Var seteada en Vercel + Supabase Site URL actualizada |
| Botón "Salir" no funcionaba | Layout es server component, button sin onClick | `logout-button.tsx` como client component |
| $4,500 en facturación nueva | Fallbacks hardcodeados `?? 4500` | Cambiados a `?? 0` |
| Nombres falsos en dashboard | MOCK_ACTIVITY con personas ficticias | Eliminados, replaced con empty states |
| /auth/invite se quedaba cargando | `createBrowserClient` no procesa hash automáticamente | `setSession(access_token, refresh_token)` manual |
| Clínicas tardaban en cargar | `_count.appointments` = full table COUNT | Removido del list query |

---

## 12. Supabase — Configuración Actual

- **Site URL:** `https://medclinic-web.vercel.app`
- **Redirect URLs:** `https://medclinic-web.vercel.app/**`
- **SMTP:** Resend, sender `medclinic@glasshaus.mx`, nombre `MedClinic PRO`
- **auth.users:** Solo existe `ghorta74@gmail.com` como usuario confirmado

---

## 13. Pendientes / Next Steps

### Alta prioridad
- [ ] **Prisma migrations:** La tabla `_prisma_migrations` no existe — la DB fue creada con SQL directo. Hay que correr `prisma migrate deploy` o `prisma db push` en algún momento para sincronizar.
- [ ] **Test completo del invite flow con email real:** Enviar invite a una cuenta de prueba real, activar cuenta, y hacer login con la contraseña establecida.
- [ ] **Push pendiente:** Todos los commits de esta sesión están en `main` local, NO pusheados. El usuario debe correr `git push origin main`.

### Media prioridad
- [ ] **Dashboard clínica** muestra `clinicName` hardcodeado como vacío — fetching del nombre desde `/api/configuracion/clinic`.
- [ ] **Asistente IA** — KPIs reales desde API (mensajes enviados, confirmaciones, cobros).
- [ ] **Configuración → Superadmin:** Verificar que el `ban_duration` de Supabase funcione correctamente para desactivar usuarios.
- [ ] **Facturación:** El chart de ingresos usa zeros estáticos — conectar al endpoint de dashboard real.

### Baja prioridad
- [ ] Limpiar `console.log` debug en `superadmin.ts` y `api/index.ts`.
- [ ] Implementar paginación en `/api/superadmin/all-users` (actualmente `take: 200`).
- [ ] Test flow de login → `/superadmin` con superadmin recién invitado.

---

## 14. Cómo Deployar

```bash
# Desde el directorio del monorepo:
cd "/Users/gerardohorta/Library/Mobile Documents/com~apple~CloudDocs/B2D Automation/CLAUDE/CLINIC/medclinic-pro"
git push origin main
# → Vercel auto-deploya medclinic-web Y medclinic-api
```

**Node.js NO está instalado** en la máquina del usuario. Para deployar hay que usar `git push` (GitHub → Vercel integration) o el dashboard de Vercel (Deployments → Redeploy).

---

## 15. Comandos de Debug Rápido

```typescript
// Ver logs del API en Vercel MCP:
mcp.vercel.get_runtime_logs({ projectId: 'prj_n6FzzeQYAsdUyEt12UNSC9kYQbqa', teamId: 'team_5b8HfRA7B0605D5MRa2BQ6qA' })

// Ver deployments:
mcp.vercel.list_deployments({ projectId: 'prj_n6FzzeQYAsdUyEt12UNSC9kYQbqa', teamId: 'team_5b8HfRA7B0605D5MRa2BQ6qA' })

// Ver tablas DB:
mcp.supabase.execute_sql({ query: 'SELECT * FROM auth.users LIMIT 10' })
```

---

## 16. Convenciones de Código

- **Error format API:** siempre `{ error: { message: string } }` — nunca Fastify default
- **Auth guard:** `reply.status(401)` para no autenticado, `reply.status(403)` para no autorizado
- **Invites:** GoTrue REST directo (`/auth/v1/admin/generate_link`) + Resend REST directo — NO usar JS SDK
- **Redirect post-invite:** Siempre a `/auth/invite` (no `/dashboard`)
- **Prisma en Vercel:** `binaryTargets = ["native", "rhel-openssl-1.0.x", "rhel-openssl-3.0.x"]`
- **CORS:** `apps/api/src/server.ts` permite `medclinic-web*.vercel.app` con función origin
