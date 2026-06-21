"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { Locale, Translations } from "./types"
import { en } from "./en"
import { ar } from "./ar"

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translations
  dir: "ltr" | "rtl"
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en")

  useEffect(() => {
    const stored = localStorage.getItem("locale") as Locale | null
    if (stored === "ar" || stored === "en") {
      setLocaleState(stored)
    }
  }, [])

  const setLocale = useCallback((locale: Locale) => {
    setLocaleState(locale)
    localStorage.setItem("locale", locale)
  }, [])

  const t = locale === "ar" ? ar : en
  const dir = locale === "ar" ? "rtl" : "ltr"

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useTranslation must be used within LanguageProvider")
  return ctx
}
