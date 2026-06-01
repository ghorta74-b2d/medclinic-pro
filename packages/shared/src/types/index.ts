// Shared TypeScript types used by both API and web app

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'DOCTOR' | 'STAFF' | 'PATIENT'

export type AppointmentStatus =
  | 'SCHEDULED' | 'CONFIRMED' | 'CHECKED_IN'
  | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

export type AppointmentMode = 'IN_PERSON' | 'TELEMEDICINE' | 'HOME_VISIT'

export type BlockReason = 'VACATION' | 'MEAL' | 'PERSONAL' | 'OTHER'

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'

export type BloodType = 'A_POS' | 'A_NEG' | 'B_POS' | 'B_NEG' | 'AB_POS' | 'AB_NEG' | 'O_POS' | 'O_NEG' | 'UNKNOWN'

export type LabResultStatus = 'PENDING' | 'RECEIVED' | 'REVIEWED' | 'NOTIFIED'

export type LabResultCategory = 'LABORATORY' | 'IMAGING' | 'PATHOLOGY' | 'CARDIOLOGY' | 'ENDOSCOPY' | 'OTHER'

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED'

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'INSURANCE' | 'STRIPE_ONLINE'

export type NoteStatus = 'DRAFT' | 'SIGNED' | 'AMENDED'

// ── API response wrappers ────────────────────────────────────

export interface ApiResponse<T> {
  data: T
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// ── Domain types ─────────────────────────────────────────────

export interface Clinic {
  id: string
  name: string
  legalName?: string
  rfc?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  phone?: string
  email?: string
  logoUrl?: string
  specialty?: string
  isActive: boolean
  createdAt: string
}

export interface Doctor {
  id: string
  clinicId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  specialty?: string
  cedula?: string
  institution?: string
  avatarUrl?: string
  consultationDuration: number
  isActive: boolean
  createdAt: string
}

export interface Patient {
  id: string
  clinicId: string
  firstName: string
  lastName: string
  secondLastName?: string
  phone: string
  email?: string
  dateOfBirth?: string
  gender?: Gender
  bloodType: BloodType
  curp?: string
  address?: string
  city?: string
  state?: string
  allergies: string[]
  chronicConditions: string[]
  currentMedications: string[]
  emergencyName?: string
  emergencyPhone?: string
  emergencyRelation?: string
  isActive: boolean
  createdAt: string
}

export interface AppointmentType {
  id: string
  name: string
  durationMinutes: number
  color: string
  price: number
  isActive: boolean
}

export interface Appointment {
  id: string
  clinicId: string
  doctorId: string
  patientId: string
  appointmentTypeId?: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  mode: AppointmentMode
  chiefComplaint?: string
  internalNotes?: string
  cancelledAt?: string
  cancellationReason?: string
  patient?: Pick<Patient, 'id' | 'firstName' | 'lastName' | 'phone'>
  doctor?: Pick<Doctor, 'id' | 'firstName' | 'lastName' | 'specialty'>
  appointmentType?: AppointmentType
  createdAt: string
}

// Bloqueo de horario — el médico no está disponible en este rango.
// No es una cita: no lleva paciente ni cuenta en los contadores.
export interface ScheduleBlock {
  id: string
  clinicId: string
  doctorId: string
  startsAt: string
  endsAt: string
  reason: BlockReason
  note?: string
  createdBy?: string
  doctor?: Pick<Doctor, 'id' | 'firstName' | 'lastName' | 'specialty'>
  createdAt: string
}

export interface Diagnosis {
  code: string
  description: string
  type: 'PRIMARY' | 'SECONDARY' | 'RULE_OUT'
}

export interface VitalSigns {
  weightKg?: number
  heightCm?: number
  bmi?: number
  systolicBp?: number
  diastolicBp?: number
  heartRateBpm?: number
  temperatureC?: number
  spo2Percent?: number
  respiratoryRate?: number
  glucoseMgDl?: number
  recordedAt: string
}

export interface ClinicalNote {
  id: string
  clinicId: string
  patientId: string
  doctorId: string
  appointmentId?: string
  chiefComplaint?: string
  physicalExam?: string
  diagnoses: Diagnosis[]
  treatmentPlan?: string
  evolutionNotes?: string
  status: NoteStatus
  signedAt?: string
  signedBy?: string
  vitalSigns?: VitalSigns
  doctor?: Pick<Doctor, 'id' | 'firstName' | 'lastName' | 'cedula' | 'specialty'>
  createdAt: string
}

export interface Medication {
  id: string
  name: string
  brandName?: string
  presentation?: string
  concentration?: string
}

// Art. 226 LGS — Clasificación por fracción regulatoria
export type DrugFraction = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI'

export type RxeStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED'

export const FRACTION_COLORS: Record<DrugFraction, string> = {
  I:   '#EF4444', // rojo — estupefacientes
  II:  '#F97316', // naranja — retención obligatoria
  III: '#F59E0B', // ámbar — hasta 3 surtidos
  IV:  '#3B82F6', // azul — antibióticos y similares
  V:   '#22C55E', // verde — venta libre con receta
  VI:  '#6B7280', // gris-verde — venta libre
}

export const FRACTION_LABELS: Record<DrugFraction, string> = {
  I:   'Frac. I — Solo con permiso SS',
  II:  'Frac. II — Retención obligatoria',
  III: 'Frac. III — Hasta 3 surtidos',
  IV:  'Frac. IV — Con receta médica',
  V:   'Frac. V — Con o sin receta',
  VI:  'Frac. VI — Venta libre',
}

// Categoría de dispensación — leyenda por tipo de medicamento (código de color)
export type DispensingCategory = 'fisica' | 'aliadas' | 'libre' | 'laboratorio'

export const DISPENSING_META: Record<DispensingCategory, { color: string; label: string; rule: string }> = {
  fisica:      { color: '#F97316', label: 'Requiere receta médica',     rule: 'Antibióticos, opioides y controlados · Frac. I, II y III' },
  aliadas:     { color: '#3B82F6', label: 'Solo en farmacias aliadas',  rule: 'Farmacias con convenio MedClinic' },
  libre:       { color: '#22C55E', label: 'Venta libre',                rule: 'Sin receta médica · Fracción V y VI' },
  laboratorio: { color: '#EAB308', label: 'Solo en laboratorio',        rule: 'Estudios médicos' },
}

export interface PrescriptionItem {
  id: string
  medicationId?: string
  medication?: Medication
  medicationName: string
  dose: string
  route: string
  frequency: string
  duration: string
  quantity?: string
  instructions?: string
  sortOrder: number
  fraction?: DrugFraction
  boughtQty?: number
}

export interface Prescription {
  id: string
  clinicId: string
  patientId: string
  doctorId: string
  clinicalNoteId?: string
  pdfUrl?: string
  sentViaWhatsApp: boolean
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  instructions?: string
  followUpDate?: string
  // RxE fields
  publicSlug?: string
  signature?: string
  rxeStatus?: RxeStatus
  rxeGeneratedAt?: string
  expiresAt?: string
  items: PrescriptionItem[]
  patient?: Pick<Patient, 'id' | 'firstName' | 'lastName'>
  doctor?: Pick<Doctor, 'id' | 'firstName' | 'lastName' | 'cedula' | 'specialty'>
  createdAt: string
}

// Pharmacy & Campaign types for admin panel
export type PricingModel = 'CPM' | 'CPC' | 'FLAT_MONTHLY'

export interface PharmacyBranch {
  id: string
  pharmacyId: string
  name: string
  address?: string
  lat?: number
  lng?: number
  phone?: string
}

export interface PharmacyCampaign {
  id: string
  pharmacyId: string
  displayName: string
  description?: string
  ctaLink: string
  ctaLabel: string
  displayPhone?: string
  searchQuery?: string
  priority: number
  geoStates: string[]
  startsAt?: string
  endsAt?: string
  active: boolean
  pricingModel: PricingModel
  rateCents: number
  impressions: number
  clicks: number
  pharmacy?: { name: string; logoUrl?: string; websiteUrl?: string }
  branches?: PharmacyBranch[]
}

export interface LabResult {
  id: string
  clinicId: string
  patientId: string
  clinicalNoteId?: string
  title: string
  category: LabResultCategory
  laboratoryName?: string
  orderedAt?: string
  collectedAt?: string
  reportedAt?: string
  fileUrl?: string
  externalUrl?: string
  status: LabResultStatus
  reviewedAt?: string
  notes?: string
  llmSummary?: string
  patient?: Pick<Patient, 'id' | 'firstName' | 'lastName'>
  createdAt: string
}

export interface Service {
  id: string
  clinicId: string
  name: string
  description?: string
  price: number
  currency: string
  taxRate: number
  taxIncluded: boolean
  category?: string
  isActive: boolean
}

export interface InvoiceItem {
  id: string
  serviceId?: string
  service?: Service
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  taxAmount: number
  total: number
  insuranceCovers?: number
}

export interface Invoice {
  id: string
  clinicId: string
  patientId: string
  appointmentId?: string
  invoiceNumber: string
  status: InvoiceStatus
  subtotal: number
  taxAmount: number
  discountAmount: number
  total: number
  paidAmount: number
  currency: string
  issuedAt: string
  dueAt?: string
  paidAt?: string
  stripePaymentLinkUrl?: string
  paymentLinkSentAt?: string
  notes?: string
  items: InvoiceItem[]
  patient?: Pick<Patient, 'id' | 'firstName' | 'lastName' | 'phone'>
  createdAt: string
}

// ── UI helpers ────────────────────────────────────────────────

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Agendada',
  CONFIRMED: 'Confirmada',
  CHECKED_IN: 'En sala',
  IN_PROGRESS: 'En consulta',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
}

export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'blue',
  CONFIRMED: 'green',
  CHECKED_IN: 'yellow',
  IN_PROGRESS: 'orange',
  COMPLETED: 'gray',
  CANCELLED: 'red',
  NO_SHOW: 'red',
}

export const BLOCK_REASON_LABELS: Record<BlockReason, string> = {
  VACATION: 'Vacaciones',
  MEAL: 'Comida',
  PERSONAL: 'Personal',
  OTHER: 'Otro',
}

// Paleta determinística por médico — colores accesibles y distintos entre sí.
// Se evita el rojo puro (reservado a "cancelada" y a la línea de ahora).
const DOCTOR_HUES = [205, 160, 275, 32, 330, 130, 250, 190, 95, 18] as const

export interface DoctorColor {
  hue: number
  /** Franja/borde sólido del bloque */
  bar: string
  /** Fondo translúcido del bloque (funciona en dark y light) */
  bg: string
  /** Borde/anillo translúcido */
  ring: string
}

/** Devuelve un color estable para un médico a partir de su id. */
export function doctorColor(doctorId: string): DoctorColor {
  let hash = 0
  for (let i = 0; i < doctorId.length; i++) {
    hash = (hash * 31 + doctorId.charCodeAt(i)) >>> 0
  }
  const hue = DOCTOR_HUES[hash % DOCTOR_HUES.length]!
  return {
    hue,
    bar: `hsl(${hue} 70% 52%)`,
    bg: `hsl(${hue} 70% 52% / 0.16)`,
    ring: `hsl(${hue} 70% 52% / 0.45)`,
  }
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  PAID: 'Pagada',
  PARTIALLY_PAID: 'Pago parcial',
  OVERDUE: 'Vencida',
  CANCELLED: 'Cancelada',
  REFUNDED: 'Reembolsada',
}

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: 'Masculino',
  FEMALE: 'Femenino',
  OTHER: 'Otro',
  PREFER_NOT_TO_SAY: 'Prefiere no decir',
}

export const BLOOD_TYPE_LABELS: Record<BloodType, string> = {
  A_POS: 'A+', A_NEG: 'A-',
  B_POS: 'B+', B_NEG: 'B-',
  AB_POS: 'AB+', AB_NEG: 'AB-',
  O_POS: 'O+', O_NEG: 'O-',
  UNKNOWN: 'Desconocido',
}

export const LAB_CATEGORY_LABELS: Record<LabResultCategory, string> = {
  LABORATORY: 'Laboratorio',
  IMAGING: 'Imagenología',
  PATHOLOGY: 'Patología',
  CARDIOLOGY: 'Cardiología',
  ENDOSCOPY: 'Endoscopía',
  OTHER: 'Otro',
}
