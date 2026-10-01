import { NextResponse } from "next/server";
import { getCourse, getModuleMeta } from "../../../../lib/content";
import { getDb } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const course = getCourse(params.course);
  if (!course) return NextResponse.json({ error: "not found" }, { status: 404 });
  const profileId = Number(new URL(req.url).searchParams.get("profile") || 0);
  const done = profileId
    ? getDb().prepare("SELECT module_id, quiz_score, quiz_total FROM progress WHERE profile_id=? AND course_id=?")
        .all(profileId, course.id)
    : [];
  const doneMap = Object.fromEntries(done.map((d) => [d.module_id, d]));
  const metas = getModuleMeta(course.id);

  const semesters = (course.semesters || []).map((s) => ({
    number: s.number,
    title: s.title,
    modules: s.modules.map((id) => {
      const m = metas.find((x) => x.id === id) || { id, title: id };
      const prereqOk = (m.prerequisites || []).every((p) => doneMap[p]);
      return {
        id: m.id, title: m.title, type: m.type, minutes: m.minutes, difficulty: m.difficulty,
        xp: m.xp, volatility: m.volatility,
        done: !!doneMap[m.id], quiz: doneMap[m.id] ? { score: doneMap[m.id].quiz_score, total: doneMap[m.id].quiz_total } : null,
        locked: !prereqOk && !doneMap[m.id]
      };
    })
  }));
  return NextResponse.json({
    id: course.id, title: course.title, description: course.description,
    level: course.level, icon: course.icon, semester_label: course.semester_label || null, semesters
  });
}
