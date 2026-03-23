import { Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation'
import HomePage from './pages/HomePage'
import LibraryPage from './pages/LibraryPage'
import KanjiDetailPage from './pages/KanjiDetailPage'
import VocabDetailPage from './pages/VocabDetailPage'
import KanaDetailPage from './pages/KanaDetailPage'
import QuizPage from './pages/QuizPage'
import StatsPage from './pages/StatsPage'
import SearchPage from './pages/SearchPage'

export default function App() {
  return (
    <div className="min-h-screen bg-bg">
      <Navigation />
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-24 md:pt-20">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/kanji/:id" element={<KanjiDetailPage />} />
          <Route path="/vocab/:id" element={<VocabDetailPage />} />
          <Route path="/kana/:id" element={<KanaDetailPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </main>
    </div>
  )
}
