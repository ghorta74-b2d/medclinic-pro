import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env['RESEND_API_KEY'])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nombre, email, telefono, clinica, mensaje } = body

    if (!nombre || !email || !telefono) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const { error } = await resend.emails.send({
      from: 'MediaClinic Demo <onboarding@resend.dev>',
      to: ['mediaclinic@b2d.mx'],
      replyTo: email,
      subject: `Solicitud de demo — ${nombre}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;background:#fff;">
          <img src="https://mediaclinic.mx/logo-color.svg" alt="MediaClinic" style="height:36px;margin-bottom:32px;" />
          <h2 style="font-size:24px;font-weight:600;color:#1d1d1f;margin:0 0 8px;">Nueva solicitud de demo</h2>
          <p style="font-size:15px;color:#6e6e73;margin:0 0 32px;">Un médico quiere conocer MediaClinic.</p>

          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:12px 0;border-bottom:1px solid #d2d2d7;font-size:13px;color:#6e6e73;width:130px;">Nombre</td><td style="padding:12px 0;border-bottom:1px solid #d2d2d7;font-size:15px;color:#1d1d1f;font-weight:500;">${nombre}</td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #d2d2d7;font-size:13px;color:#6e6e73;">Correo</td><td style="padding:12px 0;border-bottom:1px solid #d2d2d7;font-size:15px;color:#0071e3;"><a href="mailto:${email}" style="color:#0071e3;">${email}</a></td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #d2d2d7;font-size:13px;color:#6e6e73;">Teléfono</td><td style="padding:12px 0;border-bottom:1px solid #d2d2d7;font-size:15px;color:#1d1d1f;">${telefono}</td></tr>
            ${clinica ? `<tr><td style="padding:12px 0;border-bottom:1px solid #d2d2d7;font-size:13px;color:#6e6e73;">Clínica</td><td style="padding:12px 0;border-bottom:1px solid #d2d2d7;font-size:15px;color:#1d1d1f;">${clinica}</td></tr>` : ''}
            ${mensaje ? `<tr><td style="padding:12px 0;font-size:13px;color:#6e6e73;vertical-align:top;">Mensaje</td><td style="padding:12px 0;font-size:15px;color:#1d1d1f;line-height:1.6;">${mensaje}</td></tr>` : ''}
          </table>

          <div style="margin-top:32px;padding:16px 20px;background:#f5f5f7;border-radius:12px;">
            <p style="font-size:13px;color:#6e6e73;margin:0;">Responde directamente a este correo para contactar a ${nombre}.</p>
          </div>
          <p style="font-size:11px;color:#aeaeb2;margin-top:32px;">MediaClinic · B2D Automation · © 2026</p>
        </div>
      `,
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
