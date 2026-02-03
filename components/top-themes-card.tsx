'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type ThemeItem = {
  id: string
  label: string
  summary: string
  count: number
  querySeed: string
  tickers?: string[]
}

type TopThemesCardProps = {
  generatedAt: string
  windowHours: number
  themes: ThemeItem[]
  dailySummary?: string
}

function formatUpdatedAt(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Updated recently'
  return `Updated ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

function ThemeChip({ theme }: { theme: ThemeItem }) {
  const chip = (
    <Badge
      asChild
      variant="outline"
      className="gap-2 px-3 py-1.5 text-xs font-mono bg-background/70 hover:bg-accent transition-colors border-border/70"
    >
      <Link href={{ pathname: '/search', query: { query: theme.querySeed } }}>
        <span className="text-foreground">{theme.label}</span>
        <span className="text-[10px] text-muted-foreground">
          {theme.count} mentions
        </span>
      </Link>
    </Badge>
  )

  if (!theme.summary) return chip

  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent sideOffset={6} className="max-w-xs">
        {theme.summary}
      </TooltipContent>
    </Tooltip>
  )
}

export function TopThemesCard({
  generatedAt,
  windowHours,
  themes,
  dailySummary,
}: TopThemesCardProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg font-mono text-foreground flex items-center gap-2">
            <div className="w-1 h-6 bg-primary rounded-full" />
            TODAY&apos;S TOP THEMES
          </CardTitle>
          <CardDescription className="text-xs font-mono text-muted-foreground">
            Last {windowHours}h • {formatUpdatedAt(generatedAt)}
          </CardDescription>
        </div>
        {dailySummary ? (
          <p className="text-sm text-foreground leading-relaxed text-pretty">
            {dailySummary}
          </p>
        ) : null}
      </CardHeader>
      <CardContent>
        {themes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Not enough recent chunks to build themes yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {themes.map((theme) => (
              <ThemeChip key={theme.id} theme={theme} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
