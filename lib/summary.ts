const OPENAI_API_KEY = process.env.OPENAI_API_KEY

type NewsLike = {
  id: string
  title: string
  summary: string
  sentiment: string
  tickers?: string[]
}

type NewsSummaryOptions = {
  maxItems?: number
  snippetMaxChars?: number
}

function truncateSnippet(text: string, maxChars: number) {
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars).trim()}…`
}

export async function generateNewsSummary(
  items: NewsLike[],
  options: NewsSummaryOptions = {},
) {
  const maxItems = options.maxItems ?? 20
  const snippetMaxChars = options.snippetMaxChars ?? 220
  const clipped = items.slice(0, maxItems)

  if (!OPENAI_API_KEY || items.length === 0) {
    return clipped.length
      ? `Top ${clipped.length} headlines summarized.`
      : 'No headlines available.'
  }

  const content = clipped
    .map((item, idx) => {
      const meta = `[${idx + 1}] (${item.sentiment}) ${item.title}${
        item.tickers?.length ? ` [${item.tickers.join(', ')}]` : ''
      }`
      const snippet = truncateSnippet(item.summary, snippetMaxChars)
      return `${meta}\n${snippet}`
    })
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
    return `Top ${clipped.length} headlines summarized.`
  }

  const json = await res.json()
  return json.choices?.[0]?.message?.content?.trim() ?? ''
}
