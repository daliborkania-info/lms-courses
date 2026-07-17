"use client";
import { useEffect, useState } from "react";

const AVATARS = ["🧑‍🎓", "👨‍💻", "👩‍🎨", "🦉", "🚀", "🧠", "🐺", "🌟"];

export default function ProfilePicker({ onSelect }) {
  const [profiles, setProfiles] = useState([]);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/profiles").then((r) => r.json()).then(setProfiles).catch(() => {});
  }, []);

  const create = async () => {
    setError("");
    const r = await fetch("/api/profiles", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, avatar })
    });
    if (!r.ok) { setError("Profil se nepodařilo vytvořit (existuje už?)"); return; }
    onSelect(await r.json());
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <div className="text-5xl mb-3">📚</div>
      <h1 className="text-2xl font-bold text-white mb-1">Kdo studuje?</h1>
      <p className="text-slate-400 text-sm mb-8">Vyber profil, nebo si vytvoř nový.</p>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {profiles.map((p) => (
          <button key={p.id} onClick={() => onSelect(p)}
            className="card flex flex-col items-center py-6 hover:border-indigo-500 transition">
            <span className="text-4xl">{p.avatar}</span>
            <span className="mt-2 font-semibold text-white">{p.name}</span>
          </button>
        ))}
        <button onClick={() => setCreating(true)}
          className="card flex flex-col items-center py-6 border-dashed hover:border-indigo-500 transition">
          <span className="text-4xl">➕</span>
          <span className="mt-2 text-slate-400">Nový profil</span>
        </button>
      </div>

      {creating && (
        <div className="card w-full max-w-sm mt-6">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Jméno" maxLength={20}
            className="w-full bg-card2 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 ring-indigo-500" />
          <div className="flex flex-wrap gap-2 mt-3">
            {AVATARS.map((a) => (
              <button key={a} onClick={() => setAvatar(a)}
                className={`text-2xl p-2 rounded-xl ${avatar === a ? "bg-indigo-600" : "bg-card2"}`}>{a}</button>
            ))}
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          <button onClick={create} disabled={!name.trim()} className="btn-primary w-full mt-4">Vytvořit a vstoupit</button>
        </div>
      )}
    </div>
  );
}
