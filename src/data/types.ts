export interface KanjiEntry {
  id: string
  character: string
  meanings: string[]
  onReadings: string[]
  kunReadings: string[]
  jlpt: number
  grade: number
  strokeCount: number
  frequency: number
  examples: { word: string; reading: string; meaning: string }[]
  strokeOrder: string[]
}

export interface VocabEntry {
  id: string
  word: string
  reading: string
  meanings: string[]
  jlpt: number
  partOfSpeech: string
  examples: { ja: string; en: string }[]
}

export interface KanaEntry {
  id: string
  character: string
  romaji: string
  type: 'hiragana' | 'katakana'
  group: string
  strokeOrder: string[]
}

export type CardType = 'kanji' | 'vocab' | 'kana'
export type JLPTLevel = 1 | 2 | 3 | 4 | 5
