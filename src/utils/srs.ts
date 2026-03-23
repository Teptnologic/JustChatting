import { db, type FlashcardProgress } from './db'

// SM-2 based SRS algorithm with modifications for Flex SRS
const MIN_EASE = 1.3
const DEFAULT_EASE = 2.5
const MAX_EASE = 3.0

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5
// 0 = complete blackout, 1 = wrong but recognized, 2 = wrong but close
// 3 = correct with difficulty, 4 = correct, 5 = perfect/instant

export interface SRSUpdate {
  easeFactor: number
  interval: number
  repetitions: number
  nextReview: number
}

export function calculateSRS(
  quality: ReviewQuality,
  current: Pick<FlashcardProgress, 'easeFactor' | 'interval' | 'repetitions'>
): SRSUpdate {
  const now = Date.now()
  let { easeFactor, interval, repetitions } = current

  // Update ease factor using SM-2 formula
  easeFactor = Math.max(
    MIN_EASE,
    Math.min(MAX_EASE, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
  )

  if (quality < 3) {
    // Failed - reset
    repetitions = 0
    interval = 1
  } else {
    repetitions += 1
    if (repetitions === 1) {
      interval = 1
    } else if (repetitions === 2) {
      interval = 6
    } else {
      interval = Math.round(interval * easeFactor)
    }
  }

  // Flex SRS: add slight randomization to prevent clustering
  const fuzz = interval > 2 ? Math.floor(Math.random() * Math.max(1, Math.round(interval * 0.05))) : 0
  const nextReview = now + (interval + fuzz) * 24 * 60 * 60 * 1000

  return { easeFactor, interval, repetitions, nextReview }
}

export async function getProgress(cardId: string, cardType: string): Promise<FlashcardProgress | undefined> {
  return db.progress.where({ cardId, cardType }).first()
}

export async function updateProgress(
  cardId: string,
  cardType: 'kanji' | 'vocab' | 'kana',
  quality: ReviewQuality,
  timeMs: number
): Promise<void> {
  const existing = await getProgress(cardId, cardType)

  if (existing) {
    const update = calculateSRS(quality, existing)
    const correct = quality >= 3
    await db.progress.update(existing.id!, {
      ...update,
      lastReview: Date.now(),
      score: Math.round(((existing.score * existing.totalAttempts + (correct ? 100 : 0)) / (existing.totalAttempts + 1))),
      streak: correct ? existing.streak + 1 : 0,
      totalAttempts: existing.totalAttempts + 1,
      correctAttempts: existing.correctAttempts + (correct ? 1 : 0),
    })
  } else {
    const update = calculateSRS(quality, { easeFactor: DEFAULT_EASE, interval: 0, repetitions: 0 })
    const correct = quality >= 3
    await db.progress.add({
      cardId,
      cardType,
      ...update,
      lastReview: Date.now(),
      score: correct ? 100 : 0,
      streak: correct ? 1 : 0,
      totalAttempts: 1,
      correctAttempts: correct ? 1 : 0,
    })
  }
}

// Get cards due for SRS review
export async function getDueCards(cardType: 'kanji' | 'vocab' | 'kana', limit = 20): Promise<FlashcardProgress[]> {
  const now = Date.now()
  return db.progress
    .where('cardType')
    .equals(cardType)
    .and(p => p.nextReview <= now)
    .sortBy('nextReview')
    .then(cards => cards.slice(0, limit))
}

// Smart Quiz: get cards with lowest scores
export async function getWeakCards(cardType: 'kanji' | 'vocab' | 'kana', limit = 20): Promise<FlashcardProgress[]> {
  return db.progress
    .where('cardType')
    .equals(cardType)
    .and(p => p.totalAttempts > 0)
    .sortBy('score')
    .then(cards => cards.slice(0, limit))
}

// Get overall stats
export async function getStats(cardType?: 'kanji' | 'vocab' | 'kana') {
  let query = db.progress.toCollection()
  if (cardType) {
    query = db.progress.where('cardType').equals(cardType)
  }
  const all = await query.toArray()
  const total = all.length
  const mastered = all.filter(p => p.score >= 80 && p.repetitions >= 3).length
  const learning = all.filter(p => p.totalAttempts > 0 && !(p.score >= 80 && p.repetitions >= 3)).length
  const avgScore = total > 0 ? Math.round(all.reduce((s, p) => s + p.score, 0) / total) : 0
  const dueNow = all.filter(p => p.nextReview <= Date.now()).length

  return { total, mastered, learning, avgScore, dueNow }
}
