"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

const features = [
  { icon: "🏗️", title: "Projects", desc: "Track elevator installation projects and timelines" },
  { icon: "🔧", title: "Maintenance", desc: "Schedule and manage maintenance visits (61 scheduled)" },
  { icon: "👥", title: "Clients", desc: "Manage client contracts and contact info" },
  { icon: "📦", title: "Inventory", desc: "Track spare parts and get low stock alerts" },
  { icon: "👨‍🔧", title: "Technicians", desc: "Assign technicians to jobs and track performance" },
  { icon: "🚨", title: "Emergency Tickets", desc: "Handle urgent breakdown requests" },
]

export function OnboardingOverlay() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem("demo_onboarding_seen")
    if (!seen) {
      setOpen(true)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem("demo_onboarding_seen", "true")
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-lg rounded-xl border border-border bg-[#1a1a2e] p-6 shadow-2xl sm:p-8">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            🎯 Demo Mode
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            Welcome to LiftOps
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what you can explore in this demo
          </p>
        </div>

        <div className="mb-6 space-y-3">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg bg-black/20 p-3">
              <span className="mt-0.5 text-lg">{f.icon}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-primary/10 bg-primary/5 p-4 text-center">
          <p className="mb-3 text-xs text-muted-foreground">
            All data in this demo is pre-filled for realistic experience
          </p>
          <Button onClick={handleClose} className="w-full">
            Start Exploring →
          </Button>
          <a
            href="mailto:mhmdemad737@gmail.com"
            className="mt-2 inline-block text-xs text-muted-foreground underline underline-offset-2 hover:text-primary"
          >
            Book a real demo
          </a>
        </div>
      </div>
    </div>
  )
}
