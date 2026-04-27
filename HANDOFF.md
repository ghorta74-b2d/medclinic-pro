# HANDOFF — MedClinic Pro

**Fecha**: 2026-04-27
**Último commit (main)**: `ddf966d`
**CI**: ✅ Verde en commits pre-design-system (run #9). Pendiente verificar run sobre `414a0ca`.
**Estado**: Producción estable. Design system dark mode desplegado en Vercel. Listos para Fase 5.

---

## 1. Resumen ejecutivo

SaaS clínico LATAM. Monorepo pnpm:
- `apps/api` — Fastify + Prisma + Postgres (Supabase). Cumplimiento NOM-004 MX.
- `apps/web` — Next.js 14 App Router. Vercel auto-deploy en push a `main`.

Despliegue: **Vercel** (web) + **Render/Fly** (API) + **Supabase** (DB prod).

---

## 2. Estado del repo

```
Branch main:    ddf966d  docs: actualizar HANDOFF con design system sesión 2026-04-25
                414a0ca  feat(web): design system dark mode + SF Pro font   ← ÚLTIMO REAL
                e844b07  fix(ci): todos los errores ESLint web (CI ✅ aquí)
Branch staging: e844b07  (pendiente sync con main)
```

### Commits en main que CI aún no corrió
`414a0ca` y `ddf966d` son post CI run #9. Verificar en GitHub Actions que no hay regresión de lint/typecheck antes de seguir.

```bash
# Ver estado CI
open https://github.com/ghorta74-b2d/medclinic-pro/actions
```

---

## 3. Design system (sesión 2026-04-25) — commit `414a0ca`

### 3.1 Tokens CSS — `apps/web/src/app/globals.css`

| Token | Dark | Light |
|---|---|---|
| `--background` | `222 22% 7%` | `210 20% 98%` |
| `--foreground` | `210 20% 96%` | `222 22% 10%` |
| `--card` / `--surface` | `222 18% 10%` | `0 0% 100%` |
| `--primary` | `205 90% 55%` (azul médico) | `205 90% 45%` |
| `--success` | `152 60% 45%` (verde clínico) | `152 60% 35%` |
| `--warning` | `38 92% 55%` | `38 92% 45%` |
| `--destructive` | `0 72% 55%` | `0 72% 50%` |
| `--sidebar` | `222 24% 6%` | `222 20% 94%` |
| `--radius` | `0.875rem` | — |

Tailwind mapea todo vía `hsl(var(--token))` en `tailwind.config.ts`.

### 3.2 Primitivos UI — `apps/web/src/components/ui/`

Todos usan CVA + Radix + tokens semánticos:
`button`, `card`, `input`, `label`, `badge`, `status-dot`, `separator`, `avatar`, `skeleton`, `tabs`, `dialog`, `dropdown-menu`, `select`, `switch`, `progress`, `toast`, `toaster`

### 3.3 Shell autenticado

| Archivo | Qué hace |
|---|---|
| `components/layout/app-shell.tsx` | Contenedor `flex` sidebar + main, clase `font-sf` |
| `components/layout/sidebar-nav.tsx` | Secciones GENERAL/OPERACIONES, pill activo `bg-primary/15`, 240px, role-based filtering + `sessionCache.clear()` en logout |
| `components/layout/topbar.tsx` | Búsqueda, ThemeToggle, avatar usuario |
| `components/theme/theme-provider.tsx` | `next-themes` wrapper, `defaultTheme="dark"`, `attribute="class"`, `storageKey="medclinic-theme"` |
| `components/theme/theme-toggle.tsx` | Botón sol/luna (lucide) |

### 3.4 Migración páginas y componentes

**14 páginas migradas** (clases hardcoded → tokens semánticos):
`/dashboard`, `/agenda`, `/agenda/[id]`, `/pacientes`, `/pacientes/[id]`, `/cobros`, `/recetas`, `/recetas/[id]`, `/configuracion`, `/laboratorio`, `/billing`, `/expediente`, `/expedientes/nuevo`, `/consulta-ia`, `/asistente-ia`

**12 componentes migrados**:
`calendar-view`, `week-view`, `month-view`, `day-stats`, `new-appointment-dialog`, `note-editor`, `prescription-builder`, `lab-result-dialog`, `billing-dialog`, `patient-dialog`, y otros

**Patrón de migración**:
```
bg-white         → bg-card
bg-gray-50       → bg-muted/50
bg-gray-100      → bg-muted
text-gray-*      → text-foreground / text-muted-foreground
text-blue-*      → text-primary
bg-blue-*        → bg-primary/*
text-green-*     → text-success
bg-green-*       → bg-success/*
text-red-*       → text-destructive
bg-red-*         → bg-destructive/*
bg-yellow-*/orange-* → bg-warning/*
border-gray-*    → border-border
```

### 3.5 Otros cambios

- **`apps/web/src/lib/utils.ts`** — `formatCurrency`: `minimumFractionDigits: 0, maximumFractionDigits: 0` (sin decimales en toda la app)
- **Font**: SF Pro via `-apple-system, BlinkMacSystemFont` (sistema en macOS/iOS), clase Tailwind `font-sf` en `app-shell`
- **`apps/web/package.json`**: deps añadidas `next-themes`, `class-variance-authority`, `tailwindcss-animate`

### 3.6 Reglas críticas (NO TOCAR)

- `next-themes`: `defaultTheme="dark"`, `attribute="class"`, `storageKey="medclinic-theme"` — cambiar rompe persistencia del toggle
- `sidebar-nav`: usa `bg-sidebar` (no `bg-background`) — necesario para contraste en light mode
- `sessionCache.clear()` en logout de `sidebar-nav.tsx` — crítico para limpiar sesión, no eliminar
- Role-based filtering en sidebar — ADMIN/DOCTOR/STAFF/SUPERADMIN ven ítems distintos

---

## 4. CI/CD stabilization (sesión 2026-04-23)

### 4.1 Configuración crítica (NO TOCAR)

| Archivo | Configuración | Por qué |
|---|---|---|
| `apps/api/tsconfig.json` | `"module": "CommonJS"` + `"moduleResolution": "node"` | `bundler` es incompatible con CommonJS |
| `apps/api/tsconfig.json` | `"include": ["src/**/*"]` (sin `prisma/**/*`) | Seeds fuera de `rootDir` rompen build |
| `apps/api/src/index.ts` | Top-level await en IIFE `void (async () => {...})()` | CommonJS no soporta TLA |
| `apps/web/.eslintrc.json` | `{ "extends": "next/core-web-vitals" }` | Sin esto, `next lint` lanza wizard interactivo y CI cuelga |

### 4.2 Patrones obligatorios Prisma + Zod

```typescript
// JSON fields → SIEMPRE z.any(), NUNCA z.unknown()
metadata: z.record(z.any()).optional(),

// Spreads condicionales en .update() → cast al final
await prisma.patient.update({
  where: { id },
  data: { ...(x ? { x } : {}) } as Parameters<typeof prisma.patient.update>[0]['data'],
})
```

---

## 5. Pendientes (orden de prioridad)

### 5.1 Verificar CI en commit `414a0ca` (URGENTE)
```bash
open https://github.com/ghorta74-b2d/medclinic-pro/actions
```
Si falla lint/typecheck, los errores más probables son clases Tailwind personalizadas no reconocidas o imports de primitivos UI nuevos.

### 5.2 GitHub Secrets — BLOQUEANTE para staging deploy real
Script listo en `scripts/set-github-secrets.sh`. Falta rellenar valores desde Supabase dashboard:
```bash
export GH_TOKEN=ghp_...
bash scripts/set-github-secrets.sh
```

### 5.3 Sync staging con main
```bash
git push origin main:staging
```

### 5.4 Supabase staging DB aislada
CI de staging corre contra DB de prod (riesgo). Opciones: Supabase Pro branching o segundo proyecto free.

### 5.5 Fase 5 — Interoperabilidad FHIR R4
- Recursos: `Patient`, `Encounter`, `MedicationRequest`
- UI ARCO (Acceso, Rectificación, Cancelación, Oposición — LFPDPPP)
- Endpoint `/api/fhir/v4/...` con OAuth2 SMART-on-FHIR

---

## 6. Arquitectura

- **Auth**: Supabase Auth → `request.authUser` `{ authUserId, clinicId, role, doctorId? }`. Middleware `requireDoctor` / `requireStaff` / `requireAdmin`.
- **Multi-tenant**: toda query filtra por `clinicId`. Nunca confiar en input del cliente.
- **Audit**: `auditLog({ user, action, resourceType, resourceId, ... })` en toda mutación + READ sensible de `ClinicalNote`.
- **NOM-004**: notas firmadas inmutables. Solo enmienda vía `/sign` → `/amend`. Una sola enmienda draft activa por nota.
- **Webhooks**: lab (`X-Lab-API-Key`), elevenlabs (`Bearer`), stripe (signature).

---

## 7. Dev local

```bash
# Prerequisito: Node 20 (instalado en ~/.local/node20)
# El script de dev ya lo inyecta en PATH vía .claude/launch.json

# Levantar
pnpm dev                           # web (puerto 3000) + api
pnpm --filter api prisma generate  # OBLIGATORIO antes de typecheck

# Verificar
pnpm --filter api typecheck
pnpm --filter web lint

# Deploy
git push origin main               # Vercel auto-deploy
git push origin main:staging       # Promover a staging
```

---

## 8. Para retomar

```
1. git pull origin main
2. Verificar CI: https://github.com/ghorta74-b2d/medclinic-pro/actions
3. Si CI rojo en 414a0ca → revisar lint (pnpm --filter web lint)
4. Si CI verde → elegir: GitHub Secrets / Fase 5 FHIR / otra cosa
```

**Si algo se ve mal en dark mode**: buscar `bg-white` o `text-gray-` en el archivo afectado y reemplazar por `bg-card` / `text-foreground`. El patrón completo está en §3.4.
