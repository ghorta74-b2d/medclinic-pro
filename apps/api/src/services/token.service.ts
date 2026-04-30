import crypto from 'crypto'

export function generateResetToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  return { token, tokenHash }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function getTokenExpiry(hours = 1): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}
