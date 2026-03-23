import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { kanjiData } from '../data/kanji'
import { vocabularyData } from '../data/vocabulary'
import { allKana } from '../data/kana'
import JLPTBadge from '../components/JLPTBadge'
import DrawingCanvas from '../components/DrawingCanvas'

type SearchMode = 'text' | 'draw'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('text')

  const results = useMemo(() => {
    if (!query.trim()) return { kanji: [], vocab: [], kana: [] }
    const q = query.toLowerCase().trim()

    const kanji = kanjiData.filter(k =>
      k.character.includes(q) ||
      k.meanings.some(m => m.toLowerCase().includes(q)) ||
      k.onReadings.some(r => r.includes(q)) ||
      k.kunReadings.some(r => r.includes(q))
    ).slice(0, 20)

    const vocab = vocabularyData.filter(v =>
      v.word.includes(q) ||
      v.reading.includes(q) ||
      v.meanings.some(m => m.toLowerCase().includes(q))
    ).slice(0, 20)

    const kana = allKana.filter(k =>
      k.character.includes(q) ||
      k.romaji.toLowerCase().includes(q)
    ).slice(0, 20)

    return { kanji, vocab, kana }
  }, [query])

  const totalResults = results.kanji.length + results.vocab.length + results.kana.length

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Search</h1>

      {/* Mode toggle */}
      <div className="flex bg-surface rounded-xl p-1 gap-1">
        <button
          onClick={() => setMode('text')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            mode === 'text' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
          }`}
        >
          Text Search
        </button>
        <button
          onClick={() => setMode('draw')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            mode === 'draw' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
          }`}
        >
          Draw to Search
        </button>
      </div>

      {mode === 'text' ? (
        <>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by character, meaning, or reading..."
            autoFocus
            className="w-full bg-surface border border-surface-lighter rounded-xl px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:border-primary text-lg"
          />

          {query && (
            <p className="text-sm text-text-muted">{totalResults} results</p>
          )}

          {/* Kanji Results */}
          {results.kanji.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-text-muted mb-2">Kanji ({results.kanji.length})</h3>
              <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
                {results.kanji.map(k => (
                  <Link
                    key={k.id}
                    to={`/kanji/${k.id}`}
                    className="bg-surface rounded-xl p-2 text-center hover:bg-surface-light transition-all hover:scale-105"
                  >
                    <span className="text-2xl kanji-char block">{k.character}</span>
                    <span className="text-[10px] text-text-muted truncate block">{k.meanings[0]}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Vocab Results */}
          {results.vocab.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-text-muted mb-2">Vocabulary ({results.vocab.length})</h3>
              <div className="space-y-2">
                {results.vocab.map(v => (
                  <Link
                    key={v.id}
                    to={`/vocab/${v.id}`}
                    className="block bg-surface rounded-xl p-3 hover:bg-surface-light transition-colors"
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

          {/* Kana Results */}
          {results.kana.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-text-muted mb-2">Kana ({results.kana.length})</h3>
              <div className="grid grid-cols-5 gap-2">
                {results.kana.map(k => (
                  <Link
                    key={k.id}
                    to={`/kana/${k.id}`}
                    className="bg-surface rounded-xl p-3 text-center hover:bg-surface-light transition-all hover:scale-105"
                  >
                    <span className="text-2xl kanji-char block">{k.character}</span>
                    <span className="text-xs text-text-muted">{k.romaji}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {query && totalResults === 0 && (
            <div className="text-center py-12 text-text-muted">
              <p>No results found for "{query}"</p>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-text-muted text-center">
            Draw a character to search. This feature uses visual matching to find similar characters.
          </p>
          <DrawingCanvas />
          <p className="text-xs text-text-muted text-center">
            Tip: For best results, use the text search above. Drawing recognition works best with clear, centered strokes.
          </p>
        </div>
      )}

      {/* Quick Browse */}
      {!query && mode === 'text' && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-text-muted">Quick Browse</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/library?type=kanji&jlpt=5" className="bg-n5/10 border border-n5/20 rounded-xl p-4 text-center hover:bg-n5/20 transition-colors">
              <p className="text-n5 font-medium">JLPT N5 Kanji</p>
              <p className="text-xs text-text-muted">{kanjiData.filter(k => k.jlpt === 5).length} characters</p>
            </Link>
            <Link to="/library?type=kanji&jlpt=4" className="bg-n4/10 border border-n4/20 rounded-xl p-4 text-center hover:bg-n4/20 transition-colors">
              <p className="text-n4 font-medium">JLPT N4 Kanji</p>
              <p className="text-xs text-text-muted">{kanjiData.filter(k => k.jlpt === 4).length} characters</p>
            </Link>
            <Link to="/library?type=vocab&jlpt=5" className="bg-n5/10 border border-n5/20 rounded-xl p-4 text-center hover:bg-n5/20 transition-colors">
              <p className="text-n5 font-medium">N5 Vocabulary</p>
              <p className="text-xs text-text-muted">{vocabularyData.filter(v => v.jlpt === 5).length} words</p>
            </Link>
            <Link to="/library?type=kana" className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center hover:bg-primary/20 transition-colors">
              <p className="text-primary font-medium">All Kana</p>
              <p className="text-xs text-text-muted">{allKana.length} characters</p>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
