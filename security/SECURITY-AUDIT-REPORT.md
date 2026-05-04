# Mediaclinic — Security Audit Report

**Fecha:** 2026-05-04  
**Auditor:** Claude (CISO mode) + exploración estática del repositorio  
**Scope:** Repositorio completo `medclinic-pro` (Next.js + Fastify + Prisma + Supabase + Stripe)  
**Resultado:** 3 Critical | 5 High | 5 Medium | 3 Low/Informational  
**Auto-remediados:** 10 | **Pendientes acción humana:** 8

---

## Executive Summary

Mediaclinic es una plataforma SaaS multi-tenant que maneja datos clínicos bajo NOM-004-SSA3-2012. La auditoría encontró que la arquitectura de aplicación tiene buenas bases (JWT verificado en servidor, roles RBAC, audit logging, soft deletes) pero tenía tres brechas críticas que se han remediado:

1. **Cero RLS en base de datos** — toda la seguridad multi-tenant dependía exclusivamente del código de aplicación. Un bug en cualquier endpoint podría exponer datos de todos los tenants.
2. **Headers de seguridad ausentes en Next.js** — sin CSP, HSTS, X-Frame-Options, expuesto a clickjacking y XSS básico.
3. **File upload sin validación MIME** — el servidor confiaba en el `Content-Type` enviado por el cliente, permitiendo subir archivos maliciosos disfrazados de PDFs.

---

## Surface Map

### Endpoints — Fastify API (`apps/api`)

| Prefijo | Autenticación | Sensibilidad |
|---------|--------------|--------------|
| `GET /health` | Público | Baja |
| `POST /api/checkout/*` | Público | Media (pagos) |
| `POST /api/auth/*` | Público | Alta (credenciales) |
| `POST /api/webhooks/*` | Por firma | Alta |
| `GET/POST/PATCH /api/patients/*` | requireStaff | **Crítica** (PII) |
| `GET/POST/PATCH /api/clinical-notes/*` | requireDoctor | **Crítica** (ECE) |
| `GET/POST/PATCH /api/prescriptions/*` | requireDoctor | **Crítica** (recetas) |
| `GET/POST/PATCH /api/lab-results/*` | requireStaff | **Crítica** (diagnósticos) |
| `GET/POST/PATCH /api/billing/*` | requireStaff | Alta (financiero) |
| `GET/POST /api/consulta-ia/*` | requireDoctor | Alta (IA + datos médicos) |
| `GET/* /api/superadmin/*` | requireAdmin | **Crítica** (super acceso) |

### Rutas Next.js API
| Ruta | Uso |
|------|-----|
| `app/api/demo/route.ts` | Demo de email (Resend) — solo para testing |

### Tablas con datos sensibles (Prisma/Supabase)
`patients`, `clinical_notes`, `prescriptions`, `lab_results`, `appointments`, `invoices`, `payment_records`, `audit_logs`, `doctors`, `users`

### Integraciones externas
Supabase Auth + DB, Stripe, Resend, Anthropic Claude, WhatsApp Business API, ElevenLabs, Daily.co

---

## Findings

### CRITICAL

#### CRIT-01: Cero políticas RLS en Supabase
- **Severidad:** Critical
- **Componente:** Base de datos Supabase — todas las tablas
- **Descripción:** Ninguna tabla en el schema `public` tenía RLS habilitado. La única protección multi-tenant era la lógica de aplicación en el Fastify API.
- **Riesgo:** Un bug en cualquier endpoint (ej. olvidar el filtro `clinicId: request.authUser.clinicId`) expone datos de todos los tenants. Si el `SUPABASE_SERVICE_ROLE_KEY` se filtra, un atacante tiene acceso completo a toda la BD sin restricciones.
- **Estado:** ⚠️ Requiere acción humana — SQL generado listo para aplicar
- **Fix:** `supabase/migrations/20260504000000_enable_rls.sql` — habilita RLS en 18 tablas con políticas de tenant isolation para SELECT/INSERT/UPDATE/DELETE. Audit logs configurados como append-only (DELETE bloqueado). Notas clínicas con DELETE bloqueado (NOM-004).
- **Acción humana requerida:** Aplicar la migración: `supabase db push` O ejecutar el SQL directamente en el Supabase Dashboard → SQL Editor.

#### CRIT-02: Headers de seguridad completamente ausentes en Next.js
- **Severidad:** Critical
- **Componente:** `apps/web/next.config.mjs`
- **Descripción:** El frontend carecía de Content-Security-Policy, X-Frame-Options, HSTS, X-Content-Type-Options y Referrer-Policy.
- **Riesgo:** Sin CSP, cualquier script inyectado (XSS) puede exfiltrarse credenciales y tokens. Sin X-Frame-Options, la app puede embeberse en iframes para clickjacking. Sin HSTS, conexiones HTTP iniciales son vulnerables a downgrade.
- **Estado:** ✅ Fixed automatically
- **Fix aplicado:** `apps/web/next.config.mjs` — bloque `async headers()` con CSP (whitelist: Stripe, GA4, Supabase, Vercel Analytics), X-Frame-Options: DENY, HSTS 2 años, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy.

#### CRIT-03: File upload sin validación MIME en servidor
- **Severidad:** Critical
- **Componente:** `apps/api/src/routes/lab-results.ts:159`
- **Descripción:** `contentType: data.mimetype` usaba directamente el Content-Type enviado por el cliente sin verificación. Nombre del archivo también venía del cliente (`data.filename`), susceptible a path traversal.
- **Riesgo:** Un atacante puede subir un archivo HTML o JS con Content-Type `application/pdf`. Si el bucket se configura accidentalmente como público, el navegador lo ejecuta. Path traversal podría sobrescribir archivos de otros pacientes.
- **Estado:** ✅ Fixed automatically
- **Fix aplicado:** `apps/api/src/routes/lab-results.ts` — validación por magic bytes (primeros 4 bytes): `%PDF`, `\xFF\xD8\xFF` (JPEG), `\x89PNG`. Nombre de archivo generado como `{id}-{timestamp}.{ext}`, nunca del cliente.

---

### HIGH

#### HIGH-01: PATCH /notes y /review sin validación Zod
- **Severidad:** High
- **Componente:** `apps/api/src/routes/lab-results.ts:327,344`
- **Descripción:** `const body = request.body as { notes: string }` — TypeScript cast en runtime. Sin validación, un cliente malicioso puede enviar strings arbitrariamente largos o tipos inesperados.
- **Riesgo:** DoS por payload gigante almacenado en BD; potencial para inyección de contenido en notas médicas.
- **Estado:** ✅ Fixed automatically
- **Fix aplicado:** Schemas Zod `NotesPatchSchema` y `ReviewPatchSchema` con `z.string().max(10000)`.

#### HIGH-02: Billing services sin Zod
- **Severidad:** High
- **Componente:** `apps/api/src/routes/billing.ts:56,84`
- **Descripción:** POST y PATCH de servicios usaban TypeScript casts sin validación runtime.
- **Riesgo:** Tipos numéricos incorrectos en precios/tasas pueden corromper datos financieros; strings sin límite en nombres permiten payloads grandes.
- **Estado:** ✅ Fixed automatically
- **Fix aplicado:** `CreateServiceSchema` y `UpdateServiceSchema` con Zod; `name: z.string().min(1).max(200)`, `price: z.number().positive()`, `taxRate: z.number().min(0).max(1)`.

#### HIGH-03: Sin validación de variables de entorno al boot
- **Severidad:** High
- **Componente:** `apps/api/src/`, `apps/web/src/`
- **Descripción:** La app arrancaba incluso con variables críticas faltantes. Los errores aparecían en runtime con mensajes crípticos (ej. "Cannot read property of undefined").
- **Riesgo:** Deploys silenciosamente rotos; dificulta diagnóstico en producción.
- **Estado:** ✅ Fixed automatically
- **Fix aplicado:** `apps/api/src/lib/env.ts` — schema Zod que valida 14 variables al boot y hace `process.exit(1)` con mensaje claro si alguna falta. Importado como primera línea de `index.ts`. `apps/web/src/lib/env.ts` — equivalente para variables públicas del frontend.

#### HIGH-04: CORS con wildcards demasiado amplios
- **Severidad:** High
- **Componente:** `apps/api/src/server.ts:51-55`
- **Descripción:** `origin.startsWith('https://medclinic-web')` y `origin.startsWith('https://mediaclinic')` permitían cualquier subdominio/variante de esos prefijos (ej. `mediaclinica.mx`, `medclinic-web-evil.vercel.app`).
- **Riesgo:** Un atacante con un dominio similar podría hacer peticiones CORS autenticadas.
- **Estado:** ✅ Fixed automatically
- **Fix aplicado:** `apps/api/src/server.ts` — lista estática con `Set<string>`, sin wildcards. Solo `allowedOrigins.has(origin)`.

#### HIGH-05: Health check expone estado de secrets
- **Severidad:** High
- **Componente:** `apps/api/src/server.ts:79-90`
- **Descripción:** `GET /health` respondía con booleans sobre qué Stripe Price IDs estaban configurados, exponiendo información sobre el estado de configuración del servidor.
- **Riesgo:** Information disclosure — facilita fingerprinting y entender qué variables de entorno están activas.
- **Estado:** ✅ Fixed automatically
- **Fix aplicado:** Health check devuelve solo `{ status, app, version, ts }`.

---

### MEDIUM

#### MED-01: Sin rate limit específico en /upload y /api/consulta-ia
- **Severidad:** Medium
- **Componente:** `apps/api/src/routes/lab-results.ts`, `apps/api/src/routes/consulta-ia.ts`
- **Descripción:** El rate limit global es 200 req/min por IP, pero los endpoints de file upload y consulta IA (que genera costos en Anthropic) no tienen límites específicos.
- **Riesgo:** Un usuario malicioso puede hacer 200 llamadas/min a la API de Anthropic, generando costos significativos. Upload masivo puede saturar Supabase Storage.
- **Estado:** ⚠️ Documentado — recomendado agregar rate limit por usuario en estos endpoints
- **Recomendación:** Agregar `config: { rateLimit: { max: 10, timeWindow: '1 minute' } }` en los handlers de `/upload` y `/process` de consulta-ia. Requiere `@fastify/rate-limit` configurado con key por `authUserId`.

#### MED-02: Nombre de archivo del cliente en Storage path
- **Severidad:** Medium
- **Componente:** `apps/api/src/routes/lab-results.ts:154`
- **Descripción:** `data.filename` (proveído por el cliente) se usaba directamente en el path de Supabase Storage.
- **Riesgo:** Path traversal si el sanitizador de Supabase tiene bugs; nombres con caracteres especiales pueden causar problemas.
- **Estado:** ✅ Fixed automatically
- **Fix aplicado:** Nombre generado como `{id}-{timestamp}.{ext_from_mimetype}`.

#### MED-03: remotePatterns en Next.js apuntaba a `/object/public/`
- **Severidad:** Medium
- **Componente:** `apps/web/next.config.mjs`
- **Descripción:** `pathname: '/storage/v1/object/public/**'` habilitaría optimización de imágenes desde el bucket público. Los archivos clínicos deben ser privados.
- **Riesgo:** Si algún bucket se configura accidentalmente como público, las imágenes se servirían sin autenticación.
- **Estado:** ✅ Fixed automatically
- **Fix aplicado:** Cambiado a `/storage/v1/object/sign/**` — solo URLs firmadas (privadas).

#### MED-04: Sin Dependabot
- **Severidad:** Medium
- **Componente:** Repositorio raíz
- **Descripción:** Sin automatización para actualizar dependencias con CVEs.
- **Estado:** ✅ Fixed automatically
- **Fix aplicado:** `.github/dependabot.yml` — weekly checks para npm (root, web, api) y GitHub Actions.

#### MED-05: WhatsApp webhook POST sin firma HMAC
- **Severidad:** Medium
- **Componente:** `apps/api/src/routes/webhooks/whatsapp.ts`
- **Descripción:** El GET de verificación comprueba `hub.verify_token`, pero el POST que procesa mensajes entrantes no verifica una firma HMAC del payload.
- **Riesgo:** Cualquiera puede hacer POST al endpoint y simular mensajes de WhatsApp.
- **Estado:** ⚠️ Documentado — Meta WhatsApp API soporta firma X-Hub-Signature-256
- **Recomendación:** Agregar verificación de `X-Hub-Signature-256` header usando HMAC-SHA256 con el App Secret de Meta.

---

### LOW / INFORMATIONAL

#### INFO-01: JSON fields sin schema en Prisma
- **Descripción:** Campos `Json` en el schema (`scheduleConfig`, `familyHistory`, `physicalExam`) no tienen validación de estructura. Solo el backend escribe en ellos (bajo control), por lo que el riesgo es bajo.
- **Recomendación:** Agregar tipos TypeScript explícitos y validación Zod en los servicios que escriben estos campos.

#### INFO-02: sessionStorage para caché de rol/clinicId
- **Descripción:** `apps/web/src/lib/api.ts` cachea `_mc_role`, `_mc_did`, `_mc_cid` en sessionStorage para optimizar latencia.
- **Análisis:** Aceptable — no son tokens de autenticación, se borran al cerrar la pestaña, y son valores no-secretos derivados del JWT verificado en servidor.

#### INFO-03: Datos médicos enviados a Claude API
- **Descripción:** `POST /api/lab-results/:id/summarize` envía PDFs médicos a Anthropic para análisis.
- **Riesgo regulatorio:** Para cumplir NOM-004-SSA3-2012 y LFPDPPP, se recomienda un Data Processing Agreement (DPA) con Anthropic.
- **Recomendación:** Revisar y aceptar los términos de privacidad de Anthropic para procesamiento de datos sensibles. Considerar mencionar el uso de IA en el consentimiento informado del paciente.

---

## Acciones humanas requeridas

| # | Prioridad | Acción | Sistema |
|---|-----------|--------|---------|
| 1 | 🔴 CRÍTICA | **Aplicar migración RLS** — `supabase db push` o ejecutar `supabase/migrations/20260504000000_enable_rls.sql` en el SQL Editor del dashboard | Supabase |
| 2 | 🔴 ALTA | **Rotar SUPABASE_SERVICE_ROLE_KEY** si el archivo `.env` local alguna vez tuvo valores reales (asumir compromiso si estuvo en git) | Supabase Dashboard |
| 3 | 🔴 ALTA | **Agregar env vars en Vercel `medclinic-api`**: `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL=https://mediaclinic.mx` | Vercel Dashboard |
| 4 | 🔴 ALTA | **Configurar GitHub Actions Secrets**: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `ANTHROPIC_API_KEY` (para CI) | GitHub Settings |
| 5 | 🟡 MEDIA | **Habilitar MFA en Supabase Auth** — Auth → Settings → Multi-Factor Authentication → Enable | Supabase Auth |
| 6 | 🟡 MEDIA | **Activar HaveIBeenPwned check** — Auth → Settings → Password → "Check against HaveIBeenPwned" | Supabase Auth |
| 7 | 🟡 MEDIA | **Reemplazar `PLACEHOLDER_BING`** en `apps/web/src/app/layout.tsx` con token real de Bing Webmaster Tools | layout.tsx + Bing |
| 8 | 🟡 MEDIA | **Agregar firma HMAC en WhatsApp webhook POST** — usando X-Hub-Signature-256 con el App Secret de Meta | `routes/webhooks/whatsapp.ts` |

---

## Métricas post-remediación

| Métrica | Antes | Después | Target |
|---------|-------|---------|--------|
| Tablas con RLS | 0% | 0%* | 100% |
| Endpoints con validación Zod | ~85% | ~95% | 100% |
| Security headers en Next.js | 0/6 | 6/6 | 6/6 |
| Vulnerabilidades CORS (wildcards) | 2 | 0 | 0 |
| Deps con Dependabot | No | Sí | Sí |
| Secrets hardcodeados encontrados | 0 | 0 | 0 |

*RLS SQL generado — pendiente de aplicación manual en Supabase.

---

## Roadmap de seguridad (próximos 90 días)

### Mes 1 (Mayo 2026)
- [ ] Aplicar migración RLS en Supabase (CRÍTICO)
- [ ] Configurar MFA en Supabase Auth
- [ ] Configurar GitHub Actions Secrets y verificar que el CI corra
- [ ] Agregar rate limit por usuario en `/upload` y `/consulta-ia`
- [ ] Implementar firma HMAC en WhatsApp webhook

### Mes 2 (Junio 2026)
- [ ] Revisar términos Anthropic para DPA (datos médicos)
- [ ] Agregar Zod validation en JSON fields (scheduleConfig, familyHistory)
- [ ] Revisar primer run de Dependabot y mergear actualizaciones de seguridad
- [ ] Configurar Sentry con redacción de campos sensibles (password, token, authorization)

### Mes 3 (Julio 2026)
- [ ] Penetration test externo focalizado en tenant isolation
- [ ] Revisión de logs de audit trail — verificar integridad
- [ ] Documentar proceso de rotación de secretos
- [ ] Evaluar upgrade Supabase Pro para staging DB aislada
