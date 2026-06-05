"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function MaintenanceProjectsRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/maintenance?view=projects")
  }, [router])

  return null
}
