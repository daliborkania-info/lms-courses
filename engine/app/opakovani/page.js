"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useProfile } from "../../components/useProfile";
import ProfilePicker from "../../components/ProfilePicker";
import BottomNav from "../../components/BottomNav";

const RATINGS = [
  { value: 1, label: "Znovu", cls: "bg-red-600/80 hover:bg-red-500" },
  { value: 2, label: "Těžké", cls: "bg-amber-600/80 hover:bg-amber-500" },
  { value: 3, label: "Dobré", cls: "bg-accent hover:bg-indigo-500" },
  { value: 4, label: "Snadné", cls: "bg-emerald-600/80 hover:bg-emerald-500" }
];

function fmtNextDue(iso) {
  if (!iso) return null;
  const due = new Date(iso);
  const min = Math.round((due.getTime() - Date.now()) / 60000);
  if (min < 60) return `za ${Math.max(1, min)} min`;
  if (min < 36 * 60) return `za ${Math.round(min / 60)} h`;
  return due.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "numeric" });
}

export default function ReviewPage() {
  const { profile, select } = useProfile();
  const [data, setData] = useState(null);      // { queue, counts, nextDueAt }
  const [queue, setQueue] = useState([]);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [doneToday, setDoneToday] = useState(0);
  const [toast, setToast] = useState(null);

  const load = useCallback((extraNew = 0) => {
    fetch(`/api/review/queue?profile=${profile.id}${extraNew ? `&extraNew=${extraNew}` : ""}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setQueue(d.queue || []);
        setDoneToday(d.counts?.doneToday || 0);
        setFlipped(false);
      });
  }, [profile]);

  useEffect(() => { if (profile) load(); }, [profile, load]);

  const answer = async (rating) => {
    if (busy) return;
    setBusy(true);
    const card = queue[0];
    try {
      const r = await fetch("/api/review/answer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profile.id, cardKey: card.cardKey, rating })
      });
      const res = await r.json();
      if (res.error) { load(); return; }
      setDoneToday(res.counts?.doneToday ?? doneToday + 1);
      if (res.newBadges?.length) {
        setToast(res);
        setTimeout(() => setToast(null), 4000);
      }
      setFlipped(false);
      setQueue((q) => {
        const rest = q.slice(1);
        // "Znovu" -> back to the end of the queue, everything else leaves the run
        return res.requeue ? [...rest, { ...card, state: res.state, preview: res.requeue.preview }] : rest;
      });
    } finally {
      setBusy(false);
    }
  };

  if (profile === undefined) return null;
  if (profile === null) return <ProfilePicker onSelect={select} />;
  if (!data) return <main className="px-4 pt-6"><div className="card text-slate-400">Načítám…</div><BottomNav /></main>;

  const card = queue[0];
  const counts = data.counts || {};

  return (
    <main className="px-4 pt-6 pb-10">
      <h1 className="text-xl font-bold text-white mb-1">🔁 Opakování</h1>
      <p className="text-xs text-slate-400 mb-4">
        Ve frontě {queue.length} · dnes hotovo {doneToday}
        {counts.newRemaining > 0 && ` · nových dnes ještě ${counts.newRemaining}`}
      </p>

      {!card && (
        <div className="card text-center animate-pop">
          <div className="text-4xl mb-2">🎉</div>
          <div className="text-lg font-bold text-white">Fronta je čistá</div>
          <p className="text-sm text-slate-400 mt-1">
            {data.nextDueAt
              ? <>Další kartička tě čeká {fmtNextDue(data.nextDueAt)}.</>
              : "Dokonči další modul a jeho kartičky sem přibudou."}
          </p>
          <button onClick={() => load(5)} className="btn-ghost w-full mt-4">
            ➕ Přidat dnes 5 nových kartiček
          </button>
        </div>
      )}

      {card && (
        <>
          <div className="text-xs text-slate-400 mb-2 flex items-center justify-between">
            <Link href={`/kurzy/${card.courseId}/${card.moduleId}`} className="text-indigo-400">
              {card.courseIcon} {card.courseTitle} · {card.moduleId}
            </Link>
            {card.state === "New" && <span className="text-sky-400">✨ nová</span>}
          </div>

          <button onClick={() => setFlipped(true)} disabled={flipped}
            className={`card w-full min-h-52 flex items-center justify-center text-center transition ${flipped ? "border-indigo-500" : ""}`}>
            <div>
              <div className="text-lg font-semibold text-white">{card.front}</div>
              {flipped && (
                <div className="text-sm text-slate-200 leading-relaxed mt-4 pt-4 border-t border-slate-700 animate-pop">
                  {card.back}
                </div>
              )}
            </div>
          </button>

          {!flipped && (
            <button onClick={() => setFlipped(true)} className="btn-primary w-full mt-3">
              Otočit kartičku
            </button>
          )}

          {flipped && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {RATINGS.map((r) => (
                <button key={r.value} onClick={() => answer(r.value)} disabled={busy}
                  className={`btn text-white text-sm flex-col !gap-0.5 py-2 ${r.cls}`}>
                  <span>{r.label}</span>
                  {/* "Znovu" se vrací hned v této dávce, interval z FSRS by mátl */}
                  <span className="text-[11px] opacity-80 font-normal">
                    {r.value === 1 ? "hned" : card.preview?.[r.value]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {toast && (
        <div className="fixed bottom-20 inset-x-4 z-50 mx-auto max-w-md card border-amber-500/60 animate-pop">
          {toast.xpGained > 0 && <div className="font-bold text-amber-400">⚡ +{toast.xpGained} XP</div>}
          {toast.newBadges?.map((b) => (
            <div key={b.id} className="text-sm text-white mt-1">{b.icon} Nový odznak: {b.title}</div>
          ))}
          <div className="text-xs text-slate-400 mt-1">🔥 Streak {toast.streak?.current} · úroveň {toast.level?.level}</div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
