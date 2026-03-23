import { useState, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { kanjiData } from '../data/kanji'
import { vocabularyData } from '../data/vocabulary'
import { allKana } from '../data/kana'
import JLPTBadge from '../components/JLPTBadge'
import { useProgress } from '../hooks/useProgress'
import type { CardType } from '../data/types'

type Tab = 'kanji' | 'vocab' | 'kana'

export default function LibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = (searchParams.get('type') as Tab) || 'kanji'
  const initialJlpt = searchParams.get('jlpt') ? Number(searchParams.get('jlpt')) : 0
  const [tab, setTab] = useState<Tab>(initialTab)
  const [jlptFilter, setJlptFilter] = useState(initialJlpt)
  const [kanaType, setKanaType] = useState<'hiragana' | 'katakana'>('hiragana')
  const [search, setSearch] = useState('')
  const { getCardProgress } = useProgress(tab)

  const filteredKanji = useMemo(() => {
    let data = kanjiData
    if (jlptFilter) data = data.filter(k => k.jlpt === jlptFilter)
    if (search) {
      const s = search.toLowerCase()
      data = data.filter(k =>
        k.character.includes(s) ||
        k.meanings.some(m => m.toLowerCase().includes(s)) ||
        k.onReadings.some(r => r.includes(s)) ||
        k.kunReadings.some(r => r.includes(s))
      )
    }
    return data
  }, [jlptFilter, search])

  const filteredVocab = useMemo(() => {
    let data = vocabularyData
    if (jlptFilter) data = data.filter(v => v.jlpt === jlptFilter)
    if (search) {
      const s = search.toLowerCase()
      data = data.filter(v =>
        v.word.includes(s) ||
        v.reading.includes(s) ||
        v.meanings.some(m => m.toLowerCase().includes(s))
      )
    }
    return data
  }, [jlptFilter, search])

  const filteredKana = useMemo(() => {
    let data = allKana.filter(k => k.type === kanaType)
    if (search) {
      const s = search.toLowerCase()
      data = data.filter(k => k.character.includes(s) || k.romaji.includes(s))
    }
    return data
  }, [kanaType, search])

  const kanaGroups = useMemo(() => {
    const groups: Record<string, typeof filteredKana> = {}
    filteredKana.forEach(k => {
      if (!groups[k.group]) groups[k.group] = []
      groups[k.group].push(k)
    })
    return groups
  }, [filteredKana])

  const groupLabels: Record<string, string> = {
    vowels: 'Vowels', k: 'K', s: 'S', t: 'T', n: 'N', h: 'H', m: 'M',
    y: 'Y', r: 'R', w: 'W', special: 'Special',
    g: 'G (dakuten)', z: 'Z (dakuten)', d: 'D (dakuten)',
    b: 'B (dakuten)', p: 'P (handakuten)',
  }

  const handleTabChange = (t: Tab) => {
    setTab(t)
    setJlptFilter(0)
    setSearch('')
    setSearchParams({ type: t })
  }

  const getScoreColor = (cardId: string) => {
    const p = getCardProgress(cardId)
    if (!p) return 'border-surface-lighter'
    if (p.score >= 80) return 'border-success/50'
    if (p.score >= 50) return 'border-warning/50'
    return 'border-error/50'
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Library</h1>

      {/* Tabs */}
      <div className="flex bg-surface rounded-xl p-1 gap-1">
        {(['kanji', 'vocab', 'kana'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
            }`}
          >
            {t === 'vocab' ? 'Vocabulary' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={`Search ${tab}...`}
        className="w-full bg-surface border border-surface-lighter rounded-xl px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
      />

      {/* JLPT Filter (for kanji and vocab) */}
      {tab !== 'kana' && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setJlptFilter(0)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              jlptFilter === 0 ? 'bg-primary/20 border-primary/30 text-primary' : 'border-surface-lighter text-text-muted hover:text-text'
            }`}
          >
            All
          </button>
          {[5, 4, 3, 2, 1].map(level => (
            <button
              key={level}
              onClick={() => setJlptFilter(jlptFilter === level ? 0 : level)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                jlptFilter === level ? 'bg-primary/20 border-primary/30 text-primary' : 'border-surface-lighter text-text-muted hover:text-text'
              }`}
            >
              N{level}
            </button>
          ))}
        </div>
      )}

      {/* Kana type toggle */}
      {tab === 'kana' && (
        <div className="flex bg-surface rounded-xl p-1 gap-1">
          {(['hiragana', 'katakana'] as const).map(t => (
            <button
              key={t}
              onClick={() => setKanaType(t)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors capitalize ${
                kanaType === t ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {tab === 'kanji' && (
        <div>
          <p className="text-sm text-text-muted mb-3">{filteredKanji.length} kanji</p>
          <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 gap-2">
            {filteredKanji.map(k => (
              <Link
                key={k.id}
                to={`/kanji/${k.id}`}
                className={`bg-surface border-2 ${getScoreColor(k.id)} rounded-xl p-2 text-center hover:bg-surface-light transition-all hover:scale-105 group`}
              >
                <span className="text-2xl kanji-char block">{k.character}</span>
                <span className="text-[10px] text-text-muted truncate block">{k.meanings[0]}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {tab === 'vocab' && (
        <div>
          <p className="text-sm text-text-muted mb-3">{filteredVocab.length} words</p>
          <div className="space-y-2">
            {filteredVocab.map(v => (
              <Link
                key={v.id}
                to={`/vocab/${v.id}`}
                className={`block bg-surface border-2 ${getScoreColor(v.id)} rounded-xl p-3 hover:bg-surface-light transition-colors`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl kanji-char font-medium">{v.word}</span>
                    <span className="text-sm text-text-muted">{v.reading}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-muted">{v.meanings[0]}</span>
                    <JLPTBadge level={v.jlpt} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {tab === 'kana' && (
        <div className="space-y-6">
          {Object.entries(kanaGroups).map(([group, chars]) => (
            <div key={group}>
              <h3 className="text-sm font-medium text-text-muted mb-2">{groupLabels[group] || group}</h3>
              <div className="grid grid-cols-5 gap-2">
                {chars.map(k => (
                  <Link
                    key={k.id}
                    to={`/kana/${k.id}`}
                    className={`bg-surface border-2 ${getScoreColor(k.id)} rounded-xl p-3 text-center hover:bg-surface-light transition-all hover:scale-105`}
                  >
                    <span className="text-2xl kanji-char block">{k.character}</span>
                    <span className="text-xs text-text-muted">{k.romaji}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
