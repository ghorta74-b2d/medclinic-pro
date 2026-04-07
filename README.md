# MedClinic Pro

Plataforma integral de gestión clínica para consultorios independientes en LATAM. Diseñada para competir con Doctoralia PRO y DrChrono con dos ventajas clave: **agentes de IA conversacionales nativos** (WhatsApp + voz) y **pricing accesible** para el mercado mexicano.

---

## Stack Técnico

| Capa | Tecnología |
|------|------------|
| Monorepo | pnpm workspaces + Turborepo |
| API | Fastify + TypeScript + Prisma ORM |
| Frontend | Next.js 14 App Router + Tailwind + shadcn/ui |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth (magic link) |
| Almacenamiento | Supabase Storage |
| Pagos | Stripe (Payment Links) |
| IA — Voz | ElevenLabs Conversational AI |
| IA — WhatsApp | Meta WhatsApp Business API |
| PDF | @react-pdf/renderer |
| Deploy | Vercel (frontend + API serverless) |

---

## Módulos

| # | Módulo | Estado |
|---|--------|--------|
| 1 | Agenda y citas | ✅ Completo |
| 2 | Expediente Clínico Electrónico (ECE) | ✅ Completo |
| 3 | Recetas médicas digitales | ✅ Completo |
| 4 | Resultados de laboratorio | ✅ Completo |
| 5 | Facturación y cobros | ✅ Completo |
| 6 | Portal del paciente (WhatsApp) | ✅ Completo |
| 7 | Telemedicina (Daily.co) | 🔜 Fase 2 |
| 8 | Visor DICOM | 🔜 Fase 2 |

---

## Estructura del Proyecto

```
medclinic-pro/
├── apps/
│   ├── api/                          # Fastify API (serverless-ready)
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Esquema completo (20 modelos)
│   │   │   └── seed.ts               # Datos demo
│   │   └── src/
│   │       ├── index.ts              # Entry point
│   │       ├── server.ts             # Fastify build + plugins
│   │       ├── lib/
│   │       │   ├── prisma.ts         # Singleton Prisma
│   │       │   ├── supabase.ts       # Supabase service client
│   │       │   └── errors.ts         # Error helpers
│   │       ├── middleware/
│   │       │   ├── auth.ts           # JWT + role guard
│   │       │   └── audit.ts          # Audit log (NOM-004)
│   │       ├── routes/
│   │       │   ├── appointments.ts   # CRUD + availability + booking
│   │       │   ├── patients.ts       # CRUD + search + timeline
│   │       │   ├── clinical-notes.ts # CRUD + sign + amend
│   │       │   ├── prescriptions.ts  # CRUD + PDF + WhatsApp
│   │       │   ├── lab-results.ts    # CRUD + upload + notify
│   │       │   ├── billing.ts        # Invoices + Stripe + payments
│   │       │   └── webhooks/
│   │       │       ├── whatsapp.ts   # Incoming messages handler
│   │       │       ├── elevenlabs.ts # Voice agent tool calls
│   │       │       ├── stripe.ts     # Payment confirmations
│   │       │       └── lab.ts        # Lab results receiver
│   │       └── services/
│   │           ├── whatsapp.ts       # Outbound WA messages
│   │           ├── pdf.ts            # Prescription PDF generation
│   │           ├── stripe.ts         # Payment links
│   │           └── scheduling.ts     # Appointment reminders
│   │
│   └── web/                          # Next.js 14 App Router
│       └── src/
│           ├── app/
│           │   ├── (auth)/login/     # Magic link login
│           │   └── (dashboard)/      # Protected routes
│           │       ├── agenda/       # Daily schedule view
│           │       ├── pacientes/    # Patient list + detail
│           │       ├── expedientes/  # Clinical notes editor
│           │       ├── recetas/      # Prescription builder
│           │       ├── laboratorio/  # Lab results manager
│           │       └── billing/      # Invoices + payments
│           ├── components/
│           │   ├── layout/           # Sidebar, Header
│           │   ├── agenda/           # Calendar, stats, new appt dialog
│           │   ├── patients/         # Patient table, form
│           │   ├── clinical-notes/   # Note editor (SOAP + CIE-10)
│           │   ├── prescriptions/    # Rx builder (medication autocomplete)
│           │   ├── lab-results/      # Upload + viewer
│           │   └── billing/          # Invoice form + payment dialog
│           └── lib/
│               ├── api.ts            # API client
│               └── utils.ts          # Date/currency helpers
│
└── packages/
    └── shared/                       # Types + constants
        └── src/
            ├── types/index.ts        # Domain types shared by API + web
            ├── constants/cie10.ts    # 50+ common CIE-10 diagnoses
            └── constants/medications.ts  # 100+ medications (MX market)
```

---

## Setup

### Prerequisitos

- Node.js 20+
- pnpm 9+
- Cuenta de Supabase (nueva instancia, separada de doctor-calendar)
- Cuenta de Stripe
- WhatsApp Business API (Meta for Developers)
- ElevenLabs (para agente de voz)

### 1. Clonar y configurar

```bash
git clone git@github.com:ghorta74-b2d/medclinic-pro.git
cd medclinic-pro
pnpm install
```

### 2. Variables de entorno

```bash
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
```

Editar ambos archivos con los valores reales. Ver `.env.example` para descripción de cada variable.

**Variables críticas:**

```env
# Supabase — NUEVA instancia (no compartir con doctor-calendar)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres.xxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xxxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_VERIFY_TOKEN=un-token-secreto-que-defines-tú

# ElevenLabs
ELEVENLABS_WEBHOOK_SECRET=...
```

### 3. Base de datos

```bash
# Generar cliente Prisma
pnpm db:generate

# Aplicar esquema a Supabase
pnpm db:push

# Cargar datos demo
pnpm db:seed
```

### 4. Supabase Storage — crear bucket

En el dashboard de Supabase, crear un bucket público llamado `clinical-files`:

```sql
-- En SQL Editor de Supabase:
insert into storage.buckets (id, name, public) values ('clinical-files', 'clinical-files', true);
```

### 5. Row Level Security (RLS)

Aplicar estas políticas en Supabase SQL Editor para cada tabla principal:

```sql
-- Ejemplo para tabla 'patients':
alter table patients enable row level security;

create policy "clinic_isolation" on patients
  using (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id'));
```

> Repetir para: appointments, clinical_notes, prescriptions, lab_results, invoices, doctors.

### 6. Desarrollo local

```bash
# Iniciar API (puerto 3001) y Web (puerto 3000) en paralelo
pnpm dev
```

---

## Configurar Agente ElevenLabs

El agente de voz llama estos endpoints durante las llamadas telefónicas:

| Tool | Endpoint | Descripción |
|------|----------|-------------|
| `get_availability` | `POST /api/webhooks/elevenlabs/get-availability` | Consultar horarios disponibles |
| `book_appointment` | `POST /api/webhooks/elevenlabs/book-appointment` | Crear cita |
| `get_patient_info` | `POST /api/webhooks/elevenlabs/get-patient-info` | Buscar paciente por teléfono |

Configurar en ElevenLabs Dashboard → Agent → Tools:
- URL base: `https://your-api.vercel.app`
- Header de autenticación: `Authorization: Bearer {ELEVENLABS_WEBHOOK_SECRET}`

---

## Configurar WhatsApp Business API

1. En [Meta for Developers](https://developers.facebook.com/), crear una app tipo "Business"
2. Agregar el producto "WhatsApp"
3. Configurar el webhook:
   - URL: `https://your-api.vercel.app/api/webhooks/whatsapp`
   - Verify Token: el valor de `WHATSAPP_VERIFY_TOKEN`
   - Campos suscritos: `messages`

### Keywords que entiende el chatbot

| Keyword | Respuesta |
|---------|-----------|
| "cita", "agendar", "hora" | Próxima cita del paciente |
| "receta", "medicamento" | Última receta (PDF) |
| "resultado", "laboratorio", "estudio" | Último resultado de lab |
| "pago", "saldo", "cobro" | Saldo pendiente + liga de pago |
| Cualquier otro | Menú de ayuda |

---

## Deploy en Vercel

### API

```bash
cd apps/api
vercel deploy

# Configurar variables de entorno en Vercel Dashboard
# Importante: DATABASE_URL debe apuntar al PgBouncer (puerto 6543)
```

### Web

```bash
cd apps/web
vercel deploy

# NEXT_PUBLIC_API_URL = URL del API deploy
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Cron de recordatorios

Crear en `vercel.json` del API:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

Y agregar el endpoint en la API:

```typescript
// apps/api/src/routes/cron.ts
server.get('/api/cron/reminders', async (req, reply) => {
  // Verify Vercel cron secret
  await sendDueReminders()
  return reply.send({ ok: true })
})
```

---

## Cumplimiento normativo

### NOM-004-SSA3-2012 (Expediente Clínico)

- ✅ Audit log append-only en toda operación sobre expedientes clínicos
- ✅ Firma electrónica de notas (timestamp + doctorId)
- ✅ Sistema de enmiendas (amendment trail) — las notas firmadas no se editan, se crean notas nuevas con referencia a la original
- ✅ Identificación del responsable en cada nota
- ✅ Fecha y hora de cada intervención
- ✅ Diagnósticos con código CIE-10

### LFPDPPP (Datos Personales)

- ✅ Aviso de privacidad con timestamp de aceptación
- ✅ Consentimiento informado para datos sensibles (salud)
- ✅ Campos `privacyConsentAt` y `dataConsentAt` en `Patient`
- ✅ RLS por clínica — datos nunca accesibles entre tenants

---

## API Reference

### Base URL
- Desarrollo: `http://localhost:3001`
- Producción: `https://api.medclinicpro.app`

### Autenticación
Todas las rutas requieren header:
```
Authorization: Bearer {supabase_access_token}
```

### Rutas principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/appointments` | Listar citas (filtrar por fecha, doctor, paciente) |
| GET | `/api/appointments/availability` | Slots disponibles de un doctor en una fecha |
| POST | `/api/appointments` | Crear cita |
| PATCH | `/api/appointments/:id` | Actualizar cita / cancelar |
| GET | `/api/patients` | Listar + buscar pacientes |
| GET | `/api/patients/:id/timeline` | Historial clínico completo |
| POST | `/api/patients` | Registrar paciente |
| POST | `/api/clinical-notes` | Crear nota clínica |
| POST | `/api/clinical-notes/:id/sign` | Firmar nota (NOM-004) |
| POST | `/api/prescriptions` | Crear receta |
| POST | `/api/prescriptions/:id/generate-pdf` | Generar PDF |
| POST | `/api/prescriptions/:id/send-whatsapp` | Enviar por WhatsApp |
| POST | `/api/lab-results/:id/upload` | Subir archivo (multipart) |
| POST | `/api/lab-results/:id/notify` | Notificar paciente por WhatsApp |
| POST | `/api/billing/invoices` | Crear factura |
| POST | `/api/billing/invoices/:id/payment-link` | Crear liga Stripe + enviar WA |
| POST | `/api/billing/invoices/:id/payments` | Registrar pago |
| GET | `/api/billing/dashboard` | Estadísticas de ingresos |

---

## Diferencias vs doctor-calendar (proyecto existente)

| Aspecto | doctor-calendar | medclinic-pro |
|---------|-----------------|---------------|
| Alcance | Solo agendamiento | Suite clínica completa |
| Instancia DB | Supabase original | Nueva instancia separada |
| ORM | Sin ORM (Supabase SDK directo) | Prisma |
| Framework API | Express / Vercel Functions | Fastify |
| Frontend | Sin backoffice | Next.js 14 backoffice completo |
| EHR | ✗ | ✅ |
| Recetas | ✗ | ✅ con PDF |
| Lab Results | ✗ | ✅ con webhook de labs |
| Billing | ✗ | ✅ con Stripe |
| Audit Log | ✗ | ✅ NOM-004 |
| Multi-doctor | ✗ | ✅ |
| Multi-tenant | ✗ | ✅ via RLS |

> **El repo `doctor-calendar` NO fue modificado.** Los dos proyectos son completamente independientes.
