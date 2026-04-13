import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import compress from '@fastify/compress'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'

// Routes
import { appointmentsRoutes } from './routes/appointments.js'
import { patientsRoutes } from './routes/patients.js'
import { clinicalNotesRoutes } from './routes/clinical-notes.js'
import { prescriptionsRoutes } from './routes/prescriptions.js'
import { labResultsRoutes } from './routes/lab-results.js'
import { billingRoutes } from './routes/billing.js'
import { configuracionRoutes } from './routes/configuracion.js'
import { superadminRoutes } from './routes/superadmin.js'
import { webhookWhatsapp } from './routes/webhooks/whatsapp.js'
import { webhookElevenLabs } from './routes/webhooks/elevenlabs.js'
import { webhookStripe } from './routes/webhooks/stripe.js'
import { webhookLab } from './routes/webhooks/lab.js'

export async function buildServer() {
  const server = Fastify({
    logger: {
      level: process.env['NODE_ENV'] === 'production' ? 'warn' : 'info',
    },
    trustProxy: true,
  })

  // ── Plugins ──────────────────────────────────────────────
  await server.register(helmet, {
    contentSecurityPolicy: false, // API only, no HTML
  })

  // Gzip/Brotli compression — reduces JSON payload size by 60-80%
  await server.register(compress, { global: true })

  const allowedOrigins = [
    process.env['NEXT_PUBLIC_APP_URL'],
    'http://localhost:3000',
    'https://medclinic-web.vercel.app',
    'https://medclinic-web-ghorta74-6617s-projects.vercel.app',
  ].filter(Boolean) as string[]

  await server.register(cors, {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.some(o => origin === o || origin.startsWith('https://medclinic-web'))) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'), false)
      }
    },
    credentials: true,
  })

  await server.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  })

  await server.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB for lab result PDFs
    },
  })

  // ── Health check ─────────────────────────────────────────
  server.get('/health', async () => ({
    status: 'ok',
    ts: new Date().toISOString(),
  }))

  // ── API Routes ───────────────────────────────────────────
  await server.register(appointmentsRoutes, { prefix: '/api/appointments' })
  await server.register(patientsRoutes, { prefix: '/api/patients' })
  await server.register(clinicalNotesRoutes, { prefix: '/api/clinical-notes' })
  await server.register(prescriptionsRoutes, { prefix: '/api/prescriptions' })
  await server.register(labResultsRoutes, { prefix: '/api/lab-results' })
  await server.register(billingRoutes, { prefix: '/api/billing' })
  await server.register(configuracionRoutes, { prefix: '/api/configuracion' })
  await server.register(superadminRoutes, { prefix: '/api/superadmin' })

  // ── Webhooks (no auth — verified by signature) ───────────
  await server.register(webhookWhatsapp, { prefix: '/api/webhooks/whatsapp' })
  await server.register(webhookElevenLabs, { prefix: '/api/webhooks/elevenlabs' })
  await server.register(webhookStripe, { prefix: '/api/webhooks/stripe' })
  await server.register(webhookLab, { prefix: '/api/webhooks/lab' })

  return server
}
