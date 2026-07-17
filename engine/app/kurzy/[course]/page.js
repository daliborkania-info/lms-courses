"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useProfile } from "../../../components/useProfile";
import ProfilePicker from "../../../components/ProfilePicker";
import BottomNav from "../../../components/BottomNav";

const VOLA = { RYCHLA: "⚡ rychlá", STREDNI: "🔄 střední", STABILNI: "🪨 stabilní" };

export default function CoursePage() {
  const { course: courseId } = useParams();
  const { profile, select } = useProfile();
  const [course, setCourse] = useState(null);

  useEffect(() => {
    if (!profile) return;
    fetch(`/api/courses/${courseId}?profile=${profile.id}`).then((r) => r.json()).then(setCourse);
  }, [profile, courseId]);

  if (profile === undefined) return null;
  if (profile === null) return <ProfilePicker onSelect={select} />;
  if (!course) return <main className="px-4 pt-6"><div className="card text-slate-400">Načítám…</div></main>;

  return (
    <main className="px-4 pt-6">
      <Link href="/" className="text-sm text-indigo-400">← Zpět na přehled</Link>
      <h1 className="text-xl font-bold text-white mt-2 mb-1">{course.icon} {course.title}</h1>
      <p className="text-sm text-slate-400 mb-5">{course.description}</p>

      <div className="space-y-6">
        {course.semesters.map((s) => {
          const done = s.modules.filter((m) => m.done).length;
          return (
            <section key={s.number}>
              <div className="flex items-baseline justify-between mb-2">
                <h2 className="font-bold text-white">Semestr {s.number}: {s.title}</h2>
                <span className="text-xs text-slate-400">{done}/{s.modules.length}</span>
              </div>
              <div className="space-y-2">
                {s.modules.map((m) => {
                  const isExam = m.type === "exam";
                  const inner = (
                    <div className={`card flex items-center gap-3 py-3 ${m.locked ? "opacity-50" : "hover:border-indigo-500"} ${isExam ? "border-amber-500/40" : ""} transition`}>
                      <span className="text-xl w-8 text-center">
                        {m.done ? "✅" : m.locked ? "🔒" : isExam ? "📝" : "📖"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-white truncate">
                          {isExam ? m.title : `${m.id}: ${m.title}`}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex gap-2 flex-wrap">
                          <span>~{m.minutes} min</span>
                          <span>{"★".repeat(m.difficulty)}{"☆".repeat(5 - m.difficulty)}</span>
                          <span className="text-amber-400">+{m.xp} XP</span>
                          {m.volatility === "RYCHLA" && <span className="text-orange-400">{VOLA[m.volatility]}</span>}
                          {m.quiz?.total > 0 && <span>kvíz {m.quiz.score}/{m.quiz.total}</span>}
                        </div>
                      </div>
                      {!m.locked && <span className="text-slate-500">→</span>}
                    </div>
                  );
                  return m.locked
                    ? <div key={m.id} title="Nejdřív dokonči předchozí modul">{inner}</div>
                    : <Link key={m.id} href={`/kurzy/${course.id}/${m.id}`} className="block">{inner}</Link>;
                })}
              </div>
            </section>
          );
        })}
      </div>
      <BottomNav />
    </main>
  );
}
