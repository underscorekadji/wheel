import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wheel - Presenter Selection App',
  description: 'Real-time spinning wheel app for presenter selection',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}