// API client for the MedClinic Pro backend

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

async function getToken(): Promise<string | null> {
  // In a real app, get from Supabase session
  if (typeof window === 'undefined') return null
  const { createBrowserClient } = await import('@supabase/ssr')
  const supabase = createBrowserClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
  )
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
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
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(error?.error?.message ?? `HTTP ${response.status}`)
  }

  return response.json() as Promise<T>
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
    createService: (data: unknown) =>
      request('/api/billing/services', { method: 'POST', body: JSON.stringify(data) }),
    updateService: (id: string, data: unknown) =>
      request(`/api/billing/services/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteService: (id: string) =>
      request(`/api/billing/services/${id}`, { method: 'DELETE' }),
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
    createDoctor: (data: unknown) =>
      request('/api/configuracion/doctors', { method: 'POST', body: JSON.stringify(data) }),
    // User management with plan limits
    users: () => request('/api/configuracion/users'),
    inviteUser: (data: unknown) =>
      request('/api/configuracion/users/invite', { method: 'POST', body: JSON.stringify(data) }),
    updateUser: (id: string, data: unknown) =>
      request(`/api/configuracion/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    resendInvite: (id: string) =>
      request(`/api/configuracion/users/${id}/resend-invite`, { method: 'POST' }),
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
