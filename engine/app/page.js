"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useProfile } from "../components/useProfile";
import ProfilePicker from "../components/ProfilePicker";
import BottomNav from "../components/BottomNav";

export default function Home() {
  const { profile, select } = useProfile();
  const [courses, setCourses] = useState(null);
  const [stats, setStats] = useState(null);
  const [review, setReview] = useState(null);

  useEffect(() => {
    if (!profile) return;
    fetch(`/api/courses?profile=${profile.id}`).then((r) => r.json()).then(setCourses);
    fetch(`/api/stats?profile=${profile.id}`).then((r) => r.json()).then(setStats);
    fetch(`/api/review/queue?profile=${profile.id}&counts=1`).then((r) => r.json()).then((d) => setReview(d.counts || null));
  }, [profile]);

  if (profile === undefined) return null;
  if (profile === null) return <ProfilePicker onSelect={select} />;

  return (
    <main className="px-4 pt-6">
      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-slate-400 text-sm">Vítej zpět,</p>
          <h1 className="text-2xl font-bold text-white">{profile.avatar} {profile.name}</h1>
        </div>
        {stats && (
          <div className="text-right">
            <div className="text-amber-400 font-bold text-lg">⚡ {stats.xp} XP</div>
            <div className="text-xs text-slate-400">
              úroveň {stats.level.level} · 🔥 {stats.streak.current} {stats.streak.current === 1 ? "den" : "dní"}
            </div>
          </div>
        )}
      </header>

      {review && (review.due > 0 || review.newRemaining > 0) && (
        <Link href="/opakovani" className="card mb-4 border-indigo-500/40 flex items-center gap-3 hover:border-indigo-400 transition">
          <span className="text-2xl">🔁</span>
          <div className="flex-1">
            <p className="text-sm text-white font-semibold">
              {review.due > 0
                ? `${review.due} ${review.due === 1 ? "kartička čeká" : review.due < 5 ? "kartičky čekají" : "kartiček čeká"} na opakování`
                  + (review.newRemaining > 0
                    ? ` + ${review.newRemaining} ${review.newRemaining === 1 ? "nová" : review.newRemaining < 5 ? "nové" : "nových"}`
                    : "")
                : `${review.newRemaining} ${review.newRemaining === 1 ? "nová kartička" : review.newRemaining < 5 ? "nové kartičky" : "nových kartiček"} k naučení`}
            </p>
            <p className="text-xs text-slate-400">
              {review.due > 0
                ? (review.newRemaining > 0
                  ? `dohromady ${review.due + review.newRemaining} ve frontě na dnešek`
                  : "FSRS je naplánoval přesně na dnešek")
                : "dnešní dávka nových kartiček je připravená"}
            </p>
          </div>
          <span className="text-slate-500">→</span>
        </Link>
      )}

      {stats && !stats.streak.activeToday && (
        <div className="card mb-4 border-amber-500/40 flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <p className="text-sm text-slate-300">Dnes ještě nemáš aktivitu. Jeden modul denně drží streak - minimální denní dávka.</p>
        </div>
      )}

      <h2 className="text-lg font-bold text-white mb-3">Kurzy</h2>
      <div className="space-y-4">
        {courses === null && <div className="card text-slate-400">Načítám kurzy…</div>}
        {courses?.length === 0 && (
          <div className="card text-slate-400 text-sm">
            Žádné kurzy nenalezeny. Nahraj složku kurzu (s course.json) do adresáře <code>courses/</code> a obnov stránku.
          </div>
        )}
        {courses?.map((c) => {
          const pct = c.moduleCount ? Math.round((c.doneCount / c.moduleCount) * 100) : 0;
          return (
            <Link key={c.id} href={`/kurzy/${c.id}`} className="card block hover:border-indigo-500 transition">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{c.icon || "📘"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white leading-tight">{c.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.description}</p>
                  <div className="mt-3 h-2 bg-card2 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-amber-400" style={{ width: pct + "%" }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1.5">
                    <span>{c.doneCount}/{c.moduleCount} modulů · {pct} %</span>
                    <span>~{Math.round(c.minutes / 60)} h · {c.totalXp} XP</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <BottomNav />
    </main>
  );
}
