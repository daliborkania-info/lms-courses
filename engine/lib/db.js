import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let db;
export function getDb() {
  if (db) return db;
  db = new Database(path.join(DATA_DIR, "lms.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      avatar TEXT NOT NULL DEFAULT '🧑‍🎓',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS progress (
      profile_id INTEGER NOT NULL,
      course_id TEXT NOT NULL,
      module_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'done',
      quiz_score INTEGER,
      quiz_total INTEGER,
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (profile_id, course_id, module_id)
    );
    CREATE TABLE IF NOT EXISTS xp_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      module_id TEXT,
      day TEXT NOT NULL DEFAULT (date('now','localtime')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS badges (
      profile_id INTEGER NOT NULL,
      badge_id TEXT NOT NULL,
      title TEXT NOT NULL,
      icon TEXT NOT NULL,
      awarded_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (profile_id, badge_id)
    );
    -- FSRS spaced repetition (additive migration, existing tables untouched)
    CREATE TABLE IF NOT EXISTS review_cards (
      profile_id INTEGER NOT NULL,
      card_key TEXT NOT NULL,
      course_id TEXT NOT NULL,
      module_id TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'New',
      due TEXT,
      card_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      first_seen_day TEXT,
      PRIMARY KEY (profile_id, card_key)
    );
    CREATE INDEX IF NOT EXISTS idx_review_due ON review_cards (profile_id, state, due);
    CREATE TABLE IF NOT EXISTS review_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      card_key TEXT NOT NULL,
      rating INTEGER NOT NULL,
      log_json TEXT NOT NULL,
      reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
      day TEXT NOT NULL DEFAULT (date('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_review_log_day ON review_log (profile_id, day);
    CREATE TABLE IF NOT EXISTS review_settings (
      profile_id INTEGER PRIMARY KEY,
      new_per_day INTEGER NOT NULL DEFAULT 15,
      xp_daily_cap INTEGER NOT NULL DEFAULT 40
    );
  `);
  return db;
}
