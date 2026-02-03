'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TickerQuickLook } from '@/components/ticker-quick-look'

type SearchResult = {
  id: string
  title: string
  url: string
  source: string
  tickers: string[]
  publishedAt: string | Date
  sentiment: string
  snippet: string
  score?: number
}

const DATE_RANGES = [
  { value: '7d', label: 'Past 7 days' },
  { value: '30d', label: 'Past 30 days' },
  { value: '90d', label: 'Past 90 days' },
]

export function SearchClient() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('query') ?? ''
  const [query, setQuery] = useState(initialQuery)
  const [tickersInput, setTickersInput] = useState('')
  const [dateRange, setDateRange] = useState('30d')
  const [sentiment, setSentiment] = useState('any')
  const [summary, setSummary] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const displayed = useMemo(() => {
    if (sentiment === 'any') return results
    return results.filter((r) => r.sentiment === sentiment)
  }, [results, sentiment])

  useEffect(() => {
    const preset = searchParams.get('query')
    if (preset !== null) {
      setQuery(preset)
    }
  }, [searchParams])

  async function runSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const tickers = tickersInput
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean)

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, tickers, dateRange }),
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setSummary(data.summary)
      setResults(data.results ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground font-mono">
          Search
        </p>
        <h1 className="text-3xl font-bold text-foreground mt-1">
          Financial document search
        </h1>
        <p className="text-muted-foreground mt-2">
          Filter by tickers and timeframe, then evolve into embeddings later.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Query builder</CardTitle>
          <CardDescription>
            Run a relational search against PlanetScale via Drizzle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            onSubmit={runSearch}
          >
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Query</label>
              <Input
                placeholder="e.g. AI chips demand outlook"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                Tickers (comma-separated)
              </label>
              <Input
                placeholder="NVDA, AAPL, MSFT"
                value={tickersInput}
                onChange={(e) => setTickersInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Date range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                Sentiment filter
              </label>
              <Select value={sentiment} onValueChange={setSentiment}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select sentiment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? 'Searching...' : 'Run search'}
              </Button>
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              {displayed.length
                ? `Showing ${displayed.length} results.`
                : 'Run a search to see results.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {displayed.length === 0 ? (
              <p className="text-muted-foreground">
                Run a search to see a summary.
              </p>
            ) : (
              displayed.map((result) => (
                <div key={result.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-lg font-semibold text-foreground hover:underline"
                      >
                        {result.title}
                      </a>
                      <p className="text-sm text-muted-foreground">
                        {result.source} •{' '}
                        {format(new Date(result.publishedAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {result.sentiment}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {result.snippet}
                  </p>
                  {result.tickers?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {result.tickers.map((ticker) => (
                        <TickerQuickLook key={ticker} ticker={ticker} />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>AI-assisted synthesis.</CardDescription>
          </CardHeader>
          <CardContent>
            {summary ? (
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {summary}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Run a search to see a summary.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
