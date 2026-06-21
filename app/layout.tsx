import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthGuard } from "@/components/auth-guard"
import "@/lib/api-client"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "LiftOps Elevators & Escalators | Enterprise Elevator & Escalator Management",
  description: "Comprehensive management system for elevator and escalator installations, maintenance, and operations",
  generator: "v0.app",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" themes={["light", "sunset", "frost", "dark"]} enableSystem={false} disableTransitionOnChange>
          <AuthGuard>
            {children}
          </AuthGuard>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
