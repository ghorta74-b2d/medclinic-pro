import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env['RESEND_API_KEY'])

function buildDemoEmail(opts: {
  nombre: string
  email: string
  telefono: string
  clinica?: string
  mensaje?: string
}) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:40px 20px;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">

      <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 24px rgba(0,0,0,0.08);max-width:100%">

        <!-- Header / Logo -->
        <tr>
          <td style="padding:32px 40px 28px;border-bottom:1px solid #f3f4f6;text-align:center">
            <img src="https://mediaclinic.mx/logo-color.svg"
                 alt="Mediaclinic"
                 width="160"
                 style="height:auto;display:block;margin:0 auto">
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px">
            <p style="margin:0 0 8px;font-size:24px;font-weight:600;color:#111827;letter-spacing:-0.3px">Nueva solicitud de demo</p>
            <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.7">Un médico quiere conocer Mediaclinic.</p>

            <!-- Data table -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;font-size:13px;color:#9ca3af;width:130px;vertical-align:top">Nombre</td>
                <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;font-size:15px;color:#111827;font-weight:500">${opts.nombre}</td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;font-size:13px;color:#9ca3af;vertical-align:top">Correo</td>
                <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;font-size:15px">
                  <a href="mailto:${opts.email}" style="color:#0071e3;text-decoration:none">${opts.email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;font-size:13px;color:#9ca3af;vertical-align:top">Teléfono</td>
                <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;font-size:15px;color:#111827">${opts.telefono}</td>
              </tr>
              ${opts.clinica ? `
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;font-size:13px;color:#9ca3af;vertical-align:top">Clínica</td>
                <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;font-size:15px;color:#111827">${opts.clinica}</td>
              </tr>` : ''}
              ${opts.mensaje ? `
              <tr>
                <td style="padding:12px 0;font-size:13px;color:#9ca3af;vertical-align:top">Mensaje</td>
                <td style="padding:12px 0;font-size:15px;color:#111827;line-height:1.6">${opts.mensaje}</td>
              </tr>` : ''}
            </table>

            <!-- Reply hint -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px">
              <tr>
                <td style="padding:16px 20px">
                  <p style="margin:0;font-size:13px;color:#6b7280">Responde directamente a este correo para contactar a <strong style="color:#111827">${opts.nombre}</strong>.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #f3f4f6;text-align:center">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.7">
              Mediaclinic · Plataforma de gestión clínica
            </p>
          </td>
        </tr>

      </table>

      <p style="margin-top:24px;font-size:12px;color:#9ca3af;text-align:center">
        © 2026 Mediaclinic · mediaclinic.mx
      </p>

    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nombre, email, telefono, clinica, mensaje } = body

    if (!nombre || !email || !telefono) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const { error } = await resend.emails.send({
      from: 'Mediaclinic <noreply@mediaclinic.mx>',
      to: ['mediaclinic@b2d.mx'],
      replyTo: email,
      subject: `Solicitud de demo — ${nombre}`,
      html: buildDemoEmail({ nombre, email, telefono, clinica, mensaje }),
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: 'Error enviando email' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Demo route error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
