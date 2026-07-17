"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", icon: "🏠", label: "Domů" },
  { href: "/opakovani", icon: "🔁", label: "Opakování" },
  { href: "/stats", icon: "📊", label: "Statistiky" },
  { href: "/profil", icon: "👤", label: "Profil" }
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-slate-800">
      <div className="mx-auto max-w-2xl flex">
        {items.map((it) => {
          const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
          return (
            <Link key={it.href} href={it.href}
              className={`flex-1 flex flex-col items-center py-2.5 text-xs ${active ? "text-indigo-400" : "text-slate-400"}`}>
              <span className="text-lg leading-none">{it.icon}</span>
              <span className="mt-1">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
