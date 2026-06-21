"use client"

import { useTranslation } from "@/lib/i18n/context"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"

export function LanguageToggle() {
  const { locale, setLocale } = useTranslation()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(locale === "en" ? "ar" : "en")}
      className="w-full justify-start gap-2"
    >
      <Globe className="h-4 w-4" />
      {locale === "en" ? "العربية" : "English"}
    </Button>
  )
}
