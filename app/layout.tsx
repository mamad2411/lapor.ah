import React from "react"
import type { Metadata } from 'next'
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { ScrollToTop } from "@/components/scroll-to-top"
import { SuperadminGate } from "@/components/superadmin/superadmin-gate"
import { ServiceWorkerCleaner } from "@/components/sw-cleaner"
import './globals.css'

const instrumentSans = Instrument_Sans({ 
  subsets: ["latin"],
  variable: '--font-instrument'
});

const instrumentSerif = Instrument_Serif({ 
  subsets: ["latin"],
  weight: "400",
  variable: '--font-instrument-serif'
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: '--font-jetbrains'
});

export const metadata: Metadata = {
  title: 'Lapor.ah — Platform Pelaporan Masyarakat Desa',
  description:
    'Laporkan masalah desa, pantau tindak lanjut, dan bantu pemerintah desa merespons lebih cepat. Gratis untuk warga.',
  keywords: ['pengaduan masyarakat', 'desa', 'laporan warga', 'pemerintah desa', 'Lapor.ah'],
  icons: {
    icon: [
      { url: '/favicon_io_laporah/favicon.ico' },
      { url: '/favicon_io_laporah/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon_io_laporah/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/favicon_io_laporah/apple-touch-icon.png' },
    ],
    other: [
      { rel: 'manifest', url: '/favicon_io_laporah/site.webmanifest' },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${instrumentSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ServiceWorkerCleaner />
          <ScrollToTop />
          <SuperadminGate />
          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
