import fs from "fs";
import path from "path";
import matter from "gray-matter";

export const COURSES_DIR = process.env.COURSES_DIR || path.join(process.cwd(), "..", "courses");
const TTL_MS = 15000;

let cache = { at: 0, courses: null };

function safeReadJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return null; }
}

/** Scan courses directory. New folder with course.json = new course, no rebuild needed. */
export function getCourses() {
  const now = Date.now();
  if (cache.courses && now - cache.at < TTL_MS) return cache.courses;
  const courses = [];
  if (fs.existsSync(COURSES_DIR)) {
    for (const dir of fs.readdirSync(COURSES_DIR)) {
      const cj = path.join(COURSES_DIR, dir, "course.json");
      if (!fs.existsSync(cj)) continue;
      const manifest = safeReadJSON(cj);
      if (!manifest || !manifest.id) continue;
      manifest._dir = dir;
      courses.push(manifest);
    }
  }
  courses.sort((a, b) => (a.requires ? 1 : 0) - (b.requires ? 1 : 0));
  cache = { at: now, courses };
  return courses;
}

export function getCourse(courseId) {
  return getCourses().find((c) => c.id === courseId) || null;
}

export function getModuleMeta(courseId) {
  const course = getCourse(courseId);
  if (!course) return [];
  const dir = path.join(COURSES_DIR, course._dir, "modules");
  if (!fs.existsSync(dir)) return [];
  const metas = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".md")) continue;
    try {
      const { data } = matter(fs.readFileSync(path.join(dir, f), "utf-8"));
      metas.push(data);
    } catch { /* skip broken file */ }
  }
  metas.sort((a, b) => (a.semester - b.semester) || (a.order - b.order));
  return metas;
}

export function getModule(courseId, moduleId) {
  const course = getCourse(courseId);
  if (!course) return null;
  const p = path.join(COURSES_DIR, course._dir, "modules", moduleId + ".md");
  if (!fs.existsSync(p)) return null;
  const { data, content } = matter(fs.readFileSync(p, "utf-8"));
  const ap = path.join(COURSES_DIR, course._dir, "assessments", moduleId + ".json");
  const assessment = fs.existsSync(ap) ? safeReadJSON(ap) : null;
  return { meta: data, content, assessment };
}

export function courseModuleCount(courseId) {
  return getModuleMeta(courseId).length;
}

/** Assessment only (quiz + flashcards), without parsing the module markdown. */
export function getAssessment(courseId, moduleId) {
  const course = getCourse(courseId);
  if (!course) return null;
  const ap = path.join(COURSES_DIR, course._dir, "assessments", moduleId + ".json");
  return fs.existsSync(ap) ? safeReadJSON(ap) : null;
}
