"use client"

import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"
import { Languages } from "lucide-react"

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex items-center gap-2">
      <Languages className="h-4 w-4" />
      <div className="flex gap-1">
        <Button
          variant={language === "en" ? "default" : "outline"}
          size="sm"
          onClick={() => setLanguage("en")}
        >
          English
        </Button>
        <Button
          variant={language === "ta" ? "default" : "outline"}
          size="sm"
          onClick={() => setLanguage("ta")}
        >
          தமிழ்
        </Button>
      </div>
    </div>
  )
}
