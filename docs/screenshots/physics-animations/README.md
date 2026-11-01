# Motion proof — the three animated Physics figures (answers #183)

The figures contract's moving half, proved in pixels. Everything here is throwaway
local evidence: a production build (`npm run build`), served from `dist/` on an owned
port (4391, never the shared 4173), with **one line of `dist/` only** spliced to open
the purchase gate (`hasAccess -> true`) so the gated figure could be photographed. The
splice was reverted in the same session (`cp` of the pre-splice bytes back, and the
original gate line re-asserted) and **no `src/` file was ever touched for these shots**.

## What was measured

Each frame was taken with `agent-browser --session sims2`, after an eval that scrolls the
figure to `top=70` and **returns the position it read back** — a frame is only trusted when
that read-back says the figure is on screen. The frames are viewport frames: an element
screenshot of this lazy-loaded `<img>` comes back blank (852x430 of white), which is a trap
that would have "proved" two identical, empty frames.

DOM read-back on the pendulum lesson (before any screenshot):

    figures=1 | /content/physics/figures/pendulum-oscillation.svg
      nat=780x430 disp=852 alt="A simple pendulum hanging from a fixed clamp, swinging 15 de..."

`curl -sI` against the served build (each one `HTTP/1.1 200 OK`, `Content-Type: image/svg+xml`):

    /content/physics/figures/pendulum-oscillation.svg      Content-Length: 6170
    /content/physics/figures/transverse-wave-propagation.svg Content-Length: 9146
    /content/physics/figures/projectile-motion.svg         Content-Length: 10013
    /content/physics/figures/motion-graphs.svg             Content-Length: 9248   (the static control)

## The frames

| file | md5 | bytes |
|---|---|---|
| `pendulum-a.png` | c62901af560a74b098161150574ab13a | 98791 |
| `pendulum-b.png` | d822494baa879705e5d118d8753d0531 | 98855 |
| `pendulum-c.png` | a53f05264c9b4f6420b663fad4957fec | 99859 |
| `static-control-a.png` | f4f31e1afb34f78fb96f14bedba0f09e | 84302 |
| `static-control-b.png` | f4f31e1afb34f78fb96f14bedba0f09e | 84302 |
| `static-control-c.png` | f4f31e1afb34f78fb96f14bedba0f09e | 84302 |
| `wave-a.png` | e50f63e706721d3b616447ac2def7da2 | 91456 |
| `wave-b.png` | d982d0797fce95903c86d55bc8e28741 | 91580 |
| `wave-c.png` | 170f26871ff4a5bd9b29364c931b5615 | 91560 |
| `projectile-a.png` | d941d74d3a65a4d7609916fdd04c52f4 | 73357 |
| `projectile-b.png` | 1234878a37560b48a2cb6b3c9026d811 | 73412 |
| `projectile-c.png` | 876661c2420cd1604e3099fb7dc4e57c | 73320 |

`pendulum-a/b/c` were ~0.5 s apart and **all three differ**. The static control
(`motion-graphs.svg`, the same lesson page, photographed the same way) gave **three
byte-identical frames** — that is the control that proves a differing pair means motion and
not capture noise. The wave and the projectile were photographed the same way and differ.

## The pixel diff (an instrument, not an eyeball)

`tools`-less box: `pngdiff.mjs` (zlib PNG reader, ~120 lines, throwaway in /tmp) compares two
frames and reports the changed region. It does not just say "different", it says **where**:

| pair | changed pixels | changed region (screen px) | what sits there |
|---|---|---|---|
| pendulum a vs b | 2993 of 738560 (0.41%) | x 578..642, y 202..454 | the string and the bob — the arm's swept band, pivot to bob |
| wave a vs b | 11184 (1.51%) | x 292..973, y 243..390 | the wave band: the train travelling and the marked particle |
| projectile a vs b | 1608 (0.22%) | x 529..728, y 290..429 | the two balls (the projected one and the one released to fall) |
| **static control a vs b** | **0 — IDENTICAL** | — | nothing: a still figure that stays still |

The `*-changed-region.png` files are the changed bounding box (plus a 24 px margin) cut out of
frame b, so the changed pixels can be looked at directly: the pendulum crop shows the arm and
the bob and nothing else; the projectile crop shows exactly the two balls.

## What this proves, and what it does not

Proves: declarative SMIL animation inside the `<img>` the lesson renders **does run** in a real
Blink browser (no `<object>` swap needed — the renderer is unchanged), the three simulations
move, and the still figures do not. Does not prove: that the geometry is right (the generator
asserts its own physics) or that the lesson copy matches the picture (the harnesses and the
review do that).
