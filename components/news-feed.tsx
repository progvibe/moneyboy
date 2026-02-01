import { Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TickerQuickLook } from "@/components/ticker-quick-look"
import type { NewsItem } from "@/lib/queries/dashboard"

type NewsFeedProps = {
  items: NewsItem[]
}

export function NewsFeed({ items }: NewsFeedProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-mono text-foreground flex items-center gap-2">
          <div className="w-1 h-6 bg-accent rounded-full" />
          BREAKING NEWS
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground font-mono">No headlines yet. Check back soon.</p>
          )}
          {items.map((item) => (
            <div
              key={item.id}
              className="block p-4 rounded-lg bg-secondary/30 border border-border hover:border-accent/50 transition-colors group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={item.url}
                    className="text-foreground font-medium leading-snug group-hover:text-accent transition-colors text-pretty"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {item.title}
                  </a>
                  <Badge
                    variant="outline"
                    className={`shrink-0 font-mono text-xs ${
                      item.sentiment === "positive"
                        ? "border-(--color-success) text-(--color-success)"
                        : item.sentiment === "negative"
                          ? "border-destructive text-destructive"
                          : "border-(--color-info) text-(--color-info)"
                    }`}
                  >
                    {item.sentiment}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                  <span>{item.source}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.timeLabel}
                  </span>
                  {item.tickers.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex flex-wrap items-center gap-1">
                        {item.tickers.map((ticker) => (
                          <TickerQuickLook key={ticker} ticker={ticker} />
                        ))}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 text-pretty">{item.summary}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
