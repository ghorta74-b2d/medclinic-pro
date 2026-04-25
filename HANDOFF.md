# HANDOFF — MedClinic Pro

**Fecha**: 2026-04-25
**Último commit (main)**: `414a0ca`
**CI**: ✅ Verde (run #9 en main — pre-design-system)
**Estado**: Producción estable. Fases 0–4 + Design System completados. Listos para Fase 5.

---

## 1. Resumen ejecutivo

SaaS clínico LATAM. Stack: monorepo pnpm (`apps/api` Fastify + Prisma + Postgres/Supabase, `apps/web` Next.js 14 App Router). Cumplimiento NOM-004 MX (firma electrónica, enmiendas, audit log). Despliegue: Vercel (web) + Render/Fly (API), Supabase (DB).

**Sesión 2026-04-25**: Design system completo para área autenticada (dark mode por defecto, paleta azul médico, SF Pro, primitivos shadcn/CVA). 14 páginas + 12 componentes migrados a tokens semánticos. Montos sin decimales.

**Sesión 2026-04-23**: Estabilizó el pipeline CI/CD que estaba roto por errores en cadena. Causa raíz identificada: **no se puede correr `tsc --noEmit` localmente porque los tipos generados de Prisma están en `.gitignore`** — cada error solo aparecía cuando CI llegaba a esa línea.

---

## 2. Design System — sesión 2026-04-25 (commit `414a0ca`)

### 2.1 Tokens CSS (globals.css)
- Dark por defecto: `--background 222 22% 7%`, `--primary 205 90% 55%` (azul médico), `--success 152 60% 45%` (verde clínico), `--warning 38 92% 55%`, `--destructive 0 72% 55%`
- Light: mismos nombres, valores invertidos
- Sidebar separado: `--sidebar 222 24% 6%`
- `--radius: 0.875rem`

### 2.2 Primitivos UI nuevos (`apps/web/src/components/ui/`)
`button`, `card`, `input`, `label`, `badge`, `status-dot`, `separator`, `avatar`, `skeleton`, `tabs`, `dialog`, `dropdown-menu`, `select`, `switch`, `progress`, `toast`, `toaster` — todos CVA + Radix + tokens semánticos.

### 2.3 Shell nuevo
- `sidebar-nav.tsx`: secciones GENERAL / OPERACIONES, pill activo `bg-primary/15`, ancho 240px, role-based filtering preservado, `sessionCache.clear()` en logout preservado
- `topbar.tsx`: búsqueda, `<ThemeToggle />`, avatar usuario
- `app-shell.tsx`: grid `sidebar + main`, clase `font-sf`
- `theme-provider.tsx` + `theme-toggle.tsx`: next-themes dark default, sol/luna

### 2.4 Migración páginas y componentes
14 páginas `/dashboard`, `/agenda`, `/pacientes`, `/cobros`, `/recetas`, `/configuracion`, `/laboratorio`, `/billing`, `/expediente`, `/consulta-ia`, `/asistente-ia`, etc. + 12 componentes compartidos migrados de clases Tailwind hardcoded (`bg-white`, `text-gray-*`, `bg-blue-*`) a tokens semánticos (`bg-card`, `text-foreground`, `bg-primary/*`).

### 2.5 Otros cambios
- `formatCurrency`: `minimumFractionDigits: 0` — sin decimales en toda la app
- Font: SF Pro (`-apple-system, BlinkMacSystemFont`) via clase `font-sf` en app-shell

### 2.6 Configuración crítica (NO TOCAR)
- `next-themes`: `defaultTheme="dark"`, `attribute="class"`, `storageKey="medclinic-theme"` — si se cambia, el toggle deja de persistir
- Sidebar hardcoded `bg-sidebar` (no `bg-background`) para mantener contraste diferenciado en light mode

---

## 3. Cambios clave — CI/CD stabilization (sesión 2026-04-23)

### 3.1 Configuración crítica (NO TOCAR sin entender)

| Archivo | Configuración correcta | Por qué |
|---|---|---|
| `apps/api/tsconfig.json` | `"module": "CommonJS"` + `"moduleResolution": "node"` | `bundler` es **incompatible** con CommonJS. Antes fallaba antes de typecheckear el resto. |
| `apps/api/tsconfig.json` | `"include": ["src/**/*"]` (sin `prisma/**/*`) | Los seeds de Prisma quedaban fuera de `rootDir` y rompían build. |
| `apps/api/src/index.ts` | Top-level await envuelto en IIFE `void (async () => {...})()` | CommonJS no soporta TLA. |
| `apps/web/.eslintrc.json` | `{ "extends": "next/core-web-vitals" }` | Sin esto, `next lint` lanza wizard interactivo y CI cuelga. |

### 3.2 Patrones obligatorios para Prisma + Zod

```typescript
// JSON fields → SIEMPRE z.any(), NUNCA z.unknown()
// Razón: Prisma exige InputJsonValue (no acepta JsonValue|unknown)
metadata: z.record(z.any()).optional(),
familyHistory: z.record(z.any()).optional(),
reviewOfSystems: z.record(z.any()).optional(),

// Spreads condicionales en .update() → cast al final del data block
await prisma.patient.update({
  where: { id },
  data: {
    ...(x ? { x } : {}),
    ...(y ? { y } : {}),
  } as Parameters<typeof prisma.patient.update>[0]['data'],
})
```

### 3.3 Otros fixes (referencia)

- `apps/api/src/services/pdf.ts`: `interface | null` no es válido → usar `type`.
- `apps/api/src/middleware/audit.ts:50`: `metadata: ... ? (meta as object) : undefined`.
- `apps/api/src/routes/consulta-ia.ts`: usar `doctorId` (no `userId`); `Errors.FORBIDDEN(reply)` sin segundo arg; `auditLog` con `action: 'CREATE'` + `metadata.source`.
- `apps/api/src/routes/webhooks/elevenlabs.ts:13`: doble cast `as unknown as`.
- `apps/api/src/routes/webhooks/stripe.ts:60`: `case ('payment_link.completed' as any)` con `eslint-disable-next-line`.
- `apps/web/src/app/landing/page.tsx`: comillas literales `"..."` en JSX → `&ldquo;`/`&rdquo;`. Logo `<img>` con `eslint-disable-next-line @next/next/no-img-element`.
- `apps/web/src/components/agenda/new-appointment-dialog.tsx:578,587`: idem `&ldquo;`.
- `apps/web/src/app/(dashboard)/consulta-ia/page.tsx`: removidos comentarios `eslint-disable @typescript-eslint/no-explicit-any` (regla no cargada con `next/core-web-vitals`).

### 3.4 Seguridad

- `scripts/set-github-secrets.sh`: token `gho_...` hardcodeado eliminado. Ahora exige `${GH_TOKEN:?...}`.
- Ref corrupto `.git/refs/remotes/origin/HEAD 2` (con espacio) eliminado manualmente.

---

## 4. Lecciones / reglas para próxima sesión

1. **Antes de hacer push: pedir el log COMPLETO de CI**, no fix-iterar error por error.
2. **No se puede typecheckear local** sin correr `pnpm prisma generate` antes.
3. **`bundler` moduleResolution NO sirve** con `module: CommonJS`. Si se migra API a ESM, cambiar AMBOS.
4. **JSON Prisma + Zod**: `z.record(z.any())`. Memorizar.
5. **Update spreads** necesitan cast `as Parameters<typeof prisma.X.update>[0]['data']`.
6. **Design system**: migrar páginas primero, luego componentes importados — siempre hacer grep de `bg-white`/`text-gray-*` después de cada migración.

---

## 5. Pendientes críticos (orden de prioridad)

### 4.1 GitHub Secrets (BLOQUEANTE para staging deploy real)
- Script listo: `scripts/set-github-secrets.sh`.
- Falta: usuario debe rellenar valores desde Supabase dashboard y ejecutar:
  ```bash
  export GH_TOKEN=ghp_...
  bash scripts/set-github-secrets.sh
  ```

### 4.2 Supabase staging DB aislada
- Hoy staging branch CI corre contra DB de prod (riesgo).
- Opciones: Supabase Pro (branching nativo) o segundo proyecto free.

### 4.3 Fase 5 — Interoperabilidad FHIR R4
- Recursos: `Patient`, `Encounter`, `MedicationRequest`.
- UI ARCO completa (Acceso, Rectificación, Cancelación, Oposición — LFPDPPP).
- Endpoint `/api/fhir/v4/...` con auth OAuth2 SMART-on-FHIR.

---

## 5. Estado del repo

```
Branch main:    414a0ca (design system dark mode + SF Pro)
Branch staging: e844b07 (pendiente sync con main)
```

### Workflow GitHub Actions
- `.github/workflows/ci.yml`: corre en push a `main` y `staging` + PRs. Pasos: install → prisma generate → typecheck (api+web) → lint (web) → test (api).

### Tests
- `apps/api/src/tests/*.test.ts` (Vitest + Fastify inject). Cobertura: patients, auth, clinical-notes básico.
- Pendiente ampliar a consulta-ia, prescriptions, lab webhook.

---

## 6. Arquitectura (recordatorio rápido)

- **Auth**: Supabase Auth → `request.authUser` con `{ authUserId, clinicId, role, doctorId? }`. Middleware `requireDoctor` / `requireStaff` / `requireAdmin`.
- **Multi-tenant**: TODO query filtra por `clinicId`. Nunca confiar en input del cliente.
- **Audit**: `auditLog({ user, action, resourceType, resourceId, ... })` en toda mutación + lectura sensible (READ de ClinicalNote).
- **NOM-004**: Notas firmadas son inmutables. Solo se enmiendan vía `/sign` → `/amend`. Una sola enmienda draft activa por nota.
- **Webhooks**: lab (X-Lab-API-Key), elevenlabs (Bearer), stripe (signature).

---

## 7. Comandos útiles

```bash
# Local dev
pnpm dev                          # web + api
pnpm --filter api prisma generate # OBLIGATORIO antes de typecheck
pnpm --filter api typecheck
pnpm --filter web lint

# CI logs
gh run list --branch main --limit 5
gh run view <run-id> --log-failed

# Deploy
git push origin main              # auto-deploy Vercel web preview
git push origin main:staging      # promover main a staging
```

---

## 8. Para retomar

Próxima sesión arranca con:
1. `git pull origin main` (verificar `414a0ca` o posterior).
2. Confirmar CI verde: `gh run list --branch main --limit 1`.
3. Decidir: ¿migración página por página del design system, GitHub Secrets, Supabase staging, o Fase 5 FHIR?

**Nota design system**: las páginas internas heredan dark automáticamente. Si alguna se ve mal, el patrón es buscar `bg-white`/`text-gray-` y reemplazar por `bg-card`/`text-foreground`.
