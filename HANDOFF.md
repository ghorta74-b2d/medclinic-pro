# HANDOFF — MedClinic Pro

**Fecha**: 2026-05-05
**Branch**: `main`
**Último commit**: `4fd4eff` — fix build: frozen-lockfile + typecheck gate
**CI**: GitHub Actions activo (security.yml: gitleaks, pnpm audit, CodeQL, rls-check)
**Estado prod**: Dashboard funcional. Pacientes y citas cargan correctamente.

---

## PRIMERA ACCIÓN AL RETOMAR

```bash
# 1. ⚠️ CRÍTICO — Rotar contraseña DB expuesta en chat (ver sección 2)
# Supabase Dashboard → project gzojhcjymqtjswxqgkgk → Database → Settings → Reset password

# 2. Verificar estado
git log --oneline -5
git status

# 3. Si hay logo V2 pendiente (ver sección 6):
BASE="/Users/gerardohorta/Library/Mobile Documents/com~apple~CloudDocs/B2D Automation"
cp "$BASE/MEDIACLINIC/LOGOFINAL/V2/FINAL COLOR.svg"   "$BASE/CLAUDE/CLINIC/medclinic-pro/apps/web/public/logo-color.svg"
cp "$BASE/MEDIACLINIC/LOGOFINAL/V2/FINAL COLOR-3.svg" "$BASE/CLAUDE/CLINIC/medclinic-pro/apps/web/public/logo-white.svg"
```

---

## 1. Estado del repo

```
main (origin): 4fd4eff  fix build: frozen-lockfile + typecheck gate
               fe9a5d6  fix(csp): add medclinic-api.vercel.app to connect-src
               (+ commits security audit 2026-05-04)
               (+ commits onboarding/invite/landing2 anteriores)
```

Vercel auto-deploy en cada push a main. Ambos proyectos (web + api) desplegados en prod.

---

## 2. ⚠️ PENDIENTE CRÍTICO — Rotar contraseña DB

La contraseña `k8eH7SZNqmMlx5G3` quedó expuesta en texto plano en historial de chat del 2026-05-05.

**Pasos exactos:**
1. Supabase Dashboard → `gzojhcjymqtjswxqgkgk` → Database → Settings → **Reset database password**
2. Guardar nueva contraseña en gestor de contraseñas
3. Actualizar Vercel medclinic-api:
   ```bash
   cd apps/api
   vercel env add DATABASE_URL production --force
   # valor: postgresql://postgres.gzojhcjymqtjswxqgkgk:<NEW>@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   vercel env add DIRECT_URL production --force
   # valor: postgresql://postgres.gzojhcjymqtjswxqgkgk:<NEW>@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
   vercel redeploy --prod
   ```
4. Si los GitHub Secrets están seteados, actualizarlos también

---

## 3. Lo que se hizo en sesión 2026-05-05

### Root cause #1 — CSP bloqueaba todos los fetch (`fe9a5d6`)
`connect-src` no incluía `medclinic-api.vercel.app` → browser bloqueaba silenciosamente todos los fetch al API.
Fix: agregado a `apps/web/next.config.mjs`.

### Root cause #2 — Contraseña DB incorrecta
`DATABASE_URL` tenía `hyQxCpXt26SH99Kb`, `DIRECT_URL` tenía `brpGMzhife8D3SwD`. Correcta: `k8eH7SZNqmMlx5G3`.
Causa: Prisma 500 en TODOS los endpoints. Fix: `vercel env add --force` + `vercel redeploy`.

### Root cause #3 — `--no-frozen-lockfile` upgradea paquetes silenciosamente
En cada build Vercel, `@supabase/supabase-js` se upgradaba 2.102.1 → 2.105.3, cambiando tipos TypeScript (`auth.getUser`, `auth.admin`). Sin gate de typecheck, los errores llegaban silentes a producción.

**Fix aplicado (`4fd4eff`) — `apps/api/vercel.json`:**
```json
{
  "buildCommand": "prisma generate && pnpm typecheck",
  "installCommand": "npm install -g pnpm@10.7.1 && pnpm install --frozen-lockfile"
}
```

### Env vars arregladas
| Proyecto | Variable | Antes | Después |
|---|---|---|---|
| medclinic-api | `DATABASE_URL` | contraseña incorrecta | `k8eH7SZNqmMlx5G3` (rotar) |
| medclinic-api | `DIRECT_URL` | contraseña incorrecta | `k8eH7SZNqmMlx5G3` (rotar) |
| medclinic-api | `NEXT_PUBLIC_API_URL` | `""` vacío | `https://medclinic-api.vercel.app` |

---

## 4. Pendientes (orden de prioridad)

| # | Item | Urgencia |
|---|---|---|
| 1 | **Rotar contraseña DB** (ver sección 2) | 🔴🔴 AHORA |
| 2 | GitHub Actions Secrets (DATABASE_URL, SERVICE_ROLE_KEY, JWT_SECRET, ANTHROPIC_API_KEY) | 🔴 Bloquea CI |
| 3 | Vercel medclinic-api: agregar `RESEND_API_KEY` + `NEXT_PUBLIC_APP_URL=https://mediaclinic.mx` | 🔴 Bloquea emails |
| 4 | Supabase MFA (Dashboard → Auth → Providers → Enable TOTP) | 🔴 Seguridad |
| 5 | Supabase HIBP (Dashboard → Auth → Settings → Prevent compromised passwords) | 🟡 |
| 6 | Reemplazar `PLACEHOLDER_BING` en `apps/web/src/app/layout.tsx` | 🟡 SEO |
| 7 | Logo V2 (ver sección 6) | 🟡 Branding |
| 8 | Rate limit /upload (5/min) y /api/consulta-ia (10/min) — MED-01 | 🟡 |
| 9 | HMAC-SHA256 en WhatsApp webhook POST — MED-05 | 🟡 |
| 10 | PR #22 `deps/safe-updates` — revisar y mergear | 🟢 |
| 11 | Staging DB aislada (hoy apunta a prod) | 🟢 |

---

## 5. CI/CD — configuración crítica (NO TOCAR)

| Archivo | Configuración | Por qué |
|---|---|---|
| `apps/api/vercel.json` | `--frozen-lockfile` | Evita upgrades silenciosos que rompen tipos |
| `apps/api/vercel.json` | `pnpm typecheck` en buildCommand | Gate TypeScript — falla build antes de llegar a prod |
| `apps/api/tsconfig.json` | `module: "CommonJS"` + `moduleResolution: "node"` | bundler+CJS incompatible |
| `apps/api/tsconfig.json` | `include: ["src/**/*"]` solamente | prisma/** fuera de rootDir |
| `apps/api/src/index.ts` | top-level await en IIFE | CJS no soporta TLA |
| `apps/web/.eslintrc.json` | `{ "extends": "next/core-web-vitals" }` | Sin esto CI cuelga en wizard |

### Patrones Prisma + Zod obligatorios

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

## 6. Logo V2 — plan listo (pendiente ejecución)

Plan completo guardado en `/Users/gerardohorta/.claude/plans/ya-tienes-acceso-al-ethereal-steele.md`.

**Resumen:**
- `FINAL COLOR.svg` → `public/logo-color.svg` (fondos claros)
- `FINAL COLOR-3.svg` → `public/logo-white.svg` (fondos oscuros/sidebar/auth)
- Solo cambio de código: `sidebar-nav.tsx` línea ~151: `width={120} height={32}` → `width={165} height={36}`
- Commit: `feat(branding): replace logo assets with V2 design`
- NO cambiar favicon (`app/icon.svg`)

---

## 7. Gotchas críticos

1. **`pnpm prisma generate` es OBLIGATORIO** antes de `typecheck` local (tipos en `.gitignore`)
2. **`NEXT_PUBLIC_*` se hornean en bundle**: cambiar en Vercel env no toma efecto sin nuevo `git push`. `vercel redeploy` no re-hornea.
3. **`""` vacío no activa `??` nullish fallback** — `process.env.X ?? 'default'` usa default solo si X es null/undefined, no si es string vacío.
4. **DATABASE_URL y DIRECT_URL misma contraseña**: ambas apuntan a la misma DB (puerto 6543 pooler vs 5432 direct). Rotar una = rotar ambas.
5. **Multi-tenant**: toda query debe filtrar por `clinicId = request.authUser.clinicId`. Nunca tomar clinicId del body.
6. **@fastify/compress PROHIBIDO**: incompatible con Vercel serverless.
7. **LabResult delete**: SIEMPRE soft delete — nunca `prisma.labResult.delete()`.
8. **bucket clinical-files**: privado siempre — nunca `public: true`, siempre signed URLs.

---

## 8. Arquitectura rápida

- **Auth**: Supabase JWT → `request.authUser` `{ authUserId, clinicId, role, doctorId? }`
- **Email**: Resend, sender `noreply@mediaclinic.mx`, from `Mediaclinic` (único dominio verificado)
- **Pagos**: Stripe live, 14 días trial
- **Analytics**: GA4 `G-F5XKSC31BL`
- **RLS**: 62 políticas en 22 tablas, helper `public.get_clinic_id()` para tenant isolation
- **NOM-004**: `auditLog()` en toda mutación + READ de notas clínicas. Notas inmutables.

---

## 9. Comandos esenciales

```bash
# Setup local
pnpm install
pnpm --filter api prisma generate  # SIEMPRE primero

# Dev
pnpm dev                           # web :3000 + api :3001

# Verificar antes de push
pnpm --filter api prisma generate && pnpm --filter api typecheck
pnpm --filter web lint

# Deploy
git push origin main               # Vercel auto-deploy ambos proyectos
```

---

## 10. Documentos de referencia

| Archivo | Contenido |
|---|---|
| `CONTEXT.md` | Stack completo, BD, rutas, auth, env, CI, integraciones, cumplimiento NOM |
| `HANDOFF.md` | Este archivo |
| `security/SECURITY-AUDIT-REPORT.md` | Reporte completo audit 2026-05-04 |
| `security/SECURITY-CHECKLIST.md` | ~25 ítems pre-merge |
| `.env.example` | Todas las variables de entorno |
