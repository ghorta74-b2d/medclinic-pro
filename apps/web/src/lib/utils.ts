import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, fmt = 'd MMM yyyy'): string {
  return format(new Date(date), fmt, { locale: es })
}

export function formatTime(date: string | Date): string {
  return format(new Date(date), 'HH:mm', { locale: es })
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "d MMM yyyy 'a las' HH:mm", { locale: es })
}

export function formatRelative(date: string | Date): string {
  const d = new Date(date)
  if (isToday(d)) return `Hoy ${formatTime(d)}`
  if (isTomorrow(d)) return `Mañana ${formatTime(d)}`
  if (isYesterday(d)) return `Ayer ${formatTime(d)}`
  return formatDistanceToNow(d, { addSuffix: true, locale: es })
}

export function formatCurrency(
  amount: number,
  currency = 'MXN',
  locale = 'es-MX'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function fullName(first: string, last: string): string {
  return `${first} ${last}`
}

export function calculateAge(dateOfBirth: string | Date): number {
  // Use UTC methods so the stored UTC timestamp is compared consistently
  const birth = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getUTCFullYear() - birth.getUTCFullYear()
  const m = today.getUTCMonth() - birth.getUTCMonth()
  if (m < 0 || (m === 0 && today.getUTCDate() < birth.getUTCDate())) {
    age--
  }
  return age
}

/** Returns YYYY-MM-DD in the local timezone — safe replacement for toISOString().split('T')[0] */
export function localDateStr(d: Date): string {
  return d.toLocaleDateString('sv-SE')
}
