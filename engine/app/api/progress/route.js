import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { getModule } from "../../../lib/content";
import { addXp, evaluateBadges, totalXp, levelFor, getStreak } from "../../../lib/gamification";
import { syncModuleCards } from "../../../lib/review";

export const dynamic = "force-dynamic";

/**
 * POST { profileId, courseId, moduleId, action: "complete" | "quiz", quizScore?, quizTotal? }
 * XP rules:
 *  - first completion of a module -> module.xp
 *  - quiz: bonus = round(score/total * 50), only the improvement over previous best is added
 */
export async function POST(req) {
  const { profileId, courseId, moduleId, action, quizScore, quizTotal } = await req.json();
  if (!profileId || !courseId || !moduleId) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const mod = getModule(courseId, moduleId);
  if (!mod) return NextResponse.json({ error: "module not found" }, { status: 404 });

  const db = getDb();
  const existing = db.prepare(
    "SELECT quiz_score, quiz_total FROM progress WHERE profile_id=? AND course_id=? AND module_id=?"
  ).get(profileId, courseId, moduleId);

  let gained = 0;
  if (action === "complete") {
    if (!existing) {
      db.prepare("INSERT INTO progress (profile_id, course_id, module_id) VALUES (?,?,?)")
        .run(profileId, courseId, moduleId);
      gained += mod.meta.xp || 0;
      addXp(profileId, mod.meta.xp || 0, "module_complete", moduleId);
    }
  } else if (action === "quiz") {
    const total = Number(quizTotal) || 0;
    const score = Math.min(Number(quizScore) || 0, total);
    const newBonus = total > 0 ? Math.round((score / total) * 50) : 0;
    const prevBonus = existing && existing.quiz_total > 0
      ? Math.round((existing.quiz_score / existing.quiz_total) * 50) : 0;
    if (!existing) {
      db.prepare("INSERT INTO progress (profile_id, course_id, module_id, quiz_score, quiz_total) VALUES (?,?,?,?,?)")
        .run(profileId, courseId, moduleId, score, total);
      gained += (mod.meta.xp || 0) + newBonus;
      addXp(profileId, mod.meta.xp || 0, "module_complete", moduleId);
      if (newBonus > 0) addXp(profileId, newBonus, "quiz", moduleId);
    } else {
      const bestScore = Math.max(score, existing.quiz_score || 0);
      // refresh completed_at: a quiz retake counts as "worked on this course" for the home page ordering
      db.prepare("UPDATE progress SET quiz_score=?, quiz_total=?, completed_at=datetime('now') WHERE profile_id=? AND course_id=? AND module_id=?")
        .run(bestScore, total, profileId, courseId, moduleId);
      const diff = Math.max(0, newBonus - prevBonus);
      if (diff > 0) { gained += diff; addXp(profileId, diff, "quiz_improved", moduleId); }
    }
  }

  // module finished -> its flashcards enter the FSRS queue as "new"
  syncModuleCards(profileId, courseId, moduleId);

  const newBadges = evaluateBadges(profileId);
  const xp = totalXp(profileId);
  return NextResponse.json({
    gained, newBadges, xp, level: levelFor(xp), streak: getStreak(profileId)
  });
}
