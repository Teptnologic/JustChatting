import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { db, type QuizHistory, type FlashcardProgress } from '../utils/db'
import { getStats } from '../utils/srs'
import ProgressBar from '../components/ProgressBar'
import { kanjiData } from '../data/kanji'
import { vocabularyData } from '../data/vocabulary'
import { allKana } from '../data/kana'

export default function StatsPage() {
  const [history, setHistory] = useState<QuizHistory[]>([])
  const [progress, setProgress] = useState<FlashcardProgress[]>([])
  const [stats, setStats] = useState<Record<string, { total: number; mastered: number; learning: number; avgScore: number; dueNow: number }>>({})

  useEffect(() => {
    async function load() {
      const [h, p, ks, vs, kas] = await Promise.all([
        db.quizHistory.orderBy('date').reverse().limit(100).toArray(),
        db.progress.toArray(),
        getStats('kanji'),
        getStats('vocab'),
        getStats('kana'),
      ])
      setHistory(h)
      setProgress(p)
      setStats({ kanji: ks, vocab: vs, kana: kas })
    }
    load()
  }, [])

  // Chart data: quiz scores over time (last 30 quizzes)
  const scoreOverTime = history
    .slice(0, 30)
    .reverse()
    .map((h, i) => ({
      quiz: i + 1,
      score: h.totalQuestions > 0 ? Math.round((h.correctAnswers / h.totalQuestions) * 100) : 0,
      time: Math.round(h.averageTime / 1000 * 10) / 10,
    }))

  // Score distribution
  const scoreDistribution = [
    { range: '0-20%', count: progress.filter(p => p.score < 20).length, color: '#ef4444' },
    { range: '20-40%', count: progress.filter(p => p.score >= 20 && p.score < 40).length, color: '#f59e0b' },
    { range: '40-60%', count: progress.filter(p => p.score >= 40 && p.score < 60).length, color: '#a855f7' },
    { range: '60-80%', count: progress.filter(p => p.score >= 60 && p.score < 80).length, color: '#3b82f6' },
    { range: '80-100%', count: progress.filter(p => p.score >= 80).length, color: '#22c55e' },
  ]

  // Mastery pie chart
  const masteryData = [
    { name: 'Mastered', value: (stats.kanji?.mastered || 0) + (stats.vocab?.mastered || 0) + (stats.kana?.mastered || 0), color: '#22c55e' },
    { name: 'Learning', value: (stats.kanji?.learning || 0) + (stats.vocab?.learning || 0) + (stats.kana?.learning || 0), color: '#f59e0b' },
    { name: 'New', value: kanjiData.length + vocabularyData.length + allKana.length - (stats.kanji?.total || 0) - (stats.vocab?.total || 0) - (stats.kana?.total || 0), color: '#363252' },
  ]

  // Top/Bottom flashcards
  const topCards = [...progress].sort((a, b) => b.score - a.score).slice(0, 5)
  const weakCards = [...progress].sort((a, b) => a.score - b.score).slice(0, 5)

  const getCardLabel = (p: FlashcardProgress) => {
    if (p.cardType === 'kanji') return kanjiData.find(k => k.id === p.cardId)?.character || p.cardId
    if (p.cardType === 'vocab') return vocabularyData.find(v => v.id === p.cardId)?.word || p.cardId
    return allKana.find(k => k.id === p.cardId)?.character || p.cardId
  }

  const totalQuizzes = history.length
  const totalCorrect = history.reduce((s, h) => s + h.correctAnswers, 0)
  const totalQuestions = history.reduce((s, h) => s + h.totalQuestions, 0)
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Statistics</h1>

      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{totalQuizzes}</p>
          <p className="text-xs text-text-muted">Total Quizzes</p>
        </div>
        <div className="bg-surface rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-success">{overallAccuracy}%</p>
          <p className="text-xs text-text-muted">Accuracy</p>
        </div>
        <div className="bg-surface rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-warning">{progress.length}</p>
          <p className="text-xs text-text-muted">Cards Studied</p>
        </div>
        <div className="bg-surface rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-accent">{totalQuestions}</p>
          <p className="text-xs text-text-muted">Total Answers</p>
        </div>
      </div>

      {/* Mastery by type */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Mastery Progress</h2>
        {[
          { label: 'Kanji', key: 'kanji', total: kanjiData.length },
          { label: 'Vocabulary', key: 'vocab', total: vocabularyData.length },
          { label: 'Kana', key: 'kana', total: allKana.length },
        ].map(item => (
          <div key={item.key} className="bg-surface rounded-xl p-3">
            <div className="flex justify-between text-sm mb-1">
              <span>{item.label}</span>
              <span className="text-text-muted">{stats[item.key]?.mastered || 0} / {item.total}</span>
            </div>
            <ProgressBar
              value={stats[item.key]?.mastered || 0}
              max={item.total}
              color="bg-success"
              showLabel={false}
            />
          </div>
        ))}
      </div>

      {/* Score Over Time */}
      {scoreOverTime.length > 1 && (
        <div className="bg-surface rounded-2xl p-4">
          <h2 className="text-lg font-semibold mb-4">Quiz Score Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={scoreOverTime}>
              <XAxis dataKey="quiz" stroke="#9794ab" fontSize={12} />
              <YAxis domain={[0, 100]} stroke="#9794ab" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#2a2740', border: 'none', borderRadius: 8, color: '#e2e0ef' }}
                labelFormatter={v => `Quiz ${v}`}
              />
              <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Score Distribution */}
      {progress.length > 0 && (
        <div className="bg-surface rounded-2xl p-4">
          <h2 className="text-lg font-semibold mb-4">Score Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scoreDistribution}>
              <XAxis dataKey="range" stroke="#9794ab" fontSize={11} />
              <YAxis stroke="#9794ab" fontSize={12} />
              <Tooltip contentStyle={{ background: '#2a2740', border: 'none', borderRadius: 8, color: '#e2e0ef' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {scoreDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Mastery Pie */}
      {progress.length > 0 && (
        <div className="bg-surface rounded-2xl p-4">
          <h2 className="text-lg font-semibold mb-4">Overall Mastery</h2>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={masteryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {masteryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#2a2740', border: 'none', borderRadius: 8, color: '#e2e0ef' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {masteryData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                <span className="text-text-muted">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top & Weak Cards */}
      <div className="grid grid-cols-2 gap-4">
        {topCards.length > 0 && (
          <div className="bg-surface rounded-2xl p-4">
            <h3 className="text-sm font-medium text-success mb-3">Best Cards</h3>
            <div className="space-y-2">
              {topCards.map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <span className="kanji-char text-lg">{getCardLabel(p)}</span>
                  <span className="text-sm text-success">{p.score}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {weakCards.length > 0 && (
          <div className="bg-surface rounded-2xl p-4">
            <h3 className="text-sm font-medium text-error mb-3">Need Work</h3>
            <div className="space-y-2">
              {weakCards.map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <span className="kanji-char text-lg">{getCardLabel(p)}</span>
                  <span className="text-sm text-error">{p.score}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* No data state */}
      {progress.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          <p className="text-xl mb-2">No data yet</p>
          <p className="text-sm">Complete some quizzes to see your statistics!</p>
        </div>
      )}
    </div>
  )
}
