'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
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

export default function SearchPage() {
  const [query, setQuery] = useState('')
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
                Sentiment (mock)
              </label>
              <Select value={sentiment} onValueChange={setSentiment}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Any sentiment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-3">
              {error ? (
                <p className="text-destructive text-sm">{error}</p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Results limited to 20 docs.
                </p>
              )}
              <Button type="submit" disabled={loading}>
                {loading ? 'Searching...' : 'Run Search'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>
            Generated by the AI summarizer using top-matching chunks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary ? (
            <p className="text-foreground leading-relaxed">{summary}</p>
          ) : (
            <p className="text-muted-foreground">Run a search to see a summary.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            Showing {displayed.length} of {results.length} (sentiment filter
            applied).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {displayed.length === 0 ? (
            <p className="text-muted-foreground">
              No results yet. Seed the DB and run a query.
            </p>
          ) : (
            displayed.map((result) => (
              <div
                key={result.id}
                className="rounded-xl border border-border bg-card/60 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{result.source}</Badge>
                    <div className="flex gap-1 flex-wrap">
                      {result.tickers?.map((t) => (
                        <Badge key={t} variant="outline">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        result.sentiment === 'positive'
                          ? 'secondary'
                          : result.sentiment === 'negative'
                            ? 'destructive'
                            : 'outline'
                      }
                    >
                      {result.sentiment}
                    </Badge>
                    {typeof result.score === 'number' && (
                      <span className="text-xs text-muted-foreground">
                        {(result.score * 100).toFixed(0)}% match
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(result.publishedAt), 'PPP p')}
                    </span>
                  </div>
                </div>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-lg font-semibold text-primary hover:underline block mt-2"
                >
                  {result.title}
                </a>
                <p className="text-sm text-muted-foreground mt-2">
                  {result.snippet}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
