// WhatsApp Business API service
// Handles all outbound WhatsApp messages from the platform

const BASE_URL = `https://graph.facebook.com/${process.env['WHATSAPP_API_VERSION'] ?? 'v19.0'}`
const PHONE_NUMBER_ID = process.env['WHATSAPP_PHONE_NUMBER_ID']!
const ACCESS_TOKEN = process.env['WHATSAPP_ACCESS_TOKEN']!

type MessagePayload =
  | { type: 'appointment_confirmation'; appointment: AppointmentLike }
  | { type: 'appointment_cancelled'; appointment: AppointmentLike; reason?: string }
  | { type: 'appointment_reminder'; appointment: AppointmentLike; hoursAhead: number }
  | { type: 'prescription'; pdfUrl: string; patientName: string }
  | { type: 'lab_result_ready'; patientName: string; title: string; fileUrl: string }
  | { type: 'payment_link'; patientName: string; invoiceNumber: string; amount: number; currency: string; paymentUrl: string }
  | { type: 'payment_status'; patientName: string; invoice: InvoiceLike | null }
  | { type: 'next_appointment'; patientName: string; appointment: AppointmentLike | null }
  | { type: 'latest_prescription'; patientName: string; pdfUrl: string | null; date: Date | null }
  | { type: 'latest_lab_result'; patientName: string; lab: LabLike | null }
  | { type: 'unknown_patient'; clinicName: string }
  | { type: 'help_menu'; patientName: string; clinicName: string }

interface AppointmentLike {
  startsAt: Date
  doctor?: { firstName: string; lastName: string }
  appointmentType?: { name: string } | null
}

interface InvoiceLike {
  invoiceNumber: string
  total: unknown
  paidAmount: unknown
  stripePaymentLinkUrl: string | null
  currency: string
}

interface LabLike {
  title: string
  fileUrl: string | null
  externalUrl?: string | null
  createdAt: Date
}

async function sendMessage(to: string, body: string): Promise<void> {
  const phone = to.replace(/\D/g, '')

  const response = await fetch(`${BASE_URL}/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: { body, preview_url: false },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`WhatsApp API error: ${response.status} ${err}`)
  }
}

async function sendDocument(to: string, docUrl: string, caption: string, filename: string): Promise<void> {
  const phone = to.replace(/\D/g, '')

  await fetch(`${BASE_URL}/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'document',
      document: { link: docUrl, caption, filename },
    }),
  })
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function sendWhatsAppMessage(to: string, payload: MessagePayload): Promise<void> {
  switch (payload.type) {
    case 'appointment_confirmation': {
      const { appointment } = payload
      const doctorName = appointment.doctor
        ? `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
        : 'su médico'
      const typeName = appointment.appointmentType?.name ?? 'Consulta'

      await sendMessage(
        to,
        `✅ *Cita confirmada*\n\n` +
        `📅 ${formatDate(appointment.startsAt)}\n` +
        `🕐 ${formatTime(appointment.startsAt)}\n` +
        `👨‍⚕️ ${doctorName}\n` +
        `📋 ${typeName}\n\n` +
        `Recibirá un recordatorio 24h y 1h antes de su cita.`
      )
      break
    }

    case 'appointment_cancelled': {
      const { appointment, reason } = payload
      await sendMessage(
        to,
        `❌ *Cita cancelada*\n\n` +
        `Su cita del ${formatDate(appointment.startsAt)} a las ${formatTime(appointment.startsAt)} ha sido cancelada.\n` +
        (reason ? `\nMotivo: ${reason}\n` : '') +
        `\nPor favor contáctenos para reagendar.`
      )
      break
    }

    case 'appointment_reminder': {
      const { appointment, hoursAhead } = payload
      const doctorName = appointment.doctor
        ? `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
        : 'su médico'

      await sendMessage(
        to,
        `⏰ *Recordatorio de cita*\n\n` +
        `Su cita es en ${hoursAhead} hora${hoursAhead !== 1 ? 's' : ''}:\n\n` +
        `📅 ${formatDate(appointment.startsAt)}\n` +
        `🕐 ${formatTime(appointment.startsAt)}\n` +
        `👨‍⚕️ ${doctorName}\n\n` +
        `Responda *CANCELAR* si no puede asistir.`
      )
      break
    }

    case 'prescription': {
      const { pdfUrl, patientName } = payload
      if (pdfUrl) {
        await sendDocument(
          to,
          pdfUrl,
          `📋 Hola ${patientName}, adjunto encontrará su receta médica.`,
          'Receta_Medica.pdf'
        )
      } else {
        await sendMessage(to, `📋 Hola ${patientName}, su receta está lista. Consulte con su médico.`)
      }
      break
    }

    case 'lab_result_ready': {
      const { patientName, title, fileUrl } = payload
      if (fileUrl) {
        await sendDocument(
          to,
          fileUrl,
          `🧪 Hola ${patientName}, sus resultados de *${title}* ya están disponibles.`,
          `${title.replace(/\s+/g, '_')}.pdf`
        )
      } else {
        await sendMessage(
          to,
          `🧪 Hola ${patientName}, sus resultados de *${title}* ya están disponibles. Consúltelos en su expediente.`
        )
      }
      break
    }

    case 'payment_link': {
      const { patientName, invoiceNumber, amount, currency, paymentUrl } = payload
      await sendMessage(
        to,
        `💳 *Pago pendiente*\n\n` +
        `Hola ${patientName},\n` +
        `Tiene un saldo pendiente por *$${amount.toFixed(2)} ${currency}*\n` +
        `Factura: ${invoiceNumber}\n\n` +
        `Puede pagar de forma segura aquí:\n${paymentUrl}`
      )
      break
    }

    case 'payment_status': {
      const { patientName, invoice } = payload
      if (!invoice) {
        await sendMessage(to, `✅ Hola ${patientName}, no tiene saldos pendientes.`)
      } else {
        const pending = Number(invoice.total) - Number(invoice.paidAmount)
        let msg = `💳 Hola ${patientName}, su saldo pendiente es *$${pending.toFixed(2)} ${invoice.currency}*\n` +
          `Factura: ${invoice.invoiceNumber}`
        if (invoice.stripePaymentLinkUrl) {
          msg += `\n\nPague aquí: ${invoice.stripePaymentLinkUrl}`
        }
        await sendMessage(to, msg)
      }
      break
    }

    case 'next_appointment': {
      const { patientName, appointment } = payload
      if (!appointment) {
        await sendMessage(to, `📅 Hola ${patientName}, no tiene citas próximas agendadas.`)
      } else {
        const doctorName = appointment.doctor
          ? `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
          : 'su médico'
        await sendMessage(
          to,
          `📅 Hola ${patientName}, su próxima cita es:\n\n` +
          `${formatDate(appointment.startsAt)} a las ${formatTime(appointment.startsAt)}\n` +
          `con ${doctorName}`
        )
      }
      break
    }

    case 'latest_prescription': {
      const { patientName, pdfUrl, date } = payload
      if (pdfUrl) {
        await sendDocument(to, pdfUrl, `📋 Hola ${patientName}, aquí está su última receta médica.`, 'Receta.pdf')
      } else {
        await sendMessage(to, `📋 Hola ${patientName}, no tiene recetas disponibles.`)
      }
      break
    }

    case 'latest_lab_result': {
      const { patientName, lab } = payload
      if (!lab) {
        await sendMessage(to, `🧪 Hola ${patientName}, no tiene resultados de laboratorio disponibles.`)
      } else {
        const url = lab.fileUrl ?? lab.externalUrl
        if (url) {
          await sendDocument(to, url, `🧪 Hola ${patientName}, aquí están sus resultados de *${lab.title}*.`, `${lab.title}.pdf`)
        } else {
          await sendMessage(to, `🧪 Hola ${patientName}, sus resultados de *${lab.title}* están disponibles. Consulte con su médico.`)
        }
      }
      break
    }

    case 'unknown_patient': {
      const { clinicName } = payload
      await sendMessage(
        to,
        `Hola 👋 Le escribe ${clinicName}.\n\n` +
        `No encontramos su número en nuestro sistema.\n` +
        `Llame a nuestra recepción o escríbanos para registrarse.`
      )
      break
    }

    case 'help_menu': {
      const { patientName, clinicName } = payload
      await sendMessage(
        to,
        `Hola ${patientName} 👋 Soy el asistente de ${clinicName}.\n\n` +
        `Puedo ayudarle con:\n` +
        `📅 *CITA* — Ver su próxima cita\n` +
        `📋 *RECETA* — Ver su última receta\n` +
        `🧪 *RESULTADO* — Ver resultados de laboratorio\n` +
        `💳 *PAGO* — Ver saldo pendiente\n\n` +
        `Escriba una de las palabras clave.`
      )
      break
    }
  }
}
