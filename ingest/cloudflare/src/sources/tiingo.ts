import type { NewsArticle, PriceQuote } from '../types'

type TiingoPrice = {
  date?: string
  close?: number
  adjClose?: number
}

type TiingoNewsItem = {
  title?: string
  description?: string
  url?: string
  source?: string
  publishedDate?: string
  tickers?: string[]
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

async function fetchJson<T>(url: string, token: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Tiingo request failed: ${res.status} ${res.statusText}`)
  }

  return (await res.json()) as T
}

export async function fetchPrice(
  symbol: string,
  token: string,
): Promise<PriceQuote> {
  const url = `https://api.tiingo.com/tiingo/daily/${encodeURIComponent(
    symbol,
  )}/prices?token=${encodeURIComponent(token)}`
  const prices = await fetchJson<TiingoPrice[]>(url, token)
  const latest = prices[0]
  const price = latest?.adjClose ?? latest?.close

  if (!price) {
    throw new Error(`Tiingo returned no current price for ${symbol}`)
  }

  return {
    provider: 'tiingo',
    price,
    pricedAt: latest.date ? new Date(latest.date) : new Date(),
  }
}

export async function fetchNews(
  symbol: string,
  token: string,
  lookbackDays = 21,
): Promise<NewsArticle[]> {
  const startDate = formatDate(new Date(Date.now() - lookbackDays * 86_400_000))
  const url = `https://api.tiingo.com/tiingo/news?tickers=${encodeURIComponent(
    symbol,
  )}&startDate=${startDate}&limit=30&token=${encodeURIComponent(token)}`
  const items = await fetchJson<TiingoNewsItem[]>(url, token)

  return items
    .filter((item) => item.title && item.url)
    .map((item) => ({
      provider: 'tiingo',
      source: item.source ?? 'tiingo',
      title: item.title ?? '',
      body: item.description || item.title || '',
      url: item.url ?? '',
      tickers: item.tickers?.length ? item.tickers : [symbol],
      publishedAt: item.publishedDate ? new Date(item.publishedDate) : new Date(),
    }))
}
