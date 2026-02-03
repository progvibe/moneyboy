import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { ingestionRuns } from "@/db/schema";
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
  const [run] = await db
    .insert(ingestionRuns)
    .values({ runType: "cron", status: "running", startedAt })
    .returning();

  try {
    const newsResult = await ingestFinnhubNews({
      categories: ["general", "forex", "crypto", "merger"],
      maxPages: 3,
      minId: 0,
    });

    const tickerRows = await getTickerBatch(500);
    const tickers = tickerRows.map((row) => row.symbol);
    console.log('[cron-ingest] tickers selected', tickers.length)

    if (tickers.length === 0) {
      console.log('[cron-ingest] no tickers to ingest')
      await db
        .update(ingestionRuns)
        .set({
          status: "success",
          completedAt: new Date(),
          metadata: JSON.stringify({ newsResult, tickers: 0 }),
        })
        .where(eq(ingestionRuns.id, run.id));
      return NextResponse.json({ ok: true, startedAt, skipped: "no tickers" });
    }

    const companyResult = await ingestFinnhubCompanyNews({
      tickers,
      lookbackDays: 7,
      maxPerTicker: 30,
      minDelayMs: 1000,
    });

    await markTickersSynced(tickers, new Date());
    console.log('[cron-ingest] completed', new Date().toISOString())

    await db
      .update(ingestionRuns)
      .set({
        status: "success",
        completedAt: new Date(),
        metadata: JSON.stringify({
          newsResult,
          companyResult,
          tickers: tickers.length,
        }),
      })
      .where(eq(ingestionRuns.id, run.id));

    return NextResponse.json({ ok: true, startedAt });
  } catch (err) {
    console.error("Cron ingest failed:", err);
    await db
      .update(ingestionRuns)
      .set({
        status: "error",
        completedAt: new Date(),
        error: err instanceof Error ? err.message : "Cron ingest failed",
      })
      .where(eq(ingestionRuns.id, run.id));
    return NextResponse.json(
      { ok: false, error: "Cron ingest failed" },
      { status: 500 },
    );
  }
}
