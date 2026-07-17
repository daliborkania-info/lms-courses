"use client";
import { useEffect, useState } from "react";
import { useProfile } from "../../components/useProfile";
import ProfilePicker from "../../components/ProfilePicker";
import BottomNav from "../../components/BottomNav";

export default function StatsPage() {
  const { profile, select } = useProfile();
  const [s, setS] = useState(null);

  useEffect(() => {
    if (!profile) return;
    fetch(`/api/stats?profile=${profile.id}`).then((r) => r.json()).then(setS);
  }, [profile]);

  if (profile === undefined) return null;
  if (profile === null) return <ProfilePicker onSelect={select} />;

  const maxDay = s ? Math.max(1, ...s.last14.map((d) => d.xp)) : 1;

  return (
    <main className="px-4 pt-6">
      <h1 className="text-2xl font-bold text-white mb-4">📊 Statistiky</h1>
      {!s ? <div className="card text-slate-400">Načítám…</div> : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="card text-center py-3">
              <div className="text-2xl font-bold text-amber-400">{s.xp}</div>
              <div className="text-xs text-slate-400">XP celkem</div>
            </div>
            <div className="card text-center py-3">
              <div className="text-2xl font-bold text-indigo-400">{s.level.level}</div>
              <div className="text-xs text-slate-400">úroveň</div>
            </div>
            <div className="card text-center py-3">
              <div className="text-2xl font-bold text-orange-400">🔥 {s.streak.current}</div>
              <div className="text-xs text-slate-400">streak (max {s.streak.best})</div>
            </div>
          </div>

          <div className="card">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Úroveň {s.level.level}</span>
              <span>{s.xp} / {s.level.nextLevelXp} XP</span>
            </div>
            <div className="h-2.5 bg-card2 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-amber-400" style={{ width: (s.level.progress * 100) + "%" }} />
            </div>
          </div>

          <div className="card">
            <h2 className="font-bold text-white text-sm mb-3">Aktivita (14 dní)</h2>
            <div className="flex items-end gap-1 h-24">
              {s.last14.length === 0 && <p className="text-xs text-slate-500">Zatím žádná aktivita.</p>}
              {s.last14.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-indigo-500/80 rounded-t"
                    style={{ height: Math.max(4, (d.xp / maxDay) * 80) + "px" }} title={`${d.day}: ${d.xp} XP`} />
                  <span className="text-[9px] text-slate-500">{d.day.slice(8)}</span>
                </div>
              ))}
            </div>
          </div>

          {s.review && (
            <div className="card">
              <h2 className="font-bold text-white text-sm mb-3">🔁 Opakování (FSRS)</h2>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-indigo-400">{s.review.learning}</div>
                  <div className="text-[10px] text-slate-400">karet v učení</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-amber-400">{s.review.due}</div>
                  <div className="text-[10px] text-slate-400">čeká teď</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-emerald-400">{s.review.doneToday}</div>
                  <div className="text-[10px] text-slate-400">dnes hotovo</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-sky-400">{s.review.retention30 === null ? "-" : s.review.retention30 + " %"}</div>
                  <div className="text-[10px] text-slate-400">úspěšnost 30 d</div>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="font-bold text-white text-sm mb-3">Postup v kurzech</h2>
            {s.courses.map((c) => (
              <div key={c.id} className="mb-3 last:mb-0">
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>{c.icon} {c.title}</span><span>{c.done}/{c.total}</span>
                </div>
                <div className="h-2 bg-card2 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: (c.total ? (c.done / c.total) * 100 : 0) + "%" }} />
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h2 className="font-bold text-white text-sm mb-3">🏅 Odznaky ({s.badges.length})</h2>
            {s.badges.length === 0 && <p className="text-xs text-slate-500">Zatím žádné - dokonči první modul.</p>}
            <div className="grid grid-cols-2 gap-2">
              {s.badges.map((b) => (
                <div key={b.id} className="bg-card2 rounded-xl p-2.5 flex items-center gap-2">
                  <span className="text-xl">{b.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{b.title}</div>
                    <div className="text-[10px] text-slate-500">{b.awarded_at?.slice(0, 10)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </main>
  );
}
