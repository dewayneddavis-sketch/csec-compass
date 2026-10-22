#!/usr/bin/env python3
"""Physics Section D (Electricity and Magnetism) — the coverage build.

THE SINGLE SOURCE for every content change this section's slice makes.  Two
batches, reconciled into one generator so a rerun from main's baseline reproduces
the shipped tree exactly:

  * 11 NET-NEW lessons — the audit's 11 NEW rows for Section D
    (/home/team/shared/physics-coverage-audit.md section 7).  Batch 1 authored 13;
    batch 2 reconciled four of them away and authored the two the audit lists that
    batch 1 had held (see RECONCILIATION below).
  * 4 EXTEND rows — insertions into the named existing lessons, ids frozen:
      conductors/insulators      -> electric-circuits
      induced electromotive force -> magnetism-and-electromagnetism
      a.c. generators             -> magnetism-and-electromagnetism
      transformers and energy     -> magnetism-and-electromagnetism
  * 8 REUSE rows — nothing written (the existing lessons already teach them).
  * 10 held topics — resolved: 7 REUSE (nothing), 1 EXTEND (conductors, above),
    2 NEW (the two lessons authored here).

RECONCILIATION (batch 1's 13 emitted lessons against the audit's 11 NEW rows).
  Kept (11, the audit's NEW rows): em-charging-by-friction-and-induction,
  em-forces-between-charges, em-electric-fields,
  em-static-charge-applications-and-hazards, em-semiconductor-diodes-and-rectification,
  em-logic-gates-and-truth-tables, em-impact-of-electronics-on-society,
  em-force-on-current-carrying-conductors, em-dc-motor-action, plus the two authored
  here: em-direct-and-alternating-current, em-primary-and-secondary-cells.
  Removed (4) and why — the audit's ruling on each chapter, and it is right on all
  four (evidence: the existing lessons' own copy, read below):
    em-magnetic-fields-from-current     audit REUSE -> duplicate, deleted
    em-induced-electromotive-force      audit EXTEND -> folded into the existing lesson
    em-ac-generators                    audit EXTEND -> folded into the existing lesson
    em-transformers-and-energy-transfer audit EXTEND -> folded into the existing lesson
  Net for the section: 3 existing + 11 new = 14 lessons = 8 REUSE + 4 EXTEND +
  11 NEW = the audit's 23 target chapters.

Edits made (surgical, both trees, ids frozen):
  content/physics/modules.json        (+ public/content mirror, byte-identical)
  src/components/lessonSets.js        (one topic-matched Play-tab set per new lesson)
  practice.json and knowledge-check.json are NOT touched (100 and 25 stand).

WRITES NOTHING unless --apply is passed.  A rerun is idempotent: the generator
rebuilds this section's slice of both files from whatever state it finds, then
asserts every untouched lesson and every other section is unchanged.
Run from the repo root:
    python3 tools/gen-physics-section-d.py            # validate + dry run
    python3 tools/gen-physics-section-d.py --apply    # write the two files
"""
import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODULES = "content/physics/modules.json"
MIRROR = "public/content/physics/modules.json"
LESSON_SETS = "src/components/lessonSets.js"
SECTION = "electricity-magnetism"
MATCH = "matching-game"
SORT = "classifier-sim"
MARKER = "    // ---- Physics Section D (Electricity and Magnetism) coverage build,"


def L(lid, title, paras, objectives, concepts, lab):
    """One new lesson. `lab` is a dict built by match_lab()/sort_lab()."""
    return {
        "id": lid,
        "title": title,
        "paragraphs": paras,
        "objectives": objectives,
        "concepts": concepts,
        "lab": lab,
    }


def match_lab(title, subtitle, pairs):
    return {"kind": "match", "title": title, "subtitle": subtitle, "pairs": pairs}


def sort_lab(title, subtitle, categories, items):
    return {"kind": "sort", "title": title, "subtitle": subtitle,
            "categories": categories, "items": items}

NEW_LESSONS = [
L("em-charging-by-friction-and-induction", "Charging by Friction and Induction",
  [
   "All matter is made of atoms containing protons, neutrons and electrons. Protons carry positive charge, electrons carry an equal negative charge and neutrons carry none. A body is normally neutral because it contains equal numbers of protons and electrons, and the only charged particle that moves from one body to another in everyday charging is the electron. A body that gains electrons becomes negatively charged, and a body that loses electrons is left positively charged.",
   "Charging by friction happens when two different insulators are rubbed together. Rubbing a polythene rod with a dry cloth transfers electrons from the cloth to the rod, so the polythene rod becomes negatively charged while the cloth is left with an equal positive charge. Rubbing a perspex rod transfers electrons in the opposite direction, so the perspex rod becomes positively charged. The two bodies end with equal and opposite charges, because charge is conserved and no charge is created or destroyed.",
   "Charging by induction charges a conductor without touching it with the charged body. When a charged rod is brought near a neutral conductor, the charges inside the conductor separate: charges of the same sign as the rod are repelled towards the far end and charges of the opposite sign are attracted towards the near end. The conductor is earthed while the charged rod is near it, so the repelled charge escapes to earth; the earth connection is then removed and the rod taken away, leaving the conductor charged with the opposite sign to the rod. Nothing is transferred from the rod itself: the conductor is charged by separation and earthing."
  ],
  [
   "Describe charging by friction and explain why the charges produced are equal and opposite",
   "Explain charging by induction and the part played by earthing",
   "Apply the conservation of charge to everyday charging processes"
  ],
  [
   "Charging by friction: rubbing two different insulators together transfers electrons from one to the other.",
   "Charging by induction: bringing a charged body near a conductor, earthing it, and removing the earth to leave it charged.",
   "Conservation of charge: charge is never created or destroyed, only transferred from one body to another."
  ],
  sort_lab("Charging by Friction and Induction", "Sort each statement under Charging by friction or Charging by induction.",
      [{"id": "friction", "label": "Charging by friction"},
       {"id": "induction", "label": "Charging by induction"}
      ],
      [
       {"id": "e1", "label": "Rubbing a polythene rod with a dry cloth", "category": "friction"},
       {"id": "e2", "label": "The two bodies end with equal and opposite charges", "category": "friction"},
       {"id": "e3", "label": "A body that gains electrons becomes negatively charged", "category": "friction"},
       {"id": "e4", "label": "The charges inside the conductor separate", "category": "induction"},
       {"id": "e5", "label": "The conductor is earthed while the charged rod is near it", "category": "induction"},
       {"id": "e6", "label": "Charged by separation and earthing", "category": "induction"},
      ])),
L("em-forces-between-charges", "Forces Between Charges",
  [
   "An electric charge exerts a force on any other charge near it. Two like charges repel each other, so the force pushes them apart. Two unlike charges attract each other, so the force pulls them together. The force acts along the line joining the two charges, and it is strongest when the charges are close together.",
   "The size of the force depends on the size of the charges and on the distance between them. Doubling the size of one charge doubles the force between the charges. Doubling the distance between the charges reduces the force to one quarter of its former value, because the force obeys an inverse square law: the force is proportional to the product of the two charges divided by the square of their separation, so force is proportional to (Q1 x Q2) / r squared.",
   "Forces between charges always come in pairs. The force on each charge is equal in size and opposite in direction to the force on the other, so the two charges are pushed apart or pulled together along the same line. This is Newton's third law acting on electric charges."
  ],
  [
   "State the rule for the force between two charges",
   "Describe how the force depends on the size of the charges and on their separation",
   "Explain why the two forces between a pair of charges are equal and opposite"
  ],
  [
   "Like charges repel and unlike charges attract, along the line joining the charges.",
   "The force is proportional to the product of the charges and inversely proportional to the square of the distance between them.",
   "The force on each charge is equal in size and opposite in direction to the force on the other."
  ],
  match_lab("Forces Between Charges", "Drag each idea onto the statement that describes it.",
      [
       {"id": "e1", "label": "Two like charges", "target": "Repel each other, so the force pushes them apart"},
       {"id": "e2", "label": "Two unlike charges", "target": "Attract each other, so the force pulls them together"},
       {"id": "e3", "label": "Doubling the size of one charge", "target": "Doubles the force between the charges"},
       {"id": "e4", "label": "Doubling the distance between the charges", "target": "Reduces the force to one quarter of its former value"},
       {"id": "e5", "label": "The force on each charge", "target": "Is equal in size and opposite in direction to the force on the other"},
      ])),
L("em-electric-fields", "Electric Fields",
  [
   "An electric field is a region in which a charge experiences a force. The direction of the field at a point is the direction of the force on a small positive test charge placed there, so the field points away from a positive charge and towards a negative charge.",
   "Field lines are drawn with arrows to show the direction of the field. Around a single point charge the field is a radial field, and the lines spread out as they get further from the charge. Further apart field lines mean a weaker field. Field lines never cross, because a charge placed at one point cannot be pushed in two directions at once.",
   "Between two parallel plates connected to a supply the field is a uniform field. The field lines are parallel and equally spaced, and a small charge feels the same force everywhere between the plates. Electric field strength is the force per unit charge, E = F / Q, measured in newtons per coulomb."
  ],
  [
   "Describe the direction of an electric field and how field lines are drawn",
   "Compare the radial field around a point charge with the uniform field between parallel plates",
   "Use E = F / Q to calculate electric field strength"
  ],
  [
   "Electric field: a region where a charge experiences a force; the field direction is the force direction on a positive test charge.",
   "Radial field: the field around a point charge, with field lines spreading out and weakening with distance.",
   "Uniform field: the parallel, equally spaced field between two parallel plates, where the force on a charge does not change."
  ],
  sort_lab("Electric Fields", "Sort each statement under Radial field or Uniform field.",
      [{"id": "radial", "label": "Radial field"},
       {"id": "uniform", "label": "Uniform field"}
      ],
      [
       {"id": "e1", "label": "The direction of the force on a small positive test charge", "category": "radial"},
       {"id": "e2", "label": "Further apart field lines mean a weaker field", "category": "radial"},
       {"id": "e3", "label": "Field lines never cross", "category": "radial"},
       {"id": "e4", "label": "The field lines are parallel and equally spaced", "category": "uniform"},
       {"id": "e5", "label": "A small charge feels the same force everywhere between the plates", "category": "uniform"},
       {"id": "e6", "label": "Electric field strength is the force per unit charge, E = F / Q", "category": "uniform"},
      ])),
L("em-static-charge-applications-and-hazards", "Static Charge Applications and Hazards",
  [
   "Useful applications of static charge are found in industry and in the home. In an electrostatic paint sprayer the paint droplets are given a charge and are attracted to the earthed metal object being painted, so less paint is wasted and the coat is even. A photocopier attracts toner powder to a charged drum, and an electrostatic precipitator in a power station chimney charges the dust particles and collects them on charged plates, which removes dust from the gas leaving the chimney.",
   "Hazards from static charge appear wherever a spark could ignite a fuel or damage a component. Friction between a road tanker and the air, or between fuel and a pipe, builds up charge, and a spark from that charge could ignite petrol vapour, so tankers are earthed and the pipe is bonded to the tanker before fuel is transferred. The same danger exists when refuelling an aircraft, when using flammable solvents, and in a flour mill, where charged dust particles can cause a dust explosion.",
   "Static charge also damages electronic components, especially the metal-oxide parts inside a computer, so engineers wear an earthed wrist strap and work on an earthed mat. Lightning is the largest natural example of static charge: charge builds up in a cloud until the air breaks down and a huge spark carries the charge to earth."
  ],
  [
   "Describe useful applications of static charge",
   "Explain the hazards caused by static charge and the precautions taken",
   "Explain why earthing and bonding prevent spark hazards"
  ],
  [
   "Earthing and bonding let charge flow away safely before a spark can form.",
   "Charged droplets, toner and dust can be steered by an electric field, which is the basis of spray painting, photocopying and dust extraction.",
   "A spark from built-up static charge can ignite flammable vapour or dust, and a sudden discharge can destroy sensitive electronic components."
  ],
  sort_lab("Static Charge Applications and Hazards", "Sort each statement under Useful applications of static charge or Hazards from static charge.",
      [{"id": "use", "label": "Useful applications of static charge"},
       {"id": "hazard", "label": "Hazards from static charge"}
      ],
      [
       {"id": "e1", "label": "The paint droplets are given a charge and are attracted to the earthed metal object", "category": "use"},
       {"id": "e2", "label": "Attracts toner powder to a charged drum", "category": "use"},
       {"id": "e3", "label": "An electrostatic precipitator in a power station chimney charges the dust particles and collects them on charged plates", "category": "use"},
       {"id": "e4", "label": "A spark from that charge could ignite petrol vapour", "category": "hazard"},
       {"id": "e5", "label": "Charged dust particles can cause a dust explosion", "category": "hazard"},
       {"id": "e6", "label": "Damages electronic components, especially the metal-oxide parts inside a computer", "category": "hazard"},
      ])),
L("em-direct-and-alternating-current", "Direct and Alternating Current",
  [
   "A direct current, or d.c., flows in one direction only. A cell, a battery or a solar cell supplies direct current, and the output of a d.c. generator is direct current too, so the current keeps the same steady direction as long as the circuit is complete. A d.c. supply has fixed positive and negative terminals, so the current always leaves the same terminal.",
   "An alternating current, or a.c., reverses direction at a regular frequency, so the current flows one way and then the other. An alternating current is supplied by an a.c. generator, and the frequency of the supply is the number of complete cycles each second. The mains supply in the Caribbean is an alternating supply at a frequency of 50 hertz, so the current completes 50 cycles every second and changes direction 100 times.",
   "The two kinds of supply look different on a graph of current against time. A steady direct current is a straight horizontal line on the graph, while an alternating current reaches a peak one way and then a peak the other way, passing through zero in between. The mains is alternating rather than direct for a practical reason: a transformer can change only an alternating voltage. The two wires of an a.c. supply swap their polarity every half cycle, while the terminals of a battery never do."
  ],
  [
   "Compare a direct current with an alternating current",
   "State the frequency of the mains supply in the Caribbean and say what it means",
   "Describe the graph of each kind of supply and name a source of each"
  ],
  [
   "Direct current: a current that flows in one direction only, supplied by cells, batteries, solar cells and d.c. generators, with fixed positive and negative terminals.",
   "Alternating current: a current that reverses direction at a regular frequency, supplied by an a.c. generator and used for the mains.",
   "Frequency of the mains: the number of complete cycles each second, which is 50 hertz in the Caribbean."
  ],
  sort_lab("Direct and Alternating Current", "Sort each statement under Direct current or Alternating current.",
      [{"id": "dc", "label": "Direct current"},
       {"id": "ac", "label": "Alternating current"}
      ],
      [
       {"id": "i1", "label": "Flows in one direction only", "category": "dc"},
       {"id": "i2", "label": "Has fixed positive and negative terminals", "category": "dc"},
       {"id": "i3", "label": "A straight horizontal line on the graph", "category": "dc"},
       {"id": "i4", "label": "A cell, a battery or a solar cell", "category": "dc"},
       {"id": "i5", "label": "Reverses direction at a regular frequency", "category": "ac"},
       {"id": "i6", "label": "Supplied by an a.c. generator", "category": "ac"},
       {"id": "i7", "label": "Reaches a peak one way and then a peak the other way", "category": "ac"},
       {"id": "i8", "label": "An alternating supply at a frequency of 50 hertz", "category": "ac"},
      ])),
L("em-primary-and-secondary-cells", "Primary and Secondary Cells",
  [
   "A cell changes chemical energy into electrical energy. The electromotive force of a cell, usually shortened to e.m.f., is the energy the cell gives to each unit of charge that passes through it, measured in volts. Every cell has its own resistance, called internal resistance, so while a current flows the voltage measured across the terminals of the cell is a little less than its electromotive force: the difference is the voltage lost inside the cell, and it grows as the current grows.",
   "Cells come in two kinds. A primary cell cannot be recharged, because its chemical reaction cannot be reversed: in a dry cell its chemicals are used up as it delivers charge, so a flat dry cell is thrown away and replaced. A secondary cell, also called an accumulator, can be recharged, because passing a current through it in the opposite direction reverses the chemical reaction and restores the chemicals. The lead-acid accumulator in a car is a secondary cell: each cell gives about 2 volts, and six of them joined in series give the 12 volts of a car battery. The lithium-ion cell in a phone or a laptop is a secondary cell too, and it stores more energy for its mass than a lead-acid cell.",
   "The choice between the two depends on the job. A primary cell is cheap and ready to use with no charging, which suits a torch, a clock or a smoke alarm, but a flat one must be replaced and its chemicals disposed of carefully rather than put in the household rubbish. A secondary cell costs more at the start and has to be charged, but it can be used again hundreds of times, which suits a car, a phone, a power tool or a laptop. The capacity of a cell is the charge it can deliver, measured in ampere-hours: a cell rated at 2 ampere-hours can deliver 2 amperes for one hour, or 1 ampere for two hours."
  ],
  [
   "Describe the difference between a primary cell and a secondary cell",
   "Explain the electromotive force and the internal resistance of a cell",
   "Give an example of each kind of cell and say what each is used for"
  ],
  [
   "Electromotive force (e.m.f.): the energy a cell gives to each unit of charge, measured in volts.",
   "Internal resistance: the resistance inside a cell, which makes the terminal voltage less than the electromotive force while a current flows.",
   "Primary cell: a cell whose reaction cannot be reversed, such as a dry cell; secondary cell: a cell that can be recharged, such as the lead-acid accumulator or a lithium-ion cell."
  ],
  sort_lab("Primary and Secondary Cells", "Sort each statement under Primary cell or Secondary cell.",
      [{"id": "primary", "label": "Primary cell"},
       {"id": "secondary", "label": "Secondary cell"}
      ],
      [
       {"id": "i1", "label": "Cannot be recharged", "category": "primary"},
       {"id": "i2", "label": "Its chemicals are used up as it delivers charge", "category": "primary"},
       {"id": "i3", "label": "A flat dry cell is thrown away and replaced", "category": "primary"},
       {"id": "i4", "label": "A torch, a clock or a smoke alarm", "category": "primary"},
       {"id": "i5", "label": "Can be recharged", "category": "secondary"},
       {"id": "i6", "label": "The lead-acid accumulator in a car", "category": "secondary"},
       {"id": "i7", "label": "The lithium-ion cell in a phone or a laptop", "category": "secondary"},
       {"id": "i8", "label": "Used again hundreds of times", "category": "secondary"},
      ])),
L("em-semiconductor-diodes-and-rectification", "Semiconductor Diodes and Rectification",
  [
   "A semiconductor such as silicon conducts only weakly when it is pure, but its conductivity can be increased by adding a small amount of another element. Joining a p-type region to an n-type region makes a p-n junction, which is the heart of a diode. A diode is a semiconductor component that lets current flow in one direction only, so it acts as a one-way valve in a circuit.",
   "In forward bias the anode is made positive with respect to the cathode, and the diode conducts, so current flows easily. In reverse bias the anode is made negative with respect to the cathode, and the diode blocks the current. A light-emitting diode, or LED, is a diode that gives out light when it conducts in the forward direction, which is why LEDs are used for indicator lamps, torches and television screens.",
   "Because it conducts in one direction only, a diode can change alternating current into direct current, and this process is called rectification. In half-wave rectification one diode lets only half of the cycle reach the output, because the other half reverse biases it. In full-wave rectification four diodes in a bridge turn both halves of the cycle into direct current, and a smoothing capacitor stores charge and keeps the output voltage steady between the pulses. Rectification is used in the power supply of every phone charger and radio."
  ],
  [
   "Describe the structure of a diode and how it behaves in forward and reverse bias",
   "Explain half-wave and full-wave rectification",
   "Explain the part played by a smoothing capacitor in a power supply"
  ],
  [
   "Semiconductor: a material whose conductivity can be controlled by adding small amounts of other elements.",
   "Diode: a p-n junction that conducts when it is forward biased and blocks current when it is reverse biased.",
   "Rectification: turning alternating current into direct current with one diode (half-wave) or four diodes in a bridge (full-wave)."
  ],
  match_lab("Semiconductor Diodes and Rectification", "Drag each term onto the statement that describes it.",
      [
       {"id": "e1", "label": "Diode", "target": "A semiconductor component that lets current flow in one direction only"},
       {"id": "e2", "label": "Forward bias", "target": "The anode is made positive with respect to the cathode, and the diode conducts"},
       {"id": "e3", "label": "Reverse bias", "target": "The anode is made negative with respect to the cathode, and the diode blocks the current"},
       {"id": "e4", "label": "Half-wave rectification", "target": "One diode lets only half of the cycle reach the output"},
       {"id": "e5", "label": "Full-wave rectification", "target": "Four diodes in a bridge turn both halves of the cycle into direct current"},
       {"id": "e6", "label": "Smoothing capacitor", "target": "Stores charge and keeps the output voltage steady between the pulses"},
      ])),
L("em-logic-gates-and-truth-tables", "Logic Gates and Truth Tables",
  [
   "Digital electronic circuits work with two states only. A low voltage is called logic 0, and a high voltage, such as 5 volts, is called logic 1. A logic gate is a circuit that combines these two states according to a rule, and the behaviour of a gate is written down in a truth table, a table that lists the output for every possible combination of inputs.",
   "The three basic gates are the AND gate, the OR gate and the NOT gate. An AND gate gives 1 only when both inputs are 1, which is why it is used to test whether two conditions are met at the same time. An OR gate gives 1 when at least one input is 1. A NOT gate, also called an inverter, has a single input, and its output is the opposite of its single input, so a 1 becomes a 0 and a 0 becomes a 1.",
   "Gates are combined to build the circuits that make decisions. A NAND gate is an AND gate followed by a NOT gate, and a NOR gate is an OR gate followed by a NOT gate; a truth table for the combination is built by working out the output of each gate in turn. Because the same few gates can be repeated millions of times on one silicon chip, they decide when a washing machine starts, when a traffic light changes, and how a calculator adds two numbers."
  ],
  [
   "State the two logic levels and describe what a logic gate does",
   "Write and interpret truth tables for AND, OR and NOT gates",
   "Describe how gates are combined to make a decision circuit"
  ],
  [
   "Logic gate: a circuit with one or more inputs and a single output, where the output depends on the combination of inputs.",
   "Truth table: a table showing the output of a gate for every possible combination of its inputs.",
   "AND gives 1 only when both inputs are 1, OR gives 1 when at least one input is 1, and NOT inverts its single input."
  ],
  match_lab("Logic Gates and Truth Tables", "Drag each gate or term onto the rule it follows.",
      [
       {"id": "e1", "label": "AND gate", "target": "An AND gate gives 1 only when both inputs are 1"},
       {"id": "e2", "label": "OR gate", "target": "An OR gate gives 1 when at least one input is 1"},
       {"id": "e3", "label": "NOT gate", "target": "Its output is the opposite of its single input"},
       {"id": "e4", "label": "NAND gate", "target": "An AND gate followed by a NOT gate"},
       {"id": "e5", "label": "Truth table", "target": "A table that lists the output for every possible combination of inputs"},
       {"id": "e6", "label": "Logic 1", "target": "A high voltage, such as 5 volts"},
      ])),
L("em-impact-of-electronics-on-society", "Impact of Electronics on Society",
  [
   "Electronics reached the home in the 1950s through the thermionic valve, a glass device that was hot, bulky and short-lived. The transistor replaced the valve, and the integrated circuit then placed thousands, and later millions, of transistors on a single silicon chip. That one change put small and cheap computing power in phones, laptops and household appliances, so the electronics industry now brings a clear benefit to society that reaches almost every Caribbean household.",
   "On the medical side, electronic instruments monitor a patient's heart and breathing, and imaging equipment shows doctors what is happening inside the body. In industry, automatic control keeps a factory machine working safely, checks the size of every product on a line and stops the line if something is out of place. Communication changed too: a message that once took days now travels in seconds, and distance learning reaches students far from a campus.",
   "Each benefit carries a problem to manage. Toxic metals in discarded circuit boards must be collected and recycled, because dumping them contaminates soil and water. The energy used by data centres and by charging devices has become a large part of electricity demand, so efficient designs matter. Jobs changed or lost when a task is automated, and personal data collected by the same devices must be protected, so electronics must be used with care as well as enthusiasm."
  ],
  [
   "Describe how the transistor and the integrated circuit changed electronics",
   "Give examples of the benefits of electronics in medicine, industry and communication",
   "Discuss the problems to manage, including e-waste, energy use and jobs"
  ],
  [
   "Transistor and integrated circuit: the inventions that made electronic devices small, cheap and reliable.",
   "Electronics widened access to medical monitoring, automatic control and instant communication.",
   "Electronic waste and the energy used by devices and data centres are problems to manage through recycling and efficient design."
  ],
  sort_lab("Impact of Electronics on Society", "Sort each statement under Benefit to society or Problem to manage.",
      [{"id": "benefit", "label": "Benefit to society"},
       {"id": "problem", "label": "Problem to manage"}
      ],
      [
       {"id": "e1", "label": "Small and cheap computing power in phones, laptops and household appliances", "category": "benefit"},
       {"id": "e2", "label": "Electronic instruments monitor a patient's heart and breathing", "category": "benefit"},
       {"id": "e3", "label": "Automatic control keeps a factory machine working safely", "category": "benefit"},
       {"id": "e4", "label": "Toxic metals in discarded circuit boards", "category": "problem"},
       {"id": "e5", "label": "The energy used by data centres and by charging devices", "category": "problem"},
       {"id": "e6", "label": "Jobs changed or lost when a task is automated", "category": "problem"},
      ])),
L("em-force-on-current-carrying-conductors", "Force on Current-Carrying Conductors",
  [
   "A current-carrying conductor placed in a magnetic field experiences a force, and this is called the motor effect. The force is largest when the conductor is at right angles to the field, and no force is produced when the conductor lies along the field. Increasing the current, the field strength or the length of conductor in the field increases the force on the conductor, which is written as F = B I L for a conductor at right angles to the field.",
   "The direction of the force is found with Fleming's left-hand rule: point the first finger along the field, the second finger along the current and the thumb in the direction of the force, holding the three fingers of the left hand at right angles to one another. Reversing the current or reversing the magnetic field reverses the direction of the force, and reversing both leaves the force in its original direction.",
   "The two sides of a coil carry the current in opposite directions, so the forces on them turn the coil about its axis. That turning effect is the working principle of every electric motor and of moving-coil instruments such as the ammeter and the voltmeter."
  ],
  [
   "Describe the motor effect and the conditions that produce the largest force",
   "Use Fleming's left-hand rule to predict the direction of the force",
   "Explain how two opposite forces on a coil produce a turning effect"
  ],
  [
   "Motor effect: a current-carrying conductor in a magnetic field experiences a force at right angles to both the current and the field.",
   "Fleming's left-hand rule gives the direction of the force from the field and the current.",
   "The force increases with the current, the field strength and the length of conductor in the field."
  ],
  match_lab("Force on Current-Carrying Conductors", "Drag each idea onto the statement that describes it.",
      [
       {"id": "e1", "label": "Motor effect", "target": "A current-carrying conductor in a magnetic field experiences a force"},
       {"id": "e2", "label": "Fleming's left-hand rule", "target": "Point the first finger along the field, the second finger along the current and the thumb in the direction of the force"},
       {"id": "e3", "label": "Increasing the current, the field strength or the length of conductor in the field", "target": "Increases the force on the conductor"},
       {"id": "e4", "label": "Reversing the current or reversing the magnetic field", "target": "Reverses the direction of the force"},
       {"id": "e5", "label": "The two sides of a coil", "target": "Carry the current in opposite directions, so the forces on them turn the coil"},
      ])),
L("em-dc-motor-action", "DC Motor Action",
  [
   "A simple direct current motor is a rectangular coil of insulated wire mounted between the poles of a magnet, with the ends of the coil joined to a split-ring commutator. Carbon brushes press on the commutator and connect the coil to the supply, so current flows through the coil while it rotates.",
   "Each side of the coil carries the current in the opposite direction to the other side, so the force on one side points one way and the force on the other side points the opposite way. The two equal and opposite forces form a couple that turns the coil. Without any other part the coil would stop after half a turn, because the forces would then push it back the way it came.",
   "The split-ring commutator solves that problem: it reverses the current in the coil every half turn, so the force on each side keeps pointing in the turning direction and the coil continues to rotate. Increasing the current, using a stronger magnet or winding more turns on the coil increases the turning effect, which is why a motor can be made to suit the job it drives."
  ],
  [
   "Describe the parts of a simple direct current motor",
   "Explain the forces on a coil in a magnetic field and the couple they produce",
   "Explain the action of the split-ring commutator"
  ],
  [
   "A direct current motor turns because the two sides of its coil carry current in opposite directions and so feel opposite forces.",
   "Split-ring commutator: it reverses the current in the coil every half turn so the coil keeps turning.",
   "The turning effect increases with the current, the strength of the magnetic field and the number of turns on the coil."
  ],
  match_lab("DC Motor Action", "Drag each part or idea onto what it does in the motor.",
      [
       {"id": "e1", "label": "Split-ring commutator", "target": "It reverses the current in the coil every half turn"},
       {"id": "e2", "label": "Carbon brushes", "target": "Press on the commutator and connect the coil to the supply"},
       {"id": "e3", "label": "Each side of the coil", "target": "Carries the current in the opposite direction to the other side"},
       {"id": "e4", "label": "The two equal and opposite forces", "target": "Form a couple that turns the coil"},
       {"id": "e5", "label": "Using a stronger magnet or winding more turns on the coil", "target": "Increases the turning effect"},
      ])),
]

# --------------------------------------------------------------- EXTEND rows
EXTEND_ROWS = [
    {
        "row": "Conductors, Insulators, and Electric Current",
        "lesson": "electric-circuits",
        "paragraphs": [
            "Materials differ in how easily charge moves through them. A conductor lets charge flow easily: in a metal such as copper or aluminium each atom gives up one or more electrons that are free to move through the metal, so the current is a flow of free electrons. An electrolyte such as dilute sulphuric acid or salt solution also conducts, but there the current is carried by ions, the charged particles into which the substance splits, and the positive and negative ions move in opposite directions through the solution.",
            "An insulator holds its electrons tightly, so charge cannot flow through it: plastic, rubber, glass, dry wood and dry air are insulators, which is why a wire is covered with plastic and the body of a switch is made of plastic or ceramic. In a metal the current is a flow of electrons from the negative terminal towards the positive terminal and in an electrolyte it is a flow of ions, but in both cases the conventional current in the circuit is taken to flow from the positive terminal to the negative terminal.",
        ],
        "objectives": [
            "Distinguish a conductor from an insulator",
            "Describe how a metal and an electrolyte conduct electricity",
        ],
        "concepts": [
            "Conductor: a material in which charge flows easily, such as a metal or an electrolyte.",
            "Insulator: a material that does not let charge flow, such as plastic, rubber or dry air.",
            "Metals conduct by the movement of free electrons, while electrolytes conduct by the movement of ions.",
        ],
    },
    {
        "row": "Induced Electromotive Force",
        "lesson": "magnetism-and-electromagnetism",
        "paragraphs": [
            "A changing magnetic field through a conductor induces a voltage, and the voltage produced in this way is called an induced electromotive force. The size of the induced electromotive force depends on how fast the field through the coil changes and on the number of turns on the coil: pulling a magnet slowly out of a coil gives a small reading, plunging it in quickly gives a large one, and a coil of many turns gives a bigger voltage than a coil of few turns because each turn adds to the total. This is Faraday's law: the induced electromotive force is proportional to the rate of change of the magnetic field through the coil.",
            "The direction of the induced current is given by Lenz's law: the induced current always flows in the direction that opposes the change producing it. Pushing a magnet into a coil induces a current that tries to push it back out, and pulling the magnet out induces a current that tries to hold it in. The rule is the conservation of energy at work in induction, because the induced current has to be paid for by the work done against that opposing force, and it is the reason a generator becomes harder to turn as the current it supplies increases.",
        ],
        "objectives": [
            "Explain what an induced electromotive force is and the factors that set its size",
            "State the direction rule for an induced current and link it to the conservation of energy",
        ],
        "concepts": [
            "Induced electromotive force: the voltage induced across a conductor when the magnetic field through it changes; it grows with the rate of change of the field and with the number of turns on the coil (Faraday's law).",
            "Lenz's law: the induced current flows in the direction that opposes the change producing it.",
        ],
    },
    {
        "row": "AC Generators",
        "lesson": "magnetism-and-electromagnetism",
        "paragraphs": [
            "An a.c. generator, or alternator, is a coil turning in a magnetic field. The ends of the coil are joined to two slip rings, and carbon brushes press on the slip rings so that the current reaches the external circuit while the coil rotates freely. Because each side of the coil moves across the field first one way and then the other, the current reverses direction every half turn, and the output is an alternating voltage that follows a sine curve. The frequency of the supply equals the number of revolutions per second of the coil, which is 50 hertz for the mains in the Caribbean, and the peak value is the largest voltage or current the output reaches, which grows if the magnetic field is stronger or the coil has more turns. A d.c. dynamo is built with a split-ring commutator instead of slip rings, so the current in the external circuit is always in the same direction even though the current inside the rotating coil still reverses each half turn.",
        ],
        "objectives": [
            "Describe how an a.c. generator produces an alternating voltage, including the part played by the slip rings and the peak value of the output",
        ],
        "concepts": [
            "A.c. generator: a coil turning in a magnetic field, with slip rings carrying an alternating output whose frequency equals the number of revolutions per second of the coil.",
            "Peak value: the largest voltage or current an alternating supply reaches in each cycle, which grows with a stronger field or more turns on the coil.",
        ],
    },
    {
        "row": "Transformers and Energy Transfer",
        "lesson": "magnetism-and-electromagnetism",
        "paragraphs": [
            "A transformer changes the size of an alternating voltage: the ratio of the primary voltage to the secondary voltage equals the ratio of the number of turns on the two coils, so a step-up transformer has more turns on the secondary coil and gives a larger output voltage, while a step-down transformer has fewer and gives a smaller one. A transformer works only with an alternating supply, because a direct voltage sets up a field in the core that does not change and so induces nothing in the secondary coil. In an ideal transformer the power input equals the power output, so when the voltage is stepped up the current is stepped down by the same factor, and the efficiency of a transformer is the useful power output divided by the power input, written as a percentage. A real transformer loses a little energy, and a laminated core reduces the losses from eddy currents while thick copper coils keep the resistance low, so a large transformer can be over 95 per cent efficient. Electricity is transmitted at a high voltage so that the current in the cables is small, because the energy wasted as heat in a cable depends on the square of the current; a step-down transformer near the user then brings the voltage down to a safe level.",
        ],
        "objectives": [
            "Use the turns ratio and the power relationship to work with a transformer, and state what its efficiency means",
        ],
        "concepts": [
            "Transformer efficiency: in an ideal transformer the power input equals the power output, and efficiency = useful power output / power input x 100%.",
        ],
    },
]

# ------------------------------------------------ batch 1 lessons reconciled away
REMOVED = [
    ("em-magnetic-fields-from-current",
     "the audit rules its chapter REUSE against `magnetism-and-electromagnetism`, whose second paragraph already teaches the field around a wire and a coil and the right-hand grip rule - the chapter's named content, so nothing is written"),
    ("em-induced-electromotive-force",
     "the audit rules its chapter EXTEND against `magnetism-and-electromagnetism`; its copy is folded into that lesson's new induced-electromotive-force paragraphs"),
    ("em-ac-generators",
     "the audit rules its chapter EXTEND against `magnetism-and-electromagnetism`; its copy is folded into that lesson's new a.c. generator paragraph"),
    ("em-transformers-and-energy-transfer",
     "the audit rules its chapter EXTEND against `magnetism-and-electromagnetism`; its copy is folded into that lesson's new transformer and energy-transfer paragraph"),
]

# batch 1's emitted lesson ids, whatever they became in batch 2 - used to
# find and rebuild this section's block in lessonSets.js
OLD_BATCH1_IDS = [
    "em-charging-by-friction-and-induction",
    "em-forces-between-charges",
    "em-electric-fields",
    "em-static-charge-applications-and-hazards",
    "em-semiconductor-diodes-and-rectification",
    "em-logic-gates-and-truth-tables",
    "em-impact-of-electronics-on-society",
    "em-magnetic-fields-from-current",
    "em-force-on-current-carrying-conductors",
    "em-dc-motor-action",
    "em-induced-electromotive-force",
    "em-ac-generators",
    "em-transformers-and-energy-transfer",
]

# ------------------------------------------------------------------ assertions
FOLD_TRANS = {
    0x2018: "'", 0x2019: "'", 0x2014: "-", 0x2013: "-", 0x2212: "-",
}


def fold(s):
    s = str(s).lower().translate(FOLD_TRANS)
    return re.sub(r"\s+", " ", s).strip()


def corpus_of(lesson):
    text = " \n ".join([lesson["title"], "\n\n".join(lesson["paragraphs"])]
                       + lesson["objectives"] + lesson["concepts"])
    return fold(text)


def shown_strings(lab):
    out = []
    if lab["kind"] == "match":
        for p in lab["pairs"]:
            out.append(p["label"])
            out.append(p["target"])
    else:
        for c in lab["categories"]:
            out.append(c["label"])
        for i in lab["items"]:
            out.append(i["label"])
    return out


def lesson_object(lesson):
    return {
        "id": lesson["id"],
        "title": lesson["title"],
        "content": "\n\n".join(lesson["paragraphs"]),
        "objectives": lesson["objectives"],
        "concepts": lesson["concepts"],
        "experiment": {
            "type": MATCH if lesson["lab"]["kind"] == "match" else SORT,
            "description": lab_description(lesson),
        },
    }


def lab_description(lesson):
    lab = lesson["lab"]
    if lab["kind"] == "match":
        names = ", ".join(p["label"] for p in lab["pairs"])
        return ("%s: Match each of %d items - %s - to the statement that describes it."
                % (lab["title"], len(lab["pairs"]), names))
    cats = ", ".join(c["label"] for c in lab["categories"])
    return ("%s: Sort %d statements into %s." % (lab["title"], len(lab["items"]), cats))


def validate():
    problems = []
    ids = [l["id"] for l in NEW_LESSONS]
    if len(set(ids)) != len(ids):
        problems.append("duplicate lesson id")
    for lesson in NEW_LESSONS:
        lid = lesson["id"]
        if not re.fullmatch(r"em-[a-z0-9-]+", lid):
            problems.append("%s: id must be kebab-case and em- prefixed" % lid)
        if len(lesson["objectives"]) < 2:
            problems.append("%s: needs at least 2 objectives" % lid)
        if not all(isinstance(c, str) for c in lesson["concepts"]):
            problems.append("%s: concepts must be strings" % lid)
        lab = lesson["lab"]
        if lab["title"] != lesson["title"]:
            problems.append("%s: lab title must equal the lesson title" % lid)
        if len(lab["subtitle"].strip()) < 4:
            problems.append("%s: lab subtitle too short" % lid)
        if lab["kind"] == "match":
            pairs = lab["pairs"]
            if len(pairs) < 4:
                problems.append("%s: match lab needs >= 4 pairs" % lid)
            if len({p["id"] for p in pairs}) != len(pairs):
                problems.append("%s: pair ids not unique" % lid)
            tgts = [p["target"] for p in pairs]
            if len(set(tgts)) != len(tgts):
                problems.append("%s: two pairs share a target (unanswerable drop)" % lid)
            for p in pairs:
                if not p["label"] or not p["target"] or not p["id"]:
                    problems.append("%s: pair missing id/label/target" % lid)
                if fold(p["label"]) == fold(p["target"]):
                    problems.append("%s: pair label equals its target" % lid)
        else:
            cats = lab["categories"]
            items = lab["items"]
            if len(cats) < 2 or len(items) < 4:
                problems.append("%s: sort lab needs >= 2 categories and >= 4 items" % lid)
            if len({c["id"] for c in cats}) != len(cats):
                problems.append("%s: category ids not unique" % lid)
            if len({i["id"] for i in items}) != len(items):
                problems.append("%s: item ids not unique" % lid)
            for c in cats:
                if not any(i["category"] == c["id"] for i in items):
                    problems.append("%s: category %s has no item" % (lid, c["id"]))
            for i in items:
                if i["category"] not in {c["id"] for c in cats}:
                    problems.append("%s: item %s has unknown category" % (lid, i["id"]))
        corpus = corpus_of(lesson)
        for s in shown_strings(lab):
            if fold(s) not in corpus:
                problems.append('%s: DISPLAYED STRING NOT IN THE LESSON COPY: "%s"' % (lid, s))
    # every EXTEND row must be an insertion into a named existing lesson
    for r in EXTEND_ROWS:
        if not r["lesson"] or not r["row"]:
            problems.append("extend row missing lesson/row name")
        if not r["paragraphs"] or not r["objectives"] or not r["concepts"]:
            problems.append("%s: extend row must add paragraphs, objectives and concepts"
                            % r["row"])
    # the authored copy must not lean on American spellings
    banned = ["color", "magnetize", "ionize", "realize", "center", "meter", "analyze",
              "fiber", "liter", "defense"]
    blob = " ".join(["\n\n".join(l["paragraphs"]) for l in NEW_LESSONS]
                    + [p for r in EXTEND_ROWS for p in r["paragraphs"]]).lower()
    for b in banned:
        if re.search(r"\b" + b + r"\b", blob):
            problems.append("American spelling candidate present: %r" % b)
    return problems


def indented(dump, spaces):
    pad = " " * spaces
    return "\n".join((pad + ln) if ln.strip() else ln for ln in dump.split("\n"))


def json_block(lessons, base=12):
    return ",\n".join(indented(json.dumps(l, ensure_ascii=True, indent=4, sort_keys=False), base)
                      for l in lessons)


def js_string(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def js_block(lessons):
    lines = []
    for lesson in lessons:
        lab = lesson["lab"]
        lines.append("    %s: {" % js_string(lesson["id"]))
        lines.append("      title: %s," % js_string(lab["title"]))
        lines.append("      subtitle: %s," % js_string(lab["subtitle"]))
        lines.append("      kind: %s," % js_string(lab["kind"]))
        if lab["kind"] == "match":
            lines.append("      pairs: [")
            for p in lab["pairs"]:
                lines.append("        { id: %s, target: %s, label: %s },"
                             % (js_string(p["id"]), js_string(p["target"]), js_string(p["label"])))
            lines.append("      ],")
        else:
            lines.append("      categories: [")
            for c in lab["categories"]:
                lines.append("        { id: %s, label: %s },"
                             % (js_string(c["id"]), js_string(c["label"])))
            lines.append("      ],")
            lines.append("      items: [")
            for i in lab["items"]:
                lines.append("        { id: %s, label: %s, category: %s },"
                             % (js_string(i["id"]), js_string(i["label"]), js_string(i["category"])))
            lines.append("      ],")
        lines.append("    },")
    return "\n".join(lines)


# ------------------------------------------------- modules.json (both trees)
EXISTING_SECTION_D = ["electric-circuits", "magnetism-and-electromagnetism",
                      "electrical-power-and-safety"]


def array_span(text, key_idx):
    """Span of the [ ... ] value that follows `"<key>": ` from key_idx."""
    open_idx = text.index("[", key_idx)
    depth = 0
    i = open_idx
    in_str = False
    while i < len(text):
        ch = text[i]
        if in_str:
            if ch == "\\":
                i += 2
                continue
            if ch == '"':
                in_str = False
        elif ch == '"':
            in_str = True
        elif ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return open_idx, i
        i += 1
    raise SystemExit("unbalanced [ ]")


def content_span(text, lesson_idx):
    key_idx = text.index('"content": ', lesson_idx)
    open_idx = text.index('"', key_idx + len('"content": '))
    i = open_idx + 1
    while i < len(text):
        if text[i] == "\\":
            i += 2
            continue
        if text[i] == '"':
            return open_idx, i
        i += 1
    raise SystemExit("unclosed content string")


def append_json_string(text, span, extra):
    """Append `extra` (already JSON-escaped body) inside a JSON string value."""
    a, b = span
    return text[:b] + extra + text[b:]


def strip_extensions(text, row):
    """Remove this row's earlier insertion, so a rerun re-derives instead of appending twice."""
    lid = row["lesson"]
    add = "\\n\\n" + json.dumps("\n\n".join(row["paragraphs"]), ensure_ascii=True)[1:-1]
    if add in text:
        text = text.replace(add, "", 1)
    for s in row["objectives"] + row["concepts"]:
        tok = ",\n                    " + json.dumps(s, ensure_ascii=True)
        if tok in text:
            text = text.replace(tok, "", 1)
    return text


def extend_lesson(text, lid, paragraphs, objectives, concepts):
    idx = text.index('"id": "%s"' % lid)
    a, b = content_span(text, idx)
    body = json.dumps("\n\n".join(paragraphs), ensure_ascii=True)[1:-1]
    text = text[:b] + "\\n\\n" + body + text[b:]
    for key, extra in (("objectives", objectives), ("concepts", concepts)):
        key_idx = text.index('"%s": [' % key, idx)
        a, b = array_span(text, key_idx)
        inner = text[a + 1:b].rstrip()
        add = "".join(",\n                    " + json.dumps(s, ensure_ascii=True)
                      for s in extra)
        text = text[:a + 1] + inner + add + "\n                " + text[b:]
        idx = text.index('"id": "%s"' % lid)
    return text


def apply_modules(dry):
    path = os.path.join(REPO, MODULES)
    orig = open(path, encoding="utf-8").read()
    for lid in EXISTING_SECTION_D:
        if '"id": "%s"' % lid not in orig:
            raise SystemExit("modules.json: existing lesson %s missing" % lid)
    for lid in [l["id"] for l in NEW_LESSONS]:
        if '"id": "%s"' % lid in orig:
            pass  # already applied on this tree - the rebuild below is idempotent
    # 1. cut this section's slice back to the three frozen lessons
    anchor = '"Sort each statement under Fuse, Earthing or Circuit breaker."'
    k = orig.index(anchor)
    b = orig.index("\n            }", k) + len("\n            }")
    base = orig[:b]
    tail_anchor = '\n        ]\n    },\n    {\n        "id": "nuclear-physics",'
    if orig.count(tail_anchor) != 1:
        raise SystemExit("modules.json: section tail anchor not unique (%d)"
                         % orig.count(tail_anchor))
    t = orig.index(tail_anchor)
    if t < b:
        raise SystemExit("modules.json: section tail anchor before the slice")
    rest = orig[t:]
    # 2. re-apply the EXTEND rows to the frozen lessons (stripping any earlier
    #    insertion first, so a rerun on an already-generated tree is idempotent)
    text = base
    for r in EXTEND_ROWS:
        text = strip_extensions(text, r)
        text = extend_lesson(text, r["lesson"], r["paragraphs"], r["objectives"],
                             r["concepts"])
    # 3. append the 11 new lessons
    block = json_block([lesson_object(l) for l in NEW_LESSONS])
    new = text + ",\n" + block + rest
    # 4. assertions
    parsed = json.loads(new)
    before = json.loads(orig)
    old_sec = [s for s in before if s["id"] == SECTION][0]
    new_sec = [s for s in parsed if s["id"] == SECTION][0]
    if [l["id"] for l in new_sec["lessons"]] != EXISTING_SECTION_D + [l["id"] for l in NEW_LESSONS]:
        raise SystemExit("section lessons are not the frozen three + the 11 new ones: %s"
                         % [l["id"] for l in new_sec["lessons"]])
    by_old = {l["id"]: l for l in old_sec["lessons"]}
    touched = {r["lesson"] for r in EXTEND_ROWS}
    for l in new_sec["lessons"]:
        if l["id"] not in by_old:
            continue
        o = by_old[l["id"]]
        if l["id"] in touched:
            rows = [r for r in EXTEND_ROWS if r["lesson"] == l["id"]]
            want = o["content"] + "".join("\n\n" + "\n\n".join(r["paragraphs"]) for r in rows)
            if l["content"] != want:
                raise SystemExit("%s: content is not the frozen copy + the extend rows" % l["id"])
            if l["objectives"][:len(o["objectives"])] != o["objectives"]:
                raise SystemExit("%s: existing objectives changed" % l["id"])
            if l["concepts"][:len(o["concepts"])] != o["concepts"]:
                raise SystemExit("%s: existing concepts changed" % l["id"])
            if len(l["objectives"]) != len(o["objectives"]) + sum(len(r["objectives"]) for r in rows):
                raise SystemExit("%s: objectives not added as expected" % l["id"])
            if len(l["concepts"]) != len(o["concepts"]) + sum(len(r["concepts"]) for r in rows):
                raise SystemExit("%s: concepts not added as expected" % l["id"])
        else:
            if json.dumps(l, sort_keys=True) != json.dumps(o, sort_keys=True):
                raise SystemExit("frozen lesson %s changed" % l["id"])
    for s in parsed:
        if s["id"] == SECTION:
            continue
        o = [x for x in before if x["id"] == s["id"]][0]
        if json.dumps(s, sort_keys=True) != json.dumps(o, sort_keys=True):
            raise SystemExit("section %s changed" % s["id"])
    if not dry:
        open(path, "w", encoding="utf-8").write(new)
        open(os.path.join(REPO, MIRROR), "w", encoding="utf-8").write(new)
    return len(old_sec["lessons"]), len(new_sec["lessons"])


# ------------------------------------------------ lessonSets.js (Play-tab decks)
def apply_lesson_sets(dry):
    path = os.path.join(REPO, LESSON_SETS)
    orig = open(path, encoding="utf-8").read()
    anchor = "  physics: {\n"
    if orig.count(anchor) != 1:
        raise SystemExit("lessonSets.js physics anchor not unique (%d)" % orig.count(anchor))
    header = (MARKER + "\n"
              "    //      batch 1+2 reconciled: 11 net-new lessons, each with its own\n"
              "    //      topic-matched set.  Section E (nuclear-) and Section C (waves-)\n"
              "    //      sets are added by their own authors; every id here is a real\n"
              "    //      lesson id in modules.json.\n")
    block = header + js_block(NEW_LESSONS) + "\n"
    if MARKER in orig:
        start = orig.index(MARKER)
        ends = []
        for lid in OLD_BATCH1_IDS:
            key = "    %s: {" % js_string(lid)
            if key in orig:
                i = orig.index(key)
                ends.append(orig.index("\n    },\n", i) + len("\n    },\n"))
        if not ends:
            raise SystemExit("lessonSets.js: marker present but no batch-1 entry found")
        new = orig[:start] + block + orig[max(ends):]
    else:
        i = orig.index(anchor) + len(anchor)
        new = orig[:i] + block + orig[i:]
    for lid in [l["id"] for l in NEW_LESSONS]:
        if ("    \"%s\": {" % lid) not in new:
            raise SystemExit("lessonSets.js: %s was not written" % lid)
    for lid, _ in REMOVED:
        if ("    \"%s\": {" % lid) in new:
            raise SystemExit("lessonSets.js: removed lesson %s still has a set" % lid)
    if not dry:
        open(path, "w", encoding="utf-8").write(new)
    return len(NEW_LESSONS)


def main():
    dry = "--apply" not in sys.argv
    problems = validate()
    print("== audit reconciliation, Section D")
    print("   NEW lessons kept/added (the audit's 11 NEW rows): %d" % len(NEW_LESSONS))
    for l in NEW_LESSONS:
        print("      %-48s %5d chars  %d obj  %d concepts  lab %s"
              % (l["id"], len("\n\n".join(l["paragraphs"])), len(l["objectives"]),
                 len(l["concepts"]), l["lab"]["kind"]))
    print("   EXTEND rows (insertions into named existing lessons): %d" % len(EXTEND_ROWS))
    for r in EXTEND_ROWS:
        print("      %-44s -> %s" % (r["row"], r["lesson"]))
    print("   REUSE rows: 8 (nothing written)")
    print("   batch-1 lessons removed: %d" % len(REMOVED))
    for lid, why in REMOVED:
        print("      %-36s %s" % (lid, why))
    print("   arithmetic: 23 target chapters = 8 REUSE + 4 EXTEND + 11 NEW")
    print("== displayed strings traced to lesson copy: %d"
          % sum(len(shown_strings(l["lab"])) for l in NEW_LESSONS))
    if problems:
        print("\n!! %d PROBLEM(S)" % len(problems))
        for p in problems:
            print("   - " + p)
        raise SystemExit(1)
    print("== no problems: ids, labs, targets, traceability and extend rows all clean")
    before, after = apply_modules(dry)
    print("== modules.json: section %s %d -> %d lessons (+%d new)"
          % (SECTION, before, after, after - before))
    apply_lesson_sets(dry)
    print("== lessonSets.js: %d set(s) written into the physics block" % len(NEW_LESSONS))
    if not dry:
        a = open(os.path.join(REPO, MODULES), "rb").read()
        b = open(os.path.join(REPO, MIRROR), "rb").read()
        if a != b:
            raise SystemExit("mirrors differ after write")
        print("== mirrors byte-identical (%d bytes, both trees)" % len(a))
    if dry:
        print("== validate only: nothing written (pass --apply to write)")


if __name__ == "__main__":
    main()
