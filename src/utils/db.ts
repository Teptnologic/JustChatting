import Dexie, { type Table } from 'dexie'

export interface FlashcardProgress {
  id?: number
  cardId: string
  cardType: 'kanji' | 'vocab' | 'kana'
  easeFactor: number
  interval: number
  repetitions: number
  nextReview: number
  lastReview: number
  score: number
  streak: number
  totalAttempts: number
  correctAttempts: number
}

export interface QuizHistory {
  id?: number
  date: number
  cardType: 'kanji' | 'vocab' | 'kana'
  quizType: 'srs' | 'smart' | 'custom'
  totalQuestions: number
  correctAnswers: number
  averageTime: number
  cards: { cardId: string; correct: boolean; time: number }[]
}

export interface StudyList {
  id?: number
  name: string
  cardType: 'kanji' | 'vocab' | 'kana'
  cardIds: string[]
  createdAt: number
}

class BenkyoDB extends Dexie {
  progress!: Table<FlashcardProgress>
  quizHistory!: Table<QuizHistory>
  studyLists!: Table<StudyList>

  constructor() {
    super('BenkyoDB')
    this.version(1).stores({
      progress: '++id, cardId, cardType, nextReview, score, streak',
      quizHistory: '++id, date, cardType, quizType',
      studyLists: '++id, name, cardType',
    })
  }
}

export const db = new BenkyoDB()
