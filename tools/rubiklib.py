# -*- coding: utf-8 -*-
"""Knihovna pro generovani SVG diagramu Rubikovy kostky (kurz rubikova-kostka).

- Cubie simulator (pozice + normaly, rotace po 90 stupnich) pro presne stavy
  z algoritmu (OLL/PLL pre-stavy = inverze algoritmu aplikovana na slozenou kostku).
- Izometricky 3D pohled (U, F, R) a pohled shora (U + bocni prouzky) se sipkami.
"""
import math

# Barvy nalepek
COL = {
    "W": "#ffffff", "Y": "#ffd500", "G": "#009b48",
    "R": "#b71234", "O": "#ff5800", "B": "#0046ad",
    "X": "#c3c9d4",  # seda = nepodstatne / neznamo
}
STROKE = "#0f172a"
ACCENT = "#f59e0b"
ARROW = "#111827"
TXT = "#334155"

# ---------------------------------------------------------------- simulator

def _rot(axis, sign, v):
    x, y, z = v
    if axis == "x":
        return (x, sign * z, -sign * y)
    if axis == "y":
        return (-sign * z, y, sign * x)
    return (sign * y, -sign * x, z)

# nazev tahu -> (osa, znamenko rotace CW, filtr vrstvy)
_MOVES = {
    "R": ("x", 1, lambda p: p[0] == 1),
    "L": ("x", -1, lambda p: p[0] == -1),
    "U": ("y", 1, lambda p: p[1] == 1),
    "D": ("y", -1, lambda p: p[1] == -1),
    "F": ("z", 1, lambda p: p[2] == 1),
    "B": ("z", -1, lambda p: p[2] == -1),
    "M": ("x", -1, lambda p: p[0] == 0),   # jako L
    "r": ("x", 1, lambda p: p[0] >= 0),
    "f": ("z", 1, lambda p: p[2] >= 0),
}

# schema: zluta nahore, zelena vpredu (U=Y, D=W, F=G, B=B, R=O, L=R)
SCHEME_Y_UP = {"U": "Y", "D": "W", "F": "G", "B": "B", "R": "O", "L": "R"}
SCHEME_W_UP = {"U": "W", "D": "Y", "F": "G", "B": "B", "R": "R", "L": "O"}

_NORMAL = {"U": (0, 1, 0), "D": (0, -1, 0), "F": (0, 0, 1),
           "B": (0, 0, -1), "R": (1, 0, 0), "L": (-1, 0, 0)}


class Cube:
    def __init__(self, scheme=SCHEME_Y_UP):
        self.cubies = {}  # pos -> (id, {normal: barva})
        for x in (-1, 0, 1):
            for y in (-1, 0, 1):
                for z in (-1, 0, 1):
                    if (x, y, z) == (0, 0, 0):
                        continue
                    st = {}
                    for f, n in _NORMAL.items():
                        if (n[0] and n[0] == x) or (n[1] and n[1] == y) or (n[2] and n[2] == z):
                            st[n] = scheme[f]
                    self.cubies[(x, y, z)] = ((x, y, z), st)

    def move(self, token):
        base = token[0]
        axis, sign, layer = _MOVES[base]
        times = 1
        if token.endswith("2"):
            times = 2
        elif token.endswith("'"):
            times = 3
        for _ in range(times):
            new = {}
            for pos, (cid, st) in self.cubies.items():
                if layer(pos):
                    npos = _rot(axis, sign, pos)
                    nst = {_rot(axis, sign, n): c for n, c in st.items()}
                    new[npos] = (cid, nst)
                else:
                    new[pos] = (cid, st)
            self.cubies = new

    def alg(self, s):
        for t in s.split():
            self.move(t)

    def sticker(self, pos, normal):
        return self.cubies[pos][1].get(normal, "X")

    def face(self, f):
        """9 pismen barev, row-major, konvence viz nize."""
        out = []
        for i in range(3):
            for j in range(3):
                if f == "U":
                    pos, n = (j - 1, 1, i - 1), (0, 1, 0)
                elif f == "F":
                    pos, n = (j - 1, 1 - i, 1), (0, 0, 1)
                elif f == "R":
                    pos, n = (1, 1 - i, 1 - j), (1, 0, 0)
                elif f == "D":
                    pos, n = (j - 1, -1, 1 - i), (0, -1, 0)
                elif f == "L":
                    pos, n = (-1, 1 - i, j - 1), (-1, 0, 0)
                else:  # B
                    pos, n = (1 - j, 1 - i, -1), (0, 0, -1)
                out.append(self.sticker(pos, n))
        return out

    def face_masked(self, f, keep):
        """Jako face(), ale nalepky dilku, jejichz puvodni id nesplni keep(id), jsou sede."""
        cells = []
        for i in range(3):
            for j in range(3):
                if f == "U":
                    pos, n = (j - 1, 1, i - 1), (0, 1, 0)
                elif f == "F":
                    pos, n = (j - 1, 1 - i, 1), (0, 0, 1)
                else:  # R
                    pos, n = (1, 1 - i, 1 - j), (1, 0, 0)
                cid = self.cubies[pos][0]
                cells.append(self.sticker(pos, n) if keep(cid) else "X")
        return cells

    def u_permutation(self):
        """[( (row,col)_from, (row,col)_to ), ...] pro dilky U vrstvy, ktere se pohnuly."""
        res = []
        for pos, (cid, _) in self.cubies.items():
            if cid[1] == 1 and pos[1] == 1 and pos != cid:
                res.append(((cid[2] + 1, cid[0] + 1), (pos[2] + 1, pos[0] + 1)))
        return res


def inverse(alg):
    out = []
    for t in reversed(alg.split()):
        if t.endswith("2"):
            out.append(t)
        elif t.endswith("'"):
            out.append(t[:-1])
        else:
            out.append(t + "'")
    return " ".join(out)


def ll_state(alg, scheme=SCHEME_Y_UP):
    """Stav PRED algoritmem (inverze aplikovana na slozenou kostku)."""
    c = Cube(scheme)
    c.alg(inverse(alg))
    return c


def alg_arrows(alg):
    """Sipky permutace U vrstvy, kterou alg provede."""
    c = Cube()
    c.alg(alg)
    return c.u_permutation()

# ---------------------------------------------------------------- SVG helpery

def svg_doc(w, h, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'width="{w}" height="{h}" font-family="system-ui, -apple-system, sans-serif">'
            f'<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" '
            f'markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">'
            f'<path d="M0 0 L10 5 L0 10 z" fill="{ARROW}"/></marker>'
            f'<marker id="ahw" viewBox="0 0 10 10" refX="8" refY="5" '
            f'markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
            f'<path d="M0 0 L10 5 L0 10 z" fill="{ACCENT}"/></marker></defs>'
            + body + "</svg>")


def _poly(pts, fill, extra=""):
    p = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    base = "" if "stroke=" in extra else f'stroke="{STROKE}" stroke-width="1.4" '
    return f'<polygon points="{p}" fill="{fill}" {base}stroke-linejoin="round" {extra}/>'


def _add(p, *vs):
    x, y = p
    for v in vs:
        x += v[0]
        y += v[1]
    return (x, y)


def _mul(v, k):
    return (v[0] * k, v[1] * k)

# ------------------------------------------------------------ izometrie

def iso_cube(faces, s=24, highlights=(), arrows=(), ox=0, oy=0):
    """faces: {'U': [...9], 'F': [...], 'R': [...]}; vrati (svg, w, h).
    highlights: [(face,i,j)], arrows: [(face, kind)] kde kind je
    'up'|'down'|'left'|'right'|'cw' (u U: left = smerem k L, atd.)"""
    rx, lx, dn = (0.866 * s, 0.5 * s), (-0.866 * s, 0.5 * s), (0, s)
    w = 6 * 0.866 * s + 8
    h = 6 * s + 8
    T = (ox + w / 2, oy + 4)
    basis = {
        "U": (T, rx, lx),
        "F": (_add(T, _mul(lx, 3)), rx, dn),
        "R": (_add(T, _mul(lx, 3), _mul(rx, 3)), (-lx[0], -lx[1]), dn),
    }
    out = []
    for f in ("U", "F", "R"):
        O, a, b = basis[f]
        cells = faces.get(f) or ["X"] * 9
        for i in range(3):
            for j in range(3):
                p = _add(O, _mul(a, j), _mul(b, i))
                out.append(_poly([p, _add(p, a), _add(p, a, b), _add(p, b)],
                                 COL.get(cells[i * 3 + j], cells[i * 3 + j])))
    for (f, i, j) in highlights:
        O, a, b = basis[f]
        p = _add(O, _mul(a, j), _mul(b, i))
        out.append(_poly([p, _add(p, a), _add(p, a, b), _add(p, b)], "none",
                         f'stroke="{ACCENT}" stroke-width="3" stroke-dasharray="5 3"'))
    for ar in arrows:
        f, kind = ar[0], ar[1]
        dx = ar[2] if len(ar) > 2 else 1.5
        dy = ar[3] if len(ar) > 3 else 1.5
        O, a, b = basis[f]
        c = _add(O, _mul(a, dx), _mul(b, dy))
        vec = {"right": a, "left": _mul(a, -1), "down": b, "up": _mul(b, -1)}
        if kind == "cw":
            pts = []
            for deg in range(210, -31, -20):
                t = math.radians(deg)
                pts.append(_add(c, _mul(a, 1.05 * math.cos(t)), _mul(b, -1.05 * math.sin(t))))
            d = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts)
            out.append(f'<path d="{d}" fill="none" stroke="{ARROW}" stroke-width="3.2" marker-end="url(#ah)" stroke-linecap="round"/>')
        else:
            v = vec[kind]
            p1, p2 = _add(c, _mul(v, -1.15)), _add(c, _mul(v, 1.15))
            out.append(f'<line x1="{p1[0]:.1f}" y1="{p1[1]:.1f}" x2="{p2[0]:.1f}" y2="{p2[1]:.1f}" '
                       f'stroke="{ARROW}" stroke-width="3.6" marker-end="url(#ah)" stroke-linecap="round"/>')
    return "".join(out), w, h

# ------------------------------------------------------------ pohled shora

def top_view(top, strips=None, arrows=(), marks=(), u=34, ox=0, oy=0):
    """top: 9 pismen. strips: {'n','e','s','w': [3 pismena]} nebo None.
    arrows: [((r1,c1),(r2,c2))] nebo [((r1,c1),(r2,c2),'double')].
    marks: [(('cell'|'n'|'e'|'s'|'w', r_or_i, c), text)] male znacky.
    Vrati (svg, w, h)."""
    d = 15  # hloubka prouzku
    gap = 3
    off = (d + gap) if strips is not None else 0
    w = h = 3 * u + 2 * off
    gx, gy = ox + off, oy + off
    out = []
    if strips is not None:
        for k, cells in strips.items():
            for i in range(3):
                c = COL.get(cells[i], cells[i]) if cells else COL["X"]
                if k == "n":
                    r = (gx + i * u, oy, u, d)
                elif k == "s":
                    r = (gx + i * u, gy + 3 * u + gap, u, d)
                elif k == "w":
                    r = (ox, gy + i * u, d, u)
                else:
                    r = (gx + 3 * u + gap, gy + i * u, d, u)
                out.append(f'<rect x="{r[0]}" y="{r[1]}" width="{r[2]}" height="{r[3]}" '
                           f'fill="{c}" stroke="{STROKE}" stroke-width="1.2" rx="2"/>')
    for i in range(3):
        for j in range(3):
            out.append(f'<rect x="{gx + j * u}" y="{gy + i * u}" width="{u}" height="{u}" '
                       f'fill="{COL.get(top[i * 3 + j], top[i * 3 + j])}" stroke="{STROKE}" stroke-width="1.4" rx="3"/>')
    def center(rc):
        return (gx + rc[1] * u + u / 2, gy + rc[0] * u + u / 2)
    for k, ar in enumerate(arrows):
        a, b = ar[0], ar[1]
        double = len(ar) > 2 and ar[2] == "double"
        p1, p2 = center(a), center(b)
        vx, vy = p2[0] - p1[0], p2[1] - p1[1]
        L = math.hypot(vx, vy) or 1
        # zkratit a mirne odsadit kolmo (aby se protichudne sipky neprekryvaly)
        sh = 0.16
        offp = 4 if double else 0
        nx, ny = -vy / L * offp, vx / L * offp
        q1 = (p1[0] + vx * sh + nx, p1[1] + vy * sh + ny)
        q2 = (p2[0] - vx * sh + nx, p2[1] - vy * sh + ny)
        me = 'marker-end="url(#ah)"' + (' marker-start="url(#ah)"' if double else "")
        out.append(f'<line x1="{q1[0]:.1f}" y1="{q1[1]:.1f}" x2="{q2[0]:.1f}" y2="{q2[1]:.1f}" '
                   f'stroke="{ARROW}" stroke-width="4" {me} stroke-linecap="round"/>')
    for (loc, txt) in marks:
        kind = loc[0]
        if kind == "cell":
            p = center((loc[1], loc[2]))
        elif kind == "n":
            p = (gx + loc[1] * u + u / 2, oy + d / 2 + 1)
        elif kind == "s":
            p = (gx + loc[1] * u + u / 2, gy + 3 * u + gap + d / 2 + 1)
        elif kind == "w":
            p = (ox + d / 2, gy + loc[1] * u + u / 2 + 1)
        else:
            p = (gx + 3 * u + gap + d / 2, gy + loc[1] * u + u / 2 + 1)
        out.append(f'<text x="{p[0]:.1f}" y="{p[1]:.1f}" font-size="15" font-weight="700" '
                   f'fill="{ARROW}" text-anchor="middle" dominant-baseline="central">{txt}</text>')
    return "".join(out), w, h

# ------------------------------------------------------------ kompozice

def panel(items, cols=None, cap_h=None, pad=12, gap=18):
    """items: [(body, w, h, caption)] -> jeden SVG dokument v mrizce."""
    cols = cols or len(items)
    cap_w = max((max((len(l) for l in (it[3] or "").split("\n")), default=0)
                 for it in items)) * 7.2
    max_lines = max(len((it[3] or "").split("\n")) for it in items if it[3] is not None) \
        if any(it[3] for it in items) else 0
    if cap_h is None:
        cap_h = 14 + max_lines * 16
    cw = max(max(it[1] for it in items), cap_w)
    ch = max(it[2] for it in items) + cap_h
    rows = (len(items) + cols - 1) // cols
    W = pad * 2 + cols * cw + (cols - 1) * gap
    H = pad * 2 + rows * ch + (rows - 1) * gap
    out = []
    for k, (body, w, h, cap) in enumerate(items):
        r, c = divmod(k, cols)
        x = pad + c * (cw + gap) + (cw - w) / 2
        y = pad + r * (ch + gap)
        out.append(f'<g transform="translate({x:.1f},{y:.1f})">{body}</g>')
        if cap:
            lines = cap.split("\n")
            for li, line in enumerate(lines):
                out.append(f'<text x="{x + w / 2:.1f}" y="{y + h + 16 + li * 15:.1f}" font-size="13" '
                           f'fill="{TXT}" text-anchor="middle" font-weight="{600 if li == 0 else 400}">{line}</text>')
    return svg_doc(W, H, "".join(out))


def save(path, svg):
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)
    print("OK", path)
