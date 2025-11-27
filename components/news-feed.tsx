import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
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
            <a
              key={item.id}
              href={item.url}
              className="block p-4 rounded-lg bg-secondary/30 border border-border hover:border-accent/50 transition-colors cursor-pointer group"
              target="_blank"
              rel="noreferrer"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-foreground font-medium leading-snug group-hover:text-accent transition-colors text-pretty">
                    {item.title}
                  </h3>
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
                      <span className="text-accent">{item.tickers.join(", ")}</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 text-pretty">{item.summary}</p>
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
