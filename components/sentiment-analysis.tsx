import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { SentimentBucket } from "@/lib/queries/dashboard"

type SentimentAnalysisProps = {
  buckets: SentimentBucket[]
}

export function SentimentAnalysis({ buckets }: SentimentAnalysisProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-mono text-foreground flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          AI SENTIMENT ANALYSIS
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {buckets.length === 0 && <p className="text-sm text-muted-foreground font-mono">No sentiment yet.</p>}
          {buckets.map((item) => {
            const Icon =
              item.color === "success" ? TrendingUp : item.color === "destructive" ? TrendingDown : Minus

            return (
              <div key={item.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`w-4 h-4 ${
                        item.color === "success"
                          ? "text-(--color-success)"
                          : item.color === "destructive"
                            ? "text-destructive"
                            : "text-(--color-info)"
                      }`}
                    />
                    <span className="text-sm text-foreground">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-mono ${
                        item.color === "success"
                          ? "text-(--color-success)"
                          : item.color === "destructive"
                            ? "text-destructive"
                            : "text-(--color-info)"
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="text-sm font-mono text-muted-foreground">{item.score}</span>
                  </div>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.color === "success"
                        ? "bg-(--color-success)"
                        : item.color === "destructive"
                          ? "bg-destructive"
                          : "bg-(--color-info)"
                    }`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/30">
          <p className="text-xs text-muted-foreground font-mono mb-2">AI INSIGHT</p>
          <p className="text-sm text-foreground leading-relaxed text-pretty">
            Market sentiment remains strong with tech leading gains. Energy sector shows weakness due to geopolitical
            concerns. Overall outlook suggests continued bullish momentum in Q1.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
