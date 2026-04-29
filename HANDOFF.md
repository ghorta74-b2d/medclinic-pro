# HANDOFF — MedClinic Pro

**Fecha**: 2026-04-27
**Branch**: `main`
**Commits en main (no pusheados aún)**: `98eef71`, `ddf966d`, `414a0ca` — pendiente de push desde GitHub Desktop (git push se cuelga desde Bash porque el credential helper requiere GUI).
**CI**: ✅ Verde en `e844b07`. Pendiente verificar CI sobre `414a0ca` (design system).
**Estado**: Design system dark mode completo + desplegado en Vercel. CONTEXT.md creado para onboarding de agentes.

---

## PRIMERA ACCIÓN AL RETOMAR

```bash
# 1. Verificar que el push llegó
git log --oneline origin/main -5

# 2. Si no llegó, hacer push desde terminal interactiva
git push origin main

# 3. Verificar CI
open https://github.com/ghorta74-b2d/medclinic-pro/actions
```

**Si CI falla en `414a0ca`**: lo más probable es lint web. Correr `pnpm --filter web lint` y revisar errores. El patrón habitual son clases Tailwind custom no reconocidas o imports de los nuevos primitivos UI.

---

## 1. Estado del repo

```
Local main:   98eef71  docs: HANDOFF completo sesión 2026-04-27
              ddf966d  docs: actualizar HANDOFF
              414a0ca  feat(web): design system dark mode + SF Pro font   ← CAMBIO REAL
              e844b07  fix(ci): ESLint web  ← ÚLTIMO EN ORIGIN/MAIN (CI ✅)

Origin/main:  ddf966d  (o 98eef71 si ya se hizo push desde GH Desktop)
Staging:      e844b07  (pendiente sync con main)
```

### Archivos clave creados esta sesión
- `CONTEXT.md` (raíz) — contexto completo del proyecto para agentes externos, 572 líneas
- `HANDOFF.md` (este archivo) — estado para retomar sesión

---

## 2. Lo que se hizo en esta sesión (2026-04-27)

1. Verificé que el design system (`414a0ca`) llegó a `origin/main` ✅
2. Verifiqué visualmente el dashboard en preview — dark mode, sidebar, cards, SF Pro, montos sin decimales ✅
3. Actualicé `HANDOFF.md` con sección completa del design system
4. Creé `CONTEXT.md` — documento de 572 líneas con todo el proyecto para onboarding de agentes externos (stack, BD, rutas, auth, design system, env vars, CI, integraciones, cumplimiento, convenciones, gotchas)

---

## 3. Design system — resumen técnico (commit `414a0ca`)

### Tokens CSS (`apps/web/src/app/globals.css`)

| Variable | Dark | Light |
|---|---|---|
| `--background` | `222 22% 7%` | `210 20% 98%` |
| `--card` | `222 18% 10%` | `0 0% 100%` |
| `--primary` | `205 90% 55%` | `205 90% 45%` |
| `--success` | `152 60% 45%` | `152 60% 35%` |
| `--warning` | `38 92% 55%` | `38 92% 45%` |
| `--destructive` | `0 72% 55%` | `0 72% 50%` |
| `--sidebar` | `222 24% 6%` | `222 20% 94%` |
| `--radius` | `0.875rem` | — |

### Archivos nuevos

| Archivo | Descripción |
|---|---|
| `components/ui/` (17 archivos) | button, card, input, label, badge, dialog, dropdown-menu, select, tabs, switch, avatar, separator, progress, skeleton, toast, toaster, status-dot |
| `components/layout/app-shell.tsx` | Contenedor flex, clase `font-sf` |
| `components/layout/sidebar-nav.tsx` | GENERAL/OPERACIONES, role-based, `sessionCache.clear()` en logout |
| `components/layout/topbar.tsx` | Búsqueda, ThemeToggle, avatar |
| `components/theme/theme-provider.tsx` | next-themes, dark default |
| `components/theme/theme-toggle.tsx` | Sol/luna |

### Páginas y componentes migrados
14 páginas + 12 componentes: todas las clases hardcoded (`bg-white`, `text-gray-*`, `bg-blue-*`) reemplazadas por tokens semánticos (`bg-card`, `text-foreground`, `bg-primary/*`).

### Otros cambios
- `formatCurrency`: sin decimales (`minimumFractionDigits: 0`)
- Font: SF Pro (`-apple-system`) via clase `font-sf` en app-shell
- Deps añadidas: `next-themes`, `class-variance-authority`, `tailwindcss-animate`

### Reglas críticas (NO TOCAR)

| Regla | Por qué |
|---|---|
| `next-themes` con `defaultTheme="dark"`, `attribute="class"`, `storageKey="medclinic-theme"` | Cambiar rompe persistencia del toggle |
| `sidebar-nav` usa `bg-sidebar` (no `bg-background`) | Contraste en light mode |
| `sessionCache.clear()` en logout de `sidebar-nav.tsx` | Crítico para limpiar sesión Supabase |
| Role-based filtering en sidebar | ADMIN/DOCTOR/STAFF/SUPERADMIN ven ítems distintos |

---

## 4. CI/CD — configuración crítica (NO TOCAR)

| Archivo | Configuración | Por qué |
|---|---|---|
| `apps/api/tsconfig.json` | `"module": "CommonJS"` + `"moduleResolution": "node"` | `bundler` rompe build |
| `apps/api/tsconfig.json` | `"include": ["src/**/*"]` (sin `prisma/**/*`) | Seeds fuera de rootDir rompen build |
| `apps/api/src/index.ts` | Top-level await en IIFE | CommonJS no soporta TLA |
| `apps/web/.eslintrc.json` | `{ "extends": "next/core-web-vitals" }` | Sin esto, CI cuelga en wizard interactivo |

### Patrones Prisma + Zod

```typescript
// JSON fields → SIEMPRE z.any(), NUNCA z.unknown()
metadata: z.record(z.any()).optional()

// Spreads en .update() → cast al final
await prisma.patient.update({
  where: { id },
  data: { ...(x ? { x } : {}) } as Parameters<typeof prisma.patient.update>[0]['data'],
})
```

---

## 5. Pendientes (orden de prioridad)

| # | Item | Estado |
|---|---|---|
| 1 | Push commits a origin/main | ⏳ Hacer desde GH Desktop |
| 2 | Verificar CI en `414a0ca` | ⏳ Tras el push |
| 3 | Configurar GitHub Secrets (`scripts/set-github-secrets.sh`) | 🔴 BLOQUEANTE para staging |
| 4 | Sync staging con main (`git push origin main:staging`) | 🟡 |
| 5 | Supabase staging DB aislada | 🟡 Hoy usa prod (riesgo) |
| 6 | Fase 5 — FHIR R4 (`Patient`, `Encounter`, `MedicationRequest`) | 🟢 |
| 7 | UI ARCO (derechos LFPDPPP) | 🟢 |
| 8 | Tests: ampliar cobertura (consulta-ia, prescriptions, lab webhook) | 🟢 |

---

## 6. Gotchas conocidos

1. **`pnpm prisma generate` es OBLIGATORIO** antes de cualquier `typecheck`. Los tipos están en `.gitignore`.
2. **`git push` desde Bash se cuelga** — credential helper (GitHub Desktop) requiere GUI. Siempre push desde terminal interactiva o desde GH Desktop.
3. **Loose git objects** — si el repo acumula >2000 objetos sueltos, `git push` se cuelga en "Counting objects". Solución: `git gc --prune=now` desde terminal interactiva.
4. **Multi-tenant**: toda query de BD debe filtrar por `clinicId = request.authUser.clinicId`. Nunca confiar en clinicId del body.
5. **Si algo se ve mal en dark mode**: buscar `bg-white` o `text-gray-` en el archivo y reemplazar con `bg-card` / `text-foreground`. Ver patrón completo en CONTEXT.md §15.

---

## 7. Arquitectura rápida

- **Auth**: Supabase JWT → `request.authUser` `{ authUserId, clinicId, role, doctorId? }`
- **Multi-tenant**: todo filtra por `clinicId`
- **Audit NOM-004**: `auditLog()` en toda mutación + READ de notas clínicas
- **Notas firmadas**: inmutables. Enmienda = nueva nota con `amendedFromId`
- **Webhooks**: lab (`X-Lab-API-Key`), elevenlabs (`Bearer`), stripe (signature)

---

## 8. Comandos esenciales

```bash
# Setup local
pnpm install
pnpm --filter api prisma generate  # SIEMPRE primero

# Dev
pnpm dev                           # web :3000 + api

# Verificar
pnpm --filter api typecheck
pnpm --filter web lint
pnpm --filter api test

# Deploy
git push origin main               # Vercel auto-deploy
git push origin main:staging       # Promover staging
```

---

## 9. Documentos de referencia en el repo

| Archivo | Contenido |
|---|---|
| `CONTEXT.md` | Contexto completo del proyecto (stack, BD, rutas, auth, env, CI, integraciones, cumplimiento) — para onboarding de agentes |
| `HANDOFF.md` | Este archivo — estado para retomar sesión |
| `.env.example` | Todas las variables de entorno necesarias |
