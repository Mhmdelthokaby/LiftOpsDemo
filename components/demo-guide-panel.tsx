"use client"

import { useState } from "react"
import { X, HelpCircle } from "lucide-react"

interface Feature {
  icon: string
  label: string
  description: string
}

interface DemoGuidePanelProps {
  title: string
  description: string
  features: Feature[]
  tip?: string
}

export function DemoGuidePanel({ title, description, features, tip }: DemoGuidePanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed right-0 top-0 z-50 h-full w-80 border-l border-border bg-card shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 p-4">
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>

            <div className="space-y-3">
              {features.map((f, i) => (
                <div key={i} className="rounded-lg border border-border bg-black/10 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{f.icon}</span>
                    <span className="text-sm font-semibold text-foreground">{f.label}</span>
                  </div>
                  <p className="mt-1 pl-7 text-xs text-muted-foreground">{f.description}</p>
                </div>
              ))}
            </div>

            {tip && (
              <div className="mt-6 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <p className="text-xs font-medium text-destructive">💡 Pro Tip</p>
                <p className="mt-1 text-xs text-muted-foreground">{tip}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-destructive text-white shadow-lg transition-transform hover:scale-110 hover:bg-destructive/90"
        title="Help"
      >
        <HelpCircle className="h-5 w-5" />
      </button>
    </>
  )
}
