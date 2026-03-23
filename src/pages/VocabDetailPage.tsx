import { useParams, Link } from 'react-router-dom'
import { vocabularyData } from '../data/vocabulary'
import JLPTBadge from '../components/JLPTBadge'
import { speak } from '../utils/audio'
import { useProgress } from '../hooks/useProgress'

export default function VocabDetailPage() {
  const { id } = useParams<{ id: string }>()
  const vocab = vocabularyData.find(v => v.id === id)
  const { getCardProgress } = useProgress('vocab')

  if (!vocab) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">Vocabulary not found</p>
        <Link to="/library?type=vocab" className="text-primary mt-2 inline-block">Back to Library</Link>
      </div>
    )
  }

  const progress = getCardProgress(vocab.id)

  return (
    <div className="space-y-6">
      <Link to="/library?type=vocab" className="text-text-muted hover:text-text text-sm">&larr; Back to Vocabulary</Link>

      {/* Main Word */}
      <div className="text-center bg-surface rounded-2xl p-8">
        <div className="text-6xl kanji-char mb-3">{vocab.word}</div>
        <p className="text-xl kanji-char text-text-muted mb-2">{vocab.reading}</p>
        <div className="flex items-center justify-center gap-3 mb-2">
          <JLPTBadge level={vocab.jlpt} size="md" />
          <span className="text-text-muted text-sm capitalize">{vocab.partOfSpeech}</span>
        </div>
        <p className="text-lg font-medium mt-2">{vocab.meanings.join('; ')}</p>
        <button
          onClick={() => speak(vocab.word)}
          className="mt-3 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors text-sm"
        >
          Listen
        </button>
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
      {vocab.examples.length > 0 && (
        <div className="bg-surface rounded-2xl p-4">
          <h3 className="text-sm font-medium text-text-muted mb-3">Example Sentences</h3>
          <div className="space-y-4">
            {vocab.examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => speak(ex.ja)}
                className="block w-full text-left hover:bg-surface-light rounded-lg p-3 transition-colors"
              >
                <p className="text-lg kanji-char">{ex.ja}</p>
                <p className="text-sm text-text-muted mt-1">{ex.en}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Quiz */}
      <Link
        to={`/quiz?type=custom&cardType=vocab&cards=${vocab.id}`}
        className="block bg-primary rounded-2xl p-4 text-center text-white font-medium hover:bg-primary-dark transition-colors"
      >
        Quiz This Word
      </Link>
    </div>
  )
}
