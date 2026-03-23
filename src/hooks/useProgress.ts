import { useState, useEffect, useCallback } from 'react'
import { db, type FlashcardProgress } from '../utils/db'
import type { CardType } from '../data/types'

export function useProgress(cardType?: CardType) {
  const [progress, setProgress] = useState<FlashcardProgress[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      let data: FlashcardProgress[]
      if (cardType) {
        data = await db.progress.where('cardType').equals(cardType).toArray()
      } else {
        data = await db.progress.toArray()
      }
      setProgress(data)
    } finally {
      setLoading(false)
    }
  }, [cardType])

  useEffect(() => {
    refresh()
  }, [refresh])

  const getCardProgress = useCallback(
    (cardId: string) => progress.find(p => p.cardId === cardId),
    [progress]
  )

  return { progress, loading, refresh, getCardProgress }
}
