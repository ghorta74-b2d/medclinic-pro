import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),

  // Database
  DATABASE_URL: z.string().min(10, 'DATABASE_URL must be a valid connection string'),
  DIRECT_URL: z.string().min(10, 'DIRECT_URL must be a valid connection string').optional(),

  // Supabase
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(20, 'SUPABASE_ANON_KEY too short'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, 'SUPABASE_SERVICE_ROLE_KEY too short'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'STRIPE_SECRET_KEY must start with sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET must start with whsec_'),

  // Resend
  RESEND_API_KEY: z.string().min(10, 'RESEND_API_KEY too short'),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().min(10, 'ANTHROPIC_API_KEY too short'),

  // Internal API secret
  API_SECRET: z.string().min(16, 'API_SECRET must be at least 16 characters'),

  // App URL (used in emails, redirects)
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),

  // Optional — WhatsApp, ElevenLabs, Daily.co
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_WEBHOOK_SECRET: z.string().optional(),
  DAILY_API_KEY: z.string().optional(),

  // RxE — Receta Electrónica
  // HMAC secret for prescription signatures — set in production!
  RXE_SECRET: z.string().min(16).optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
})

function validateEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const missing = result.error.issues.map(i => `  • ${i.path.join('.')}: ${i.message}`)
    console.error('\n[FATAL] Missing or invalid environment variables:\n' + missing.join('\n') + '\n')
    process.exit(1)
  }
  return result.data
}

export const env = validateEnv()
