export function buildInviteEmail(opts: {
  firstName: string
  email: string
  role: string
  actionLink: string
  isResend?: boolean
}) {
  const roleLabel = opts.role === 'ADMIN' ? 'Administrador' : opts.role === 'DOCTOR' ? 'Médico' : 'Administrativo'
  const body = opts.isResend
    ? 'Tu administrador te reenvió el acceso. Haz clic en el botón para establecer tu contraseña.'
    : 'Has sido invitado a unirte a <strong>MedClinic PRO</strong>. Haz clic en el botón para activar tu cuenta y establecer tu contraseña.'

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:36px 40px;text-align:center">
            <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px">MedClinic PRO</p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75)">Plataforma de gestión clínica</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 28px">
            <p style="margin:0 0 6px;font-size:22px;font-weight:600;color:#1e1b4b">Hola ${opts.firstName},</p>
            <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.65">${body}</p>

            <!-- CTA button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 32px">
              <tr>
                <td style="background:#7c3aed;border-radius:10px">
                  <a href="${opts.actionLink}"
                     style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.2px">
                    ${opts.isResend ? 'Establecer contraseña →' : 'Activar mi cuenta →'}
                  </a>
                </td>
              </tr>
            </table>

            <!-- Info card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7ff;border:1px solid #e8e4fb;border-radius:10px;padding:18px 20px">
              <tr>
                <td>
                  <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.8px">Tus datos de acceso</p>
                  <p style="margin:0 0 5px;font-size:13px;color:#374151">📧 &nbsp;<strong>${opts.email}</strong></p>
                  <p style="margin:0;font-size:13px;color:#374151">👤 &nbsp;${roleLabel}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #f3f4f6;text-align:center">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6">
              El enlace expira en 24 horas.<br>
              Si no esperabas esta invitación, puedes ignorar este mensaje.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendResendEmail(opts: {
  to: string | string[]
  subject: string
  html: string
}) {
  const resendKey = process.env['RESEND_API_KEY']
  if (!resendKey) return
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'MedClinic PRO <medclinic@glasshaus.mx>',
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  })
}
