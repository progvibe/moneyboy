import { scoreHeadline } from '../db'

export function analyzeHeadlines(headlines: string[]) {
  if (headlines.length === 0) {
    return { label: 'mixed', score: 0, articleCount: 0 }
  }

  const total = headlines.reduce((sum, headline) => sum + scoreHeadline(headline), 0)
  const score = total / headlines.length
  const label = score > 0.12 ? 'bullish' : score < -0.12 ? 'bearish' : 'mixed'

  return { label, score, articleCount: headlines.length }
}
