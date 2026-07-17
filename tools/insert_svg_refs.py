# -*- coding: utf-8 -*-
"""Vlozi odkazy na SVG assety do modulu kurzu rubikova-kostka (za odstavec s kotvou)."""
import os
import re

MODS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..",
                    "courses", "rubikova-kostka", "modules")

# modul -> [(kotva v radku, radek s obrazkem)]
PLAN = {
    "K01": [("Rohy (corners)", "![Tři druhy dílků: střed (1 barva), hrana (2 barvy), roh (3 barvy)](assets/k01-dilky.svg)")],
    "K02": [("Každá strana má jméno", "![Šest stran a jejich tahy: U, D, R, L, F, B](assets/k02-notace.svg)"),
            ("Čárka = obráceně", "![R = čtvrtka po směru ručiček, R' = obráceně, R2 = dvakrát](assets/k02-modifikatory.svg)")],
    "K03": [("První cíl je kytička", "![Kytička: žlutý střed a 4 bílé lístky](assets/k03-kyticka.svg)"),
            ("Kontrola je povinná", "![Kontrola kříže: barvy hran musí navazovat na středy](assets/k03-bily-kriz.svg)")],
    "K04": [("Kouzelný výtah", "![Výtah R' D' R D: roh čeká přesně pod svým domečkem](assets/k04-vytah.svg)")],
    "K05": [("Udělej téčko", "![Téčko: hrana nad svým středem, pak zásun doprava](assets/k05-tecko.svg)")],
    "K06": [("jaký tvar žlutá dělá", "![Čtyři tvary žluté: tečka, éčko, čára, kříž](assets/k06-zluty-kriz.svg)")],
    "K07": [("Dvě správné vedle sebe", "![Dvě správné hrany vedle sebe vs. naproti sobě](assets/k07-hrany.svg)"),
            ("Rohový kolotoč", "![Rohový kolotoč: tři rohy se točí, domácí roh stojí](assets/k07-kolotoc.svg)")],
    "K08": [("Točíme roh, ne kostku", "![Otáčení rohů výtahem: neotočený roh vpravo vpředu, pak jen otoč U](assets/k08-otoceni-rohu.svg)")],
    "K09": [("Zatím jich máš jen pět", "![Pět kouzel metody vrstev na jedné kartě](assets/k09-pet-kouzel.svg)")],
    "K10": [("Měř, ale v klidu", "![Typická tréninková křivka: plató je normální fáze](assets/k10-trenink.svg)")],
    "K11": [("CFOP = Cross", "![Čtyři kroky CFOP: Cross, F2L, OLL, PLL](assets/k11-cfop.svg)")],
    "K12": [("Tři situace", "![Základní F2L případ: pár nad svým slotem](assets/k12-f2l-par.svg)")],
    "K13": [("sedm tvarů rohů", "![Sedm tvarů rohů 2-look OLL: Sune, Antisune, H, Pi, U, T, L](assets/k13-oll-rohy.svg)")],
    "K14": [("rohy podle světlometů", "![T perm: světlomety dej dozadu](assets/k14-rohy.svg)"),
            ("čtyři hranové případy", "![Čtyři hranové případy 2-look PLL: Ua, Ub, H, Z](assets/k14-hrany.svg)")],
    "K15": [("Prsty, ne zápěstí", "![Mapa fingertricků: který prst dělá který tah](assets/k15-fingertricks.svg)")],
    "K16": [("Tempo: 2 až 3", "![Cesta k full OLL/PLL: nejdřív PLL, pak OLL](assets/k16-mapa-algoritmu.svg)")],
    "K17": [("nežerou tahy", "![Kam mizí čas: pauzy vs. plynulé řešení](assets/k17-lookahead.svg)")],
    "K18": [("Cena vs. výkon", "![Cena vs. výkon speedcubů, stav 2026](assets/k18-hardware.svg)")],
    "K19": [("Průměr poráží rekord", "![Výpočet ao5: škrtni nejlepší a nejhorší čas](assets/k19-ao5.svg)")],
    "K20": [("legitimní alternativy", "![CFOP, Roux, ZZ a kam dál](assets/k20-metody.svg)")],
}

for mod, inserts in sorted(PLAN.items()):
    p = os.path.join(MODS, mod + ".md")
    with open(p, encoding="utf-8") as f:
        lines = f.read().split("\n")
    for anchor, img in inserts:
        if any(img in l for l in lines):
            print(f"{mod}: uz vlozeno, preskakuji ({anchor})")
            continue
        idx = next((i for i, l in enumerate(lines) if anchor in l and not l.startswith("!")), None)
        assert idx is not None, f"{mod}: kotva nenalezena: {anchor}"
        lines.insert(idx + 1, img)
        lines.insert(idx + 1, "")
    txt = "\n".join(lines)
    txt = re.sub(r'^updated: ".*"$', 'updated: "2026-07-17"', txt, flags=re.M)
    txt = re.sub(r'^version: "1\.0"$', 'version: "1.1"', txt, flags=re.M)
    with open(p, "w", encoding="utf-8") as f:
        f.write(txt)
    print(f"{mod}: +{len(inserts)} obrazku")
print("HOTOVO")
