// Shared TypeScript types used by both API and web app

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'DOCTOR' | 'STAFF' | 'PATIENT'

export type AppointmentStatus =
  | 'SCHEDULED' | 'CONFIRMED' | 'CHECKED_IN'
  | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

export type AppointmentMode = 'IN_PERSON' | 'TELEMEDICINE' | 'HOME_VISIT'

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
  items: PrescriptionItem[]
  patient?: Pick<Patient, 'id' | 'firstName' | 'lastName'>
  doctor?: Pick<Doctor, 'id' | 'firstName' | 'lastName' | 'cedula' | 'specialty'>
  createdAt: string
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
