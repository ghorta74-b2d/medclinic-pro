# HANDOFF — MedClinic Pro

**Fecha**: 2026-05-01
**Branch**: `main`
**Último commit local**: `cc7f6b3` — pendiente push.
**CI**: N/A (commits aún no pusheados).
**Estado**: Rediseño split-panel completado en las 5 páginas pre-login + fixes de routing y Suspense.

---

## PRIMERA ACCIÓN AL RETOMAR

```bash
# 1. Push pendiente
git push origin main

# 2. Verificar CI
open https://github.com/ghorta74-b2d/medclinic-pro/actions

# 3. Verificar Vercel env vars en medclinic-api (aún pendiente)
# Agregar: RESEND_API_KEY y NEXT_PUBLIC_APP_URL
```

---

## 1. Estado del repo

```
Local main:   cc7f6b3  style: aumentar logo 15% en panel izquierdo auth (40px → 46px)
              a56276b  feat: rediseño split-panel en todas las páginas pre-login
              c32e65c  fix: move auth pages to /auth/ prefix to match expected URLs
              cb546ab  fix: wrap useSearchParams in Suspense on reset-password page
              (+ commits anteriores ya en origin/main)

Origin/main:  pendiente push ↑
```

---

## 2. Lo que se hizo en esta sesión (2026-04-30 / 2026-05-01)

### Fix: Suspense en reset-password (`cb546ab`)
- Error Vercel: `useSearchParams()` sin `<Suspense>` en `/reset-password`
- Fix: renombrar `ResetPasswordPage` → `ResetPasswordContent`, nuevo export default con `<Suspense>`

### Fix: Rutas auth (`c32e65c`)
- 404 en `/auth/forgot-password` y `/auth/reset-password`
- Causa: páginas estaban en `app/(auth)/` (route group → URL sin `/auth/`)
- Fix: mover a `app/auth/forgot-password/` y `app/auth/reset-password/` (carpeta real)

### Feat: Rediseño split-panel páginas pre-login (`a56276b` + `cc7f6b3`)

**Nuevo componente:** `apps/web/src/components/auth-split-layout.tsx`
- Panel izquierdo (lg+): gradiente `#1e1b4b → #3730a3 → #5b21b6 → #7c3aed` a 135° + grid 40px
- Logo blanco `h-46px`, headline bold 4xl, feature bullets, copyright "© 2026 MediaClinic · Powered by B2D Automation"
- Panel derecho: bg-white, form centrado max-w-sm, SF Pro font stack
- Props: `headline`, `subline?`, `features?: AuthFeature[]`, `children`

**Páginas rediseñadas (5):**
| Página | URL | headline |
|---|---|---|
| Login | `/login` | "Bienvenido a la nueva era de tu clínica." |
| Forgot password | `/auth/forgot-password` | "Recupera el acceso a tu clínica." |
| Reset password | `/auth/reset-password` | "Crea una contraseña segura." |
| Invite | `/auth/invite` | "Tu equipo te está esperando." |
| Thank-you | `/thank-you` | "¡Tu suscripción está activa!" |

**Design tokens compartidos:**
```tsx
const inputClass = 'w-full px-4 py-3.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3730a3] focus:border-transparent transition-colors'
const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'
const btnClass = 'w-full bg-[#3730a3] hover:bg-[#312e81] disabled:opacity-50 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2'
```

---

## 3. Pendientes (orden de prioridad)

| # | Item | Estado |
|---|---|---|
| 1 | Push commits a origin/main | ⏳ Hacer desde terminal |
| 2 | Vercel medclinic-api: agregar `RESEND_API_KEY` + `NEXT_PUBLIC_APP_URL` | 🔴 BLOQUEANTE para emails onboarding |
| 3 | GitHub Secrets (`scripts/set-github-secrets.sh`) — 4 valores reales | 🔴 BLOQUEANTE para CI staging |
| 4 | Sync staging con main | 🟡 |
| 5 | Supabase staging DB aislada | 🟡 Hoy usa prod (riesgo) |
| 6 | Fase 5 — FHIR R4 | 🟢 |
| 7 | UI ARCO (derechos LFPDPPP) | 🟢 |
| 8 | Tests: ampliar cobertura | 🟢 |

---

## 4. CI/CD — configuración crítica (NO TOCAR)

| Archivo | Configuración | Por qué |
|---|---|---|
| `apps/api/tsconfig.json` | `"module": "CommonJS"` + `"moduleResolution": "node"` | `bundler` rompe build |
| `apps/api/tsconfig.json` | `"include": ["src/**/*"]` (sin `prisma/**/*`) | Seeds fuera de rootDir rompen build |
| `apps/api/src/index.ts` | Top-level await en IIFE | CommonJS no soporta TLA |
| `apps/web/.eslintrc.json` | `{ "extends": "next/core-web-vitals" }` | Sin esto, CI cuelga en wizard interactivo |
| `<img>` en páginas web | Requiere `{/* eslint-disable-next-line @next/next/no-img-element */}` | ESLint next/core-web-vitals |

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

## 5. Gotchas conocidos

1. **`pnpm prisma generate` es OBLIGATORIO** antes de cualquier `typecheck`. Los tipos están en `.gitignore`.
2. **`git push` desde Bash puede colgarse** — si da problemas, usar terminal interactiva o GH Desktop.
3. **Multi-tenant**: toda query de BD debe filtrar por `clinicId = request.authUser.clinicId`. Nunca confiar en clinicId del body.
4. **Inputs pre-login**: NO usar `bg-gray-50` — el diseño split-panel usa `bg-white border-gray-300`.
5. **Route groups vs rutas reales**: `app/(auth)/` → URL sin `/auth/`. `app/auth/` → URL con `/auth/`. Las páginas forgot-password y reset-password están en `app/auth/` (rutas reales).
6. **useSearchParams en Next.js 14**: requiere `<Suspense>` boundary obligatorio para páginas con renderizado estático.

---

## 6. Arquitectura rápida

- **Auth**: Supabase JWT → `request.authUser` `{ authUserId, clinicId, role, doctorId? }`
- **Multi-tenant**: todo filtra por `clinicId`
- **Audit NOM-004**: `auditLog()` en toda mutación + READ de notas clínicas
- **Notas firmadas**: inmutables. Enmienda = nueva nota con `amendedFromId`
- **Webhooks**: lab (`X-Lab-API-Key`), elevenlabs (`Bearer`), stripe (signature)

---

## 7. Comandos esenciales

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

## 8. Documentos de referencia en el repo

| Archivo | Contenido |
|---|---|
| `CONTEXT.md` | Contexto completo del proyecto (stack, BD, rutas, auth, env, CI, integraciones, cumplimiento) |
| `HANDOFF.md` | Este archivo — estado para retomar sesión |
| `.env.example` | Todas las variables de entorno necesarias |
