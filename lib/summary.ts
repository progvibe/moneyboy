import { documentChunks } from '@/db/schema'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

type NewsLike = {
  id: string
  title: string
  summary: string
  sentiment: string
  tickers?: string[]
}

export async function generateNewsSummary(items: NewsLike[]) {
  if (!OPENAI_API_KEY || items.length === 0) {
    return items.length
      ? `Top ${items.length} headlines summarized.`
      : 'No headlines available.'
  }

  const content = items
    .map(
      (item, idx) =>
        `[${idx + 1}] (${item.sentiment}) ${item.title}${
          item.tickers?.length ? ` [${item.tickers.join(', ')}]` : ''
        }\n${item.summary}`,
    )
    .join('\n\n')

  const prompt = `
You are a concise financial research assistant. Summarize the key themes and sentiment from the headlines below as ONE cohesive paragraph. Mention tickers when provided. Hedge when uncertain and do not invent facts beyond the snippets.

Headlines:
${content}
`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a concise financial research assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 200,
    }),
  })

  if (!res.ok) {
    return `Top ${items.length} headlines summarized.`
  }

  const json = await res.json()
  return json.choices?.[0]?.message?.content?.trim() ?? ''
}
