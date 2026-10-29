import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Growth Intelligence Challenge',
  description: 'Jogo de Growth com 6 fases sobre aquisição, engajamento e monetização',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/rocket.svg', type: 'image/svg+xml' }],
    shortcut: '/rocket.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#00a859',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  )
}
