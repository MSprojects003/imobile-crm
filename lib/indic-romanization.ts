const sinhalaConsonants: Record<string, string> = {
  ක: "k",
  ඛ: "kh",
  ග: "g",
  ඝ: "gh",
  ඞ: "ng",
  ඟ: "ng",
  ච: "ch",
  ඡ: "chh",
  ජ: "j",
  ඣ: "jh",
  ඤ: "ny",
  ඥ: "gn",
  ඦ: "j",
  ට: "t",
  ඨ: "th",
  ඩ: "d",
  ඪ: "dh",
  ණ: "n",
  ත: "th",
  ථ: "th",
  ද: "d",
  ධ: "dh",
  න: "n",
  ඳ: "nd",
  ප: "p",
  ඵ: "ph",
  බ: "b",
  භ: "bh",
  ම: "m",
  ඹ: "mb",
  ය: "y",
  ර: "r",
  ල: "l",
  ව: "v",
  ශ: "sh",
  ෂ: "sh",
  ස: "s",
  හ: "h",
  ළ: "l",
  ෆ: "f",
}

const sinhalaVowels: Record<string, string> = {
  අ: "a",
  ආ: "a",
  ඇ: "ae",
  ඈ: "ae",
  ඉ: "i",
  ඊ: "i",
  උ: "u",
  ඌ: "u",
  ඍ: "ru",
  ඎ: "ru",
  එ: "e",
  ඒ: "e",
  ඓ: "ai",
  ඔ: "o",
  ඕ: "o",
  ඖ: "au",
}

const sinhalaVowelSigns: Record<string, string> = {
  "ා": "a",
  "ැ": "ae",
  "ෑ": "ae",
  "ි": "i",
  "ී": "i",
  "ු": "u",
  "ූ": "u",
  "ෘ": "ru",
  "ෙ": "e",
  "ේ": "e",
  "ෛ": "ai",
  "ො": "o",
  "ෝ": "o",
  "ෞ": "au",
}

const tamilConsonants: Record<string, string> = {
  க: "k",
  ங: "ng",
  ச: "ch",
  ஜ: "j",
  ஞ: "ny",
  ட: "t",
  ண: "n",
  த: "t",
  ந: "n",
  ன: "n",
  ப: "p",
  ம: "m",
  ய: "y",
  ர: "r",
  ற: "r",
  ல: "l",
  ள: "l",
  ழ: "zh",
  வ: "v",
  ஶ: "sh",
  ஷ: "sh",
  ஸ: "s",
  ஹ: "h",
}

const tamilVowels: Record<string, string> = {
  அ: "a",
  ஆ: "a",
  இ: "i",
  ஈ: "i",
  உ: "u",
  ஊ: "u",
  எ: "e",
  ஏ: "e",
  ஐ: "ai",
  ஒ: "o",
  ஓ: "o",
  ஔ: "au",
}

const tamilVowelSigns: Record<string, string> = {
  "ா": "a",
  "ி": "i",
  "ீ": "i",
  "ு": "u",
  "ூ": "u",
  "ெ": "e",
  "ே": "e",
  "ை": "ai",
  "ொ": "o",
  "ோ": "o",
  "ௌ": "au",
}

const vowelSignMaps = [sinhalaVowelSigns, tamilVowelSigns]
const consonantMaps = [sinhalaConsonants, tamilConsonants]
const vowelMaps = [sinhalaVowels, tamilVowels]
const viramas = new Set(["්", "்"])
const nasalMarks: Record<string, string> = {
  "ං": "ng",
  "ஂ": "m",
}

export function romanizeSinhalaTamil(text: string): string | null {
  let result = ""
  let pendingConsonant = ""
  let convertedCharacters = 0

  for (const character of text) {
    const vowel = vowelMaps
      .map((map) => map[character])
      .find((mappedVowel) => mappedVowel !== undefined)
    if (vowel !== undefined) {
      if (pendingConsonant) result += `${pendingConsonant}a`
      pendingConsonant = ""
      result += vowel
      convertedCharacters += 1
      continue
    }

    const vowelSign = vowelSignMaps
      .map((map) => map[character])
      .find((mappedVowel) => mappedVowel !== undefined)
    if (vowelSign !== undefined) {
      if (pendingConsonant) result += pendingConsonant
      else result += "a"
      result += vowelSign
      pendingConsonant = ""
      convertedCharacters += 1
      continue
    }

    if (viramas.has(character)) {
      if (pendingConsonant) result += pendingConsonant
      pendingConsonant = ""
      convertedCharacters += 1
      continue
    }

    const consonant = consonantMaps
      .map((map) => map[character])
      .find((mappedConsonant) => mappedConsonant !== undefined)
    if (consonant !== undefined) {
      if (pendingConsonant) result += `${pendingConsonant}a`
      pendingConsonant = consonant
      convertedCharacters += 1
      continue
    }

    const nasal = nasalMarks[character]
    if (nasal !== undefined) {
      if (pendingConsonant) result += `${pendingConsonant}a`
      pendingConsonant = ""
      result += nasal
      convertedCharacters += 1
      continue
    }

    if (pendingConsonant) result += `${pendingConsonant}a`
    pendingConsonant = ""
    result += character
  }

  if (pendingConsonant) result += `${pendingConsonant}a`
  return convertedCharacters > 0 ? result : null
}
