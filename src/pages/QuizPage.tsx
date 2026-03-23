import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { kanjiData } from '../data/kanji'
import { vocabularyData } from '../data/vocabulary'
import { allKana } from '../data/kana'
import { getDueCards, getWeakCards, updateProgress, type ReviewQuality } from '../utils/srs'
import { db, type FlashcardProgress } from '../utils/db'
import { speak } from '../utils/audio'
import DrawingCanvas from '../components/DrawingCanvas'
import type { CardType } from '../data/types'

type QuizType = 'srs' | 'smart' | 'custom'
type InputMode = 'multiple_choice' | 'keyboard' | 'drawing'

interface QuizCard {
  id: string
  question: string
  answer: string
  options: string[]
  cardType: CardType
  hint?: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildQuizCards(
  cardType: CardType,
  cardIds?: string[],
  count = 20
): QuizCard[] {
  if (cardType === 'kanji') {
    let pool = cardIds ? kanjiData.filter(k => cardIds.includes(k.id)) : kanjiData
    pool = shuffle(pool).slice(0, count)
    return pool.map(k => {
      const wrongAnswers = shuffle(kanjiData.filter(o => o.id !== k.id))
        .slice(0, 3)
        .map(o => o.meanings[0])
      return {
        id: k.id,
        question: k.character,
        answer: k.meanings[0],
        options: shuffle([k.meanings[0], ...wrongAnswers]),
        cardType: 'kanji',
        hint: k.onReadings[0] || k.kunReadings[0],
      }
    })
  }
  if (cardType === 'vocab') {
    let pool = cardIds ? vocabularyData.filter(v => cardIds.includes(v.id)) : vocabularyData
    pool = shuffle(pool).slice(0, count)
    return pool.map(v => {
      const wrongAnswers = shuffle(vocabularyData.filter(o => o.id !== v.id))
        .slice(0, 3)
        .map(o => o.meanings[0])
      return {
        id: v.id,
        question: v.word,
        answer: v.meanings[0],
        options: shuffle([v.meanings[0], ...wrongAnswers]),
        cardType: 'vocab',
        hint: v.reading,
      }
    })
  }
  // kana
  let pool = cardIds ? allKana.filter(k => cardIds.includes(k.id)) : allKana
  pool = shuffle(pool).slice(0, count)
  return pool.map(k => {
    const wrongAnswers = shuffle(allKana.filter(o => o.id !== k.id))
      .slice(0, 3)
      .map(o => o.romaji)
    return {
      id: k.id,
      question: k.character,
      answer: k.romaji,
      options: shuffle([k.romaji, ...wrongAnswers]),
      cardType: 'kana',
    }
  })
}

export default function QuizPage() {
  const [searchParams] = useSearchParams()
  const [quizType, setQuizType] = useState<QuizType>((searchParams.get('type') as QuizType) || 'srs')
  const [cardType, setCardType] = useState<CardType>((searchParams.get('cardType') as CardType) || 'kanji')
  const [inputMode, setInputMode] = useState<InputMode>('multiple_choice')
  const [started, setStarted] = useState(false)
  const [cards, setCards] = useState<QuizCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [keyboardInput, setKeyboardInput] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [startTime, setStartTime] = useState(0)
  const [results, setResults] = useState<{ cardId: string; correct: boolean; time: number }[]>([])
  const [finished, setFinished] = useState(false)
  const [jlptFilter, setJlptFilter] = useState(0)
  const [quizCount, setQuizCount] = useState(20)

  const startQuiz = useCallback(async () => {
    let quizCards: QuizCard[] = []

    if (quizType === 'srs') {
      // Get due cards from SRS
      const dueKanji = await getDueCards('kanji', 10)
      const dueVocab = await getDueCards('vocab', 5)
      const dueKana = await getDueCards('kana', 5)
      const allDue = [...dueKanji, ...dueVocab, ...dueKana]

      if (allDue.length === 0) {
        // No due cards, pick random new ones
        quizCards = [
          ...buildQuizCards('kanji', undefined, 7),
          ...buildQuizCards('vocab', undefined, 7),
          ...buildQuizCards('kana', undefined, 6),
        ]
      } else {
        // Build quiz from due cards grouped by type
        const dueByType = { kanji: [] as string[], vocab: [] as string[], kana: [] as string[] }
        allDue.forEach(d => dueByType[d.cardType].push(d.cardId))
        if (dueByType.kanji.length) quizCards.push(...buildQuizCards('kanji', dueByType.kanji))
        if (dueByType.vocab.length) quizCards.push(...buildQuizCards('vocab', dueByType.vocab))
        if (dueByType.kana.length) quizCards.push(...buildQuizCards('kana', dueByType.kana))
      }
      quizCards = shuffle(quizCards)
    } else if (quizType === 'smart') {
      const weak = await getWeakCards(cardType, quizCount)
      if (weak.length > 0) {
        quizCards = buildQuizCards(cardType, weak.map(w => w.cardId), quizCount)
      } else {
        quizCards = buildQuizCards(cardType, undefined, quizCount)
      }
    } else {
      // Custom
      const specificCards = searchParams.get('cards')?.split(',')
      let ids = specificCards

      if (!ids && jlptFilter) {
        if (cardType === 'kanji') {
          ids = kanjiData.filter(k => k.jlpt === jlptFilter).map(k => k.id)
        } else if (cardType === 'vocab') {
          ids = vocabularyData.filter(v => v.jlpt === jlptFilter).map(v => v.id)
        }
      }

      quizCards = buildQuizCards(cardType, ids || undefined, quizCount)
    }

    setCards(quizCards)
    setCurrentIndex(0)
    setResults([])
    setSelected(null)
    setKeyboardInput('')
    setShowResult(false)
    setFinished(false)
    setStarted(true)
    setStartTime(Date.now())
  }, [quizType, cardType, jlptFilter, quizCount, searchParams])

  const checkAnswer = useCallback((answer: string) => {
    const card = cards[currentIndex]
    const correct = answer.toLowerCase().trim() === card.answer.toLowerCase().trim()
    setIsCorrect(correct)
    setShowResult(true)
    setSelected(answer)

    const time = Date.now() - startTime
    const quality: ReviewQuality = correct ? (time < 3000 ? 5 : time < 6000 ? 4 : 3) : (answer ? 1 : 0)

    updateProgress(card.id, card.cardType, quality, time)
    setResults(prev => [...prev, { cardId: card.id, correct, time }])
  }, [cards, currentIndex, startTime])

  const nextCard = useCallback(() => {
    if (currentIndex + 1 >= cards.length) {
      // Save quiz history
      const correct = results.length > 0 ? results.filter(r => r.correct).length + (isCorrect ? 1 : 0) : 0
      const totalTime = results.reduce((s, r) => s + r.time, 0)
      db.quizHistory.add({
        date: Date.now(),
        cardType: cards[0]?.cardType || 'kanji',
        quizType,
        totalQuestions: cards.length,
        correctAnswers: correct,
        averageTime: cards.length > 0 ? Math.round(totalTime / cards.length) : 0,
        cards: results,
      })
      setFinished(true)
    } else {
      setCurrentIndex(prev => prev + 1)
      setSelected(null)
      setKeyboardInput('')
      setShowResult(false)
      setStartTime(Date.now())
    }
  }, [currentIndex, cards, results, isCorrect, quizType])

  // Auto-start if specific cards are provided
  useEffect(() => {
    const specificCards = searchParams.get('cards')
    if (specificCards && !started) {
      startQuiz()
    }
  }, [searchParams, started, startQuiz])

  if (finished) {
    const correct = results.filter(r => r.correct).length
    const total = results.length
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
    const avgTime = total > 0 ? Math.round(results.reduce((s, r) => s + r.time, 0) / total / 1000 * 10) / 10 : 0

    return (
      <div className="space-y-6 text-center py-8">
        <h1 className="text-3xl font-bold">Quiz Complete!</h1>

        <div className="bg-surface rounded-2xl p-8 max-w-sm mx-auto">
          <div className={`text-6xl font-bold mb-4 ${pct >= 80 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-error'}`}>
            {pct}%
          </div>
          <p className="text-text-muted">{correct}/{total} correct</p>
          <p className="text-text-muted text-sm mt-1">Avg. {avgTime}s per question</p>
        </div>

        <div className="bg-surface rounded-2xl p-4 max-w-sm mx-auto">
          <h3 className="text-sm font-medium text-text-muted mb-3">Results</h3>
          <div className="space-y-2">
            {results.map((r, i) => {
              const card = cards[i]
              return (
                <div key={i} className={`flex items-center justify-between p-2 rounded-lg ${r.correct ? 'bg-success/10' : 'bg-error/10'}`}>
                  <span className="kanji-char text-lg">{card?.question}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-muted">{(r.time / 1000).toFixed(1)}s</span>
                    <span className={r.correct ? 'text-success' : 'text-error'}>{r.correct ? 'O' : 'X'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button onClick={() => { setStarted(false); setFinished(false) }} className="px-6 py-3 bg-surface rounded-xl hover:bg-surface-light transition-colors">
            New Quiz
          </button>
          <button onClick={startQuiz} className="px-6 py-3 bg-primary rounded-xl text-white hover:bg-primary-dark transition-colors">
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Quiz</h1>

        {/* Quiz Type */}
        <div>
          <h3 className="text-sm font-medium text-text-muted mb-2">Quiz Type</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { type: 'srs' as QuizType, label: 'Flex SRS', desc: 'AI-powered review' },
              { type: 'smart' as QuizType, label: 'Smart Quiz', desc: 'Focus on weak cards' },
              { type: 'custom' as QuizType, label: 'Custom Quiz', desc: 'Choose your content' },
            ].map(q => (
              <button
                key={q.type}
                onClick={() => setQuizType(q.type)}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  quizType === q.type
                    ? 'bg-primary/20 border-primary/30 text-primary'
                    : 'bg-surface border-surface-lighter hover:border-primary/30'
                }`}
              >
                <p className="font-medium text-sm">{q.label}</p>
                <p className="text-xs text-text-muted mt-1">{q.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Card Type (for Smart & Custom) */}
        {quizType !== 'srs' && (
          <div>
            <h3 className="text-sm font-medium text-text-muted mb-2">Content</h3>
            <div className="flex bg-surface rounded-xl p-1 gap-1">
              {(['kanji', 'vocab', 'kana'] as CardType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setCardType(t)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors capitalize ${
                    cardType === t ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
                  }`}
                >
                  {t === 'vocab' ? 'Vocabulary' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* JLPT Filter (for Custom) */}
        {quizType === 'custom' && cardType !== 'kana' && (
          <div>
            <h3 className="text-sm font-medium text-text-muted mb-2">JLPT Level</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setJlptFilter(0)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  jlptFilter === 0 ? 'bg-primary/20 border-primary/30 text-primary' : 'border-surface-lighter text-text-muted'
                }`}
              >
                All
              </button>
              {[5, 4, 3, 2, 1].map(l => (
                <button
                  key={l}
                  onClick={() => setJlptFilter(l)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                    jlptFilter === l ? 'bg-primary/20 border-primary/30 text-primary' : 'border-surface-lighter text-text-muted'
                  }`}
                >
                  N{l}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Mode */}
        <div>
          <h3 className="text-sm font-medium text-text-muted mb-2">Input Mode</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { mode: 'multiple_choice' as InputMode, label: 'Multiple Choice' },
              { mode: 'keyboard' as InputMode, label: 'Keyboard' },
              { mode: 'drawing' as InputMode, label: 'Handwriting' },
            ].map(m => (
              <button
                key={m.mode}
                onClick={() => setInputMode(m.mode)}
                className={`py-2 px-3 rounded-xl border text-sm font-medium transition-colors ${
                  inputMode === m.mode
                    ? 'bg-primary/20 border-primary/30 text-primary'
                    : 'bg-surface border-surface-lighter hover:border-primary/30'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Questions count */}
        <div>
          <h3 className="text-sm font-medium text-text-muted mb-2">Questions: {quizCount}</h3>
          <input
            type="range"
            min="5"
            max="50"
            step="5"
            value={quizCount}
            onChange={e => setQuizCount(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        <button
          onClick={startQuiz}
          className="w-full py-4 bg-primary rounded-2xl text-white font-semibold text-lg hover:bg-primary-dark transition-colors"
        >
          Start Quiz
        </button>
      </div>
    )
  }

  // Active Quiz
  const card = cards[currentIndex]
  if (!card) return null

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-surface-lighter rounded-full overflow-hidden">
          <div
            className="h-2 bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-text-muted">{currentIndex + 1}/{cards.length}</span>
      </div>

      {/* Question */}
      <div className="text-center py-8">
        <p className="text-text-muted text-sm mb-4">What does this mean?</p>
        <button
          onClick={() => speak(card.question)}
          className="text-7xl kanji-char hover:text-primary transition-colors"
        >
          {card.question}
        </button>
        {card.hint && !showResult && (
          <p className="text-text-muted text-sm mt-4 kanji-char">{card.hint}</p>
        )}
      </div>

      {/* Answer Area */}
      {inputMode === 'multiple_choice' && (
        <div className="grid grid-cols-2 gap-3">
          {card.options.map((opt, i) => {
            let btnClass = 'bg-surface border-surface-lighter hover:border-primary/50'
            if (showResult) {
              if (opt === card.answer) btnClass = 'bg-success/20 border-success'
              else if (opt === selected && !isCorrect) btnClass = 'bg-error/20 border-error'
              else btnClass = 'bg-surface border-surface-lighter opacity-50'
            }
            return (
              <button
                key={i}
                onClick={() => !showResult && checkAnswer(opt)}
                disabled={showResult}
                className={`p-4 rounded-xl border-2 text-left transition-all ${btnClass}`}
              >
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {inputMode === 'keyboard' && (
        <div className="space-y-3">
          <input
            type="text"
            value={keyboardInput}
            onChange={e => setKeyboardInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !showResult && checkAnswer(keyboardInput)}
            placeholder="Type your answer..."
            disabled={showResult}
            autoFocus
            className="w-full bg-surface border-2 border-surface-lighter rounded-xl px-4 py-3 text-lg text-center focus:outline-none focus:border-primary disabled:opacity-50"
          />
          {!showResult && (
            <button
              onClick={() => checkAnswer(keyboardInput)}
              className="w-full py-3 bg-primary rounded-xl text-white font-medium hover:bg-primary-dark transition-colors"
            >
              Check
            </button>
          )}
          {showResult && (
            <div className={`text-center p-3 rounded-xl ${isCorrect ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
              {isCorrect ? 'Correct!' : `Wrong - Answer: ${card.answer}`}
            </div>
          )}
        </div>
      )}

      {inputMode === 'drawing' && (
        <div className="space-y-3">
          <DrawingCanvas />
          <p className="text-center text-text-muted text-sm">Draw the character, then self-grade:</p>
          {!showResult && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => checkAnswer(card.answer)}
                className="py-3 bg-success/20 text-success rounded-xl border border-success/30 font-medium"
              >
                I got it right
              </button>
              <button
                onClick={() => checkAnswer('')}
                className="py-3 bg-error/20 text-error rounded-xl border border-error/30 font-medium"
              >
                I got it wrong
              </button>
            </div>
          )}
          {showResult && (
            <div className="text-center p-3 rounded-xl bg-surface">
              <p className="text-text-muted">Answer: <span className="text-xl kanji-char">{card.answer}</span></p>
            </div>
          )}
        </div>
      )}

      {/* Next Button */}
      {showResult && (
        <button
          onClick={nextCard}
          className="w-full py-4 bg-primary rounded-2xl text-white font-semibold hover:bg-primary-dark transition-colors"
        >
          {currentIndex + 1 >= cards.length ? 'See Results' : 'Next'}
        </button>
      )}
    </div>
  )
}
