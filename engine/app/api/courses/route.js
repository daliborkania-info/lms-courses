import { NextResponse } from "next/server";
import { getCourses, getModuleMeta } from "../../../lib/content";
import { getDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const profileId = Number(new URL(req.url).searchParams.get("profile") || 0);
  const done = profileId
    ? getDb().prepare("SELECT course_id, module_id FROM progress WHERE profile_id=?").all(profileId)
    : [];
  const doneSet = new Set(done.map((d) => d.course_id + "/" + d.module_id));
  // last module activity per course (first completion or refreshed quiz timestamp)
  const lastActivity = profileId
    ? Object.fromEntries(
        getDb().prepare("SELECT course_id, MAX(completed_at) t FROM progress WHERE profile_id=? GROUP BY course_id")
          .all(profileId).map((r) => [r.course_id, r.t])
      )
    : {};
  const courses = getCourses().map((c, idx) => {
    const metas = getModuleMeta(c.id);
    const doneCount = metas.filter((m) => doneSet.has(c.id + "/" + m.id)).length;
    const totalXp = metas.reduce((s, m) => s + (m.xp || 0), 0);
    const minutes = metas.reduce((s, m) => s + (m.minutes || 0), 0);
    return {
      id: c.id, title: c.title, description: c.description, level: c.level,
      icon: c.icon, requires: c.requires, version: c.version,
      moduleCount: metas.length, doneCount, totalXp, minutes,
      lastActivityAt: lastActivity[c.id] || null,
      _order: idx,
      semesters: (c.semesters || []).map((s) => ({ number: s.number, title: s.title, count: s.modules.length }))
    };
  });
  // Group order: 1) started & unfinished (least recently touched first),
  // 2) not started (original order), 3) finished (least recently touched first).
  const group = (c) =>
    c.doneCount === 0 ? 1 : (c.moduleCount > 0 && c.doneCount >= c.moduleCount ? 2 : 0);
  courses.sort((a, b) => {
    const ga = group(a), gb = group(b);
    if (ga !== gb) return ga - gb;
    if (ga === 1) return a._order - b._order;
    return String(a.lastActivityAt).localeCompare(String(b.lastActivityAt)) || (a._order - b._order);
  });
  for (const c of courses) delete c._order;
  return NextResponse.json(courses);
}
