# -*- coding: utf-8 -*-
"""Generuje SVG diagramy kostky pro moduly K01-K08, K11-K14."""
import os
from rubiklib import (Cube, ll_state, alg_arrows, iso_cube, top_view, panel,
                      save, svg_doc, _poly, _add, _mul, COL, SCHEME_W_UP, SCHEME_Y_UP)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..",
                   "courses", "rubikova-kostka", "assets")
os.makedirs(OUT, exist_ok=True)


def F(s):
    return s.split()


def cubie(colors, s=44):
    """Jeden dilek (1x1x1): colors = {'U':.., 'F':.., 'R':..} (chybejici = plast)."""
    rx, lx, dn = (0.866 * s, 0.5 * s), (-0.866 * s, 0.5 * s), (0, s)
    w = 2 * 0.866 * s + 8
    h = 2 * s + 8
    T = (w / 2, 4)
    plastic = "#2b3440"
    out = []
    for f, (O, a, b) in {
        "U": (T, rx, lx),
        "F": (_add(T, lx), rx, dn),
        "R": (_add(T, lx, rx), (-lx[0], -lx[1]), dn),
    }.items():
        col = colors.get(f)
        out.append(_poly([O, _add(O, a), _add(O, a, b), _add(O, b)],
                         COL[col] if col else plastic))
    return "".join(out), w, h


def strips_from(c):
    return {"n": list(reversed(c.face("B")[0:3])), "s": c.face("F")[0:3],
            "w": c.face("L")[0:3], "e": list(reversed(c.face("R")[0:3]))}


def yellow_only(cells):
    return ["Y" if x == "Y" else "X" for x in cells]


# ---------------------------------------------------------------- K01 dilky
items = [
    (*cubie({"U": "W"}), "STŘED - 1 barva\nnehýbe se, je to kapitán"),
    (*cubie({"U": "W", "F": "G"}), "HRANA - 2 barvy\ncelkem 12 hran"),
    (*cubie({"U": "W", "F": "G", "R": "R"}), "ROH - 3 barvy\ncelkem 8 rohů"),
]
save(os.path.join(OUT, "k01-dilky.svg"), panel(items, cols=3, cap_h=44))

# ---------------------------------------------------------------- K02 notace
solved = {"U": ["W"] * 9, "F": ["G"] * 9, "R": ["R"] * 9}
moves = [
    ([("U", "cw")], "U - horní strana\n(Up)"),
    ([("F", "right", 1.5, 2.5)], "D - spodní strana\n(Down)"),
    ([("R", "up", 0.5, 1.5)], "R - pravá strana\n(Right)"),
    ([("F", "down", 0.5, 1.5)], "L - levá strana\n(Left)"),
    ([("F", "cw")], "F - přední strana\n(Front)"),
    ([("U", "left", 1.5, 0.5)], "B - zadní strana\n(Back)"),
]
items = [(*iso_cube(solved, s=20, arrows=ar), cap) for ar, cap in moves]
save(os.path.join(OUT, "k02-notace.svg"), panel(items, cols=3, cap_h=44))

mods = [
    ([("R", "up", 0.5, 1.5)], "R = čtvrtka po směru\nhodinových ručiček"),
    ([("R", "down", 0.5, 1.5)], "R' = čtvrtka obráceně\n(čárka)"),
    ([("R", "up", 0.5, 1.5), ("R", "up", 2.5, 1.5)], "R2 = dvakrát\n(jedno kterým směrem)"),
]
items = [(*iso_cube(solved, s=20, arrows=ar), cap) for ar, cap in mods]
save(os.path.join(OUT, "k02-modifikatory.svg"), panel(items, cols=3, cap_h=44))

# ---------------------------------------------------------------- K03 kyticka + kriz
items = [(*top_view(F("X W X W Y W X W X"),
                    strips={"n": None, "s": None, "w": None, "e": None}),
          "Kytička: žlutý střed,\n4 bílé lístky")]
save(os.path.join(OUT, "k03-kyticka.svg"), panel(items, cols=1, cap_h=44))

ok = top_view(F("X W X W W W X W X"),
              strips={"n": F("X B X"), "s": F("X G X"), "w": F("X O X"), "e": F("X R X")},
              marks=[(("s", 1, 0), "✓"), (("e", 1, 0), "✓"), (("n", 1, 0), "✓"), (("w", 1, 0), "✓")])
bad = top_view(F("X W X W W W X W X"),
               strips={"n": F("X R X"), "s": F("X G X"), "w": F("X O X"), "e": F("X B X")},
               marks=[(("n", 1, 0), "✗"), (("e", 1, 0), "✗")])
save(os.path.join(OUT, "k03-bily-kriz.svg"), panel([
    (*ok, "SPRÁVNĚ: každá hrana\nnavazuje na svůj střed"),
    (*bad, "ŠPATNĚ: bílý kříž je,\nale barvy nesedí"),
], cols=2, cap_h=44))

# ---------------------------------------------------------------- K04 vytah
faces = {"U": F("X W X W W W X W X"),
         "F": F("X G X X G X X X W"),
         "R": F("X R X X R X G X X")}
body, w, h = iso_cube(faces, s=26,
                      highlights=[("U", 2, 2), ("F", 0, 2), ("R", 0, 0)],
                      arrows=[("F", "up", 2.5, 1.5)])
save(os.path.join(OUT, "k04-vytah.svg"), panel([
    (body, w, h, "Roh čeká přesně pod svým domečkem (čárkovaně).\nVýtah R' D' R D opakuj, dokud nezapadne bílou nahoru."),
], cols=1, cap_h=48))

# ---------------------------------------------------------------- K05 tecko
faces = {"U": F("X X X X X X X O X"),
         "F": F("X G X X G X G G G"),
         "R": F("X X X X O X O O O")}
body, w, h = iso_cube(faces, s=26,
                      highlights=[("F", 1, 2), ("R", 1, 0)],
                      arrows=[("R", "down", 0.5, 1.0)])
save(os.path.join(OUT, "k05-tecko.svg"), panel([
    (body, w, h, "Téčko: hrana nad svým středem, druhá barva (oranžová) ukazuje doprava.\nDoprava: U R U' R' U' F' U F   |   doleva zrcadlově: U' L' U L U F U' F'"),
], cols=1, cap_h=48))

# ---------------------------------------------------------------- K06 zlute tvary
shapes = [
    (F("X X X X Y X X X X"), "TEČKA\nkouzlo 3×"),
    (F("X Y X Y Y X X X X"), "ÉČKO vlevo nahoře\nkouzlo 2×"),
    (F("X X X Y Y Y X X X"), "ČÁRA vodorovně\nkouzlo 1×"),
    (F("X Y X Y Y Y X Y X"), "ŽLUTÝ KŘÍŽ\nhotovo!"),
]
items = [(*top_view(t), cap) for t, cap in shapes]
save(os.path.join(OUT, "k06-zluty-kriz.svg"), panel(items, cols=4, cap_h=44))

# ---------------------------------------------------------------- K07 hrany + kolotoc
adj = top_view(F("X Y X Y Y Y X Y X"),
               strips={"n": F("X B X"), "e": F("X O X"), "s": F("X R X"), "w": F("X G X")},
               marks=[(("n", 1, 0), "✓"), (("e", 1, 0), "✓"), (("s", 1, 0), "✗"), (("w", 1, 0), "✗")])
opp = top_view(F("X Y X Y Y Y X Y X"),
               strips={"n": F("X B X"), "s": F("X G X"), "e": F("X R X"), "w": F("X O X")},
               marks=[(("n", 1, 0), "✓"), (("s", 1, 0), "✓"), (("e", 1, 0), "✗"), (("w", 1, 0), "✗")])
save(os.path.join(OUT, "k07-hrany.svg"), panel([
    (*adj, "Dvě správné VEDLE SEBE:\ndej je dozadu + doprava, pak Sune"),
    (*opp, "Dvě správné NAPROTI:\nSune odkudkoli, pak znovu"),
], cols=2, cap_h=48))

ALG_KOLOTOC = "U R U' L' U R' U' L"
st = ll_state(ALG_KOLOTOC)
arrows = alg_arrows(ALG_KOLOTOC)
moved = {a for a, _ in arrows}
home = [(r, c) for r in (0, 2) for c in (0, 2) if (r, c) not in moved]
marks = [(("cell", r, c), "✓") for r, c in home]
body, w, h = top_view(st.face("U"), strips=strips_from(st), arrows=arrows, marks=marks)
save(os.path.join(OUT, "k07-kolotoc.svg"), panel([
    (body, w, h, "Domácí roh (✓) drž vpravo vpředu, ostatní tři jedou kolotočem.\nU R U' L' U R' U' L (případně 2×)"),
], cols=1, cap_h=48))

# ---------------------------------------------------------------- K08 otoceni rohu
faces = {"U": F("B Y O Y Y Y Y Y G"),
         "F": F("X G Y G G G G G G"),
         "R": F("O O X O O O O O O")}
body, w, h = iso_cube(faces, s=26,
                      highlights=[("U", 2, 2), ("F", 0, 2), ("R", 0, 0)],
                      arrows=[("U", "cw")])
save(os.path.join(OUT, "k08-otoceni-rohu.svg"), panel([
    (body, w, h, "Neotočený roh natoč vpravo dopředu → R' D' R D (2× nebo 4×), dokud není žlutá nahoře.\nPak NEOTÁČEJ kostku, jen otoč U a přivez další roh. Spodek vypadá rozbitě - to je správně."),
], cols=1, cap_h=48))

# ---------------------------------------------------------------- K11 CFOP kroky
cross = {"U": F("X W X W W W X W X"), "F": F("X G X X G X X X X"), "R": F("X R X X R X X X X")}
f2l = {"U": ["W"] * 9, "F": F("G G G G G G X X X"), "R": F("R R R R R R X X X")}
oll = {"U": ["Y"] * 9, "F": F("B R O G G G G G G"), "R": F("G B R O O O O O O")}
done = {"U": ["Y"] * 9, "F": ["G"] * 9, "R": ["O"] * 9}
items = [
    (*iso_cube(cross, s=19), "1 CROSS: kříž dole\n(zde bílou nahoru)"),
    (*iso_cube(f2l, s=19), "2 F2L: první dvě vrstvy\npo 4 párech"),
    (*iso_cube(oll, s=19), "3 OLL: žlutá nahoru\n(orientace)"),
    (*iso_cube(done, s=19), "4 PLL: vše na místa\n(permutace)"),
]
save(os.path.join(OUT, "k11-cfop.svg"), panel(items, cols=4, cap_h=44))

# ---------------------------------------------------------------- K12 F2L par
st = ll_state("U R U' R'")
keep = lambda cid: cid[1] <= 0  # LL dilky sede, par (roh+hrana FR) a spodek barevne
faces = {f: st.face_masked(f, keep) for f in ("U", "F", "R")}
body, w, h = iso_cube(faces, s=26, highlights=[("F", 1, 2), ("R", 1, 0)])
save(os.path.join(OUT, "k12-f2l-par.svg"), panel([
    (body, w, h, "Základní případ: roh s hranou se potkají nahoře\na do slotu (čárkovaně) zajedou na U R U' R'."),
], cols=1, cap_h=48))

# ---------------------------------------------------------------- K13 OCLL 7 tvaru
OCLL = [
    ("Sune", "R U R' U R U2 R'", 1),
    ("Antisune", "R U2 R' U' R U' R'", 1),
    ("H", "R U2 R' U' R U R' U' R U' R'", 0),
    ("Pi", "R U2 R2 U' R2 U' R2 U2 R", 0),
    ("U", "R2 D' R U2 R' D R U2 R", 2),
    ("T", "r U R' U' r' F R F'", 2),
    ("L", "F' r U R' U' r' F R", 2),
]
items = []
for name, alg, expect in OCLL:
    st = ll_state(alg)
    u = st.face("U")
    assert u[1] == u[3] == u[5] == u[7] == "Y" == u[4], f"{name}: hrany nejsou zlute!"
    n_yellow = sum(1 for i in (0, 2, 6, 8) if u[i] == "Y")
    assert n_yellow == expect, f"{name}: {n_yellow} zlutych rohu, cekal {expect}"
    sp = {k: yellow_only(v) for k, v in strips_from(st).items()}
    items.append((*top_view(yellow_only(u), strips=sp, u=26),
                  f"{name}\n{expect} žl. roh{'y' if expect == 2 else ''} nahoře"))
save(os.path.join(OUT, "k13-oll-rohy.svg"), panel(items, cols=4, cap_h=44))

# ---------------------------------------------------------------- K14 PLL
TPERM = "R U R' U' R' F R2 U' R' U' R U R' F'"
st = ll_state(TPERM)
assert set(st.face("U")) == {"Y"}, "T perm neni cisty PLL!"
body, w, h = top_view(st.face("U"), strips=strips_from(st), arrows=alg_arrows(TPERM))
save(os.path.join(OUT, "k14-rohy.svg"), panel([
    (body, w, h, "Světlomety (dva stejné boky rohů) dej DOZADU a spusť T perm:\nR U R' U' R' F R2 U' R' U' R U R' F'"),
], cols=1, cap_h=48))

PLL_EDGES = [
    ("Ua perm", "R U' R U R U R U' R' U' R2", "R U' R U R U R U' R' U' R2"),
    ("Ub perm", "R2 U R U R' U' R' U' R' U R'", "R2 U R U R' U' R' U' R' U R'"),
    ("H perm", "M2 U M2 U2 M2 U M2", "protější hrany (jperm.net)"),
    ("Z perm", "M' U M2 U M2 U M' U2 M2", "sousední hrany (jperm.net)"),
]
items = []
for name, alg, cap2 in PLL_EDGES:
    st = ll_state(alg)
    assert set(st.face("U")) == {"Y"}, f"{name} neni cisty PLL!"
    items.append((*top_view(st.face("U"), strips=strips_from(st),
                            arrows=alg_arrows(alg), u=26), f"{name}\n{cap2}"))
save(os.path.join(OUT, "k14-hrany.svg"), panel(items, cols=4, cap_h=44))

print("HOTOVO cast 1")
