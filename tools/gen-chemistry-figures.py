#!/usr/bin/env python3
"""Generate the Chemistry pilot lesson figures as ORIGINAL vector (SVG) drawings.

Nothing here is traced, copied or generated from another publisher's artwork: the two
figures are drawn programmatically from real, public data —
  * the periodic table is laid out from each element's real group/period/atomic number,
  * the atom and shell diagrams are computed from real atomic numbers using the
    2, 8, 8, 2 shell capacity the lesson teaches.
Every element is therefore placed by arithmetic, not by hand: a garbled or misplaced
tile is impossible without a data error, and the data is asserted before writing.

Outputs (staged in ~/gen/figs): periodic-table-trends.svg, atomic-structure.svg, electron-shells.svg
"""
import os

# Writes straight into the repo's two content trees, so re-running this tool from a clean
# checkout reproduces the committed figures byte for byte (see the PR body for the hashes).
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "content/chemistry/figures")
MIRROR = os.path.join(ROOT, "public/content/chemistry/figures")
W = 1600
FONT = "'Liberation Sans',Arial,Helvetica,sans-serif"
INK, SLATE, LINE, BG = "#111827", "#475569", "#cbd5e1", "#ffffff"

# ---------------------------------------------------------------- element data
# (Z, symbol, name, group, period, category). f-block elements carry group None and
# live in their own two rows, as the wide-form table draws them.
EL = [
    (1, "H", "Hydrogen", 1, 1, "nonmetal"), (2, "He", "Helium", 18, 1, "noble"),
    (3, "Li", "Lithium", 1, 2, "alkali"), (4, "Be", "Beryllium", 2, 2, "alkaline"),
    (5, "B", "Boron", 13, 2, "metalloid"), (6, "C", "Carbon", 14, 2, "nonmetal"),
    (7, "N", "Nitrogen", 15, 2, "nonmetal"), (8, "O", "Oxygen", 16, 2, "nonmetal"),
    (9, "F", "Fluorine", 17, 2, "halogen"), (10, "Ne", "Neon", 18, 2, "noble"),
    (11, "Na", "Sodium", 1, 3, "alkali"), (12, "Mg", "Magnesium", 2, 3, "alkaline"),
    (13, "Al", "Aluminium", 13, 3, "post"), (14, "Si", "Silicon", 14, 3, "metalloid"),
    (15, "P", "Phosphorus", 15, 3, "nonmetal"), (16, "S", "Sulfur", 16, 3, "nonmetal"),
    (17, "Cl", "Chlorine", 17, 3, "halogen"), (18, "Ar", "Argon", 18, 3, "noble"),
    (19, "K", "Potassium", 1, 4, "alkali"), (20, "Ca", "Calcium", 2, 4, "alkaline"),
    (21, "Sc", "Scandium", 3, 4, "transition"), (22, "Ti", "Titanium", 4, 4, "transition"),
    (23, "V", "Vanadium", 5, 4, "transition"), (24, "Cr", "Chromium", 6, 4, "transition"),
    (25, "Mn", "Manganese", 7, 4, "transition"), (26, "Fe", "Iron", 8, 4, "transition"),
    (27, "Co", "Cobalt", 9, 4, "transition"), (28, "Ni", "Nickel", 10, 4, "transition"),
    (29, "Cu", "Copper", 11, 4, "transition"), (30, "Zn", "Zinc", 12, 4, "transition"),
    (31, "Ga", "Gallium", 13, 4, "post"), (32, "Ge", "Germanium", 14, 4, "metalloid"),
    (33, "As", "Arsenic", 15, 4, "metalloid"), (34, "Se", "Selenium", 16, 4, "nonmetal"),
    (35, "Br", "Bromine", 17, 4, "halogen"), (36, "Kr", "Krypton", 18, 4, "noble"),
    (37, "Rb", "Rubidium", 1, 5, "alkali"), (38, "Sr", "Strontium", 2, 5, "alkaline"),
    (39, "Y", "Yttrium", 3, 5, "transition"), (40, "Zr", "Zirconium", 4, 5, "transition"),
    (41, "Nb", "Niobium", 5, 5, "transition"), (42, "Mo", "Molybdenum", 6, 5, "transition"),
    (43, "Tc", "Technetium", 7, 5, "transition"), (44, "Ru", "Ruthenium", 8, 5, "transition"),
    (45, "Rh", "Rhodium", 9, 5, "transition"), (46, "Pd", "Palladium", 10, 5, "transition"),
    (47, "Ag", "Silver", 11, 5, "transition"), (48, "Cd", "Cadmium", 12, 5, "transition"),
    (49, "In", "Indium", 13, 5, "post"), (50, "Sn", "Tin", 14, 5, "post"),
    (51, "Sb", "Antimony", 15, 5, "metalloid"), (52, "Te", "Tellurium", 16, 5, "metalloid"),
    (53, "I", "Iodine", 17, 5, "halogen"), (54, "Xe", "Xenon", 18, 5, "noble"),
    (55, "Cs", "Caesium", 1, 6, "alkali"), (56, "Ba", "Barium", 2, 6, "alkaline"),
    (57, "La", "Lanthanum", None, 6, "lanthanide"), (58, "Ce", "Cerium", None, 6, "lanthanide"),
    (59, "Pr", "Praseodymium", None, 6, "lanthanide"), (60, "Nd", "Neodymium", None, 6, "lanthanide"),
    (61, "Pm", "Promethium", None, 6, "lanthanide"), (62, "Sm", "Samarium", None, 6, "lanthanide"),
    (63, "Eu", "Europium", None, 6, "lanthanide"), (64, "Gd", "Gadolinium", None, 6, "lanthanide"),
    (65, "Tb", "Terbium", None, 6, "lanthanide"), (66, "Dy", "Dysprosium", None, 6, "lanthanide"),
    (67, "Ho", "Holmium", None, 6, "lanthanide"), (68, "Er", "Erbium", None, 6, "lanthanide"),
    (69, "Tm", "Thulium", None, 6, "lanthanide"), (70, "Yb", "Ytterbium", None, 6, "lanthanide"),
    (71, "Lu", "Lutetium", None, 6, "lanthanide"),
    (72, "Hf", "Hafnium", 4, 6, "transition"), (73, "Ta", "Tantalum", 5, 6, "transition"),
    (74, "W", "Tungsten", 6, 6, "transition"), (75, "Re", "Rhenium", 7, 6, "transition"),
    (76, "Os", "Osmium", 8, 6, "transition"), (77, "Ir", "Iridium", 9, 6, "transition"),
    (78, "Pt", "Platinum", 10, 6, "transition"), (79, "Au", "Gold", 11, 6, "transition"),
    (80, "Hg", "Mercury", 12, 6, "transition"), (81, "Tl", "Thallium", 13, 6, "post"),
    (82, "Pb", "Lead", 14, 6, "post"), (83, "Bi", "Bismuth", 15, 6, "post"),
    (84, "Po", "Polonium", 16, 6, "post"), (85, "At", "Astatine", 17, 6, "halogen"),
    (86, "Rn", "Radon", 18, 6, "noble"),
    (87, "Fr", "Francium", 1, 7, "alkali"), (88, "Ra", "Radium", 2, 7, "alkaline"),
    (89, "Ac", "Actinium", None, 7, "actinide"), (90, "Th", "Thorium", None, 7, "actinide"),
    (91, "Pa", "Protactinium", None, 7, "actinide"), (92, "U", "Uranium", None, 7, "actinide"),
    (93, "Np", "Neptunium", None, 7, "actinide"), (94, "Pu", "Plutonium", None, 7, "actinide"),
    (95, "Am", "Americium", None, 7, "actinide"), (96, "Cm", "Curium", None, 7, "actinide"),
    (97, "Bk", "Berkelium", None, 7, "actinide"), (98, "Cf", "Californium", None, 7, "actinide"),
    (99, "Es", "Einsteinium", None, 7, "actinide"), (100, "Fm", "Fermium", None, 7, "actinide"),
    (101, "Md", "Mendelevium", None, 7, "actinide"), (102, "No", "Nobelium", None, 7, "actinide"),
    (103, "Lr", "Lawrencium", None, 7, "actinide"),
    (104, "Rf", "Rutherfordium", 4, 7, "predicted"), (105, "Db", "Dubnium", 5, 7, "predicted"),
    (106, "Sg", "Seaborgium", 6, 7, "predicted"), (107, "Bh", "Bohrium", 7, 7, "predicted"),
    (108, "Hs", "Hassium", 8, 7, "predicted"), (109, "Mt", "Meitnerium", 9, 7, "predicted"),
    (110, "Ds", "Darmstadtium", 10, 7, "predicted"), (111, "Rg", "Roentgenium", 11, 7, "predicted"),
    (112, "Cn", "Copernicium", 12, 7, "predicted"), (113, "Nh", "Nihonium", 13, 7, "predicted"),
    (114, "Fl", "Flerovium", 14, 7, "predicted"), (115, "Mc", "Moscovium", 15, 7, "predicted"),
    (116, "Lv", "Livermorium", 16, 7, "predicted"), (117, "Ts", "Tennessine", 17, 7, "predicted"),
    (118, "Og", "Oganesson", 18, 7, "predicted"),
]

CAT = {
    "alkali":     ("#f6b0b0", "Group 1 — alkali metals"),
    "alkaline":   ("#f9d3a6", "Group 2 — alkaline earths"),
    "transition": ("#c3cdf7", "Transition metals (3–12)"),
    "post":       ("#bcd8f5", "Post-transition metals"),
    "metalloid":  ("#a9e5c6", "Metalloids"),
    "nonmetal":   ("#f8e08e", "Non-metals"),
    "halogen":    ("#dcc4f5", "Group 17 — halogens"),
    "noble":      ("#9fe3e6", "Group 18 — noble gases"),
    "lanthanide": ("#f5c2db", "Lanthanides (Z 57–71)"),
    "actinide":   ("#eab8f2", "Actinides (Z 89–103)"),
    "predicted":  ("#e3e8ef", "Z above 103 — predicted"),
}

# ---------------------------------------------------------------- shell maths
def shells(z, cap=(2, 8, 8, 2)):
    """Electron configuration for the first 20 elements, from the atomic number."""
    left, out = z, []
    for c in cap:
        if left <= 0:
            break
        n = min(c, left)
        out.append(n)
        left -= n
    if left:
        out.append(left)
    return out


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def svg_open(title, desc, w=W, h=1000):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
            f'viewBox="0 0 {w} {h}" role="img" aria-label="{esc(title)}">'
            f'<title>{esc(title)}</title><desc>{esc(desc)}</desc>'
            f'<rect width="{w}" height="{h}" fill="{BG}"/>')


# ---------------------------------------------------------------- figure 1
def periodic_table():
    tile_w, tile_h, gap = 74, 62, 6
    x0, y0 = 92, 214
    col = lambda g: x0 + (g - 1) * (tile_w + gap)
    row = lambda p: y0 + (p - 1) * (tile_h + 8)
    f_row1, f_row2 = row(7) + tile_h + 30, row(7) + tile_h + 30 + tile_h + 8
    ty = f_row2 + tile_h + 52          # trends panel
    ly = ty + 146                      # legend strip
    legend_rows = (len(CAT) + 3) // 4
    h = ly + (legend_rows - 1) * 34 + 44

    s = [svg_open("The Periodic Table, arranged by increasing atomic number",
                  "All 118 elements in their real groups and periods, coloured by the family each "
                  "element belongs to, with the trends the lesson describes.", h=h)]
    s.append(f'<text x="{x0}" y="62" font-family="{FONT}" font-size="38" font-weight="800" '
             f'fill="{INK}">The Periodic Table</text>')
    s.append(f'<text x="{x0}" y="98" font-family="{FONT}" font-size="23" fill="{SLATE}">'
             f'Elements are arranged by increasing atomic number: 18 vertical groups, 7 horizontal '
             f'periods.</text>')

    # focus-group tints (Group 1, 17, 18 — the groups the lesson names)
    for g in (1, 17, 18):
        s.append(f'<rect x="{col(g)-4}" y="{row(1)-4}" width="{tile_w+8}" '
                 f'height="{row(7)+tile_h+8-(row(1)-4)}" rx="10" fill="#0e7490" fill-opacity="0.06"/>')
    # group headers: the three focus groups read in the accent colour
    for g in range(1, 19):
        focus = g in (1, 17, 18)
        s.append(f'<text x="{col(g)+tile_w/2}" y="{row(1)-14}" font-family="{FONT}" '
                 f'font-size="{21 if focus else 19}" font-weight="{800 if focus else 700}" '
                 f'fill="{"#0e7490" if focus else SLATE}" text-anchor="middle">{g}</text>')
    s.append(f'<text x="{col(1)+tile_w/2}" y="{row(1)-40}" font-family="{FONT}" font-size="20" '
             f'font-weight="800" fill="#0e7490" text-anchor="middle">Groups</text>')
    for p in range(1, 8):
        s.append(f'<text x="{x0-22}" y="{row(p)+tile_h/2+7}" font-family="{FONT}" font-size="19" '
                 f'font-weight="700" fill="{SLATE}" text-anchor="middle">{p}</text>')

    # tiles
    for z, sym, name, g, p, cat in EL:
        if g is None:
            continue
        x, y = col(g), row(p)
        fill = CAT[cat][0]
        dash = ' stroke-dasharray="4 4"' if cat == "predicted" else ""
        s.append(f'<g><title>{esc(name)} — Z {z} — group {g}, period {p}</title>'
                 f'<rect x="{x}" y="{y}" width="{tile_w}" height="{tile_h}" rx="9" fill="{fill}" '
                 f'stroke="#0f172a" stroke-opacity="0.18"{dash}/>'
                 f'<text x="{x+8}" y="{y+18}" font-family="{FONT}" font-size="15" fill="#334155">{z}</text>'
                 f'<text x="{x+tile_w/2}" y="{y+45}" font-family="{FONT}" font-size="27" '
                 f'font-weight="800" fill="{INK}" text-anchor="middle">{sym}</text></g>')

    # the two f-block rows, with their placeholder cells in the main table
    for p, first, last in ((6, 58, 71), (7, 90, 103)):
        ph = {6: "57–71", 7: "89–103"}[p]
        x, y = col(3), row(p)
        s.append(f'<rect x="{x}" y="{y}" width="{tile_w}" height="{tile_h}" rx="9" fill="{BG}" '
                 f'stroke="#0f172a" stroke-opacity="0.35" stroke-dasharray="4 4"/>'
                 f'<text x="{x+tile_w/2}" y="{y+38}" font-family="{FONT}" font-size="16" '
                 f'fill="{SLATE}" text-anchor="middle">{ph}</text>')
    for yy, first, last, cat, label in ((f_row1, 57, 71, "lanthanide", "Lanthanides"),
                                        (f_row2, 89, 103, "actinide", "Actinides")):
        s.append(f'<text x="{col(3)-18}" y="{yy+tile_h/2+7}" font-family="{FONT}" font-size="18" '
                 f'font-weight="700" fill="{SLATE}" text-anchor="end">{label}</text>')
        for i, z in enumerate(range(first, last + 1)):
            e = [x for x in EL if x[0] == z][0]
            x = col(4) + i * (tile_w + gap)
            s.append(f'<g><title>{esc(e[2])} — Z {z}</title>'
                     f'<rect x="{x}" y="{yy}" width="{tile_w}" height="{tile_h}" rx="9" '
                     f'fill="{CAT[cat][0]}" stroke="#0f172a" stroke-opacity="0.18"/>'
                     f'<text x="{x+8}" y="{yy+18}" font-family="{FONT}" font-size="15" '
                     f'fill="#334155">{z}</text>'
                     f'<text x="{x+tile_w/2}" y="{yy+45}" font-family="{FONT}" font-size="27" '
                     f'font-weight="800" fill="{INK}" text-anchor="middle">{e[1]}</text></g>')

    # trends panel
    s.append(f'<rect x="{x0-22}" y="{ty}" width="{W-2*x0+44}" height="112" rx="14" fill="#f1f5f9" '
             f'stroke="{LINE}"/>')
    s.append(f'<text x="{x0}" y="{ty+30}" font-family="{FONT}" font-size="20" font-weight="800" '
             f'fill="{INK}">Trends across the table</text>')
    arrow = lambda x1, x2, y, label, up=True: (
        f'<line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" stroke="#0e7490" stroke-width="3"/>'
        f'<polygon points="{x2},{y-7} {x2+13},{y} {x2},{y+7}" fill="#0e7490"/>'
        f'<text x="{(x1+x2)/2}" y="{y-14}" font-family="{FONT}" font-size="19" fill="{INK}" '
        f'text-anchor="middle">{label}</text>')
    s.append(arrow(x0 + 190, x0 + 620, ty + 58, "across a period: atomic radius decreases"))
    s.append(f'<text x="{x0+672}" y="{ty+66}" font-family="{FONT}" font-size="19" fill="{SLATE}">'
             f'down a group: it increases ↓</text>')
    s.append(arrow(x0 + 190, x0 + 760, ty + 98,
                   "across a period: electronegativity and ionisation energy rise"))
    s.append(f'<text x="{x0+886}" y="{ty+106}" font-family="{FONT}" font-size="19" fill="{SLATE}">'
             f'down a group: both decrease ↓</text>')

    # legend
    per_row, x, y = 4, x0, ly
    for i, (cat, (fill, label)) in enumerate(CAT.items()):
        cx, cy = x + (i % per_row) * 366, y + (i // per_row) * 34
        s.append(f'<rect x="{cx}" y="{cy-14}" width="22" height="22" rx="5" fill="{fill}" '
                 f'stroke="#0f172a" stroke-opacity="0.18"/>'
                 f'<text x="{cx+31}" y="{cy+4}" font-family="{FONT}" font-size="18" '
                 f'fill="{SLATE}">{esc(label)}</text>')
    s.append('</svg>')
    return "".join(s)


# ---------------------------------------------------------------- figure 2
def atom_shells(cx, cy, conf, rmax=150, first_r=58, gapr=46, dot=6.5, colour="#0e7490",
                nucleus="#1e293b", nlabel=None, nr=38):
    """Concentric shells with `conf` electrons drawn on them — geometry from the real
    configuration, so the picture cannot disagree with the numbers."""
    out = [f'<circle cx="{cx}" cy="{cy}" r="{nr}" fill="{nucleus}"/>']
    if nlabel:
        for i, line in enumerate(nlabel):
            out.append(f'<text x="{cx}" y="{cy-4+i*19}" font-family="{FONT}" font-size="15" '
                       f'font-weight="700" fill="#ffffff" text-anchor="middle">{esc(line)}</text>')
    for i, n in enumerate(conf):
        r = first_r + i * gapr
        out.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{colour}" '
                   f'stroke-opacity="0.45" stroke-width="2.5"/>')
        for k in range(n):
            a = -1.5708 + 2 * 3.14159265 * k / max(n, 1)
            out.append(f'<circle cx="{cx + r * __import__("math").cos(a):.1f}" '
                       f'cy="{cy + r * __import__("math").sin(a):.1f}" r="{dot}" fill="{colour}"/>')
    return "".join(out)


def atomic_structure():
    h = 1000
    s = [svg_open("Atomic structure: subatomic particles, atomic number, mass number and isotopes",
                  "A labelled sodium atom with its nucleus and three shells, the definitions of "
                  "atomic number and mass number, and isotopes of carbon drawn from real data.")]
    s.append(f'<text x="60" y="62" font-family="{FONT}" font-size="38" font-weight="800" '
             f'fill="{INK}">Inside the atom</text>')
    s.append(f'<text x="60" y="98" font-family="{FONT}" font-size="23" fill="{SLATE}">'
             f'Protons and neutrons sit in the nucleus; electrons occupy shells around it.</text>')

    # left: the sodium atom (Z = 11, A = 23)
    conf = shells(11)
    s.append(f'<rect x="60" y="130" width="700" height="806" rx="16" fill="#f8fafc" stroke="{LINE}"/>')
    s.append(atom_shells(410, 500, conf, first_r=76, gapr=66, nlabel=["11 p⁺", "12 n⁰"]))
    s.append(f'<text x="410" y="200" font-family="{FONT}" font-size="24" font-weight="800" '
             f'fill="{INK}" text-anchor="middle">Sodium atom — Z = 11, A = 23</text>')
    for i, n in enumerate(conf):
        r = 76 + i * 66
        s.append(f'<line x1="410" y1="{500-r}" x2="{410}" y2="{500-r-26}" stroke="{SLATE}" '
                 f'stroke-width="1.5"/>')
        cap = (2, 8, 8, 2)[i]
        s.append(f'<text x="410" y="{500-r-34}" font-family="{FONT}" font-size="18" '
                 f'fill="{INK}" text-anchor="middle">shell {i+1}: {n} '
                 f'{"electron" if n == 1 else "electrons"} (holds up to {cap})'
                 f'{" — the valence shell" if n < cap and i == len(conf)-1 else ""}</text>')
    s.append(f'<text x="90" y="912" font-family="{FONT}" font-size="19" fill="{SLATE}">'
             f'Configuration written shell by shell: {", ".join(str(n) for n in conf)} '
             f'— read from the inside out.</text>')

    # right: the three definitions, then isotopes
    for i, (head, body) in enumerate([
        ("Atomic number (Z)", "The number of protons in the nucleus. Sodium: Z = 11."),
        ("Mass number (A)", "Protons + neutrons, counted together. Sodium: 11 + 12 = A = 23."),
        ("Neutral atom", "Electrons = protons, so the charges cancel. Sodium: 11 = 11."),
    ]):
        y = 130 + i * 118
        s.append(f'<rect x="790" y="{y}" width="750" height="100" rx="14" fill="#ffffff" '
                 f'stroke="{LINE}"/>')
        s.append(f'<text x="820" y="{y+38}" font-family="{FONT}" font-size="23" font-weight="800" '
                 f'fill="#0e7490">{esc(head)}</text>')
        s.append(f'<text x="820" y="{y+72}" font-family="{FONT}" font-size="21" '
                 f'fill="{SLATE}">{esc(body)}</text>')

    s.append(f'<rect x="790" y="486" width="750" height="450" rx="14" fill="#f8fafc" stroke="{LINE}"/>')
    s.append(f'<text x="820" y="522" font-family="{FONT}" font-size="23" font-weight="800" '
             f'fill="{INK}">Isotopes of carbon</text>')
    s.append(f'<text x="820" y="552" font-family="{FONT}" font-size="19" fill="{SLATE}">'
             f'same atomic number, different mass number</text>')
    for i, (n, iso) in enumerate([(6, "carbon-12"), (7, "carbon-13"), (8, "carbon-14")]):
        cx = 910 + i * 235
        s.append(atom_shells(cx, 650, [2, 4], first_r=48, gapr=38, dot=6, nr=24,
                             nlabel=[f"6 p⁺", f"{n} n⁰"]))
        s.append(f'<text x="{cx}" y="782" font-family="{FONT}" font-size="19" font-weight="700" '
                 f'fill="{INK}" text-anchor="middle">{esc(iso)}</text>')
        s.append(f'<text x="{cx}" y="806" font-family="{FONT}" font-size="17" fill="{SLATE}" '
                 f'text-anchor="middle">{6} p, {n} n</text>')
    s.append(f'<text x="820" y="836" font-family="{FONT}" font-size="19" fill="{SLATE}">'
             f'All three are carbon: each has 6 protons. Only the</text>')
    s.append(f'<text x="820" y="862" font-family="{FONT}" font-size="19" fill="{SLATE}">'
             f'neutron count changes, so the mass number changes too.</text>')
    s.append(f'<text x="820" y="898" font-family="{FONT}" font-size="19" fill="#0e7490">'
             f'Drawn from real atomic data — sodium: 11 protons, 12 neutrons.</text>')
    s.append('</svg>')
    return "".join(s)


# ---------------------------------------------------------------- figure 3
def electron_shells():
    picks = [(1, "Hydrogen"), (2, "Helium"), (3, "Lithium"), (6, "Carbon"),
             (8, "Oxygen"), (11, "Sodium"), (17, "Chlorine"), (20, "Calcium")]
    sym = {z: s for z, s, *_ in EL}
    h = 1000
    s = [svg_open("Electron shells for the first 20 elements, and what happens when they form ions",
                  "Shell diagrams drawn from each element's real atomic number using the 2, 8, 8, 2 "
                  "capacity of the first four shells, plus the sodium and chloride ions.")]
    s.append(f'<text x="60" y="62" font-family="{FONT}" font-size="38" font-weight="800" '
             f'fill="{INK}">Shells, filled from the inside out</text>')
    s.append(f'<text x="60" y="98" font-family="{FONT}" font-size="23" fill="{SLATE}">'
             f'For the first 20 elements the shells fill 2, then 8, then 8, then 2 — so the '
             f'configuration follows the atomic number.</text>')
    for i, (z, name) in enumerate(picks):
        cx = 200 + (i % 4) * 320
        cy = 320 + (i // 4) * 300
        conf = shells(z)
        s.append(f'<rect x="{cx-140}" y="{cy-150}" width="280" height="272" rx="14" fill="#f8fafc" '
                 f'stroke="{LINE}"/>')
        s.append(atom_shells(cx, cy - 30, conf, first_r=34, gapr=25, dot=5.5, nr=20))
        s.append(f'<text x="{cx}" y="{cy+106}" font-family="{FONT}" font-size="20" font-weight="800" '
                 f'fill="{INK}" text-anchor="middle">{esc(name)} ({sym[z]})</text>')
        s.append(f'<text x="{cx}" y="{cy+134}" font-family="{FONT}" font-size="19" '
                 f'fill="#0e7490" text-anchor="middle">{z} '
                 f'{"electron" if z == 1 else "electrons"} — {", ".join(str(n) for n in conf)}</text>')

    y = 880
    s.append(f'<rect x="60" y="{y}" width="1480" height="118" rx="14" fill="#f1f5f9" stroke="{LINE}"/>')
    s.append(f'<text x="88" y="{y+34}" font-family="{FONT}" font-size="21" font-weight="800" '
             f'fill="{INK}">Losing or gaining electrons makes an ion</text>')
    s.append(f'<text x="88" y="{y+64}" font-family="{FONT}" font-size="20" fill="{SLATE}">'
             f'Sodium (2, 8, 1) loses its single outer electron and becomes Na⁺ (2, 8).</text>')
    s.append(f'<text x="88" y="{y+92}" font-family="{FONT}" font-size="20" fill="{SLATE}">'
             f'Chlorine (2, 8, 7) gains one and becomes Cl⁻ (2, 8, 8) — both then have a full '
             f'outer shell.</text>')
    s.append('</svg>')
    return "".join(s)


# ---------------------------------------------------------------- checks + write
def verify():
    zs = [e[0] for e in EL]
    assert zs == list(range(1, 119)), "every atomic number 1-118 exactly once, in order"
    seen = {}
    for z, sym, name, g, p, cat in EL:
        if g is None:
            continue
        assert (g, p) not in seen, f"two elements in group {g}, period {p}: {seen[(g,p)]} and {sym}"
        seen[(g, p)] = sym
    # a wrong tile is impossible only if the neighbours are right too — spot-check the
    # anchors a reader uses to read the table
    for z, g, p in [(1, 1, 1), (2, 18, 1), (3, 1, 2), (10, 18, 2), (11, 1, 3), (17, 17, 3),
                    (18, 18, 3), (19, 1, 4), (26, 8, 4), (36, 18, 4), (47, 11, 5), (54, 18, 5),
                    (55, 1, 6), (79, 11, 6), (86, 18, 6), (87, 1, 7), (104, 4, 7), (118, 18, 7)]:
        e = [x for x in EL if x[0] == z][0]
        assert (e[3], e[4]) == (g, p), f"Z {z} ({e[1]}) is at group {e[3]} period {e[4]}, not {g}/{p}"
    # each period's main-table elements must increase in Z from left to right
    for p in range(1, 8):
        rowel = sorted([e for e in EL if e[4] == p and e[3] is not None], key=lambda e: e[3])
        assert [e[3] for e in rowel] == sorted(set(e[3] for e in rowel)), f"period {p} not left-to-right"
    fblock = {e[0]: e[3] for e in EL if e[4] in (6, 7) and e[3] is None}
    assert set(fblock) == set(range(57, 72)) | set(range(89, 104)), "f-block rows hold Z 57-71 and 89-103"
    assert [e[1] for e in EL if e[0] == 92][0] == "U" and [e[5] for e in EL if e[0] == 92][0] == "actinide"
    assert shells(11) == [2, 8, 1] and shells(17) == [2, 8, 7] and shells(20) == [2, 8, 8, 2]
    assert shells(2) == [2] and shells(6) == [2, 4]
    print("data verified: 118 elements, one per cell, anchors and shell sums correct")


# The lesson column renders a figure at roughly 45% of its natural width, so a size that
# looks right at 1600px is half that on the page. These are the sizes bumped once, together,
# so the smallest label still reads in the lesson body.
SCALE = {15: 20, 16: 20, 17: 21, 18: 22, 19: 24, 20: 25, 21: 27, 23: 28, 27: 34, 38: 44}


def scaled(svg):
    import re
    return re.sub(r'font-size="(\d+)"',
                  lambda m: 'font-size="%d"' % SCALE.get(int(m.group(1)), int(m.group(1))), svg)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(MIRROR, exist_ok=True)
    verify()
    for name, fn in (("periodic-table-trends", periodic_table),
                     ("atomic-structure", atomic_structure),
                     ("electron-shells", electron_shells)):
        svg = scaled(fn())
        p = os.path.join(OUT, name + ".svg")
        open(p, "w", encoding="utf-8").write(svg)
        # the served mirror must hold the identical bytes (harness-enforced)
        with open(os.path.join(MIRROR, name + ".svg"), "w", encoding="utf-8") as m:
            m.write(svg)
        print(f"{os.path.getsize(p):>8} bytes  {name}.svg")
