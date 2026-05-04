# Mediaclinic — Security Baseline

Este documento define el estándar de seguridad que el proyecto debe mantener. Sirve como referencia para code reviews, onboarding de nuevos devs y auditorías futuras.

**Última actualización:** 2026-05-04  
**Revisión recomendada:** cada 6 meses o tras incidentes

---

## 1. Secret Management — Reglas Permanentes

### Reglas
1. **Toda credencial va a Vercel/Supabase env vars.** Nunca al repositorio, nunca en comentarios, nunca en logs.
2. **Toda variable nueva se agrega el mismo día** a `apps/api/src/lib/env.ts` (schema Zod) y a `apps/api/.env.example` con placeholder descriptivo.
3. **Variables `NEXT_PUBLIC_*`** solo contienen valores seguros para exponer al cliente: URL pública de Supabase, anon key, Stripe publishable key, GA4 ID.
4. **`SUPABASE_SERVICE_ROLE_KEY`** se usa únicamente en el servidor API (Fastify). Jamás en `'use client'`, hooks de React, ni Server Components que renderizen al cliente.
5. **Rotación obligatoria** en menos de 24 horas si un secreto aparece en: repositorio git, logs, error tracking (Sentry), mensajes de Slack, o cualquier lugar no-intencional.
6. **Pre-commit hook** con `gitleaks protect --staged` bloquea cualquier intento de commitear secretos.

### Cómo agregar una variable nueva
```
1. Crear en Vercel Dashboard → Settings → Environment Variables (separar por env)
2. Agregar al schema en apps/api/src/lib/env.ts:
   NUEVA_VAR: z.string().min(10, 'NUEVA_VAR required'),
3. Agregar a .env.example:
   NUEVA_VAR=replace_me_with_real_value
4. Documentar en el PR: propósito, dónde se obtuvo, cómo rotar
```

---

## 2. Row Level Security — Reglas Permanentes

1. **Toda tabla nueva se crea con RLS habilitado** en la misma migración. Sin excepciones.
2. **Toda tabla de tenants** (contiene `clinicId`) debe tener políticas explícitas para SELECT, INSERT, UPDATE y DELETE.
3. **Patrón estándar** para tenant isolation:
   ```sql
   ALTER TABLE nueva_tabla ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "service_role_all" ON nueva_tabla
     AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
   CREATE POLICY "tenant_select" ON nueva_tabla
     AS PERMISSIVE FOR SELECT TO authenticated
     USING ("clinicId" = auth.clinic_id());
   -- ... INSERT, UPDATE, DELETE con mismo patrón
   ```
4. **Tablas de auditoría son append-only**: política RESTRICTIVE que bloquea UPDATE y DELETE para `authenticated`.
5. **CI verifica** con `node scripts/check-rls.js` que todas las tablas en `public` tienen RLS + políticas. Falla el build si encuentra violaciones.
6. **Migraciones que crean tablas sin RLS** son rechazadas en code review.

---

## 3. Validación de Inputs — Reglas Permanentes

1. **Todo endpoint** (Next.js route handler y Fastify route) valida el body con un schema Zod antes de procesar.
2. **Whitelist, no blacklist**: `z.object({ ... })` acepta solo los campos esperados.
3. **Tamaño máximo en todos los strings**: `z.string().max(N)`. Sin `.max()` = PR rechazado.
4. **Tipos exactos**: no `z.coerce` a menos que sea estrictamente necesario con justificación en comentario.
5. **IDs de recursos** validados como `z.string().uuid()` cuando corresponde.
6. **Campos con formato conocido**: email → `z.string().email()`, CURP → regex específico, RFC → regex, teléfono MX → `/^\+?[0-9]{10,15}$/`.
7. **Nunca usar `request.body as SomeType`** en producción. Siempre `.safeParse()` y retornar 400 si falla.

---

## 4. Autenticación y Sesiones — Reglas Permanentes

1. **JWT verificado en servidor** en cada request al Fastify API. El token del cliente nunca se confía sin verificación.
2. **Roles en `user_metadata`** del JWT de Supabase. El middleware de auth extrae `clinicId`, `role`, `doctorId` del token verificado.
3. **Cookies httpOnly + Secure + SameSite** para sesiones de Supabase SSR. Manejadas automáticamente por `@supabase/ssr`.
4. **localStorage/sessionStorage** solo para datos no-sensibles y no-secretos (ej. caché de rol para optimizar UX). Nunca tokens, nunca PII.
5. **Logout completo** invalida el refresh token en Supabase Auth (`supabase.auth.signOut()`), no solo borra la cookie.
6. **MFA disponible** para roles ADMIN y DOCTOR — recomendado en el onboarding.

---

## 5. Autorización (RBAC + Tenant Isolation) — Reglas Permanentes

1. **Cada endpoint verifica** que el recurso pertenece a `request.authUser.clinicId`. RLS es la segunda línea, el código es la primera.
2. **IDOR prevention**: cualquier endpoint con `:id` en la URL hace `findFirst({ where: { id, clinicId } })`, nunca `findUnique({ where: { id } })` sin filtro de tenant.
3. **Privilege escalation**: ningún endpoint permite a un usuario cambiar su propio rol. Solo el superadmin puede promover/degradar roles.
4. **Roles en orden de privilegio**: `SUPER_ADMIN > ADMIN > DOCTOR > STAFF`. Los guards `requireDoctor` y `requireStaff` aplican niveles mínimos.

---

## 6. File Upload — Reglas Permanentes

1. **Validación por magic bytes** en el servidor, nunca por el `Content-Type` del cliente.
2. **Whitelist de tipos**: `application/pdf`, `image/jpeg`, `image/png`. Rechazar todo lo demás con 415.
3. **Nombre de archivo generado por el servidor**: `{resource-id}-{timestamp}.{ext}`. Nunca usar `data.filename` del cliente.
4. **Tamaño máximo**: 50 MB global (config de `@fastify/multipart`). Considerar límites menores por tipo.
5. **Bucket privado**: `clinical-files` siempre privado (`public: false`). URLs de acceso siempre firmadas con expiración ≤ 5 minutos.
6. **`Content-Disposition: attachment`** en responses de archivo para forzar descarga y evitar ejecución en browser.

---

## 7. API Security — Reglas Permanentes

1. **CORS**: lista explícita de orígenes. Sin `startsWith`, sin `*`. Actualizar la lista en `apps/api/src/server.ts` cuando se agregan dominios.
2. **Rate limiting**: 200 req/min global. Endpoints con costo computacional alto (IA, file upload) tienen límites más estrictos por usuario.
3. **Webhooks firmados**: todo webhook entrante verifica firma antes de procesar:
   - Stripe: `stripe.webhooks.constructEvent(rawBody, signature, whsec_...)`
   - WhatsApp: `X-Hub-Signature-256` HMAC-SHA256
   - ElevenLabs: Bearer token en Authorization header
4. **Errores sin detalles internos**: en producción, las respuestas de error son genéricas al cliente. Stack traces, queries SQL y paths de filesystem van solo a logs internos.
5. **Health check mínimo**: `GET /health` retorna solo `{ status, app, version, ts }`. Sin información sobre configuración interna.

---

## 8. Logging y Auditoría — Reglas Permanentes

### Lo que SIEMPRE se loggea (en `audit_logs`)
- Acceso a expedientes clínicos (quién, cuándo, qué ID)
- Creación/modificación de pacientes, notas, recetas, lab results
- Cambios de rol y permisos
- Logins exitosos y fallidos
- Generación y descarga de archivos
- Eventos Stripe (webhooks)

### Lo que NUNCA se loggea
- Contraseñas (ni plaintext ni hash)
- Tokens JWT completos (solo `jti` o primeros/últimos 8 chars como referencia)
- Datos de tarjetas de crédito
- Contenido de notas clínicas (loggear que se accedió, no el contenido)
- Headers `Authorization` completos
- `SUPABASE_SERVICE_ROLE_KEY` o cualquier otra clave

### Audit logs son append-only
- Tabla `audit_logs` tiene RLS que bloquea UPDATE y DELETE para `authenticated`
- Solo `service_role` puede insertar; nadie puede modificar ni borrar

---

## 9. Dependencias — Reglas Permanentes

1. **Dependabot activo** con revisiones semanales para npm y GitHub Actions.
2. **`pnpm audit --audit-level=high`** corre en cada PR vía CI.
3. Vulnerabilidades **High/Critical** se resuelven antes del siguiente deploy a producción.
4. **Justificación obligatoria** para cada dependencia nueva agregada a un PR.
5. **`pnpm-lock.yaml` versionado** siempre. Nunca en `.gitignore`.

---

## 10. CI/CD — Pipeline de Seguridad

El archivo `.github/workflows/security.yml` corre en cada PR a `main` y semanalmente:

| Job | Herramienta | Falla si... |
|-----|-------------|-------------|
| `secret-scan` | gitleaks | Encuentra secretos en el historial |
| `dependency-audit` | pnpm audit + Trivy | Hay deps con CVE High/Critical |
| `sast` | GitHub CodeQL | Encuentra patrones de código inseguros |
| `rls-check` | scripts/check-rls.js | Alguna tabla no tiene RLS o políticas |
