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

// ── Storage signed URLs (clinical-files bucket is private) ────────────────────

const CLINICAL_FILES_BUCKET = 'clinical-files'

/**
 * Extracts the bucket-relative path from a legacy full public URL or returns
 * the value unchanged if it is already a relative path.
 */
function toStoragePath(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('https://')) {
    // Legacy public URL: extract path after "/clinical-files/"
    const marker = `/${CLINICAL_FILES_BUCKET}/`
    const idx = pathOrUrl.indexOf(marker)
    if (idx !== -1) return pathOrUrl.slice(idx + marker.length)
    // Alternate Supabase storage public URL pattern
    const altMarker = '/object/public/'
    const altIdx = pathOrUrl.indexOf(altMarker)
    if (altIdx !== -1) {
      const afterBucket = pathOrUrl.slice(altIdx + altMarker.length)
      const slashIdx = afterBucket.indexOf('/')
      return slashIdx !== -1 ? afterBucket.slice(slashIdx + 1) : afterBucket
    }
    return pathOrUrl // Unrecognised URL — return as-is
  }
  return pathOrUrl
}

/**
 * Returns a signed URL for a single file in the clinical-files bucket.
 * Accepts either a bucket-relative path or a legacy public URL.
 * Falls back to the original value on error.
 */
export async function getSignedFileUrl(pathOrUrl: string, expiresInSeconds = 3600): Promise<string> {
  const path = toStoragePath(pathOrUrl)
  const { data, error } = await supabase.storage
    .from(CLINICAL_FILES_BUCKET)
    .createSignedUrl(path, expiresInSeconds)
  if (error || !data?.signedUrl) return pathOrUrl
  return data.signedUrl
}

/**
 * Batch-signs multiple file paths/URLs in a single Storage API call.
 * Returns a Map from original value → signed URL.
 */
export async function getSignedFileUrls(
  pathsOrUrls: string[],
  expiresInSeconds = 3600,
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const valid = pathsOrUrls.filter(Boolean)
  if (valid.length === 0) return result

  const paths = valid.map(toStoragePath)

  const { data, error } = await supabase.storage
    .from(CLINICAL_FILES_BUCKET)
    .createSignedUrls(paths, expiresInSeconds)

  if (error || !data) {
    valid.forEach(p => result.set(p, p))
    return result
  }

  data.forEach((item, i) => {
    result.set(valid[i]!, item.signedUrl ?? valid[i]!)
  })
  return result
}
