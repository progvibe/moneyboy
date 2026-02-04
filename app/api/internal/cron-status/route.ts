import { NextResponse } from "next/server";
import { getLatestRunProgress } from "@/lib/ingest/cron-runner";

export const runtime = "nodejs";

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
