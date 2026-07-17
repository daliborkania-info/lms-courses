import { getDb } from "./db";
import { getCourses, getModuleMeta } from "./content";

export function addXp(profileId, amount, reason, moduleId = null) {
  if (amount <= 0) return;
  getDb().prepare(
    "INSERT INTO xp_events (profile_id, amount, reason, module_id) VALUES (?,?,?,?)"
  ).run(profileId, amount, reason, moduleId);
}

export function totalXp(profileId) {
  const r = getDb().prepare("SELECT COALESCE(SUM(amount),0) s FROM xp_events WHERE profile_id=?").get(profileId);
  return r.s;
}

export function levelFor(xp) {
  // level n requires n*n*100 XP cumulatively (1:100, 2:400, 3:900...)
  let lvl = 0;
  while ((lvl + 1) * (lvl + 1) * 100 <= xp) lvl++;
  const cur = lvl * lvl * 100;
  const next = (lvl + 1) * (lvl + 1) * 100;
  return { level: lvl, xp, nextLevelXp: next, progress: Math.min(1, (xp - cur) / (next - cur)) };
}

/** Streak = consecutive days (ending today or yesterday) with at least one XP event. */
export function getStreak(profileId) {
  const rows = getDb().prepare(
    "SELECT DISTINCT day FROM xp_events WHERE profile_id=? ORDER BY day DESC LIMIT 400"
  ).all(profileId).map((r) => r.day);
  if (rows.length === 0) return { current: 0, best: 0, activeToday: false };
  const dayMs = 86400000;
  const toUTC = (s) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  const today = new Date();
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const set = new Set(rows.map(toUTC));
  // current
  let cur = 0;
  let anchor = set.has(todayUTC) ? todayUTC : (set.has(todayUTC - dayMs) ? todayUTC - dayMs : null);
  if (anchor !== null) { let t = anchor; while (set.has(t)) { cur++; t -= dayMs; } }
  // best
  const sorted = [...set].sort((a, b) => a - b);
  let best = 0, run = 0, prev = null;
  for (const d of sorted) { run = prev !== null && d - prev === dayMs ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  return { current: cur, best, activeToday: set.has(todayUTC) };
}

function award(profileId, id, title, icon, out) {
  const res = getDb().prepare(
    "INSERT OR IGNORE INTO badges (profile_id, badge_id, title, icon) VALUES (?,?,?,?)"
  ).run(profileId, id, title, icon);
  if (res.changes > 0) out.push({ id, title, icon });
}

/** Evaluate all badge rules; returns newly awarded badges. */
export function evaluateBadges(profileId) {
  const db = getDb();
  const out = [];
  const done = db.prepare("SELECT course_id, module_id, quiz_score, quiz_total FROM progress WHERE profile_id=?").all(profileId);
  const doneSet = new Set(done.map((d) => d.course_id + "/" + d.module_id));

  if (done.length >= 1) award(profileId, "first-module", "První modul dokončen", "🚀", out);
  const perfect = done.filter((d) => d.quiz_total > 0 && d.quiz_score === d.quiz_total).length;
  if (perfect >= 5) award(profileId, "quiz-ace-5", "5x bezchybný kvíz", "🎯", out);
  if (perfect >= 20) award(profileId, "quiz-ace-20", "20x bezchybný kvíz", "🏹", out);

  const streak = getStreak(profileId);
  if (streak.best >= 3) award(profileId, "streak-3", "Streak 3 dny", "🔥", out);
  if (streak.best >= 7) award(profileId, "streak-7", "Streak 7 dní", "🔥", out);
  if (streak.best >= 30) award(profileId, "streak-30", "Streak 30 dní", "🌋", out);

  // FSRS reviews (queried directly to avoid a circular import with lib/review.js)
  const rev = db.prepare(
    "SELECT COUNT(*) total, SUM(CASE WHEN rating>=2 THEN 1 ELSE 0 END) ok FROM review_log WHERE profile_id=?"
  ).get(profileId);
  if (rev.total >= 100) award(profileId, "review-100", "Stovka v hlavě", "🧠", out);
  if (rev.total >= 1000) award(profileId, "review-1000", "Tisícovka opakování", "🏛️", out);
  if (rev.total >= 200 && rev.ok / rev.total >= 0.9)
    award(profileId, "retention-90", "Železná paměť", "🔒", out);
  const revDays = db.prepare(
    "SELECT COUNT(*) c FROM (SELECT DISTINCT day FROM review_log WHERE profile_id=? AND day>=date('now','localtime','-6 days'))"
  ).get(profileId).c;
  if (revDays >= 7) award(profileId, "review-days-7", "Týden opakování v kuse", "🧹", out);

  for (const course of getCourses()) {
    const metas = getModuleMeta(course.id);
    for (const b of course.badges || []) {
      if (b.rule?.type === "semester_complete") {
        const mods = metas.filter((m) => m.semester === b.rule.semester);
        if (mods.length > 0 && mods.every((m) => doneSet.has(course.id + "/" + m.id)))
          award(profileId, course.id + ":" + b.id, b.title, b.icon || "🏅", out);
      }
      if (b.rule?.type === "course_complete") {
        if (metas.length > 0 && metas.every((m) => doneSet.has(course.id + "/" + m.id)))
          award(profileId, course.id + ":" + b.id, b.title, b.icon || "🎖️", out);
      }
    }
  }
  return out;
}
