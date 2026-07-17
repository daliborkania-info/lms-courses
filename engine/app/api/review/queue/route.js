import { NextResponse } from "next/server";
import { buildQueue, reviewCounts, syncCards } from "../../../../lib/review";

export const dynamic = "force-dynamic";

/**
 * GET /api/review/queue?profile=ID           -> full queue (due first, then new up to daily limit)
 * GET /api/review/queue?profile=ID&counts=1  -> counts only (home page tile)
 * Optional &extraNew=N adds N new cards beyond the daily limit (one-off boost).
 */
export async function GET(req) {
  const url = new URL(req.url);
  const profileId = Number(url.searchParams.get("profile") || 0);
  if (!profileId) return NextResponse.json({ error: "profile required" }, { status: 400 });

  if (url.searchParams.get("counts")) {
    syncCards(profileId);
    return NextResponse.json({ counts: reviewCounts(profileId) });
  }
  const extraNew = Number(url.searchParams.get("extraNew") || 0);
  return NextResponse.json(buildQueue(profileId, new Date(), extraNew));
}
