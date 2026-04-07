/**
 * MedClinic Pro — Seed Script
 * Creates demo data: 1 clinic, 2 doctors, 10 patients, 30 appointments,
 * clinical notes, prescriptions, lab results, invoices
 *
 * Run: pnpm db:seed
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding MedClinic Pro demo data...')

  // ── 1. Clinic ────────────────────────────────────────────────
  const clinic = await prisma.clinic.upsert({
    where: { id: 'demo-clinic-001' },
    update: {},
    create: {
      id: 'demo-clinic-001',
      name: 'Clínica Ginecológica Santa Fe',
      legalName: 'Servicios Médicos Santa Fe S.C.',
      rfc: 'SMS240101ABC',
      address: 'Av. Vasco de Quiroga 3900, Piso 5, Consultorio 507',
      city: 'Ciudad de México',
      state: 'CDMX',
      zipCode: '05348',
      country: 'MX',
      phone: '+525511223344',
      email: 'contacto@clinicasantafe.mx',
      specialty: 'Ginecología y Obstetricia',
      isActive: true,
    },
  })
  console.log(`✅ Clinic: ${clinic.name}`)

  // ── 2. Doctors ───────────────────────────────────────────────
  const doctor1 = await prisma.doctor.upsert({
    where: { authUserId: 'auth-doctor-001' },
    update: {},
    create: {
      clinicId: clinic.id,
      authUserId: 'auth-doctor-001',
      role: 'DOCTOR',
      firstName: 'María Elena',
      lastName: 'Rodríguez Vargas',
      email: 'dra.rodriguez@clinicasantafe.mx',
      phone: '+525512345678',
      specialty: 'Ginecología y Obstetricia',
      cedula: '8765432',
      institution: 'Universidad Nacional Autónoma de México',
      consultationDuration: 30,
      scheduleConfig: {
        mon: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '20:00' }],
        tue: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '20:00' }],
        wed: [{ start: '09:00', end: '14:00' }],
        thu: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '20:00' }],
        fri: [{ start: '09:00', end: '14:00' }],
        sat: [{ start: '09:00', end: '13:00' }],
      },
      isActive: true,
    },
  })

  const doctor2 = await prisma.doctor.upsert({
    where: { authUserId: 'auth-doctor-002' },
    update: {},
    create: {
      clinicId: clinic.id,
      authUserId: 'auth-doctor-002',
      role: 'DOCTOR',
      firstName: 'Carlos Alberto',
      lastName: 'Mendoza Torres',
      email: 'dr.mendoza@clinicasantafe.mx',
      phone: '+525598765432',
      specialty: 'Ginecología',
      cedula: '5432198',
      institution: 'Instituto Politécnico Nacional',
      consultationDuration: 30,
      scheduleConfig: {
        mon: [{ start: '10:00', end: '15:00' }],
        tue: [{ start: '10:00', end: '15:00' }],
        wed: [{ start: '10:00', end: '15:00' }, { start: '17:00', end: '20:00' }],
        thu: [{ start: '10:00', end: '15:00' }],
        fri: [{ start: '10:00', end: '15:00' }, { start: '17:00', end: '20:00' }],
      },
      isActive: true,
    },
  })
  console.log(`✅ Doctors: ${doctor1.firstName} ${doctor1.lastName}, ${doctor2.firstName} ${doctor2.lastName}`)

  // ── 3. Appointment Types ─────────────────────────────────────
  const apptTypes = await Promise.all([
    prisma.appointmentType.upsert({
      where: { id: 'type-primera-vez' },
      update: {},
      create: {
        id: 'type-primera-vez',
        clinicId: clinic.id,
        name: 'Primera vez',
        durationMinutes: 45,
        color: '#3B82F6',
        price: 800,
      },
    }),
    prisma.appointmentType.upsert({
      where: { id: 'type-seguimiento' },
      update: {},
      create: {
        id: 'type-seguimiento',
        clinicId: clinic.id,
        name: 'Seguimiento',
        durationMinutes: 30,
        color: '#10B981',
        price: 600,
      },
    }),
    prisma.appointmentType.upsert({
      where: { id: 'type-urgencia' },
      update: {},
      create: {
        id: 'type-urgencia',
        clinicId: clinic.id,
        name: 'Urgencia',
        durationMinutes: 30,
        color: '#EF4444',
        price: 1000,
      },
    }),
    prisma.appointmentType.upsert({
      where: { id: 'type-telemedicina' },
      update: {},
      create: {
        id: 'type-telemedicina',
        clinicId: clinic.id,
        name: 'Telemedicina',
        durationMinutes: 30,
        color: '#8B5CF6',
        price: 500,
      },
    }),
  ])
  console.log(`✅ Appointment types: ${apptTypes.length}`)

  // ── 4. Services ──────────────────────────────────────────────
  await Promise.all([
    prisma.service.upsert({
      where: { id: 'svc-consulta-primera' },
      update: {},
      create: {
        id: 'svc-consulta-primera',
        clinicId: clinic.id,
        name: 'Consulta primera vez',
        price: 800,
        taxRate: 0,
        category: 'Consultas',
      },
    }),
    prisma.service.upsert({
      where: { id: 'svc-consulta-seguimiento' },
      update: {},
      create: {
        id: 'svc-consulta-seguimiento',
        clinicId: clinic.id,
        name: 'Consulta seguimiento',
        price: 600,
        taxRate: 0,
        category: 'Consultas',
      },
    }),
    prisma.service.upsert({
      where: { id: 'svc-colposcopia' },
      update: {},
      create: {
        id: 'svc-colposcopia',
        clinicId: clinic.id,
        name: 'Colposcopía',
        price: 1800,
        taxRate: 0,
        category: 'Procedimientos',
      },
    }),
    prisma.service.upsert({
      where: { id: 'svc-pap' },
      update: {},
      create: {
        id: 'svc-pap',
        clinicId: clinic.id,
        name: 'Papanicolaou',
        price: 400,
        taxRate: 0,
        category: 'Estudios',
      },
    }),
    prisma.service.upsert({
      where: { id: 'svc-us-obstetrico' },
      update: {},
      create: {
        id: 'svc-us-obstetrico',
        clinicId: clinic.id,
        name: 'Ultrasonido obstétrico',
        price: 900,
        taxRate: 0,
        category: 'Estudios',
      },
    }),
  ])
  console.log(`✅ Services: 5`)

  // ── 5. Medications ───────────────────────────────────────────
  const meds = await Promise.all([
    prisma.medication.upsert({
      where: { id: 'med-acido-folico' },
      update: {},
      create: { id: 'med-acido-folico', name: 'Ácido fólico', presentation: 'tabletas', concentration: '5mg', category: 'Vitamina' },
    }),
    prisma.medication.upsert({
      where: { id: 'med-progesterona' },
      update: {},
      create: { id: 'med-progesterona', name: 'Progesterona', brandName: 'Utrogestan', presentation: 'cápsulas blandas', concentration: '200mg', category: 'Hormonal' },
    }),
    prisma.medication.upsert({
      where: { id: 'med-metformina' },
      update: {},
      create: { id: 'med-metformina', name: 'Metformina', brandName: 'Glucophage', presentation: 'tabletas', concentration: '850mg', category: 'Antidiabético' },
    }),
    prisma.medication.upsert({
      where: { id: 'med-ibuprofeno' },
      update: {},
      create: { id: 'med-ibuprofeno', name: 'Ibuprofeno', brandName: 'Advil', presentation: 'tabletas', concentration: '400mg', category: 'AINE' },
    }),
    prisma.medication.upsert({
      where: { id: 'med-fluconazol' },
      update: {},
      create: { id: 'med-fluconazol', name: 'Fluconazol', brandName: 'Diflucan', presentation: 'cápsulas', concentration: '150mg', category: 'Antifúngico' },
    }),
  ])
  console.log(`✅ Medications: ${meds.length}`)

  // ── 6. Patients ──────────────────────────────────────────────
  const patientData = [
    { firstName: 'Sofía', lastName: 'García López', phone: '+525511001001', dob: '1990-03-15', curp: 'GALS900315MDFPCF08' },
    { firstName: 'Valentina', lastName: 'Martínez Reyes', phone: '+525511001002', dob: '1985-07-22', curp: 'MARV850722MDFRYV09' },
    { firstName: 'Isabella', lastName: 'Hernández Cruz', phone: '+525511001003', dob: '1995-11-08', curp: 'HECI951108MDFRNZ01' },
    { firstName: 'Camila', lastName: 'López Flores', phone: '+525511001004', dob: '1988-02-14', curp: 'LOFC880214MDFPLN03' },
    { firstName: 'Luciana', lastName: 'González Ramos', phone: '+525511001005', dob: '1992-09-30', curp: 'GORL920930MDFNMC07' },
    { firstName: 'Mariana', lastName: 'Pérez Vega', phone: '+525511001006', dob: '1998-05-17', curp: 'PEVM980517MDFRGR04' },
    { firstName: 'Daniela', lastName: 'Torres Jiménez', phone: '+525511001007', dob: '1987-12-03', curp: 'TOJD871203MDFRMN02' },
    { firstName: 'Andrea', lastName: 'Ruiz Morales', phone: '+525511001008', dob: '2000-06-25', curp: 'RUMA000625MDFRZN06' },
    { firstName: 'Natalia', lastName: 'Díaz Sánchez', phone: '+525511001009', dob: '1993-08-11', curp: 'DASN930811MDFRNT05' },
    { firstName: 'Alejandra', lastName: 'Castro Mendoza', phone: '+525511001010', dob: '1980-01-28', curp: 'CAMA800128MDFRLN08' },
  ]

  const patients = await Promise.all(
    patientData.map((p, i) =>
      prisma.patient.upsert({
        where: { clinicId_phone: { clinicId: clinic.id, phone: p.phone } },
        update: {},
        create: {
          clinicId: clinic.id,
          firstName: p.firstName,
          lastName: p.lastName,
          phone: p.phone,
          dateOfBirth: new Date(p.dob),
          gender: 'FEMALE',
          bloodType: ['A_POS', 'O_POS', 'B_POS', 'AB_POS', 'O_NEG'][i % 5] as 'A_POS',
          curp: p.curp,
          city: 'Ciudad de México',
          state: 'CDMX',
          allergies: i % 3 === 0 ? ['Penicilina'] : [],
          chronicConditions: i % 4 === 0 ? ['Diabetes tipo 2'] : i % 5 === 0 ? ['Hipertensión'] : [],
          privacyConsentAt: new Date(),
          dataConsentAt: new Date(),
        },
      })
    )
  )
  console.log(`✅ Patients: ${patients.length}`)

  // ── 7. Appointments (30 spread across past and future) ───────
  const now = new Date()
  const appointments: Awaited<ReturnType<typeof prisma.appointment.create>>[] = []

  const apptConfigs = [
    // Past appointments (last 2 weeks) — COMPLETED
    ...Array.from({ length: 15 }, (_, i) => ({
      daysOffset: -(i + 1),
      hoursOffset: 9 + (i % 6),
      status: 'COMPLETED' as const,
      patientIdx: i % 10,
      doctorIdx: i % 2,
      typeIdx: i % 4,
    })),
    // Today — mix of statuses
    { daysOffset: 0, hoursOffset: 9, status: 'CONFIRMED' as const, patientIdx: 0, doctorIdx: 0, typeIdx: 0 },
    { daysOffset: 0, hoursOffset: 10, status: 'CHECKED_IN' as const, patientIdx: 1, doctorIdx: 0, typeIdx: 1 },
    { daysOffset: 0, hoursOffset: 11, status: 'SCHEDULED' as const, patientIdx: 2, doctorIdx: 0, typeIdx: 1 },
    { daysOffset: 0, hoursOffset: 12, status: 'SCHEDULED' as const, patientIdx: 3, doctorIdx: 1, typeIdx: 0 },
    { daysOffset: 0, hoursOffset: 14, status: 'SCHEDULED' as const, patientIdx: 4, doctorIdx: 0, typeIdx: 2 },
    // Future (next 2 weeks)
    ...Array.from({ length: 10 }, (_, i) => ({
      daysOffset: i + 1,
      hoursOffset: 9 + (i % 6),
      status: 'SCHEDULED' as const,
      patientIdx: (i + 5) % 10,
      doctorIdx: i % 2,
      typeIdx: i % 4,
    })),
  ]

  for (const cfg of apptConfigs) {
    const startsAt = new Date(now)
    startsAt.setDate(startsAt.getDate() + cfg.daysOffset)
    startsAt.setHours(cfg.hoursOffset, 0, 0, 0)
    const endsAt = new Date(startsAt.getTime() + 30 * 60_000)

    const patient = patients[cfg.patientIdx]!
    const doctor = cfg.doctorIdx === 0 ? doctor1 : doctor2
    const apptType = apptTypes[cfg.typeIdx]!

    const appt = await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentTypeId: apptType.id,
        startsAt,
        endsAt,
        status: cfg.status,
        mode: cfg.typeIdx === 3 ? 'TELEMEDICINE' : 'IN_PERSON',
        chiefComplaint: ['Revisión ginecológica de rutina', 'Control prenatal', 'Dolor pélvico', 'Flujo vaginal', 'Revisión de resultado'][cfg.patientIdx % 5],
      },
    })
    appointments.push(appt)
  }
  console.log(`✅ Appointments: ${appointments.length}`)

  // ── 8. Clinical Notes + Vital Signs (for completed appts) ────
  const completedAppts = appointments.filter((a) => a.status === 'COMPLETED').slice(0, 10)
  const notes = []

  for (const appt of completedAppts) {
    const note = await prisma.clinicalNote.create({
      data: {
        clinicId: clinic.id,
        patientId: appt.patientId,
        doctorId: appt.doctorId,
        appointmentId: appt.id,
        chiefComplaint: appt.chiefComplaint ?? 'Revisión ginecológica',
        physicalExam: {
          general: 'Paciente consciente, orientada, bien hidratada.',
          abdomen: 'Abdomen blando, no doloroso a la palpación.',
          gynecological: 'Genitales externos normales. Cuello uterino íntegro.',
        },
        diagnoses: [
          { code: 'Z01.4', description: 'Examen ginecológico (general)', type: 'PRIMARY' },
        ],
        treatmentPlan: 'Se indica control en 6 meses. Se solicita Papanicolaou.',
        evolutionNotes: 'Paciente asintomática. Sin hallazgos de relevancia.',
        status: 'SIGNED',
        signedAt: appt.endsAt,
        signedBy: appt.doctorId,
        vitalSigns: {
          create: {
            patientId: appt.patientId,
            weightKg: 55 + Math.random() * 25,
            heightCm: 155 + Math.random() * 20,
            systolicBp: 110 + Math.floor(Math.random() * 20),
            diastolicBp: 70 + Math.floor(Math.random() * 15),
            heartRateBpm: 65 + Math.floor(Math.random() * 20),
            temperatureC: 36.4 + Math.random() * 0.6,
            spo2Percent: 97 + Math.floor(Math.random() * 3),
          },
        },
      },
    })
    notes.push(note)
  }
  console.log(`✅ Clinical notes: ${notes.length}`)

  // ── 9. Prescriptions ─────────────────────────────────────────
  const rxPatients = patients.slice(0, 5)
  for (const patient of rxPatients) {
    const doctor = doctor1
    const note = notes.find((n) => n.patientId === patient.id)

    await prisma.prescription.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        doctorId: doctor.id,
        clinicalNoteId: note?.id,
        instructions: 'Tomar con abundante agua. Regresar si presenta molestias.',
        followUpDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: {
          create: [
            {
              medicationId: meds[0]!.id,
              medicationName: 'Ácido fólico',
              dose: '5mg',
              route: 'oral',
              frequency: '1 vez al día',
              duration: '3 meses',
              quantity: '90 tabletas',
              sortOrder: 0,
            },
            {
              medicationId: meds[1]!.id,
              medicationName: 'Progesterona',
              dose: '200mg',
              route: 'oral',
              frequency: 'cada 24 horas',
              duration: '1 mes',
              quantity: '30 cápsulas',
              instructions: 'Tomar por la noche',
              sortOrder: 1,
            },
          ],
        },
      },
    })
  }
  console.log(`✅ Prescriptions: ${rxPatients.length}`)

  // ── 10. Lab Results ──────────────────────────────────────────
  const labPatients = patients.slice(0, 6)
  for (const [i, patient] of labPatients.entries()) {
    await prisma.labResult.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        title: ['Biometría Hemática Completa', 'Química Sanguínea 6 elementos', 'Urocultivo', 'Papanicolaou', 'Ultrasonido Pélvico', 'Perfil Hormonal'][i]!,
        category: i < 3 ? 'LABORATORY' : i === 3 ? 'PATHOLOGY' : 'IMAGING',
        laboratoryName: ['Laboratorio Médico del Chopo', 'Laboratorio Salud Total', 'Lab Express'][i % 3],
        status: ['NOTIFIED', 'REVIEWED', 'RECEIVED', 'PENDING', 'NOTIFIED', 'RECEIVED'][i] as 'NOTIFIED',
        reportedAt: new Date(Date.now() - i * 3 * 24 * 60 * 60 * 1000),
      },
    })
  }
  console.log(`✅ Lab results: ${labPatients.length}`)

  // ── 11. Invoices ─────────────────────────────────────────────
  const invoicePatients = patients.slice(0, 8)
  for (const [i, patient] of invoicePatients.entries()) {
    const appt = appointments.find((a) => a.patientId === patient.id && a.status === 'COMPLETED')
    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`

    const statusOptions: ('PAID' | 'SENT' | 'PARTIALLY_PAID' | 'OVERDUE')[] = ['PAID', 'PAID', 'SENT', 'PARTIALLY_PAID', 'OVERDUE', 'PAID', 'SENT', 'PAID']
    const invoiceStatus = statusOptions[i]!

    const total = [800, 600, 1400, 800, 1800, 600, 800, 1200][i]!
    const paidAmount = invoiceStatus === 'PAID' ? total : invoiceStatus === 'PARTIALLY_PAID' ? total * 0.5 : 0

    await prisma.invoice.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        appointmentId: appt?.id,
        invoiceNumber,
        status: invoiceStatus,
        subtotal: total,
        taxAmount: 0,
        total,
        paidAmount,
        currency: 'MXN',
        issuedAt: new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000),
        paidAt: invoiceStatus === 'PAID' ? new Date() : undefined,
        items: {
          create: [{
            description: 'Consulta ginecológica',
            quantity: 1,
            unitPrice: total,
            taxRate: 0,
            taxAmount: 0,
            total,
          }],
        },
      },
    })
  }
  console.log(`✅ Invoices: ${invoicePatients.length}`)

  console.log('\n🎉 Seed completed successfully!')
  console.log('\n📋 Summary:')
  console.log(`   Clinic: ${clinic.name}`)
  console.log(`   Doctors: 2`)
  console.log(`   Patients: ${patients.length}`)
  console.log(`   Appointments: ${appointments.length}`)
  console.log(`   Clinical notes: ${notes.length}`)
  console.log(`   Prescriptions: ${rxPatients.length}`)
  console.log(`   Lab results: ${labPatients.length}`)
  console.log(`   Invoices: ${invoicePatients.length}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
