#!/usr/bin/env python3
"""Author the Biology Tier-1 lesson figures (audit §2 #1-#3).

All-original vector diagrams drawn to the vocabulary the three lessons teach on
origin/main (see /home/team/shared/biology-figure-audit.md). No number, size or
magnification appears that the lesson does not itself state; every figure carries
its colour code in words, so nothing depends on colour alone.

The generator of record for these three figures: tools/check-figure-generators.mjs re-runs it
and byte-compares its output against content/biology/figures/ and public/content/biology/figures/.
It carries PR #179's cell fix (the shared animal-cell artwork kept inside the cell membrane), so
it reproduces the committed cell byte for byte. Biology's heart and cell are also the sources
H&SB's and Integrated Science's generators borrow, so a change here must keep those two green.

Writes three SVGs into the directory given by --out, and writes nowhere else.
"""
import argparse
import io
import os

# ---------------------------------------------------------------- shared style

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
ER_C = "#fb923c"; ER_L = "#c2410c"
GOLGI = "#f9a8d4"; GOLGI_L = "#be185d"
LYSO = "#fde68a"; LYSO_L = "#b45309"
CYTO_PLANT = "#eefaf1"
CYTO_ANIMAL = "#fdf2f6"

DEOX = "#93c5fd"; DEOX_L = "#1d4ed8"
OXY = "#fca5a5"; OXY_L = "#b91c1c"
ORGAN = "#fecdd3"; ORGAN_L = "#9f1239"
PYRA = "#fda4af"; PYRA_L = "#be123c"
PELV = "#fef3c7"; PELV_L = "#b45309"
TUBE = "#fdba74"; TUBE_L = "#c2410c"

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


def defs(prefix):
    out = ['<defs>']
    for name, col in [("arrow", MUTED), ("red", OXY_L), ("blue", DEOX_L), ("amber", PELV_L)]:
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
            + defs(prefix) + body + '</svg>')


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


# ---------------------------------------------------------------- 1. the cell

def figure_cell():
    W, H = 1000, 1215
    b = []
    b.append(txt(20, 44, "PLANT CELL", size=30, weight="700", fill="#14532d"))
    b.append(txt(20, 650, "ANIMAL CELL", size=30, weight="700", fill="#9f1239"))

    # ---------------- plant cell (wall 250..700 x 120..510)
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
    # labels — left margin for left-hand structures, right margin for right-hand ones
    b.append(margin_label(240, 188, 262, 190, "cell wall", "end"))
    b.append(txt(240, 214, "(cellulose)", size=19, anchor="end", fill=MUTED))
    b.append(margin_label(240, 300, 272, 300, "cell membrane", "end"))
    b.append(margin_label(240, 250, 276, 250, "chloroplast", "end"))
    b.append(margin_label(240, 355, 300, 355, "cytoplasm", "end"))
    b.append(margin_label(240, 465, 292, 465, "mitochondrion", "end"))
    b.append(margin_label(760, 185, 668, 185, "nucleus", "start"))
    b.append(margin_label(760, 255, 576, 255, "large central vacuole", "start"))
    b.append(margin_label(760, 470, 672, 470, "ribosome", "start"))

    # ---------------- animal cell (irregular outline, x 260..700, y 690..1100)
    blob = ("M 478,690 C 596,684 682,746 696,850 C 708,946 664,1036 582,1076 "
            "C 504,1114 396,1098 326,1034 C 266,978 246,882 260,800 C 276,710 364,696 478,690 Z")
    b.append(f'<path d="{blob}" fill="{CYTO_ANIMAL}" stroke="{MEMB}" stroke-width="6"/>')
    b.append(f'<circle cx="560" cy="800" r="46" fill="{NUC}" stroke="{NUC_L}" stroke-width="4"/>')
    b.append(f'<circle cx="560" cy="800" r="16" fill="{NUC_L}"/>')
    b.append(mitochondrion(336, 772, 100, 48))
    b.append(mitochondrion(352, 1008, 100, 48))
    # endoplasmic reticulum: three folded channels
    for y, col, w in [(722, ER_C, 7), (740, ER_L, 3), (758, ER_C, 7)]:
        b.append(f'<path d="M 356,{y} q 29,10 58,0 q 29,-10 58,0" fill="none" '
                 f'stroke="{col}" stroke-width="{w}"/>')
    for x, y, w in [(568, 962, 88), (572, 984, 80), (576, 1006, 72)]:
        b.append(f'<path d="M {x},{y} q {w/2},-16 {w},0" fill="none" stroke="{GOLGI_L}" '
                 f'stroke-width="9" stroke-linecap="round"/>')
        b.append(f'<path d="M {x},{y} q {w/2},-16 {w},0" fill="none" stroke="{GOLGI}" '
                 f'stroke-width="4" stroke-linecap="round"/>')
    for cx, cy in [(330, 890), (655, 862)]:
        b.append(f'<circle cx="{cx}" cy="{cy}" r="18" fill="{LYSO}" stroke="{LYSO_L}" stroke-width="3"/>')
    b.append(dots([(400, 968), (490, 752), (622, 930), (300, 800), (500, 1052)]))
    b.append(margin_label(240, 700, 310, 734, "cell membrane", "end"))
    b.append(margin_label(240, 760, 356, 758, "endoplasmic reticulum", "end"))
    b.append(margin_label(240, 890, 288, 890, "cytoplasm", "end"))
    b.append(margin_label(240, 1050, 352, 1046, "mitochondrion", "end"))
    b.append(margin_label(760, 800, 608, 800, "nucleus", "start"))
    b.append(margin_label(760, 862, 676, 862, "lysosome", "start"))
    b.append(margin_label(760, 988, 653, 984, "Golgi body", "start"))
    b.append(margin_label(760, 1050, 506, 1052, "ribosome", "start"))

    # ---------------- shared vs plant-only, in words
    b.append(f'<rect x="20" y="1128" width="960" height="72" rx="12" fill="{PANEL}" '
             f'stroke="{PANEL_L}" stroke-width="2"/>')
    b.append(txt(40, 1154, "Both cells have a nucleus, cytoplasm, cell membrane, mitochondria and ribosomes.", size=22))
    b.append(txt(40, 1182, "Plant cells also have a cell wall, chloroplasts and a large central vacuole — animal cells do not.", size=22))
    return svg("cell", W, H, "A labelled plant cell beside a labelled animal cell", "".join(b))


# ---------------------------------------------------------------- 2. the heart

def figure_heart():
    W, H = 1000, 1270
    b = []
    A = "heart"

    # ---- lungs (top): two lobes + a short trachea
    b.append(txt(500, 44, "LUNGS", size=28, weight="700", anchor="middle"))
    b.append(txt(500, 78, "blood picks up oxygen and gives up carbon dioxide", size=19,
                 anchor="middle", fill=MUTED))
    b.append(f'<path d="M 372,140 C 330,108 258,112 232,158 C 202,212 214,300 264,326 '
             f'C 306,348 356,330 372,300 Z" fill="{ORGAN}" stroke="{ORGAN_L}" stroke-width="5"/>')
    b.append(f'<path d="M 628,140 C 670,108 742,112 768,158 C 798,212 786,300 736,326 '
             f'C 694,348 644,330 628,300 Z" fill="{ORGAN}" stroke="{ORGAN_L}" stroke-width="5"/>')

    # ---- vessels (vena cava first so the pulmonary artery reads on top of it)
    b.append(tube("M 300,1006 C 196,860 150,626 246,520 C 280,484 316,468 356,462", DEOX_L, DEOX))
    b.append(tube("M 366,586 C 340,520 322,432 330,336", DEOX_L, DEOX))
    b.append(tube("M 660,336 C 692,382 682,424 640,456", OXY_L, OXY))
    b.append(tube("M 640,586 C 666,522 702,474 762,474 C 830,474 862,532 864,612 "
                  "L 866,930 C 866,974 812,1000 750,1006", OXY_L, OXY))

    # ---- heart body
    b.append('<path d="M 366,412 L 634,412 C 676,412 700,438 700,478 C 706,600 664,742 588,832 '
             'C 548,878 510,906 500,916 C 490,906 452,878 412,832 C 336,742 294,600 300,478 '
             'C 300,438 324,412 366,412 Z" fill="#f8fafc" stroke="#334155" stroke-width="6"/>')
    # chambers
    for x, y, w, h, fill, stroke in [(350, 450, 130, 112, DEOX, DEOX_L),
                                     (520, 450, 130, 112, OXY, OXY_L),
                                     (350, 592, 130, 228, DEOX, DEOX_L),
                                     (520, 592, 130, 228, OXY, OXY_L)]:
        b.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="16" fill="{fill}" '
                 f'stroke="{stroke}" stroke-width="4"/>')
    b.append('<rect x="480" y="450" width="40" height="370" fill="#e2e8f0" stroke="#94a3b8" stroke-width="3"/>')
    # atrio-ventricular valve flaps (named in the lesson copy)
    for cx in (415, 585):
        b.append(f'<path d="M {cx-28},590 L {cx},620 L {cx+28},590" fill="#ffffff" '
                 f'stroke="{MUTED}" stroke-width="3"/>')
    # chamber names
    for x, name, col in [(415, ("RIGHT", "ATRIUM"), "#1e3a8a"), (585, ("LEFT", "ATRIUM"), "#7f1d1d")]:
        b.append(txt(x, 492, name[0], size=23, weight="700", anchor="middle", fill=col))
        b.append(txt(x, 522, name[1], size=23, weight="700", anchor="middle", fill=col))
    for x, name, col in [(415, ("RIGHT", "VENTRICLE"), "#1e3a8a"), (585, ("LEFT", "VENTRICLE"), "#7f1d1d")]:
        b.append(txt(x, 632, name[0], size=23, weight="700", anchor="middle", fill=col))
        b.append(txt(x, 662, name[1], size=23, weight="700", anchor="middle", fill=col))
    # flow arrows inside the ventricles
    for x in (415, 585):
        b.append(f'<line x1="{x}" y1="720" x2="{x}" y2="790" stroke="{MUTED}" '
                 f'stroke-width="4" marker-end="url(#{A}-arrow)"/>')
    # ---- vessel labels
    b.append(margin_label(286, 424, 330, 430, "pulmonary artery", "end"))
    b.append(txt(286, 452, "to the lungs", size=19, anchor="end", fill=MUTED))
    b.append(txt(286, 476, "(deoxygenated)", size=19, anchor="end", fill=DEOX_L))
    b.append(margin_label(180, 700, 190, 700, "vena cava", "end"))
    b.append(txt(180, 728, "from the body", size=19, anchor="end", fill=MUTED))
    b.append(txt(180, 752, "(deoxygenated)", size=19, anchor="end", fill=DEOX_L))
    b.append(margin_label(714, 398, 672, 396, "pulmonary vein", "start"))
    b.append(txt(714, 424, "from the lungs", size=19, fill=MUTED))
    b.append(txt(714, 448, "(oxygenated)", size=19, fill=OXY_L))
    b.append(margin_label(714, 700, 868, 700, "aorta", "start"))
    b.append(txt(714, 728, "to the body", size=19, fill=MUTED))
    b.append(txt(714, 752, "(oxygenated)", size=19, fill=OXY_L))
    b.append(margin_label(286, 566, 405, 600, "valves", "end", size=21))
    b.append(txt(286, 594, "one-way flow", size=19, anchor="end", fill=MUTED))
    # the septum is named from under the apex, so no label crosses a chamber
    b.append(leader(500, 944, 500, 886))
    b.append(txt(500, 962, "septum — keeps the two sides apart", size=19, anchor="middle", fill=MUTED))

    # ---- body (bottom)
    b.append(f'<rect x="300" y="1010" width="460" height="104" rx="18" fill="{PANEL}" '
             f'stroke="#94a3b8" stroke-width="3"/>')
    b.append(txt(530, 1046, "BODY TISSUES AND ORGANS", size=23, weight="700", anchor="middle"))
    b.append(txt(530, 1080, "capillaries deliver oxygen, take up carbon dioxide", size=19,
                 anchor="middle", fill=MUTED))
    b.append(f'<line x1="360" y1="1004" x2="336" y2="976" stroke="{DEOX_L}" stroke-width="6" '
             f'marker-end="url(#{A}-blue)"/>')
    b.append(f'<line x1="806" y1="984" x2="778" y2="1008" stroke="{OXY_L}" stroke-width="6" '
             f'marker-end="url(#{A}-red)"/>')

    # ---- key (colour is always spelt out in words)
    b.append(f'<rect x="20" y="1136" width="960" height="118" rx="12" fill="#f8fafc" '
             f'stroke="{PANEL_L}" stroke-width="2"/>')
    b.append(txt(40, 1164, "Blue = deoxygenated blood.   Red = oxygenated blood.", size=19))
    b.append(txt(40, 1192, "The right side of the heart carries deoxygenated blood; the left side carries oxygenated blood.", size=19))
    b.append(txt(40, 1220, "Path of blood: body → vena cava → right atrium → right ventricle → pulmonary artery → lungs", size=19))
    b.append(txt(40, 1246, "→ pulmonary vein → left atrium → left ventricle → aorta → body", size=19))
    return svg(A, W, H, "The heart and the double circulation through the lungs and the body", "".join(b))


# ---------------------------------------------------------------- 3. the kidney

def figure_kidney():
    W, H = 1000, 1330
    b = []
    A = "kidney"
    b.append(txt(20, 42, "THE KIDNEY AND THE NEPHRON", size=28, weight="700"))

    # ---------------- the kidney in section: bean outline with the hilum on the right
    bean = ("M 320,90 C 410,90 468,150 468,215 C 468,240 445,262 425,278 "
            "C 445,294 468,318 468,352 C 468,430 410,510 320,510 "
            "C 225,510 170,420 170,300 C 170,180 225,90 320,90 Z")
    cortex = ("M 320,140 C 392,140 432,186 432,240 C 432,258 415,272 400,286 "
              "C 415,300 432,314 432,336 C 432,398 392,460 320,460 "
              "C 245,460 208,392 208,300 C 208,208 245,140 320,140 Z")
    b.append(f'<path d="{bean}" fill="{ORGAN}" stroke="{ORGAN_L}" stroke-width="6"/>')
    b.append(f'<path d="{cortex}" fill="none" stroke="#db2777" stroke-width="3"/>')
    # medullary pyramids, apices pointing at the pelvis
    for y1, y2 in [(170, 240), (258, 334), (350, 420)]:
        b.append(f'<path d="M 300,{y1} C 345,{y1+14} 372,258 400,286 C 372,314 345,{y2-14} 300,{y2} Z" '
                 f'fill="{PYRA}" stroke="{PYRA_L}" stroke-width="3"/>')
    # pelvis: the funnel that collects urine from the pyramids
    b.append(f'<path d="M 400,252 C 428,266 448,278 456,288 C 448,298 428,310 400,324 '
             f'C 412,288 412,288 400,252 Z" fill="{PELV}" stroke="{PELV_L}" stroke-width="3"/>')
    # renal artery in, renal vein out — both through the hilum
    b.append(tube("M 700,236 C 640,240 560,244 470,250", ORGAN_L, OXY, 34))
    b.append(tube("M 700,348 C 640,344 560,340 470,334", ORGAN_L, DEOX, 34))
    b.append(f'<line x1="556" y1="248" x2="512" y2="251" stroke="{OXY_L}" stroke-width="4" '
             f'marker-end="url(#{A}-red)"/>')
    b.append(f'<line x1="512" y1="337" x2="556" y2="340" stroke="{DEOX_L}" stroke-width="4" '
             f'marker-end="url(#{A}-blue)"/>')
    # ureter carries urine away from the pelvis
    b.append(tube("M 446,308 C 470,380 476,470 478,548 C 479,584 480,604 481,624", PELV_L, PELV, 26))
    b.append(margin_label(110, 180, 254, 186, "cortex", "end"))
    b.append(margin_label(110, 300, 330, 300, "medulla", "end"))
    b.append(margin_label(716, 236, 690, 236, "renal artery", "start"))
    b.append(txt(716, 264, "blood in", size=19, fill=MUTED))
    b.append(margin_label(716, 348, 690, 348, "renal vein", "start"))
    b.append(txt(716, 376, "blood out", size=19, fill=MUTED))
    b.append(margin_label(560, 288, 460, 288, "renal pelvis", "start"))
    b.append(margin_label(620, 560, 486, 560, "ureter", "start"))
    b.append(txt(620, 588, "urine to the bladder", size=19, fill=MUTED))

    # ---------------- one nephron (panel y 660..1180)
    b.append(f'<rect x="40" y="660" width="920" height="520" rx="14" fill="#fff7ed" '
             f'stroke="#fdba74" stroke-width="2"/>')
    b.append(txt(950, 694, "One nephron — a kidney has many; drawn much larger than life",
                 size=20, fill=MUTED, anchor="end"))
    # the tubule first: the capsule then covers where it starts, as in the real organ
    tub = ("M 230,834 C 300,880 340,800 386,846 C 424,884 460,806 502,850 "
           "C 532,880 556,878 572,858")
    b.append(f'<path d="{tub}" fill="none" stroke="{TUBE_L}" stroke-width="20" stroke-linecap="round"/>')
    b.append(f'<path d="{tub}" fill="none" stroke="{TUBE}" stroke-width="12" stroke-linecap="round"/>')
    loop = ("M 572,858 C 594,896 592,960 586,1016 C 582,1058 620,1066 644,1030 "
            "C 662,1004 670,950 674,898 C 676,870 686,856 700,846")
    b.append(f'<path d="{loop}" fill="none" stroke="{TUBE_L}" stroke-width="20" stroke-linecap="round"/>')
    b.append(f'<path d="{loop}" fill="none" stroke="{TUBE}" stroke-width="12" stroke-linecap="round"/>')
    dist = "M 700,846 C 726,838 744,862 770,860 C 792,858 798,884 798,910"
    b.append(f'<path d="{dist}" fill="none" stroke="{TUBE_L}" stroke-width="20" stroke-linecap="round"/>')
    b.append(f'<path d="{dist}" fill="none" stroke="{TUBE}" stroke-width="12" stroke-linecap="round"/>')
    b.append(f'<path d="M 798,912 L 798,1140" fill="none" stroke="{TUBE_L}" stroke-width="26" stroke-linecap="round"/>')
    b.append(f'<path d="M 798,912 L 798,1140" fill="none" stroke="{PELV}" stroke-width="16" stroke-linecap="round"/>')
    b.append(f'<line x1="798" y1="1058" x2="798" y2="1130" stroke="{PELV_L}" stroke-width="4" '
             f'marker-end="url(#{A}-amber)"/>')
    # blood in and out of the glomerulus
    b.append(f'<path d="M 60,788 C 108,792 132,798 148,804" fill="none" stroke="{OXY_L}" '
             f'stroke-width="11" stroke-linecap="round"/>')
    b.append(f'<path d="M 148,858 C 116,874 92,884 60,890" fill="none" stroke="{DEOX_L}" '
             f'stroke-width="11" stroke-linecap="round"/>')
    # Bowman's capsule with the glomerulus inside it
    b.append(f'<circle cx="196" cy="812" r="64" fill="#ffffff" stroke="{TUBE_L}" stroke-width="5"/>')
    b.append(f'<ellipse cx="196" cy="812" rx="42" ry="38" fill="{OXY}" stroke="{OXY_L}" stroke-width="4"/>')
    b.append(f'<path d="M 164,798 C 190,776 226,782 234,808 C 242,834 216,854 192,846" '
             f'fill="none" stroke="{OXY_L}" stroke-width="5"/>')
    b.append(f'<path d="M 168,830 C 184,850 218,852 232,834" fill="none" stroke="{OXY_L}" stroke-width="5"/>')
    b.append(f'<line x1="232" y1="884" x2="252" y2="908" stroke="{TUBE_L}" stroke-width="3" '
             f'marker-end="url(#{A}-amber)"/>')
    # capillary alongside the tubule: reabsorption returns, secretion adds
    b.append(f'<path d="M 300,978 C 400,972 520,978 660,972" fill="none" stroke="{OXY_L}" '
             f'stroke-width="16" stroke-linecap="round"/>')
    b.append(f'<path d="M 300,978 C 400,972 520,978 660,972" fill="none" stroke="{OXY}" '
             f'stroke-width="9" stroke-linecap="round"/>')
    for x in (352, 466, 580):
        b.append(f'<line x1="{x}" y1="934" x2="{x}" y2="966" stroke="{OXY_L}" stroke-width="3" '
                 f'marker-end="url(#{A}-red)"/>')
    b.append(f'<line x1="640" y1="970" x2="640" y2="938" stroke="{OXY_L}" stroke-width="3" '
             f'marker-end="url(#{A}-red)"/>')
    # labels
    b.append(margin_label(60, 712, 168, 790, "glomerulus", "start", size=21))
    b.append(txt(60, 738, "a knot of capillaries", size=18, fill=MUTED))
    b.append(txt(300, 940, "filtration", size=18, anchor="start", fill=MUTED))
    b.append(margin_label(60, 912, 170, 866, "Bowman's capsule", "start", size=21))
    b.append(margin_label(452, 790, 420, 862, "proximal tubule", "start", size=21))
    b.append(margin_label(560, 1094, 600, 1058, "loop of Henle", "end", size=21))
    b.append(margin_label(816, 1000, 802, 1000, "collecting duct", "start", size=21))
    b.append(txt(816, 1028, "urine → pelvis", size=18, fill=MUTED))
    b.append(margin_label(220, 978, 300, 978, "capillary", "end", size=21))
    b.append(txt(470, 1004, "reabsorption ↓", size=18, anchor="middle", fill=OXY_L))
    b.append(txt(470, 1028, "into the blood", size=18, anchor="middle", fill=MUTED))
    b.append(txt(790, 1004, "secretion ↑", size=18, anchor="end", fill=OXY_L))
    b.append(txt(790, 1028, "into the tubule", size=18, anchor="end", fill=MUTED))

    # ---------------- the path of urine
    b.append(f'<rect x="40" y="1220" width="920" height="66" rx="12" fill="{PANEL}" '
             f'stroke="{PANEL_L}" stroke-width="2"/>')
    b.append(txt(60, 1252, "Urine path:  kidney  →  ureter  →  bladder  →  urethra (leaves the body)", size=22))
    return svg(A, W, H, "A kidney in section beside one nephron, showing filtration, reabsorption and the path of urine", "".join(b))


def check(text, name, w, h):
    """Structural self-check: well-formed envelope, the declared canvas, no raster and no
    animation. Correctness of the drawing is NOT proven here (see the harness header)."""
    if not text.startswith("<svg ") or not text.endswith("</svg>"):
        raise SystemExit(f"{name}: not a single well-formed <svg> element")
    if f'viewBox="0 0 {w} {h}"' not in text:
        raise SystemExit(f"{name}: viewBox is not 0 0 {w} {h}")
    for banned in ("<image", "xlink:href", "<animate", "data:image"):
        if banned in text:
            raise SystemExit(f"{name}: contains {banned} — figures are original vector SVG only")


def main():
    ap = argparse.ArgumentParser(
        description="Write Biology's three lesson figures into an explicit --out directory.")
    ap.add_argument("--out", required=True,
                    help="directory to write the SVGs into; the only place this script writes")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    figures = [("plant-and-animal-cell.svg", figure_cell(), 1000, 1215),
               ("heart-and-double-circulation.svg", figure_heart(), 1000, 1270),
               ("kidney-and-nephron.svg", figure_kidney(), 1000, 1330)]
    written = {}
    for name, text, w, h in figures:
        check(text, name, w, h)
        written[name] = text.encode("utf-8")
    for name, raw in written.items():
        with io.open(os.path.join(a.out, name), "wb") as fh:
            fh.write(raw)
    print(f"wrote {len(written)} figures to {a.out}")


if __name__ == "__main__":
    main()
