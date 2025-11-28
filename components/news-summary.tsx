import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type NewsSummaryProps = {
  summary: string | null
}

export function NewsSummary({ summary }: NewsSummaryProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-mono text-foreground flex items-center gap-2">
          <div className="w-1 h-6 bg-primary rounded-full" />
          AI NEWS SUMMARY
        </CardTitle>
      </CardHeader>
      <CardContent>
        {summary ? (
          <p className="text-sm text-foreground leading-relaxed text-pretty whitespace-pre-wrap">
            {summary}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No headlines available for summarization.</p>
        )}
      </CardContent>
    </Card>
  )
}
