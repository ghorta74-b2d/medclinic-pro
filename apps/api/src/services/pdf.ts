import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, Font, renderToBuffer,
} from '@react-pdf/renderer'
import { supabase } from '../lib/supabase.js'

// Prescription PDF generator
// Produces a NOM-004-compliant medical prescription

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    backgroundColor: '#FFFFFF',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#1e40af',
    borderBottomStyle: 'solid',
    paddingBottom: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clinicName: { fontSize: 16, fontWeight: 'bold', color: '#1e40af' },
  doctorInfo: { fontSize: 9, color: '#374151', marginTop: 4 },
  label: { fontSize: 8, color: '#6b7280', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 10, color: '#111827' },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e40af',
    marginTop: 14,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
    borderBottomStyle: 'solid',
    paddingBottom: 3,
  },
  patientRow: { flexDirection: 'row', gap: 20, marginBottom: 8 },
  field: { flex: 1 },
  rxItem: {
    marginBottom: 10,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#3b82f6',
    borderLeftStyle: 'solid',
  },
  rxName: { fontWeight: 'bold', fontSize: 11, color: '#111827' },
  rxDetail: { fontSize: 9, color: '#374151', marginTop: 2 },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    borderTopStyle: 'solid',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 8, color: '#9ca3af' },
  signatureArea: {
    marginTop: 40,
    alignItems: 'center',
  },
  signatureLine: {
    width: 200,
    borderTopWidth: 1,
    borderTopColor: '#111827',
    borderTopStyle: 'solid',
    paddingTop: 4,
    alignItems: 'center',
  },
})

interface PrescriptionForPdf {
  id: string
  createdAt: Date
  instructions: string | null
  followUpDate: Date | null
  patient: {
    firstName: string
    lastName: string
    dateOfBirth: Date | null
    phone: string
    curp: string | null
  }
  doctor: {
    firstName: string
    lastName: string
    cedula: string | null
    specialty: string | null
    institution: string | null
  }
  items: Array<{
    medicationName: string
    dose: string
    route: string
    frequency: string
    duration: string
    quantity: string | null
    instructions: string | null
  }>
}

interface ClinicForPdf {
  name: string
  address: string | null
  city: string | null
  phone: string | null
} | null

function PrescriptionDocument({
  prescription,
  clinic,
}: {
  prescription: PrescriptionForPdf
  clinic: ClinicForPdf
}) {
  const dateStr = new Date(prescription.createdAt).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'LETTER', style: styles.page },

      // Header
      React.createElement(View, { style: styles.header },
        React.createElement(View, null,
          React.createElement(Text, { style: styles.clinicName }, clinic?.name ?? 'Clínica'),
          React.createElement(Text, { style: styles.doctorInfo },
            `Dr. ${prescription.doctor.firstName} ${prescription.doctor.lastName}`
          ),
          React.createElement(Text, { style: styles.doctorInfo },
            prescription.doctor.specialty ?? ''
          ),
          prescription.doctor.cedula && React.createElement(Text, { style: styles.doctorInfo },
            `Cédula Profesional: ${prescription.doctor.cedula}`
          ),
          prescription.doctor.institution && React.createElement(Text, { style: styles.doctorInfo },
            prescription.doctor.institution
          ),
        ),
        React.createElement(View, { style: { alignItems: 'flex-end' } },
          React.createElement(Text, { style: styles.label }, 'RECETA MÉDICA'),
          React.createElement(Text, { style: { fontSize: 9, color: '#374151' } }, `Fecha: ${dateStr}`),
          clinic?.phone && React.createElement(Text, { style: { fontSize: 9, color: '#374151' } },
            `Tel: ${clinic.phone}`
          ),
          clinic?.address && React.createElement(Text, { style: { fontSize: 9, color: '#374151' } },
            `${clinic.address}${clinic.city ? `, ${clinic.city}` : ''}`
          ),
        ),
      ),

      // Patient info
      React.createElement(Text, { style: styles.sectionTitle }, 'DATOS DEL PACIENTE'),
      React.createElement(View, { style: styles.patientRow },
        React.createElement(View, { style: styles.field },
          React.createElement(Text, { style: styles.label }, 'Nombre'),
          React.createElement(Text, { style: styles.value },
            `${prescription.patient.firstName} ${prescription.patient.lastName}`
          ),
        ),
        prescription.patient.dateOfBirth && React.createElement(View, { style: styles.field },
          React.createElement(Text, { style: styles.label }, 'Fecha de nacimiento'),
          React.createElement(Text, { style: styles.value },
            new Date(prescription.patient.dateOfBirth).toLocaleDateString('es-MX')
          ),
        ),
      ),

      // Rx items
      React.createElement(Text, { style: styles.sectionTitle }, 'PRESCRIPCIÓN'),
      ...prescription.items.map((item, i) =>
        React.createElement(View, { key: i, style: styles.rxItem },
          React.createElement(Text, { style: styles.rxName },
            `${i + 1}. ${item.medicationName} ${item.dose}`
          ),
          React.createElement(Text, { style: styles.rxDetail },
            `Vía: ${item.route} | ${item.frequency} | Duración: ${item.duration}`
          ),
          item.quantity && React.createElement(Text, { style: styles.rxDetail },
            `Cantidad: ${item.quantity}`
          ),
          item.instructions && React.createElement(Text, { style: styles.rxDetail },
            `Indicaciones: ${item.instructions}`
          ),
        )
      ),

      // General instructions
      prescription.instructions && React.createElement(View, null,
        React.createElement(Text, { style: styles.sectionTitle }, 'INDICACIONES GENERALES'),
        React.createElement(Text, { style: { fontSize: 9, color: '#374151', lineHeight: 1.5 } },
          prescription.instructions
        ),
      ),

      // Follow-up
      prescription.followUpDate && React.createElement(View, null,
        React.createElement(Text, { style: styles.sectionTitle }, 'CITA DE SEGUIMIENTO'),
        React.createElement(Text, { style: styles.value },
          new Date(prescription.followUpDate).toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })
        ),
      ),

      // Signature area
      React.createElement(View, { style: styles.signatureArea },
        React.createElement(View, { style: styles.signatureLine },
          React.createElement(Text, { style: { fontSize: 9, color: '#374151', textAlign: 'center' } },
            `Dr. ${prescription.doctor.firstName} ${prescription.doctor.lastName}`
          ),
          prescription.doctor.cedula && React.createElement(Text, {
            style: { fontSize: 8, color: '#6b7280', textAlign: 'center' },
          },
            `Cédula: ${prescription.doctor.cedula}`
          ),
        ),
      ),

      // Footer
      React.createElement(View, { style: styles.footer },
        React.createElement(Text, { style: styles.footerText },
          'Este documento es confidencial. Solo para uso del paciente indicado.'
        ),
        React.createElement(Text, { style: styles.footerText }, `ID: ${prescription.id}`),
      ),
    )
  )
}

export async function generatePrescriptionPdf(
  prescription: PrescriptionForPdf,
  clinic: ClinicForPdf
): Promise<string> {
  const element = React.createElement(PrescriptionDocument, { prescription, clinic })
  const pdfBuffer = await renderToBuffer(element as unknown as React.ReactElement)

  const fileName = `prescriptions/${prescription.patient.firstName}_${prescription.id}.pdf`

  const { error } = await supabase.storage
    .from('clinical-files')
    .upload(fileName, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (error) throw new Error(`PDF upload failed: ${error.message}`)

  const { data } = supabase.storage.from('clinical-files').getPublicUrl(fileName)
  return data.publicUrl
}
