import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { totalXp, levelFor, getStreak } from "../../../lib/gamification";
import { getCourses, getModuleMeta } from "../../../lib/content";
import { reviewStats } from "../../../lib/review";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const profileId = Number(new URL(req.url).searchParams.get("profile") || 0);
  if (!profileId) return NextResponse.json({ error: "profile required" }, { status: 400 });
  const db = getDb();
  const xp = totalXp(profileId);
  const badges = db.prepare("SELECT badge_id id, title, icon, awarded_at FROM badges WHERE profile_id=? ORDER BY awarded_at DESC").all(profileId);
  const last14 = db.prepare(
    "SELECT day, SUM(amount) xp FROM xp_events WHERE profile_id=? GROUP BY day ORDER BY day DESC LIMIT 14"
  ).all(profileId);
  const done = db.prepare("SELECT course_id, COUNT(*) c FROM progress WHERE profile_id=? GROUP BY course_id").all(profileId);
  const courses = getCourses().map((c) => ({
    id: c.id, title: c.title, icon: c.icon,
    total: getModuleMeta(c.id).length,
    done: done.find((d) => d.course_id === c.id)?.c || 0
  }));
  return NextResponse.json({
    xp, level: levelFor(xp), streak: getStreak(profileId), badges, last14: last14.reverse(), courses,
    review: reviewStats(profileId)
  });
}
