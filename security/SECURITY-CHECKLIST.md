# Mediaclinic — Security Checklist Pre-Merge

Corre este checklist antes de cada merge a `main`. Marca cada ítem.

---

## Secrets & Environment Variables

- [ ] No hay credenciales, tokens ni passwords hardcodeados en el código nuevo
- [ ] No hay archivos `.env` ni `.env.local` en el diff (solo `.env.example`)
- [ ] Toda variable nueva está en `apps/api/src/lib/env.ts` (schema Zod) y en `.env.example`
- [ ] Variables `NEXT_PUBLIC_*` solo contienen valores seguros para exponer al cliente
- [ ] `SUPABASE_SERVICE_ROLE_KEY` no aparece en ningún archivo del frontend

## Input Validation

- [ ] Todo nuevo endpoint API valida el body con `schema.safeParse(request.body)`
- [ ] Todos los strings tienen `.max(N)` definido
- [ ] Los IDs en path params son validados como UUID o formato esperado
- [ ] No hay `request.body as SomeType` sin validación runtime previa

## Autenticación & Autorización

- [ ] Nuevos endpoints tienen el preHandler correcto (`requireStaff`, `requireDoctor`, `requireAdmin`)
- [ ] Queries de BD filtran por `clinicId: request.authUser.clinicId` (tenant isolation)
- [ ] No hay `findUnique({ where: { id } })` sin filtro de tenant en endpoints autenticados
- [ ] Endpoints admin no son accesibles por roles inferiores

## Base de Datos & RLS

- [ ] Nuevas tablas tienen `ENABLE ROW LEVEL SECURITY` en la migración
- [ ] Nuevas tablas con `clinicId` tienen políticas para SELECT, INSERT, UPDATE, DELETE
- [ ] No hay `prisma.$queryRawUnsafe()` con concatenación de strings del usuario
- [ ] Soft deletes usados donde aplica (no `prisma.labResult.delete()`)

## File Upload

- [ ] Nuevos uploads validan MIME por magic bytes, no por `data.mimetype` del cliente
- [ ] Nombre de archivo generado por el servidor, no tomado del cliente
- [ ] Bucket destino es privado (no `public: true`)
- [ ] URLs de archivos son firmadas con expiración ≤ 5 minutos

## API Security

- [ ] Nuevos dominios de frontend agregados explícitamente a la lista de CORS en `server.ts`
- [ ] Nuevos webhooks verifican firma antes de procesar
- [ ] Errores en producción retornan mensajes genéricos (sin stack traces, sin paths internos)

## Frontend

- [ ] No hay `dangerouslySetInnerHTML` nuevo sin sanitización con DOMPurify
- [ ] Los `<a target="_blank">` tienen `rel="noopener noreferrer"`
- [ ] No se almacenan tokens o PII en `localStorage`

## Logging

- [ ] Nuevas acciones sensibles tienen `auditLog()` call
- [ ] Los logs nuevos no incluyen passwords, tokens completos ni datos de tarjeta
- [ ] Errores loggean el detalle completo internamente pero no lo exponen al cliente

## Dependencias

- [ ] `pnpm audit --audit-level=high` no reporta vulnerabilidades nuevas
- [ ] Dependencias nuevas tienen justificación en el PR
- [ ] `pnpm-lock.yaml` está actualizado y commiteado

## Pre-merge automated checks (CI)

- [ ] `secret-scan` (gitleaks) ✅
- [ ] `dependency-audit` (pnpm audit + Trivy) ✅
- [ ] `sast` (CodeQL) ✅
- [ ] `rls-check` (check-rls.js) ✅
- [ ] `pnpm build` (web + api) ✅
- [ ] `pnpm lint` ✅
