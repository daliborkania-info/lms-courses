"use client";
import { useProfile } from "../../components/useProfile";
import ProfilePicker from "../../components/ProfilePicker";
import BottomNav from "../../components/BottomNav";

export default function ProfilePage() {
  const { profile, select, logout } = useProfile();
  if (profile === undefined) return null;
  if (profile === null) return <ProfilePicker onSelect={select} />;

  return (
    <main className="px-4 pt-6">
      <h1 className="text-2xl font-bold text-white mb-4">👤 Profil</h1>
      <div className="card flex items-center gap-4">
        <span className="text-5xl">{profile.avatar}</span>
        <div>
          <div className="text-lg font-bold text-white">{profile.name}</div>
          <div className="text-xs text-slate-400">Postup se ukládá lokálně v databázi enginu.</div>
        </div>
      </div>
      <button onClick={logout} className="btn-ghost w-full mt-4">Přepnout profil</button>
      <p className="text-xs text-slate-500 mt-6 leading-relaxed">
        Obsah kurzů se načítá z adresáře <code>courses/</code> - nový kurz stačí nahrát jako složku
        s <code>course.json</code> a moduly, engine ho rozpozná bez rebuildu. Uživatelská data žijí
        v adresáři <code>data/</code> (SQLite) a přežijí update i restart kontejneru.
      </p>
      <BottomNav />
    </main>
  );
}
