#!/usr/bin/env python3
"""Author the H&SB Tier-1 lesson figures (audit /home/team/shared/human-social-biology-figure-audit.md §2.1-2.3).

All-original vector diagrams drawn to the vocabulary the three lessons teach on
origin/main.  No number, size or magnification appears that the lesson (or its own
kindred copy extension shipped in the same PR) does not state, and every colour code
is also spelt out in words, so nothing depends on colour alone.

Shared-asset-first: the heart is NOT redrawn.  figure_heart_copy() copies Biology's
live heart-and-double-circulation.svg byte for byte (asserted, md5 compared) because the
figures contract only accepts a subject-local src; the H&SB-only vocabulary (vessel
walls, blood components, the alveolus) lives in a separate figure.  The cell panel reuses
the Biology cell generator's geometry and primitives with H&SB's reduced label set.

The style constants and the small drawing primitives are the same values the shared
Biology generator uses (see /home/team/shared/biology-figures/gen_bio_figs.py), so a
Biology figure and an H&SB figure read as one set of artwork.

Writes the SVGs into --out (default /tmp/hsb-figs).  With --repo it also writes both
trees (content/human-social-biology/figures + public/content/human-social-biology/figures).
"""
import argparse
import hashlib
import io
import math
import os
import re
import sys

# ---------------------------------------------------------------- style (matches the Biology set)
INK = "#0f172a"
MUTED = "#475569"
LINE = "#64748b"
PANEL = "#f1f5f9"
PANEL_L = "#cbd5e1"
WALL = "#15803d"
MEMB = "#334155"
NUC = "#ddd6fe"; NUC_L = "#6d28d9"
CHL = "#4ade80"; CHL_L = "#15803d"
MIT = "#fca5a5"; MIT_L = "#b91c1c"
VAC = "#bae6fd"; VAC_L = "#0284c7"
RIB = "#d97706"
CYTO_PLANT = "#eefaf1"
CYTO_ANIMAL = "#fdf2f6"
DEOX = "#93c5fd"; DEOX_L = "#1d4ed8"
OXY = "#fca5a5"; OXY_L = "#b91c1c"
ORGAN = "#fecdd3"; ORGAN_L = "#9f1239"
AIR = "#e0f2fe"; AIR_L = "#0369a1"
BONE = "#f8fafc"; BONE_L = "#475569"
APPE = "#e0e7ff"; APPE_L = "#4338ca"
BICEPS = "#fca5a5"; BICEPS_L = "#b91c1c"
TRICEPS = "#93c5fd"; TRICEPS_L = "#1d4ed8"
PLASMA = "#fef9c3"; PLASMA_L = "#ca8a04"
PLAT = "#fde68a"; PLAT_L = "#b45309"
WBC = "#e9d5ff"; WBC_L = "#7e22ce"
FONT = "Helvetica,Arial,sans-serif"


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def txt(x, y, s, size=24, anchor="start", fill=INK, weight="400"):
    return (f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" '
            f'text-anchor="{anchor}" fill="{fill}" font-weight="{weight}" '
            f'dominant-baseline="middle">{esc(s)}</text>')


def leader(x1, y1, x2, y2, w=2, color=LINE):
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" '
            f'stroke-width="{w}"/><circle cx="{x2}" cy="{y2}" r="4.5" fill="{color}"/>')


def margin_label(x, y, ax, ay, s, anchor, size=22, fill=INK):
    return txt(x, y, s, size=size, anchor=anchor, fill=fill) + leader(
        x + (6 if anchor == "start" else -6), y, ax, ay)


def defs(prefix, colours=(("arrow", MUTED), ("red", OXY_L), ("blue", DEOX_L), ("amber", PLAT_L))):
    out = ['<defs>']
    for name, col in colours:
        out.append(
            f'<marker id="{prefix}-{name}" viewBox="0 0 10 10" refX="8" refY="5" '
            f'markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
            f'<path d="M 0 0 L 10 5 L 0 10 z" fill="{col}"/></marker>')
    out.append('</defs>')
    return "".join(out)


def svg(prefix, w, h, title, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" '
            f'height="{h}" role="img"><title>{esc(title)}</title>'
            f'<rect x="0" y="0" width="{w}" height="{h}" fill="#ffffff"/>'
            f'{defs(prefix)}{body}</svg>')


def mitochondrion(x, y, w=96, h=46):
    r = h / 2
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{MIT}" '
            f'stroke="{MIT_L}" stroke-width="3"/>'
            f'<path d="M {x+14},{y+h/2} q 12,-11 24,0 q 12,11 24,0 q 12,-11 24,0" fill="none" '
            f'stroke="{MIT_L}" stroke-width="2.5"/>')


def chloroplast(cx, cy, rx=27, ry=16):
    return (f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{CHL}" '
            f'stroke="{CHL_L}" stroke-width="3"/>'
            f'<ellipse cx="{cx-7}" cy="{cy}" rx="{rx/3.4}" ry="{ry/2.6}" fill="{CHL_L}" opacity="0.5"/>')


def dots(pts, r=5, fill=RIB):
    return "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"/>' for x, y in pts)


def tube(d, colour, light, w=38):
    return (f'<path d="{d}" fill="none" stroke="{colour}" stroke-width="{w}" stroke-linecap="round"/>'
            f'<path d="{d}" fill="none" stroke="{light}" stroke-width="{w-9}" stroke-linecap="round"/>')


def badge(x, y, n, r=19, fill="#ffffff", stroke=INK):
    return (f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="3"/>'
            f'{txt(x, y+1, str(n), size=23, anchor="middle", weight="700")}')


def panel(x, y, w, h, fill=PANEL, stroke=PANEL_L, rx=14):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'


# ---------------------------------------------------------------- 1. the heart (byte-identical copy of Biology's)
BIOLOGY_HEART = "content/biology/figures/heart-and-double-circulation.svg"


def heart_copy(repo):
    with io.open(os.path.join(repo, BIOLOGY_HEART), "rb") as fh:
        return fh.read()


# ---------------------------------------------------------------- 2. blood vessels, blood and gas exchange
def figure_blood_and_gas_exchange():
    W, H = 1000, 1450
    b = []
    b.append(txt(20, 42, "BLOOD VESSELS, BLOOD AND GAS EXCHANGE", size=28, weight="700"))

    # ---------------- panel A: the three vessel walls, in section
    b.append(panel(20, 66, 960, 300, "#f8fafc"))
    cols = [
        (40, 190, OXY, OXY_L, 92, 44, "ARTERY",
         ["thick, muscular, elastic wall", "blood away from the heart,", "at high pressure"]),
        (360, 510, DEOX, DEOX_L, 92, 64, "VEIN",
         ["thinner wall, lower pressure", "blood back towards the heart"]),
    ]
    for x0, cx, fill, stroke, r, lumen, name, notes in cols:
        b.append(f'<circle cx="{cx}" cy="196" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="4"/>')
        b.append(f'<circle cx="{cx}" cy="196" r="{lumen}" fill="#ffffff" stroke="{stroke}" stroke-width="3"/>')
        b.append(txt(x0, 322, name, size=23, weight="700", fill=stroke))
        for i, line in enumerate(notes):
            b.append(txt(x0, 352 + i * 26, line, size=16, fill=MUTED))
    # capillary: one cell thick
    b.append(f'<circle cx="830" cy="196" r="92" fill="#fff1f2" stroke="none"/>')
    b.append(f'<circle cx="830" cy="196" r="88" fill="none" stroke="{OXY_L}" stroke-width="3" stroke-dasharray="26 8"/>')
    b.append(f'<circle cx="830" cy="196" r="82" fill="#ffffff" stroke="none"/>')
    b.append(txt(830, 190, "one cell", size=20, anchor="middle", fill=OXY_L))
    b.append(txt(830, 216, "thick", size=20, anchor="middle", fill=OXY_L))
    b.append(txt(680, 322, "CAPILLARY", size=23, weight="700", fill=OXY_L))
    for i, line in enumerate(["wall only one cell thick", "materials are exchanged here"]):
        b.append(txt(680, 352 + i * 26, line, size=16, fill=MUTED))

    # ---------------- panel B: a valve in a vein
    b.append(panel(20, 386, 960, 176, "#eff6ff", "#bfdbfe"))
    b.append(txt(44, 420, "A VALVE IN A VEIN", size=24, weight="700", fill=DEOX_L))
    b.append(tube("M 300,506 L 720,506", DEOX_L, "#bfdbfe", 58))
    for x, d in ((450, 1), (530, -1)):
        b.append(f'<path d="M {x},506 C {x+22},{506-26*d} {x+40},{506-26*d} {x+46},506" '
                 f'fill="{DEOX}" stroke="{DEOX_L}" stroke-width="3"/>')
    b.append(margin_label(250, 470, 466, 492, "valve cusps", "end", size=20))
    b.append(txt(250, 496, "they close if blood", size=16, anchor="end", fill=MUTED))
    b.append(txt(250, 522, "tries to flow back", size=16, anchor="end", fill=MUTED))
    b.append(f'<line x1="700" y1="506" x2="360" y2="506" stroke="{DEOX_L}" stroke-width="4" '
             f'marker-end="url(#vessels-blue)"/>')
    b.append(txt(744, 492, "one-way flow", size=19, fill=DEOX_L))
    b.append(txt(744, 518, "towards the heart", size=19, fill=MUTED))

    # ---------------- panel C: the components of blood
    b.append(panel(20, 586, 960, 380, "#fff7ed", "#fed7aa"))
    b.append(txt(44, 620, "THE COMPONENTS OF BLOOD", size=24, weight="700", fill="#9a3412"))

    def component(x, name, notes, size=19):
        b.append(txt(x, 656, name, size=size, weight="700"))
        for i, line in enumerate(notes):
            b.append(txt(x, 924 + i * 24, line, size=16, fill=MUTED))

    # plasma: a pale liquid with dissolved substances in it
    b.append(panel(56, 682, 210, 208, PLASMA, PLASMA_L, 12))
    b.append(dots([(100, 732), (140, 722), (180, 738), (110, 782), (170, 788), (216, 762),
                   (96, 838), (150, 848), (198, 840), (130, 878), (176, 872)], r=7, fill=PLASMA_L))
    component(60, "PLASMA", ["pale liquid that", "carries dissolved substances"])
    # red blood cells
    for cx, cy in ((320, 716), (420, 706), (370, 782), (440, 828), (322, 828), (388, 862)):
        b.append(f'<ellipse cx="{cx}" cy="{cy}" rx="34" ry="26" fill="{OXY}" stroke="{OXY_L}" stroke-width="3"/>')
        b.append(f'<ellipse cx="{cx}" cy="{cy}" rx="14" ry="10" fill="#fecaca" stroke="none"/>')
    component(290, "RED BLOOD CELLS", ["disc-shaped, no nucleus;", "carries oxygen (haemoglobin)"])
    # white blood cells
    for cx, cy, s in ((600, 744, 1.0), (690, 822, 0.8)):
        r = 46 * s
        b.append(f'<path d="M {cx-r},{cy} C {cx-r},{cy-r} {cx+r},{cy-r*1.2} {cx+r},{cy} '
                 f'C {cx+r},{cy+r*1.1} {cx-r*0.9},{cy+r} {cx-r},{cy} Z" fill="{WBC}" '
                 f'stroke="{WBC_L}" stroke-width="3"/>')
        b.append(f'<circle cx="{cx}" cy="{cy}" r="{r*0.45}" fill="{WBC_L}" opacity="0.65"/>')
    component(528, "WHITE BLOOD CELLS", ["fight infection"])
    # platelets
    for cx, cy in ((800, 712), (850, 728), (820, 760), (786, 788), (846, 802), (806, 838),
                   (856, 858), (832, 884), (786, 868)):
        b.append(f'<path d="M {cx},{cy-12} L {cx+11},{cy-4} L {cx+7},{cy+11} L {cx-7},{cy+11} '
                 f'L {cx-11},{cy-4} Z" fill="{PLAT}" stroke="{PLAT_L}" stroke-width="2"/>')
    component(756, "PLATELETS", ["help the blood to clot"])

    # ---------------- panel D: the lungs, the diaphragm, and one alveolus
    b.append(panel(20, 986, 960, 448, "#f0f9ff", "#bae6fd"))
    b.append(txt(44, 1020, "BREATHING IN, AND GAS EXCHANGE IN AN ALVEOLUS", size=24, weight="700", fill=AIR_L))
    # the two lungs, with the diaphragm below them
    b.append(f'<path d="M 296,1112 C 236,1060 168,1098 158,1172 C 150,1246 196,1296 254,1290 '
             f'C 288,1286 300,1256 300,1216 L 300,1128 Z" fill="{ORGAN}" stroke="{ORGAN_L}" stroke-width="5"/>')
    b.append(f'<path d="M 304,1112 C 364,1060 432,1098 442,1172 C 450,1246 404,1296 346,1290 '
             f'C 312,1286 300,1256 300,1216 L 300,1128 Z" fill="{ORGAN}" stroke="{ORGAN_L}" stroke-width="5"/>')
    b.append(f'<path d="M 300,1034 L 300,1082" stroke="{ORGAN_L}" stroke-width="24" stroke-linecap="round"/>')
    b.append(f'<path d="M 292,1082 C 272,1098 250,1112 236,1128" stroke="{ORGAN_L}" stroke-width="15" '
             f'fill="none" stroke-linecap="round"/>')
    b.append(f'<path d="M 308,1082 C 328,1098 350,1112 364,1128" stroke="{ORGAN_L}" stroke-width="15" '
             f'fill="none" stroke-linecap="round"/>')
    b.append(txt(300, 1240, "lungs", size=22, anchor="middle", weight="700", fill=ORGAN_L))
    b.append(f'<path d="M 140,1330 C 220,1280 380,1280 460,1330" fill="none" stroke="#0e7490" '
             f'stroke-width="10" stroke-linecap="round"/>')
    b.append(f'<line x1="300" y1="1312" x2="300" y2="1350" stroke="#0e7490" stroke-width="5" '
             f'marker-end="url(#vessels-arrow)"/>')
    b.append(txt(300, 1392, "breathing in (inhalation): the diaphragm moves down", size=18, anchor="middle"))
    b.append(txt(300, 1418, "diaphragm — the dome-shaped muscle below the lungs", size=18, anchor="middle",
                 fill="#0e7490"))
    # one alveolus with its capillary, drawn much larger than life
    b.append(tube("M 560,1104 C 620,1024 800,1016 884,1096", OXY_L, "#fecaca", 30))
    b.append(f'<circle cx="720" cy="1180" r="112" fill="{AIR}" stroke="{AIR_L}" stroke-width="6"/>')
    b.append(txt(720, 1180, "ALVEOLUS", size=22, anchor="middle", weight="700", fill=AIR_L))
    b.append(txt(716, 1036, "capillary", size=21, anchor="middle", weight="700"))
    b.append(f'<line x1="702" y1="1150" x2="718" y2="1086" stroke="{DEOX_L}" stroke-width="4" '
             f'marker-end="url(#vessels-blue)"/>')
    b.append(txt(726, 1108, "oxygen", size=19, fill=DEOX_L))
    b.append(txt(726, 1132, "into the blood", size=17, fill=MUTED))
    b.append(f'<line x1="890" y1="1180" x2="836" y2="1180" stroke="{OXY_L}" stroke-width="4" '
             f'marker-end="url(#vessels-red)"/>')
    b.append(txt(976, 1160, "carbon dioxide out", size=18, anchor="end", fill=OXY_L))
    b.append(txt(976, 1186, "of the blood", size=18, anchor="end", fill=MUTED))
    b.append(txt(720, 1330, "this is where gaseous exchange takes place", size=19, anchor="middle", fill=MUTED))
    b.append(txt(720, 1356, "drawn much larger than life", size=17, anchor="middle", fill=MUTED))
    return svg("vessels", W, H, "Blood vessels, the components of blood, and gas exchange in an alveolus", "".join(b))


# ---------------------------------------------------------------- 3. plant and animal cell (reduced label set)
def figure_cell():
    W, H = 1000, 1245
    b = []
    b.append(txt(20, 44, "PLANT CELL", size=30, weight="700", fill="#14532d"))
    b.append(txt(20, 650, "ANIMAL CELL", size=30, weight="700", fill="#9f1239"))

    # ---------------- plant cell (same geometry as Biology's cell panel)
    b.append(f'<rect x="250" y="120" width="450" height="390" rx="16" fill="#ffffff" '
             f'stroke="{WALL}" stroke-width="14"/>')
    b.append(f'<rect x="264" y="134" width="422" height="362" rx="10" fill="{CYTO_PLANT}" '
             f'stroke="{MEMB}" stroke-width="4"/>')
    b.append(f'<rect x="340" y="210" width="230" height="230" rx="28" fill="{VAC}" '
             f'stroke="{VAC_L}" stroke-width="4"/>')
    b.append(f'<circle cx="630" cy="185" r="42" fill="{NUC}" stroke="{NUC_L}" stroke-width="4"/>')
    b.append(f'<circle cx="630" cy="185" r="14" fill="{NUC_L}"/>')
    for cx, cy in [(297, 175), (297, 250), (297, 325), (297, 400), (297, 472),
                   (400, 472), (540, 472), (645, 330), (645, 415)]:
        b.append(chloroplast(cx, cy))
    b.append(mitochondrion(284, 443, 96, 44))
    b.append(dots([(560, 150), (300, 148), (665, 265), (352, 410), (665, 470)]))
    b.append(margin_label(240, 188, 262, 190, "cell wall", "end"))
    b.append(txt(240, 214, "(cellulose)", size=19, anchor="end", fill=MUTED))
    b.append(margin_label(240, 300, 272, 300, "cell membrane", "end"))
    b.append(margin_label(240, 250, 276, 250, "chloroplast", "end"))
    b.append(margin_label(240, 355, 300, 355, "cytoplasm", "end"))
    b.append(margin_label(240, 465, 292, 465, "mitochondrion", "end"))
    b.append(margin_label(726, 185, 668, 185, "nucleus", "start"))
    b.append(margin_label(726, 255, 576, 255, "large central vacuole", "start"))
    b.append(margin_label(726, 470, 672, 470, "ribosome", "start"))

    # ---------------- animal cell: H&SB's own organelle set only
    blob = ("M 478,690 C 596,684 682,746 696,850 C 708,946 664,1036 582,1076 "
            "C 504,1114 396,1098 326,1034 C 266,978 246,882 260,800 C 276,710 364,696 478,690 Z")
    b.append(f'<path d="{blob}" fill="{CYTO_ANIMAL}" stroke="{MEMB}" stroke-width="6"/>')
    b.append(f'<circle cx="560" cy="800" r="46" fill="{NUC}" stroke="{NUC_L}" stroke-width="4"/>')
    b.append(f'<circle cx="560" cy="800" r="16" fill="{NUC_L}"/>')
    b.append(mitochondrion(336, 772, 100, 48))
    b.append(mitochondrion(352, 1022, 100, 48))
    b.append(dots([(400, 968), (490, 752), (622, 930), (300, 800), (500, 1052), (620, 1010)]))
    b.append(margin_label(240, 700, 300, 704, "cell membrane", "end"))
    b.append(margin_label(240, 890, 288, 890, "cytoplasm", "end"))
    b.append(margin_label(240, 1050, 342, 1044, "mitochondrion", "end"))
    b.append(margin_label(726, 800, 608, 800, "nucleus", "start"))
    b.append(margin_label(726, 1050, 506, 1052, "ribosome", "start"))

    # ---------------- shared vs plant-only, in words
    b.append(f'<rect x="20" y="1128" width="960" height="96" rx="12" fill="{PANEL}" '
             f'stroke="{PANEL_L}" stroke-width="2"/>')
    b.append(txt(40, 1158, "Both cells have a nucleus, cytoplasm, cell membrane, mitochondria and ribosomes.", size=19))
    b.append(txt(40, 1188, "Plant cells also have a cell wall, chloroplasts and a large central vacuole", size=19))
    b.append(txt(40, 1214, "— animal cells do not.", size=19))
    return svg("cell", W, H, "A labelled plant cell beside a labelled animal cell", "".join(b))


# ---------------------------------------------------------------- 4. specialised cells and the levels of organisation
def figure_specialised_cells():
    W, H = 1000, 760
    b = []
    b.append(txt(20, 42, "SPECIALISED CELLS AND THE LEVELS OF ORGANISATION", size=28, weight="700"))

    def cell_panel(x, title):
        b.append(panel(x, 68, 290, 372, "#ffffff", PANEL_L, 14))
        b.append(txt(x + 145, 104, title, size=23, anchor="middle", weight="700"))

    # red blood cell
    cell_panel(20, "RED BLOOD CELL")
    b.append(f'<ellipse cx="165" cy="230" rx="104" ry="78" fill="{OXY}" stroke="{OXY_L}" stroke-width="5"/>')
    b.append(f'<ellipse cx="165" cy="230" rx="62" ry="44" fill="#fecaca" stroke="none"/>')
    b.append(f'<circle cx="165" cy="230" r="26" fill="none" stroke="{OXY_L}" stroke-width="3" stroke-dasharray="8 6"/>')
    b.append(txt(165, 230+2, "no", size=17, anchor="middle", fill=OXY_L))
    b.append(txt(165, 250+2, "nucleus", size=17, anchor="middle", fill=OXY_L))
    b.append(txt(165, 348, "disc-shaped", size=20, anchor="middle", fill=MUTED))
    b.append(txt(165, 376, "carries oxygen", size=20, anchor="middle", fill=MUTED))
    b.append(txt(165, 402, "for the whole body", size=20, anchor="middle", fill=MUTED))

    # sperm cell
    cell_panel(355, "SPERM CELL")
    b.append(f'<ellipse cx="440" cy="222" rx="62" ry="46" fill="{NUC}" stroke="{NUC_L}" stroke-width="5"/>')
    b.append(f'<path d="M 500,222 C 556,180 566,266 610,224 C 646,192 664,254 620,268" '
             f'fill="none" stroke="{NUC_L}" stroke-width="9" stroke-linecap="round"/>')
    b.append(txt(455, 348, "a tail for swimming", size=20, anchor="middle", fill=MUTED))
    b.append(txt(455, 376, "to reach the egg", size=20, anchor="middle", fill=MUTED))

    # nerve cell
    cell_panel(690, "NERVE CELL")
    b.append(f'<circle cx="752" cy="200" r="34" fill="{WBC}" stroke="{WBC_L}" stroke-width="5"/>')
    for dx, dy in ((-30, -30), (0, -40), (30, -28), (-34, 22), (32, 26)):
        b.append(f'<line x1="{752+dx*0.5}" y1="{200+dy*0.5}" x2="{752+dx}" y2="{200+dy}" '
                 f'stroke="{WBC_L}" stroke-width="6" stroke-linecap="round"/>')
    b.append(tube("M 786,200 L 930,206", WBC_L, "#d8b4fe", 15))
    b.append(txt(846, 348, "long and thin", size=20, anchor="middle", fill=MUTED))
    b.append(txt(846, 376, "carries electrical signals", size=20, anchor="middle", fill=MUTED))

    # levels of organisation
    b.append(panel(20, 462, 960, 268, "#f8fafc"))
    b.append(txt(44, 496, "FROM CELLS TO SYSTEMS", size=23, weight="700"))
    levels = [("cells", "the basic unit of life"), ("tissues", "groups of similar cells"),
              ("organs", "different tissues working together"), ("systems", "organs working together")]
    x = 60
    for i, (name, note) in enumerate(levels):
        b.append(panel(x, 528, 190, 150, "#ffffff", PANEL_L, 12))
        b.append(txt(x + 95, 574, name.upper(), size=24, anchor="middle", weight="700"))
        words = note.split()
        line1 = " ".join(words[:3])
        line2 = " ".join(words[3:])
        b.append(txt(x + 95, 612, line1, size=17, anchor="middle", fill=MUTED))
        if line2:
            b.append(txt(x + 95, 636, line2, size=17, anchor="middle", fill=MUTED))
        if i < 3:
            b.append(f'<line x1="{x+196}" y1="603" x2="{x+228}" y2="603" stroke="{INK}" '
                     f'stroke-width="5" marker-end="url(#cells-arrow)"/>')
        x += 240
    return svg("cells", W, H, "Diagrams of red blood, sperm and nerve cells with their adaptations, above the levels of organisation from cells to systems", "".join(b))


# ---------------------------------------------------------------- 5. the skeleton
def figure_skeleton():
    W, H = 1000, 1210
    b = []
    b.append(txt(20, 44, "THE ADULT SKELETON — 206 BONES", size=30, weight="700"))
    b.append(txt(20, 78, "axial: skull, vertebral column, rib cage   ·   appendicular: limbs and girdles",
                 size=20, fill=MUTED))

    # skull (axial)
    b.append(f'<ellipse cx="270" cy="180" rx="56" ry="66" fill="{BONE}" stroke="{BONE_L}" stroke-width="5"/>')
    b.append(f'<path d="M 234,232 q 36,26 72,0" fill="{BONE}" stroke="{BONE_L}" stroke-width="5"/>')
    # vertebral column (axial)
    b.append(f'<rect x="254" y="252" width="32" height="316" rx="12" fill="{BONE}" stroke="{BONE_L}" stroke-width="5"/>')
    for y in range(268, 556, 24):
        b.append(f'<line x1="256" y1="{y}" x2="284" y2="{y}" stroke="{BONE_L}" stroke-width="3"/>')
    # rib cage (axial): five pairs of ribs
    for y in (300, 344, 388, 432, 476):
        b.append(f'<path d="M 256,{y} C 212,{y+8} 196,{y+44} 218,{y+66}" fill="none" '
                 f'stroke="{BONE_L}" stroke-width="9" stroke-linecap="round"/>')
        b.append(f'<path d="M 284,{y} C 328,{y+8} 344,{y+44} 322,{y+66}" fill="none" '
                 f'stroke="{BONE_L}" stroke-width="9" stroke-linecap="round"/>')
    # shoulder girdle + arms (appendicular)
    b.append(f'<line x1="212" y1="300" x2="328" y2="300" stroke="{APPE_L}" stroke-width="16" stroke-linecap="round"/>')
    b.append(tube("M 206,306 C 182,364 138,404 138,472", APPE_L, "#a5b4fc", 26))
    b.append(tube("M 138,472 C 132,522 126,548 122,584", APPE_L, "#a5b4fc", 20))
    b.append(f'<circle cx="118" cy="606" r="17" fill="{APPE}" stroke="{APPE_L}" stroke-width="4"/>')
    b.append(tube("M 334,306 C 358,364 402,404 402,472", APPE_L, "#a5b4fc", 26))
    b.append(tube("M 402,472 C 408,522 414,548 418,584", APPE_L, "#a5b4fc", 20))
    b.append(f'<circle cx="422" cy="606" r="17" fill="{APPE}" stroke="{APPE_L}" stroke-width="4"/>')
    # hip girdle (appendicular)
    b.append(f'<path d="M 220,596 L 320,596 L 344,660 L 196,660 Z" fill="{APPE}" stroke="{APPE_L}" stroke-width="5"/>')
    # legs (appendicular)
    b.append(tube("M 240,664 C 232,760 230,840 228,912", APPE_L, "#a5b4fc", 30))
    b.append(tube("M 228,912 C 224,984 222,1030 220,1076", APPE_L, "#a5b4fc", 22))
    b.append(f'<path d="M 202,1076 L 248,1076 L 252,1104 L 196,1104 Z" fill="{APPE}" stroke="{APPE_L}" stroke-width="4"/>')
    b.append(tube("M 300,664 C 308,760 310,840 312,912", APPE_L, "#a5b4fc", 30))
    b.append(tube("M 312,912 C 316,984 318,1030 320,1076", APPE_L, "#a5b4fc", 22))
    b.append(f'<path d="M 292,1076 L 338,1076 L 344,1104 L 288,1104 Z" fill="{APPE}" stroke="{APPE_L}" stroke-width="4"/>')

    # numbered badges sit ON the structure they name (no leader lines across the drawing)
    b.append(badge(270, 180, 1))
    b.append(badge(270, 430, 2))
    b.append(badge(210, 400, 3, stroke=BONE_L))
    b.append(badge(122, 470, 4, stroke=APPE_L))
    b.append(badge(270, 628, 5, stroke=APPE_L))

    # ---------------- the numbered key, spelled out in words
    b.append(panel(500, 110, 480, 600, "#f8fafc"))
    b.append(txt(524, 148, "KEY", size=24, weight="700"))
    key = [
        ("1", "skull", "axial · protects the brain"),
        ("2", "vertebral column", "axial · part of the framework"),
        ("3", "rib cage", "axial · protects the heart and lungs"),
        ("4", "limbs (arms and legs)", "appendicular · movement"),
        ("5", "girdles (shoulder and hip)", "appendicular · with the limbs"),
    ]
    y = 202
    for n, name, note in key:
        b.append(badge(548, y, int(n), r=17))
        b.append(txt(586, y - 14, name, size=23, weight="700"))
        b.append(txt(586, y + 16, note, size=19, fill=MUTED))
        y += 100
    b.append(txt(524, 668, "Bones also store the minerals calcium and", size=19, fill=MUTED))
    b.append(txt(524, 694, "phosphorus; the marrow makes blood cells.", size=19, fill=MUTED))

    # ---------------- bone marrow detail
    b.append(panel(500, 730, 480, 350, "#fffbeb", "#fde68a"))
    b.append(txt(524, 770, "BONE MARROW — INSIDE A LONG BONE", size=21, weight="700", fill="#92400e"))
    b.append(f'<path d="M 620,806 C 588,830 588,872 620,896 L 620,1040 C 588,1064 588,1100 622,1112 '
             f'C 660,1124 686,1100 686,1054 L 686,846 C 686,806 664,788 640,792 Z" fill="{BONE}" '
             f'stroke="{BONE_L}" stroke-width="5"/>')
    b.append(f'<path d="M 634,812 C 616,830 616,868 634,890 L 634,1040 C 618,1060 618,1088 640,1098 '
             f'C 660,1104 672,1090 672,1056 L 672,852 C 672,826 662,808 648,810 Z" fill="{PLAT}" '
             f'stroke="{PLAT_L}" stroke-width="3"/>')
    b.append(badge(712, 950, 6, r=17))
    b.append(txt(742, 936, "bone marrow", size=22, weight="700"))
    b.append(txt(742, 966, "makes blood cells", size=19, fill=MUTED))
    b.append(leader(590, 908, 618, 902, color=BONE_L))
    b.append(txt(586, 902, "bone — stores calcium", size=19, anchor="end", fill=MUTED))
    b.append(txt(586, 928, "and phosphorus", size=19, anchor="end", fill=MUTED))

    b.append(panel(20, 1120, 960, 66, PANEL))
    b.append(txt(44, 1153, "The axial skeleton supports and protects; the appendicular skeleton moves the body.", size=20))
    return svg("skel", W, H, "A human skeleton with its axial parts (skull, vertebral column, rib cage) and appendicular parts (limbs and girdles) numbered, beside a key and a section through a long bone showing the bone marrow", "".join(b))


# ---------------------------------------------------------------- 6. joints and muscles
def figure_joints_and_muscles():
    W, H = 1000, 1370
    b = []
    b.append(txt(20, 42, "JOINTS AND MUSCLES", size=28, weight="700"))

    # ---------------- panel A: the two joints the lesson names
    b.append(panel(20, 66, 960, 330, "#f8fafc"))
    b.append(txt(44, 102, "THE TWO JOINTS THE SYLLABUS NAMES", size=22, weight="700"))
    # ball-and-socket: a ball in a cup, free to move in every direction
    b.append(f'<path d="M 120,300 C 150,224 250,224 280,300" fill="none" stroke="{BONE_L}" '
             f'stroke-width="14" stroke-linecap="round"/>')
    b.append(f'<circle cx="200" cy="228" r="50" fill="{BONE}" stroke="{BONE_L}" stroke-width="6"/>')
    b.append(tube("M 200,180 L 200,120", APPE_L, "#a5b4fc", 28))
    b.append(f'<path d="M 98,266 C 74,208 108,152 164,138" fill="none" stroke="{APPE_L}" stroke-width="4" '
             f'marker-end="url(#joint-blue)"/>')
    b.append(f'<path d="M 302,266 C 326,208 292,152 236,138" fill="none" stroke="{APPE_L}" stroke-width="4" '
             f'marker-end="url(#joint-blue)"/>')
    b.append(txt(200, 330, "BALL-AND-SOCKET JOINT", size=22, anchor="middle", weight="700"))
    b.append(txt(200, 360, "shoulder and hip", size=19, anchor="middle", fill=MUTED))
    b.append(txt(200, 386, "movement in many directions", size=19, anchor="middle", fill=MUTED))
    # hinge: two bones meeting at one pivot, swinging one way only
    b.append(f'<path d="M 496,200 C 456,226 456,292 496,318" fill="none" stroke="{BONE_L}" '
             f'stroke-width="4" marker-end="url(#joint-arrow)"/>')
    b.append(tube("M 600,146 L 600,232", BONE_L, BONE, 30))
    b.append(tube("M 600,278 L 600,364", BONE_L, BONE, 30))
    b.append(f'<circle cx="600" cy="255" r="20" fill="#ffffff" stroke="{BONE_L}" stroke-width="6"/>')
    b.append(margin_label(700, 214, 626, 250, "ligament — holds the bones", "start", size=18))
    b.append(txt(700, 240, "together at a joint", size=18, fill=MUTED))
    b.append(txt(600, 330, "HINGE JOINT", size=22, anchor="middle", weight="700"))
    b.append(txt(600, 360, "elbow and knee", size=19, anchor="middle", fill=MUTED))
    b.append(txt(600, 386, "movement in one direction", size=19, anchor="middle", fill=MUTED))

    # ---------------- panel B: the antagonistic pair
    b.append(panel(20, 420, 960, 390, "#fff7ed", "#fed7aa"))
    b.append(txt(44, 456, "AN ANTAGONISTIC PAIR — THE BICEPS AND THE TRICEPS", size=22, weight="700", fill="#9a3412"))

    def arm_state(cx, flexed):
        """One arm: the upper-arm bone, the forearm bent up (flexed) or out straight,
        and the two muscles.  The contracting muscle is drawn short and thick, the
        relaxing one long and thin — a muscle only ever pulls, so one shortens while
        the other lengthens.
        """
        out = []
        out.append(f'<circle cx="{cx}" cy="520" r="16" fill="#ffffff" stroke="{BONE_L}" stroke-width="5"/>')
        out.append(tube(f"M {cx},520 L {cx},650", BONE_L, BONE, 28))
        if flexed:
            out.append(tube(f"M {cx},650 L {cx+170},592", BONE_L, BONE, 24))
        else:
            out.append(tube(f"M {cx},650 L {cx+220},650", BONE_L, BONE, 24))
        for off, short, colour, colour_l in ((-44, flexed, BICEPS, BICEPS_L),
                                             (44, not flexed, TRICEPS, TRICEPS_L)):
            half = 34 if short else 42          # short and thick, or long and thin
            girth = 30 if short else 12
            x = cx + off
            out.append(f'<line x1="{x}" y1="{550-half}" x2="{cx}" y2="524" stroke="{colour_l}" stroke-width="5"/>')
            out.append(f'<line x1="{x}" y1="{550+half}" x2="{cx+14}" y2="644" stroke="{colour_l}" stroke-width="5"/>')
            out.append(f'<g transform="translate({x},550) rotate(90)">'
                       f'<ellipse cx="0" cy="0" rx="{half}" ry="{girth}" fill="{colour}" '
                       f'stroke="{colour_l}" stroke-width="3"/></g>')
        return "".join(out)

    # flexed: the biceps contracts, the triceps relaxes
    b.append(arm_state(230, True))
    b.append(margin_label(120, 480, 172, 512, "biceps", "end", size=20))
    b.append(margin_label(330, 480, 288, 512, "triceps", "start", size=20))
    b.append(txt(230, 700, "the arm BENDS (flexes)", size=22, anchor="middle", weight="700"))
    b.append(txt(230, 728, "biceps contracts (agonist);", size=18, anchor="middle", fill=MUTED))
    b.append(txt(230, 752, "triceps relaxes (antagonist)", size=18, anchor="middle", fill=MUTED))
    # straightened: the triceps contracts, the biceps relaxes
    b.append(arm_state(700, False))
    b.append(margin_label(590, 480, 642, 512, "biceps", "end", size=20))
    b.append(margin_label(800, 480, 758, 512, "triceps", "start", size=20))
    b.append(txt(730, 700, "the arm STRAIGHTENS (extends)", size=22, anchor="middle", weight="700"))
    b.append(txt(730, 728, "triceps contracts (agonist);", size=18, anchor="middle", fill=MUTED))
    b.append(txt(730, 752, "biceps relaxes (antagonist)", size=18, anchor="middle", fill=MUTED))
    # the tendon, drawn where the muscle meets the bone
    b.append(margin_label(150, 618, 202, 599, "tendon", "end", size=19))

    # ---------------- panel C: the three kinds of muscle
    b.append(panel(20, 856, 960, 350, "#f8fafc"))
    b.append(txt(44, 892, "THE THREE KINDS OF MUSCLE", size=22, weight="700"))
    groups = [
        (60, "SKELETAL MUSCLE", "moves the skeleton · voluntary", "striped", True),
        (372, "CARDIAC MUSCLE", "only in the heart · never tires", "striped, branching", True),
        (684, "SMOOTH MUSCLE", "walls of organs · involuntary", "no stripes", False),
    ]
    for x, name, note, shape, striped in groups:
        b.append(panel(x, 916, 260, 264, "#ffffff", PANEL_L, 12))
        b.append(txt(x + 130, 950, name, size=21, anchor="middle", weight="700"))
        cy = 1044
        if shape.startswith("striped, branching"):
            for dx, dy, ln, ang in [(0, 0, 108, 0), (-54, 0, 74, 26), (54, 0, 74, 154)]:
                b.append(f'<g transform="translate({x+130+dx},{cy+dy}) rotate({ang})">'
                         f'<rect x="{-ln/2}" y="-15" width="{ln}" height="30" rx="15" fill="{BICEPS}" '
                         f'stroke="{BICEPS_L}" stroke-width="3"/>'
                         + "".join(f'<line x1="{-ln/2+16+j*20}" y1="-15" x2="{-ln/2+16+j*20}" y2="15" '
                                   f'stroke="{BICEPS_L}" stroke-width="2.5"/>' for j in range(int(ln/20)-1))
                         + '</g>')
        else:
            for i in range(4):
                yy = cy - 54 + i * 34
                col = BICEPS if striped else "#a7f3d0"
                cl = BICEPS_L if striped else "#15803d"
                b.append(f'<rect x="{x+30}" y="{yy}" width="200" height="26" rx="13" fill="{col}" '
                         f'stroke="{cl}" stroke-width="3"/>')
                if striped:
                    for j in range(6):
                        b.append(f'<line x1="{x+48+j*30}" y1="{yy}" x2="{x+48+j*30}" y2="{yy+26}" '
                                 f'stroke="{cl}" stroke-width="2.5"/>')
        b.append(txt(x + 130, 1130, note.split(" · ")[0], size=18, anchor="middle", fill=MUTED))
        b.append(txt(x + 130, 1156, note.split(" · ")[1], size=18, anchor="middle", fill=MUTED))

    b.append(panel(20, 1222, 960, 128, PANEL))
    b.append(txt(44, 1256, "Muscles can only pull, never push — which is why they work in antagonistic pairs:", size=20))
    b.append(txt(44, 1284, "the muscle that contracts is the agonist, and the one that relaxes is the antagonist.", size=20))
    b.append(txt(44, 1312, "A tendon attaches a muscle to a bone; a ligament holds the bones together at a joint.", size=20))
    return svg("joint", W, H, "Panels showing a ball-and-socket and a hinge joint, the biceps and triceps working as an antagonistic pair with their tendons and ligaments, and the three kinds of muscle", "".join(b))


# ---------------------------------------------------------------- checks + write
def check(svg_text, name, w, h):
    """Fail loudly rather than write a broken file (the XML and layout traps)."""
    bad = re.search(r"&(?!(amp|lt|gt|quot|apos|#\d+);)", svg_text)
    if bad:
        raise SystemExit(f"{name}: HTML-only entity in SVG (breaks the whole figure): {bad.group(0)}")
    if "<script" in svg_text or "<image" in svg_text:
        raise SystemExit(f"{name}: script/raster image inside the SVG")
    if not svg_text.rstrip().endswith("</svg>"):
        raise SystemExit(f"{name}: the SVG does not close properly")
    # every text must fit the canvas horizontally
    for m in re.finditer(r'<text x="(-?[\d.]+)"[^>]*font-size="([\d.]+)"[^>]*text-anchor="(\w+)"[^>]*>([^<]*)</text>', svg_text):
        x, size, anchor, body = float(m.group(1)), float(m.group(2)), m.group(3), m.group(4)
        est = 0.56 * size * len(body)
        left = x if anchor == "start" else (x - est / 2 if anchor == "middle" else x - est)
        right = left + est
        if left < 2 or right > w - 2:
            raise SystemExit(f"{name}: text {body!r} overflows the canvas ({left:.0f}..{right:.0f} of {w})")
    return svg_text


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="/tmp/hsb-figs")
    ap.add_argument("--repo", default=".", help="repo root, for the byte-identical heart copy")
    ap.add_argument("--trees", action="store_true", help="also write both content trees")
    a = ap.parse_args()

    outs = [a.out]
    if a.trees:
        outs = ["content/human-social-biology/figures", "public/content/human-social-biology/figures"]
    for d in outs:
        os.makedirs(d, exist_ok=True)

    figures = [
        ("hsb-heart-and-double-circulation.svg", None, 1000, 1270),
        ("hsb-blood-and-gas-exchange.svg", figure_blood_and_gas_exchange(), 1000, 1450),
        ("hsb-plant-and-animal-cell.svg", figure_cell(), 1000, 1245),
        ("hsb-specialised-cells.svg", figure_specialised_cells(), 1000, 760),
        ("hsb-skeleton.svg", figure_skeleton(), 1000, 1210),
        ("hsb-joints-and-muscles.svg", figure_joints_and_muscles(), 1000, 1370),
    ]

    written = {}
    for name, text, w, h in figures:
        if text is None:
            raw = heart_copy(a.repo)
            src = os.path.join(a.repo, BIOLOGY_HEART)
            bio_md5 = hashlib.md5(io.open(src, "rb").read()).hexdigest()
            hsb_md5 = hashlib.md5(raw).hexdigest()
            if bio_md5 != hsb_md5:
                raise SystemExit("heart copy is not byte-identical to Biology's")
            print(f"heart: byte-identical copy of {BIOLOGY_HEART} (md5 {bio_md5})")
            written[name] = raw
            continue
        check(text, name, w, h)
        written[name] = text.encode("utf-8")

    for d in outs:
        for name, raw in written.items():
            with io.open(os.path.join(d, name), "wb") as fh:
                fh.write(raw)
        print(f"wrote {len(written)} figures to {d}")


if __name__ == "__main__":
    main()
