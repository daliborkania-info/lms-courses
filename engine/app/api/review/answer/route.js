import { NextResponse } from "next/server";
import { answerCard, reviewCounts } from "../../../../lib/review";
import { evaluateBadges, totalXp, levelFor, getStreak } from "../../../../lib/gamification";

export const dynamic = "force-dynamic";

/** POST { profileId, cardKey, rating: 1|2|3|4 } */
export async function POST(req) {
  const { profileId, cardKey, rating } = await req.json();
  if (!profileId || !cardKey) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const result = answerCard(profileId, cardKey, rating);
  if (result.error) return NextResponse.json(result, { status: 400 });

  const newBadges = evaluateBadges(profileId);
  const xp = totalXp(profileId);
  return NextResponse.json({
    ...result,
    counts: reviewCounts(profileId),
    newBadges, xp, level: levelFor(xp), streak: getStreak(profileId)
  });
}
