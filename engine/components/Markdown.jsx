"use client";
import { useEffect, useRef, useState, useId, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MIN_SCALE = 1;
const MAX_SCALE = 8;

function DiagramLightbox({ svg, onClose }) {
  const viewRef = useRef(null);
  const contentRef = useRef(null);
  const boxRef = useRef(null);
  const g = useRef({
    scale: 1, x: 0, y: 0,
    pointers: new Map(), pinch: null,
    lastTap: { t: 0, x: 0, y: 0 }, moved: false
  });

  const apply = useCallback(() => {
    const s = g.current;
    if (contentRef.current) {
      contentRef.current.style.transform = `translate(${s.x}px, ${s.y}px) scale(${s.scale})`;
    }
  }, []);

  const clampPan = useCallback(() => {
    const s = g.current;
    const v = viewRef.current;
    if (!v) return;
    s.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s.scale));
    const maxPanX = v.clientWidth * (s.scale - 1);
    const maxPanY = v.clientHeight * (s.scale - 1);
    s.x = Math.min(0, Math.max(-maxPanX, s.x));
    s.y = Math.min(0, Math.max(-maxPanY, s.y));
  }, []);

  // Zoom kolem bodu (px, py) ve viewport souřadnicích; transform-origin je 0 0.
  const zoomAt = useCallback((px, py, nextScale) => {
    const s = g.current;
    const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
    s.x = px - (px - s.x) * (ns / s.scale);
    s.y = py - (py - s.y) * (ns / s.scale);
    s.scale = ns;
    clampPan();
    apply();
  }, [apply, clampPan]);

  // Po otevření: SVG roztáhnout tak, aby se celý diagram vešel na obrazovku (scale 1 = fit).
  useEffect(() => {
    const box = boxRef.current;
    const v = viewRef.current;
    if (!box || !v) return;
    const el = box.querySelector("svg");
    if (!el) return;
    const vb = el.viewBox && el.viewBox.baseVal;
    const availW = Math.max(100, v.clientWidth - 32);
    const availH = Math.max(100, v.clientHeight - 32);
    if (vb && vb.width > 0 && vb.height > 0) {
      const fit = Math.min(availW / vb.width, availH / vb.height);
      el.style.width = vb.width * fit + "px";
      el.style.height = vb.height * fit + "px";
    } else {
      el.style.width = availW + "px";
      el.style.height = "auto";
    }
    el.style.maxWidth = "none";
  }, [svg]);

  // Escape, zámek scrollu stránky, zoom kolečkem myši (non-passive kvůli preventDefault).
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const v = viewRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      const r = v.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
      zoomAt(e.clientX - r.left, e.clientY - r.top, g.current.scale * factor);
    };
    if (v) v.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (v) v.removeEventListener("wheel", onWheel);
    };
  }, [onClose, zoomAt]);

  const onPointerDown = (e) => {
    const s = g.current;
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* synthetic/stale pointer */ }
    s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    s.moved = false;
    if (s.pointers.size === 2) {
      const [a, b] = [...s.pointers.values()];
      s.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), scale: s.scale };
    }
  };

  const onPointerMove = (e) => {
    const s = g.current;
    if (!s.pointers.has(e.pointerId) || !viewRef.current) return;
    const prev = s.pointers.get(e.pointerId);
    const cur = { x: e.clientX, y: e.clientY };
    if (Math.hypot(cur.x - prev.x, cur.y - prev.y) > 3) s.moved = true;
    s.pointers.set(e.pointerId, cur);
    const r = viewRef.current.getBoundingClientRect();
    if (s.pointers.size === 2 && s.pinch) {
      const [a, b] = [...s.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (s.pinch.d > 0 && d > 0) {
        zoomAt(((a.x + b.x) / 2) - r.left, ((a.y + b.y) / 2) - r.top, s.pinch.scale * (d / s.pinch.d));
      }
    } else if (s.pointers.size === 1 && s.scale > 1) {
      s.x += cur.x - prev.x;
      s.y += cur.y - prev.y;
      clampPan();
      apply();
    }
  };

  const onPointerUp = (e) => {
    const s = g.current;
    s.pointers.delete(e.pointerId);
    if (s.pointers.size < 2) s.pinch = null;
    // Double-tap / rychlý double-click: přepnout zoom
    if (s.pointers.size === 0 && !s.moved && viewRef.current) {
      const now = e.timeStamp;
      const dt = now - s.lastTap.t;
      const dist = Math.hypot(e.clientX - s.lastTap.x, e.clientY - s.lastTap.y);
      if (dt > 0 && dt < 320 && dist < 40) {
        const r = viewRef.current.getBoundingClientRect();
        zoomAt(e.clientX - r.left, e.clientY - r.top, s.scale > 1.01 ? 1 : 2.5);
        s.lastTap = { t: 0, x: 0, y: 0 };
      } else {
        s.lastTap = { t: now, x: e.clientX, y: e.clientY };
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 flex flex-col" role="dialog" aria-modal="true" aria-label="Zvětšený diagram">
      <div className="flex items-center justify-between gap-3 px-4 py-3 shrink-0">
        <span className="text-xs text-slate-400">Přiblížení: dva prsty · poklepání · kolečko</span>
        <button onClick={onClose}
          className="rounded-xl bg-card2 text-slate-200 px-3 py-1.5 text-sm font-semibold active:scale-95">
          ✕ Zavřít
        </button>
      </div>
      <div
        ref={viewRef}
        className="relative flex-1 overflow-hidden touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={contentRef}
          className="absolute inset-0 flex items-center justify-center will-change-transform"
          style={{ transformOrigin: "0 0" }}
        >
          <div ref={boxRef} className="mermaid-lightbox bg-white rounded-lg p-2"
            dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      </div>
    </div>
  );
}

function MermaidBlock({ code }) {
  const [svg, setSvg] = useState(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });
        const { svg } = await mermaid.render("mmd" + id, code);
        if (!cancelled) setSvg(svg);
      } catch { if (!cancelled) setFailed(true); }
    })();
    return () => { cancelled = true; };
  }, [code, id]);
  if (failed) return <pre><code>{code}</code></pre>;
  if (!svg) return <div className="mermaid-box" />;
  return (
    <>
      <div
        className="mermaid-box relative cursor-zoom-in"
        role="button"
        tabIndex={0}
        aria-label="Zvětšit diagram"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); } }}
      >
        <div dangerouslySetInnerHTML={{ __html: svg }} />
        <span className="absolute bottom-1.5 right-1.5 rounded-md bg-slate-900/70 text-white text-[11px] px-1.5 py-0.5 pointer-events-none">
          🔍 zvětšit
        </span>
      </div>
      {open && <DiagramLightbox svg={svg} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Obrázek z kurzu (typicky SVG asset) - inline náhled + stejný zoom lightbox jako Mermaid. */
function AssetImage({ src, alt }) {
  const [open, setOpen] = useState(false);
  const [svg, setSvg] = useState(null);
  const isSvg = /\.svg(\?|#|$)/i.test(src || "");

  // Pro SVG stáhneme zdroj, aby lightbox mohl počítat fit z viewBoxu.
  useEffect(() => {
    if (!open || !isSvg || svg) return;
    let cancelled = false;
    fetch(src)
      .then((r) => (r.ok ? r.text() : null))
      .then((t) => { if (!cancelled && t && t.includes("<svg")) setSvg(t); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open, isSvg, svg, src]);

  const fallback = `<img src="${src}" alt="" style="max-width:85vw;max-height:75vh;display:block" />`;
  return (
    <>
      <span
        className="asset-img"
        role="button"
        tabIndex={0}
        aria-label="Zvětšit obrázek"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); } }}
      >
        <img src={src} alt={alt || ""} loading="lazy" />
        {alt ? <span className="asset-caption">{alt}</span> : null}
        <span className="absolute bottom-1.5 right-1.5 rounded-md bg-slate-900/70 text-white text-[11px] px-1.5 py-0.5 pointer-events-none">
          🔍 zvětšit
        </span>
      </span>
      {open && <DiagramLightbox svg={svg || fallback} onClose={() => setOpen(false)} />}
    </>
  );
}

export default function Markdown({ children, courseId }) {
  // Relativní cesty "assets/..." přepíšeme na API endpoint kurzu.
  const resolveSrc = (src) => {
    if (!src) return src;
    if (/^(https?:)?\/\//.test(src) || src.startsWith("/") || src.startsWith("data:")) return src;
    const rel = src.replace(/^\.\//, "");
    if (courseId && rel.startsWith("assets/")) {
      return `/api/assets/${courseId}/${rel.slice("assets/".length)}`;
    }
    return src;
  };

  return (
    <div className="prose-lms">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children: kids, ...props }) {
            const txt = String(kids ?? "");
            if (!inline && /language-mermaid/.test(className || "")) {
              return <MermaidBlock code={txt.replace(/\n$/, "")} />;
            }
            return <code className={className} {...props}>{kids}</code>;
          },
          img({ src, alt }) {
            return <AssetImage src={resolveSrc(src)} alt={alt} />;
          }
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
