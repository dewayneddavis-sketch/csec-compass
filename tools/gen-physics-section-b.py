#!/usr/bin/env python3
"""Physics Section B (Thermal Physics and Kinetic Theory) coverage build.

Work order: /home/team/shared/physics-coverage-audit.md section 5
  REUSE 10 + EXTEND 4 + NEW 9 = 23 target chapters.

This generator is deliberately NOT a re-serialiser. It does counted,
line-local raw-text splices on:
  * content/physics/modules.json         (and its byte-identical public mirror)
  * src/components/lessonSets.js         (nine new per-lesson lab sets)

Rules honoured:
  * every existing lesson id stays byte-for-byte (the four EXTEND lessons grow by
    pure insertion: an appended content paragraph and appended concepts only, and
    every neighbouring line is untouched);
  * only the thermal-physics region of modules.json is edited;
  * the two banks (practice.json, knowledge-check.json) are never opened;
  * the run is idempotent - a second run writes nothing and says so.
"""
import json
import hashlib
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODULES = os.path.join(ROOT, "content", "physics", "modules.json")
MIRROR = os.path.join(ROOT, "public", "content", "physics", "modules.json")
LESSON_SETS = os.path.join(ROOT, "src", "components", "lessonSets.js")

P = "                "  # 16 spaces: a lesson's own keys
Q = "                    "  # 20 spaces: entries inside a lesson's arrays
W = "            "  # 12 spaces: a lesson object inside a section's lessons[]

# ---------------------------------------------------------------------------
# EXTEND 4 - pure insertions into the NAMED existing thermal lessons.
# Each entry: (lesson id, audit chapter, appended paragraph, appended concepts)
# ---------------------------------------------------------------------------
EXTENDS = [
    (
        "temperature-heat",
        "Historical Heat Theories",
        "The idea of heat has a history worth knowing, because it shows how a physical theory is "
        "replaced by a better one. Until the late eighteenth century most scientists explained "
        "heating with a caloric theory: heat was thought to be a weightless fluid, called caloric, "
        "that flowed out of a hot body into a cold one. On that view a hot cup of tea held more "
        "caloric than a cold one, and rubbing two surfaces together squeezed caloric out of them. "
        "The theory explained a good deal, and it is the reason we still say that energy is "
        "transferred from hot to cold.\n\n"
        "Count Rumford's boring of cannon barrels in the 1790s weakened it: the drilling went on "
        "producing heat for as long as the work continued, and no fluid could be supplied for ever. "
        "Later measurements of the mechanical equivalent of heat showed that work and heat are both "
        "energy, and that led to the kinetic theory: heat is the energy of the random motion of the "
        "particles of a substance, and temperature is a measure of the average kinetic energy of "
        "those particles. The caloric theory is the historical heat theory that the kinetic theory "
        "replaced, and the two are contrasted whenever a question asks what heat actually is.",
        [
            "The caloric theory treated heat as a weightless fluid, caloric, that flowed from a hot "
            "body into a cold one.",
            "The kinetic theory replaced the caloric theory: heat is the energy of the random motion "
            "of the particles, and temperature measures their average kinetic energy.",
            "Count Rumford's cannon boring produced heat without limit for as long as the work went "
            "on, which a fluid could not explain.",
        ],
    ),
    (
        "gas-laws",
        "Kelvin Temperature Scale",
        "The Kelvin temperature scale is the absolute scale, and it is the scale the gas laws are "
        "written in. Its zero is absolute zero, written 0 K and equal to -273 degrees Celsius, the "
        "temperature at which a gas would have no thermal energy left to give and its pressure "
        "would fall to zero. One kelvin is exactly the same size as one degree Celsius, so a change "
        "of temperature is the same number in both scales; only the zero point differs. Converting "
        "is a single step: K = degrees Celsius + 273, and degrees Celsius = K - 273. A room at 27 "
        "degrees Celsius is 300 K, and water boiling at 100 degrees Celsius is 373 K.\n\n"
        "The gas laws must use the Kelvin scale, because each law says that pressure, or volume, is "
        "directly proportional to temperature, and a direct proportion only holds when the scale "
        "starts at zero. Doubling 27 degrees Celsius to 54 degrees Celsius does not double the "
        "pressure of a fixed mass of gas, but doubling 300 K to 600 K does. Substituting a negative "
        "Celsius temperature would give a negative pressure, which is nonsense - another sign that "
        "the Celsius zero is arbitrary, fixed at the ice point, while the Kelvin zero is the lowest "
        "temperature that can exist.",
        [
            "Absolute zero is 0 K, equal to -273 degrees Celsius, the lowest temperature that can "
            "exist.",
            "One kelvin is the same size as one degree Celsius, so K = degrees Celsius + 273 and a "
            "temperature change is the same number in both scales.",
            "The gas laws need the Kelvin scale because a direct proportion between pressure or "
            "volume and temperature is only true when the scale starts at zero.",
        ],
    ),
    (
        "gas-laws",
        "Kinetic Theory and Gas Laws",
        "Kinetic theory explains all three gas laws with one picture: a gas is a very large number "
        "of particles in rapid random motion, the pressure on the walls of the container is the "
        "total force of the particles colliding with those walls, and the temperature is the "
        "average kinetic energy of the particles.\n\n"
        "Boyle's Law follows because squeezing a fixed mass of gas into half its volume leaves the "
        "particles twice as crowded, so they strike the walls twice as often and the pressure "
        "doubles at constant temperature. Charles' Law follows because heating the gas raises the "
        "average kinetic energy of the particles, so each one hits the walls harder and more often, "
        "and the gas expands at constant pressure until the pressure has fallen back to what it "
        "was. The Pressure Law follows for a fixed volume held in a rigid container: heating raises "
        "the average kinetic energy, the collisions become more forceful and more frequent, and the "
        "pressure rises.\n\n"
        "Absolute zero fits the same picture, because at 0 K the particles would have no kinetic "
        "energy left and the pressure would be zero. Real gases turn into liquids before that point "
        "is reached, which is why the gas laws are called ideal gas laws and are most accurate for "
        "a gas well above its boiling point and not compressed near to liquefying.",
        [
            "Gas pressure is the force of the gas particles colliding with the walls of their "
            "container.",
            "Heating a gas raises the average kinetic energy of its particles, so the collisions "
            "with the walls become more frequent and more forceful.",
            "Boyle's Law, Charles' Law and the Pressure Law are all explained by the motion of the "
            "particles of the gas.",
        ],
    ),
    (
        "specific-and-latent-heat",
        "Effects of Thermal Expansion",
        "The effects of thermal expansion are met in engineering and in the home. A solid expands "
        "in every direction, so a long metal rail laid without a gap buckles on a hot day, which is "
        "why railway lines have expansion gaps, and why bridge decks and concrete roads have "
        "expansion joints. A liquid expands more than its container does, and a liquid-in-glass "
        "thermometer is built on exactly that effect, because the liquid is forced up a narrow "
        "bore as it warms. A gas expands most of all, which is why a sealed tin must never be "
        "heated and why a balloon left in the sun stretches.\n\n"
        "Expansion is also used deliberately. A bimetallic strip of two metals with different "
        "expansion rates bends when it is heated, and the bending closes an electrical contact: "
        "that is the working part of a thermostat, of a fire alarm and of the older type of "
        "electric iron. Shrink-fitting uses the effect the other way round - a metal tyre or a "
        "rivet is made slightly too small, warmed so that it expands, slipped over the wheel or "
        "through the plate, and left to cool, when it grips tightly. A tight metal lid is loosened "
        "by warming it, because the metal expands more than the glass it is screwed onto.\n\n"
        "Expansion causes trouble as well. A thick glass tumbler can crack when boiling water is "
        "poured into it, because the inside surface expands before the heat has reached the "
        "outside, and thin glass - or a metal spoon left in the glass to take some of the heat - "
        "avoids the crack. How much a solid expands depends on the material it is made of, on its "
        "original length and on the size of the temperature rise, so a long steel pipe carrying "
        "steam and the skin of an aircraft are both designed around expansion rather than against "
        "it.",
        [
            "Effects of thermal expansion include railway lines buckling without expansion gaps, "
            "bridge expansion joints, a thick glass tumbler cracking in boiling water, and a "
            "bimetallic strip bending when heated.",
            "Uses of thermal expansion include the liquid-in-glass thermometer and shrink-fitting a "
            "metal tyre or a rivet by warming it before it is fitted.",
            "The amount by which a solid expands depends on the material, on its original length "
            "and on the temperature rise.",
        ],
    ),
]

# ---------------------------------------------------------------------------
# NEW 9 - one lesson per audit row, ids exactly as the audit proposes.
# ---------------------------------------------------------------------------
NEW_LESSONS = [
    {
        "id": "thermal-thermometers-and-thermometric-properties",
        "title": "Physical Properties and Thermometers",
        "content": (
            "An instrument measures temperature by using a physical property that changes in a "
            "regular way when the object is heated or cooled. Any such property is called a "
            "thermometric property, and a thermometer is built around one chosen thermometric "
            "property. A property is only useful if it changes steadily with temperature, so that "
            "equal steps on the scale mean equal changes of temperature, and if it changes by an "
            "amount large enough to be read accurately.\n\n"
            "Several thermometric properties are in use. The volume of a liquid is the property "
            "used by a liquid-in-glass thermometer, in which the liquid expands up a fine "
            "capillary bore as it is warmed. The electrical resistance of a metal rises with "
            "temperature, and it is the property used by a platinum resistance thermometer. The "
            "electrical resistance of a semiconductor falls as it gets hotter, and it is the "
            "property used by a thermistor. The pressure of a gas at constant volume is the "
            "property used by a constant-volume gas thermometer, the most accurate type and the "
            "one used to check the others. The e.m.f. of a thermocouple is the property used by a "
            "thermocouple thermometer, and the expansion of a bimetallic strip is the property "
            "used by a bimetallic thermometer in a thermostat.\n\n"
            "A liquid-in-glass thermometer is filled with mercury or with alcohol dyed red. "
            "Mercury is opaque and does not stick to the glass, so its thread moves cleanly and is "
            "easy to read, and it is used from about -39 degrees Celsius to about 357 degrees "
            "Celsius. Alcohol boils at about 78 degrees Celsius, so it cannot be used above that "
            "temperature, but it works far below the freezing point of mercury and it is dyed red "
            "so that it can be seen.\n\n"
            "A clinical thermometer is a liquid-in-glass thermometer with a very short range, "
            "from about 35 degrees Celsius to about 42 degrees Celsius, because body temperature "
            "never moves far outside that range. Its scale is divided into steps of 0.1 degree "
            "Celsius so that a small change can be read, and a constriction in the bore above the "
            "bulb keeps the thread at the highest reading until the thermometer is shaken down.\n\n"
            "A thermometer is calibrated by marking two fixed points on its scale and dividing the "
            "distance between them into equal degrees. A good thermometer must also respond "
            "quickly, be sensitive enough to show a small change of temperature, and be small "
            "enough that it does not change the temperature of what it is measuring. A resistance "
            "thermometer or a thermistor has the advantage that its sensor is small and its "
            "reading is an electrical resistance, so it can be read at a distance or recorded "
            "automatically."
        ),
        "objectives": [
            "State what is meant by a thermometric property",
            "Describe the physical properties used by liquid-in-glass, resistance, thermistor, gas and thermocouple thermometers",
            "Explain the features of a clinical thermometer",
        ],
        "concepts": [
            "A thermometric property is a physical property that changes in a regular way when the temperature changes.",
            "The thermometric properties in use include the volume of a liquid, the electrical resistance of a metal, the electrical resistance of a semiconductor, the pressure of a gas at constant volume, the e.m.f. of a thermocouple and the expansion of a bimetallic strip.",
            "Mercury is used from about -39 degrees Celsius to about 357 degrees Celsius; alcohol is used at very low temperatures and is dyed red.",
            "A clinical thermometer has a range of about 35 degrees Celsius to about 42 degrees Celsius and a constriction that holds the highest reading.",
        ],
        "experiment": {
            "type": "matching-game",
            "description": (
                "Match each thermometric property - the volume of a liquid, the electrical "
                "resistance of a metal, the electrical resistance of a semiconductor, the pressure "
                "of a gas at constant volume, the e.m.f. of a thermocouple and the expansion of a "
                "bimetallic strip - to the thermometer it works in."
            ),
        },
        "set": {
            "title": "Physical Properties and Thermometers",
            "subtitle": "Drag each thermometric property onto the thermometer it works in.",
            "kind": "match",
            "pairs": [
                {"id": "th1", "target": "in which the liquid expands up a fine capillary bore as it is warmed", "label": "The volume of a liquid"},
                {"id": "th2", "target": "rises with temperature, and it is the property used by a platinum resistance thermometer", "label": "The electrical resistance of a metal"},
                {"id": "th3", "target": "falls as it gets hotter, and it is the property used by a thermistor", "label": "The electrical resistance of a semiconductor"},
                {"id": "th4", "target": "the most accurate type and the one used to check the others", "label": "The pressure of a gas at constant volume"},
                {"id": "th5", "target": "the property used by a thermocouple thermometer", "label": "The e.m.f. of a thermocouple"},
                {"id": "th6", "target": "the property used by a bimetallic thermometer in a thermostat", "label": "The expansion of a bimetallic strip"},
            ],
        },
    },
    {
        "id": "thermal-temperature-scales-and-fixed-points",
        "title": "Celsius Scale Fixed Points",
        "content": (
            "A temperature scale needs two fixed points, whose temperatures do not change, so that "
            "an instrument can be marked at them and the distance between them divided up. On the "
            "Celsius scale the lower fixed point, called the ice point, is the temperature of pure "
            "melting ice at normal atmospheric pressure, and it is given the value 0 degrees "
            "Celsius. The upper fixed point, called the steam point, is the temperature of the "
            "steam above pure water boiling at normal atmospheric pressure, and it is given the "
            "value 100 degrees Celsius.\n\n"
            "The distance between the two fixed points is divided into 100 equal parts, so one "
            "degree Celsius is one hundredth of the interval between the ice point and the steam "
            "point. To calibrate a thermometer it is placed in a funnel of crushed melting ice, "
            "the ice is stirred, and the level of the thread is marked 0; the bulb is then held in "
            "the steam above boiling water and the level is marked 100; the interval between the "
            "two marks is then divided into 100 equal degrees. A check at an intermediate "
            "temperature, against a standard thermometer, shows whether the bore is uniform along "
            "its length.\n\n"
            "Two precautions matter. The bulb must be in the steam and not in the boiling water, "
            "because the water is slightly hotter than the steam when the thermometer itself cools "
            "the water; and the pressure must be stated, because the boiling point of water falls "
            "as the pressure falls. Water boils below 100 degrees Celsius high on a mountain and "
            "above 100 degrees Celsius in a pressure cooker, so a steam point marked at normal "
            "atmospheric pressure is only correct at that pressure.\n\n"
            "The Celsius scale is also called the centigrade scale, from the 100 divisions between "
            "its fixed points. The Fahrenheit scale uses different fixed points: the ice point is "
            "32 degrees Fahrenheit and the steam point is 212 degrees Fahrenheit, with 180 "
            "divisions between them, but the CSEC syllabus uses the Celsius scale. Because the "
            "Celsius zero is simply the ice point and not the lowest temperature that can exist, "
            "Celsius readings may be negative, and values below 0 degrees Celsius are common in "
            "colder countries."
        ),
        "objectives": [
            "State the two fixed points of the Celsius scale and their values",
            "Describe how a thermometer is calibrated and checked",
            "Explain why the pressure must be stated at the steam point",
        ],
        "concepts": [
            "The lower fixed point, the ice point, is the temperature of pure melting ice at normal atmospheric pressure and is marked 0 degrees Celsius.",
            "The upper fixed point, the steam point, is the temperature of the steam above pure water boiling at normal atmospheric pressure and is marked 100 degrees Celsius.",
            "One degree Celsius is one hundredth of the interval between the ice point and the steam point.",
            "The boiling point of water depends on the pressure, so the steam point is only correct at normal atmospheric pressure.",
        ],
        "experiment": {
            "type": "matching-game",
            "description": (
                "Match each fixed point or scale term - the lower fixed point, the upper fixed "
                "point, one degree Celsius, the ice point, the steam point and the Fahrenheit "
                "scale - to the statement that defines it."
            ),
        },
        "set": {
            "title": "Celsius Scale Fixed Points",
            "subtitle": "Drag each fixed point and scale term onto the statement that defines it.",
            "kind": "match",
            "pairs": [
                {"id": "ts1", "target": "the temperature of pure melting ice at normal atmospheric pressure", "label": "The lower fixed point"},
                {"id": "ts2", "target": "the temperature of the steam above pure water boiling at normal atmospheric pressure", "label": "The upper fixed point"},
                {"id": "ts3", "target": "one hundredth of the interval between the ice point and the steam point", "label": "One degree Celsius"},
                {"id": "ts4", "target": "and it is given the value 0 degrees Celsius", "label": "The ice point"},
                {"id": "ts5", "target": "and it is given the value 100 degrees Celsius", "label": "The steam point"},
                {"id": "ts6", "target": "the ice point is 32 degrees Fahrenheit and the steam point is 212 degrees Fahrenheit, with 180 divisions between them", "label": "The Fahrenheit scale"},
            ],
        },
    },
    {
        "id": "thermal-states-of-matter",
        "title": "States of Matter",
        "content": (
            "Matter exists in three states - solid, liquid and gas - and the difference between "
            "them lies in how the particles are arranged and how they move. In a solid the "
            "particles are packed closely in a regular pattern and held by strong forces, so its "
            "particles can only vibrate about a fixed position. In a liquid the particles are "
            "still close together but the forces between them are weaker, so the particles can "
            "slide past one another and the liquid can flow. In a gas the particles are far apart "
            "and the forces between them are negligible, so they move rapidly and randomly in all "
            "directions.\n\n"
            "These arrangements explain the properties of the three states. A solid has a fixed "
            "shape and a fixed volume, and it cannot be compressed except by a very large force. A "
            "liquid has a fixed volume but no fixed shape, because it takes the shape of the "
            "container it is poured into, and it is very difficult to compress. A gas has neither "
            "a fixed shape nor a fixed volume, because it fills its container completely, and it "
            "is easily compressed because of the large empty space between its particles.\n\n"
            "Density follows the same picture. A solid is usually the densest state of a "
            "substance, a gas is the least dense state of a substance by a wide margin, and a "
            "liquid lies between them, because the particles of a gas are spread through a much "
            "larger volume. Diffusion, the spreading of one substance through another, is fastest "
            "in gases. Diffusion is slower in liquids and very slow in solids, because the "
            "particles of a gas move fastest and have the most space to move through.\n\n"
            "Water is the important exception to the density rule: ice is less dense than water "
            "and so ice floats, because water expands as it freezes. Heating moves a substance "
            "from one state to a less orderly one. Melting, boiling and evaporation all take in "
            "energy that is used to break the forces holding the particles together rather than to "
            "raise the temperature, so the temperature stays constant while the change of state is "
            "going on. Sublimation takes a solid straight to a gas, as dry ice does. The random "
            "jiggling of smoke or pollen grains seen under a microscope, called Brownian motion, "
            "is evidence that the particles of a fluid are in constant random motion."
        ),
        "objectives": [
            "Describe the arrangement and motion of particles in solids, liquids and gases",
            "Explain the shape, volume and compressibility of each state in terms of its particles",
            "Relate density and diffusion to the spacing and motion of the particles",
        ],
        "concepts": [
            "In a solid the particles are packed closely in a regular pattern and held by strong forces, so they can only vibrate about a fixed position.",
            "In a liquid the particles can slide past one another and the liquid can flow, and in a gas the particles are far apart and move rapidly and randomly.",
            "A solid has a fixed shape and a fixed volume, a liquid has a fixed volume but no fixed shape, and a gas fills its container completely.",
            "Diffusion is fastest in gases because their particles move fastest and have the most space to move through.",
            "Brownian motion is evidence that the particles of a fluid are in constant random motion.",
        ],
        "experiment": {
            "type": "classifier-sim",
            "description": "Sort each description of particles and properties under Solid, Liquid or Gas.",
        },
        "set": {
            "title": "States of Matter",
            "subtitle": "Sort each description under Solid, Liquid or Gas.",
            "kind": "sort",
            "categories": [
                {"id": "solid", "label": "Solid"},
                {"id": "liquid", "label": "Liquid"},
                {"id": "gas", "label": "Gas"},
            ],
            "items": [
                {"id": "sm1", "label": "The particles are packed closely in a regular pattern and held by strong forces", "category": "solid"},
                {"id": "sm2", "label": "Its particles can only vibrate about a fixed position", "category": "solid"},
                {"id": "sm3", "label": "A fixed shape and a fixed volume", "category": "solid"},
                {"id": "sm4", "label": "The particles can slide past one another and the liquid can flow", "category": "liquid"},
                {"id": "sm5", "label": "A fixed volume but no fixed shape, because it takes the shape of the container it is poured into", "category": "liquid"},
                {"id": "sm6", "label": "It is very difficult to compress", "category": "liquid"},
                {"id": "sm7", "label": "The particles are far apart and the forces between them are negligible", "category": "gas"},
                {"id": "sm8", "label": "It fills its container completely", "category": "gas"},
                {"id": "sm9", "label": "Easily compressed because of the large empty space between its particles", "category": "gas"},
            ],
        },
    },
    {
        "id": "thermal-determining-specific-heat-capacity",
        "title": "Determination of Specific Heat Capacity",
        "content": (
            "The specific heat capacity of a metal can be measured with an electrical heater. A "
            "block of the metal has two holes, one for the heater and one for the thermometer, and "
            "the mass of the block is found on a balance. The heater is connected to a voltmeter "
            "and an ammeter and switched on, and the voltmeter reading, the ammeter reading and "
            "the time for which the heater is switched on are all recorded. The energy supplied by "
            "the heater is the electrical energy E = VIt, where V is the potential difference in "
            "volts, I is the current in amperes and t is the time in seconds.\n\n"
            "The temperature is read before the heater is switched on and again after it has risen "
            "by about ten degrees, so the temperature rise is the difference between the two "
            "readings. Rearranging E = mc delta theta gives the specific heat capacity as the "
            "energy supplied divided by the mass of the block and the temperature rise, that is c = "
            "VIt divided by m delta theta. A check against the accepted value shows how good the "
            "experiment was: aluminium comes out near 900 joules per kilogram degree Celsius and "
            "copper near 390.\n\n"
            "Heat loss to the surroundings is the main source of error, and the experiment reduces "
            "it in three ways. The block is lagged with insulating material, so that little energy "
            "escapes to the air. The block starts a few degrees below room temperature and ends a "
            "few degrees above it, so the energy gained from the room at the start roughly cancels "
            "the energy lost to the room at the end. The heater is switched off just before the "
            "final reading and the highest temperature reached is taken, because the block goes on "
            "warming for a moment as the heat spreads through it.\n\n"
            "A second method, the method of mixtures, measures the specific heat capacity of a "
            "solid that cannot easily be drilled. The solid is heated in boiling water to a known "
            "temperature and then transferred quickly into a known mass of cold water in a copper "
            "calorimeter, and the highest temperature the mixture reaches is noted. The heat lost "
            "by the hot solid equals the heat gained by the water and the calorimeter, so the "
            "specific heat capacity of the solid is found by equating the two amounts of energy. "
            "The solid must be transferred quickly, the calorimeter must be insulated, and the "
            "water must be stirred, because heat lost on the way and an uneven temperature both "
            "make the answer too low."
        ),
        "objectives": [
            "Describe the electrical heater method of measuring specific heat capacity",
            "Use E = VIt and c = VIt divided by m delta theta",
            "Explain how heat loss is reduced, and describe the method of mixtures",
        ],
        "concepts": [
            "The energy supplied by the heater is the electrical energy E = VIt, where V is the potential difference, I is the current and t is the time in seconds.",
            "The specific heat capacity is the energy supplied divided by the mass of the block and the temperature rise.",
            "The block is lagged with insulating material, so that little energy escapes to the air, and the block starts a few degrees below room temperature and ends a few degrees above it.",
            "In the method of mixtures the heat lost by the hot solid equals the heat gained by the water and the calorimeter.",
        ],
        "experiment": {
            "type": "matching-game",
            "description": (
                "Match each quantity, step or precaution - VIt, the temperature rise, c = VIt "
                "divided by m delta theta, the method of mixtures, the lagging and the practice of "
                "starting below room temperature - to what it is for."
            ),
        },
        "set": {
            "title": "Determination of Specific Heat Capacity",
            "subtitle": "Drag each quantity, step and precaution onto what it is for.",
            "kind": "match",
            "pairs": [
                {"id": "sh1", "target": "is the electrical energy E = VIt, where V is the potential difference in volts", "label": "VIt"},
                {"id": "sh2", "target": "the difference between the two readings", "label": "The temperature rise"},
                {"id": "sh3", "target": "the energy supplied divided by the mass of the block and the temperature rise", "label": "c = VIt divided by m delta theta"},
                {"id": "sh4", "target": "the heat lost by the hot solid equals the heat gained by the water and the calorimeter", "label": "The method of mixtures"},
                {"id": "sh5", "target": "so that little energy escapes to the air", "label": "Lagged with insulating material"},
                {"id": "sh6", "target": "so the energy gained from the room at the start roughly cancels the energy lost to the room at the end", "label": "Starts a few degrees below room temperature"},
            ],
        },
    },
    {
        "id": "thermal-determining-specific-latent-heat",
        "title": "Determination of Specific Latent Heat",
        "content": (
            "The specific latent heat of fusion of ice is measured by melting ice with an "
            "electrical heater and weighing the water that is produced. The gauze and funnel hold "
            "the ice so that the melted water can be collected in a beaker below. An electrical "
            "heater supplies the energy E = VIt that melts the ice, and the ice is only ever at 0 "
            "degrees Celsius, so every joule supplied goes into melting ice rather than into "
            "warming it.\n\n"
            "The steps are simple to write down. Dried crushed ice is used so that surface water "
            "is not weighed as if it had been melted by the heater. The heater is switched on and "
            "a stopwatch started, and the voltmeter reading, the ammeter reading and the time are "
            "recorded. The mass of ice melted is found by weighing the water collected while the "
            "heater is running, so that ice melted by the warmth of the room is not counted. When "
            "enough water has been collected the supply is switched off, the water is weighed, and "
            "the specific latent heat is found from L = E divided by m, the energy supplied "
            "divided by the mass of ice melted.\n\n"
            "The specific latent heat of fusion is the energy needed to melt one kilogram of ice "
            "at 0 degrees Celsius, about 334 000 joules per kilogram, and the same amount of "
            "energy is given out when one kilogram of water freezes. The ice must be crushed and "
            "patted dry before it is used, because surface water would be weighed as though the "
            "heater had melted it and would make the answer too small. The funnel must not be "
            "warmed by the heater, none of the collected water may be allowed to evaporate, and a "
            "large mass of ice is used so that the percentage error in weighing is small.\n\n"
            "The specific latent heat of vaporisation is the energy needed to boil one kilogram "
            "of water, about 2 260 000 joules per kilogram, and it is much larger than the latent "
            "heat of fusion because the particles must be completely separated rather than merely "
            "loosened from one another. It is measured by passing a known electrical energy into "
            "water that is already boiling in a flask and collecting the steam that escapes in a "
            "condenser. The experiment is harder to control, because steam escapes unseen and hot "
            "apparatus is a scalding hazard, so the mass of water lost is found by weighing the "
            "flask before and after the run, and the value found is checked against the accepted "
            "one."
        ),
        "objectives": [
            "Describe how the specific latent heat of fusion of ice is measured with an electrical heater",
            "Use E = VIt and L = E divided by m in a latent heat calculation",
            "Explain the precautions and say why the latent heat of vaporisation is larger",
        ],
        "concepts": [
            "The specific latent heat of fusion is the energy needed to melt one kilogram of ice at 0 degrees Celsius, about 334 000 joules per kilogram.",
            "The specific latent heat of vaporisation is the energy needed to boil one kilogram of water, about 2 260 000 joules per kilogram.",
            "The gauze and funnel hold the ice so that the melted water can be collected in a beaker below.",
            "The mass of ice melted is found by weighing the water collected while the heater is running, and L = E divided by m.",
        ],
        "experiment": {
            "type": "matching-game",
            "description": (
                "Match each part of the melting-ice experiment - the gauze and funnel, the "
                "electrical heater, dried crushed ice, the mass of ice melted, the specific latent "
                "heat of fusion and the specific latent heat of vaporisation - to what it does or "
                "what it is."
            ),
        },
        "set": {
            "title": "Determination of Specific Latent Heat",
            "subtitle": "Drag each part of the melting-ice experiment onto what it does.",
            "kind": "match",
            "pairs": [
                {"id": "sl1", "target": "hold the ice so that the melted water can be collected in a beaker below", "label": "The gauze and funnel"},
                {"id": "sl2", "target": "supplies the energy E = VIt that melts the ice", "label": "An electrical heater"},
                {"id": "sl3", "target": "is used so that surface water is not weighed as if it had been melted by the heater", "label": "Dried crushed ice"},
                {"id": "sl4", "target": "is found by weighing the water collected while the heater is running", "label": "The mass of ice melted"},
                {"id": "sl5", "target": "is the energy needed to melt one kilogram of ice at 0 degrees Celsius, about 334 000 joules per kilogram", "label": "The specific latent heat of fusion"},
                {"id": "sl6", "target": "is the energy needed to boil one kilogram of water, about 2 260 000 joules per kilogram", "label": "The specific latent heat of vaporisation"},
            ],
        },
    },
    {
        "id": "thermal-evaporation-and-boiling",
        "title": "Evaporation and Boiling",
        "content": (
            "Evaporation is the change of a liquid into a vapour at any temperature. It happens "
            "only at the surface of the liquid, it needs no bubbles, and it takes place in an open "
            "container at whatever temperature the liquid happens to be. Boiling is the change of "
            "a liquid into a vapour at the boiling point, and it happens throughout the liquid, "
            "because bubbles of vapour form below the surface, rise and burst as they reach it. "
            "Both are vaporisation and both take in latent heat, but the two processes differ in "
            "their temperature, in where they happen and in what the liquid does afterwards.\n\n"
            "The liquid that is left behind is cooled, because the fastest particles escape from "
            "the surface. The particles of a liquid have a range of kinetic energies, so the "
            "particles that escape are the fastest ones, the average kinetic energy of the "
            "particles remaining falls, and the temperature of the liquid falls with it. That is "
            "why a wet hand feels cold in a breeze, why sweating cools the body, why water in a "
            "porous earthenware pot stays cooler than water in a metal can, and why a refrigerator "
            "works by evaporating a volatile refrigerant in a coil inside it.\n\n"
            "Four factors change the rate of evaporation. A higher temperature gives more "
            "particles the energy to escape from the surface. A larger surface area lets more "
            "particles escape at once. A draught of moving air carries the escaped vapour away and "
            "keeps the space above the liquid dry. Lower humidity of the air, because dry air "
            "holds fewer vapour particles already, lets evaporation continue quickly. A volatile "
            "liquid such as petrol or ether evaporates faster than water for the same reason.\n\n"
            "Boiling happens at a definite temperature, the boiling point. The temperature stays "
            "constant while the liquid boils, because the energy supplied is used as latent heat "
            "rather than to raise the temperature. Its temperature depends on the pressure "
            "above the liquid. Water boils at 100 degrees Celsius at normal atmospheric pressure, "
            "at a lower temperature high on a mountain where the pressure is less, and at a higher "
            "temperature in a pressure cooker where the pressure is greater. Evaporation, by "
            "contrast, has no fixed temperature at all, because it goes on at every temperature "
            "the liquid can exist at."
        ),
        "objectives": [
            "Compare evaporation and boiling",
            "Explain cooling by evaporation in terms of the escape of the fastest particles",
            "List the factors that change the rate of evaporation, and say how pressure changes the boiling point",
        ],
        "concepts": [
            "The change of a liquid into a vapour at any temperature, at the surface only, is evaporation; the change of a liquid into a vapour at the boiling point, throughout the liquid, is boiling.",
            "Evaporation cools the liquid that is left behind, because the fastest particles escape and the average kinetic energy of the particles remaining falls.",
            "The rate of evaporation rises with temperature, with surface area, with a draught of moving air and with lower humidity.",
            "The boiling point stays constant while a liquid boils, and it depends on the pressure above the liquid.",
        ],
        "experiment": {
            "type": "classifier-sim",
            "description": "Sort each statement about the change from liquid to vapour under Evaporation or Boiling.",
        },
        "set": {
            "title": "Evaporation and Boiling",
            "subtitle": "Sort each statement under Evaporation or Boiling.",
            "kind": "sort",
            "categories": [
                {"id": "evap", "label": "Evaporation"},
                {"id": "boil", "label": "Boiling"},
            ],
            "items": [
                {"id": "eb1", "label": "The change of a liquid into a vapour at any temperature", "category": "evap"},
                {"id": "eb2", "label": "It happens only at the surface of the liquid", "category": "evap"},
                {"id": "eb3", "label": "It needs no bubbles, and it takes place in an open container", "category": "evap"},
                {"id": "eb4", "label": "The liquid that is left behind is cooled, because the fastest particles escape", "category": "evap"},
                {"id": "eb5", "label": "The change of a liquid into a vapour at the boiling point", "category": "boil"},
                {"id": "eb6", "label": "It happens throughout the liquid, because bubbles of vapour form below the surface, rise and burst as they reach it", "category": "boil"},
                {"id": "eb7", "label": "The temperature stays constant while the liquid boils", "category": "boil"},
                {"id": "eb8", "label": "Its temperature depends on the pressure above the liquid", "category": "boil"},
            ],
        },
    },
    {
        "id": "thermal-absorption-and-emission-of-radiation",
        "title": "Absorption and Emission of Radiation Factors",
        "content": (
            "Every object with a temperature above absolute zero absorbs and emits infra-red "
            "radiation, and it does both at the same time. Radiation needs no medium, so it "
            "travels through a vacuum at the speed of light, and it can be reflected, absorbed or "
            "transmitted when it meets a surface. Whether a surface warms or cools depends on the "
            "balance between the two: an object hotter than its surroundings emits more than it "
            "absorbs and cools down, while an object cooler than its surroundings absorbs more "
            "than it emits and warms up. When the two rates are equal the object is in thermal "
            "equilibrium with its surroundings.\n\n"
            "The rate at which a surface absorbs or emits radiation depends on its colour and "
            "texture. A dull black surface is the best absorber, because it reflects almost "
            "nothing, and it is also the best emitter. A shiny, silvered surface is a poor "
            "absorber, because it reflects most of the radiation that falls on it, and it is also "
            "a poor emitter. White and light surfaces reflect most of the radiation that falls on "
            "them and absorb little. A rough, matt surface has a larger real area than a smooth "
            "one, so it absorbs and emits more than a polished surface of the same size.\n\n"
            "The temperature of the object is the second factor. The hotter an object is, the more "
            "radiation it emits each second, so a hot object loses energy faster than a warm one. "
            "The rate of emission falls as the object cools, and it becomes equal to the rate at "
            "which it absorbs when the object reaches the temperature of its surroundings, at "
            "which point it stops losing temperature by radiation.\n\n"
            "The area of the surface is the third factor. A large surface area emits and absorbs "
            "more radiation each second than a small one at the same temperature, which is why a "
            "car radiator and the elements of a heater are built with a large area, and why a thin "
            "wire cools faster than a thick one. The factors are studied with Leslie's cube, a "
            "metal cube whose vertical faces are dull black, white and silvered, filled with hot "
            "water, with a radiation detector held near each face in turn: the face that gives the "
            "strongest reading is the dull black one, and the silvered face gives the weakest."
        ),
        "objectives": [
            "State that all objects absorb and emit infra-red radiation at the same time",
            "Describe how colour, texture, temperature and area change the rate of absorption and emission",
            "Describe how Leslie's cube is used to compare surfaces",
        ],
        "concepts": [
            "Every object absorbs and emits infra-red radiation at the same time, and an object hotter than its surroundings emits more than it absorbs.",
            "A dull black surface is the best absorber and the best emitter, and a shiny, silvered surface is a poor absorber and a poor emitter.",
            "The hotter an object is, the more radiation it emits each second.",
            "A large surface area emits and absorbs more radiation each second than a small one at the same temperature.",
            "Leslie's cube compares the radiation from a dull black face, a white face and a silvered face.",
        ],
        "experiment": {
            "type": "classifier-sim",
            "description": "Sort each factor and each effect under Colour and texture, Temperature or Area of the surface.",
        },
        "set": {
            "title": "Absorption and Emission of Radiation Factors",
            "subtitle": "Sort each factor under Colour and texture, Temperature or Area of the surface.",
            "kind": "sort",
            "categories": [
                {"id": "colour", "label": "Colour and texture"},
                {"id": "temp", "label": "Temperature"},
                {"id": "area", "label": "Area of the surface"},
            ],
            "items": [
                {"id": "ae1", "label": "A dull black surface is the best absorber, because it reflects almost nothing", "category": "colour"},
                {"id": "ae2", "label": "A shiny, silvered surface is a poor absorber, because it reflects most of the radiation that falls on it", "category": "colour"},
                {"id": "ae3", "label": "White and light surfaces reflect most of the radiation that falls on them and absorb little", "category": "colour"},
                {"id": "ae4", "label": "The hotter an object is, the more radiation it emits each second", "category": "temp"},
                {"id": "ae5", "label": "A hot object loses energy faster than a warm one", "category": "temp"},
                {"id": "ae6", "label": "It becomes equal to the rate at which it absorbs when the object reaches the temperature of its surroundings", "category": "temp"},
                {"id": "ae7", "label": "A large surface area emits and absorbs more radiation each second than a small one at the same temperature", "category": "area"},
                {"id": "ae8", "label": "A car radiator and the elements of a heater are built with a large area", "category": "area"},
                {"id": "ae9", "label": "A thin wire cools faster than a thick one", "category": "area"},
            ],
        },
    },
    {
        "id": "thermal-good-absorbers-and-emitters",
        "title": "Good Absorbers and Emitters",
        "content": (
            "A surface that absorbs radiation well also emits it well, and a surface that reflects "
            "radiation well absorbs and emits it poorly. Dull black surfaces are good absorbers "
            "and good emitters of radiation. Shiny, silvered or white surfaces are poor absorbers "
            "and poor emitters, because they reflect radiation instead of taking it in. The same "
            "surface behaves the same way in both directions, so the black base of a cooking pot "
            "takes in the energy of a flame quickly, and that same black surface, when it is hot, "
            "gives out energy quickly.\n\n"
            "This single rule explains many everyday designs. A vacuum flask, also called a Dewar "
            "flask, is silvered inside so that its walls are poor emitters and poor absorbers of "
            "radiation, and it is double-walled with the air pumped out so that there is nothing "
            "between the walls to conduct or to convect; a cork or plastic stopper closes the top, "
            "because both are poor conductors. Tea in a silvered pot stays hot for the same "
            "reason, because the shiny surface radiates very little, and the same pot keeps a cold "
            "drink cold, because a shiny surface also absorbs very little radiation from the warm "
            "room.\n\n"
            "A solar water heater uses the opposite choice. The plate of a solar water heater is "
            "painted matt black so that it absorbs as much of the sun's radiation as possible, and "
            "it is covered by glass, which lets the short-wave radiation of the sun in and slows "
            "down the escape of the longer-wave radiation given out by the hot plate. A greenhouse "
            "and a closed car left standing in the sun are warmed by the same trap.\n\n"
            "Other applications follow the rule. The radiator of a car and the fins of an electric "
            "heater are painted black so that they emit as strongly as possible, and a heater is "
            "placed in front of a shiny reflector so that most of its radiation is directed into "
            "the room instead of into the wall behind it. White clothes are worn in strong "
            "sunshine, because a white surface reflects the sun's radiation and absorbs little, "
            "and dark clothes feel hotter for the opposite reason. An engine, a hot pipe and a "
            "metal roof all lose energy by radiation, and giving them a shiny surface slows that "
            "loss."
        ),
        "objectives": [
            "State the rule that good absorbers are also good emitters",
            "Explain why a vacuum flask and a silvered teapot keep drinks hot and cold",
            "Give and explain applications of good and poor absorbers and emitters",
        ],
        "concepts": [
            "Dull black surfaces are good absorbers and good emitters of radiation, and shiny, silvered or white surfaces are poor absorbers and poor emitters.",
            "A vacuum flask is silvered inside so that its walls are poor emitters and poor absorbers of radiation, and it is double-walled with the air pumped out so that there is nothing between the walls to conduct or to convect.",
            "The plate of a solar water heater is painted matt black so that it absorbs as much of the sun's radiation as possible.",
            "The radiator of a car is painted black so that it emits as strongly as possible.",
        ],
        "experiment": {
            "type": "matching-game",
            "description": (
                "Match each surface or device - dull black surfaces, shiny and white surfaces, a "
                "vacuum flask, the plate of a solar water heater, the glass cover and white "
                "clothes - to what it does with radiation."
            ),
        },
        "set": {
            "title": "Good Absorbers and Emitters",
            "subtitle": "Drag each surface or device onto what it does with radiation.",
            "kind": "match",
            "pairs": [
                {"id": "ge1", "target": "are good absorbers and good emitters of radiation", "label": "Dull black surfaces"},
                {"id": "ge2", "target": "are poor absorbers and poor emitters, because they reflect radiation instead of taking it in", "label": "Shiny, silvered or white surfaces"},
                {"id": "ge3", "target": "is silvered inside so that its walls are poor emitters and poor absorbers of radiation", "label": "A vacuum flask"},
                {"id": "ge4", "target": "is painted matt black so that it absorbs as much of the sun's radiation as possible", "label": "The plate of a solar water heater"},
                {"id": "ge5", "target": "lets the short-wave radiation of the sun in and slows down the escape of the longer-wave radiation given out by the hot plate", "label": "Covered by glass"},
                {"id": "ge6", "target": "reflects the sun's radiation and absorbs little", "label": "White clothes"},
            ],
        },
    },
    {
        "id": "thermal-energy-transfer-device-design",
        "title": "Thermal Energy Transfer Device Design",
        "content": (
            "Designers reduce unwanted heat transfer by attacking each of the three mechanisms in "
            "turn: they choose a poor conductor to slow conduction, they trap air or remove it to "
            "stop convection, and they use shiny surfaces to cut down radiation. A good design "
            "usually does all three at once, and the same design that keeps a hot drink hot also "
            "keeps a cold drink cold, because it slows the transfer of energy in both directions."
            "\n\n"
            "The vacuum flask is the clearest example. It has a double wall of glass with the air "
            "pumped out of the space between, so there is no air to conduct or to convect across "
            "the gap, and both glass surfaces are silvered, which makes them poor emitters and "
            "poor absorbers of radiation. The bottle is held in a plastic case, and it is closed "
            "with a cork or plastic stopper, because both are poor conductors and the stopper also "
            "stops warm air leaving by convection at the top.\n\n"
            "A solar water heater is designed to collect energy instead of keeping it out. Its "
            "plate is painted matt black so that it absorbs as much of the sun's radiation as "
            "possible, and it is covered by glass, which lets the short-wave radiation of the sun "
            "in and slows down the escape of the longer-wave radiation given out by the hot plate. "
            "The pipes of the plate are joined to a tank above them, and because warm water is less "
            "dense than cold water, convection carries the heated water up into the tank and brings "
            "cooler water down to be heated, so no pump is needed. The tank is lagged so that the "
            "collected energy is not lost again.\n\n"
            "House insulation uses the same thinking. Loft insulation of fibreglass or rock wool "
            "traps air, and trapped air is a poor conductor, so energy from the rooms below cannot "
            "conduct through the roof. Cavity wall insulation fills the gap between the two leaves "
            "of a brick wall with foam or beads for the same reason, and stops convection in the "
            "cavity. Double glazing puts two sheets of glass with air or argon between "
            "them, which slows conduction and stops convection, and a foil behind a radiator "
            "sends radiation back into the room. Draught excluders, heavy curtains and closed "
            "doors cut down convection, because moving air carries energy away faster than any "
            "other mechanism. A cooking pan follows the same rules from the other side: a metal "
            "base conducts energy well into the food, and a wooden or plastic handle is a poor "
            "conductor, so that the pan can be lifted."
        ),
        "objectives": [
            "Explain how a vacuum flask reduces conduction, convection and radiation",
            "Describe how a solar water heater is designed to absorb and keep energy",
            "Describe how loft insulation, cavity wall insulation and double glazing reduce heat loss from a house",
        ],
        "concepts": [
            "A vacuum flask has a double wall of glass with the air pumped out of the space between, so there is no air to conduct or to convect across the gap.",
            "Both glass surfaces of a vacuum flask are silvered, which makes them poor emitters and poor absorbers of radiation.",
            "The plate of a solar water heater is painted matt black, so it absorbs as much of the sun's radiation as possible.",
            "Loft insulation of fibreglass or rock wool traps air, and trapped air is a poor conductor.",
            "A metal base conducts energy into the food, and a wooden or plastic handle is a poor conductor.",
        ],
        "experiment": {
            "type": "classifier-sim",
            "description": "Sort each design feature under Vacuum flask, Solar water heater or House insulation.",
        },
        "set": {
            "title": "Thermal Energy Transfer Device Design",
            "subtitle": "Sort each design feature under Vacuum flask, Solar water heater or House insulation.",
            "kind": "sort",
            "categories": [
                {"id": "flask", "label": "Vacuum flask"},
                {"id": "solar", "label": "Solar water heater"},
                {"id": "house", "label": "House insulation"},
            ],
            "items": [
                {"id": "dd1", "label": "A double wall of glass with the air pumped out of the space between", "category": "flask"},
                {"id": "dd2", "label": "Both glass surfaces are silvered, which makes them poor emitters and poor absorbers of radiation", "category": "flask"},
                {"id": "dd3", "label": "A cork or plastic stopper, because both are poor conductors", "category": "flask"},
                {"id": "dd4", "label": "Its plate is painted matt black so that it absorbs as much of the sun's radiation as possible", "category": "solar"},
                {"id": "dd5", "label": "It is covered by glass, which lets the short-wave radiation of the sun in and slows down the escape of the longer-wave radiation", "category": "solar"},
                {"id": "dd6", "label": "Convection carries the heated water up into the tank and brings cooler water down to be heated, so no pump is needed", "category": "solar"},
                {"id": "dd7", "label": "Fibreglass or rock wool traps air, and trapped air is a poor conductor", "category": "house"},
                {"id": "dd8", "label": "Fills the gap between the two leaves of a brick wall with foam or beads for the same reason, and stops convection in the cavity", "category": "house"},
                {"id": "dd9", "label": "A foil behind a radiator sends radiation back into the room", "category": "house"},
            ],
        },
    },
]

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def fold(s):
    """Mirror of the harness fold: case, dashes and whitespace only."""
    out = []
    for ch in str(s).lower():
        if ch in "\u2018\u2019":
            out.append("'")
        elif ch in "\u2014\u2013\u2212":
            out.append("-")
        else:
            out.append(ch)
    return " ".join("".join(out).split())


def esc(s):
    """JSON-encode a string fragment the way the file already does (ASCII escapes)."""
    return json.dumps(s, ensure_ascii=True)[1:-1]


def lesson_block(lesson, indent=W):
    text = json.dumps(lesson, indent=4, ensure_ascii=True)
    return "\n".join((indent + ln) if ln else ln for ln in text.split("\n"))


def splice(raw, anchor, replacement, what):
    n = raw.count(anchor)
    if n != 1:
        raise SystemExit("ANCHOR PROBLEM (%s): found %d occurrences, expected 1" % (what, n))
    return raw.replace(anchor, replacement, 1)


def main():
    raw = open(MODULES, "r", encoding="utf-8").read()
    parsed = json.loads(raw)

    # ---- idempotency guard -------------------------------------------------
    if '"thermal-energy-transfer-device-design"' in raw:
        print("already applied: all nine thermal- lessons are present in modules.json")
        # still prove the mirror matches
        mirror = open(MIRROR, "r", encoding="utf-8").read()
        print("mirror identical:", mirror == raw)
        return

    thermal = [m for m in parsed if m["id"] == "thermal-physics"][0]
    if [l["id"] for l in thermal["lessons"]] != [
        "temperature-heat", "gas-laws", "specific-and-latent-heat"
    ]:
        raise SystemExit("thermal-physics lesson ids are not the expected three")

    baseline_ids = [l["id"] for m in parsed for l in m["lessons"]]
    if len(baseline_ids) != len(set(baseline_ids)):
        raise SystemExit("duplicate lesson id in baseline")

    out = raw

    # ---- EXTEND 4 ---------------------------------------------------------
    for lid, chapter, paragraph, concepts in EXTENDS:
        start = out.index(W + '{\n' + P + '"id": "' + lid + '"')
        end = out.find(W + '{\n' + P + '"id": "', start + 10)
        if end == -1:
            end = out.index("\n        ]", start)
        block = out[start:end]
        # content line
        marker = "\n" + P + '"content": "'
        ci = block.index(marker)
        line_start = ci + 1
        line_end = block.index("\n", line_start)
        line = block[line_start:line_end]
        head = P + '"content": "'
        if not line.startswith(head) or not line.endswith('",'):
            raise SystemExit("content line shape unexpected for " + lid)
        inner = line[len(head):-2]
        if json.loads('"' + inner + '"') != [
            l for m in json.loads(out) if m["id"] == "thermal-physics" for l in m["lessons"] if l["id"] == lid
        ][0]["content"]:
            raise SystemExit("content line does not decode to the parsed value for " + lid)
        new_inner = inner + esc("\n\n" + paragraph)
        # concepts block: pure append inside the existing array
        cmarker = "\n" + P + '"concepts": [\n'
        cstart = block.index(cmarker) + len(cmarker)
        cend = block.index("\n" + P + "],\n", cstart)
        entries = block[cstart:cend].split("\n")
        if not all(e.startswith(Q) for e in entries):
            raise SystemExit("concepts entries shape unexpected for " + lid)
        entries[-1] = entries[-1] + ","
        all_lines = entries + [Q + json.dumps(c, ensure_ascii=True) + "," for c in concepts]
        all_lines[-1] = all_lines[-1].rstrip(",")
        new_block = (
            block[:line_start]
            + head + new_inner + '",'
            + block[line_end:cstart]
            + "\n".join(all_lines)
            + block[cend:]
        )
        out = out[:start] + new_block + out[end:]
        print("EXTEND %-26s <- %s (%d concepts added)" % (lid, chapter, len(concepts)))

    # ---- NEW 9 -----------------------------------------------------------
    anchor = W + "}\n        ]\n    },\n    {\n        \"id\": \"waves-light\","
    blocks = [lesson_block({k: v for k, v in l.items() if k != "set"}) for l in NEW_LESSONS]
    body = ",\n".join(blocks)
    replacement = W + "},\n" + body + "\n        ]\n    },\n    {\n        \"id\": \"waves-light\","
    out = splice(out, anchor, replacement, "thermal-physics lessons array end")
    print("NEW     %d lessons appended to thermal-physics" % len(NEW_LESSONS))

    # ---- verify ----------------------------------------------------------
    after = json.loads(out)
    for m in after:
        if m["id"] != "thermal-physics":
            base = [x for x in parsed if x["id"] == m["id"]][0]
            if m != base:
                raise SystemExit("section %s changed but must not" % m["id"])
    thermal_after = [m for m in after if m["id"] == "thermal-physics"][0]
    got = [l["id"] for l in thermal_after["lessons"]]
    want = ["temperature-heat", "gas-laws", "specific-and-latent-heat"] + [l["id"] for l in NEW_LESSONS]
    if got != want:
        raise SystemExit("thermal lesson order/ids wrong: %r" % got)
    extended = {}
    for lid, chapter, paragraph, concepts in EXTENDS:
        extended.setdefault(lid, ([], []))
        extended[lid][0].append(paragraph)
        extended[lid][1].extend(concepts)
    for lid, (paras, cons) in extended.items():
        old = [l for l in thermal["lessons"] if l["id"] == lid][0]
        new = [l for l in thermal_after["lessons"] if l["id"] == lid][0]
        if new["title"] != old["title"]:
            raise SystemExit("title changed for " + lid)
        if new["content"] != old["content"] + "".join("\n\n" + p for p in paras):
            raise SystemExit("content is not a pure insertion for " + lid)
        if new["concepts"] != old["concepts"] + cons:
            raise SystemExit("concepts are not a pure append for " + lid)
        if new["objectives"] != old["objectives"]:
            raise SystemExit("objectives changed for " + lid)
        if new["experiment"] != old["experiment"]:
            raise SystemExit("experiment changed for " + lid)
    if len(after) != len(parsed):
        raise SystemExit("a section was added or removed")

    # every new lesson: schema + lab strings taught by its own copy
    by_id = {l["id"]: l for l in thermal_after["lessons"]}
    for lesson in NEW_LESSONS:
        lid = lesson["id"]
        live = by_id[lid]
        for key in ("id", "title", "content", "objectives", "concepts", "experiment"):
            if key not in live:
                raise SystemExit("%s: missing %s" % (lid, key))
        if not isinstance(live["concepts"], list) or not all(isinstance(c, str) for c in live["concepts"]):
            raise SystemExit("%s: concepts must be an array of strings" % lid)
        if not isinstance(live["objectives"], list) or not all(isinstance(o, str) for o in live["objectives"]):
            raise SystemExit("%s: objectives must be an array of strings" % lid)
        corpus = fold(" ".join([live["title"], live["content"]] + live["objectives"] + live["concepts"]))
        shown = []
        s = lesson["set"]
        if s["kind"] == "match":
            for p in s["pairs"]:
                shown += [p["label"], p["target"]]
        else:
            for c in s["categories"]:
                shown.append(c["label"])
            for i in s["items"]:
                shown.append(i["label"])
        for text in shown:
            if fold(text) not in corpus:
                raise SystemExit('%s: lab string not taught by the lesson copy: %r' % (lid, text))

    # ---- lessonSets.js ----------------------------------------------------
    ls = open(LESSON_SETS, "r", encoding="utf-8").read()
    ls_anchor = '    },\n    "reflection-and-total-internal-reflection": {'
    set_text = []
    for lesson in NEW_LESSONS:
        s = lesson["set"]
        lines = ["    " + json.dumps(lesson["id"]) + ": {",
                 "      title: " + json.dumps(s["title"], ensure_ascii=False) + ",",
                 "      subtitle: " + json.dumps(s["subtitle"], ensure_ascii=False) + ",",
                 "      kind: " + json.dumps(s["kind"]) + ","]
        if s["kind"] == "match":
            lines.append("      pairs: [")
            for p in s["pairs"]:
                lines.append("        { id: %s, target: %s, label: %s }," % (
                    json.dumps(p["id"]), json.dumps(p["target"], ensure_ascii=False),
                    json.dumps(p["label"], ensure_ascii=False)))
            lines.append("      ],")
        else:
            lines.append("      categories: [")
            for c in s["categories"]:
                lines.append("        { id: %s, label: %s }," % (
                    json.dumps(c["id"]), json.dumps(c["label"], ensure_ascii=False)))
            lines.append("      ],")
            lines.append("      items: [")
            for i in s["items"]:
                lines.append("        { id: %s, label: %s, category: %s }," % (
                    json.dumps(i["id"]), json.dumps(i["label"], ensure_ascii=False),
                    json.dumps(i["category"])))
            lines.append("      ],")
        lines.append("    },")
        set_text.append("\n".join(lines))
    ls_new = splice(ls, ls_anchor, "    },\n" + "\n".join(set_text) + "\n" + ls_anchor[6:],
                    "lessonSets physics insertion point")
    if ls_new == ls:
        raise SystemExit("lessonSets.js unchanged")
    open(LESSON_SETS, "w", encoding="utf-8").write(ls_new)
    print("lessonSets.js: %d physics sets inserted" % len(NEW_LESSONS))

    with open(MODULES, "w", encoding="utf-8") as f:
        f.write(out)
    with open(MIRROR, "w", encoding="utf-8") as f:
        f.write(out)
    print("modules.json: %d -> %d bytes; mirror byte-identical" % (len(raw.encode("utf-8")), len(out.encode("utf-8"))))
    print("sha256 modules.json %s" % hashlib.sha256(out.encode("utf-8")).hexdigest())


if __name__ == "__main__":
    main()
