import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  GitBranch,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { IngestionOverview as IngestionOverviewData } from "@/lib/queries/ingestion";

type IngestionOverviewProps = {
  overview: IngestionOverviewData;
};

function formatTime(date: Date | string | null | undefined) {
  if (!date) return "Never";
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return "Unknown";
  return value.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(start: Date | string, end?: Date | string | null) {
  const startedAt = start instanceof Date ? start : new Date(start);
  const endedAt = end ? (end instanceof Date ? end : new Date(end)) : new Date();
  const seconds = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
}

function statusClasses(status?: string | null) {
  if (status === "success") return "border-(--color-success)/30 text-(--color-success)";
  if (status === "error") return "border-destructive/40 text-destructive";
  return "border-primary/40 text-primary";
}

function SourceLabel({ source }: { source: string }) {
  const [job] = source.split(":");
  return <span className="uppercase">{job}</span>;
}

export function IngestionOverview({ overview }: IngestionOverviewProps) {
  const run = overview.latestCloudflareRun;
  const appRun = overview.latestAppCronRun;
  const activeScope = overview.cloudflareEnabledSymbols.length;
  const configuredScope = overview.cloudflareConfiguredSymbols.length;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="text-lg font-mono text-foreground flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            INGESTION CONTROL
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs border-primary/40 text-primary">
            {overview.cloudflareCadenceLabel}
          </Badge>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase">
              <Clock3 className="w-4 h-4" />
              Schedule
            </div>
            <p className="mt-2 text-lg font-bold font-mono text-foreground">
              {overview.cloudflareCron}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase">
              <Database className="w-4 h-4" />
              Scope
            </div>
            <p className="mt-2 text-lg font-bold font-mono text-foreground">
              {activeScope}/{configuredScope} tickers
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase">
              <Activity className="w-4 h-4" />
              Queue Load
            </div>
            <p className="mt-2 text-lg font-bold font-mono text-foreground">
              {overview.cloudflareJobsPerRun} jobs/run
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase">
              <CheckCircle2 className="w-4 h-4" />
              Expandable
            </div>
            <p className="mt-2 text-lg font-bold font-mono text-foreground">
              {overview.activeEnabledTickerCount} enabled
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
          <div className="rounded-lg border border-border bg-background/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase">
                  Cloudflare Worker
                </p>
                <p className="text-sm text-foreground">
                  Enqueues price, news, and sentiment jobs for the configured ticker set.
                </p>
              </div>
              <Badge variant="outline" className={`font-mono ${statusClasses(run?.status)}`}>
                {run?.status?.toUpperCase() ?? "NO RUNS"}
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase">Last Started</p>
                <p className="mt-1 font-mono text-foreground">{formatTime(run?.startedAt)}</p>
              </div>
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase">Duration</p>
                <p className="mt-1 font-mono text-foreground">
                  {run ? formatDuration(run.startedAt, run.completedAt) : "n/a"}
                </p>
              </div>
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase">Last App Cron</p>
                <p className="mt-1 font-mono text-foreground">{formatTime(appRun?.startedAt)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background/40 p-4">
            <p className="text-xs font-mono text-muted-foreground uppercase">Configured Symbols</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {overview.cloudflareConfiguredSymbols.map((symbol) => {
                const enabled = overview.cloudflareEnabledSymbols.includes(symbol);
                return (
                  <Badge
                    key={symbol}
                    variant="outline"
                    className={`font-mono ${
                      enabled
                        ? "border-(--color-success)/30 text-(--color-success)"
                        : "border-destructive/40 text-destructive"
                    }`}
                  >
                    {symbol}
                  </Badge>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Current code hard-filters Cloudflare ingestion to these symbols before the ticker limit is applied.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-background/40 p-4">
            <p className="text-xs font-mono text-muted-foreground uppercase">Cloudflare Job Health</p>
            <div className="mt-3 space-y-2">
              {overview.sourceHealth.length === 0 ? (
                <p className="text-sm text-muted-foreground">No Cloudflare job state has been recorded yet.</p>
              ) : (
                overview.sourceHealth.map((source) => (
                  <div
                    key={source.source}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/20 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-mono text-foreground">
                        <SourceLabel source={source.source} />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last success {formatTime(source.lastSuccessAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-foreground">{source.successCount} ok</p>
                      <p className="text-xs font-mono text-destructive">{source.errorCount} errors</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background/40 p-4">
            <p className="text-xs font-mono text-muted-foreground uppercase">Ticker Coverage</p>
            <div className="mt-3 space-y-2">
              {overview.tickerStates.map((ticker) => (
                <div
                  key={ticker.symbol}
                  className="grid grid-cols-[56px_1fr] gap-3 rounded-md border border-border bg-secondary/20 px-3 py-2"
                >
                  <div className="font-mono font-bold text-foreground">{ticker.symbol}</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <span className="text-muted-foreground">P {formatTime(ticker.priceAt)}</span>
                    <span className="text-muted-foreground">N {formatTime(ticker.newsAt)}</span>
                    <span className="text-muted-foreground">S {formatTime(ticker.sentimentAt)}</span>
                  </div>
                  {ticker.lastError ? (
                    <div className="col-span-2 flex items-start gap-2 text-xs text-destructive">
                      <AlertTriangle className="mt-0.5 w-3 h-3 shrink-0" />
                      <span className="line-clamp-2">{ticker.lastError}</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
