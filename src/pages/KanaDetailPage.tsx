import { useParams, Link } from 'react-router-dom'
import { allKana } from '../data/kana'
import DrawingCanvas from '../components/DrawingCanvas'
import { speak } from '../utils/audio'
import { useProgress } from '../hooks/useProgress'

export default function KanaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const kana = allKana.find(k => k.id === id)
  const { getCardProgress } = useProgress('kana')

  if (!kana) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">Kana not found</p>
        <Link to="/library?type=kana" className="text-primary mt-2 inline-block">Back to Library</Link>
      </div>
    )
  }

  const progress = getCardProgress(kana.id)

  return (
    <div className="space-y-6">
      <Link to="/library?type=kana" className="text-text-muted hover:text-text text-sm">&larr; Back to Kana</Link>

      <div className="text-center bg-surface rounded-2xl p-8">
        <p className="text-sm text-text-muted capitalize mb-2">{kana.type}</p>
        <div className="text-9xl kanji-char mb-4">{kana.character}</div>
        <p className="text-2xl font-medium">{kana.romaji}</p>
        <button
          onClick={() => speak(kana.character)}
          className="mt-3 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors text-sm"
        >
          Listen
        </button>
      </div>

      {progress && (
        <div className="bg-surface rounded-2xl p-4">
          <h3 className="text-sm font-medium text-text-muted mb-3">Your Progress</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
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
          </div>
        </div>
      )}

      <div className="bg-surface rounded-2xl p-4">
        <h3 className="text-sm font-medium text-text-muted mb-3">Practice Writing</h3>
        <DrawingCanvas />
      </div>

      <Link
        to={`/quiz?type=custom&cardType=kana&cards=${kana.id}`}
        className="block bg-primary rounded-2xl p-4 text-center text-white font-medium hover:bg-primary-dark transition-colors"
      >
        Quiz This Kana
      </Link>
    </div>
  )
}
