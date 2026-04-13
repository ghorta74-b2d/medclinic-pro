// API client for the MedClinic Pro backend

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

// Singleton Supabase client — import and instantiate only once per page load
type BrowserClient = Awaited<ReturnType<typeof import('@supabase/ssr')['createBrowserClient']>>
let _clientPromise: Promise<BrowserClient> | null = null

function getSupabaseClient(): Promise<BrowserClient> | null {
  if (typeof window === 'undefined') return null
  if (!_clientPromise) {
    _clientPromise = import('@supabase/ssr').then(({ createBrowserClient }) =>
      createBrowserClient(
        process.env['NEXT_PUBLIC_SUPABASE_URL']!,
        process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
      )
    )
  }
  return _clientPromise
}

// Token cache — avoid calling getSession() on every request (it's slow)
let _tokenCache: { token: string; expiresAt: number } | null = null

// Short-lived in-memory cache for frequently read, rarely changed data
// Keyed by URL — cleared on mutations that could invalidate them
const _responseCache = new Map<string, { data: unknown; expiresAt: number }>()

const CACHE_TTL: Record<string, number> = {
  '/api/configuracion/doctors':   5 * 60 * 1000, // 5 min — doctor list rarely changes
  '/api/appointments/types':     10 * 60 * 1000, // 10 min — appointment types change rarely
  '/api/billing/services':        5 * 60 * 1000, // 5 min — service catalog
}

function invalidateCacheFor(...patterns: string[]) {
  for (const key of _responseCache.keys()) {
    if (patterns.some(p => key.includes(p))) _responseCache.delete(key)
  }
}

async function getToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null

  const now = Date.now()
  if (_tokenCache && _tokenCache.expiresAt > now) return _tokenCache.token

  const clientPromise = getSupabaseClient()
  if (!clientPromise) return null
  const supabase = await clientPromise

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) { _tokenCache = null; return null }

  // Cache until 60s before JWT expiry so we never send an expired token
  const expiresAt = session.expires_at
    ? session.expires_at * 1000 - 60_000
    : now + 55_000
  _tokenCache = { token: session.access_token, expiresAt }
  return session.access_token
}

// Decode role from cached JWT — no extra Supabase call needed
export async function getUserRole(): Promise<string | null> {
  const token = await getToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!))
    return (payload?.user_metadata?.role as string) ?? null
  } catch {
    return null
  }
}

// Decode own doctor_id from JWT metadata (set at invite time)
export async function getOwnDoctorId(): Promise<string | null> {
  const token = await getToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!))
    return (payload?.user_metadata?.doctor_id as string) ?? null
  } catch {
    return null
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const isGet = !options.method || options.method === 'GET'
  const ttl = isGet ? CACHE_TTL[path] : undefined

  // Serve from cache for allowlisted GET endpoints
  if (ttl) {
    const cached = _responseCache.get(path)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T
    }
  }

  const token = await getToken()

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    // 401 → clear token cache so next request re-fetches a fresh session
    if (response.status === 401) _tokenCache = null
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(error?.error?.message ?? `HTTP ${response.status}`)
  }

  const data = await response.json() as T

  // Store in cache if applicable
  if (ttl) {
    _responseCache.set(path, { data, expiresAt: Date.now() + ttl })
  }

  return data
}

// ── Appointments ──────────────────────────────────────────────

export const api = {
  appointments: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request(`/api/appointments${qs}`)
    },
    get: (id: string) => request(`/api/appointments/${id}`),
    availability: (doctorId: string, date: string) =>
      request(`/api/appointments/availability?doctorId=${doctorId}&date=${date}`),
    create: (data: unknown) =>
      request('/api/appointments', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/api/appointments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    checkin: (id: string) =>
      request(`/api/appointments/${id}/checkin`, { method: 'POST' }),
    types: () => request('/api/appointments/types'),
  },

  patients: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request(`/api/patients${qs}`)
    },
    get: (id: string) => request(`/api/patients/${id}`),
    timeline: (id: string) => request(`/api/patients/${id}/timeline`),
    create: (data: unknown) =>
      request('/api/patients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/api/patients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  clinicalNotes: {
    list: (patientId: string) =>
      request(`/api/clinical-notes?patientId=${patientId}`),
    get: (id: string) => request(`/api/clinical-notes/${id}`),
    create: (data: unknown) =>
      request('/api/clinical-notes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/api/clinical-notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    sign: (id: string) =>
      request(`/api/clinical-notes/${id}/sign`, { method: 'POST' }),
    amend: (id: string) =>
      request(`/api/clinical-notes/${id}/amend`, { method: 'POST' }),
  },

  prescriptions: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request(`/api/prescriptions${qs}`)
    },
    get: (id: string) => request(`/api/prescriptions/${id}`),
    create: (data: unknown) =>
      request('/api/prescriptions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/api/prescriptions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    generatePdf: (id: string) =>
      request(`/api/prescriptions/${id}/generate-pdf`, { method: 'POST' }),
    sendWhatsApp: (id: string) =>
      request(`/api/prescriptions/${id}/send-whatsapp`, { method: 'POST' }),
    searchMedications: (q: string) =>
      request(`/api/prescriptions/medications/search?q=${encodeURIComponent(q)}`),
  },

  labResults: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request(`/api/lab-results${qs}`)
    },
    get: (id: string) => request(`/api/lab-results/${id}`),
    create: (data: unknown) =>
      request('/api/lab-results', { method: 'POST', body: JSON.stringify(data) }),
    upload: async (id: string, formData: FormData) => {
      const token = await getToken()
      const response = await fetch(`${API_URL}/api/lab-results/${id}/upload`, {
        method: 'POST',
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
        throw new Error(error?.error?.message ?? `HTTP ${response.status}`)
      }
      return response.json()
    },
    summarize: (id: string) =>
      request(`/api/lab-results/${id}/summarize`, { method: 'POST' }),
    updateNotes: (id: string, notes: string) =>
      request(`/api/lab-results/${id}/notes`, { method: 'PATCH', body: JSON.stringify({ notes }) }),
    notify: (id: string) =>
      request(`/api/lab-results/${id}/notify`, { method: 'POST' }),
    review: (id: string, notes?: string) =>
      request(`/api/lab-results/${id}/review`, { method: 'PATCH', body: JSON.stringify({ notes }) }),
    remove: (id: string) =>
      request(`/api/lab-results/${id}`, { method: 'DELETE' }),
  },

  billing: {
    services: () => request('/api/billing/services'),
    createService: async (data: unknown) => {
      const result = await request('/api/billing/services', { method: 'POST', body: JSON.stringify(data) })
      invalidateCacheFor('/api/billing/services')
      return result
    },
    updateService: async (id: string, data: unknown) => {
      const result = await request(`/api/billing/services/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
      invalidateCacheFor('/api/billing/services')
      return result
    },
    deleteService: async (id: string) => {
      const result = await request(`/api/billing/services/${id}`, { method: 'DELETE' })
      invalidateCacheFor('/api/billing/services')
      return result
    },
    invoices: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request(`/api/billing/invoices${qs}`)
    },
    getInvoice: (id: string) => request(`/api/billing/invoices/${id}`),
    createInvoice: (data: unknown) =>
      request('/api/billing/invoices', { method: 'POST', body: JSON.stringify(data) }),
    createPaymentLink: (id: string) =>
      request(`/api/billing/invoices/${id}/payment-link`, { method: 'POST' }),
    recordPayment: (id: string, data: unknown) =>
      request(`/api/billing/invoices/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
    dashboard: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request(`/api/billing/dashboard${qs}`)
    },
  },

  dashboard: {
    stats: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request(`/api/billing/dashboard${qs}`)
    },
  },

  configuracion: {
    getClinic: () => request('/api/configuracion/clinic'),
    updateClinic: (data: unknown) =>
      request('/api/configuracion/clinic', { method: 'PATCH', body: JSON.stringify(data) }),
    doctors: () => request('/api/configuracion/doctors'),
    createDoctor: async (data: unknown) => {
      const result = await request('/api/configuracion/doctors', { method: 'POST', body: JSON.stringify(data) })
      invalidateCacheFor('/api/configuracion/doctors')
      return result
    },
    // User management with plan limits
    users: () => request('/api/configuracion/users'),
    inviteUser: async (data: unknown) => {
      const result = await request('/api/configuracion/users/invite', { method: 'POST', body: JSON.stringify(data) })
      invalidateCacheFor('/api/configuracion/doctors')
      return result
    },
    updateUser: (id: string, data: unknown) =>
      request(`/api/configuracion/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    resendInvite: (id: string) =>
      request(`/api/configuracion/users/${id}/resend-invite`, { method: 'POST' }),
    deleteUser: (id: string) =>
      request(`/api/configuracion/users/${id}`, { method: 'DELETE' }),
    getSchedule: () => request('/api/configuracion/schedule'),
    updateSchedule: (data: unknown) =>
      request('/api/configuracion/schedule', { method: 'PATCH', body: JSON.stringify(data) }),
  },

  superadmin: {
    stats: () => request('/api/superadmin/stats'),

    listClinics: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request(`/api/superadmin/clinics${qs}`)
    },

    createClinic: (data: unknown) =>
      request('/api/superadmin/clinics', { method: 'POST', body: JSON.stringify(data) }),

    getClinic: (id: string) => request(`/api/superadmin/clinics/${id}`),

    updateClinic: (id: string, data: unknown) =>
      request(`/api/superadmin/clinics/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    addDoctor: (clinicId: string, data: unknown) =>
      request(`/api/superadmin/clinics/${clinicId}/doctors`, { method: 'POST', body: JSON.stringify(data) }),

    resendInvite: (clinicId: string, doctorId: string) =>
      request(`/api/superadmin/clinics/${clinicId}/doctors/${doctorId}/resend-invite`, { method: 'POST' }),

    updateDoctor: (doctorId: string, data: unknown) =>
      request(`/api/superadmin/doctors/${doctorId}`, { method: 'PATCH', body: JSON.stringify(data) }),

    listAdmins: () => request('/api/superadmin/admins'),
    inviteAdmin: (data: unknown) =>
      request('/api/superadmin/admins', { method: 'POST', body: JSON.stringify(data) }),
    updateAdmin: (userId: string, data: unknown) =>
      request(`/api/superadmin/admins/${userId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    listAllUsers: (params?: Record<string, string>) => {
      const qs = params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : ''
      return request(`/api/superadmin/all-users${qs}`)
    },
  },
}
