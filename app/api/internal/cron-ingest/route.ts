import { NextResponse } from "next/server";
import {
  getTickerBatch,
  ingestFinnhubCompanyNews,
  ingestFinnhubNews,
  markTickersSynced,
} from "@/ingest/finnhub";

export const runtime = "nodejs";

export async function POST() {
  const startedAt = new Date();
  console.log('[cron-ingest] started', startedAt.toISOString())

  try {
    await ingestFinnhubNews({
      categories: ["general", "forex", "crypto", "merger"],
      maxPages: 3,
      minId: 0,
    });

    const tickerRows = await getTickerBatch(500);
    const tickers = tickerRows.map((row) => row.symbol);
    console.log('[cron-ingest] tickers selected', tickers.length)

    if (tickers.length === 0) {
      console.log('[cron-ingest] no tickers to ingest')
      return NextResponse.json({ ok: true, startedAt, skipped: "no tickers" });
    }

    await ingestFinnhubCompanyNews({
      tickers,
      lookbackDays: 7,
      maxPerTicker: 30,
      minDelayMs: 1000,
    });

    await markTickersSynced(tickers, new Date());
    console.log('[cron-ingest] completed', new Date().toISOString())

    return NextResponse.json({ ok: true, startedAt });
  } catch (err) {
    console.error("Cron ingest failed:", err);
    return NextResponse.json(
      { ok: false, error: "Cron ingest failed" },
      { status: 500 },
    );
  }
}
