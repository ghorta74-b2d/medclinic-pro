import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, renderToBuffer,
} from '@react-pdf/renderer'

// Clinical history PDF generator — "Historia Clínica"
// Structured, NOM-004 / SOAP-style summary of a patient's signed clinical record.
// Returns a Buffer (NOT uploaded to Storage — the full record is PII-sensitive).

const COLORS = {
  primary: '#1e40af',
  text: '#111827',
  muted: '#374151',
  light: '#6b7280',
  faint: '#9ca3af',
  rule: '#dbeafe',
  border: '#d1d5db',
  danger: '#b91c1c',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 40,
    backgroundColor: '#FFFFFF',
    color: COLORS.text,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    borderBottomStyle: 'solid',
    paddingBottom: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clinicName: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  docTitle: { fontSize: 11, fontWeight: 'bold', color: COLORS.muted, marginTop: 2, letterSpacing: 1 },
  metaLine: { fontSize: 8, color: COLORS.light, marginTop: 1 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
    borderBottomStyle: 'solid',
    paddingBottom: 3,
  },
  label: { fontSize: 8, color: COLORS.light, textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 10, color: COLORS.text },
  row: { flexDirection: 'row', gap: 18, marginBottom: 8 },
  field: { flex: 1 },
  bgLabel: { fontSize: 9, fontWeight: 'bold', color: COLORS.muted, marginTop: 4 },
  bgValue: { fontSize: 9, color: COLORS.muted, marginBottom: 2 },
  allergyValue: { fontSize: 9, color: COLORS.danger, marginBottom: 2 },
  note: {
    marginBottom: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#3b82f6',
    borderLeftStyle: 'solid',
  },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  noteDate: { fontSize: 10, fontWeight: 'bold', color: COLORS.text },
  noteDoctor: { fontSize: 9, color: COLORS.light },
  statusChip: { fontSize: 7, color: COLORS.light, textTransform: 'uppercase' },
  subLabel: { fontSize: 8, fontWeight: 'bold', color: COLORS.primary, textTransform: 'uppercase', marginTop: 5 },
  body: { fontSize: 9, color: COLORS.muted, lineHeight: 1.4, marginTop: 1 },
  aiBox: {
    marginTop: 5,
    backgroundColor: '#f5f3ff',
    borderLeftWidth: 2,
    borderLeftColor: '#8b5cf6',
    borderLeftStyle: 'solid',
    padding: 6,
  },
  aiLabel: { fontSize: 8, fontWeight: 'bold', color: '#6d28d9', textTransform: 'uppercase', marginBottom: 2 },
  rxName: { fontWeight: 'bold', fontSize: 10, color: COLORS.text },
  rxDetail: { fontSize: 9, color: COLORS.muted, marginTop: 1 },
  empty: { fontSize: 9, color: COLORS.faint, fontStyle: 'italic' },
  labNote: { fontSize: 9, color: COLORS.muted, lineHeight: 1.4 },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderTopStyle: 'solid',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: COLORS.faint },
})

// ---- Types (decoupled from Prisma to keep the service portable) -------------

export interface ClinicalHistoryData {
  generatedAt: Date
  generatedBy?: { firstName: string; lastName: string; licenseNumber: string | null } | null
  clinic: { name: string; address: string | null; city: string | null; phone: string | null } | null
  patient: {
    id: string
    firstName: string
    lastName: string
    secondLastName: string | null
    dateOfBirth: Date | null
    gender: string | null
    bloodType: string
    phone: string
    curp: string | null
    allergies: string[]
    chronicConditions: string[]
    currentMedications: string[]
    surgicalHistory: string[]
    familyHistory: unknown
    personalHistory: unknown
  }
  notes: Array<{
    id: string
    status: string
    signedAt: Date | null
    createdAt: Date
    chiefComplaint: string | null
    physicalExam: unknown
    diagnoses: unknown
    treatmentPlan: string | null
    evolutionNotes: string | null
    aiSummary: string | null
    isAiAssisted: boolean
    doctor: { firstName: string; lastName: string; licenseNumber: string | null }
    vitalSigns: {
      weightKg: unknown; heightCm: unknown; bmi: unknown
      systolicBp: number | null; diastolicBp: number | null; heartRateBpm: number | null
      temperatureC: unknown; spo2Percent: number | null; respiratoryRate: number | null
      glucoseMgDl: number | null
    } | null
  }>
  prescriptions: Array<{
    id: string
    createdAt: Date
    instructions: string | null
    followUpDate: Date | null
    doctor: { firstName: string; lastName: string }
    items: Array<{
      medicationName: string; dose: string; route: string
      frequency: string; duration: string; quantity: string | null
    }>
  }>
  labResultsCount: number
}

// ---- Label maps & formatters ------------------------------------------------

const GENDER_LABELS: Record<string, string> = {
  MALE: 'Masculino', FEMALE: 'Femenino', OTHER: 'Otro', PREFER_NOT_TO_SAY: 'Prefiere no decir',
}

const BLOOD_LABELS: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−', UNKNOWN: 'Desconocido',
}

const EXAM_LABELS: Record<string, string> = {
  general: 'General', head: 'Cabeza', neck: 'Cuello', chest: 'Tórax',
  abdomen: 'Abdomen', extremities: 'Extremidades', neuro: 'Neurológico',
}

const NOTE_STATUS_LABELS: Record<string, string> = {
  SIGNED: 'Firmada', AMENDED: 'Modificada', DRAFT: 'Borrador',
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function calcAge(dob: Date | null): string {
  if (!dob) return ''
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return `${age} años`
}

function num(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const n = typeof v === 'object' && v !== null && 'toString' in v ? Number(v.toString()) : Number(v)
  return Number.isFinite(n) ? String(n) : null
}

function formatVitals(v: ClinicalHistoryData['notes'][number]['vitalSigns']): string | null {
  if (!v) return null
  const parts: string[] = []
  if (v.systolicBp != null && v.diastolicBp != null) parts.push(`TA ${v.systolicBp}/${v.diastolicBp} mmHg`)
  if (v.heartRateBpm != null) parts.push(`FC ${v.heartRateBpm} lpm`)
  if (v.respiratoryRate != null) parts.push(`FR ${v.respiratoryRate} rpm`)
  const temp = num(v.temperatureC); if (temp) parts.push(`Temp ${temp} °C`)
  if (v.spo2Percent != null) parts.push(`SpO₂ ${v.spo2Percent}%`)
  const w = num(v.weightKg); if (w) parts.push(`Peso ${w} kg`)
  const h = num(v.heightCm); if (h) parts.push(`Talla ${h} cm`)
  const bmi = num(v.bmi); if (bmi) parts.push(`IMC ${bmi}`)
  if (v.glucoseMgDl != null) parts.push(`Glucosa ${v.glucoseMgDl} mg/dL`)
  return parts.length ? parts.join('  ·  ') : null
}

function formatExam(exam: unknown): string | null {
  if (!exam || typeof exam !== 'object') return null
  const obj = exam as Record<string, unknown>
  const parts: string[] = []
  for (const [key, label] of Object.entries(EXAM_LABELS)) {
    const val = obj[key]
    if (typeof val === 'string' && val.trim()) parts.push(`${label}: ${val.trim()}`)
  }
  return parts.length ? parts.join('. ') : null
}

interface DiagnosisEntry { code?: string; description?: string; type?: string }
const DX_TYPE_LABELS: Record<string, string> = {
  PRIMARY: 'Principal', SECONDARY: 'Secundario', RULE_OUT: 'A descartar',
}
function formatDiagnoses(dx: unknown): string[] {
  if (!Array.isArray(dx)) return []
  return dx
    .map((d) => {
      const e = (d ?? {}) as DiagnosisEntry
      const code = e.code ? `${e.code} — ` : ''
      const desc = e.description ?? ''
      const type = e.type && DX_TYPE_LABELS[e.type] ? ` (${DX_TYPE_LABELS[e.type]})` : ''
      const line = `${code}${desc}${type}`.trim()
      return line.length ? line : null
    })
    .filter((s): s is string => Boolean(s))
}

// ---- Document ---------------------------------------------------------------

const h = React.createElement

function Field(label: string, value: string) {
  return h(View, { style: styles.field },
    h(Text, { style: styles.label }, label),
    h(Text, { style: styles.value }, value),
  )
}

function Sub(label: string, value: string) {
  return h(View, null,
    h(Text, { style: styles.subLabel }, label),
    h(Text, { style: styles.body }, value),
  )
}

function ClinicalHistoryDocument({ data }: { data: ClinicalHistoryData }) {
  const p = data.patient
  const fullName = [p.firstName, p.lastName, p.secondLastName].filter(Boolean).join(' ')
  const age = calcAge(p.dateOfBirth)

  const children: React.ReactNode[] = []

  // 1. Header (repeats on every page via `fixed`)
  children.push(
    h(View, { style: styles.header, fixed: true },
      h(View, null,
        h(Text, { style: styles.clinicName }, data.clinic?.name ?? 'Clínica'),
        h(Text, { style: styles.docTitle }, 'HISTORIA CLÍNICA'),
        data.clinic?.phone && h(Text, { style: styles.metaLine }, `Tel: ${data.clinic.phone}`),
        data.clinic?.address && h(Text, { style: styles.metaLine },
          `${data.clinic.address}${data.clinic.city ? `, ${data.clinic.city}` : ''}`),
      ),
      h(View, { style: { alignItems: 'flex-end' } },
        h(Text, { style: styles.label }, 'Generado'),
        h(Text, { style: { fontSize: 9, color: COLORS.muted } }, fmtDateTime(data.generatedAt)),
        data.generatedBy && h(Text, { style: styles.metaLine },
          `Por: Dr. ${data.generatedBy.firstName} ${data.generatedBy.lastName}`),
        data.generatedBy?.licenseNumber && h(Text, { style: styles.metaLine },
          `Cédula: ${data.generatedBy.licenseNumber}`),
      ),
    )
  )

  // 2. Patient data
  children.push(h(Text, { style: styles.sectionTitle }, 'DATOS DEL PACIENTE'))
  children.push(
    h(View, { style: styles.row },
      Field('Nombre', fullName),
      Field('Fecha de nacimiento', `${fmtDate(p.dateOfBirth)}${age ? ` (${age})` : ''}`),
    )
  )
  children.push(
    h(View, { style: styles.row },
      Field('Sexo', p.gender ? (GENDER_LABELS[p.gender] ?? p.gender) : '—'),
      Field('Tipo de sangre', BLOOD_LABELS[p.bloodType] ?? p.bloodType),
      Field('Teléfono', p.phone || '—'),
      Field('CURP', p.curp ?? '—'),
    )
  )

  // 3. Background / antecedentes
  children.push(h(Text, { style: styles.sectionTitle }, 'ANTECEDENTES'))
  children.push(h(Text, { style: styles.bgLabel }, 'Alergias'))
  children.push(h(Text, { style: p.allergies.length ? styles.allergyValue : styles.bgValue },
    p.allergies.length ? p.allergies.join(', ') : 'Ninguna registrada'))
  children.push(h(Text, { style: styles.bgLabel }, 'Enfermedades crónicas'))
  children.push(h(Text, { style: styles.bgValue },
    p.chronicConditions.length ? p.chronicConditions.join(', ') : 'Ninguna registrada'))
  children.push(h(Text, { style: styles.bgLabel }, 'Medicamentos actuales'))
  children.push(h(Text, { style: styles.bgValue },
    p.currentMedications.length ? p.currentMedications.join(', ') : 'Ninguno registrado'))
  if (p.surgicalHistory.length) {
    children.push(h(Text, { style: styles.bgLabel }, 'Antecedentes quirúrgicos'))
    children.push(h(Text, { style: styles.bgValue }, p.surgicalHistory.join(', ')))
  }

  // 4. Clinical notes (signed only, chronological ascending)
  children.push(h(Text, { style: styles.sectionTitle },
    `HISTORIAL DE CONSULTAS (${data.notes.length})`))
  if (!data.notes.length) {
    children.push(h(Text, { style: styles.empty }, 'Sin consultas firmadas en el expediente.'))
  } else {
    for (const n of data.notes) {
      const vitals = formatVitals(n.vitalSigns)
      const exam = formatExam(n.physicalExam)
      const dx = formatDiagnoses(n.diagnoses)
      children.push(
        h(View, { style: styles.note, wrap: false, key: n.id },
          h(View, { style: styles.noteHeader },
            h(View, null,
              h(Text, { style: styles.noteDate }, fmtDate(n.signedAt ?? n.createdAt)),
              h(Text, { style: styles.noteDoctor },
                `Dr. ${n.doctor.firstName} ${n.doctor.lastName}${n.doctor.licenseNumber ? ` · Céd. ${n.doctor.licenseNumber}` : ''}`),
            ),
            h(Text, { style: styles.statusChip },
              `${NOTE_STATUS_LABELS[n.status] ?? n.status}${n.isAiAssisted ? ' · IA' : ''}`),
          ),
          n.chiefComplaint && Sub('Motivo de consulta', n.chiefComplaint),
          vitals && Sub('Signos vitales', vitals),
          exam && Sub('Exploración física', exam),
          dx.length > 0 && h(View, null,
            h(Text, { style: styles.subLabel }, 'Diagnósticos (CIE-10)'),
            ...dx.map((line, i) => h(Text, { style: styles.body, key: i }, `• ${line}`)),
          ),
          n.treatmentPlan && Sub('Plan de tratamiento', n.treatmentPlan),
          n.evolutionNotes && Sub('Evolución', n.evolutionNotes),
          n.aiSummary && h(View, { style: styles.aiBox },
            h(Text, { style: styles.aiLabel }, 'Resumen IA'),
            h(Text, { style: styles.body }, n.aiSummary),
          ),
        )
      )
    }
  }

  // 5. Prescriptions
  children.push(h(Text, { style: styles.sectionTitle },
    `RECETAS (${data.prescriptions.length})`))
  if (!data.prescriptions.length) {
    children.push(h(Text, { style: styles.empty }, 'Sin recetas registradas.'))
  } else {
    for (const rx of data.prescriptions) {
      children.push(
        h(View, { style: styles.note, wrap: false, key: rx.id },
          h(View, { style: styles.noteHeader },
            h(Text, { style: styles.noteDate }, fmtDate(rx.createdAt)),
            h(Text, { style: styles.noteDoctor }, `Dr. ${rx.doctor.firstName} ${rx.doctor.lastName}`),
          ),
          ...rx.items.map((item, i) =>
            h(View, { key: i, style: { marginTop: 3 } },
              h(Text, { style: styles.rxName }, `${i + 1}. ${item.medicationName} ${item.dose}`),
              h(Text, { style: styles.rxDetail },
                `Vía: ${item.route} · ${item.frequency} · Duración: ${item.duration}${item.quantity ? ` · Cantidad: ${item.quantity}` : ''}`),
            )
          ),
          rx.instructions && Sub('Indicaciones generales', rx.instructions),
          rx.followUpDate && Sub('Cita de seguimiento', fmtDate(rx.followUpDate)),
        )
      )
    }
  }

  // 6. Lab results — mention only, never detail
  children.push(h(Text, { style: styles.sectionTitle }, 'ESTUDIOS DE LABORATORIO Y GABINETE'))
  children.push(h(Text, { style: styles.labNote },
    data.labResultsCount > 0
      ? `El paciente cuenta con ${data.labResultsCount} estudio(s) de laboratorio/gabinete registrados en el expediente. Los resultados no se incluyen en este documento; consúltense directamente en el sistema.`
      : 'No hay estudios de laboratorio/gabinete registrados.'))

  // 7. Footer (repeats on every page)
  children.push(
    h(View, { style: styles.footer, fixed: true },
      h(Text, { style: styles.footerText },
        `Documento confidencial — uso exclusivo del paciente indicado.  ID: ${p.id}`),
      h(Text, {
        style: styles.footerText,
        render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `Página ${pageNumber} de ${totalPages}`,
      }),
    )
  )

  return h(Document, null, h(Page, { size: 'LETTER', style: styles.page }, ...children))
}

export async function generateClinicalHistoryPdf(data: ClinicalHistoryData): Promise<Buffer> {
  const element = React.createElement(ClinicalHistoryDocument, { data })
  return renderToBuffer(element as unknown as React.ReactElement)
}
