import type { Metadata } from 'next'
import { Barlow_Condensed, Fira_Sans_Condensed } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const displayFont = Barlow_Condensed({
  variable: '--font-display',
  weight: ['700', '800'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
})

const bodyFont = Fira_Sans_Condensed({
  variable: '--font-body',
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Mirrorbook — Réservation en ligne',
  description:
    'Réservez votre prestation de lavage et détailing automobile en quelques clics.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="fr"
      className={`${displayFont.variable} ${bodyFont.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-aluminium text-charbon">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
