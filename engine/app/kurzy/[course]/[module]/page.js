"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useProfile } from "../../../../components/useProfile";
import ProfilePicker from "../../../../components/ProfilePicker";
import Markdown from "../../../../components/Markdown";
import Quiz from "../../../../components/Quiz";
import Flashcards from "../../../../components/Flashcards";

export default function ModulePage() {
  const { course: courseId, module: moduleId } = useParams();
  const { profile, select } = useProfile();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("text"); // text | quiz | cards
  const [toast, setToast] = useState(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!profile) return;
    fetch(`/api/modules/${courseId}/${moduleId}?profile=${profile.id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setCompleted(!!d.progress); });
  }, [profile, courseId, moduleId]);

  const report = useCallback(async (payload) => {
    const r = await fetch("/api/progress", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: profile.id, courseId, moduleId, ...payload })
    });
    const res = await r.json();
    if (res.gained > 0 || res.newBadges?.length) {
      setToast(res);
      setTimeout(() => setToast(null), 5000);
    }
    setCompleted(true);
  }, [profile, courseId, moduleId]);

  if (profile === undefined) return null;
  if (profile === null) return <ProfilePicker onSelect={select} />;
  if (!data) return <main className="px-4 pt-6"><div className="card text-slate-400">Načítám…</div></main>;

  const meta = data.meta;
  const hasQuiz = data.assessment?.quiz?.length > 0;
  const hasCards = data.assessment?.flashcards?.length > 0;

  return (
    <main className="px-4 pt-6 pb-10">
      <Link href={`/kurzy/${courseId}`} className="text-sm text-indigo-400">← Zpět na kurz</Link>
      <div className="mt-2 mb-4">
        <h1 className="text-lg font-bold text-white leading-snug">{meta.id !== meta.title ? `${meta.id}: ` : ""}{meta.title}</h1>
        <div className="text-xs text-slate-400 mt-1 flex gap-3 flex-wrap">
          <span>~{meta.minutes} min</span>
          <span>{"★".repeat(meta.difficulty)}{"☆".repeat(5 - meta.difficulty)}</span>
          <span className="text-amber-400">+{meta.xp} XP</span>
          {completed && <span className="text-emerald-400">✓ dokončeno</span>}
        </div>
      </div>

      {(hasQuiz || hasCards) && (
        <div className="flex gap-2 mb-4 sticky top-0 z-30 bg-bg/95 backdrop-blur py-2 -mx-1 px-1">
          <button onClick={() => setTab("text")}
            className={`btn flex-1 text-sm ${tab === "text" ? "bg-accent text-white" : "bg-card2 text-slate-300"}`}>📖 Text</button>
          {hasCards && <button onClick={() => setTab("cards")}
            className={`btn flex-1 text-sm ${tab === "cards" ? "bg-accent text-white" : "bg-card2 text-slate-300"}`}>🃏 Kartičky</button>}
          {hasQuiz && <button onClick={() => setTab("quiz")}
            className={`btn flex-1 text-sm ${tab === "quiz" ? "bg-accent text-white" : "bg-card2 text-slate-300"}`}>✅ Kvíz</button>}
        </div>
      )}

      {tab === "text" && (
        <>
          <Markdown courseId={courseId}>{data.content}</Markdown>
          <div className="mt-8 space-y-3">
            {hasQuiz ? (
              <button onClick={() => setTab("quiz")} className="btn-primary w-full">
                Pokračovat na kvíz → (+bonus XP)
              </button>
            ) : (
              !completed && (
                <button onClick={() => report({ action: "complete" })} className="btn-primary w-full">
                  Označit jako dokončené (+{meta.xp} XP)
                </button>
              )
            )}
            {completed && data.nextModule && (
              <Link href={`/kurzy/${courseId}/${data.nextModule}`} className="btn-ghost w-full">
                Další modul: {data.nextModule} →
              </Link>
            )}
          </div>
        </>
      )}

      {tab === "cards" && hasCards && <Flashcards cards={data.assessment.flashcards} />}

      {tab === "quiz" && hasQuiz && (
        <Quiz
          questions={data.assessment.quiz}
          onFinish={(score, total) => report({ action: "quiz", quizScore: score, quizTotal: total })}
        />
      )}

      {tab === "quiz" && completed && data.nextModule && (
        <Link href={`/kurzy/${courseId}/${data.nextModule}`} className="btn-ghost w-full mt-4">
          Další modul: {data.nextModule} →
        </Link>
      )}

      {toast && (
        <div className="fixed bottom-20 inset-x-4 z-50 mx-auto max-w-md card border-amber-500/60 animate-pop">
          <div className="font-bold text-amber-400">⚡ +{toast.gained} XP</div>
          {toast.newBadges?.map((b) => (
            <div key={b.id} className="text-sm text-white mt-1">{b.icon} Nový odznak: {b.title}</div>
          ))}
          <div className="text-xs text-slate-400 mt-1">🔥 Streak {toast.streak.current} · úroveň {toast.level.level}</div>
        </div>
      )}
    </main>
  );
}
