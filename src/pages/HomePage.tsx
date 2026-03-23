import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getStats, getDueCards } from '../utils/srs'
import { db } from '../utils/db'
import ProgressBar from '../components/ProgressBar'
import { kanjiData } from '../data/kanji'
import { vocabularyData } from '../data/vocabulary'
import { allKana } from '../data/kana'

interface Stats {
  total: number
  mastered: number
  learning: number
  avgScore: number
  dueNow: number
}

export default function HomePage() {
  const [stats, setStats] = useState<Record<string, Stats>>({})
  const [streak, setStreak] = useState(0)
  const [todayQuizzes, setTodayQuizzes] = useState(0)

  useEffect(() => {
    async function load() {
      const [kanjiStats, vocabStats, kanaStats] = await Promise.all([
        getStats('kanji'),
        getStats('vocab'),
        getStats('kana'),
      ])
      setStats({ kanji: kanjiStats, vocab: vocabStats, kana: kanaStats })

      // Calculate streak from quiz history
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayMs = today.getTime()

      const history = await db.quizHistory.orderBy('date').reverse().toArray()
      const todayCount = history.filter(h => h.date >= todayMs).length
      setTodayQuizzes(todayCount)

      let s = 0
      let checkDate = new Date(today)
      if (todayCount > 0) {
        s = 1
        checkDate.setDate(checkDate.getDate() - 1)
      }
      for (const h of history) {
        const hDate = new Date(h.date)
        hDate.setHours(0, 0, 0, 0)
        if (hDate.getTime() === checkDate.getTime()) {
          s++
          checkDate.setDate(checkDate.getDate() - 1)
        } else if (hDate.getTime() < checkDate.getTime()) {
          break
        }
      }
      setStreak(s)
    }
    load()
  }, [])

  const totalDue = (stats.kanji?.dueNow || 0) + (stats.vocab?.dueNow || 0) + (stats.kana?.dueNow || 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center py-6">
        <h1 className="text-3xl font-bold kanji-char">勉強</h1>
        <p className="text-primary text-lg font-medium mt-1">Benkyō</p>
        <p className="text-text-muted text-sm mt-1">Learn Japanese</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{streak}</p>
          <p className="text-xs text-text-muted">Day Streak</p>
        </div>
        <div className="bg-surface rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-warning">{totalDue}</p>
          <p className="text-xs text-text-muted">Due Reviews</p>
        </div>
        <div className="bg-surface rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-success">{todayQuizzes}</p>
          <p className="text-xs text-text-muted">Today</p>
        </div>
      </div>

      {/* Quick Actions */}
      {totalDue > 0 && (
        <Link
          to="/quiz?type=srs"
          className="block bg-primary/20 border border-primary/30 rounded-2xl p-4 text-center hover:bg-primary/30 transition-colors"
        >
          <p className="text-primary font-semibold">Review Due Cards</p>
          <p className="text-text-muted text-sm">{totalDue} cards ready for review</p>
        </Link>
      )}

      {/* Study Sections */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Study</h2>

        <Link to="/library?type=kanji" className="block bg-surface rounded-2xl p-4 hover:bg-surface-light transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl kanji-char">漢</span>
              <div>
                <p className="font-medium">Kanji</p>
                <p className="text-sm text-text-muted">{kanjiData.length} characters</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-muted">{stats.kanji?.mastered || 0} mastered</p>
              <ProgressBar
                value={stats.kanji?.mastered || 0}
                max={kanjiData.length}
                showLabel={false}
                size="sm"
              />
            </div>
          </div>
        </Link>

        <Link to="/library?type=vocab" className="block bg-surface rounded-2xl p-4 hover:bg-surface-light transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl kanji-char">語</span>
              <div>
                <p className="font-medium">Vocabulary</p>
                <p className="text-sm text-text-muted">{vocabularyData.length} words</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-muted">{stats.vocab?.mastered || 0} mastered</p>
              <ProgressBar
                value={stats.vocab?.mastered || 0}
                max={vocabularyData.length}
                showLabel={false}
                size="sm"
              />
            </div>
          </div>
        </Link>

        <Link to="/library?type=kana" className="block bg-surface rounded-2xl p-4 hover:bg-surface-light transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl kanji-char">あ</span>
              <div>
                <p className="font-medium">Kana</p>
                <p className="text-sm text-text-muted">{allKana.length} characters</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-muted">{stats.kana?.mastered || 0} mastered</p>
              <ProgressBar
                value={stats.kana?.mastered || 0}
                max={allKana.length}
                showLabel={false}
                size="sm"
              />
            </div>
          </div>
        </Link>
      </div>

      {/* JLPT Quick Access */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">JLPT Levels</h2>
        <div className="grid grid-cols-5 gap-2">
          {[5, 4, 3, 2, 1].map(level => {
            const colors = [
              '', 'bg-n1/20 border-n1/30 text-n1', 'bg-n2/20 border-n2/30 text-n2',
              'bg-n3/20 border-n3/30 text-n3', 'bg-n4/20 border-n4/30 text-n4',
              'bg-n5/20 border-n5/30 text-n5',
            ]
            return (
              <Link
                key={level}
                to={`/library?type=kanji&jlpt=${level}`}
                className={`${colors[level]} border rounded-xl p-3 text-center font-bold hover:scale-105 transition-transform`}
              >
                N{level}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
