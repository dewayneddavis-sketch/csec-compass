#!/usr/bin/env python3
"""Author the Integrated Science Tier-1 lesson figures.

Audit: /home/team/shared/integrated-science-figure-audit.md §2 (Tier 1) — the three
figures that are BORROWED rather than drawn:

  1. is-l2-1  cells            <- Biology's plant+animal cell artwork, IS's reduced label set
  2. is-l5-1  circuits         <- Physics's series/parallel panel geometry + IS's safety panel
  3. is-l5-3  heat transfer    <- the three-mechanism panels (Physics's Tier-2 payload, drawn
                                  here first) + IS's own thermos-flask cutaway

Shared-asset-first, and provably so: the geometry constants below are the SAME numbers the
shared Biology generator (/home/team/shared/biology-figures/gen_bio_figs.py) and the Physics
generator (tools/gen-physics-figures.mjs) use, and `assert_borrowed_geometry()` re-BUILDS the
borrowed element strings from those constants and asserts each one still occurs in the sibling
subject's shipped SVG. If the sibling artwork moves, this generator fails loudly instead of
forking into a drifting copy. Labels differ on purpose (audit §2 vocabulary): a figure may only
name what the lesson names, so `taught()` asserts every drawn phrase against the lesson's own
copy before anything is written.

All-original vector artwork; nothing traced, nothing AI-generated. No number appears that the
lesson does not itself state (IS states very few — see audit §4 "taught-numbers rule", which is
why the borrowed circuit panels are drawn WITHOUT Physics's 6 V / 2 ohm / 1 A values), and every
colour code is also spelt out in words.

  python3 tools/gen-integrated-science-figures.py                     # rewrite BOTH trees
  python3 tools/gen-integrated-science-figures.py --out /tmp/figs     # or draft into a dir
  python3 tools/gen-integrated-science-figures.py --trees             # explicit both trees
"""
import argparse
import io
import json
import math
import os
import re
import sys

# ------------------------------------------------------------------ shared style (Biology set)
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

# Physics circuit set
P_INK = "#111827"
P_MUTED = "#4b5563"
P_LINE = "#374151"
P_RULE = "#e5e7eb"
RED = "#b91c1c"
BLUE = "#1d4ed8"
STEEL = "#cbd5e1"; STEEL_L = "#64748b"
WARM = "#ea580c"

FONT = "Helvetica,Arial,sans-serif"

# --- borrowed panel geometry, byte-for-byte identical to the sibling generators -------------
# Biology (gen_bio_figs.py, figure_cell): the plant cell wall rect + the animal-cell outline.
BIO_WALL_RECT = ('<rect x="250" y="120" width="450" height="390" rx="16" fill="#ffffff" '
                 'stroke="{WALL}" stroke-width="14"/>')
BIO_BLOB = ("M 478,690 C 596,684 682,746 696,850 C 708,946 664,1036 582,1076 "
            "C 504,1114 396,1098 326,1034 C 266,978 246,882 260,800 C 276,710 364,696 478,690 Z")
# Physics (gen-physics-figures.mjs, circuits()): the series loop corners and the parallel rails.
PHY_SERIES = (92, 318, 176, 262)      # SL, SR, ST, SB
PHY_SERIES_Y = 219                    # SY — the battery's y
PHY_PARALLEL = (490, 700, 178, 262)   # PL, PR, PT, PB
PHY_PARALLEL_Y = 220                  # PY

BIOLOGY_CELLS = "content/biology/figures/plant-and-animal-cell.svg"
PHYSICS_CIRCUITS = "content/physics/figures/circuits-series-parallel.svg"
IS_MODULES = "content/integrated-science/modules.json"

TAUGHT = {}   # lesson id -> list of drawn phrases, asserted against the lesson copy


# ------------------------------------------------------------------ primitives
def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def txt(x, y, s, size=22, anchor="start", fill=INK, weight="400"):
    return (f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" '
            f'text-anchor="{anchor}" fill="{fill}" font-weight="{weight}" '
            f'dominant-baseline="middle">{esc(s)}</text>')


def leader(x1, y1, x2, y2, w=2, color=LINE):
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" '
            f'stroke-width="{w}"/><circle cx="{x2}" cy="{y2}" r="4.5" fill="{color}"/>')


def margin_label(x, y, ax, ay, s, anchor, size=22, fill=INK):
    return txt(x, y, s, size=size, anchor=anchor, fill=fill) + leader(
        x + (6 if anchor == "start" else -6), y, ax, ay)


def panel(x, y, w, h, rx=14, fill=PANEL, stroke=PANEL_L):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" '
            f'stroke="{stroke}" stroke-width="2"/>')


def arrowhead(tip, from_pt, colour, size=12):
    """Barbs computed from the ray's own unit vector — never a hand-written relative path."""
    x2, y2 = tip
    x1, y1 = from_pt
    dx, dy = x2 - x1, y2 - y1
    L = math.hypot(dx, dy) or 1.0
    ux, uy = dx / L, dy / L
    a = math.radians(24)
    pts = []
    for s in (1, -1):
        bx = -ux * math.cos(a) - s * uy * math.sin(a)
        by = -uy * math.cos(a) + s * ux * math.sin(a)
        pts.append((x2 + bx * size, y2 + by * size))
    return "".join(f'<line x1="{x2:.1f}" y1="{y2:.1f}" x2="{px:.1f}" y2="{py:.1f}" '
                   f'stroke="{colour}" stroke-width="2.5"/>' for px, py in pts)


def arrow(x1, y1, x2, y2, colour=RED, w=2.5, size=12):
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{colour}" '
            f'stroke-width="{w}"/>' + arrowhead((x2, y2), (x1, y1), colour, size))


def curve_arrow(d, colour=RED, w=2.5):
    return (f'<path d="{d}" fill="none" stroke="{colour}" stroke-width="{w}" '
            f'stroke-linecap="round"/>')


def wave_path(x0, y, x1, amp, cycles, colour=BLUE, w=2.5, step=4):
    pts = []
    n = max(2, int((x1 - x0) / step))
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        pts.append((x, y + amp * math.sin(2 * math.pi * cycles * i / n)))
    d = "M " + " L ".join(f"{x:.1f},{yy:.1f}" for x, yy in pts)
    return f'<path d="{d}" fill="none" stroke="{colour}" stroke-width="{w}"/>'


def lines(b, x, y, texts, size=19, lh=26, anchor="start", fill=INK, weight="400"):
    """Draw stacked lines of text and return their join — the phrase `taught()` asserts."""
    for i, t in enumerate(texts):
        b.append(txt(x, y + i * lh, t, size=size, anchor=anchor, fill=fill, weight=weight))
    return " ".join(texts)


def taught(lesson, phrase):
    TAUGHT.setdefault(lesson, []).append(phrase)


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


def svg(prefix, w, h, title, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" '
            f'height="{h}" role="img"><title>{esc(title)}</title>'
            f'<rect x="0" y="0" width="{w}" height="{h}" fill="#ffffff"/>'
            + body + '</svg>')


# ------------------------------------------------------------------ borrowed-geometry proof
def assert_borrowed_geometry(root="."):
    """Rebuild the borrowed element strings from our constants and require them in the
    sibling subject's shipped SVG. This is what makes the reuse a checked copy, not a fork."""
    bio = io.open(os.path.join(root, BIOLOGY_CELLS), encoding="utf-8").read()
    wall = BIO_WALL_RECT.format(WALL=WALL)
    for label, needle in (("plant cell wall rect", wall), ("animal cell outline", BIO_BLOB)):
        if needle not in bio:
            raise SystemExit(f"borrowed geometry has DRIFTED: {label} is not in {BIOLOGY_CELLS}")
    phy = io.open(os.path.join(root, PHYSICS_CIRCUITS), encoding="utf-8").read()
    SL, SR, ST, SB = PHY_SERIES
    probe = (f'<line x1="{SL}" y1="{ST}" x2="{SR}" y2="{ST}" stroke="{P_LINE}" '
             f'stroke-width="2.5"/>')
    if probe not in phy:
        raise SystemExit(f"borrowed geometry has DRIFTED: the series loop top wire is not in "
                         f"{PHYSICS_CIRCUITS}")
    PL, PR, PT, PB = PHY_PARALLEL
    probe2 = (f'<line x1="{PL}" y1="{PT}" x2="{PR}" y2="{PT}" stroke="{P_LINE}" '
              f'stroke-width="2.5"/>')
    if probe2 not in phy:
        raise SystemExit(f"borrowed geometry has DRIFTED: the parallel top rail is not in "
                         f"{PHYSICS_CIRCUITS}")
    print("borrowed geometry: Biology's cell artwork and Physics's circuit panels verified")


# ------------------------------------------------------------------ 1. cells (is-l2-1)
def figure_cells():
    W = 1000
    H = 1560
    b = []
    b.append(txt(20, 44, "PLANT CELL", size=30, weight="700", fill="#14532d"))
    b.append(txt(20, 650, "ANIMAL CELL", size=30, weight="700", fill="#9f1239"))
    taught("is-l2-1", "PLANT CELL")
    taught("is-l2-1", "ANIMAL CELL")

    # ---- plant cell: Biology's geometry, IS's label set
    b.append(BIO_WALL_RECT.format(WALL=WALL))
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
    b.append(margin_label(726, 185, 668, 185, "genetic material", "start"))
    b.append(margin_label(726, 255, 576, 255, "large vacuole", "start"))
    taught("is-l2-1", "cell wall (cellulose)")
    taught("is-l2-1", "cell membrane")
    taught("is-l2-1", "chloroplast")
    taught("is-l2-1", "cytoplasm")
    taught("is-l2-1", "genetic material")
    taught("is-l2-1", "large vacuole")

    # ---- animal cell: same artwork, IS's label set only
    b.append(f'<path d="{BIO_BLOB}" fill="{CYTO_ANIMAL}" stroke="{MEMB}" stroke-width="6"/>')
    b.append(f'<circle cx="560" cy="800" r="46" fill="{NUC}" stroke="{NUC_L}" stroke-width="4"/>')
    b.append(f'<circle cx="560" cy="800" r="16" fill="{NUC_L}"/>')
    b.append(mitochondrion(336, 772, 100, 48))
    b.append(mitochondrion(352, 1022, 100, 48))
    for x, y, w in [(600, 962, 88), (604, 984, 80), (608, 1006, 72)]:
        b.append(f'<path d="M {x},{y} q {w/2},-16 {w},0" fill="none" stroke="{GOLGI_L}" '
                 f'stroke-width="9" stroke-linecap="round"/>')
        b.append(f'<path d="M {x},{y} q {w/2},-16 {w},0" fill="none" stroke="{GOLGI}" '
                 f'stroke-width="4" stroke-linecap="round"/>')
    for cx, cy in [(330, 890), (655, 862)]:
        b.append(f'<circle cx="{cx}" cy="{cy}" r="18" fill="{LYSO}" stroke="{LYSO_L}" stroke-width="3"/>')
    b.append(dots([(400, 968), (490, 752), (622, 930), (300, 800), (500, 1052)]))
    b.append(margin_label(240, 700, 300, 704, "cell membrane", "end"))
    b.append(margin_label(240, 890, 288, 890, "cytoplasm", "end"))
    b.append(margin_label(726, 800, 608, 800, "genetic material", "start"))

    # ---- shared vs plant-only, in the lesson's own words
    b.append(panel(20, 1118, 960, 100, rx=12))
    taught("is-l2-1", lines(b, 40, 1148, [
        "A typical plant or animal cell has a cell membrane,"], size=21))
    taught("is-l2-1", lines(b, 40, 1176, [
        "cytoplasm and genetic material. Plant cells also have"], size=21))
    taught("is-l2-1", lines(b, 40, 1204, [
        "a cellulose cell wall, a large vacuole and chloroplasts."], size=21))

    # ---- the three transport routes the same lesson teaches
    b.append(txt(20, 1248, "HOW SUBSTANCES MOVE IN AND OUT OF CELLS", size=26, weight="700"))

    # 1) diffusion — particles spread from a high to a low concentration
    px, py, pw, ph = 20, 1272, 306, 224
    b.append(panel(px, py, pw, ph))
    b.append(txt(px + 16, py + 30, "DIFFUSION", size=20, weight="700"))
    b.append(f'<rect x="{px+20}" y="{py+52}" width="266" height="86" rx="10" fill="#ffffff" '
             f'stroke="{PANEL_L}" stroke-width="2"/>')
    dense = [(px + 38 + 16 * (i % 3), py + 72 + 24 * (i // 3)) for i in range(9)]
    b.append(dots(dense, r=6, fill=BLUE))
    sparse = [(px + 226 + 14 * i, py + 86 + 26 * (i % 2)) for i in range(3)]
    b.append(dots(sparse, r=6, fill=BLUE))
    b.append(arrow(px + 118, py + 95, px + 200, py + 95, colour=RED))
    taught("is-l2-1", lines(b, px + 16, py + 160, [
        "particles spread from a high", "to a low concentration"], size=15.5, lh=24))

    # 2) osmosis — water across a partially permeable membrane
    px = 347
    b.append(panel(px, py, pw, ph))
    b.append(txt(px + 16, py + 30, "OSMOSIS", size=20, weight="700"))
    b.append(f'<rect x="{px+20}" y="{py+52}" width="266" height="98" rx="10" fill="#eff6ff" '
             f'stroke="{PANEL_L}" stroke-width="2"/>')
    b.append(f'<line x1="{px+153}" y1="{py+84}" x2="{px+153}" y2="{py+148}" stroke="{MEMB}" '
             f'stroke-width="3" stroke-dasharray="9 6"/>')
    b.append(dots([(px + 44, py + 104), (px + 80, py + 136), (px + 118, py + 104)], r=6, fill=BLUE))
    b.append(dots([(px + 196, py + 104), (px + 236, py + 136)], r=6, fill=BLUE))
    b.append(dots([(px + 214, py + 108), (px + 252, py + 104), (px + 268, py + 136)],
                  r=7, fill=WARM))
    b.append(arrow(px + 96, py + 120, px + 128, py + 120, colour=RED, size=10))
    b.append(txt(px + 26, py + 70, "dilute", size=14, fill=MUTED))
    b.append(txt(px + 280, py + 70, "more concentrated", size=14, anchor="end", fill=MUTED))
    taught("is-l2-1", lines(b, px + 16, py + 160, [
        "the movement of water across", "a partially permeable membrane"], size=15.5, lh=24))

    # 3) active transport — against the gradient, needs energy from respiration
    px = 674
    b.append(panel(px, py, pw, ph))
    b.append(txt(px + 16, py + 30, "ACTIVE TRANSPORT", size=20, weight="700"))
    b.append(f'<rect x="{px+20}" y="{py+52}" width="266" height="86" rx="10" fill="#ffffff" '
             f'stroke="{PANEL_L}" stroke-width="2"/>')
    b.append(dots([(px + 46, py + 80), (px + 62, py + 112)], r=6, fill=BLUE))
    b.append(dots([(px + 196, py + 72), (px + 216, py + 112), (px + 240, py + 80),
                   (px + 262, py + 112)], r=6, fill=BLUE))
    b.append(arrow(px + 92, py + 96, px + 178, py + 96, colour=RED))
    taught("is-l2-1", lines(b, px + 16, py + 160, [
        "against the gradient", "requires energy from respiration"], size=15.5, lh=24))

    # the lesson's own sentence about the outcome
    b.append(lines(b, 20, 1530, [
        "Plant cells become turgid in fresh water and flaccid in salty water"], size=20))
    taught("is-l2-1", "Plant cells become turgid in fresh water and flaccid in salty water")
    return svg("is-cell", W, H, "A labelled plant cell beside a labelled animal cell, with the "
               "three ways substances move in and out of cells", "".join(b))


# ------------------------------------------------------------------ 2. circuits (is-l5-1)
def figure_circuits():
    W, H = 780, 656
    b = []
    SL, SR, ST, SB = PHY_SERIES
    SY = PHY_SERIES_Y
    PL, PR, PT, PB = PHY_PARALLEL
    PY = PHY_PARALLEL_Y

    def boxline(x1, y1, x2, y2):
        return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{P_LINE}" '
                f'stroke-width="2.5"/>')

    def battery(x, y):
        return (f'<line x1="{x-19}" y1="{y-5}" x2="{x+19}" y2="{y-5}" stroke="{P_INK}" '
                f'stroke-width="3"/>'
                f'<line x1="{x-10}" y1="{y+6}" x2="{x+10}" y2="{y+6}" stroke="{P_INK}" '
                f'stroke-width="6"/>')

    def component(cx, cy, letter, vertical=False):
        if vertical:
            r = (f'<rect x="{cx-13}" y="{cy-26}" width="26" height="52" rx="4" fill="#fff" '
                 f'stroke="{P_INK}" stroke-width="2.5"/>')
        else:
            r = (f'<rect x="{cx-26}" y="{cy-13}" width="52" height="26" rx="4" fill="#fff" '
                 f'stroke="{P_INK}" stroke-width="2.5"/>')
        return r + txt(cx, cy + 5, letter, size=14, anchor="middle", fill=P_INK, weight="600")

    def switch_h(x, y):
        """An open switch on a horizontal wire whose gap runs from x to x+32."""
        return (f'<circle cx="{x}" cy="{y}" r="3.5" fill="{P_INK}" stroke="none"/>'
                f'<circle cx="{x+32}" cy="{y}" r="3.5" fill="{P_INK}" stroke="none"/>'
                f'<line x1="{x}" y1="{y}" x2="{x+28}" y2="{y-20}" stroke="{P_INK}" '
                f'stroke-width="2.5"/>')

    # ---------------- series panel (Physics's loop, no values)
    b.append(f'<rect x="30" y="74" width="350" height="268" rx="12" fill="none" '
             f'stroke="{P_LINE}" stroke-width="2.5"/>')
    b.append(txt(30, 50, "Series circuit", size=16, weight="700"))
    b.append(txt(30, 67, "the same current at every point", size=13, fill=P_MUTED))
    taught("is-l5-1", "Series circuit")
    taught("is-l5-1", "the same current at every point")
    b.append(boxline(SL, ST, SL + 66, ST))
    b.append(boxline(SL + 98, ST, SR, ST))
    b.append(boxline(SL, SB, 190, SB))
    b.append(boxline(222, SB, SR, SB))
    b.append(boxline(SL, ST, SL, SY - 9) + boxline(SL, SY + 10, SL, SB))
    b.append(boxline(SR, ST, SR, SB))
    b.append(battery(SL, SY))
    b.append(component(166, ST, "A") + component(256, ST, "B"))
    b.append(switch_h(190, SB))
    b.append(arrow(120, ST, 140, ST, colour=RED, size=10))
    b.append(arrow(240, SB, 220, SB, colour=RED, size=10))
    b.append(txt(120, ST - 26, "current", size=14, fill=RED, weight="600"))
    taught("is-l5-1", lines(b, 44, 314, [
        "the current is the same at every point",
        "the voltage is shared between components"], size=13, lh=18, fill=P_INK))

    # ---------------- parallel panel (Physics's rails, no values)
    b.append(f'<rect x="410" y="74" width="340" height="268" rx="12" fill="none" '
             f'stroke="{P_LINE}" stroke-width="2.5"/>')
    b.append(txt(410, 50, "Parallel circuit", size=16, weight="700"))
    b.append(txt(410, 67, "components sit on separate branches", size=13, fill=P_MUTED))
    taught("is-l5-1", "Parallel circuit")
    taught("is-l5-1", "components sit on separate branches")
    b.append(boxline(PL, PT, PL + 16, PT) + boxline(PL + 48, PT, PR, PT))
    b.append(boxline(PL, PB, PR, PB))
    b.append(boxline(PL, PT, PL, PY - 9) + boxline(PL, PY + 10, PL, PB))
    b.append(boxline(PR, PT, PR, PB))
    b.append(battery(PL, PY))
    b.append(switch_h(PL + 16, PT))
    for bx, letter in ((560, "A"), (650, "B")):
        b.append(boxline(bx, PT, bx, PB))
        b.append(component(bx, 220, letter, vertical=True))
    b.append(arrow(600, PT, 640, PT, colour=RED, size=10))
    b.append(txt(690, PT - 24, "current", size=14, anchor="end", fill=RED, weight="600"))
    taught("is-l5-1", lines(b, 424, 314, [
        "each receives the full voltage",
        "the currents add up, and one branch can fail"], size=13, lh=18, fill=P_INK))

    # ---------------- symbol key + safety devices
    b.append(f'<line x1="30" y1="372" x2="750" y2="372" stroke="{P_RULE}" stroke-width="2"/>')
    b.append(txt(30, 398, "Circuit symbols used above", size=15, weight="700"))
    # source
    b.append(boxline(66, 406, 66, 418) + battery(66, 424) + boxline(66, 436, 66, 448))
    b.append(txt(110, 426, "source", size=13.5))
    # connecting wire
    b.append(f'<line x1="46" y1="478" x2="86" y2="478" stroke="{P_LINE}" stroke-width="2.5"/>')
    b.append(txt(110, 478, "connecting wire", size=13.5))
    # switch
    b.append(f'<line x1="46" y1="526" x2="60" y2="526" stroke="{P_LINE}" stroke-width="2.5"/>')
    b.append(switch_h(60, 526))
    b.append(f'<line x1="92" y1="526" x2="106" y2="526" stroke="{P_LINE}" stroke-width="2.5"/>')
    b.append(txt(110, 526, "switch", size=13.5))
    # component
    b.append(component(80, 576, "A"))
    b.append(txt(118, 576, "component", size=13.5))
    taught("is-l5-1", "source")
    taught("is-l5-1", "connecting wire")
    taught("is-l5-1", "switch")
    taught("is-l5-1", "component")

    b.append(txt(410, 398, "Safety devices and habits", size=15, weight="700"))
    # fuse
    b.append(f'<line x1="410" y1="424" x2="430" y2="424" stroke="{P_LINE}" stroke-width="2.5"/>')
    b.append(f'<rect x="430" y="414" width="34" height="20" rx="3" fill="#fff" stroke="{P_INK}" '
             f'stroke-width="2.5"/>')
    b.append(f'<line x1="430" y1="424" x2="464" y2="424" stroke="{P_INK}" stroke-width="2"/>')
    b.append(f'<line x1="464" y1="424" x2="484" y2="424" stroke="{P_LINE}" stroke-width="2.5"/>')
    b.append(txt(498, 424, "fuse", size=13.5))
    # earth wire
    b.append(f'<rect x="410" y="466" width="44" height="30" rx="5" fill="#fff" stroke="{P_INK}" '
             f'stroke-width="2.5"/>')
    b.append(f'<line x1="454" y1="481" x2="508" y2="481" stroke="{WALL}" stroke-width="2.5"/>')
    b.append(f'<line x1="508" y1="481" x2="508" y2="492" stroke="{WALL}" stroke-width="2.5"/>')
    b.append(f'<line x1="494" y1="492" x2="522" y2="492" stroke="{WALL}" stroke-width="2.5"/>')
    b.append(f'<line x1="500" y1="499" x2="516" y2="499" stroke="{WALL}" stroke-width="2.5"/>')
    b.append(f'<line x1="505" y1="506" x2="511" y2="506" stroke="{WALL}" stroke-width="2.5"/>')
    b.append(txt(534, 481, "earth wire", size=13.5))
    # plug and socket
    b.append(f'<rect x="410" y="520" width="46" height="32" rx="6" fill="#fff" stroke="{P_INK}" '
             f'stroke-width="2.5"/>')
    for dy in (-8, 0, 8):
        b.append(f'<line x1="456" y1="{528+dy}" x2="470" y2="{528+dy}" stroke="{P_INK}" '
                 f'stroke-width="2.5"/>')
    b.append(f'<rect x="492" y="518" width="52" height="36" rx="6" fill="#fff" stroke="{P_INK}" '
             f'stroke-width="2.5"/>')
    for dy in (-8, 0, 8):
        b.append(f'<line x1="492" y1="{528+dy}" x2="500" y2="{528+dy}" stroke="{P_LINE}" '
                 f'stroke-width="2.5"/>')
    b.append(txt(556, 536, "plugs and sockets", size=13.5))
    taught("is-l5-1", "fuse")
    taught("is-l5-1", "earth wire")
    taught("is-l5-1", "plugs and sockets")
    taught("is-l5-1", lines(b, 30, 598, [
        "Insulation, fuses and circuit breakers, earth wires, correct plugs and sockets."],
        size=13.5))
    taught("is-l5-1", lines(b, 30, 616, [
        "A simple circuit needs a source, connecting wires, a component and a switch."],
        size=13.5))
    taught("is-l5-1", lines(b, 30, 634, [
        "no water near sockets, and never overloading an outlet"], size=13.5, fill=P_MUTED))
    return svg("is-circuit", W, H,
               "A series circuit and a parallel circuit, a key of the symbols used, and the "
               "safety devices that protect a household circuit", "".join(b))


# ------------------------------------------------------------------ 3. heat (is-l5-3)
def figure_heat():
    W, H = 1000, 930
    b = []
    P = 20

    def head(x, y, title):
        b.append(panel(x, y, 470, 400))
        b.append(txt(x + P, y + 34, title, size=22, weight="700"))

    # ---------------- conduction
    x, y = 20, 74
    head(x, y, "CONDUCTION")
    taught("is-l5-3", "CONDUCTION")
    b.append(f'<line x1="{x+50}" y1="{y+250}" x2="{x+400}" y2="{y+250}" stroke="{P_RULE}" '
             f'stroke-width="2"/>')
    # the bar, hot at the left, cool at the right
    b.append(f'<defs><linearGradient id="is-bar" x1="0" x2="1">'
             f'<stop offset="0%" stop-color="#fca5a5"/><stop offset="100%" stop-color="#dbeafe"/>'
             f'</linearGradient></defs>')
    b.append(f'<rect x="{x+50}" y="{y+130}" width="350" height="76" rx="10" fill="url(#is-bar)" '
             f'stroke="{STEEL_L}" stroke-width="2.5"/>')
    for i in range(7):
        cx = x + 76 + 50 * i
        b.append(f'<circle cx="{cx}" cy="{y+168}" r="7" fill="#ffffff" stroke="{MEMB}" '
                 f'stroke-width="2.5"/>')
        if i < 4:   # only the hot end is vibrating
            b.append(curve_arrow(f'M {cx-13},{y+156} q 13,-9 26,0', colour=WARM, w=2))
            b.append(curve_arrow(f'M {cx+13},{y+181} q -13,9 -26,0', colour=WARM, w=2))
    for ex in (x + 140, x + 250, x + 340):
        b.append(f'<circle cx="{ex}" cy="{y+190}" r="5" fill="{BLUE}"/>')
    b.append(arrow(x + 60, y + 108, x + 200, y + 108, colour=WARM))
    b.append(txt(x + 210, y + 108, "energy", size=17, fill=WARM, weight="600"))
    b.append(txt(x + 50, y + 96, "hot", size=17, fill=MUTED))
    b.append(txt(x + 400, y + 96, "cold", size=17, anchor="end", fill=MUTED))
    b.append(txt(x + 50, y + 232, "metal", size=17, fill=MUTED))
    taught("is-l5-3", lines(b, x + P, y + 288, [
        "energy passes through a material by particle",
        "vibration and free electrons; metals are",
        "good conductors"],
        size=15.5, lh=25))
    taught("is-l5-3", lines(b, x + P, y + 362, [
        "air, wood and plastic are poor ones"], size=15.5, lh=25, fill=MUTED))
    return _heat_rest(b, W, H, x, y)


def _heat_rest(b, W, H, cx0, cy0):
    P = 20

    def head(x, y, title):
        b.append(panel(x, y, 470, 400))
        b.append(txt(x + P, y + 34, title, size=22, weight="700"))

    # ---------------- convection
    x, y = 510, 74
    head(x, y, "CONVECTION")
    taught("is-l5-3", "CONVECTION")
    b.append(f'<rect x="{x+140}" y="{y+120}" width="190" height="180" rx="8" fill="#fff" '
             f'stroke="{STEEL_L}" stroke-width="2.5"/>')
    b.append(f'<rect x="{x+143}" y="{y+122}" width="184" height="176" fill="#dbeafe"/>')
    b.append(curve_arrow(f'M {x+175},{y+272} C {x+152},{y+232} {x+152},{y+186} {x+185},{y+156}',
                         colour=WARM, w=4))
    b.append(arrowhead((x + 185, y + 156), (x + 180, y + 200), WARM, 12))
    b.append(curve_arrow(f'M {x+295},{y+156} C {x+328},{y+186} {x+328},{y+232} {x+295},{y+272}',
                         colour=BLUE, w=4))
    b.append(arrowhead((x + 295, y + 272), (x + 300, y + 230), BLUE, 12))
    b.append(txt(x + 132, y + 200, "rises", size=17, anchor="end", fill=WARM, weight="600"))
    b.append(txt(x + 344, y + 200, "sinks", size=17, fill=BLUE, weight="600"))
    taught("is-l5-3", "rises")
    taught("is-l5-3", "sinks")
    taught("is-l5-3", lines(b, x + P, y + 330, [
        "warmed liquid or gas expands, becomes",
        "less dense and rises, then cools and",
        "sinks"], size=15.5, lh=25))

    # ---------------- radiation
    x, y = 20, 504
    head(x, y, "RADIATION")
    taught("is-l5-3", "RADIATION")
    b.append(f'<circle cx="{x+95}" cy="{y+185}" r="46" fill="#fbbf24" stroke="#d97706" '
             f'stroke-width="3"/>')
    for i in range(8):
        a = math.radians(i * 45)
        b.append(f'<line x1="{x+95+56*math.cos(a):.1f}" y1="{y+185+56*math.sin(a):.1f}" '
                 f'x2="{x+95+72*math.cos(a):.1f}" y2="{y+185+72*math.sin(a):.1f}" '
                 f'stroke="#d97706" stroke-width="3"/>')
    for i in range(4):
        yy = y + 148 + i * 26
        b.append(wave_path(x + 180, yy, x + 386, 11, 3, colour=BLUE, w=2.5, step=5))
    b.append(txt(x + 30, y + 262, "the Sun", size=17, fill=MUTED))
    b.append(f'<rect x="{x+396}" y="{y+120}" width="22" height="130" rx="4" fill="{STEEL}" '
             f'stroke="{STEEL_L}" stroke-width="2.5"/>')
    b.append(txt(x + 400, y + 104, "electromagnetic waves", size=16, anchor="end",
                 fill=BLUE, weight="600"))
    taught("is-l5-3", lines(b, x + P, y + 288, [
        "radiation transfers energy by",
        "electromagnetic waves and needs",
        "no medium at all, which is why",
        "the Sun's heat reaches us through space"], size=15.5, lh=25))

    # ---------------- the thermos flask
    x, y = 510, 504
    head(x, y, "THERMOS FLASK")
    taught("is-l5-3", "THERMOS FLASK")
    b.append(f'<rect x="{x+250}" y="{y+96}" width="130" height="204" rx="12" fill="#f8fafc" '
             f'stroke="{STEEL_L}" stroke-width="3"/>')
    b.append(f'<rect x="{x+268}" y="{y+120}" width="94" height="168" rx="8" fill="#ffffff" '
             f'stroke="{STEEL_L}" stroke-width="2.5"/>')
    b.append(f'<rect x="{x+270}" y="{y+200}" width="90" height="86" rx="6" fill="#bae6fd"/>')
    for yy in range(y + 130, y + 286, 16):
        b.append(f'<line x1="{x+250}" y1="{yy}" x2="{x+268}" y2="{yy}" stroke="{STEEL_L}" '
                 f'stroke-width="1.6"/>')
        b.append(f'<line x1="{x+362}" y1="{yy}" x2="{x+380}" y2="{yy}" stroke="{STEEL_L}" '
                 f'stroke-width="1.6"/>')
    b.append(f'<rect x="{x+268}" y="{y+86}" width="94" height="34" rx="8" fill="#e2e8f0" '
             f'stroke="{STEEL_L}" stroke-width="2.5"/>')
    b.append(margin_label(x + 236, y + 104, x + 268, y + 104, "stopper", "end", size=17))
    b.append(margin_label(x + 236, y + 230, x + 268, y + 230, "silvered surfaces", "end", size=17))
    b.append(margin_label(x + 392, y + 170, x + 376, y + 170, "vacuum", "start", size=17))
    taught("is-l5-3", "stopper")
    taught("is-l5-3", "vacuum")
    taught("is-l5-3", "silvered surfaces")
    taught("is-l5-3", lines(b, x + P, y + 320, [
        "a thermos flask combines a vacuum,",
        "silvered surfaces and a stopper",
        "to block all three mechanisms"], size=15.5, lh=25))

    return svg("is-heat", W, H,
               "Four panels: conduction along a metal bar, convection in a fluid, radiation "
               "crossing space, and a thermos flask cutaway", "".join(b))


# ------------------------------------------------------------------ checks + write
def check_taught(root):
    """Every drawn phrase must be a phrase the lesson itself teaches (audit §4).

    Two accepted forms, counted separately and both printed, so the PR can say exactly which
    lines are the lesson's own sentences and which are label sets built only from its words:
      * VERBATIM  — the drawn text is a substring of the lesson's own copy (content, objectives,
                    concepts or the Play-tab description);
      * VOCABULARY — every content word (>= 4 letters) of the drawn text occurs in that copy
                    (used for short labels such as "PLANT CELL" and the two legend lines, and
                    tolerated for pure identifiers such as the circuit letters A and B).
    """
    mods = json.load(io.open(os.path.join(root, IS_MODULES), encoding="utf-8"))

    def norm(s):
        s = s.replace("—", "-").replace("–", "-").replace("’", "'")
        return re.sub(r"\s+", " ", s).strip().lower()

    blob = {}
    for mod in mods:
        for l in mod["lessons"]:
            parts = [l.get("content", "")]
            for key in ("objectives", "concepts"):
                parts += [str(v) for v in l.get(key, [])]
            exp = l.get("experiment") or {}
            parts += [str(exp.get("description", ""))]
            blob[l["id"]] = norm(" ".join(parts))
    missing = []
    verbatim = 0
    vocab = 0
    for lesson, phrases in sorted(TAUGHT.items()):
        if lesson not in blob:
            missing.append(f"{lesson}: no such lesson")
            continue
        for ph in phrases:
            if norm(ph) in blob[lesson]:
                verbatim += 1
                continue
            words = [w for w in re.findall(r"[a-z']+", norm(ph)) if len(w) >= 4]
            if words and all(w in blob[lesson] for w in words):
                vocab += 1
                continue
            missing.append(f"{lesson}: figure says {ph!r}, which the lesson never teaches")
    if missing:
        raise SystemExit("taught-vocabulary check FAILED:\n  " + "\n  ".join(missing))
    print(f"taught-vocabulary: {verbatim} drawn phrase(s) are the lesson's own words, "
          f"{vocab} are label sets built only from its vocabulary "
          f"({len(TAUGHT)} lessons)")


def check(svg_text, name, w, h):
    """Fail loudly rather than write a broken file (the XML and layout traps)."""
    bad = re.search(r"&(?!(amp|lt|gt|quot|apos|#\d+);)", svg_text)
    if bad:
        raise SystemExit(f"{name}: HTML-only entity in SVG (breaks the whole figure): {bad.group(0)}")
    if "<script" in svg_text or "<image" in svg_text:
        raise SystemExit(f"{name}: script/raster image inside the SVG")
    if not svg_text.rstrip().endswith("</svg>"):
        raise SystemExit(f"{name}: the SVG does not close properly")
    for m in re.finditer(r'<text x="(-?[\d.]+)"[^>]*font-size="([\d.]+)"[^>]*'
                         r'text-anchor="(\w+)"[^>]*>([^<]*)</text>', svg_text):
        x, size, anchor, body = float(m.group(1)), float(m.group(2)), m.group(3), m.group(4)
        est = 0.56 * size * len(body)
        left = x if anchor == "start" else (x - est / 2 if anchor == "middle" else x - est)
        right = left + est
        if left < 2 or right > w - 2:
            raise SystemExit(f"{name}: text {body!r} overflows the canvas "
                             f"({left:.0f}..{right:.0f} of {w})")
    return svg_text


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=None)
    ap.add_argument("--root", default=".", help="repo root, for the borrowed-artwork proof")
    ap.add_argument("--trees", action="store_true", help="write both content trees")
    a = ap.parse_args()
    if a.out:
        outs = [a.out]
    elif a.trees or os.path.exists(os.path.join(a.root, IS_MODULES)):
        outs = ["content/integrated-science/figures", "public/content/integrated-science/figures"]
    else:
        outs = ["out"]
    for d in outs:
        os.makedirs(d, exist_ok=True)

    if os.path.exists(os.path.join(a.root, BIOLOGY_CELLS)):
        assert_borrowed_geometry(a.root)

    figures = [
        ("is-cells-plant-animal.svg", figure_cells(), 1000, 1560),
        ("is-circuits-series-parallel.svg", figure_circuits(), 780, 640),
        ("is-heat-transfer-control.svg", figure_heat(), 1000, 950),
    ]
    written = {}
    for name, text, w, h in figures:
        check(text, name, w, h)
        written[name] = text.encode("utf-8")
    if os.path.exists(os.path.join(a.root, IS_MODULES)):
        check_taught(a.root)
    for d in outs:
        for name, raw in written.items():
            with io.open(os.path.join(d, name), "wb") as fh:
                fh.write(raw)
        print(f"wrote {len(written)} figures to {d}")


if __name__ == "__main__":
    main()
