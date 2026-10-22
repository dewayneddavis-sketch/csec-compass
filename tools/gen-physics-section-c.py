#!/usr/bin/env python3
"""Physics Section C (Waves and Optics) coverage build - byte-reproducible generator.

Spec: /home/team/shared/physics-coverage-audit.md section 6
  28 owner chapters = 15 REUSE + 8 EXTEND + 5 NEW.

What this writes into content/physics/modules.json (then mirrors byte-identically
into public/content/physics/modules.json):

  * 5 NEW lessons, ids exactly as the audit proposes, appended to the
    `waves-light` section's `lessons` array (never splitting or renaming one of
    the four existing lessons):
        waves-sources-and-uses-of-electromagnetic-waves
        waves-theories-of-light
        waves-youngs-double-slit-experiment
        waves-rectilinear-propagation-of-light
        waves-focal-length-determination
  * 8 EXTENDs, each a pure INSERTION into a named existing lesson: one paragraph
    appended to the end of that lesson's `content` string plus named `concepts`
    entries. Every existing concept string and every existing byte of the file
    outside the insertion is kept; no lesson id is renamed, re-keyed or split.

Idempotent and reproducible:
  * running it twice changes nothing (`--check` proves it),
  * `--from-base <file>` applies it to a pristine base (e.g. `git show main:...`)
    and diffs the result against the committed file - a byte-for-byte proof that
    the committed file is exactly this generator's output, not a hand edit.

Usage:
  python3 tools/gen-physics-section-c.py                 # write both mirrors
  python3 tools/gen-physics-section-c.py --check         # no-op assertion
  python3 tools/gen-physics-section-c.py --from-base /tmp/base.json
"""
import argparse
import io
import json
import os
import sys

LESSON_INDENT = " " * 12          # "            {"  - one lesson object
KEY_INDENT = " " * 16             # "                \"id\": ..."
ITEM_INDENT = " " * 20            # "                    \"...\"," inside arrays

# ---------------------------------------------------------------------------
# The 8 EXTENDs: chapter name (as the owner's list words it) -> home lesson.
# ---------------------------------------------------------------------------
EXTENDS = [
    {
        "lesson": "wave-properties",
        "chapter": "Wave Representation and Graphs",
        "paragraph": (
            "Wave Representation and Graphs. A wave can be drawn in two ways, and the two "
            "graphs look alike but mean different things. A displacement-distance graph is a "
            "snapshot of the wave at one instant: the horizontal axis is distance along the "
            "wave, the amplitude is read off as the height of a crest above the rest position, "
            "and the wavelength is read off as the distance from one crest to the next. A "
            "displacement-time graph follows one particle as time passes: the horizontal axis "
            "is time, the amplitude is still the height of a crest, and the period T is read "
            "off as the time from one crest to the next, so the frequency is f = 1 / T. Both "
            "graphs have the same shape for a simple wave, so always read the label on the "
            "horizontal axis before taking a value off one."
        ),
        "concepts": [
            "Displacement-distance graph: a snapshot of the wave at one instant, with distance "
            "along the horizontal axis, from which the amplitude and the wavelength are read off.",
            "Displacement-time graph: the motion of one particle through time, with time along "
            "the horizontal axis, from which the amplitude and the period T are read off and the "
            "frequency follows from f = 1 / T.",
        ],
    },
    {
        "lesson": "wave-properties",
        "chapter": "Diffraction of Light",
        "paragraph": (
            "Diffraction of Light. Diffraction is the spreading of a wave when it passes through "
            "a gap or around an obstacle, and light diffracts just as water waves and sound do. "
            "The spreading is only easy to see when the width of the gap is about the same as the "
            "wavelength of the light, so a beam of light passed through a single narrow slit forms "
            "a wide pattern of bright and dark bands instead of a sharp edge. A diffraction "
            "grating carries many very fine parallel slits, and the waves from all of them "
            "interfere, so the grating spreads white light into a spectrum far more widely than a "
            "prism can. Diffraction is also why the shadow of a straight edge has faint dark and "
            "light bands at its boundary instead of a perfectly sharp edge, and why a laser beam "
            "seen through a fine mesh breaks up into a pattern of spots."
        ),
        "concepts": [
            "Diffraction of light: light spreads out when it passes through a narrow slit or a "
            "fine grating, and the spreading is greatest when the gap is about the wavelength of "
            "the light.",
        ],
    },
    {
        "lesson": "sound-and-the-em-spectrum",
        "chapter": "Sound Wave Phenomena",
        "paragraph": (
            "Sound Wave Phenomena. Like every wave, sound is reflected, refracted and diffracted. "
            "Reflection of sound is what produces an echo: the sound bounces off a distant surface "
            "such as a cliff, the sea bed or a large building and returns to the listener, and the "
            "time the echo takes can be used to find the distance to that surface. Refraction of "
            "sound is a change of direction as the sound passes into air of a different "
            "temperature: sound travels a little faster in warm air than in cold air, so on a "
            "still night it bends down towards a listener across a lake and carries much further "
            "than in the heat of the day. Diffraction of sound is heard when sound spreads through "
            "a doorway into a room, or bends around the corner of a building, which is why you can "
            "hear a band before you see it. Noise is unwanted sound, measured in decibels, and "
            "long exposure to loud noise damages hearing, so noisy machines are enclosed and "
            "workers wear ear protectors."
        ),
        "concepts": [
            "Reflection of sound: sound bounces off a hard surface and returns to the listener as "
            "an echo, and the delay gives the distance to the surface.",
            "Refraction of sound: sound changes direction when it passes into air of a different "
            "temperature, bending towards the cooler, denser air.",
            "Diffraction of sound: sound spreads through a doorway or bends around an obstacle, so "
            "it can be heard from a place where the source is not in sight.",
            "Noise: unwanted sound, measured in decibels, which damages hearing after long "
            "exposure.",
        ],
    },
    {
        "lesson": "sound-and-the-em-spectrum",
        "chapter": "Uses of Ultrasound",
        "paragraph": (
            "Uses of Ultrasound. Ultrasound is a sound wave whose frequency is above the top of "
            "the human hearing range, so the ear cannot hear it, yet it obeys the same laws as "
            "audible sound and it is reflected at a boundary between two different materials. A "
            "ship's depth sounder, or sonar, sends a short pulse of ultrasound down into the water "
            "and times the echo from the sea bed, so the depth follows from depth = (speed of "
            "sound in water x time) / 2. Pre-natal scanning uses the same idea to build up an "
            "image of an unborn baby from the echoes returned by its different tissues, and the "
            "pulses used are short and gentle enough not to harm mother or baby. An ultrasound "
            "cleaner lowers an object such as a surgical instrument or a piece of jewellery into a "
            "bath of water shaken by ultrasound, and the microscopic bubbles that form and collapse "
            "scrub the dirt off every surface, including the parts a brush cannot reach. "
            "Physiotherapy uses ultrasound to warm deep tissue and so relieve pain and stiffness in "
            "a joint, and engineers pass ultrasound through a metal casting to find flaws hidden "
            "inside it. Bats and dolphins use the same reflection of ultrasound to find their way "
            "and to hunt."
        ),
        "concepts": [
            "Sonar: an echo sounder that times a pulse of ultrasound to find the depth of water or "
            "the position of a shoal of fish.",
            "Pre-natal scanning: ultrasound echoes from the tissues of an unborn baby are built up "
            "into an image of it.",
            "Ultrasound cleaning: bubbles formed and collapsed by ultrasound in a water bath scrub "
            "the dirt from the surface of an object.",
            "Physiotherapy: ultrasound warms deep tissue to relieve pain and stiffness.",
        ],
    },
    {
        "lesson": "light-refraction",
        "chapter": "Refraction Through Prisms and Blocks",
        "paragraph": (
            "Refraction Through Prisms and Blocks. A ray of light that enters a rectangular glass "
            "block at an angle is refracted towards the normal, crosses the glass, and is refracted "
            "away from the normal as it leaves, so the emergent ray is parallel to the incident ray "
            "but shifted sideways; the perpendicular distance between the two lines is called the "
            "lateral displacement. A thicker block, or a larger angle of incidence, gives a larger "
            "lateral displacement. In a triangular glass prism the two refracting surfaces are not "
            "parallel, so the ray is turned through a large angle: it bends towards the normal at "
            "the first surface and away from the normal at the second, and the total change of "
            "direction is the angle of deviation. The same law n = sin i / sin r applies at each "
            "surface, and because a prism deviates a ray so strongly it is used in binoculars and "
            "in a spectrometer instead of a flat block."
        ),
        "concepts": [
            "Lateral displacement: the sideways shift of a ray after it passes through a "
            "parallel-sided transparent block.",
            "Angle of deviation: the total angle through which a prism turns a ray of light, "
            "greater than a parallel-sided block turns it.",
        ],
    },
    {
        "lesson": "light-refraction",
        "chapter": "Lens Terminology",
        "paragraph": (
            "Lens Terminology. The principal axis is the straight line through the centre of the "
            "lens at right angles to it. The optical centre is the point where the principal axis "
            "meets the centre of the lens, and a ray that passes through the optical centre goes "
            "straight on without changing direction. The principal focus is the point on the "
            "principal axis where rays parallel to the axis meet after passing through a "
            "converging lens, and it is the point from which they appear to spread after passing "
            "through a diverging lens; the focal length is the distance from the optical centre to "
            "the principal focus. The focal plane is the plane through the principal focus at "
            "right angles to the principal axis. A converging (convex) lens has a real principal "
            "focus and is thicker in the middle, while a diverging (concave) lens has a virtual "
            "principal focus and is thinner in the middle."
        ),
        "concepts": [
            "Principal axis: the straight line through the centre of a lens at right angles to it.",
            "Optical centre: the centre of the lens on the principal axis, which a ray passes "
            "through without bending.",
            "Principal focus: the point where rays parallel to the principal axis meet after "
            "passing through a converging lens, and its distance from the optical centre is the "
            "focal length.",
            "Focal plane: the plane through the principal focus at right angles to the principal "
            "axis.",
        ],
    },
    {
        "lesson": "light-refraction",
        "chapter": "Magnification Equations",
        "paragraph": (
            "Magnification Equations. Two equations link the object, the image and the lens. The "
            "magnification m is the ratio of the image height to the object height, and it is also "
            "the ratio of the image distance to the object distance: m = image height / object "
            "height = v / u. The lens formula 1 / f = 1 / u + 1 / v uses the same measured "
            "distances, where u is the object distance, v is the image distance and f is the focal "
            "length, all in the same unit. For a real image u, v and f are taken as positive. For "
            "example, an object 30 cm from a converging lens of focal length 10 cm gives "
            "1 / v = 1 / 10 - 1 / 30 = 2 / 30, so v = 15 cm, and m = v / u = 15 / 30 = 0.5, so the "
            "image is half the height of the object and inverted. A magnification greater than 1 "
            "means a larger image, and a value less than 1 a smaller one."
        ),
        "concepts": [
            "Magnification: m = image height / object height = v / u, where v is the image distance "
            "and u the object distance.",
            "Lens formula: 1 / f = 1 / u + 1 / v, with u the object distance, v the image distance "
            "and f the focal length.",
        ],
    },
    {
        "lesson": "reflection-and-total-internal-reflection",
        "chapter": "Dispersion and the Spectrum",
        "paragraph": (
            "Dispersion and the Spectrum. White light is a mixture of colours, and a prism "
            "separates them because the refractive index of glass is slightly different for each "
            "colour: violet light is refracted the most and red light the least. When a narrow "
            "beam of white light enters a triangular prism, the colours leave the second surface at "
            "slightly different angles, so a band of colours called a spectrum is spread out on a "
            "screen in the order red, orange, yellow, green, blue, indigo and violet. A second "
            "prism placed the other way round recombines the colours into white light, which shows "
            "that nothing was added to the light by the first prism. A rainbow is made in the same "
            "way inside raindrops: sunlight is refracted as it enters a drop, totally internally "
            "reflected at the far side of the drop, and refracted again as it leaves, and because "
            "the colours come out at different angles you see the spectrum as an arc with red on "
            "the outside and violet on the inside."
        ),
        "concepts": [
            "Dispersion: the separation of white light into its colours, because each colour has "
            "its own refractive index in the glass.",
            "Spectrum: the band of colours from red (least deviated) to violet (most deviated) "
            "formed when white light is dispersed.",
            "Rainbow: sunlight dispersed inside raindrops, with total internal reflection at the "
            "back of each drop.",
        ],
    },
]

# ---------------------------------------------------------------------------
# The 5 NEW lessons. Each carries its own lessonSets.physics entry (see
# src/components/lessonSets.js) - physics is type-keyed, so a lesson without its
# own set would silently render another lesson's deck.
# ---------------------------------------------------------------------------
NEW_LESSONS = [
    {
        "id": "waves-sources-and-uses-of-electromagnetic-waves",
        "title": "Sources and Uses of Electromagnetic Waves",
        "content": (
            "Every region of the electromagnetic spectrum has its own source and its own uses. "
            "Radio waves come from oscillating charges in an aerial; broadcasting and mobile "
            "phones use them because they pass through walls and travel long distances. "
            "Microwaves come from a magnetron or a dish aerial; radar, satellite links and cooking "
            "use them because they are strongly absorbed by water molecules in food. Infrared "
            "comes from warm objects such as the human body; remote controls, thermal imaging and "
            "heaters use it because it is felt as heat. Visible light comes from hot filaments, "
            "gas discharge lamps and light-emitting diodes; vision, photography and vision through "
            "optical fibres all use it. Ultraviolet comes from mercury-vapour lamps and the Sun; "
            "sterilising and security marking use it because it kills micro-organisms and makes "
            "some inks glow.\n\n"
            "The shorter-wavelength regions need more energetic sources. X-rays are produced when "
            "fast electrons are stopped by a metal target in an evacuated tube; photographing "
            "bones and luggage uses them because they pass through flesh but not through dense "
            "material. Gamma rays come from changes inside unstable nuclei; sterilising equipment "
            "and treating cancer use them because they penetrate deeply and kill living cells.\n\n"
            "Ultraviolet, X-rays and gamma rays are the ionising regions, and each is a hazard as "
            "well as a tool: they damage living cells, cause sunburn and skin cancer, and can "
            "change genes. Time of exposure is therefore kept short, lead or concrete screens are "
            "used where X-rays and gamma rays are present, sunblock and clothing protect against "
            "ultraviolet, and a radiographer stands behind a screen while an image is taken."
        ),
        "objectives": [
            "State a source and a use for each region of the electromagnetic spectrum",
            "Explain why radio waves, microwaves, infrared and visible light are used as they are",
            "Describe the hazards of the ionising regions and the precautions taken",
        ],
        "concepts": [
            "Radio waves and microwaves: produced by oscillating charges in aerials and in "
            "magnetrons, and used for broadcasting, mobile phones, radar, satellite links and "
            "cooking.",
            "Infrared and visible light: emitted by warm objects, filaments and lamps, and used "
            "for remote controls, thermal imaging, heaters, vision and photography.",
            "Ionising regions: ultraviolet, X-rays and gamma rays come from hot bodies, high "
            "voltage tubes and nuclear changes, and they damage living cells.",
        ],
        "experiment": {
            "type": "classifier-sim",
            "description": (
                "Sources and Uses of Electromagnetic Waves: Sort 6 statements into A source of "
                "that region, A use of that region."
            ),
        },
        "lab": {
            "subtitle": "Sort each statement under Sources or Uses.",
            "categories": [
                {"id": "source", "label": "Sources"},
                {"id": "use", "label": "Uses"},
            ],
            "items": [
                {"id": "e1", "label": "Oscillating charges in an aerial", "category": "source"},
                {"id": "e2", "label": "A magnetron or a dish aerial", "category": "source"},
                {"id": "e3", "label": "Fast electrons are stopped by a metal target", "category": "source"},
                {"id": "e4", "label": "Broadcasting and mobile phones", "category": "use"},
                {"id": "e5", "label": "Radar, satellite links and cooking", "category": "use"},
                {"id": "e6", "label": "Photographing bones and luggage", "category": "use"},
            ],
        },
    },
    {
        "id": "waves-theories-of-light",
        "title": "Theories of Light",
        "content": (
            "For centuries two rival models tried to explain how light behaves. Isaac Newton's "
            "corpuscular theory said that light is a stream of tiny particles that travel in "
            "straight lines and are reflected when they bounce off a surface. Christiaan Huygens "
            "put forward the wave theory instead: light is a disturbance that spreads out from its "
            "source, in the way a ripple spreads across water.\n\n"
            "Several observations are explained by either model. Light travels in straight lines, "
            "casts sharp shadows and reflects so that the angle of incidence equals the angle of "
            "reflection, and a stream of particles would do all three just as a wave would. "
            "Refraction looked at first like a point in favour of particles, because it was argued "
            "that the light would speed up on entering a denser medium, and the measurements "
            "available at the time were not accurate enough to settle the question.\n\n"
            "Two observations decided the argument in favour of the wave model. Diffraction and "
            "interference are wave behaviours that particles cannot produce: light bends into the "
            "shadow of an obstacle, and two beams of light can cancel each other out, which Thomas "
            "Young demonstrated in 1801 with the double slit experiment. Then a careful "
            "measurement of the speed of light by Jean Foucault in 1850 showed that light travels "
            "more slowly in water than in air, which is the opposite of what the corpuscular "
            "theory predicted.\n\n"
            "Later work showed that light is an electromagnetic wave, but the photoelectric "
            "effect showed that light also delivers its energy in small packets, so modern physics "
            "describes light as having both a wave nature and a particle nature: it travels and "
            "interferes as a wave, and it is absorbed and emitted as a packet of energy."
        ),
        "objectives": [
            "Compare the corpuscular theory and the wave theory of light",
            "Explain which observations support each theory",
            "Explain why light is now described as having both a wave nature and a particle nature",
        ],
        "concepts": [
            "Corpuscular theory: Newton's model in which light is a stream of tiny particles that "
            "travel in straight lines.",
            "Wave theory: Huygens' model in which light is a disturbance that spreads out from its "
            "source.",
            "Diffraction and interference: the wave behaviours that particles cannot produce, and "
            "the evidence that settled the argument for the wave model.",
            "Photon: a packet of light energy; the photoelectric effect shows that light also "
            "behaves as a particle.",
        ],
        "experiment": {
            "type": "matching-game",
            "description": (
                "Theories of Light: Match each of 5 items - Corpuscular theory, Wave theory, "
                "Diffraction and interference, Jean Foucault, The photoelectric effect - "
                "to the statement that describes it."
            ),
        },
        "lab": {
            "subtitle": "Drag each idea onto the statement that describes it.",
            "pairs": [
                {"id": "e1", "label": "Corpuscular theory",
                 "target": "Light is a stream of tiny particles that travel in straight lines"},
                {"id": "e2", "label": "Wave theory",
                 "target": "Light is a disturbance that spreads out from its source"},
                {"id": "e3", "label": "Diffraction and interference",
                 "target": "Wave behaviours that particles cannot produce"},
                {"id": "e4", "label": "Jean Foucault",
                 "target": "Showed that light travels more slowly in water than in air"},
                {"id": "e5", "label": "The photoelectric effect",
                 "target": "Light also delivers its energy in small packets"},
            ],
        },
    },
    {
        "id": "waves-youngs-double-slit-experiment",
        "title": "Young's Double Slit Experiment",
        "content": (
            "In 1801 Thomas Young passed light from a single narrow slit through two very close "
            "parallel slits and onto a screen. The two slits act as two coherent sources: they "
            "send out light of the same frequency that stays in step, because both are lit by the "
            "same source. Where the light from the two slits arrives in step, the waves reinforce "
            "each other and a bright fringe appears; where it arrives out of step, the waves "
            "cancel each other and a dark fringe appears. The result is a pattern of equally "
            "spaced bright and dark bands called interference fringes.\n\n"
            "The experiment is direct evidence that light is a wave, and the pattern can be used "
            "to measure the wavelength of the light. The fringe spacing x = wavelength x D / a, "
            "where D is the distance from the slits to the screen and a is the separation of the "
            "two slits. Increasing the distance to the screen widens the fringes, moving the slits "
            "closer together widens them, and using red light instead of blue light widens them as "
            "well, because red light has the longer wavelength.\n\n"
            "In the laboratory a laser or a lamp behind a single slit provides the coherent light, "
            "and the fringes are viewed on a screen or through a travelling microscope so that the "
            "distance across several fringes can be measured and divided to give the spacing of "
            "one. A stream of particles passing through two slits would simply give two bright "
            "bands, so the alternating bright and dark fringes cannot be explained by the "
            "corpuscular theory."
        ),
        "objectives": [
            "Describe Young's double slit experiment and the conditions it needs",
            "Explain the bright and dark fringes in terms of interference",
            "Use the fringe spacing relation to find the fringe spacing or the wavelength",
        ],
        "concepts": [
            "Coherent sources: two sources are coherent when they send out waves of the same "
            "frequency that stay in step.",
            "Interference fringes: the equally spaced bright and dark bands produced where light "
            "from the two slits overlaps.",
            "Fringe spacing: x = wavelength x D / a, where D is the distance from the slits to the "
            "screen and a is the slit separation.",
        ],
        "experiment": {
            "type": "matching-game",
            "description": (
                "Young's Double Slit Experiment: Match each of 5 items - Coherent sources, A "
                "bright fringe, A dark fringe, Increasing the distance to the screen, Using red "
                "light instead of blue light - to the statement that describes it."
            ),
        },
        "lab": {
            "subtitle": "Drag each idea onto the statement that describes it.",
            "pairs": [
                {"id": "e1", "label": "Coherent sources",
                 "target": "Send out light of the same frequency that stays in step"},
                {"id": "e2", "label": "A bright fringe",
                 "target": "The waves reinforce each other and a bright fringe appears"},
                {"id": "e3", "label": "A dark fringe",
                 "target": "The waves cancel each other and a dark fringe appears"},
                {"id": "e4", "label": "Increasing the distance to the screen",
                 "target": "Widens the fringes"},
                {"id": "e5", "label": "Using red light instead of blue light",
                 "target": "Widens them as well, because red light has the longer wavelength"},
            ],
        },
    },
    {
        "id": "waves-rectilinear-propagation-of-light",
        "title": "Rectilinear Propagation of Light",
        "content": (
            "Light travels in straight lines through a uniform medium. This is called rectilinear "
            "propagation, and it is the reason we draw rays, which are straight lines with "
            "arrowheads showing the direction of travel, and beams, which are bundles of rays. The "
            "straight-line model is an approximation, because light spreads a little when it "
            "passes a narrow gap, but it explains almost every everyday observation of light.\n\n"
            "A shadow forms because light travels in straight lines and cannot bend around an "
            "object: the shadow is the region behind the object that the light cannot reach. A "
            "point source gives a sharp shadow with one fully dark region, called the umbra. An "
            "extended source such as a fluorescent tube gives a dark umbra with a partly lit "
            "region around it, called the penumbra, because light from different parts of the "
            "source is blocked by different amounts. A solar eclipse happens when the Moon's "
            "shadow falls on the Earth, and a lunar eclipse when the Earth's shadow falls on the "
            "Moon; in each case the sharp edge of the shadow is itself evidence that light "
            "travels in straight lines.\n\n"
            "A pin-hole camera uses rectilinear propagation to form a real, inverted image. Light "
            "from the top of the object passes through the hole and lands near the bottom of the "
            "screen, and light from the bottom lands near the top, so the image is upside down "
            "and laterally inverted. The image is sharpest when the hole is small, and its "
            "magnification is the image distance divided by the object distance. Making the hole "
            "larger lets in more light but blurs the image, because every point of the object then "
            "sends a cone of light through the hole instead of a single ray."
        ),
        "objectives": [
            "Explain rectilinear propagation and represent light with rays and beams",
            "Describe shadows, the umbra and the penumbra, and explain eclipses",
            "Explain how a pin-hole camera forms a real, inverted image",
        ],
        "concepts": [
            "Rectilinear propagation: light travels in straight lines through a uniform medium.",
            "Umbra and penumbra: the fully dark part of a shadow and the partly lit region around "
            "it cast by an extended source.",
            "Pin-hole camera: a small hole forms a real, inverted image because light travels in "
            "straight lines.",
        ],
        "experiment": {
            "type": "matching-game",
            "description": (
                "Rectilinear Propagation of Light: Match each of 5 items - Rectilinear "
                "propagation, Umbra, Penumbra, A pin-hole camera, Making the hole larger - to the "
                "statement that describes it."
            ),
        },
        "lab": {
            "subtitle": "Drag each idea onto the statement that describes it.",
            "pairs": [
                {"id": "e1", "label": "Rectilinear propagation",
                 "target": "Light travels in straight lines through a uniform medium"},
                {"id": "e2", "label": "Umbra",
                 "target": "One fully dark region, called the umbra"},
                {"id": "e3", "label": "Penumbra",
                 "target": "A dark umbra with a partly lit region around it, called the penumbra"},
                {"id": "e4", "label": "A pin-hole camera",
                 "target": "Forms a real, inverted image because light travels in straight lines"},
                {"id": "e5", "label": "Making the hole larger",
                 "target": "Lets in more light but blurs the image"},
            ],
        },
    },
    {
        "id": "waves-focal-length-determination",
        "title": "Focal Length Determination",
        "content": (
            "The focal length of a converging lens is the distance from the optical centre to the "
            "principal focus, the point where rays parallel to the principal axis meet after "
            "passing through the lens. In the distant object method an object as far away as "
            "possible, such as a window or a distant tree, is used so that the rays arriving at "
            "the lens are nearly parallel; the image then forms at the principal focus, and the "
            "distance from the lens to a screen showing the sharpest image is the focal length. "
            "The method is quick, but it works only if the object really is far enough away.\n\n"
            "The u-v method is more accurate. A converging lens is set up on an optical bench with "
            "an object such as an illuminated cross-wire at one end and a screen at the other. For "
            "each position of the object the screen is moved until a sharp image is formed, and "
            "the object distance u and the image distance v are measured from the optical centre "
            "and put into the lens formula 1 / f = 1 / u + 1 / v. Several pairs of readings are "
            "taken and the average focal length is found, or the results are plotted as a graph of "
            "1 / v against 1 / u, which is a straight line; the intercepts of that line give "
            "1 / f, so the reciprocal of the intercept is the focal length. Averaging several "
            "readings reduces the effect of an error in any one of them.\n\n"
            "Inaccurate results come from measuring u and v from the wrong point instead of from "
            "the optical centre, from judging the sharpest image by eye, and from the screen not "
            "being square to the principal axis. In the plane mirror method the lens rests on a "
            "plane mirror with a pin held above it; the pin is moved until it coincides exactly "
            "with its own image, and at that position the pin is at the principal focus, so the "
            "distance from the pin to the lens is the focal length. Whichever method is used, the "
            "answer is checked against the value marked on the lens."
        ),
        "objectives": [
            "Describe the distant object method for finding the focal length of a converging lens",
            "Use the u-v method with the lens formula and a graph of 1 / v against 1 / u",
            "State the sources of error in the measurement and how the plane mirror method avoids "
            "some of them",
        ],
        "concepts": [
            "Distant object method: parallel rays from a distant object form an image at the "
            "principal focus, so the image distance is the focal length.",
            "u-v method: the object and image distances are measured and put into the lens formula "
            "1 / f = 1 / u + 1 / v.",
            "Graph method: a graph of 1 / v against 1 / u is a straight line whose intercepts give "
            "1 / f.",
        ],
        "experiment": {
            "type": "matching-game",
            "description": (
                "Focal Length Determination: Match each of 5 items - The distant object method, "
                "The u-v method, A graph of 1 / v against 1 / u, The plane mirror method, Judging "
                "the sharpest image by eye - to the statement that describes it."
            ),
        },
        "lab": {
            "subtitle": "Drag each method or idea onto the statement that describes it.",
            "pairs": [
                {"id": "e1", "label": "The distant object method",
                 "target": "The image then forms at the principal focus"},
                {"id": "e2", "label": "The u-v method",
                 "target": "Put into the lens formula 1 / f = 1 / u + 1 / v"},
                {"id": "e3", "label": "A graph of 1 / v against 1 / u",
                 "target": "A straight line whose intercepts give 1 / f"},
                {"id": "e4", "label": "The plane mirror method",
                 "target": "The pin is moved until it coincides exactly with its own image"},
                {"id": "e5", "label": "Judging the sharpest image by eye",
                 "target": "Averaging several readings reduces the effect of an error in any one of them"},
            ],
        },
    },
]


def lesson_span(text, lesson_id):
    """(start, end) of the lesson object whose `id` is lesson_id."""
    anchor = '\n                "id": "%s",' % lesson_id
    i = text.index(anchor)
    start = text.rindex("\n            {", 0, i) + 1
    end = text.index("\n            }", i) + len("\n            }")
    return start, end


def section_span(text, section_id):
    anchor = '"id": "%s",' % section_id
    i = text.index(anchor)
    start = text.rindex("\n    {", 0, i) + 1
    end = text.index("\n    },", i) + len("\n    },")
    return start, end


def esc(s):
    """Escape a new string exactly the way this file stores non-ASCII (\\uXXXX)."""
    return json.dumps(s, ensure_ascii=True)[1:-1]


def append_content(text, lesson_id, paragraph):
    """Append one paragraph to the lesson's `content` string - pure insertion."""
    start, end = lesson_span(text, lesson_id)
    region = text[start:end]
    prefix = '                "content": "'
    lines = region.split("\n")
    for n, line in enumerate(lines):
        if line.startswith(prefix):
            if paragraph[:40] in line:
                return text  # already applied
            assert line.endswith('",'), "content line is not a single-line JSON string"
            lines[n] = line[:-2] + "\\n\\n" + esc(paragraph) + '",'
            break
    else:
        raise AssertionError("no content line in lesson " + lesson_id)
    return text[:start] + "\n".join(lines) + text[end:]


def insert_concepts(text, lesson_id, concepts):
    """Insert concepts at the END of the lesson's `concepts` array - pure insertion."""
    start, end = lesson_span(text, lesson_id)
    lines = text[start:end].split("\n")
    open_at = close_at = None
    for n, line in enumerate(lines):
        if line == '                "concepts": [':
            open_at = n
        elif open_at is not None and line == "                ],":
            close_at = n
            break
    assert open_at is not None and close_at is not None, "concepts block not found in " + lesson_id
    new = [c for c in concepts if c[:40] not in "\n".join(lines[open_at:close_at])]
    if not new:
        return text
    assert lines[close_at - 1].endswith('"'), "last concept line does not end with a quote"
    lines[close_at - 1] = lines[close_at - 1] + ","
    block = ["%s\"%s\"," % (ITEM_INDENT, esc(c)) for c in new]
    block[-1] = block[-1][:-1]
    lines[close_at:close_at] = block
    return text[:start] + "\n".join(lines) + text[end:]


def render_lesson(lesson):
    """The exact JSON text of one lesson object, in this file's house style."""
    out = ["%s{" % LESSON_INDENT,
           '%s"id": "%s",' % (KEY_INDENT, lesson["id"]),
           '%s"title": "%s",' % (KEY_INDENT, esc(lesson["title"])),
           '%s"content": "%s",' % (KEY_INDENT, esc(lesson["content"])),
           '%s"objectives": [' % KEY_INDENT]
    out += ['%s"%s",' % (ITEM_INDENT, esc(o)) for o in lesson["objectives"][:-1]]
    out.append('%s"%s"' % (ITEM_INDENT, esc(lesson["objectives"][-1])))
    out.append("%s]," % KEY_INDENT)
    out.append('%s"concepts": [' % KEY_INDENT)
    out += ['%s"%s",' % (ITEM_INDENT, esc(c)) for c in lesson["concepts"][:-1]]
    out.append('%s"%s"' % (ITEM_INDENT, esc(lesson["concepts"][-1])))
    out.append("%s]," % KEY_INDENT)
    out.append('%s"experiment": {' % KEY_INDENT)
    out.append('%s"type": "%s",' % (ITEM_INDENT, lesson["experiment"]["type"]))
    out.append('%s"description": "%s"' % (ITEM_INDENT, esc(lesson["experiment"]["description"])))
    out.append("%s}" % KEY_INDENT)
    out.append("%s}" % LESSON_INDENT)
    return "\n".join(out)


def render_lab_set(lesson):
    """One lessonSets.physics entry, in that file's house style."""
    lab = lesson["lab"]
    out = ['    "%s": {' % lesson["id"],
           '      title: "%s",' % lesson["title"],
           '      subtitle: "%s",' % lab["subtitle"]]
    if "categories" in lab:
        out.append('      kind: "sort",')
        out.append("      categories: [")
        out += ['        { id: "%s", label: "%s" },' % (c["id"], c["label"])
                for c in lab["categories"]]
        out.append("      ],")
        out.append("      items: [")
        out += ['        { id: "%s", label: "%s", category: "%s" },'
                % (i["id"], i["label"], i["category"]) for i in lab["items"]]
        out.append("      ],")
    else:
        out.append('      kind: "match",')
        out.append("      pairs: [")
        out += ['        { id: "%s", target: "%s", label: "%s" },'
                % (p["id"], p["target"], p["label"]) for p in lab["pairs"]]
        out.append("      ],")
    out.append("    },")
    return "\n".join(out)


def insert_lab_sets(text):
    """Append the five per-lesson lab sets to the `physics` block of lessonSets.js."""
    i = text.index("  physics: {")
    close = text.index("\n  },", i)
    blocks = [render_lab_set(l) for l in NEW_LESSONS
              if '"%s": {' % l["id"] not in text]
    if not blocks:
        return text
    header = ("    // ---- Physics Section C (Waves and Optics) coverage build: five\n"
              "    //      net-new lessons, each with its own topic-matched set. Physics is\n"
              "    //      type-keyed, so a lesson without its own set would silently show\n"
              "    //      another lesson's deck. Section D (em-) and Section E (nuclear-)\n"
              "    //      sets are added by their own authors above.\n")
    return text[:close] + "\n" + header + "\n".join(blocks) + text[close:]


def append_lessons(text, section_id, lessons):
    start, end = section_span(text, section_id)
    region = text[start:end]
    blocks = []
    for lesson in lessons:
        if '"id": "%s",' % lesson["id"] in text:
            continue  # already applied
        blocks.append(render_lesson(lesson))
    if not blocks:
        return text
    close = region.index("\n        ]")
    region = region[:close] + ",\n" + ",\n".join(blocks) + region[close:]
    return text[:start] + region + text[end:]


def generate(text):
    for lesson_id in ("wave-properties", "light-refraction",
                      "reflection-and-total-internal-reflection", "sound-and-the-em-spectrum"):
        lesson_span(text, lesson_id)  # fail loudly if the base is not what we expect
    for ext in EXTENDS:
        text = append_content(text, ext["lesson"], ext["paragraph"])
        text = insert_concepts(text, ext["lesson"], ext["concepts"])
    text = append_lessons(text, "waves-light", NEW_LESSONS)
    return text


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ap.add_argument("--check", action="store_true",
                    help="assert the on-disk file is already this generator's output")
    ap.add_argument("--from-base", metavar="FILE",
                    help="apply to a pristine base file and diff against the committed file")
    args = ap.parse_args()

    content = os.path.join(args.repo, "content/physics/modules.json")
    mirror = os.path.join(args.repo, "public/content/physics/modules.json")
    sets_path = os.path.join(args.repo, "src/components/lessonSets.js")
    on_disk = io.open(content, encoding="utf-8").read()

    if args.from_base:
        base = io.open(args.from_base, encoding="utf-8").read()
        made = generate(base)
        same = made == on_disk
        print("from-base: %s" % ("byte-identical to the committed file" if same
                                 else "DIFFERS from the committed file"))
        if not same:
            import difflib
            for line in list(difflib.unified_diff(on_disk.split("\n"), made.split("\n"),
                                                  "committed", "from-base", n=1))[:40]:
                print(line)
        return 0 if same else 1

    if args.check:
        bad = []
        if generate(on_disk) != on_disk:
            bad.append("content/physics/modules.json is not this generator's output")
        sets_on_disk = io.open(sets_path, encoding="utf-8").read()
        if insert_lab_sets(sets_on_disk) != sets_on_disk:
            bad.append("src/components/lessonSets.js is not this generator's output")
        for m in bad:
            print("check: FAILED - " + m)
        if not bad:
            print("check: modules.json and lessonSets.js are exactly this generator's output")
        return 1 if bad else 0

    out = generate(on_disk)
    io.open(content, "w", encoding="utf-8", newline="").write(out)
    io.open(mirror, "w", encoding="utf-8", newline="").write(out)
    sets_out = insert_lab_sets(io.open(sets_path, encoding="utf-8").read())
    io.open(sets_path, "w", encoding="utf-8", newline="").write(sets_out)
    print("wrote content/physics/modules.json and its public/ mirror (%d bytes each)"
          % len(out.encode()))
    print("wrote the five per-lesson lab sets into src/components/lessonSets.js")
    return 0


if __name__ == "__main__":
    sys.exit(main())
