"use client"

import { createContext, useContext, useState, ReactNode } from "react"

export type Language = "en" | "ta" | "bilingual"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
  en: {
    // Bill headers
    "supermarket_store": "SUPERMARKET STORE",
    "bill": "BILL",
    "date": "DATE",
    "cashier": "CASHIER",
    "customer": "CUSTOMER",
    "phone": "PHONE",
    "email": "EMAIL",
    "items": "ITEMS",
    "subtotal": "SUBTOTAL",
    "loyalty_discount": "LOYALTY DISCOUNT",
    "total_tax": "TOTAL TAX",
    "round_off": "ROUND OFF",
    "total": "TOTAL",
    "payment_method": "PAYMENT METHOD",
    "cash_tendered": "CASH TENDERED",
    "change": "CHANGE",
    "thank_you": "THANK YOU FOR YOUR PURCHASE!",
    "please_visit_again": "PLEASE VISIT AGAIN",
    "paid": "*** PAID ***",
    "walk_in_customer": "Walk-in Customer"
  },
  ta: {
    // Bill headers
    "supermarket_store": "சூப்பர்மார்க்கெட் ஸ்டோர்",
    "bill": "பில்",
    "date": "தேதி",
    "cashier": "பணம் வசூலிப்பவர்",
    "customer": "வாடிக்கையாளர்",
    "phone": "தொலைபேசி",
    "email": "மின்னஞ்சல்",
    "items": "பொருட்கள்",
    "subtotal": "மொத்தம்",
    "loyalty_discount": "விசுவாசத் தள்ளுபடி",
    "total_tax": "மொத்த வரி",
    "round_off": "சுற்றளவு",
    "total": "மொத்தம்",
    "payment_method": "கட்டண முறை",
    "cash_tendered": "பணம் கொடுக்கப்பட்டது",
    "change": "மாற்றுத் தொகை",
    "thank_you": "உங்கள் கொள்முதலுக்கு நன்றி!",
    "please_visit_again": "மீண்டும் வருகையிடுங்கள்",
    "paid": "*** செலுத்தப்பட்டது ***",
    "walk_in_customer": "நேரடி வாடிக்கையாளர்"
  },
  bilingual: {
    // Bilingual - return English for UI (PDF handles bilingual separately)
    "supermarket_store": "SUPERMARKET STORE",
    "bill": "BILL",
    "date": "DATE",
    "cashier": "CASHIER",
    "customer": "CUSTOMER",
    "phone": "PHONE",
    "email": "EMAIL",
    "items": "ITEMS",
    "subtotal": "SUBTOTAL",
    "loyalty_discount": "LOYALTY DISCOUNT",
    "total_tax": "TOTAL TAX",
    "round_off": "ROUND OFF",
    "total": "TOTAL",
    "payment_method": "PAYMENT METHOD",
    "cash_tendered": "CASH TENDERED",
    "change": "CHANGE",
    "thank_you": "THANK YOU FOR YOUR PURCHASE!",
    "please_visit_again": "PLEASE VISIT AGAIN",
    "paid": "*** PAID ***",
    "walk_in_customer": "Walk-in Customer"
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en")

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.en] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
