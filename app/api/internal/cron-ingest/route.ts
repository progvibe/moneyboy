import { NextResponse } from "next/server";
import {
  getLatestRunProgress,
  runIngestionPipeline,
  startIngestionRun,
} from "@/lib/ingest/cron-runner";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const runTypeParam = searchParams.get("runType");
    const runType =
      runTypeParam === "manual" || runTypeParam === "cron"
        ? runTypeParam
        : "cron";
    const { runId, reused } = await startIngestionRun(runType);
    console.log('[cron-ingest] started', runId);
    if (reused) {
      return NextResponse.json({ ok: true, runId, reused, payload: null });
    }
    const payload = await runIngestionPipeline(runId);
    return NextResponse.json({ ok: true, runId, reused, payload });
  } catch (err) {
    console.error("Cron ingest failed:", err);
    return NextResponse.json(
      { ok: false, error: "Cron ingest failed" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const runTypeParam = searchParams.get("runType");
    const runType =
      runTypeParam === "manual" || runTypeParam === "cron"
        ? runTypeParam
        : "cron";

    const { runId, reused } = await startIngestionRun(runType);
    console.log("[cron-ingest] started", runId);
    if (reused) {
      return NextResponse.json({ ok: true, runId, reused, payload: null });
    }
    const payload = await runIngestionPipeline(runId);
    return NextResponse.json({ ok: true, runId, reused, payload });

  } catch (err) {
    console.error("Cron ingest failed:", err);
    return NextResponse.json(
      { ok: false, error: "Cron ingest failed" },
      { status: 500 },
    );
  }
}
