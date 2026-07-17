"use client";
import { useState } from "react";

export default function Flashcards({ cards }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[idx];

  const next = (d) => {
    setFlipped(false);
    setIdx((idx + d + cards.length) % cards.length);
  };

  return (
    <div>
      <div className="text-xs text-slate-400 mb-2 text-center">Kartička {idx + 1} / {cards.length} - klepni pro otočení</div>
      <button onClick={() => setFlipped(!flipped)}
        className={`card w-full min-h-44 flex items-center justify-center text-center transition ${flipped ? "border-indigo-500" : ""}`}>
        {!flipped
          ? <span className="text-lg font-semibold text-white">{card.front}</span>
          : <span className="text-sm text-slate-200 leading-relaxed animate-pop">{card.back}</span>}
      </button>
      <div className="flex gap-3 mt-3">
        <button onClick={() => next(-1)} className="btn-ghost flex-1">← Předchozí</button>
        <button onClick={() => next(1)} className="btn-primary flex-1">Další →</button>
      </div>
    </div>
  );
}
