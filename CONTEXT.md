# MedClinic Pro — Contexto completo del proyecto

> Documento de referencia para agentes externos. Fecha: 2026-04-27. Commit actual: `ddf966d` (main).

---

## 1. ¿Qué es?

SaaS clínico para LATAM (México primario). Permite a clínicas privadas gestionar pacientes, agenda, expedientes clínicos, recetas, resultados de laboratorio y cobros — todo en una sola plataforma. Cumple con **NOM-004-SSA3-2012** (expediente clínico electrónico con firma digital e historial de enmiendas).

**Audiencia**: clínicas privadas pequeñas y medianas, doctores independientes, personal administrativo.

---

## 2. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Backend | Fastify 4 + Prisma 5 + Zod (Node 20, TypeScript ESM) |
| Base de datos | PostgreSQL vía Supabase |
| Auth | Supabase Auth (magic link + MFA TOTP) |
| Frontend | Next.js 14 App Router (React 18, TypeScript) |
| Estilos | Tailwind CSS 3 + shadcn/ui (CVA + Radix UI) |
| Pagos | Stripe |
| Mensajería | WhatsApp Business API (Meta) |
| IA | Anthropic Claude API (consulta IA + resumen lab) |
| Telemedicina | Daily.co |
| Voz IA | ElevenLabs (agente de voz) |
| Deploy web | Vercel (auto-deploy en push a `main`) |
| Deploy API | Vercel Serverless / Render / Fly.io |
| CI/CD | GitHub Actions |

---

## 3. Estructura de carpetas

```
medclinic-pro/
├── apps/
│   ├── api/                  # Backend Fastify
│   │   ├── src/
│   │   │   ├── index.ts      # Entry point (IIFE — no top-level await)
│   │   │   ├── server.ts     # Setup Fastify
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts   # Supabase JWT → request.authUser
│   │   │   │   └── audit.ts  # NOM-004 audit logging
│   │   │   ├── routes/
│   │   │   │   ├── appointments.ts
│   │   │   │   ├── patients.ts
│   │   │   │   ├── clinical-notes.ts
│   │   │   │   ├── prescriptions.ts
│   │   │   │   ├── lab-results.ts
│   │   │   │   ├── consulta-ia.ts
│   │   │   │   ├── billing.ts
│   │   │   │   ├── configuracion.ts
│   │   │   │   ├── catalogs.ts
│   │   │   │   ├── notifications.ts
│   │   │   │   └── superadmin.ts
│   │   │   ├── routes/webhooks/
│   │   │   │   ├── stripe.ts
│   │   │   │   ├── whatsapp.ts
│   │   │   │   ├── elevenlabs.ts
│   │   │   │   └── lab.ts
│   │   │   ├── services/
│   │   │   │   ├── stripe.ts
│   │   │   │   ├── whatsapp.ts
│   │   │   │   ├── pdf.ts          # @react-pdf/renderer
│   │   │   │   └── scheduling.ts
│   │   │   ├── lib/
│   │   │   │   ├── prisma.ts       # Singleton Prisma client
│   │   │   │   ├── supabase.ts
│   │   │   │   └── errors.ts
│   │   │   └── tests/
│   │   │       ├── patients.test.ts
│   │   │       ├── appointments.test.ts
│   │   │       ├── auth-roles.test.ts
│   │   │       └── helpers.ts
│   │   └── prisma/
│   │       ├── schema.prisma       # 22 modelos
│   │       ├── seed.ts
│   │       └── seed-catalogs.ts
│   │
│   └── web/                  # Frontend Next.js
│       └── src/
│           ├── app/
│           │   ├── landing/page.tsx
│           │   ├── (auth)/login/page.tsx
│           │   ├── mfa-setup/page.tsx
│           │   ├── auth/invite/page.tsx
│           │   └── (dashboard)/
│           │       ├── layout.tsx          # AppShell + guard sesión
│           │       ├── dashboard/page.tsx
│           │       ├── agenda/page.tsx
│           │       ├── agenda/[id]/page.tsx
│           │       ├── pacientes/page.tsx
│           │       ├── pacientes/[id]/page.tsx
│           │       ├── expediente/page.tsx
│           │       ├── expedientes/nuevo/page.tsx
│           │       ├── recetas/page.tsx
│           │       ├── recetas/[id]/page.tsx
│           │       ├── laboratorio/page.tsx
│           │       ├── cobros/page.tsx
│           │       ├── billing/page.tsx
│           │       ├── configuracion/page.tsx
│           │       ├── consulta-ia/page.tsx
│           │       └── asistente-ia/page.tsx
│           └── components/
│               ├── layout/
│               │   ├── app-shell.tsx       # flex sidebar+main, font-sf
│               │   ├── sidebar-nav.tsx     # nav GENERAL/OPERACIONES, role-based
│               │   ├── topbar.tsx          # búsqueda + ThemeToggle + avatar
│               │   └── header.tsx
│               ├── theme/
│               │   ├── theme-provider.tsx  # next-themes, dark default
│               │   └── theme-toggle.tsx    # sol/luna button
│               ├── ui/                     # 17 primitivos shadcn/CVA
│               │   ├── button.tsx, card.tsx, input.tsx, label.tsx
│               │   ├── badge.tsx, dialog.tsx, dropdown-menu.tsx
│               │   ├── select.tsx, tabs.tsx, switch.tsx, avatar.tsx
│               │   ├── separator.tsx, progress.tsx, skeleton.tsx
│               │   ├── toast.tsx, toaster.tsx, status-dot.tsx
│               ├── agenda/
│               │   ├── calendar-view.tsx, week-view.tsx, month-view.tsx
│               │   ├── day-stats.tsx, new-appointment-dialog.tsx
│               ├── patients/new-patient-dialog.tsx
│               ├── clinical-notes/note-editor.tsx
│               ├── prescriptions/prescription-builder.tsx
│               ├── lab-results/new-lab-result-dialog.tsx
│               └── billing/
│                   ├── new-invoice-dialog.tsx
│                   ├── invoice-detail-dialog.tsx
│                   └── record-payment-dialog.tsx
│
├── packages/
│   └── shared/src/
│       ├── types/index.ts    # Todos los tipos TS compartidos
│       └── constants/        # CIE-10 codes, catálogo medicamentos
│
├── scripts/
│   └── set-github-secrets.sh
│
├── .github/workflows/ci.yml
├── turbo.json
├── pnpm-workspace.yaml
└── .env.example
```

---

## 4. Base de datos — Prisma Schema (22 modelos)

### Enums

```
Role:              SUPER_ADMIN | ADMIN | DOCTOR | STAFF | PATIENT
AppointmentStatus: SCHEDULED | CONFIRMED | CHECKED_IN | IN_PROGRESS | COMPLETED | CANCELLED | NO_SHOW
AppointmentMode:   IN_PERSON | TELEMEDICINE | HOME_VISIT
Gender:            MALE | FEMALE | OTHER | PREFER_NOT_TO_SAY
BloodType:         A_POS | A_NEG | B_POS | B_NEG | AB_POS | AB_NEG | O_POS | O_NEG | UNKNOWN
NoteStatus:        DRAFT | SIGNED | AMENDED
LabResultStatus:   PENDING | RECEIVED | REVIEWED | NOTIFIED
LabResultCategory: LABORATORY | IMAGING | PATHOLOGY | CARDIOLOGY | ENDOSCOPY | OTHER
InvoiceStatus:     DRAFT | SENT | PAID | PARTIALLY_PAID | OVERDUE | CANCELLED | REFUNDED
PaymentMethod:     CASH | CARD | TRANSFER | INSURANCE | STRIPE_ONLINE
PrescriptionStatus: ACTIVE | DISPENSED | CANCELLED | EXPIRED
AuditAction:       CREATE | READ | UPDATE | DELETE | SIGN | AMEND | EXPORT | LOGIN | LOGOUT
```

### Modelos clave

#### `Clinic`
Entidad raíz multi-tenant. Todo dato filtra por `clinicId`.
Campos notables: `waPhoneNumberId`, `waAccessToken` (WhatsApp), `stripeAccountId`, `planId`, `planExpiresAt`.

#### `Doctor`
Pertenece a una `Clinic`. `authUserId` → Supabase Auth. `scheduleConfig` (JSON) define bloques de disponibilidad. `signatureUrl` para prescripciones firmadas.

#### `Patient`
`clinicId` + `phone` único. CURP, RFC, consentimientos LFPDPPP (`privacyConsentAt`, `dataConsentAt`). Arrays: `allergies[]`, `chronicConditions[]`, `currentMedications[]`, `surgicalHistory[]`.

#### `Appointment`
`startsAt`/`endsAt`, status workflow completo. `checkinCompletedAt`, recordatorios WhatsApp (`reminder24hSentAt`, `reminder1hSentAt`).

#### `ClinicalNote` (expediente)
SOAP note. `diagnoses` (JSON array CIE-10). `status`: DRAFT → SIGNED → AMENDED. Una vez firmada, es **inmutable** — solo se puede enmendar via nueva nota con `amendedFromId`. `isAiAssisted`, `aiSummary`, `transcriptText` para consulta IA con Claude.

#### `VitalSigns`
1:1 con `ClinicalNote`. Peso, talla, IMC, presión, FC, temperatura, SpO2, glucosa.

#### `Prescription` + `PrescriptionItem`
Receta digital con PDF (`pdfUrl`). Envío vía WhatsApp (`sentViaWhatsApp`). Items con medicamento, dosis, vía, frecuencia, duración.

#### `LabResult`
Resultado de laboratorio. Puede llegar vía webhook (`sourceWebhook`, `webhookPayload`). `llmSummary` generado por Claude. Soft delete (`deletedAt`).

#### `Invoice` + `InvoiceItem` + `PaymentRecord`
Facturación. `stripePaymentLinkId/Url` para cobro online. `cfdiUuid`, `cfdiXmlUrl`, `cfdiPdfUrl` para facturas fiscales MX.

#### `AuditLog`
Registro NOM-004. Guarda `previousValue` y `newValue` como JSON para todo cambio sensible.

#### `TelehealthSession`
Sesión Daily.co. `hostToken`, `patientToken`, `roomUrl`.

---

## 5. Auth y RBAC

```
Supabase Auth → JWT → middleware auth.ts → request.authUser
  {
    authUserId: string,  // Supabase user ID
    clinicId:   string,  // Multi-tenant guard
    role:       Role,    // ADMIN | DOCTOR | STAFF | SUPER_ADMIN
    doctorId?:  string   // Solo si role === DOCTOR
  }
```

**Middlewares de ruta**:
- `requireDoctor` — solo DOCTOR
- `requireStaff` — DOCTOR o STAFF
- `requireAdmin` — solo ADMIN
- `requireSuperAdmin` — solo SUPER_ADMIN

**Regla crítica**: toda query de BD usa `WHERE clinicId = request.authUser.clinicId`. Nunca confiar en clinicId del cliente.

**MFA**: TOTP obligatorio para ADMIN y DOCTOR. Banner en app hasta configurar. Setup en `/mfa-setup`.

---

## 6. Rutas API

Base URL: `$API_URL/api/`

| Recurso | Endpoints principales |
|---|---|
| `/appointments` | GET list, POST create, PATCH /:id/status |
| `/patients` | GET list, GET /:id, POST create, PATCH /:id |
| `/clinical-notes` | GET list, POST create, POST /:id/sign, POST /:id/amend |
| `/prescriptions` | GET list, POST create, POST /:id/send-whatsapp |
| `/lab-results` | GET list, POST create, PATCH /:id/review |
| `/consulta-ia` | POST (consulta Claude con contexto del paciente) |
| `/billing` | GET invoices, POST create, PATCH /:id/status |
| `/configuracion` | GET clinic config, PATCH update |
| `/catalogs` | GET CIE-10 codes, GET medications |
| `/notifications` | GET list, PATCH /:id/read |
| `/superadmin` | Gestión de clínicas (solo SUPER_ADMIN) |
| `/webhooks/stripe` | Stripe payment events |
| `/webhooks/whatsapp` | Mensajes entrantes WhatsApp |
| `/webhooks/elevenlabs` | Eventos agente de voz |
| `/webhooks/lab` | Resultados de laboratorio externos |

---

## 7. Frontend — páginas

Toda la zona autenticada vive en `(dashboard)/` con guard de sesión en `layout.tsx`.

| Ruta | Qué hace |
|---|---|
| `/dashboard` | KPIs (pacientes hoy, ingresos, citas), gráfica 7 días, acciones rápidas |
| `/agenda` | Calendario semanal/mensual de citas. Drag & drop, filtro por doctor |
| `/agenda/[id]` | Detalle de cita individual |
| `/pacientes` | Lista de pacientes con búsqueda |
| `/pacientes/[id]` | Expediente completo: historial, notas SOAP, recetas, labs, cobros |
| `/expediente` | Expediente médico vista detallada |
| `/expedientes/nuevo` | Crear nuevo expediente |
| `/recetas` | Lista de recetas |
| `/recetas/[id]` | Detalle de receta + PDF preview |
| `/laboratorio` | Resultados de laboratorio + carga manual |
| `/cobros` | Gestión de cobros, gráficas de ingresos |
| `/billing` | Facturas y pagos |
| `/configuracion` | Ajustes de clínica, usuarios, WhatsApp, Stripe |
| `/consulta-ia` | Consulta asistida por IA (Claude) |
| `/asistente-ia` | Asistente de voz (ElevenLabs) |

**Sidebar navigation** (role-based):

```
GENERAL
  Dashboard
  Agenda
  Pacientes

OPERACIONES
  Cobros
  Telemedicina
  Consulta con IA

  [pie]
  Configuración
  Cerrar sesión
```

---

## 8. Design system

### Paleta de colores (CSS variables, HSL)

Dark mode es el **default**. Toggle sol/luna persiste en localStorage (`medclinic-theme`).

| Variable | Dark | Light | Uso |
|---|---|---|---|
| `--background` | `222 22% 7%` | `210 20% 98%` | Fondo general |
| `--foreground` | `210 20% 96%` | `222 22% 10%` | Texto principal |
| `--card` | `222 18% 10%` | `0 0% 100%` | Tarjetas |
| `--primary` | `205 90% 55%` | `205 90% 45%` | Azul médico |
| `--success` | `152 60% 45%` | `152 60% 35%` | Verde clínico |
| `--warning` | `38 92% 55%` | `38 92% 45%` | Naranja/amarillo |
| `--destructive` | `0 72% 55%` | `0 72% 50%` | Rojo |
| `--muted` | `222 14% 18%` | `210 14% 89%` | Fondos secundarios |
| `--sidebar` | `222 24% 6%` | `222 20% 94%` | Sidebar |
| `--border` | `222 14% 18%` | `214 14% 85%` | Bordes |

### Tokens Tailwind

Clases usadas en el código:
```
bg-background, bg-card, bg-muted, bg-sidebar
text-foreground, text-muted-foreground
text-primary, text-success, text-warning, text-destructive
bg-primary/10, bg-success/10, bg-warning/10, bg-destructive/10
border-border, border-primary/30, border-success/30
```

### Tipografía

- **SF Pro** (`-apple-system, BlinkMacSystemFont`) — font sistema en macOS/iOS, activa via clase `font-sf`
- **Plus Jakarta Sans** (`var(--font-jakarta)`) — fallback en otros OS

### Componentes

17 primitivos en `components/ui/` construidos con **CVA + Radix UI**:
`Button` (variantes: default, secondary, ghost, outline, destructive, link), `Card`, `Input`, `Label`, `Badge` (default, success, warning, destructive, outline), `Dialog`, `DropdownMenu`, `Select`, `Tabs`, `Switch`, `Avatar`, `Separator`, `Progress`, `Skeleton`, `Toast`, `StatusDot`.

---

## 9. Variables de entorno

### API (`apps/api/.env`)

```bash
# Supabase
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# WhatsApp
WHATSAPP_API_VERSION=v19.0
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_VERIFY_TOKEN=...

# ElevenLabs
ELEVENLABS_API_KEY=...
ELEVENLABS_AGENT_ID=...
ELEVENLABS_WEBHOOK_SECRET=...

# Daily.co
DAILY_API_KEY=...

# App
API_SECRET=...
NODE_ENV=production
```

### Web (`apps/web/.env.local`)

```bash
NEXT_PUBLIC_APP_URL=https://app.medclinic.pro
API_URL=https://api.medclinic.pro
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## 10. CI/CD

### GitHub Actions (`.github/workflows/ci.yml`)

**Trigger**: push/PR a `main` o `staging`

**Jobs**:
1. **lint-typecheck** — pnpm install → prisma generate → typecheck API → typecheck web → lint web
2. **test** — pnpm install → prisma generate → vitest (apps/api)

**Secrets requeridos en GitHub**:
`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `ANTHROPIC_API_KEY`

**Script para configurar secrets**:
```bash
export GH_TOKEN=ghp_...
bash scripts/set-github-secrets.sh
```

### Deploy

- **Web**: Vercel detecta push a `main` y despliega automáticamente.
- **Staging**: `git push origin main:staging`
- **API**: configurado en Vercel (`vercel.json` en `apps/api/`)

---

## 11. Comandos de desarrollo

```bash
# Setup
pnpm install
pnpm --filter api prisma generate   # OBLIGATORIO antes de cualquier typecheck

# Dev local
pnpm dev                             # web (3000) + api en paralelo

# Verificar
pnpm --filter api typecheck
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter api test

# Base de datos
pnpm db:migrate                      # Crear migración
pnpm db:push                         # Push schema directo (dev)
pnpm db:seed                         # Poblar datos iniciales
pnpm db:studio                       # Prisma Studio UI

# Deploy
git push origin main                 # Dispara Vercel + CI
git push origin main:staging         # Promover a staging
```

---

## 12. Integraciones externas

### Supabase
- **Auth**: magic link + TOTP MFA. JWT verificado en middleware API.
- **Storage**: PDFs de recetas, facturas, documentos de paciente.
- **Realtime**: (no implementado aún, reservado para notificaciones push).

### Stripe
- Cobro de servicios médicos. Payment Links enviados por WhatsApp.
- Webhook: `payment_intent.succeeded`, `payment_link.completed`.
- Connect (futuro): pagos directos a cuentas de clínicas.

### WhatsApp Business API (Meta)
- Envío de recordatorios de cita (24h y 1h antes).
- Envío de PDF de recetas.
- Envío de links de pago Stripe.
- Recepción de mensajes (webhook).

### Anthropic Claude
- Consulta IA: el médico dicta la consulta, Claude estructura la nota SOAP y sugiere diagnósticos CIE-10.
- Resumen lab: Claude interpreta resultados de laboratorio.
- Modelo usado: configurado en `routes/consulta-ia.ts`.

### ElevenLabs
- Agente de voz para llamadas outbound (recordatorios, confirmación citas).
- Webhook recibe transcripción y resultado de llamada.

### Daily.co
- Salas de telemedicina. Host token para médico, patient token para paciente.
- Grabación opcional con consentimiento.

---

## 13. Cumplimiento regulatorio

### NOM-004-SSA3-2012 (Expediente clínico electrónico MX)

1. **Notas firmadas son inmutables** — `ClinicalNote.status: SIGNED`. No se pueden editar.
2. **Enmiendas** — Nueva nota con `amendedFromId` → crea cadena auditable.
3. **Una sola enmienda draft activa** por nota original.
4. **AuditLog** — Todo `CREATE`, `UPDATE`, `DELETE`, `READ` (notas sensibles), `SIGN`, `AMEND` se registra con `previousValue` y `newValue`.
5. **Firma electrónica** — `signedAt`, `signedBy` en `ClinicalNote`.

### LFPDPPP (privacidad MX)

- `Patient.privacyConsentAt` — fecha de consentimiento de aviso de privacidad.
- `Patient.dataConsentAt` — fecha de consentimiento de uso de datos.
- UI ARCO (Acceso, Rectificación, Cancelación, Oposición) — **pendiente de implementar**.

---

## 14. Pendientes (roadmap)

| Prioridad | Item |
|---|---|
| 🔴 URGENTE | Verificar CI verde en commit `414a0ca` |
| 🔴 URGENTE | Configurar GitHub Secrets (`scripts/set-github-secrets.sh`) |
| 🟡 PRONTO | Sync branch staging con main |
| 🟡 PRONTO | Supabase staging DB aislada (hoy usa prod) |
| 🟢 SIGUIENTE | Fase 5 — FHIR R4 (`Patient`, `Encounter`, `MedicationRequest`) |
| 🟢 SIGUIENTE | UI ARCO (derechos LFPDPPP) |
| 🟢 SIGUIENTE | OAuth2 SMART-on-FHIR en `/api/fhir/v4/` |
| 🟢 FUTURO | Tests: ampliar cobertura a consulta-ia, prescriptions, lab webhook |
| 🟢 FUTURO | Stripe Connect para pagos directos a clínicas |
| 🟢 FUTURO | Notificaciones realtime (Supabase Realtime) |

---

## 15. Convenciones de código

### TypeScript / Zod + Prisma

```typescript
// JSON fields en Zod → SIEMPRE z.any(), NUNCA z.unknown()
metadata: z.record(z.any()).optional()

// Spreads condicionales en prisma.X.update() → cast al final
await prisma.patient.update({
  where: { id },
  data: {
    ...(x ? { x } : {}),
  } as Parameters<typeof prisma.patient.update>[0]['data'],
})
```

### API tsconfig

- `"module": "CommonJS"` + `"moduleResolution": "node"` — NO cambiar a `bundler`
- `"include": ["src/**/*"]` — sin `prisma/**/*` (rompe rootDir)
- Top-level await envuelto en IIFE: `void (async () => { ... })()`

### Estilos Tailwind (área autenticada)

Migración de hardcoded → tokens:
```
bg-white       → bg-card
bg-gray-50     → bg-muted/50
text-gray-500  → text-muted-foreground
text-gray-900  → text-foreground
bg-blue-500    → bg-primary
text-green-600 → text-success
border-gray-200 → border-border
```

### `cn()` helper

```typescript
import { cn } from '@/lib/utils'
// Usado en todos los componentes para merge de clases Tailwind
```

---

## 16. Gotchas conocidos

1. **`pnpm prisma generate` es obligatorio** antes de cualquier typecheck. Los tipos generados están en `.gitignore`.
2. **`git push` desde Bash** se cuelga — el credential helper (GitHub Desktop) requiere GUI. Usar terminal interactiva o GitHub Desktop.
3. **Loose git objects** — si el repo acumula >2000 objetos sueltos, `git push` se cuelga en "Counting objects". Solución: `git gc --prune=now`.
4. **next-themes**: `defaultTheme="dark"`, `attribute="class"`, `storageKey="medclinic-theme"`. Cambiar cualquiera rompe persistencia del toggle.
5. **Sidebar usa `bg-sidebar`** (no `bg-background`) — necesario para contraste visual en light mode.
6. **`sessionCache.clear()` en logout** de `sidebar-nav.tsx` — crítico para limpiar sesión de Supabase. No eliminar.
7. **Multi-tenant**: toda query de BD debe filtrar por `clinicId = request.authUser.clinicId`.
8. **MFA banner**: aparece en toda la app para ADMIN/DOCTOR sin TOTP configurado — es intencional.

---

*Generado el 2026-04-27. Commit de referencia: `ddf966d` (branch main).*
