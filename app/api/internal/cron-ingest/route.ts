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
    const runId = searchParams.get("runId");
    const latest = await getLatestRunProgress(runId);
    if (!latest) {
      return NextResponse.json({ ok: true, run: null });
    }
    const run = {
      ...latest,
      startedAt: latest.startedAt?.toISOString?.() ?? latest.startedAt,
      updatedAt: latest.updatedAt?.toISOString?.() ?? latest.updatedAt,
      completedAt: latest.completedAt?.toISOString?.() ?? latest.completedAt,
    };
    return NextResponse.json({ ok: true, run });
  } catch (err) {
    console.error("Cron status failed:", err);
    return NextResponse.json(
      { ok: false, error: "Cron status failed" },
      { status: 500 },
    );
  }
}
