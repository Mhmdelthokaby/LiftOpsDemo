"use client"

import { useEffect } from "react"
import { useTranslation } from "@/lib/i18n/context"

export function HtmlLangDir() {
  const { locale, dir } = useTranslation()

  useEffect(() => {
    document.documentElement.dir = dir
    document.documentElement.lang = locale
  }, [locale, dir])

  return null
}
