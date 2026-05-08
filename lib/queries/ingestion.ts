import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export type IngestionRunSummary = {
  id: string;
  runType: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
  metadata: string | null;
};

export type IngestionSourceHealth = {
  source: string;
  successCount: number;
  errorCount: number;
  lastSuccessAt: Date | null;
  lastError: string | null;
};

export type IngestionTickerState = {
  symbol: string;
  priceAt: Date | null;
  newsAt: Date | null;
  sentimentAt: Date | null;
  lastError: string | null;
};

export type IngestionOverview = {
  cloudflareCron: string;
  cloudflareCadenceLabel: string;
  cloudflareTickerLimit: number;
  cloudflareConfiguredSymbols: string[];
  cloudflareEnabledSymbols: string[];
  cloudflareJobsPerRun: number;
  activeEnabledTickerCount: number;
  latestCloudflareRun: IngestionRunSummary | null;
  latestAppCronRun: IngestionRunSummary | null;
  sourceHealth: IngestionSourceHealth[];
  tickerStates: IngestionTickerState[];
};

const CLOUDFLARE_CRON = "0 * * * *";
const CLOUDFLARE_CADENCE_LABEL = "Hourly";
const CLOUDFLARE_TICKER_LIMIT = 3;
const CLOUDFLARE_CONFIGURED_SYMBOLS = ["AAPL", "TSLA", "NVDA"];
const CLOUDFLARE_JOB_TYPES = ["price", "news", "sentiment"];
const CLOUDFLARE_SYMBOLS_SQL = sql`array[${sql.join(
  CLOUDFLARE_CONFIGURED_SYMBOLS.map((symbol) => sql`${symbol}`),
  sql`, `,
)}]::text[]`;

function getExecuteRows<T>(result: { rows?: T[] } | T[]): T[] {
  if (Array.isArray(result)) return result;
  if ("rows" in result && Array.isArray(result.rows)) return result.rows;
  return [];
}

function parseRunMetadata(metadata: string | null) {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata) as { symbols?: number; jobs?: number };
  } catch {
    return null;
  }
}

export async function getIngestionOverview(): Promise<IngestionOverview> {
  const [
    enabledSymbolsResult,
    tickerCountResult,
    latestCloudflareResult,
    latestAppCronResult,
    sourceHealthResult,
    tickerStatesResult,
  ] = await Promise.all([
    db.execute<{ symbol: string }>(sql`
      select symbol
      from tickers
      where active = true
        and enabled = true
        and symbol = any(${CLOUDFLARE_SYMBOLS_SQL})
      order by priority asc, "lastSyncedAt" asc nulls first, symbol asc
      limit ${CLOUDFLARE_TICKER_LIMIT}
    `),
    db.execute<{ count: number }>(sql`
      select count(*)::int as count
      from tickers
      where active = true
        and enabled = true
    `),
    db.execute<IngestionRunSummary>(sql`
      select id, "runType", status, "startedAt", "completedAt", error, metadata
      from ingestion_runs
      where "runType" = 'cloudflare-cron'
      order by "startedAt" desc
      limit 1
    `),
    db.execute<IngestionRunSummary>(sql`
      select id, "runType", status, "startedAt", "completedAt", error, metadata
      from ingestion_runs
      where "runType" in ('cron', 'manual')
      order by "startedAt" desc
      limit 1
    `),
    db.execute<IngestionSourceHealth>(sql`
      select
        source,
        count(*) filter (where last_success_at is not null)::int as "successCount",
        count(*) filter (where last_error is not null)::int as "errorCount",
        max(last_success_at) as "lastSuccessAt",
        max(last_error) filter (where last_error is not null) as "lastError"
      from ticker_ingestion_state
      where source like '%:cloudflare'
      group by source
      order by source asc
    `),
    db.execute<IngestionTickerState>(sql`
      select
        t.symbol,
        max(s.last_success_at) filter (where s.source = 'price:cloudflare') as "priceAt",
        max(s.last_success_at) filter (where s.source = 'news:cloudflare') as "newsAt",
        max(s.last_success_at) filter (where s.source = 'sentiment:cloudflare') as "sentimentAt",
        max(s.last_error) filter (where s.last_error is not null) as "lastError"
      from tickers t
      left join ticker_ingestion_state s
        on s.symbol = t.symbol
       and s.source like '%:cloudflare'
      where t.symbol = any(${CLOUDFLARE_SYMBOLS_SQL})
      group by t.symbol
      order by array_position(${CLOUDFLARE_SYMBOLS_SQL}, t.symbol)
    `),
  ]);

  const enabledSymbols = getExecuteRows(enabledSymbolsResult).map((row) => row.symbol);
  const latestCloudflareRun = getExecuteRows(latestCloudflareResult)[0] ?? null;
  const metadata = parseRunMetadata(latestCloudflareRun?.metadata ?? null);

  return {
    cloudflareCron: CLOUDFLARE_CRON,
    cloudflareCadenceLabel: CLOUDFLARE_CADENCE_LABEL,
    cloudflareTickerLimit: CLOUDFLARE_TICKER_LIMIT,
    cloudflareConfiguredSymbols: CLOUDFLARE_CONFIGURED_SYMBOLS,
    cloudflareEnabledSymbols: enabledSymbols,
    cloudflareJobsPerRun:
      metadata?.jobs ??
      enabledSymbols.length * CLOUDFLARE_JOB_TYPES.length,
    activeEnabledTickerCount: getExecuteRows(tickerCountResult)[0]?.count ?? 0,
    latestCloudflareRun,
    latestAppCronRun: getExecuteRows(latestAppCronResult)[0] ?? null,
    sourceHealth: getExecuteRows(sourceHealthResult),
    tickerStates: getExecuteRows(tickerStatesResult),
  };
}
