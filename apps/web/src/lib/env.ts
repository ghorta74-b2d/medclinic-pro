const REQUIRED_PUBLIC_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_API_URL',
] as const

function validateWebEnv() {
  const missing = REQUIRED_PUBLIC_VARS.filter(
    key => !process.env[key] || process.env[key]!.trim() === ''
  )

  if (missing.length > 0) {
    throw new Error(
      '[FATAL] Missing required public environment variables:\n' +
      missing.map(k => `  • ${k}`).join('\n')
    )
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL!,
  }
}

export const webEnv = validateWebEnv()
