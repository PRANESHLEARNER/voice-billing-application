import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/hooks/use-auth"
import { LanguageProvider } from "@/contexts/language-context"
import { Suspense } from "react"
import { ThemeScript } from "./theme-script"
import "./globals.css"

export const metadata: Metadata = {
  title: "Supermarket POS System",
  description: "Professional Point of Sale System for Supermarkets",
  generator: "SuperMarket",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={<div>Loading...</div>}>
          <LanguageProvider>
            <AuthProvider>
              <ThemeScript />
              {children}
            </AuthProvider>
          </LanguageProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
