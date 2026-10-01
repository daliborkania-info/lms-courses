import crypto from "crypto";
import { createEmptyCard, fsrs, generatorParameters, Rating, State } from "ts-fsrs";
import { getDb } from "./db";
import { getCourses, getAssessment } from "./content";
import { addXp } from "./gamification";

/**
 * FSRS spaced repetition across all courses.
 *
 * Card identity: courseId/moduleId/sha1(front)[:16]. Content stays in
 * courses/ (read-only); only scheduling state lives in the DB. Editing a
 * card's `back` keeps history, editing `front` creates a fresh card.
 * Cards enter learning once the module has a `progress` row for the profile.
 */

const XP_PER_REVIEW = 2;

const STATE_NAME = {
  [State.New]: "New",
  [State.Learning]: "Learning",
  [State.Review]: "Review",
  [State.Relearning]: "Relearning"
};

/**
 * No sub-day learning steps: with the default steps (1m/10m) a card in
 * Learning could never leave the session batch - "Těžké" repeated the same
 * step forever and "Dobré" needed two passes. With short-term scheduling
 * disabled, every rating schedules at least ~1 day out, so any answer except
 * "Znovu" removes the card from the current run. "Znovu" is re-drilled within
 * the session by the client (see `requeue` in answerCard).
 */
const scheduler = fsrs(generatorParameters({
  enable_fuzz: true,
  enable_short_term: false,
  learning_steps: [],
  relearning_steps: []
}));

export function cardKey(courseId, moduleId, front) {
  const h = crypto.createHash("sha1").update(String(front), "utf8").digest("hex").slice(0, 16);
  return `${courseId}/${moduleId}/${h}`;
}

/** JSON round-trip loses Date objects; restore them for ts-fsrs. */
function reviveCard(json) {
  const c = JSON.parse(json);
  if (c.due) c.due = new Date(c.due);
  if (c.last_review) c.last_review = new Date(c.last_review);
  return c;
}

function localDay() {
  return getDb().prepare("SELECT date('now','localtime') d").get().d;
}

export function getSettings(profileId) {
  const row = getDb().prepare("SELECT new_per_day, xp_daily_cap FROM review_settings WHERE profile_id=?").get(profileId);
  return row || { new_per_day: 15, xp_daily_cap: 40 };
}

/** All flashcards from the content for the profile's completed modules, keyed by card_key. */
function contentCardsForProfile(profileId) {
  const done = getDb().prepare("SELECT course_id, module_id FROM progress WHERE profile_id=?").all(profileId);
  const courses = Object.fromEntries(getCourses().map((c) => [c.id, c]));
  const map = new Map();
  for (const row of done) {
    const course = courses[row.course_id];
    if (!course) continue; // course folder removed
    const cards = getAssessment(row.course_id, row.module_id)?.flashcards;
    if (!Array.isArray(cards)) continue;
    for (const fc of cards) {
      if (!fc || !fc.front || !fc.back) continue;
      const key = cardKey(row.course_id, row.module_id, fc.front);
      map.set(key, {
        cardKey: key, front: fc.front, back: fc.back,
        courseId: row.course_id, moduleId: row.module_id,
        courseTitle: course.title, courseIcon: course.icon || "📘"
      });
    }
  }
  return map;
}

/** Idempotent: insert missing review_cards rows as New for every known content card. */
export function syncCards(profileId) {
  const map = contentCardsForProfile(profileId);
  insertMissing(profileId, map.values());
  return map;
}

/** Cheap variant used right after completing a single module. */
export function syncModuleCards(profileId, courseId, moduleId) {
  const cards = getAssessment(courseId, moduleId)?.flashcards;
  if (!Array.isArray(cards)) return;
  insertMissing(profileId, cards.filter((c) => c && c.front && c.back).map((c) => ({
    cardKey: cardKey(courseId, moduleId, c.front), courseId, moduleId
  })));
}

function insertMissing(profileId, items) {
  const db = getDb();
  const ins = db.prepare(
    "INSERT OR IGNORE INTO review_cards (profile_id, card_key, course_id, module_id, state, due, card_json) VALUES (?,?,?,?,'New',NULL,?)"
  );
  const emptyJson = JSON.stringify(createEmptyCard(new Date()));
  db.transaction(() => {
    for (const it of items) ins.run(profileId, it.cardKey, it.courseId, it.moduleId, emptyJson);
  })();
}

/** Human-friendly Czech interval label for a future date. */
function fmtInterval(from, to) {
  const min = Math.max(1, Math.round((to.getTime() - from.getTime()) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 36) return `${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} d`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo} měs`;
  return `${(d / 365).toFixed(1)} r`;
}

/** Preview of the next due for each rating (shown under the 4 buttons). */
function previewFor(card, now) {
  const rec = scheduler.repeat(card, now);
  const out = {};
  for (const r of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) {
    out[r] = fmtInterval(now, rec[r].card.due);
  }
  return out;
}

/**
 * Counts, optionally narrowed to one course. The daily new-card budget
 * (new_per_day, newToday) is always global - a course filter changes which
 * cards can fill the budget, not its size. doneToday is global too.
 */
export function reviewCounts(profileId, now = new Date(), courseId = null) {
  const db = getDb();
  const today = localDay();
  const scope = courseId ? " AND course_id=?" : "";
  const scopeArgs = courseId ? [courseId] : [];
  const due = db.prepare(
    `SELECT COUNT(*) c FROM review_cards WHERE profile_id=? AND state!='New' AND due<=?${scope}`
  ).get(profileId, now.toISOString(), ...scopeArgs).c;
  const newToday = db.prepare(
    "SELECT COUNT(*) c FROM review_cards WHERE profile_id=? AND first_seen_day=?"
  ).get(profileId, today).c;
  const doneToday = db.prepare(
    "SELECT COUNT(*) c FROM review_log WHERE profile_id=? AND day=?"
  ).get(profileId, today).c;
  const learning = db.prepare(
    `SELECT COUNT(*) c FROM review_cards WHERE profile_id=? AND state!='New'${scope}`
  ).get(profileId, ...scopeArgs).c;
  // cap the daily budget by the cards that actually exist, otherwise the
  // home tile promises new cards that are not there
  const newAvailable = db.prepare(
    `SELECT COUNT(*) c FROM review_cards WHERE profile_id=? AND state='New'${scope}`
  ).get(profileId, ...scopeArgs).c;
  const settings = getSettings(profileId);
  return {
    due, newToday, doneToday, learning,
    newRemaining: Math.max(0, Math.min(settings.new_per_day - newToday, newAvailable))
  };
}

/**
 * Per-course card counts for the filter chips on the review page.
 * Counts come from the DB (same source as reviewCounts); titles/icons from
 * content. Courses whose folder no longer exists are skipped.
 */
function courseSummary(profileId, now) {
  const db = getDb();
  const rows = db.prepare(
    `SELECT course_id,
            SUM(CASE WHEN state!='New' AND due<=? THEN 1 ELSE 0 END) due,
            SUM(CASE WHEN state='New' THEN 1 ELSE 0 END) newAvailable
     FROM review_cards WHERE profile_id=? GROUP BY course_id`
  ).all(now.toISOString(), profileId);
  const byId = new Map(rows.map((r) => [r.course_id, r]));
  return getCourses()
    .filter((c) => byId.has(c.id))
    .map((c) => {
      const r = byId.get(c.id);
      return { id: c.id, title: c.title, icon: c.icon || "📘", due: r.due, newAvailable: r.newAvailable };
    });
}

/**
 * Build the cross-course queue: due cards first (by due date), then new
 * cards up to the daily limit, round-robin across courses. Cards whose key
 * no longer exists in the content are silently skipped (edited/removed).
 * With `courseId` the queue is limited to that course; the daily new-card
 * budget stays global (see reviewCounts).
 */
export function buildQueue(profileId, now = new Date(), extraNew = 0, courseId = null) {
  const content = syncCards(profileId);
  const db = getDb();
  const scope = courseId ? " AND course_id=?" : "";
  const scopeArgs = courseId ? [courseId] : [];

  const dueRows = db.prepare(
    `SELECT card_key, card_json FROM review_cards WHERE profile_id=? AND state!='New' AND due<=?${scope} ORDER BY due`
  ).all(profileId, now.toISOString(), ...scopeArgs);

  const queue = [];
  for (const row of dueRows) {
    const info = content.get(row.card_key);
    if (!info) continue;
    const card = reviveCard(row.card_json);
    queue.push({ ...info, state: STATE_NAME[card.state] ?? "Review", preview: previewFor(card, now) });
  }

  const counts = reviewCounts(profileId, now, courseId);
  let budget = counts.newRemaining + Math.max(0, Number(extraNew) || 0);
  if (budget > 0) {
    const newRows = db.prepare(
      `SELECT card_key, course_id, card_json FROM review_cards WHERE profile_id=? AND state='New'${scope} ORDER BY course_id, module_id, card_key`
    ).all(profileId, ...scopeArgs).filter((r) => content.has(r.card_key));
    // round-robin across courses so a backfill does not dump one course first
    const byCourse = new Map();
    for (const r of newRows) {
      if (!byCourse.has(r.course_id)) byCourse.set(r.course_id, []);
      byCourse.get(r.course_id).push(r);
    }
    const buckets = [...byCourse.values()];
    let i = 0;
    while (budget > 0 && buckets.some((b) => b.length)) {
      const bucket = buckets[i % buckets.length];
      i++;
      if (!bucket.length) continue;
      const r = bucket.shift();
      const card = reviveCard(r.card_json);
      queue.push({ ...content.get(r.card_key), state: "New", preview: previewFor(card, now) });
      budget--;
    }
  }

  const nextDue = db.prepare(
    `SELECT MIN(due) d FROM review_cards WHERE profile_id=? AND state!='New' AND due>?${scope}`
  ).get(profileId, now.toISOString(), ...scopeArgs).d;

  return {
    queue,
    counts: { ...counts, inQueue: queue.length },
    nextDueAt: nextDue,
    courses: courseSummary(profileId, now)
  };
}

/** XP for reviews, capped per day so the queue cannot be farmed. */
function addReviewXp(profileId, moduleId) {
  const db = getDb();
  const cap = getSettings(profileId).xp_daily_cap;
  const today = localDay();
  const spent = db.prepare(
    "SELECT COALESCE(SUM(amount),0) s FROM xp_events WHERE profile_id=? AND day=? AND reason='review'"
  ).get(profileId, today).s;
  const amount = Math.min(XP_PER_REVIEW, Math.max(0, cap - spent));
  if (amount > 0) addXp(profileId, amount, "review", moduleId);
  return amount;
}

/**
 * Apply a rating (1 Again, 2 Hard, 3 Good, 4 Easy) to a card.
 * Returns scheduling info + whether the card should re-enter this session.
 */
export function answerCard(profileId, key, rating, now = new Date()) {
  const r = Number(rating);
  if (![1, 2, 3, 4].includes(r)) return { error: "invalid rating" };
  const db = getDb();
  const row = db.prepare(
    "SELECT card_json, state, module_id, first_seen_day FROM review_cards WHERE profile_id=? AND card_key=?"
  ).get(profileId, key);
  if (!row) return { error: "card not found" };

  const prev = reviveCard(row.card_json);
  const { card, log } = scheduler.next(prev, now, r);
  const today = localDay();

  db.transaction(() => {
    db.prepare(
      "UPDATE review_cards SET card_json=?, state=?, due=?, first_seen_day=COALESCE(first_seen_day, ?) WHERE profile_id=? AND card_key=?"
    ).run(
      JSON.stringify(card), STATE_NAME[card.state] ?? "Review", card.due.toISOString(),
      row.state === "New" ? today : row.first_seen_day, profileId, key
    );
    db.prepare(
      "INSERT INTO review_log (profile_id, card_key, rating, log_json) VALUES (?,?,?,?)"
    ).run(profileId, key, r, JSON.stringify(log));
  })();

  const xpGained = addReviewXp(profileId, row.module_id);
  return {
    cardKey: key,
    state: STATE_NAME[card.state] ?? "Review",
    dueAt: card.due.toISOString(),
    interval: fmtInterval(now, card.due),
    // "Znovu" re-enters the current run (client appends it to the end of the
    // queue with fresh previews); every other rating leaves the session.
    requeue: r === Rating.Again ? { preview: previewFor(card, now) } : null,
    xpGained
  };
}

/** Aggregates for the stats page. */
export function reviewStats(profileId) {
  const db = getDb();
  const counts = reviewCounts(profileId);
  const total = db.prepare("SELECT COUNT(*) c FROM review_log WHERE profile_id=?").get(profileId).c;
  const last30 = db.prepare(
    "SELECT COUNT(*) c, SUM(CASE WHEN rating>=2 THEN 1 ELSE 0 END) ok FROM review_log WHERE profile_id=? AND day>=date('now','localtime','-30 days')"
  ).get(profileId);
  return {
    learning: counts.learning,
    due: counts.due,
    doneToday: counts.doneToday,
    total,
    retention30: last30.c > 0 ? Math.round((last30.ok / last30.c) * 100) : null
  };
}
