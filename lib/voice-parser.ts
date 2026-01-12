export type VoiceAction = "add" | "remove" | "hold" | "clear" | "unknown"

export interface ParsedVoiceCommand {
  action: VoiceAction
  quantity?: number
  terms?: string
}

const TAMIL_NUMBER_MAP: Record<string, number> = {
  "ஒன்று": 1,
  "ஒரு": 1,
  "ரெண்டு": 2,
  "இரண்டு": 2,
  "மூன்று": 3,
  "நான்கு": 4,
  "ஐந்து": 5,
  "ஆறு": 6,
  "ஏழு": 7,
  "எட்டு": 8,
  "ஒன்பது": 9,
  "பத்து": 10,
}

const ENGLISH_KEYWORDS = {
  add: ["add", "give", "need", "want", "include", "plus"],
  remove: ["remove", "delete", "minus", "take out"],
  hold: ["hold bill", "hold"],
  clear: ["clear", "reset"],
}

const TAMIL_KEYWORDS = {
  add: ["சேர்", "வேண்டும்", "போடு", "வாங்கு"],
  remove: ["அகற்று", "நீக்கு", "குறை"],
  hold: ["பில் ஹோல்ட்", "ஹோல்ட்"],
  clear: ["க்ளியர்", "திருத்து"],
}

const NUMBER_REGEX = /\b(\d+(?:\.\d+)?)\b/

export function parseVoiceCommand(transcript: string): ParsedVoiceCommand {
  const normalized = transcript.trim().toLowerCase()
  if (!normalized) {
    return { action: "unknown" }
  }

  const quantity = extractQuantity(normalized)
  const action = detectAction(normalized)
  const terms = extractProductTerms(normalized, action)

  return {
    action,
    quantity,
    terms,
  }
}

function extractQuantity(text: string): number | undefined {
  const numberMatch = text.match(NUMBER_REGEX)
  if (numberMatch) {
    return Number(numberMatch[1]) || undefined
  }

  for (const [key, value] of Object.entries(TAMIL_NUMBER_MAP)) {
    if (text.includes(key)) {
      return value
    }
  }

  return undefined
}

function detectAction(text: string): VoiceAction {
  const keywordSets = [ENGLISH_KEYWORDS, TAMIL_KEYWORDS]
  for (const set of keywordSets) {
    if (set.add.some((word) => text.includes(word))) return "add"
    if (set.remove.some((word) => text.includes(word))) return "remove"
    if (set.hold.some((word) => text.includes(word))) return "hold"
    if (set.clear.some((word) => text.includes(word))) return "clear"
  }
  return "add"
}

function extractProductTerms(text: string, action: VoiceAction): string | undefined {
  if (action === "hold" || action === "clear" || action === "unknown") return undefined

  // remove known keywords
  let cleaned = text
  const allKeywords = [
    ...ENGLISH_KEYWORDS.add,
    ...ENGLISH_KEYWORDS.remove,
    ...TAMIL_KEYWORDS.add,
    ...TAMIL_KEYWORDS.remove,
  ]
  for (const keyword of allKeywords) {
    const regex = new RegExp(keyword, "gi")
    cleaned = cleaned.replace(regex, "")
  }

  cleaned = cleaned.replace(NUMBER_REGEX, "")
  cleaned = cleaned.replace(/\b(pieces?|units?)\b/gi, "")
  cleaned = cleaned.replace(/[\s-]+/g, " ").trim()
  return cleaned || undefined
}
