import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'timmy-context',
  description: 'Reminder context dashboard for Timmy',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" style={{ height: '100%' }}>
      <body style={{ minHeight: '100%', margin: 0 }}>{children}</body>
    </html>
  )
}
