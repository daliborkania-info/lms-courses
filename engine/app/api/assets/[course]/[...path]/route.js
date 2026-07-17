import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getCourse, COURSES_DIR } from "../../../../../lib/content";

export const dynamic = "force-dynamic";

const MIME = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

/** Serve static assets bundled with a course: courses/<dir>/assets/... */
export async function GET(_req, { params }) {
  const course = getCourse(params.course);
  if (!course) return NextResponse.json({ error: "not found" }, { status: 404 });

  const assetsRoot = path.resolve(COURSES_DIR, course._dir, "assets");
  const target = path.resolve(assetsRoot, ...params.path);
  // path traversal guard: resolved target must stay inside assets/
  if (target !== assetsRoot && !target.startsWith(assetsRoot + path.sep)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const type = MIME[path.extname(target).toLowerCase()] || "application/octet-stream";
  return new NextResponse(fs.readFileSync(target), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=300",
    },
  });
}
