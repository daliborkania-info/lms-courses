# -*- coding: utf-8 -*-
"""Generuje informacni SVG diagramy pro moduly K09, K10, K15-K20."""
import os
from rubiklib import svg_doc, save, TXT, ACCENT, ARROW

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..",
                   "courses", "rubikova-kostka", "assets")

INK = "#0f172a"
MUT = "#64748b"
BAD = "#dc2626"
OKC = "#059669"
CARD = "#f1f5f9"
MONO = "ui-monospace, Menlo, Consolas, monospace"


def text(x, y, s, size=14, fill=INK, w=400, anchor="start", mono=False):
    fam = f' font-family="{MONO}"' if mono else ""
    return (f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" '
            f'font-weight="{w}" text-anchor="{anchor}"{fam}>{s}</text>')


def rrect(x, y, w, h, fill=CARD, stroke="#cbd5e1", extra=""):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="1.5" {extra}/>')


def arrow(x1, y1, x2, y2, col=ARROW, wd=3):
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{col}" '
            f'stroke-width="{wd}" marker-end="url(#ah)" stroke-linecap="round"/>')

# ---------------------------------------------------------------- K09 pet kouzel
rows = [
    ("1. VÝTAH", "R' D' R D", "bílé rohy (K04) + otočení žlutých rohů (K08)", "výtah jede, dokud pasažér nevystoupí"),
    ("2. DRUHÁ VRSTVA", "U R U' R' U' F' U F", "hrana doprostřed doprava (K05)", "nahoru-pravá-zpátky-zpátky-zpátky-přední'-nahoru-přední"),
    ("3. ŽLUTÝ KŘÍŽ", "F R U R' U' F'", "tečka - L - čára - kříž (K06)", "zalévání kytky: po každém zalití vyroste"),
    ("4. SUNE", "R U R' U R U2 R'", "žluté hrany na místa (K07)", "sluníčko: točí hranami dokola"),
    ("5. KOLOTOČ", "U R U' L' U R' U' L", "žluté rohy na místa (K07)", "tři rohy jedou kolotočem, jeden je doma"),
]
W, RH, P = 640, 72, 14
H = P * 2 + len(rows) * (RH + 10) + 30
b = [text(W / 2, 28, "5 kouzel = celá kostka (metoda vrstev)", 17, INK, 700, "middle")]
y = 46
for name, alg, kdy, mnem in rows:
    b.append(rrect(P, y, W - 2 * P, RH))
    b.append(text(P + 14, y + 26, name, 14, INK, 700))
    b.append(text(P + 14, y + 50, alg, 17, "#7c3aed", 700, mono=True))
    b.append(text(W - P - 14, y + 26, kdy, 13, MUT, 600, "end"))
    b.append(text(W - P - 14, y + 50, mnem, 12, MUT, 400, "end"))
    y += RH + 10
save(os.path.join(OUT, "k09-pet-kouzel.svg"), svg_doc(W, H, "".join(b)))

# ---------------------------------------------------------------- K10 trenink krivka
W, H = 560, 300
x0, y0, x1, y1 = 60, 30, 520, 240  # kresli plocha
b = [text(W / 2, 20, "Typická cesta: od 10 minut ke 2 minutám", 15, INK, 700, "middle")]
b.append(f'<line x1="{x0}" y1="{y1}" x2="{x1}" y2="{y1}" stroke="{MUT}" stroke-width="1.5"/>')
b.append(f'<line x1="{x0}" y1="{y0}" x2="{x0}" y2="{y1}" stroke="{MUT}" stroke-width="1.5"/>')
pts = [(0, 10), (1, 7.5), (2, 5.5), (3, 4.5), (4, 4.2), (5, 3.2), (6, 2.5), (7, 2.2), (8, 2.0)]
def XY(wk, mins):
    return (x0 + wk / 8 * (x1 - x0), y1 - (mins / 10) * (y1 - y0))
d = "M" + " L".join(f"{XY(w_, m)[0]:.0f} {XY(w_, m)[1]:.0f}" for w_, m in pts)
b.append(f'<path d="{d}" fill="none" stroke="#7c3aed" stroke-width="4" stroke-linecap="round"/>')
for w_, m in pts:
    x, yy = XY(w_, m)
    b.append(f'<circle cx="{x:.0f}" cy="{yy:.0f}" r="4" fill="#7c3aed"/>')
for w_ in range(9):
    x, _ = XY(w_, 0)
    b.append(text(x, y1 + 18, str(w_), 12, MUT, 400, "middle"))
for m in (2, 4, 6, 8, 10):
    _, yy = XY(0, m)
    b.append(text(x0 - 8, yy + 4, f"{m}", 12, MUT, 400, "end"))
b.append(text((x0 + x1) / 2, y1 + 38, "týdny tréninku (15 min denně)", 13, MUT, 600, "middle"))
b.append(text(16, (y0 + y1) / 2, "minuty", 13, MUT, 600, "middle") .replace("<text", f'<text transform="rotate(-90 16 {(y0+y1)/2})"'))
px, py = XY(3.5, 4.4)
b.append(text(px + 10, py - 14, "plató = normální fáze,", 12, BAD, 600))
b.append(text(px + 10, py, "ne konec (K19)", 12, BAD, 600))
save(os.path.join(OUT, "k10-trenink.svg"), svg_doc(W, H + 10, "".join(b)))

# ---------------------------------------------------------------- K15 fingertricks
rows = [
    ("U / U'", "ukazováček zezadu (flick)", "nejrychlejší tah na kostce"),
    ("R / R'", "zápěstí pravé ruky", "kostku drž levou, pravá točí"),
    ("D / D'", "prsteník zespodu", "bez přehmatávání"),
    ("F", "palec nebo ukazováček", "jediný tah, kde se sahá dopředu"),
]
W, RH, P = 620, 58, 14
H = P * 2 + len(rows) * (RH + 8) + 100
b = [text(W / 2, 28, "Který prst dělá který tah", 17, INK, 700, "middle")]
y = 44
for mv, kdo, pozn in rows:
    b.append(rrect(P, y, W - 2 * P, RH))
    b.append(text(P + 16, y + 36, mv, 18, "#7c3aed", 700, mono=True))
    b.append(text(P + 130, y + 26, kdo, 14, INK, 600))
    b.append(text(P + 130, y + 46, pozn, 12, MUT, 400))
    y += RH + 8
b.append(rrect(P, y + 6, W - 2 * P, 66, "#fef2f2", "#fecaca"))
b.append(text(P + 16, y + 32, "Zloději času:", 14, BAD, 700))
b.append(text(P + 16, y + 54, "regrip (přehmátnutí) a rotace celé kostky - každý stojí víc než kterýkoli tah", 13, "#7f1d1d", 400))
save(os.path.join(OUT, "k15-fingertricks.svg"), svg_doc(W, y + 92, "".join(b)))

# ---------------------------------------------------------------- K16 mapa alg.
W, H = 640, 250
b = [text(W / 2, 26, "Cesta k full OLL/PLL: 2-3 algoritmy týdně, žádný sprint", 15, INK, 700, "middle")]
boxes = [
    (20, 50, 180, 120, "MÁŠ: 2-look", "10 OLL + 6 PLL", "= 16 algoritmů", "strop ~30-40 s", CARD, "#cbd5e1"),
    (230, 50, 180, 120, "KROK 1: full PLL", "21 algoritmů", "~2 měsíce", "největší zisk času", "#ede9fe", "#c4b5fd"),
    (440, 50, 180, 120, "KROK 2: full OLL", "57 algoritmů", "~6 měsíců", "po skupinách tvarů", "#fef9c3", "#fde047"),
]
for x, y, w_, h_, t1, t2, t3, t4 in [(bx[0], bx[1], bx[2], bx[3], bx[4], bx[5], bx[6], bx[7]) for bx in boxes]:
    pass
for bx in boxes:
    x, y, w_, h_, t1, t2, t3, t4, fill, st = bx
    b.append(rrect(x, y, w_, h_, fill, st))
    b.append(text(x + w_ / 2, y + 28, t1, 14, INK, 700, "middle"))
    b.append(text(x + w_ / 2, y + 52, t2, 14, INK, 600, "middle"))
    b.append(text(x + w_ / 2, y + 74, t3, 13, MUT, 400, "middle"))
    b.append(text(x + w_ / 2, y + 96, t4, 13, MUT, 400, "middle"))
b.append(arrow(203, 110, 227, 110))
b.append(arrow(413, 110, 437, 110))
b.append(text(W / 2, 205, "Pravidla: uč se SVŮJ algoritmus (vyber z variant na jperm.net), uč se skupiny podobných,", 13, MUT, 400, "middle"))
b.append(text(W / 2, 225, "nový alg = přidej do opakování (kartičky), starý nezapomínej", 13, MUT, 400, "middle"))
save(os.path.join(OUT, "k16-mapa-algoritmu.svg"), svg_doc(W, H, "".join(b)))

# ---------------------------------------------------------------- K17 lookahead
W, H = 640, 280
b = [text(W / 2, 24, "Kam mizí čas: pauzy, ne tahy", 15, INK, 700, "middle")]
def timeline(y, label, segs, total):
    x = 130
    b.append(text(120, y + 19, label, 13, INK, 700, "end"))
    for wsec, col in segs:
        wpx = wsec / total * 480
        b.append(f'<rect x="{x:.0f}" y="{y}" width="{max(wpx, 2):.0f}" height="28" fill="{col}" stroke="white" stroke-width="1"/>')
        x += wpx
    b.append(text(x + 8, y + 19, f"{sum(s for s, _ in segs):.0f} s", 13, MUT, 600))
FAZ = "#7c3aed"
timeline(50, "Začátečník:", [(2, FAZ), (3, BAD), (4, FAZ), (4, BAD), (5, FAZ), (3, BAD), (3, FAZ), (2, BAD), (4, FAZ)], 30)
timeline(100, "S lookahead:", [(2.5, FAZ), (0.5, BAD), (4.5, FAZ), (0.5, BAD), (5.5, FAZ), (0.5, BAD), (4, FAZ)], 30)
b.append(f'<rect x="130" y="150" width="16" height="14" fill="{FAZ}"/>')
b.append(text(152, 162, "tahy (fáze solvu)", 13, MUT, 400))
b.append(f'<rect x="300" y="150" width="16" height="14" fill="{BAD}"/>')
b.append(text(322, 162, "pauza = hledání, co dál", 13, MUT, 400))
b.append(rrect(20, 185, 600, 70, "#f0fdf4", "#bbf7d0"))
b.append(text(36, 210, "Drill: pomalé solvy - toč pomalu a NIKDY nezastav. Oči hledají další pár,", 13, "#14532d", 600))
b.append(text(36, 232, "zatímco ruce dodělávají ten současný. Cross+1: v inspekci naplánuj kříž + první pár.", 13, "#14532d", 600))
save(os.path.join(OUT, "k17-lookahead.svg"), svg_doc(W, H, "".join(b)))

# ---------------------------------------------------------------- K18 hardware
W, H = 620, 300
b = [text(W / 2, 24, "Cena vs. výkon (stav 2026)", 15, INK, 700, "middle")]
bars = [
    ("hračkářská", "~100 Kč", 60, "#94a3b8", "drhne, láme prsty, brzdí učení"),
    ("budget speedcube", "~300 Kč", 230, OKC, "MoYu RS3 M: plně soutěžeschopná ✓"),
    ("prémiová", "1000-2500 Kč", 260, "#7c3aed", "GAN, WeiLong: komfort, ne sekundy"),
]
y = 56
for name, price, wpx, col, note in bars:
    b.append(text(150, y + 18, name, 13, INK, 700, "end"))
    b.append(f'<rect x="160" y="{y}" width="{wpx}" height="26" rx="6" fill="{col}"/>')
    b.append(text(166 + wpx, y + 18, price, 13, INK, 700))
    b.append(text(160, y + 44, note, 12, MUT, 400))
    y += 68
b.append(rrect(20, y + 2, 580, 56, "#fefce8", "#fde047"))
b.append(text(36, y + 25, "Pravidlo: dokud nejsi pod 30 sekund, kupuj levně.", 13, "#713f12", 700))
b.append(text(36, y + 45, "Nová kostka je nejpříjemnější forma prokrastinace tréninku.", 12, "#713f12", 400))
save(os.path.join(OUT, "k18-hardware.svg"), svg_doc(W, y + 70, "".join(b)))

# ---------------------------------------------------------------- K19 ao5
W = 620
times = [("14.21", False), ("12.87", False), ("11.02", "best"), ("16.55", "worst"), ("13.40", False)]
b = [text(W / 2, 26, "ao5: průměr z 5 solvů bez nejlepšího a nejhoršího (WCA)", 15, INK, 700, "middle")]
x = 30
for t, drop in times:
    col = "#f1f5f9" if not drop else ("#dcfce7" if drop == "best" else "#fee2e2")
    st = "#cbd5e1" if not drop else ("#86efac" if drop == "best" else "#fca5a5")
    b.append(rrect(x, 46, 104, 64, col, st))
    b.append(text(x + 52, 76, t, 18, INK, 700, "middle", mono=True))
    if drop:
        b.append(f'<line x1="{x + 18}" y1="76" x2="{x + 86}" y2="70" stroke="{BAD}" stroke-width="2.5"/>')
        b.append(text(x + 52, 100, "škrtnout" if drop == "worst" else "škrtnout", 11, MUT, 600, "middle"))
    else:
        b.append(text(x + 52, 100, "počítá se", 11, OKC, 600, "middle"))
    x += 116
b.append(text(W / 2, 140, "ao5 = (14.21 + 12.87 + 13.40) / 3 = 13.49", 16, "#7c3aed", 700, "middle", mono=True))
b.append(text(W / 2, 168, "PB single je loterie šťastného scramble. Skutečnou úroveň měří trend ao5 a ao12.", 13, MUT, 400, "middle"))
save(os.path.join(OUT, "k19-ao5.svg"), svg_doc(W, 186, "".join(b)))

# ---------------------------------------------------------------- K20 metody
W, H = 640, 300
b = [text(W / 2, 24, "CFOP není jediná cesta", 15, INK, 700, "middle")]
cards = [
    (20, 46, "CFOP", "tvoje metoda", "algoritmy + rychlé prsty,\njede na ní většina špičky", "#ede9fe", "#c4b5fd"),
    (230, 46, "Roux", "bloky + M tahy", "míň tahů, víc intuice,\nskvělá pro one-handed", CARD, "#cbd5e1"),
    (440, 46, "ZZ", "orientace hran předem", "pak už žádné rotace,\nplánovací metoda", CARD, "#cbd5e1"),
]
for x, y, t1, t2, t3, fill, st in cards:
    b.append(rrect(x, y, 180, 130, fill, st))
    b.append(text(x + 90, y + 30, t1, 16, INK, 700, "middle"))
    b.append(text(x + 90, y + 54, t2, 13, "#7c3aed", 600, "middle"))
    for li, line in enumerate(t3.split("\n")):
        b.append(text(x + 90, y + 82 + li * 18, line, 12, MUT, 400, "middle"))
b.append(rrect(20, 196, 600, 76, "#f0f9ff", "#bae6fd"))
b.append(text(36, 222, "Blindfolded (BLD): kostka poslepu = paměťová disciplína (letter pairs, memory palace).", 13, "#0c4a6e", 600))
b.append(text(36, 244, "WCA soutěže: 15 s inspekce, average of 5, nikdo se ti smát nebude - přijď.", 13, "#0c4a6e", 600))
save(os.path.join(OUT, "k20-metody.svg"), svg_doc(W, 288, "".join(b)))

print("HOTOVO cast 2")
