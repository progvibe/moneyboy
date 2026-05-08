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
  const startDate = formatDate(new Date(Date.now() - 10 * 86_400_000))
  const url = `https://api.tiingo.com/tiingo/daily/${encodeURIComponent(
    symbol,
  )}/prices?startDate=${startDate}&token=${encodeURIComponent(token)}`
  const prices = await fetchJson<TiingoPrice[]>(url, token)
  const sortedPrices = prices
    .filter((item) => item.date && (item.adjClose ?? item.close) != null)
    .sort((a, b) => new Date(a.date ?? '').getTime() - new Date(b.date ?? '').getTime())
  const latest = sortedPrices.at(-1)
  const previous = sortedPrices.at(-2)
  const price = latest?.adjClose ?? latest?.close
  const previousClose = previous?.adjClose ?? previous?.close
  const change = price != null && previousClose != null ? price - previousClose : null
  const percentChange =
    change != null && previousClose ? (change / previousClose) * 100 : null

  if (!price) {
    throw new Error(`Tiingo returned no current price for ${symbol}`)
  }

  return {
    provider: 'tiingo',
    price,
    change,
    percentChange,
    pricedAt: latest?.date ? new Date(latest.date) : new Date(),
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
