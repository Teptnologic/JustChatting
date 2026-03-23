import { useParams, Link } from 'react-router-dom'
import { kanjiData } from '../data/kanji'
import JLPTBadge from '../components/JLPTBadge'
import DrawingCanvas from '../components/DrawingCanvas'
import { speak } from '../utils/audio'
import { useProgress } from '../hooks/useProgress'

export default function KanjiDetailPage() {
  const { id } = useParams<{ id: string }>()
  const kanji = kanjiData.find(k => k.id === id)
  const { getCardProgress } = useProgress('kanji')

  if (!kanji) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">Kanji not found</p>
        <Link to="/library?type=kanji" className="text-primary mt-2 inline-block">Back to Library</Link>
      </div>
    )
  }

  const progress = getCardProgress(kanji.id)

  return (
    <div className="space-y-6">
      <Link to="/library?type=kanji" className="text-text-muted hover:text-text text-sm">&larr; Back to Kanji</Link>

      {/* Main Character */}
      <div className="text-center bg-surface rounded-2xl p-8">
        <div className="text-8xl kanji-char mb-4">{kanji.character}</div>
        <div className="flex items-center justify-center gap-3 mb-2">
          <JLPTBadge level={kanji.jlpt} size="md" />
          <span className="text-text-muted text-sm">Grade {kanji.grade}</span>
          <span className="text-text-muted text-sm">{kanji.strokeCount} strokes</span>
        </div>
        <p className="text-xl font-medium mt-2">{kanji.meanings.join(', ')}</p>
        <button
          onClick={() => speak(kanji.character)}
          className="mt-3 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors text-sm"
        >
          Listen
        </button>
      </div>

      {/* Readings */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface rounded-2xl p-4">
          <h3 className="text-sm font-medium text-text-muted mb-2">On'yomi (Chinese)</h3>
          <div className="space-y-1">
            {kanji.onReadings.map((r, i) => (
              <button
                key={i}
                onClick={() => speak(r)}
                className="block text-lg kanji-char hover:text-primary transition-colors"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-surface rounded-2xl p-4">
          <h3 className="text-sm font-medium text-text-muted mb-2">Kun'yomi (Japanese)</h3>
          <div className="space-y-1">
            {kanji.kunReadings.map((r, i) => (
              <button
                key={i}
                onClick={() => speak(r)}
                className="block text-lg kanji-char hover:text-primary transition-colors"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress */}
      {progress && (
        <div className="bg-surface rounded-2xl p-4">
          <h3 className="text-sm font-medium text-text-muted mb-3">Your Progress</h3>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-lg font-bold">{progress.score}%</p>
              <p className="text-xs text-text-muted">Score</p>
            </div>
            <div>
              <p className="text-lg font-bold">{progress.streak}</p>
              <p className="text-xs text-text-muted">Streak</p>
            </div>
            <div>
              <p className="text-lg font-bold">{progress.correctAttempts}/{progress.totalAttempts}</p>
              <p className="text-xs text-text-muted">Correct</p>
            </div>
            <div>
              <p className="text-lg font-bold">{progress.repetitions}</p>
              <p className="text-xs text-text-muted">Reviews</p>
            </div>
          </div>
        </div>
      )}

      {/* Examples */}
      {kanji.examples.length > 0 && (
        <div className="bg-surface rounded-2xl p-4">
          <h3 className="text-sm font-medium text-text-muted mb-3">Examples</h3>
          <div className="space-y-3">
            {kanji.examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => speak(ex.word)}
                className="block w-full text-left hover:bg-surface-light rounded-lg p-2 transition-colors"
              >
                <span className="text-lg kanji-char font-medium">{ex.word}</span>
                <span className="text-text-muted ml-2">{ex.reading}</span>
                <span className="text-text-muted ml-2">- {ex.meaning}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Drawing Practice */}
      <div className="bg-surface rounded-2xl p-4">
        <h3 className="text-sm font-medium text-text-muted mb-3">Practice Writing</h3>
        <DrawingCanvas />
      </div>

      {/* Quick Quiz */}
      <Link
        to={`/quiz?type=custom&cardType=kanji&cards=${kanji.id}`}
        className="block bg-primary rounded-2xl p-4 text-center text-white font-medium hover:bg-primary-dark transition-colors"
      >
        Quiz This Kanji
      </Link>
    </div>
  )
}
