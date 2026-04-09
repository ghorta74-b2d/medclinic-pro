import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env['SUPABASE_URL'] ?? ''
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[STARTUP] Missing Supabase env vars — SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
}

// Service role client — bypasses RLS (use only server-side)
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseServiceKey || 'placeholder', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Verify and decode a Supabase JWT
export async function verifySupabaseToken(token: string) {
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}
