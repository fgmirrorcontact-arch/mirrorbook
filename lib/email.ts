import { Resend } from 'resend'

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? 'Mirrorbook <bonjour@mirrorbook.fr>'

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export const ADMIN_EMAIL =
  process.env.ADMIN_NOTIFICATION_EMAIL ?? ''

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) return
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html })
  } catch (err) {
    console.error('[email] erreur envoi', subject, err)
  }
}
