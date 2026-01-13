"use client"

export interface VoiceSynonymEntry {
  canonical: string
  matchers: string[]
}

export const VOICE_SYNONYMS: VoiceSynonymEntry[] = [
  {
    canonical: "milk",
    matchers: ["paal", "pal", "பால்", "milk packet", "taza milk"],
  },
  {
    canonical: "curd",
    matchers: ["thayir", "தயிர்", "yogurt"],
  },
  {
    canonical: "rice",
    matchers: ["arisi", "அரிசி", "rice bag", "samba rice", "ponni"],
  },
  {
    canonical: "sugar",
    matchers: ["sakkarai", "சர்க்கரை", "cheeni"],
  },
  {
    canonical: "oil",
    matchers: ["ennai", "எண்ணெய்", "cooking oil", "sunflower oil", "chekku"],
  },
  {
    canonical: "soap",
    matchers: ["saboon", "சோப்பு", "bath bar"],
  },
  {
    canonical: "dal",
    matchers: ["paruppu", "பருப்பு", "lentils"],
  },
  {
    canonical: "tea",
    matchers: ["chai", "tea powder", "தேநீர்"],
  },
  {
    canonical: "coffee",
    matchers: ["kaapi", "காபி", "coffee powder"],
  },
]
