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
    "walk_in_customer": "Walk-in Customer",
    // Client Data Intake
    "client_data_title": "Client Data Intake",
    "client_data_subtitle": "Complete your business setup to unlock billing features",
    "step_business": "Business Profile",
    "step_business_desc": "Store information",
    "step_tax": "Tax & Pricing",
    "step_tax_desc": "Tax configuration",
    "step_items": "Item Master",
    "step_items_desc": "Product catalog",
    "step_receipt": "Receipt Sample",
    "step_receipt_desc": "Bill format",
    "step_review": "Review",
    "step_review_desc": "Submit for approval",
    "store_name": "Store Name",
    "contact_name": "Contact Name",
    "contact_phone": "Contact Phone",
    "contact_email": "Contact Email",
    "tax_regime": "Tax Regime",
    "gstin": "GSTIN",
    "rounding_preference": "Rounding Preference",
    "upload_sku_list": "Upload SKU List",
    "upload_tax_proof": "Upload Tax Proof",
    "upload_receipt_sample": "Upload Receipt Sample",
    "use_system_default": "Use System Default",
    "custom_receipt_notes": "Custom Receipt Notes",
    "save_draft": "Save Draft",
    "next": "Next",
    "back": "Back",
    "submit": "Submit for Review",
    "refresh": "Refresh",
    "validation_required": "This field is required",
    "validation_email": "Please enter a valid email address",
    "validation_phone": "Please enter a valid phone number",
    "validation_gstin": "Please enter a valid GSTIN format"
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
    "walk_in_customer": "நேரடி வாடிக்கையாளர்",
    // Client Data Intake
    "client_data_title": "வாடிக்கையாளர் தரவு உள்வாங்கல்",
    "client_data_subtitle": "பில்லிங் அம்சங்களை செயல்படுத்த உங்கள் வணிக அமைப்பை முடிக்கவும்",
    "step_business": "வணிக சுயவிவரம்",
    "step_business_desc": "கடை தகவல்",
    "step_tax": "வரி மற்றும் விலை",
    "step_tax_desc": "வரி உள்ளமைப்பு",
    "step_items": "பொருள் முதன்மை",
    "step_items_desc": "தயாரிப்பு கேட்லாக்",
    "step_receipt": "ரசீது மாதிரி",
    "step_receipt_desc": "பில் வடிவம்",
    "step_review": "மதிப்பாய்வு",
    "step_review_desc": "அங்கீகாரத்திற்கு சமர்ப்பிக்கவும்",
    "store_name": "கடை பெயர்",
    "contact_name": "தொடர்பு பெயர்",
    "contact_phone": "தொடர்பு தொலைபேசி",
    "contact_email": "தொடர்பு மின்னஞ்சல்",
    "tax_regime": "வரி அரசு",
    "gstin": "GSTIN",
    "rounding_preference": "சுற்றளவு விருப்பம்",
    "upload_sku_list": "SKU பட்டியலை பதிவேற்றவும்",
    "upload_tax_proof": "வரி ஆதாரத்தை பதிவேற்றவும்",
    "upload_receipt_sample": "ரசீது மாதிரியை பதிவேற்றவும்",
    "use_system_default": "கணினி இயல்புநிலையைப் பயன்படுத்தவும்",
    "custom_receipt_notes": "தனிப்பயன் ரசீது குறிப்புகள்",
    "save_draft": "வரைவை சேமிக்கவும்",
    "next": "அடுத்து",
    "back": "பின்",
    "submit": "மதிப்பாய்வுக்கு சமர்ப்பிக்கவும்",
    "refresh": "புதுப்பிக்கவும்",
    "validation_required": "இந்த புலம் தேவை",
    "validation_email": "சரியான மின்னஞ்சல் முகவரியை உள்ளிடவும்",
    "validation_phone": "சரியான தொலைபேசி எண்ணை உள்ளிடவும்",
    "validation_gstin": "சரியான GSTIN வடிவத்தை உள்ளிடவும்"
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
    "walk_in_customer": "Walk-in Customer",
    // Client Data Intake
    "client_data_title": "Client Data Intake",
    "client_data_subtitle": "Complete your business setup to unlock billing features",
    "step_business": "Business Profile",
    "step_business_desc": "Store information",
    "step_tax": "Tax & Pricing",
    "step_tax_desc": "Tax configuration",
    "step_items": "Item Master",
    "step_items_desc": "Product catalog",
    "step_receipt": "Receipt Sample",
    "step_receipt_desc": "Bill format",
    "step_review": "Review",
    "step_review_desc": "Submit for approval",
    "store_name": "Store Name",
    "contact_name": "Contact Name",
    "contact_phone": "Contact Phone",
    "contact_email": "Contact Email",
    "tax_regime": "Tax Regime",
    "gstin": "GSTIN",
    "rounding_preference": "Rounding Preference",
    "upload_sku_list": "Upload SKU List",
    "upload_tax_proof": "Upload Tax Proof",
    "upload_receipt_sample": "Upload Receipt Sample",
    "use_system_default": "Use System Default",
    "custom_receipt_notes": "Custom Receipt Notes",
    "save_draft": "Save Draft",
    "next": "Next",
    "back": "Back",
    "submit": "Submit for Review",
    "refresh": "Refresh",
    "validation_required": "This field is required",
    "validation_email": "Please enter a valid email address",
    "validation_phone": "Please enter a valid phone number",
    "validation_gstin": "Please enter a valid GSTIN format"
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
