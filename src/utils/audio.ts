// Use Web Speech API for Japanese pronunciation
export function speak(text: string, rate = 0.8): void {
  if (!('speechSynthesis' in window)) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  utterance.rate = rate
  utterance.pitch = 1

  // Try to find a Japanese voice
  const voices = window.speechSynthesis.getVoices()
  const jpVoice = voices.find(v => v.lang.startsWith('ja'))
  if (jpVoice) utterance.voice = jpVoice

  window.speechSynthesis.speak(utterance)
}
