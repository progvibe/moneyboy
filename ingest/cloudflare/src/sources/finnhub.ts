import type { NewsArticle, PriceQuote } from '../types'

type FinnhubCompanyNewsItem = {
  datetime: number
  headline: string
  related?: string
  source?: string
  summary?: string
  url: string
}

type FinnhubQuote = {
  c?: number
  d?: number
  dp?: number
  t?: number
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

async function fetchJson<T>(url: string) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Finnhub request failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as T
}

export async function fetchPrice(
  symbol: string,
  apiKey: string,
): Promise<PriceQuote> {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
    symbol,
  )}&token=${encodeURIComponent(apiKey)}`
  const quote = await fetchJson<FinnhubQuote>(url)

  if (!quote.c) {
    throw new Error(`Finnhub returned no current price for ${symbol}`)
  }

  return {
    provider: 'finnhub',
    price: quote.c,
    change: quote.d ?? null,
    percentChange: quote.dp ?? null,
    pricedAt: quote.t ? new Date(quote.t * 1000) : new Date(),
  }
}

export async function fetchNews(
  symbol: string,
  apiKey: string,
  lookbackDays = 21,
): Promise<NewsArticle[]> {
  const to = formatDate(new Date())
  const from = formatDate(new Date(Date.now() - lookbackDays * 86_400_000))
  const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(
    symbol,
  )}&from=${from}&to=${to}&token=${encodeURIComponent(apiKey)}`

  const items = await fetchJson<FinnhubCompanyNewsItem[]>(url)

  return items.slice(0, 30).map((item) => ({
    provider: 'finnhub',
    source: item.source ?? 'finnhub',
    title: item.headline,
    body: item.summary || item.headline,
    url: item.url,
    tickers: item.related
      ? item.related.split(',').map((ticker) => ticker.trim()).filter(Boolean)
      : [symbol],
    publishedAt: new Date(item.datetime * 1000),
  }))
}
