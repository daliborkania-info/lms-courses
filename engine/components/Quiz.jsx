"use client";
import { useState } from "react";

export default function Quiz({ questions, onFinish }) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[idx];

  const confirm = () => {
    const ok = picked === q.correct;
    const s = score + (ok ? 1 : 0);
    if (idx + 1 < questions.length) {
      setScore(s); setIdx(idx + 1); setPicked(null);
    } else {
      setScore(s); setDone(true); onFinish?.(s, questions.length);
    }
  };

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="card text-center animate-pop">
        <div className="text-4xl mb-2">{pct === 100 ? "🏆" : pct >= 75 ? "🎉" : pct >= 50 ? "💪" : "📖"}</div>
        <div className="text-xl font-bold text-white">{score} / {questions.length} správně</div>
        <p className="text-slate-400 text-sm mt-1">
          {pct === 100 ? "Bezchybné. Plný bonus XP." : pct >= 50 ? "Dobrá práce, bonus XP připsán." : "Projdi modul znovu a zkus to znova - XP se dá vylepšit."}
        </p>
      </div>
    );
  }

  const answered = picked !== null;
  return (
    <div className="card">
      <div className="flex justify-between text-xs text-slate-400 mb-3">
        <span>Otázka {idx + 1} / {questions.length}</span>
        <span>Skóre {score}</span>
      </div>
      <p className="font-semibold text-white mb-4">{q.q}</p>
      <div className="space-y-2">
        {q.options.map((o, i) => {
          let cls = "bg-card2 hover:bg-slate-700";
          if (answered) {
            if (i === q.correct) cls = "bg-emerald-600/80";
            else if (i === picked) cls = "bg-red-600/70";
            else cls = "bg-card2 opacity-60";
          }
          return (
            <button key={i} disabled={answered} onClick={() => setPicked(i)}
              className={`w-full text-left rounded-xl px-4 py-3 text-sm transition ${cls}`}>
              {o}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="mt-3 text-sm text-slate-300 bg-card2 rounded-xl p-3 animate-pop">
          <span className="font-semibold">{picked === q.correct ? "Správně. " : "Ne tak docela. "}</span>
          {q.explain}
        </div>
      )}
      {answered && (
        <button onClick={confirm} className="btn-primary w-full mt-4">
          {idx + 1 < questions.length ? "Další otázka" : "Vyhodnotit"}
        </button>
      )}
    </div>
  );
}
