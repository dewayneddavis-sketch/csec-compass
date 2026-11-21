#!/usr/bin/env python3
"""Author the Biology lesson figures.

The first three (audit §2 #1-#3) are unchanged and still reproduce byte for byte. PR A of
/home/team/shared/biology-figures-brief.md added five more, in the brief's order 0-4:
levels-of-organisation, leaf-cross-section, elbow-antagonistic-pair,
nitrogen-cycle-and-carbon-returns and reflex-arc-and-accommodation. Every word any of the eight
prints is checked against its own lesson's copy by tools/check-biology-figure-labels.mjs.

All-original vector diagrams drawn to the vocabulary the three lessons teach on
origin/main (see /home/team/shared/biology-figure-audit.md). No number, size or
magnification appears that the lesson does not itself state; every figure carries
its colour code in words, so nothing depends on colour alone.

The generator of record for these three figures: tools/check-figure-generators.mjs re-runs it
and byte-compares its output against content/biology/figures/ and public/content/biology/figures/.
It carries PR #179's cell fix (the shared animal-cell artwork kept inside the cell membrane), so
it reproduces the committed cell byte for byte. Biology's heart and cell are also the sources
H&SB's and Integrated Science's generators borrow, so a change here must keep those two green.

Writes every figure listed in main()'s FIGURES table into the directory given by --out, and
writes nowhere else. The count is not written down here, because a number in a docstring
goes stale the moment a figure is added: the table is the list.
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

# A contracted muscle reads as short, fat and strongly outlined; a relaxed one as long, thin and
# pale. The elbow figure uses these so the state is visible, not only written.
MUSC_FAT = "#fda4af"; MUSC_LINE = "#9f1239"
MUSC_PALE = "#fee2e2"; MUSC_SOFT = "#fda4af"


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def txt(x, y, s, size=24, anchor="start", fill=INK, weight="400"):
    return (f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" '
            f'text-anchor="{anchor}" fill="{fill}" font-weight="{weight}" '
            f'dominant-baseline="middle">{esc(s)}</text>')


def leader(x1, y1, x2, y2, w=2, color=LINE):
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" '
            f'stroke-width="{w}"/><circle cx="{x2}" cy="{y2}" r="4.5" fill="{color}"/>')


def margin_label(x, y, ax, ay, s, anchor, size=22, fill=INK, lead=None):
    # `lead` is the x the leader starts at. The default puts it 6px from the label's
    # anchor, which is inside the word when the word is wider than 6px — a leader that
    # strikes through its own label. A caller that knows the text's extent passes the
    # point just clear of it instead.
    lx = (x + (6 if anchor == "start" else -6)) if lead is None else lead
    return txt(x, y, s, size=size, anchor=anchor, fill=fill) + leader(lx, y, ax, ay)


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


# ---------------------------------------------------------------- shared shape helpers
# Added with the PR A figures (0-4 of /home/team/shared/biology-figures-brief.md). The three
# figures above are untouched: adding helpers cannot change their output.

def box(x, y, w, h, fill, stroke, rx=12, sw=3):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" '
            f'stroke="{stroke}" stroke-width="{sw}"/>')


def line_arrow(x1, y1, x2, y2, prefix, name="arrow", colour=MUTED, w=4):
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{colour}" '
            f'stroke-width="{w}" marker-end="url(#{prefix}-{name})"/>')


def bone(x1, y1, x2, y2, w=22):
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#94a3b8" '
            f'stroke-width="{w+8}" stroke-linecap="round"/>'
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#f8fafc" '
            f'stroke-width="{w}" stroke-linecap="round"/>')


def strap(x1, y1, x2, y2, w=10):
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#64748b" '
            f'stroke-width="{w+6}" stroke-linecap="round"/>'
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#ffffff" '
            f'stroke-width="{w}" stroke-linecap="round"/>')


def text_lines(x, y, rows, size=15, fill=MUTED, anchor="middle", lh=None):
    lh = size + 6 if lh is None else lh
    return "".join(txt(x, y + i * lh, s, size=size, anchor=anchor, fill=fill)
                   for i, s in enumerate(rows))


def stacked_label(x, y, ax, ay, rows, anchor, size=19, fill=INK, lead=None):
    out = txt(x, y, rows[0], size=size, anchor=anchor, fill=fill)
    for i, s in enumerate(rows[1:], start=1):
        out += txt(x, y + i * (size + 5), s, size=size, anchor=anchor, fill=fill)
    lx = (x + (8 if anchor == "start" else -8)) if lead is None else lead
    return out + leader(lx, y, ax, ay)


def spindle(cx, cy, half=70, ry=21, fill=ORGAN, stroke=ORGAN_L):
    return (f'<path d="M {cx-half},{cy} C {cx-half/2},{cy-ry} {cx+half/2},{cy-ry} {cx+half},{cy} '
            f'C {cx+half/2},{cy+ry} {cx-half/2},{cy+ry} {cx-half},{cy} Z" fill="{fill}" '
            f'stroke="{stroke}" stroke-width="3"/>')


def rotated(x, y, s, size=17, fill=MUTED, angle=-90):
    return (f'<text x="{x}" y="{y}" transform="rotate({angle} {x} {y})" font-family="{FONT}" '
            f'font-size="{size}" text-anchor="middle" fill="{fill}" '
            f'dominant-baseline="middle">{esc(s)}</text>')


# ---------------------------------------------------------------- 4. levels of organisation
# The sentence in bio-cell-levels-of-organisation says "The labelled diagram below reads from the
# smallest level to the largest, and every label is given". This is that diagram, and every label
# is the sentence's own wording — nothing here is a word the lesson does not print.

def figure_levels():
    W, H = 1000, 700
    A = "levels"
    b = []
    b.append(txt(500, 44, "THE FIVE LEVELS OF ORGANISATION", size=28, weight="700", anchor="middle"))
    b.append(txt(500, 80, "from the smallest level to the largest", size=21, anchor="middle", fill=MUTED))
    b.append(f'<line x1="60" y1="118" x2="930" y2="118" stroke="{MUTED}" stroke-width="3" '
             f'marker-end="url(#{A}-arrow)"/>')
    b.append(txt(60, 146, "smallest level", size=19, fill=MUTED))
    b.append(txt(930, 146, "largest level", size=19, anchor="end", fill=MUTED))

    X = [20, 216, 412, 608, 804]
    names = ["CELL", "TISSUE", "ORGAN", "ORGAN SYSTEM", "ORGANISM"]
    desc = [["one muscle cell"],
            ["muscle tissue,", "many muscle cells", "working together"],
            ["the stomach,", "muscle tissue plus", "lining tissue and", "gland tissue"],
            ["the digestive", "system, the stomach", "plus the intestines", "and the glands that", "feed it"],
            ["the human being"]]
    for x0 in X:
        b.append(box(x0, 168, 176, 240, PANEL, PANEL_L, rx=14, sw=2))

    # 1. cell — one muscle cell
    x0 = X[0]
    b.append(spindle(x0 + 88, 288, half=72, ry=22))
    b.append(f'<ellipse cx="{x0+88}" cy="288" rx="17" ry="12" fill="{NUC}" '
             f'stroke="{NUC_L}" stroke-width="3"/>')

    # 2. tissue — many muscle cells working together
    x0 = X[1]
    for cy in (252, 288, 324):
        b.append(spindle(x0 + 88, cy, half=70, ry=16))
        b.append(f'<ellipse cx="{x0+88}" cy="{cy}" rx="13" ry="9" fill="{NUC}" '
                 f'stroke="{NUC_L}" stroke-width="2.5"/>')

    # 3. organ — the stomach: muscle tissue plus lining tissue and gland tissue
    x0 = X[2]
    b.append(f'<path d="M {x0+66},206 C {x0+126},214 {x0+144},258 {x0+128},294 '
             f'C {x0+112},328 {x0+72},338 {x0+44},318 C {x0+74},306 {x0+96},288 {x0+90},256 '
             f'C {x0+86},232 {x0+72},214 {x0+66},206 Z" fill="{ORGAN}" '
             f'stroke="{ORGAN_L}" stroke-width="3"/>')
    b.append(f'<path d="M {x0+76},220 C {x0+120},232 {x0+132},266 {x0+118},296" fill="none" '
             f'stroke="{ORGAN_L}" stroke-width="2" stroke-dasharray="7 5"/>')
    b.append(dots([(x0+100, 250), (x0+110, 270), (x0+104, 290)], r=4, fill=LYSO_L))

    # 4. organ system — the digestive system
    x0 = X[3]
    b.append(f'<path d="M {x0+40},192 C {x0+78},198 {x0+92},224 {x0+84},248 '
             f'C {x0+76},270 {x0+50},276 {x0+32},264 C {x0+50},256 {x0+60},244 {x0+56},226 '
             f'C {x0+54},212 {x0+44},200 {x0+40},192 Z" fill="{ORGAN}" '
             f'stroke="{ORGAN_L}" stroke-width="3"/>')
    b.append(f'<circle cx="{x0+120}" cy="212" r="13" fill="{LYSO}" stroke="{LYSO_L}" stroke-width="3"/>')
    b.append(f'<circle cx="{x0+136}" cy="240" r="10" fill="{LYSO}" stroke="{LYSO_L}" stroke-width="3"/>')
    coil = (f'M {x0+54},272 C {x0+94},266 {x0+126},276 {x0+130},296 '
            f'C {x0+132},316 {x0+104},326 {x0+72},320 '
            f'C {x0+40},314 {x0+28},300 {x0+34},284')
    b.append(f'<path d="{coil}" fill="none" stroke="{TUBE_L}" stroke-width="11" stroke-linecap="round"/>')
    b.append(f'<path d="{coil}" fill="none" stroke="{TUBE}" stroke-width="5" stroke-linecap="round"/>')

    # 5. organism — the human being
    x0 = X[4]
    b.append(f'<circle cx="{x0+88}" cy="212" r="21" fill="{ORGAN}" stroke="{ORGAN_L}" stroke-width="3"/>')
    b.append(f'<line x1="{x0+88}" y1="236" x2="{x0+88}" y2="316" stroke="{ORGAN_L}" '
             f'stroke-width="8" stroke-linecap="round"/>')
    b.append(f'<line x1="{x0+88}" y1="254" x2="{x0+50}" y2="296" stroke="{ORGAN_L}" '
             f'stroke-width="7" stroke-linecap="round"/>')
    b.append(f'<line x1="{x0+88}" y1="254" x2="{x0+126}" y2="296" stroke="{ORGAN_L}" '
             f'stroke-width="7" stroke-linecap="round"/>')
    b.append(f'<line x1="{x0+88}" y1="316" x2="{x0+62}" y2="374" stroke="{ORGAN_L}" '
             f'stroke-width="7" stroke-linecap="round"/>')
    b.append(f'<line x1="{x0+88}" y1="316" x2="{x0+114}" y2="374" stroke="{ORGAN_L}" '
             f'stroke-width="7" stroke-linecap="round"/>')

    for i, x0 in enumerate(X):
        b.append(txt(x0 + 88, 434, names[i], size=21, weight="700", anchor="middle"))
        b.append(text_lines(x0 + 88, 466, desc[i], size=15, fill=MUTED, anchor="middle"))

    b.append(box(20, 596, 960, 82, PANEL, PANEL_L, rx=12, sw=2))
    b.append(txt(500, 622, "An organism is not a loose bag of cells: it is five levels of organisation.",
                 size=20, anchor="middle"))
    b.append(txt(500, 652, "Each level is built from the one before it.", size=19,
                 anchor="middle", fill=MUTED))
    return svg(A, W, H, "The five levels of organisation from one muscle cell to the human being",
               "".join(b))


# ---------------------------------------------------------------- 5. leaf cross-section

def figure_leaf():
    W, H = 1000, 830
    A = "leaf"
    b = []
    b.append(txt(500, 42, "A LEAF IN CROSS-SECTION", size=28, weight="700", anchor="middle"))
    b.append(txt(500, 74, "from the upper surface down", size=20, anchor="middle", fill=MUTED))

    X0, X1 = 210, 880
    # cuticle — a thin waxy waterproof layer over the upper surface
    b.append(f'<rect x="{X0}" y="150" width="{X1-X0}" height="11" rx="5" fill="#fde68a" '
             f'stroke="#b45309" stroke-width="2"/>')
    # upper epidermis — one transparent cell thick, no chloroplasts
    for i in range(9):
        b.append(box(X0 + i * 74, 166, 72, 52, "#e0f2fe", "#0284c7", rx=7, sw=2))
    # palisade mesophyll — tall, closely packed cells full of chloroplasts
    for i in range(11):
        cx = X0 + i * 60
        b.append(box(cx, 222, 56, 150, "#dcfce7", WALL, rx=8, sw=2.5))
        for dy in (28, 60, 92, 124):
            b.append(chloroplast(cx + 28, 222 + dy, rx=13, ry=8))
    # spongy mesophyll — rounded cells with large air spaces between them
    for cx in (240, 320, 400, 690, 770, 850):
        for cy in (404, 452):
            b.append(f'<circle cx="{cx}" cy="{cy}" r="22" fill="#dcfce7" stroke="{WALL}" '
                     f'stroke-width="2.5"/>')
    # vascular bundle — xylem above, phloem below
    b.append(f'<ellipse cx="545" cy="428" rx="96" ry="52" fill="#fef3c7" stroke="#b45309" '
             f'stroke-width="3"/>')
    for cx in (507, 545, 583):
        b.append(f'<circle cx="{cx}" cy="408" r="15" fill="{DEOX}" stroke="{DEOX_L}" '
                 f'stroke-width="2.5"/>')
    for cx in (507, 545, 583):
        b.append(f'<circle cx="{cx}" cy="450" r="14" fill="{ER_C}" stroke="{ER_L}" '
                 f'stroke-width="2.5"/>')
    # lower epidermis, pierced by a stoma between two guard cells
    for i in range(9):
        if i == 5:
            continue
        b.append(box(X0 + i * 74, 492, 72, 50, "#e0f2fe", "#0284c7", rx=7, sw=2))
    b.append(f'<path d="M 584,494 C 572,510 572,526 584,542 L 612,542 '
             f'C 604,526 604,510 612,494 Z" fill="#bbf7d0" stroke="{WALL}" stroke-width="2.5"/>')
    b.append(f'<path d="M 648,494 C 656,510 656,526 648,542 L 620,542 '
             f'C 628,526 628,510 620,494 Z" fill="#bbf7d0" stroke="{WALL}" stroke-width="2.5"/>')

    # light reaching the palisade layer through the transparent layers above it
    for x in (300, 545, 790):
        b.append(line_arrow(x, 86, x, 210, A, "amber", PELV_L, 5))
    b.append(txt(278, 112, "light", size=22, anchor="end", fill=PELV_L))
    # gases through the one stoma
    b.append(line_arrow(610, 706, 610, 548, A, "arrow", MUTED, 4))
    b.append(line_arrow(624, 548, 624, 706, A, "arrow", MUTED, 4))
    b.append(txt(690, 640, "carbon dioxide in", size=20, fill=MUTED))
    b.append(txt(690, 672, "oxygen and water vapour out", size=20, fill=MUTED))

    # labels — every one is a word this lesson prints
    b.append(stacked_label(200, 146, 212, 156, ["cuticle"], "end"))
    b.append(stacked_label(200, 200, 212, 194, ["upper", "epidermis"], "end"))
    b.append(stacked_label(200, 286, 214, 286, ["palisade", "mesophyll"], "end"))
    b.append(stacked_label(200, 352, 258, 318, ["chloroplasts"], "end"))
    b.append(stacked_label(200, 424, 218, 428, ["air", "spaces"], "end"))
    b.append(stacked_label(200, 516, 214, 517, ["lower", "epidermis"], "end"))
    b.append(stacked_label(890, 336, 640, 414, ["vascular", "bundle"], "start"))
    b.append(stacked_label(890, 396, 583, 408, ["xylem"], "start"))
    b.append(stacked_label(890, 440, 583, 450, ["phloem"], "start"))
    b.append(stacked_label(890, 486, 770, 452, ["spongy", "mesophyll"], "start"))
    b.append(stacked_label(890, 540, 616, 520, ["stomata"], "start"))
    b.append(stacked_label(890, 584, 604, 522, ["guard", "cells"], "start"))

    b.append(box(20, 724, 960, 76, PANEL, PANEL_L, rx=12, sw=2))
    b.append(txt(40, 750, "The air spaces let carbon dioxide diffuse quickly to every cell, "
                          "and oxygen diffuse back out.", size=20))
    b.append(txt(40, 780, "Xylem carries water and mineral ions up from the roots; "
                          "phloem carries the glucose away.", size=19, fill=MUTED))
    return svg(A, W, H, "A leaf in cross-section from the cuticle down to the stomata, with the "
                        "gases and the vascular bundle labelled", "".join(b))


# ---------------------------------------------------------------- 6. the elbow

def figure_elbow():
    W, H = 1000, 880
    A = "elbow"
    b = []
    b.append(txt(500, 44, "THE ELBOW: AN ANTAGONISTIC PAIR", size=28, weight="700", anchor="middle"))

    def panel(dx, flexed):
        out = []
        x = lambda v: v + dx
        out.append(box(x(20), 90, 470, 510, "#f8fafc", PANEL_L, rx=14, sw=2))
        out.append(txt(x(255), 130, "TO FLEX" if flexed else "TO EXTEND", size=24,
                       weight="700", anchor="middle"))
        # humerus, and the hinge joint it makes with the forearm
        out.append(bone(x(90), 300, x(350), 300, 22))
        out.append(f'<circle cx="{x(365)}" cy="300" r="17" fill="#f8fafc" stroke="{MUTED}" '
                   f'stroke-width="4"/>')
        if flexed:
            out.append(bone(x(374), 294, x(464), 174, 18))   # radius
            out.append(bone(x(356), 306, x(446), 186, 18))   # ulna
        else:
            out.append(bone(x(374), 294, x(464), 424, 18))
            out.append(bone(x(356), 306, x(446), 436, 18))
        # the two muscles of the pair. A CONTRACTED muscle is short, fat and strongly outlined; a
        # relaxed one is long, thin and pale, so the picture says which one is working without a
        # word — the words are there too.
        muscle = lambda cy, rx, ry, contracted: (
            f'<ellipse cx="{x(215)}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{MUSC_FAT if contracted else MUSC_PALE}" '
            f'stroke="{MUSC_LINE if contracted else MUSC_SOFT}" '
            f'stroke-width="{3.5 if contracted else 2}"/>')
        if flexed:
            out.append(muscle(262, 88, 26, True))    # biceps contracts
            out.append(muscle(340, 112, 16, False))  # triceps relaxes
        else:
            out.append(muscle(262, 112, 16, False))  # biceps relaxes
            out.append(muscle(340, 88, 26, True))    # triceps contracts
        # tendons: muscle to bone
        out.append(strap(x(128), 262, x(96), 286))
        out.append(strap(x(302), 262, x(378), 290))
        out.append(strap(x(104), 340, x(92), 318))
        out.append(strap(x(326), 340, x(368), 322))
        # ligament: bone to bone, across the joint
        out.append(strap(x(384), 310, x(410), 332, 8))
        out.append(txt(x(200), 300, "humerus", size=18, weight="700", anchor="middle"))
        if flexed:
            out.append(txt(x(215), 224, "biceps contracts", size=17, anchor="middle", fill=OXY_L))
            out.append(txt(x(215), 378, "triceps relaxes", size=17, anchor="middle", fill=MUTED))
        else:
            out.append(txt(x(215), 224, "biceps relaxes", size=17, anchor="middle", fill=MUTED))
            out.append(txt(x(215), 378, "triceps contracts", size=17, anchor="middle", fill=OXY_L))
        return "".join(out)

    b.append(panel(0, True))
    b.append(panel(490, False))

    # labels on panel A only where the space is: the pair is drawn twice, the parts named once
    b.append(margin_label(470, 160, 460, 190, "radius", "end", size=19))
    b.append(margin_label(430, 140, 444, 176, "ulna", "end", size=19))
    b.append(margin_label(60, 240, 100, 278, "tendon", "start", size=19))
    b.append(margin_label(432, 400, 406, 330, "ligament", "end", size=19))
    b.append(margin_label(365, 470, 365, 322, "hinge joint", "middle", size=19))
    b.append(margin_label(900, 250, 852, 288, "tendon", "start", size=19))

    b.append(box(20, 630, 960, 210, PANEL, PANEL_L, rx=12, sw=2))
    b.append(txt(40, 662, "An antagonistic pair: one muscle contracts while the other relaxes.",
                 size=21))
    b.append(txt(40, 698, "A muscle can only pull, so the elbow needs two muscles, "
                          "one pulling each way.", size=21))
    b.append(txt(40, 734, "A tendon joins muscle to bone; a ligament joins bone to bone.",
                 size=21))
    b.append(txt(40, 770, "A hinge joint moves in one plane only.", size=21))
    b.append(txt(40, 804, "The upper arm has one bone, the humerus; the forearm has two, "
                          "the radius and the ulna.", size=19, fill=MUTED))
    return svg(A, W, H, "The elbow flexed and extended, showing the biceps and the triceps as an "
                        "antagonistic pair with their tendons and the ligament of the joint",
               "".join(b))


# ---------------------------------------------------------------- 7. the nitrogen cycle

def figure_cycles():
    W, H = 1000, 1060
    A = "ncycle"
    b = []
    b.append(txt(20, 42, "THE NITROGEN CYCLE", size=28, weight="700"))
    b.append(txt(20, 74, "the air, the soil, the plants and the animals, and back to the air",
                 size=19, fill=MUTED))

    nodes = [(90, 100, "nitrogen gas", ["most of the air"]),
             (230, 120, "nitrogen fixation", ["Rhizobium, in the root", "nodules of legumes"]),
             (390, 80, "ammonium compounds", []),
             (510, 120, "nitrifying bacteria", ["nitrites, then nitrates"]),
             (670, 120, "assimilation", ["nitrates into amino acids", "and proteins, then the",
                                         "animals that eat the plant"]),
             (830, 120, "decomposers", ["decomposition of dead", "plants, dead animals",
                                        "and animal waste"])]
    for y, h, name, rows in nodes:
        b.append(box(170, y, 300, h, "#f0fdf4", WALL, rx=12, sw=2.5))
        b.append(txt(320, y + 30, name, size=20, weight="700", anchor="middle"))
        if rows:
            b.append(text_lines(320, y + 58, rows, size=15, fill=MUTED, anchor="middle", lh=19))
    for y1, y2 in [(190, 226), (350, 386), (470, 506), (630, 666), (790, 826)]:
        b.append(line_arrow(320, y1, 320, y2 - 4, A, "arrow"))

    # decomposition hands the nitrogen compounds back to the soil
    b.append(f'<path d="M 170,890 L 100,890 L 100,430 L 164,430" fill="none" stroke="{OXY_L}" '
             f'stroke-width="4" marker-end="url(#{A}-red)"/>')
    b.append(rotated(76, 660, "decomposition returns ammonium compounds to the soil", size=17,
                     fill=OXY_L))

    # denitrifying bacteria close the loop back to the air
    b.append(box(500, 560, 140, 130, "#fee2e2", OXY_L, rx=10, sw=3))
    b.append(text_lines(570, 592, ["denitrifying", "bacteria"], size=17, fill=INK, lh=22))
    b.append(text_lines(570, 640, ["change nitrates", "back into", "nitrogen gas"], size=14, lh=18))
    b.append(line_arrow(470, 575, 496, 604, A, "arrow"))
    b.append(f'<path d="M 570,560 L 570,140 L 474,140" fill="none" stroke="{MUTED}" '
             f'stroke-width="4" marker-end="url(#{A}-arrow)"/>')

    # the carbon cycle's four returns, beside it
    b.append(box(660, 90, 320, 600, "#f0fdf4", WALL, rx=14, sw=2))
    b.append(txt(820, 122, "the carbon cycle", size=22, weight="700", anchor="middle"))
    b.append(txt(820, 152, "matter is recycled", size=17, anchor="middle", fill=MUTED))
    rows = [("photosynthesis", "removes carbon dioxide"),
            ("respiration", "returns it"),
            ("combustion", "returns it"),
            ("decomposition", "returns it")]
    for i, (name, detail) in enumerate(rows):
        y = 180 + i * 110
        b.append(box(675, y, 290, 92, "#ffffff", WALL, rx=10, sw=2))
        b.append(txt(820, y + 32, name, size=19, weight="700", anchor="middle"))
        b.append(txt(820, y + 62, detail, size=15, anchor="middle", fill=MUTED))
    b.append(text_lines(820, 652, ["Fossil fuels store carbon", "until they are burned"],
                        size=14, anchor="middle", lh=20))

    b.append(box(20, 970, 960, 66, PANEL, PANEL_L, rx=12, sw=2))
    b.append(txt(500, 1003, "Energy flows in one direction; matter is recycled.", size=20,
                 anchor="middle"))
    return svg(A, W, H, "The nitrogen cycle as a closed loop, with the carbon cycle's four "
                        "returns beside it", "".join(b))


# ---------------------------------------------------------------- 8. reflex arc and the eye

def figure_reflex():
    W, H = 1000, 1120
    A = "reflex"
    b = []

    # ---- panel A: the reflex arc
    b.append(box(20, 80, 470, 530, "#f8fafc", PANEL_L, rx=14, sw=2))
    b.append(txt(255, 120, "a reflex", size=24, weight="700", anchor="middle"))
    b.append(box(300, 170, 70, 440, "#e2e8f0", "#64748b", rx=28, sw=3))
    b.append(margin_label(390, 200, 372, 200, "spinal cord", "start", size=19))
    b.append(margin_label(390, 246, 372, 246, "coordinator", "start", size=19))
    # the hand, the hot object and the receptor in the skin
    b.append(box(60, 250, 140, 90, "#fef3c7", "#b45309", rx=18, sw=3))
    b.append(f'<path d="M 120,362 C 98,394 98,414 120,430 C 142,414 142,394 120,362 Z" '
             f'fill="{TUBE}" stroke="{TUBE_L}" stroke-width="3"/>')
    b.append(f'<ellipse cx="160" cy="342" rx="15" ry="9" fill="{MIT}" stroke="{MIT_L}" '
             f'stroke-width="2.5"/>')
    b.append(margin_label(200, 372, 174, 346, "receptor", "start", size=19))
    b.append(margin_label(60, 470, 114, 428, "stimulus", "start", size=19))
    # sensory neurone in, motor neurone out
    b.append(tube("M 176,336 C 230,320 262,272 300,238", "#fde68a", "#b45309", 12))
    b.append(txt(232, 292, "sensory neurone", size=18, anchor="middle"))
    b.append(tube("M 300,510 C 262,516 232,518 196,518", "#fde68a", "#b45309", 12))
    b.append(txt(232, 560, "motor neurone", size=18, anchor="middle"))
    # the effector and the response
    b.append(f'<ellipse cx="126" cy="518" rx="62" ry="30" fill="{ORGAN}" stroke="{ORGAN_L}" '
             f'stroke-width="3"/>')
    b.append(txt(126, 592, "effector", size=19, anchor="middle"))
    b.append(line_arrow(190, 244, 140, 196, A, "arrow"))
    b.append(txt(60, 180, "response", size=19))

    # ---- panel B: the eye
    b.append(box(510, 80, 470, 480, "#f8fafc", PANEL_L, rx=14, sw=2))
    b.append(txt(745, 120, "the eye", size=24, weight="700", anchor="middle"))
    b.append(f'<circle cx="780" cy="330" r="120" fill="#ffffff" stroke="#334155" stroke-width="5"/>')
    b.append(f'<path d="M 700,240 C 630,272 630,388 700,420" fill="#e0f2fe" stroke="#0284c7" '
             f'stroke-width="4"/>')
    b.append(f'<rect x="690" y="270" width="22" height="120" rx="8" fill="#a78bfa" '
             f'stroke="#6d28d9" stroke-width="2"/>')
    b.append(f'<rect x="690" y="310" width="22" height="40" fill="#ffffff"/>')
    b.append(f'<ellipse cx="722" cy="330" rx="16" ry="46" fill="{VAC}" stroke="{VAC_L}" '
             f'stroke-width="3"/>')
    b.append(f'<path d="M 830,228 C 895,260 895,400 830,432" fill="none" stroke="#be185d" '
             f'stroke-width="9"/>')
    b.append(f'<path d="M 898,330 L 962,330" stroke="#b45309" stroke-width="14" '
             f'stroke-linecap="round"/>')
    b.append(margin_label(530, 200, 656, 274, "cornea", "start", size=19))
    b.append(margin_label(530, 250, 688, 330, "pupil", "start", size=19))
    b.append(margin_label(530, 300, 688, 382, "iris", "start", size=19))
    b.append(margin_label(760, 510, 722, 378, "lens", "middle", size=19))
    b.append(margin_label(966, 240, 872, 268, "retina", "end", size=19))

    # ---- panel C: accommodation, thin lens against thick lens
    b.append(box(20, 630, 960, 400, "#f8fafc", PANEL_L, rx=14, sw=2))
    b.append(txt(500, 666, "accommodation: the lens changes", size=24, weight="700",
                 anchor="middle"))
    for dx, near in ((0, False), (470, True)):
        cx = 300 + dx
        b.append(f'<circle cx="{cx}" cy="830" r="90" fill="#ffffff" stroke="#334155" '
                 f'stroke-width="4"/>')
        b.append(f'<path d="M {cx+72},780 C {cx+86},802 {cx+86},858 {cx+72},880" fill="none" '
                 f'stroke="#be185d" stroke-width="8"/>')
        if near:
            b.append(f'<ellipse cx="{cx-60}" cy="830" rx="20" ry="46" fill="{VAC}" '
                     f'stroke="{VAC_L}" stroke-width="3"/>')
            b.append(f'<ellipse cx="{cx-60}" cy="770" rx="22" ry="14" fill="{GOLGI}" '
                     f'stroke="{GOLGI_L}" stroke-width="2.5"/>')
            b.append(f'<ellipse cx="{cx-60}" cy="890" rx="22" ry="14" fill="{GOLGI}" '
                     f'stroke="{GOLGI_L}" stroke-width="2.5"/>')
            b.append(strap(cx - 60, 786, cx - 60, 802, 6))
            b.append(strap(cx - 60, 858, cx - 60, 874, 6))
        else:
            b.append(f'<ellipse cx="{cx-60}" cy="830" rx="10" ry="34" fill="{VAC}" '
                     f'stroke="{VAC_L}" stroke-width="3"/>')
            b.append(f'<ellipse cx="{cx-60}" cy="774" rx="18" ry="12" fill="{GOLGI}" '
                     f'stroke="{GOLGI_L}" stroke-width="2.5"/>')
            b.append(f'<ellipse cx="{cx-60}" cy="886" rx="18" ry="12" fill="{GOLGI}" '
                     f'stroke="{GOLGI_L}" stroke-width="2.5"/>')
            b.append(strap(cx - 60, 786, cx - 60, 800, 6))
            b.append(strap(cx - 60, 860, cx - 60, 874, 6))
        # rays from the object, bent by the lens, meeting on the retina
        b.append(f'<path d="M {cx-200},782 L {cx-60},806 L {cx+70},830" fill="none" '
                 f'stroke="{PELV_L}" stroke-width="3"/>')
        b.append(f'<path d="M {cx-200},878 L {cx-60},854 L {cx+70},830" fill="none" '
                 f'stroke="{PELV_L}" stroke-width="3"/>')
        b.append(line_arrow(cx - 250, 830, cx - 190, 830, A, "amber", PELV_L, 4))

    b.append(txt(60, 690, "distant object", size=18))
    b.append(txt(300, 690, "thin lens", size=18, anchor="middle"))
    b.append(txt(530, 690, "near object", size=18))
    b.append(txt(770, 690, "thick lens", size=18, anchor="middle"))
    b.append(margin_label(300, 950, 254, 858, "suspensory ligaments taut", "middle", size=17))
    b.append(margin_label(300, 1000, 240, 884, "ciliary muscles relax", "middle", size=17))
    b.append(margin_label(770, 950, 724, 858, "suspensory ligaments slack", "middle", size=17))
    b.append(margin_label(770, 1000, 710, 886, "ciliary muscles contract", "middle", size=17))
    b.append(margin_label(455, 890, 376, 878, "retina", "end", size=18))
    b.append(margin_label(930, 830, 872, 830, "retina", "end", size=18))

    b.append(txt(500, 1070, "Short sight (myopia): the correction is a concave lens.", size=20,
                 anchor="middle"))
    b.append(txt(500, 1102, "Long sight (hyperopia): the correction is a convex lens.", size=20,
                 anchor="middle"))
    return svg(A, W, H, "The reflex arc from stimulus to response, the eye in section, and the "
                        "lens thin and thick in accommodation", "".join(b))


# ---------------------------------------------------------------- 9. population growth
# human-impact teaches the J-shaped curve, the S-shape, the carrying capacity and the
# predator/prey cycle in prose. This draws all four, and every label is the lesson's wording.

def figure_population():
    import math
    W, H = 1000, 1010
    A = "pop"
    b = []
    b.append(txt(500, 42, "POPULATION GROWTH, CARRYING CAPACITY, PREDATOR AND PREY",
                 size=26, weight="700", anchor="middle"))

    def curve(x0, x1, y_of, n=72):
        return " ".join(f"{x0 + (x1 - x0) * i / (n - 1):.1f},{y_of(i / (n - 1)):.1f}"
                        for i in range(n))

    # ---- panel A: exponential growth, then the S-shape levelling off at the carrying capacity
    b.append(box(20, 80, 470, 560, "#f8fafc", PANEL_L, rx=14, sw=2))
    b.append(txt(255, 116, "growth, then an S-shape", size=21, weight="700", anchor="middle"))
    b.append(f'<line x1="70" y1="590" x2="470" y2="590" stroke="{MUTED}" stroke-width="3" '
             f'marker-end="url(#{A}-arrow)"/>')
    b.append(f'<line x1="70" y1="590" x2="70" y2="150" stroke="{MUTED}" stroke-width="3" '
             f'marker-end="url(#{A}-arrow)"/>')
    b.append(txt(270, 622, "generation", size=19, anchor="middle", fill=MUTED))
    b.append(rotated(40, 370, "number of individuals", size=17, fill=MUTED))
    # the carrying capacity the S-shape levels off at
    b.append(f'<line x1="80" y1="250" x2="462" y2="250" stroke="{OXY_L}" stroke-width="3" '
             f'stroke-dasharray="10 7"/>')
    # J-shaped: exponential growth, drawn from the exponential itself
    k = 4.6
    b.append(f'<polyline points="{curve(96, 452, lambda t: 590 - (590 - 168) * (math.exp(k * t) - 1) / (math.exp(k) - 1))}" '
             f'fill="none" stroke="{ORGAN_L}" stroke-width="5"/>')
    # S-shape: the same start, slowing and levelling off at the carrying capacity
    b.append(f'<polyline points="{curve(96, 452, lambda t: 590 - (590 - 250) / (1 + math.exp(-9 * (t - 0.45))))}" '
             f'fill="none" stroke="{WALL}" stroke-width="5"/>')
    # the key, so no label has to fight the curves for room
    b.append(f'<line x1="90" y1="158" x2="126" y2="158" stroke="{ORGAN_L}" stroke-width="5"/>')
    b.append(txt(136, 158, "J-shaped curve", size=17, fill=ORGAN_L))
    b.append(f'<line x1="90" y1="190" x2="126" y2="190" stroke="{WALL}" stroke-width="5"/>')
    b.append(txt(136, 190, "S-shape", size=17, fill=WALL))
    b.append(f'<line x1="90" y1="222" x2="126" y2="222" stroke="{OXY_L}" stroke-width="3" '
             f'stroke-dasharray="10 7"/>')
    b.append(txt(136, 222, "carrying capacity", size=17, fill=OXY_L))
    b.append(margin_label(430, 190, 449, 174, "exponential growth", "end", size=17, fill=ORGAN_L))

    # ---- panel B: predator and prey, the predator lagging behind the prey
    b.append(box(510, 80, 470, 560, "#f8fafc", PANEL_L, rx=14, sw=2))
    b.append(txt(745, 116, "predator and prey", size=21, weight="700", anchor="middle"))
    b.append(txt(745, 148, "the predator lags behind the prey", size=17, anchor="middle",
                 fill=MUTED))
    b.append(f'<line x1="570" y1="182" x2="606" y2="182" stroke="{WALL}" stroke-width="5"/>')
    b.append(txt(616, 182, "prey", size=17, fill=WALL))
    b.append(f'<line x1="700" y1="182" x2="736" y2="182" stroke="{OXY_L}" stroke-width="5"/>')
    b.append(txt(746, 182, "predator", size=17, fill=OXY_L))
    b.append(f'<line x1="560" y1="590" x2="960" y2="590" stroke="{MUTED}" stroke-width="3" '
             f'marker-end="url(#{A}-arrow)"/>')
    b.append(f'<line x1="560" y1="590" x2="560" y2="212" stroke="{MUTED}" stroke-width="3" '
             f'marker-end="url(#{A}-arrow)"/>')
    b.append(txt(760, 622, "generation", size=19, anchor="middle", fill=MUTED))
    b.append(f'<polyline points="{curve(580, 950, lambda t: 430 - 100 * math.sin(3 * math.pi * t))}" '
             f'fill="none" stroke="{WALL}" stroke-width="5"/>')
    b.append(f'<polyline points="{curve(580, 950, lambda t: 475 - 80 * math.sin(3 * math.pi * t - 1.05))}" '
             f'fill="none" stroke="{OXY_L}" stroke-width="5"/>')

    # ---- the cycle in words, straight from the lesson
    b.append(box(20, 670, 960, 190, "#ffffff", PANEL_L, rx=14, sw=2))
    b.append(txt(40, 706, "When prey are plentiful the predators have more young and their "
                          "numbers rise, but only after the prey", size=19))
    b.append(txt(40, 742, "have already risen. More predators then eat more prey and the prey "
                          "numbers fall; with fewer predators", size=19))
    b.append(txt(40, 778, "the prey recover, and the cycle repeats.", size=19))
    b.append(txt(40, 820, "Human activity changes the carrying capacity: clearing forest or "
                          "overfishing lowers it, while irrigation,", size=19, fill=MUTED))
    b.append(txt(40, 848, "fertiliser and medicine can raise it.", size=19, fill=MUTED))

    b.append(box(20, 880, 960, 110, PANEL, PANEL_L, rx=12, sw=2))
    b.append(txt(500, 910, "No population grows that way for long: the limiting factors bite "
                           "and the curve levels off.", size=19, anchor="middle"))
    b.append(txt(500, 940, "The population size at which it levels off is the carrying capacity "
                           "of that habitat.", size=19, anchor="middle"))
    b.append(txt(500, 970, "The limiting factors are food, water, space, disease and predation.",
                 size=19, anchor="middle", fill=MUTED))
    return svg(A, W, H, "Population growth drawn as a J-shaped curve and an S-shape levelling "
                        "off at the carrying capacity, beside predator and prey curves with "
                        "the predator lagging behind the prey", "".join(b))


# ---------------------------------------------------------------- 10. gas exchange surfaces

def figure_gas_exchange():
    W, H = 1000, 940
    A = "gas"
    b = []
    b.append(txt(500, 42, "GAS EXCHANGE SURFACES", size=27, weight="700", anchor="middle"))

    # ---- panel A: one alveolus against the capillary that wraps it
    b.append(box(20, 80, 470, 540, "#f8fafc", PANEL_L, rx=14, sw=2))
    b.append(txt(255, 116, "in the alveolus", size=21, weight="700", anchor="middle"))
    # the route the air takes to reach it
    for i, name in enumerate(["trachea", "bronchi", "bronchioles", "alveoli"]):
        x = 32 + i * 118
        b.append(box(x, 140, 96, 34, "#e0f2fe", "#0284c7", rx=8, sw=2))
        b.append(txt(x + 48, 158, name, size=13, anchor="middle"))
        if i < 3:
            b.append(line_arrow(x + 98, 157, x + 114, 157, A, "arrow", MUTED, 3))
    # the alveolus: a sac with a moist lining and a wall one cell thick
    b.append(f'<path d="M 130,470 A 120,120 0 0 1 370,470 Z" fill="#e0f2fe" stroke="#0284c7" '
             f'stroke-width="4"/>')
    b.append(txt(250, 380, "air", size=22, anchor="middle"))
    b.append(f'<rect x="130" y="470" width="240" height="9" fill="#fde68a" stroke="#b45309" '
             f'stroke-width="1.5"/>')
    # the capillary, one cell thick, with blood in it
    b.append(f'<rect x="105" y="479" width="290" height="46" rx="23" fill="#fecdd3" '
             f'stroke="{ORGAN_L}" stroke-width="3"/>')
    b.append(txt(250, 503, "blood", size=18, anchor="middle", fill=ORGAN_L))
    b.append(line_arrow(196, 444, 196, 496, A, "blue", DEOX_L, 4))
    b.append(line_arrow(304, 496, 304, 444, A, "red", OXY_L, 4))
    b.append(txt(250, 560, "oxygen in, carbon dioxide out", size=16, anchor="middle",
                 fill=MUTED))
    b.append(margin_label(470, 320, 340, 422, "moist lining", "end", size=17, lead=377))
    b.append(stacked_label(470, 408, 372, 470, ["wall one", "cell thick"], "end", size=17,
                          lead=396))
    b.append(margin_label(470, 548, 330, 524, "capillaries", "end", size=17, lead=386))
    b.append(margin_label(40, 320, 176, 392, "alveoli", "start", size=17, lead=96))

    # ---- panel B: a gill, and one lamella in counter-current flow
    b.append(box(510, 80, 470, 540, "#f8fafc", PANEL_L, rx=14, sw=2))
    b.append(txt(745, 116, "in the gill: counter-current flow", size=21, weight="700",
                 anchor="middle"))
    b.append(f'<path d="M 560,196 Q 730,158 900,196" fill="none" stroke="#94a3b8" '
             f'stroke-width="16" stroke-linecap="round"/>')
    for i in range(8):
        x = 578 + i * 44
        b.append(f'<rect x="{x}" y="186" width="17" height="112" rx="8" fill="#fecdd3" '
                 f'stroke="{ORGAN_L}" stroke-width="2.5"/>')
    b.append(margin_label(540, 260, 566, 190, "gill", "start", size=17, lead=569))
    b.append(margin_label(952, 330, 902, 286, "filaments", "end", size=17, lead=876))
    # one lamella, with water flowing over it one way and the blood the other
    b.append(f'<rect x="560" y="386" width="380" height="92" rx="16" fill="#fecdd3" '
             f'stroke="{ORGAN_L}" stroke-width="3"/>')
    b.append(f'<rect x="572" y="404" width="356" height="56" rx="14" fill="#fee2e2" '
             f'stroke="{ORGAN_L}" stroke-width="1.5"/>')
    b.append(line_arrow(566, 356, 934, 356, A, "arrow", MUTED, 4))
    b.append(txt(566, 336, "water", size=18, fill=MUTED))
    b.append(line_arrow(934, 432, 566, 432, A, "red", OXY_L, 4))
    b.append(txt(620, 416, "blood", size=18, fill=ORGAN_L))
    b.append(margin_label(566, 372, 604, 390, "lamellae", "start", size=17, lead=637))
    b.append(txt(750, 540, "blood flows the other way", size=17, anchor="middle", fill=MUTED))
    b.append(txt(750, 572, "counter-current flow: more oxygen is taken up", size=18,
                 anchor="middle"))
    b.append(txt(750, 600, "than if the two flowed the same way", size=17, anchor="middle",
                 fill=MUTED))

    # ---- what the two surfaces have in common
    b.append(box(20, 646, 960, 150, "#ffffff", PANEL_L, rx=14, sw=2))
    b.append(txt(40, 682, "Oxygen diffuses from the air in the alveolus into the blood, and "
                          "carbon dioxide diffuses from the blood", size=19))
    b.append(txt(40, 716, "into the alveolus to be breathed out. In the gill the water and the "
                          "blood flow in the opposite direction.", size=19))
    b.append(txt(40, 758, "Every gas exchange surface must be thin, moist, with a large surface "
                          "area and a good blood or air supply.", size=19, fill=MUTED))

    b.append(box(20, 812, 960, 100, PANEL, PANEL_L, rx=12, sw=2))
    b.append(txt(500, 840, "A thin surface keeps the diffusion path short, and a moist one is "
                           "needed because gases have to dissolve,", size=19, anchor="middle"))
    b.append(txt(500, 872, "a large surface area so that a lot of gas can cross at once, and a "
                           "good blood or air supply keeps", size=19, anchor="middle"))
    b.append(txt(500, 898, "the concentration gradient steep so that diffusion keeps going.",
                 size=19, anchor="middle", fill=MUTED))
    return svg(A, W, H, "An alveolus with its wall one cell thick against a capillary carrying "
                        "blood, and a gill with its filaments and one lamella in counter-current "
                        "flow", "".join(b))


# ---------------------------------------------------------------- 11. the alimentary canal

def figure_digestion():
    W, H = 1000, 1130
    A = "gut"
    b = []
    b.append(txt(500, 42, "THE ALIMENTARY CANAL", size=27, weight="700", anchor="middle"))
    b.append(txt(500, 74, "the passage of food through the digestive system", size=19,
                 anchor="middle", fill=MUTED))

    b.append(box(20, 96, 680, 784, "#f8fafc", PANEL_L, rx=14, sw=2))

    # the large intestine first, so the coiled small intestine sits inside it
    b.append(f'<path d="M 240,662 L 240,430 L 470,430 L 470,662" fill="none" stroke="{TUBE_L}" '
             f'stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/>')
    b.append(f'<path d="M 240,662 L 240,430 L 470,430 L 470,662" fill="none" stroke="{TUBE}" '
             f'stroke-width="42" stroke-linecap="round" stroke-linejoin="round"/>')
    # the rectum, at the end of the route
    b.append(f'<path d="M 470,662 L 470,760" fill="none" stroke="{TUBE_L}" stroke-width="40" '
             f'stroke-linecap="round"/>')
    b.append(f'<path d="M 470,662 L 470,760" fill="none" stroke="{TUBE}" stroke-width="30" '
             f'stroke-linecap="round"/>')

    # the small intestine: one coiled tube, most of the digestion and all of the absorption
    coil = ("M 336,390 C 306,418 378,438 408,456 C 438,474 392,492 336,498 "
            "C 280,504 274,534 328,544 C 382,554 416,572 378,588 "
            "C 340,604 294,612 306,636 C 312,648 268,658 240,662")
    b.append(tube(coil, TUBE, TUBE_L, 34))

    # the mouth and the oesophagus
    b.append(box(285, 140, 100, 46, "#fecdd3", ORGAN_L, rx=12, sw=3))
    b.append(f'<rect x="320" y="186" width="30" height="84" fill="{TUBE}" stroke="{TUBE_L}" '
             f'stroke-width="3"/>')
    # peristalsis: the wave of contraction pushing the food down
    b.append(line_arrow(386, 196, 386, 254, A, "arrow", MUTED, 4))
    b.append(line_arrow(288, 196, 288, 254, A, "arrow", MUTED, 4))

    # the stomach
    b.append(f'<path d="M 320,270 C 404,272 450,318 438,362 C 426,404 360,412 320,388 Z" '
             f'fill="{ORGAN}" stroke="{ORGAN_L}" stroke-width="3"/>')

    # the route continues: down the coil, up the large intestine, across and down to the rectum
    b.append(line_arrow(404, 448, 418, 466, A, "arrow", MUTED, 3))
    b.append(line_arrow(292, 536, 276, 552, A, "arrow", MUTED, 3))
    b.append(line_arrow(240, 560, 240, 500, A, "arrow", MUTED, 3))
    b.append(line_arrow(300, 430, 360, 430, A, "arrow", MUTED, 3))
    b.append(line_arrow(470, 500, 470, 570, A, "arrow", MUTED, 3))
    b.append(line_arrow(506, 700, 506, 744, A, "arrow", MUTED, 3))

    # the glands that feed the small intestine
    b.append(f'<path d="M 500,300 C 566,286 616,308 622,344 C 626,376 584,392 534,384 '
             f'C 506,378 494,330 500,300 Z" fill="#fecaca" stroke="#b91c1c" stroke-width="3"/>')
    b.append(f'<ellipse cx="516" cy="412" rx="24" ry="15" fill="#bbf7d0" stroke="{WALL}" '
             f'stroke-width="3"/>')
    b.append(f'<path d="M 540,470 C 596,458 646,474 654,500 C 660,526 610,534 560,526 '
             f'C 538,522 534,486 540,470 Z" fill="#fde68a" stroke="#b45309" stroke-width="3"/>')
    b.append(line_arrow(532, 422, 446, 470, A, "arrow", WALL, 3))
    b.append(txt(556, 436, "bile", size=16, fill=WALL))

    # labels — each one a word this lesson prints
    b.append(margin_label(60, 166, 283, 163, "mouth", "start", size=19))
    b.append(txt(60, 196, "the teeth grind the food", size=15, fill=MUTED))
    b.append(margin_label(60, 240, 318, 240, "oesophagus", "start", size=19))
    b.append(margin_label(410, 150, 386, 200, "peristalsis", "start", size=18))
    b.append(margin_label(60, 330, 326, 330, "stomach", "start", size=19))
    b.append(margin_label(60, 560, 300, 552, "small intestine", "start", size=19))
    b.append(margin_label(60, 762, 455, 762, "rectum", "start", size=19))
    b.append(txt(60, 792, "faeces stored in the rectum before being egested", size=15,
                 fill=MUTED))
    b.append(margin_label(520, 690, 474, 690, "large intestine", "start", size=18))
    b.append(margin_label(630, 330, 620, 336, "liver", "start", size=18))
    b.append(stacked_label(630, 400, 542, 412, ["gall", "bladder"], "start", size=18))
    b.append(margin_label(694, 556, 640, 528, "pancreas", "end", size=18))

    # ---- the villus inset
    b.append(box(720, 96, 260, 784, "#f8fafc", PANEL_L, rx=14, sw=2))
    b.append(txt(850, 132, "VILLI", size=23, weight="700", anchor="middle"))
    b.append(txt(850, 160, "in the wall of the small intestine", size=14, anchor="middle",
                 fill=MUTED))
    b.append(f'<rect x="736" y="600" width="228" height="16" fill="#fde68a" stroke="#b45309" '
             f'stroke-width="2"/>')
    for cx in (786, 850, 914):
        b.append(f'<path d="M {cx-22},600 L {cx-22},340 C {cx-22},316 {cx+22},316 {cx+22},340 '
                 f'L {cx+22},600 Z" fill="#fecdd3" stroke="{ORGAN_L}" stroke-width="3"/>')
        b.append(f'<path d="M {cx-9},596 L {cx-9},348" stroke="{OXY_L}" stroke-width="6" '
                 f'stroke-linecap="round"/>')
        b.append(f'<path d="M {cx+9},348 L {cx+9},596" stroke="{DEOX_L}" stroke-width="6" '
                 f'stroke-linecap="round"/>')
    b.append(margin_label(734, 250, 786, 336, "finger-like projections", "start", size=15))
    b.append(txt(850, 660, "a very large surface area", size=15, anchor="middle"))
    b.append(margin_label(850, 700, 841, 480, "a rich blood supply", "middle", size=15))
    b.append(txt(850, 730, "absorbed into the blood", size=15, anchor="middle", fill=MUTED))
    b.append(text_lines(850, 780, ["The digested nutrients are",
                                   "absorbed through the villi,",
                                   "finger-like projections of",
                                   "the wall of the small intestine."],
                        size=13, anchor="middle", lh=19))

    # ---- what happens to the food after absorption
    b.append(box(20, 904, 960, 190, "#ffffff", PANEL_L, rx=14, sw=2))
    b.append(txt(40, 940, "Each enzyme digests one type of food: amylase breaks starch down to "
                          "maltose, protease breaks proteins", size=18))
    b.append(txt(40, 974, "down to amino acids, and lipase breaks fats down to fatty acids and "
                          "glycerol.", size=18))
    b.append(txt(40, 1018, "The liver produces bile, stored in the gall bladder, released into "
                           "the small intestine,", size=18, fill=MUTED))
    b.append(txt(40, 1052, "where it emulsifies fats into small droplets so that there is a "
                           "larger surface area for lipase to act on.", size=18, fill=MUTED))
    return svg(A, W, H, "The alimentary canal as a route from the mouth through the oesophagus, "
                        "the stomach and the coiled small intestine inside the large intestine to "
                        "the rectum, with the liver, gall bladder and pancreas feeding it and an "
                        "inset of the villi that absorb the digested food", "".join(b))


# ---------------------------------------------------------------- 12. the bean seed

def figure_seed():
    W, H = 1000, 940
    A = "seed"
    b = []
    b.append(txt(500, 42, "A BEAN SEED, AND GERMINATION", size=27, weight="700",
                 anchor="middle"))

    # ---- panel A: the longitudinal section the exam asks for
    b.append(box(20, 80, 470, 620, "#f8fafc", PANEL_L, rx=14, sw=2))
    b.append(txt(255, 116, "longitudinal section", size=21, weight="700", anchor="middle"))
    # the testa: the thin outline all round the outside
    b.append(f'<ellipse cx="245" cy="400" rx="115" ry="145" fill="#fef3c7" stroke="#b45309" '
             f'stroke-width="5"/>')
    # the two cotyledons: two large rounded halves that fill most of the seed
    b.append(f'<path d="M 233,262 C 172,272 140,330 140,400 C 140,470 174,528 233,538 Z" '
             f'fill="#fde68a" stroke="#b45309" stroke-width="3"/>')
    b.append(f'<path d="M 257,262 C 318,272 350,330 350,400 C 350,470 316,528 257,538 Z" '
             f'fill="#fde68a" stroke="#b45309" stroke-width="3"/>')
    # the radicle: the young root, between the two cotyledons at one end
    b.append(f'<path d="M 238,516 L 262,516 L 250,566 Z" fill="#fca5a5" stroke="#b91c1c" '
             f'stroke-width="3"/>')
    # the plumule: the young shoot, with its first leaves folded inside it
    b.append(f'<path d="M 250,502 C 232,484 232,462 250,450 C 268,462 268,484 250,502 Z" '
             f'fill="#bbf7d0" stroke="{WALL}" stroke-width="3"/>')
    b.append(f'<path d="M 250,488 C 238,474 238,458 250,448 C 262,458 262,474 250,488 Z" '
             f'fill="none" stroke="{WALL}" stroke-width="2"/>')
    b.append(margin_label(30, 148, 168, 288, "testa", "start", size=18))
    b.append(txt(30, 176, "the tough outer seed coat", size=14, fill=MUTED))
    b.append(margin_label(30, 400, 138, 400, "cotyledons", "start", size=18))
    b.append(margin_label(364, 330, 264, 482, "plumule", "start", size=18))
    b.append(txt(364, 356, "the young shoot", size=14, fill=MUTED))
    b.append(margin_label(364, 560, 262, 546, "radicle", "start", size=18))
    b.append(txt(364, 586, "the young root", size=14, fill=MUTED))
    b.append(text_lines(245, 626, ["The plumule is the tiny shoot with its",
                                   "first leaves folded inside it."],
                        size=14, anchor="middle", lh=19))

    # ---- panel B: germination, the radicle down and the plumule up
    b.append(box(510, 80, 470, 620, "#f8fafc", PANEL_L, rx=14, sw=2))
    b.append(txt(745, 116, "germination", size=21, weight="700", anchor="middle"))
    b.append(f'<rect x="520" y="560" width="450" height="130" fill="#e7e5e4"/>')
    b.append(f'<line x1="520" y1="560" x2="970" y2="560" stroke="#78716c" stroke-width="3"/>')
    # the seed, split open as the radicle breaks out
    b.append(f'<path d="M 676,510 C 676,452 824,452 824,510 C 824,544 676,544 676,510 Z" '
             f'fill="#fde68a" stroke="#b45309" stroke-width="4"/>')
    b.append(f'<path d="M 750,456 L 750,536" stroke="#b45309" stroke-width="2.5" '
             f'stroke-dasharray="7 5"/>')
    # the radicle growing down into the soil
    b.append(f'<path d="M 750,540 C 746,584 754,614 764,644" fill="none" stroke="#b91c1c" '
             f'stroke-width="9" stroke-linecap="round"/>')
    # the plumule growing upwards
    b.append(f'<path d="M 750,452 C 750,412 752,388 754,362" fill="none" stroke="{WALL}" '
             f'stroke-width="8" stroke-linecap="round"/>')
    b.append(f'<path d="M 754,362 C 726,344 704,362 704,384 C 730,392 750,384 754,362 Z" '
             f'fill="#bbf7d0" stroke="{WALL}" stroke-width="2.5"/>')
    b.append(f'<path d="M 754,362 C 782,344 804,362 804,384 C 778,392 758,384 754,362 Z" '
             f'fill="#bbf7d0" stroke="{WALL}" stroke-width="2.5"/>')
    b.append(line_arrow(800, 448, 800, 380, A, "arrow", WALL, 4))
    b.append(line_arrow(800, 546, 800, 620, A, "arrow", MUTED, 4))
    b.append(txt(560, 262, "the plumule grows upwards", size=16))
    b.append(margin_label(560, 480, 676, 486, "cotyledons", "start", size=16))
    b.append(txt(560, 676, "the radicle grows downwards into the soil", size=15))

    # ---- the three conditions, and the trap
    b.append(box(20, 726, 960, 190, "#ffffff", PANEL_L, rx=14, sw=2))
    b.append(txt(40, 762, "Germination needs water, oxygen and a suitable temperature, and each "
                          "one has a job:", size=19))
    b.append(txt(40, 796, "water softens the testa and activates the enzymes, oxygen is needed "
                          "because the seed respires,", size=19))
    b.append(txt(40, 830, "and warmth makes the enzymes work faster.", size=19))
    b.append(txt(40, 872, "Light is not one of the three: a bean seed will germinate in the "
                          "dark.", size=19, fill=OXY_L))
    b.append(txt(40, 906, "A seed with two cotyledons is described as dicotyledonous.",
                 size=19, fill=MUTED))
    return svg(A, W, H, "A bean seed in longitudinal section with the testa round the outside, "
                        "the two cotyledons, the radicle and the plumule, beside the same seed "
                        "germinating with the radicle growing down and the plumule up", "".join(b))


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
        description="Write Biology's eight lesson figures into an explicit --out directory.")
    ap.add_argument("--out", required=True,
                    help="directory to write the SVGs into; the only place this script writes")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    figures = [("plant-and-animal-cell.svg", figure_cell(), 1000, 1215),
               ("heart-and-double-circulation.svg", figure_heart(), 1000, 1270),
               ("kidney-and-nephron.svg", figure_kidney(), 1000, 1330),
               ("levels-of-organisation.svg", figure_levels(), 1000, 700),
               ("leaf-cross-section.svg", figure_leaf(), 1000, 830),
               ("elbow-antagonistic-pair.svg", figure_elbow(), 1000, 880),
               ("nitrogen-cycle-and-carbon-returns.svg", figure_cycles(), 1000, 1060),
               ("reflex-arc-and-accommodation.svg", figure_reflex(), 1000, 1120),
               ("population-growth-and-predator-prey.svg", figure_population(), 1000, 1010),
               ("alveoli-and-gill-gas-exchange.svg", figure_gas_exchange(), 1000, 940),
               ("alimentary-canal-and-villi.svg", figure_digestion(), 1000, 1130),
               ("bean-seed-longitudinal-section.svg", figure_seed(), 1000, 940)]
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
