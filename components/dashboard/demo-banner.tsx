"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"

export function DemoBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = sessionStorage.getItem("demo_banner_dismissed")
    if (!dismissed) {
      setVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem("demo_banner_dismissed", "true")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-orange-500/20 bg-orange-500/10 px-4 py-3">
      <p className="text-sm text-orange-300">
        👋 You&apos;re in Demo Mode — all data is sample data. Questions?{" "}
        <a href="mailto:mhmdemad737@gmail.com" className="underline underline-offset-2 hover:text-orange-200">
          Contact us
        </a>
      </p>
      <button
        onClick={handleDismiss}
        className="ml-4 shrink-0 rounded-md p-1 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
