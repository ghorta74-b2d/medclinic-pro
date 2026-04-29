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
    : `Has sido invitada a <strong>Mediaclinic</strong>. Haz clic en el botón de abajo para activar tu cuenta y crear tu contraseña.`

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
            <p style="margin:0 0 8px;font-size:24px;font-weight:600;color:#111827;letter-spacing:-0.3px">Hola ${opts.firstName},</p>
            <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.7">${body}</p>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 36px">
              <tr>
                <td style="background:#0071e3;border-radius:12px">
                  <a href="${opts.actionLink}"
                     style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.1px">
                    ${opts.isResend ? 'Establecer contraseña →' : 'Activar mi cuenta →'}
                  </a>
                </td>
              </tr>
            </table>

            <!-- Info card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px">
              <tr>
                <td style="padding:20px 24px">
                  <p style="margin:0 0 12px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Tus datos de acceso</p>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:3px 0;font-size:13px;color:#374151">
                        <span style="color:#9ca3af;margin-right:8px">Correo</span>
                        <strong style="color:#111827">${opts.email}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:3px 0;font-size:13px;color:#374151">
                        <span style="color:#9ca3af;margin-right:8px">Rol</span>
                        <strong style="color:#111827">${roleLabel}</strong>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #f3f4f6;text-align:center">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.7">
              El enlace expira en 24 horas.<br>
              Si no esperabas esta invitación, puedes ignorar este mensaje.
            </p>
          </td>
        </tr>

      </table>

      <p style="margin-top:24px;font-size:12px;color:#9ca3af;text-align:center">
        © 2025 Mediaclinic · mediaclinic.mx
      </p>

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
      from: 'Mediaclinic <noreply@mediaclinic.mx>',
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  })
}
