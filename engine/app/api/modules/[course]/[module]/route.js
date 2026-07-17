import { NextResponse } from "next/server";
import { getModule, getModuleMeta } from "../../../../../lib/content";
import { getDb } from "../../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const mod = getModule(params.course, params.module);
  if (!mod) return NextResponse.json({ error: "not found" }, { status: 404 });
  const profileId = Number(new URL(req.url).searchParams.get("profile") || 0);
  const row = profileId
    ? getDb().prepare("SELECT quiz_score, quiz_total, completed_at FROM progress WHERE profile_id=? AND course_id=? AND module_id=?")
        .get(profileId, params.course, params.module)
    : null;
  // next module in course order
  const metas = getModuleMeta(params.course);
  const idx = metas.findIndex((m) => m.id === params.module);
  const next = idx >= 0 && idx + 1 < metas.length ? metas[idx + 1].id : null;
  return NextResponse.json({ ...mod, progress: row || null, nextModule: next });
}
