import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = getDb().prepare("SELECT id, name, avatar FROM profiles ORDER BY id").all();
  return NextResponse.json(rows);
}

export async function POST(req) {
  const { name, avatar } = await req.json();
  if (!name || !name.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  try {
    const r = getDb().prepare("INSERT INTO profiles (name, avatar) VALUES (?,?)")
      .run(name.trim(), avatar || "🧑‍🎓");
    return NextResponse.json({ id: r.lastInsertRowid, name: name.trim(), avatar: avatar || "🧑‍🎓" });
  } catch {
    return NextResponse.json({ error: "profile exists" }, { status: 409 });
  }
}
