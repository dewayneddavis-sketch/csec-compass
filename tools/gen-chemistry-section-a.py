#!/usr/bin/env python3
"""Chemistry Section A (Principles of Chemistry) — the coverage build.

THE SINGLE SOURCE for every content change this section's slice makes, so a
rerun from main's baseline reproduces the shipped tree exactly.  Delivers the
audit's Section A dispositions (/home/team/shared/chemistry-coverage-audit.md
section 4):  19 NEW lessons + 9 EXTEND rows + 10 REUSE rows (nothing written).

  * 19 NET-NEW lessons (chem- prefix), placed in their home sections:
      principles-of-chemistry: pure substances, solutions/suspensions/colloids,
        solubility & separation, sucrose extraction (4)
      periodic-table-bonding: metallic bonding (1)
      mole-concept: Avogadro's law, chemical equations & conservation (2)
      acids-bases-salts: salt preparation, uses & dangers of salts (2)
      electrolysis (NEW section): conduction/electrolytes, principles, factors,
        Faraday, industrial (5)
      reaction-kinetics (NEW section): rate definition & factors, rate graphs (2)
      energy-changes (NEW section): exo/endo, profile diagrams, calculating (3)
  * 9 EXTEND rows — insertions into named existing lessons, ids frozen:
      isotopes & uses          -> atomic-structure
      predicting properties    -> periodic-table-trends
      crystal structures       -> ionic-covalent-bonding
      allotropy                -> ionic-covalent-bonding
      mole in stoichiometry    -> molar-mass-calculations
      acid-base definitions    -> ph-scale-indicators
      reactions of acids/bases -> neutralization
      volumetric analysis      -> neutralization
      oxidising/reducing subst -> defining-redox
  * 10 REUSE rows — nothing written (the existing lessons already teach them).

Edits made (surgical, both trees, ids frozen):
  content/chemistry/modules.json     (+ public/content mirror, byte-identical)
  src/components/lessonSets.js       (one topic-matched Play-tab set per new lesson)
  practice.json and knowledge-check.json are NOT touched (100 and 25 stand).

WRITES NOTHING unless --apply is passed.  A rerun is idempotent.  Run from the
repo root:
    python3 tools/gen-chemistry-section-a.py            # validate + dry run
    python3 tools/gen-chemistry-section-a.py --apply    # write the two files
"""
import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODULES = "content/chemistry/modules.json"
MIRROR = "public/content/chemistry/modules.json"
LESSON_SETS = "src/components/lessonSets.js"
MATCH = "matching-game"
SORT = "classifier-sim"
MARKER = "    // ---- Chemistry Section A (Principles of Chemistry) coverage build,"


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


# ============================================================================
# NEW LESSONS (19).  Every displayed lab string is a verbatim phrase taken from
# the lesson's own paragraphs/objectives/concepts, so the traceability check
# (section 3 of the harness) is satisfied by construction.
# ============================================================================
NEW_LESSONS = [
# ------------------------------------------------- principles-of-chemistry (4)
L("chem-pure-substances-and-mixtures", "Pure Substances and Mixtures",
  [
   "Matter is either a pure substance or a mixture. A pure substance is made of only one kind of particle and has a fixed composition and a sharp melting and boiling point. An element is a pure substance that cannot be broken down into anything simpler by chemical means, and a compound is a pure substance made of two or more elements chemically joined in fixed proportions, such as water, H\u2082O.",
   "A mixture contains two or more substances that are not chemically joined, so they keep their own properties and can be present in any proportion. The parts of a mixture can be separated by physical means such as filtration, evaporation or distillation, because no chemical reaction is needed. Air, sea water and crude oil are all mixtures.",
   "To tell a pure substance from a mixture, test a sample's behaviour as it changes state. A pure substance melts and boils at one fixed temperature, while a mixture melts over a range of temperatures and often boils over a range too. Paper chromatography can also show that a single 'pure' spot separates into more than one coloured substance, proving it was a mixture."
  ],
  [
   "Distinguish a pure substance from a mixture",
   "Classify a sample as an element, a compound or a mixture",
   "Explain how melting point and chromatography reveal whether a sample is pure"
  ],
  [
   "Pure substance: made of only one kind of particle, with a fixed composition and a sharp melting and boiling point.",
   "Element: a pure substance that cannot be broken down into anything simpler; compound: two or more elements chemically joined in fixed proportions.",
   "Mixture: two or more substances not chemically joined, separable by physical means."
  ],
  sort_lab("Pure Substances and Mixtures", "Sort each example under Pure substance or Mixture.",
      [{"id": "pure", "label": "Pure substance"},
       {"id": "mixture", "label": "Mixture"}
      ],
      [
       {"id": "e1", "label": "Cannot be broken down into anything simpler by chemical means", "category": "pure"},
       {"id": "e2", "label": "Water, H\u2082O", "category": "pure"},
       {"id": "e3", "label": "Made of only one kind of particle, with a fixed composition", "category": "pure"},
       {"id": "e4", "label": "Melts and boils at one fixed temperature", "category": "pure"},
       {"id": "e5", "label": "Air, sea water and crude oil", "category": "mixture"},
       {"id": "e6", "label": "Two or more substances that are not chemically joined", "category": "mixture"},
       {"id": "e7", "label": "The parts of a mixture can be separated by physical means", "category": "mixture"},
       {"id": "e8", "label": "Melts over a range of temperatures", "category": "mixture"},
      ])),
L("chem-solutions-suspensions-and-colloids", "Solutions, Suspensions, and Colloids",
  [
   "A mixture of substances can take three common forms: a solution, a suspension or a colloid. They are told apart by the size of the particles mixed into the liquid and by what the mixture looks like. A solution is a homogeneous mixture in which the dissolved particles are single ions or molecules, far too small to see or to be trapped by filter paper, so the mixture is clear and does not settle on standing.",
   "A suspension is a heterogeneous mixture in which the solid particles are large enough to be seen and to settle out when the mixture is left to stand, such as muddy water or chalk powder shaken in water. The particles are also large enough to be trapped by filter paper, so a suspension can be separated by filtration. A colloid sits between the two: its particles are larger than those of a solution but too small to settle, so the mixture looks cloudy but stable, as in milk or fog.",
   "These differences come from particle size. A solution has the smallest particles and stays clear, a suspension has the largest particles and separates on standing, and a colloid has particles in between that scatter a beam of light, which is why a colloid can look cloudy while a true solution lets light pass straight through."
  ],
  [
   "Describe a solution, a suspension and a colloid",
   "Compare the three by particle size and by what each looks like",
   "Explain why a suspension separates on standing while a solution does not"
  ],
  [
   "Solution: a homogeneous mixture whose dissolved particles are single ions or molecules, too small to see, clear and stable.",
   "Suspension: a heterogeneous mixture whose particles settle out on standing and can be trapped by filter paper.",
   "Colloid: particles larger than a solution but too small to settle, giving a cloudy but stable mixture such as milk or fog."
  ],
  sort_lab("Solutions, Suspensions, and Colloids", "Sort each mixture under Solution, Suspension or Colloid.",
      [{"id": "solution", "label": "Solution"},
       {"id": "suspension", "label": "Suspension"},
       {"id": "colloid", "label": "Colloid"}
      ],
      [
       {"id": "e1", "label": "Dissolved particles are single ions or molecules", "category": "solution"},
       {"id": "e2", "label": "Clear and does not settle on standing", "category": "solution"},
       {"id": "e3", "label": "Too small to see or to be trapped by filter paper", "category": "solution"},
       {"id": "e4", "label": "Chalk powder shaken in water", "category": "suspension"},
       {"id": "e5", "label": "Settle out when the mixture is left to stand", "category": "suspension"},
       {"id": "e6", "label": "Separated by filtration", "category": "suspension"},
       {"id": "e7", "label": "Looks cloudy but stable, as in milk or fog", "category": "colloid"},
       {"id": "e8", "label": "Particles larger than a solution but too small to settle", "category": "colloid"},
      ])),
L("chem-solubility-and-separation-techniques", "Solubility and Separation Techniques",
  [
   "Solubility is the maximum mass of a solute that dissolves in a given mass of solvent at a given temperature, and it usually rises as the temperature rises. A saturated solution holds the maximum amount of solute at that temperature, so any extra solute will not dissolve, and a solubility curve is a graph of solubility against temperature used to predict how much will dissolve.",
   "Different separation techniques suit different mixtures. Filtration separates an insoluble solid from a liquid, using filter paper that holds back the solid. Evaporation and crystallisation recover a dissolved solid by removing the solvent, while simple distillation separates a solvent from a solution by boiling and condensing the vapour, and fractional distillation separates two miscible liquids with different boiling points. Paper chromatography separates the different coloured solutes in a mixture because each solute travels up the paper at its own rate.",
   "The right method depends on what is being separated. Filtration and evaporation work for a salt mixed with an insoluble solid or dissolved in water, crystallisation gives pure crystals from a saturated solution, distillation recovers the liquid, and chromatography separates and identifies the colours in a mixture such as an ink or a food dye."
  ],
  [
   "Define solubility and a saturated solution",
   "Describe filtration, evaporation, crystallisation, distillation and chromatography",
   "Choose the right separation technique for a given mixture"
  ],
  [
   "Solubility: the maximum mass of solute that dissolves in a given mass of solvent at a given temperature; a saturated solution holds the maximum solute.",
   "Filtration separates an insoluble solid from a liquid; evaporation and crystallisation recover a dissolved solid.",
   "Distillation separates a solvent from a solution, fractional distillation separates two miscible liquids, and chromatography separates coloured solutes."
  ],
  match_lab("Solubility and Separation Techniques", "Drag each technique onto the mixture it separates.",
      [
       {"id": "e1", "label": "Filtration", "target": "Separates an insoluble solid from a liquid"},
       {"id": "e2", "label": "Evaporation and crystallisation", "target": "Recover a dissolved solid by removing the solvent"},
       {"id": "e3", "label": "Simple distillation", "target": "Separates a solvent from a solution by boiling and condensing the vapour"},
       {"id": "e4", "label": "Fractional distillation", "target": "Separates two miscible liquids with different boiling points"},
       {"id": "e5", "label": "Paper chromatography", "target": "Separates the different coloured solutes in a mixture"},
      ])),
L("chem-sucrose-extraction", "Sucrose Extraction",
  [
   "Sucrose is the sugar extracted from sugar cane, and its production is the Caribbean's most familiar industrial chemical process. The first step is to crush the harvested cane between rollers and press out the juice, leaving a fibrous residue called bagasse. The juice is then clarified by adding lime, which neutralises its acidity and causes impurities to settle out.",
   "The clarified juice is heated to evaporate much of the water, concentrating it into a thick syrup, and this syrup is boiled until crystals of raw sugar form. The mixture of crystals and syrup is spun in a centrifuge to separate the brown crystals from the syrup, which is drained off as molasses. The raw sugar crystals are then refined by re-dissolving them, filtering, and re-crystallising to give white sugar.",
   "CSEC uses sucrose extraction as the example of a large-scale separation process, because it joins several techniques together in order: crushing, clarification, evaporation, crystallisation and separation. At each stage a physical separation removes one part of the mixture, so no chemical reaction is needed to obtain the sugar from the cane."
  ],
  [
   "Describe the stages of sugar production from cane to crystals",
   "Identify the separation technique used at each stage",
   "Explain why sucrose extraction is a physical rather than a chemical process"
  ],
  [
   "Sucrose is extracted by crushing the cane, clarifying the juice with lime, evaporating the water, and crystallising the sugar.",
   "The syrup left after the crystals are removed is molasses.",
   "Sucrose extraction is a physical separation: each stage removes one part of the mixture, so no chemical reaction is needed."
  ],
  match_lab("Sucrose Extraction", "Drag each stage onto what happens at that stage.",
      [
       {"id": "e1", "label": "Crushing", "target": "Crush the harvested cane between rollers and press out the juice"},
       {"id": "e2", "label": "Clarification", "target": "Neutralises its acidity and causes impurities to settle out"},
       {"id": "e3", "label": "Evaporation", "target": "Heated to evaporate much of the water, concentrating it into a thick syrup"},
       {"id": "e4", "label": "Crystallisation", "target": "Boiled until crystals of raw sugar form"},
       {"id": "e5", "label": "Centrifuge", "target": "Spun in a centrifuge to separate the brown crystals from the syrup"},
      ])),
# ------------------------------------------------- periodic-table-bonding (1)
L("chem-metallic-bonding", "Metallic Bonding",
  [
   "Metallic bonding holds the atoms of a metal together. Each metal atom gives up its outer electrons, so the metal becomes a lattice of positive ions arranged in regular layers, surrounded by a 'sea' of delocalised electrons that are free to move throughout the structure. The metal is held together by the strong electrostatic attraction between these positive ions and the sea of delocalised electrons.",
   "The sea of delocalised electrons explains the properties of metals. Metals conduct electricity because the electrons can move and carry charge through the metal, and they conduct heat for the same reason, since the moving electrons pass energy along. Metals are malleable and ductile because the layers of positive ions can slide over one another without the bonding breaking, so the metal can be hammered into shape or drawn into a wire.",
   "The strength of metallic bonding grows with the number of delocalised electrons each atom contributes and with the charge on the ions, which is why metals differ in their melting points and hardness. An alloy, in which atoms of another element are mixed into the layers, is usually harder than the pure metal because the different-sized atoms stop the layers from sliding as easily."
  ],
  [
   "Describe metallic bonding in terms of positive ions and a sea of delocalised electrons",
   "Explain why metals conduct electricity and heat and are malleable and ductile",
   "Explain why an alloy is usually harder than the pure metal"
  ],
  [
   "Metallic bonding: positive ions in regular layers held together by a sea of delocalised electrons.",
   "Metals conduct electricity and heat because the delocalised electrons are free to move.",
   "Metals are malleable and ductile because the layers of positive ions can slide over one another."
  ],
  match_lab("Metallic Bonding", "Drag each feature onto the property it explains.",
      [
       {"id": "e1", "label": "A sea of delocalised electrons", "target": "Free to move throughout the structure"},
       {"id": "e2", "label": "Layers of positive ions", "target": "Can slide over one another without the bonding breaking"},
       {"id": "e3", "label": "Malleable and ductile", "target": "The metal can be hammered into shape or drawn into a wire"},
       {"id": "e4", "label": "An alloy", "target": "Usually harder than the pure metal because the different-sized atoms stop the layers from sliding"},
      ])),
# ------------------------------------------------- mole-concept (2)
L("chem-avogadros-law", "Avogadro's Law",
  [
   "Avogadro's law states that equal volumes of all gases, at the same temperature and pressure, contain the same number of molecules. It follows from the law that one mole of any gas occupies the same volume under the same conditions, and this volume is called the molar volume. At room temperature and pressure, the molar volume of a gas is about 24 cubic decimetres, written 24 dm\u00b3.",
   "The molar volume links the volume of a gas to the amount in moles. The relationship is: amount in moles (n) equals volume divided by the molar volume, so 48 dm\u00b3 of any gas at room temperature and pressure contains 2 moles, and 24 dm\u00b3 contains 1 mole. This works for every gas because the distance between the molecules is so much larger than the molecules themselves that their own size makes no difference.",
   "Avogadro's law is used in calculations with reacting gases. When a balanced equation shows the reacting volumes, the ratio of the volumes of the gases equals the ratio of the moles in the equation, so one volume of hydrogen reacts with half a volume of oxygen to form water vapour in a fixed whole-number ratio."
  ],
  [
   "State Avogadro's law",
   "Define molar volume and its value at room temperature and pressure",
   "Use n = volume / molar volume to find the amount of gas"
  ],
  [
   "Avogadro's law: equal volumes of all gases at the same temperature and pressure contain the same number of molecules.",
   "Molar volume: the volume of one mole of a gas, about 24 dm\u00b3 at room temperature and pressure.",
   "Amount in moles = volume divided by the molar volume."
  ],
  match_lab("Avogadro's Law", "Drag each term onto the statement that describes it.",
      [
       {"id": "e1", "label": "Avogadro's law", "target": "Equal volumes of all gases, at the same temperature and pressure, contain the same number of molecules"},
       {"id": "e2", "label": "Molar volume", "target": "The volume of one mole of a gas"},
       {"id": "e3", "label": "Room temperature and pressure", "target": "The molar volume of a gas is about 24 cubic decimetres"},
       {"id": "e4", "label": "Amount in moles", "target": "Equals volume divided by the molar volume"},
      ])),
L("chem-chemical-equations-and-conservation", "Chemical Equations and Conservation of Matter",
  [
   "A chemical equation describes a reaction using formulae, with the reactants on the left and the products on the right of an arrow. The equation must be balanced so that the number of atoms of each element is the same on both sides, because in a chemical reaction atoms are neither created nor destroyed, only rearranged. This is the law of conservation of mass.",
   "To balance an equation, place numbers, called coefficients, in front of the formulae, never change the formulae themselves. For example, hydrogen reacts with oxygen to form water, and the unbalanced equation H\u2082 + O\u2082 \u2192 H\u2082O becomes 2H\u2082 + O\u2082 \u2192 2H\u2082O, so there are four hydrogen atoms and two oxygen atoms on each side.",
   "The conservation of mass has a practical meaning: the total mass of the reactants equals the total mass of the products. In a reaction that seems to lose mass, such as one that gives off a gas, the missing mass has escaped into the air, and if the gas is collected the mass is found to be unchanged."
  ],
  [
   "State the law of conservation of mass",
   "Balance a chemical equation using coefficients",
   "Explain why the total mass is unchanged in a reaction"
  ],
  [
   "Law of conservation of mass: atoms are neither created nor destroyed, only rearranged, so the total mass of reactants equals the total mass of products.",
   "An equation is balanced by placing coefficients in front of the formulae, never by changing the formulae themselves.",
   "In a reaction that gives off a gas, the missing mass has escaped into the air."
  ],
  match_lab("Chemical Equations and Conservation of Matter", "Drag each term onto what it means.",
      [
       {"id": "e1", "label": "Coefficients", "target": "In front of the formulae, never change the formulae themselves"},
       {"id": "e2", "label": "Law of conservation of mass", "target": "Atoms are neither created nor destroyed, only rearranged"},
       {"id": "e3", "label": "Chemical equation", "target": "The reactants on the left and the products on the right of an arrow"},
       {"id": "e4", "label": "Total mass of the reactants", "target": "Equals the total mass of the products"},
      ])),
# ------------------------------------------------- acids-bases-salts (2)
L("chem-salt-preparation", "Salt Preparation",
  [
   "A salt is an ionic compound formed when the hydrogen of an acid is replaced by a metal or by an ammonium ion. The method used to prepare a salt depends on whether it is soluble in water and on the starting materials. A soluble salt of an unreactive metal is made by reacting an acid with a metal, a metal oxide, a metal hydroxide or a metal carbonate, then crystallising the salt from the resulting solution.",
   "Several routes lead to a salt. An acid reacts with a metal to give a salt and hydrogen gas, with a metal oxide or hydroxide to give a salt and water, and with a carbonate to give a salt, water and carbon dioxide. A salt whose two reactants are both soluble, and where neither gives a sign that the reaction is complete, is made by titration, in which the two solutions are mixed until neutral.",
   "An insoluble salt is prepared by precipitation, which mixes two soluble salt solutions so that the insoluble salt forms as a solid and is then collected by filtration and dried. The choice of route is decided by solubility: soluble salts use an acid reaction or titration, and insoluble salts use precipitation."
  ],
  [
   "Define a salt and describe how it is formed",
   "Compare the acid-plus-metal, acid-plus-oxide, acid-plus-carbonate and titration routes",
   "Explain how an insoluble salt is prepared by precipitation"
  ],
  [
   "Salt: an ionic compound formed when the hydrogen of an acid is replaced by a metal or by an ammonium ion.",
   "An acid reacts with a metal to give a salt and hydrogen, with an oxide or hydroxide to give a salt and water, and with a carbonate to give a salt, water and carbon dioxide.",
   "Insoluble salts are prepared by precipitation, which mixes two soluble salt solutions and collects the solid by filtration."
  ],
  match_lab("Salt Preparation", "Drag each route or method onto the salt it produces.",
      [
       {"id": "e1", "label": "Reacting an acid with a metal", "target": "A salt and hydrogen gas"},
       {"id": "e2", "label": "A metal oxide or hydroxide", "target": "A salt and water"},
       {"id": "e3", "label": "A carbonate", "target": "A salt, water and carbon dioxide"},
       {"id": "e4", "label": "Titration", "target": "The two solutions are mixed until neutral"},
       {"id": "e5", "label": "Precipitation", "target": "Mixes two soluble salt solutions so that the insoluble salt forms as a solid"},
      ])),
L("chem-uses-and-dangers-of-salts", "Uses and Dangers of Salts",
  [
   "Salts are valuable in food, farming and industry. Common salt, sodium chloride, flavours and preserves food, and ammonium salts supply the nitrogen in fertilisers. Sodium hydrogencarbonate is a raising agent in baking, and calcium sulphate is used in plaster and plaster of Paris, while many other salts are used in industry to make products such as glass, soap and dyes.",
   "Salts also carry dangers that must be managed. Some salts are toxic if swallowed, and heavy-metal salts such as those of lead and mercury are poisonous and must be kept out of food and water. Soluble fertiliser salts washed off farmland can build up in rivers and lakes, and excessive salt in the diet raises blood pressure, so salt is used in the smallest amount that does the job.",
   "The same salt can be a benefit in one place and a hazard in another, so its use depends on the amount and the setting. Sodium chloride preserves food and de-ices roads yet corrodes metal and damages plants at high concentration, which is why safe handling and correct dosage matter as much as the salt's usefulness."
  ],
  [
   "Give examples of the uses of salts in food, farming and industry",
   "Describe the dangers posed by toxic and heavy-metal salts",
   "Explain how one salt can be both useful and hazardous"
  ],
  [
   "Sodium chloride flavours and preserves food, and ammonium salts supply the nitrogen in fertilisers.",
   "Heavy-metal salts such as those of lead and mercury are poisonous and must be kept out of food and water.",
   "Sodium chloride preserves food and de-ices roads yet corrodes metal and damages plants at high concentration."
  ],
  sort_lab("Uses and Dangers of Salts", "Sort each statement under Uses or Dangers.",
      [{"id": "use", "label": "Uses"},
       {"id": "danger", "label": "Dangers"}
      ],
      [
       {"id": "e1", "label": "Sodium chloride flavours and preserves food", "category": "use"},
       {"id": "e2", "label": "Ammonium salts supply the nitrogen in fertilisers", "category": "use"},
       {"id": "e3", "label": "Calcium sulphate is used in plaster and plaster of Paris", "category": "use"},
       {"id": "e4", "label": "Sodium hydrogencarbonate is a raising agent in baking", "category": "use"},
       {"id": "e5", "label": "Heavy-metal salts such as those of lead and mercury are poisonous and must be kept out of food and water", "category": "danger"},
       {"id": "e6", "label": "Excessive salt in the diet raises blood pressure", "category": "danger"},
       {"id": "e7", "label": "Corrodes metal and damages plants at high concentration", "category": "danger"},
      ])),
# ------------------------------------------------- electrolysis (5, NEW section)
L("chem-conduction-and-electrolytes", "Conduction and Electrolytes",
  [
   "Substances conduct electricity in two different ways. Metals conduct by the movement of electrons, while ionic compounds conduct only when their ions are free to move, which happens when the compound is molten or dissolved in water. A compound that conducts electricity when molten or in aqueous solution, and is decomposed by it, is called an electrolyte, and the conduction is called electrolytic conduction.",
   "An electrolyte is made of ions, and in the liquid state these ions are free to move towards the electrodes. Sodium chloride does not conduct when solid, because its ions are held in a fixed lattice and cannot move, but molten sodium chloride and sodium chloride solution both conduct. A covalent substance such as sugar dissolves without forming ions, so its solution does not conduct, and it is a non-electrolyte.",
   "Electrolytic conduction is always accompanied by chemical change, because the current decomposes the electrolyte. This is the key difference from metallic conduction, in which the same electrons simply pass through the metal without changing it. Electrolytes include molten salts, salt solutions, acids and alkalis, while non-electrolytes include sugar solution, pure water and covalent liquids such as ethanol."
  ],
  [
   "Describe how metals and electrolytes conduct electricity",
   "Distinguish an electrolyte from a non-electrolyte",
   "Explain why an ionic compound conducts only when molten or dissolved"
  ],
  [
   "Electrolyte: a compound that conducts electricity when molten or in aqueous solution, and is decomposed by it.",
   "Ionic compounds conduct only when their ions are free to move, which happens when molten or dissolved in water.",
   "Non-electrolyte: a substance such as sugar that dissolves without forming ions, so its solution does not conduct."
  ],
  sort_lab("Conduction and Electrolytes", "Sort each substance under Electrolyte or Non-electrolyte.",
      [{"id": "electrolyte", "label": "Electrolyte"},
       {"id": "non", "label": "Non-electrolyte"}
      ],
      [
       {"id": "e1", "label": "Molten sodium chloride", "category": "electrolyte"},
       {"id": "e2", "label": "Sodium chloride solution", "category": "electrolyte"},
       {"id": "e3", "label": "Acids and alkalis", "category": "electrolyte"},
       {"id": "e4", "label": "Electrolytic conduction is always accompanied by chemical change", "category": "electrolyte"},
       {"id": "e5", "label": "Sugar solution", "category": "non"},
       {"id": "e6", "label": "Pure water", "category": "non"},
       {"id": "e7", "label": "Covalent liquids such as ethanol", "category": "non"},
       {"id": "e8", "label": "Dissolves without forming ions", "category": "non"},
      ])),
L("chem-electrolysis-principles", "Electrolysis Principles",
  [
   "Electrolysis is the decomposition of a molten or dissolved ionic compound by passing an electric current through it. The current enters and leaves through two electrodes, which are usually made of graphite or platinum because these are inert, and the electrode joined to the negative terminal of the supply is the cathode while the one joined to the positive terminal is the anode.",
   "During electrolysis the ions move towards the oppositely charged electrodes. Positive ions, called cations, move to the cathode and gain electrons there, which is reduction, while negative ions, called anions, move to the anode and lose electrons there, which is oxidation. An ion becomes a neutral atom or molecule when it is discharged at an electrode, and this discharge happens at the electrode with the opposite charge.",
   "Electrolysis of a molten binary compound gives its two elements. Molten lead(II) bromide forms lead at the cathode and bromine at the anode, because the lead ions are reduced to lead metal and the bromide ions are oxidised to bromine. The process therefore drives a redox reaction using electrical energy."
  ],
  [
   "Define electrolysis and identify the cathode and the anode",
   "Describe the movement and discharge of cations and anions",
   "Explain the products of the electrolysis of a molten binary compound"
  ],
  [
   "Electrolysis: the decomposition of a molten or dissolved ionic compound by passing an electric current through it.",
   "Cathode: the electrode joined to the negative terminal, where cations are reduced; anode: the electrode joined to the positive terminal, where anions are oxidised.",
   "Cations move to the cathode and gain electrons, anions move to the anode and lose electrons."
  ],
  match_lab("Electrolysis Principles", "Drag each term onto the statement that describes it.",
      [
       {"id": "e1", "label": "Electrolysis", "target": "The decomposition of a molten or dissolved ionic compound by passing an electric current through it"},
       {"id": "e2", "label": "Cathode", "target": "The electrode joined to the negative terminal, where cations are reduced"},
       {"id": "e3", "label": "Anode", "target": "The electrode joined to the positive terminal, where anions are oxidised"},
       {"id": "e4", "label": "Cations", "target": "Move to the cathode and gain electrons"},
       {"id": "e5", "label": "Anions", "target": "Move to the anode and lose electrons"},
      ])),
L("chem-factors-affecting-electrolysis", "Factors Affecting Electrolysis",
  [
   "When an electrolyte in solution contains more than one kind of positive or negative ion, the ion that is discharged at an electrode is decided by several factors. The position of the ion in the reactivity series matters most: the less reactive a metal, the more easily its ion is discharged at the cathode, so in an aqueous solution the hydrogen from water is discharged before a reactive metal such as sodium, while copper is discharged before hydrogen.",
   "Concentration also matters, because a more concentrated ion is more likely to be discharged. In dilute sodium chloride solution, the hydroxide ions from water are oxidised at the anode to give oxygen, but in concentrated sodium chloride solution the chloride ions are discharged to give chlorine. The nature of the electrode can matter too, because some electrodes are inert while others take part in the reaction.",
   "At the cathode in an aqueous solution, hydrogen is produced if the metal is above hydrogen in the reactivity series, and the metal is produced if it is below hydrogen. At the anode, oxygen is usually produced from dilute solutions unless the anion is a halide, in which case the halogen is produced instead. Position in the series, concentration and the electrode material together decide the products."
  ],
  [
   "Explain how position in the reactivity series decides which ion is discharged",
   "Describe the effect of concentration on the products of electrolysis",
   "Predict the products at the cathode and the anode in an aqueous solution"
  ],
  [
   "The less reactive a metal, the more easily its ion is discharged at the cathode, and hydrogen is discharged before a reactive metal such as sodium.",
   "A more concentrated ion is more likely to be discharged, so concentrated sodium chloride solution gives chlorine at the anode.",
   "At the cathode, hydrogen is produced if the metal is above hydrogen in the reactivity series, and the metal is produced if it is below hydrogen."
  ],
  match_lab("Factors Affecting Electrolysis", "Drag each factor onto how it decides the products.",
      [
       {"id": "e1", "label": "Position in the reactivity series", "target": "The less reactive a metal, the more easily its ion is discharged at the cathode"},
       {"id": "e2", "label": "Concentration", "target": "A more concentrated ion is more likely to be discharged"},
       {"id": "e3", "label": "The nature of the electrode", "target": "Some electrodes are inert while others take part in the reaction"},
       {"id": "e4", "label": "Hydrogen", "target": "If the metal is above hydrogen in the reactivity series"},
       {"id": "e5", "label": "Chlorine", "target": "In concentrated sodium chloride solution the chloride ions are discharged"},
      ])),
L("chem-faraday-constant-and-calculations", "Faraday Constant and Calculations",
  [
   "The amount of a substance produced at an electrode depends on the quantity of electricity that passes through the electrolyte. The quantity of electricity, or charge, is measured in coulombs and is the product of the current in amperes and the time in seconds, so charge Q equals current I times time t, written Q = I t.",
   "The Faraday constant links charge to moles of electrons. One mole of electrons carries a charge of 96 500 coulombs, and this value is the Faraday constant, F. It follows that the number of moles of electrons transferred equals the charge divided by 96 500, and because one mole of silver ions needs one mole of electrons to form one mole of silver, a charge of 96 500 coulombs deposits exactly one mole of silver.",
   "Faraday calculations use the ionic charge to connect electrons to products. Forming one mole of a metal of charge n+ needs n moles of electrons, so the mass of metal deposited is found by working out the moles of electrons from Q = I t, dividing by n, and multiplying by the molar mass. This is how the mass of metal deposited or gas released is calculated from the current and the time."
  ],
  [
   "Use Q = I t to calculate the quantity of electricity",
   "State the value of the Faraday constant and what it means",
   "Calculate the mass of metal deposited using the Faraday constant"
  ],
  [
   "Charge Q equals current I times time t, written Q = I t, and is measured in coulombs.",
   "The Faraday constant is the charge on one mole of electrons, 96 500 coulombs.",
   "The number of moles of electrons transferred equals the charge divided by 96 500."
  ],
  match_lab("Faraday Constant and Calculations", "Drag each term onto the statement that describes it.",
      [
       {"id": "e1", "label": "Quantity of electricity", "target": "The product of the current in amperes and the time in seconds"},
       {"id": "e2", "label": "Faraday constant", "target": "The charge on one mole of electrons, 96 500 coulombs"},
       {"id": "e3", "label": "Moles of electrons transferred", "target": "Equals the charge divided by 96 500"},
       {"id": "e4", "label": "Forming one mole of a metal of charge n+", "target": "Needs n moles of electrons"},
      ])),
L("chem-industrial-electrolysis", "Industrial Electrolysis",
  [
   "Electrolysis is used on an industrial scale to make important products. The electrolysis of concentrated brine, a solution of sodium chloride, is called the chlor-alkali process and produces chlorine gas at the anode, hydrogen gas at the cathode, and sodium hydroxide left in the solution, three substances the chemical industry depends on.",
   "Aluminium is extracted by the electrolysis of molten aluminium oxide, because aluminium is too reactive to extract by heating with carbon. The oxide is dissolved in molten cryolite to lower its melting point and save energy, and the cell uses carbon anodes that burn away as the oxide ions are oxidised to oxygen. Copper is purified by electrolysis, with the impure copper as the anode dissolving into solution and pure copper deposited on a thin cathode.",
   "Each industrial cell shows the same principles as a school experiment, scaled up. In the chlor-alkali cell the ions in brine are discharged at the electrodes, in the aluminium cell the oxide is decomposed into aluminium and oxygen, and in copper refining the impure anode loses copper while the pure cathode gains it, leaving the impurities to fall as anode slime."
  ],
  [
   "Describe the chlor-alkali process and its three products",
   "Explain why aluminium is extracted by electrolysis and the part played by cryolite",
   "Describe how copper is purified by electrolysis"
  ],
  [
   "The chlor-alkali process electrolyses concentrated brine to produce chlorine at the anode, hydrogen at the cathode and sodium hydroxide in the solution.",
   "Aluminium is extracted by electrolysing molten aluminium oxide dissolved in molten cryolite, which lowers its melting point.",
   "In copper purification the impure copper is the anode and pure copper is deposited on the cathode."
  ],
  match_lab("Industrial Electrolysis", "Drag each process onto its products.",
      [
       {"id": "e1", "label": "Chlor-alkali process", "target": "Chlorine at the anode, hydrogen at the cathode and sodium hydroxide in the solution"},
       {"id": "e2", "label": "Aluminium is extracted", "target": "By the electrolysis of molten aluminium oxide"},
       {"id": "e3", "label": "Copper purification", "target": "The impure copper is the anode and pure copper is deposited on the cathode"},
       {"id": "e4", "label": "Cryolite", "target": "The oxide is dissolved in molten cryolite to lower its melting point"},
      ])),
# ------------------------------------------------- reaction-kinetics (2, NEW section)
L("chem-reaction-rate-definition-and-factors", "Reaction Rate Definition and Factors",
  [
   "The rate of a reaction is the speed at which the reactants are used up or the products are formed, and it is measured as the change in amount per unit time. A fast reaction, such as the fizzing of magnesium in acid, finishes in seconds, while a slow reaction, such as the rusting of iron, takes weeks or months.",
   "Four factors change the rate of a reaction. Raising the temperature makes the particles move faster and collide more often and more energetically, so the rate rises. Increasing the concentration of a solution, or the pressure of a gas, puts more particles in the same space and so increases the frequency of collisions, and increasing the surface area of a solid exposes more particles to the reaction. A catalyst speeds a reaction up by providing an alternative pathway of lower activation energy, and it is not used up.",
   "All four factors work through collision theory, which says that a reaction happens only when particles collide with enough energy and with the correct orientation. Anything that increases the frequency of successful collisions increases the rate, and this is why temperature, concentration, surface area and catalysts all change how quickly a reaction proceeds."
  ],
  [
   "Define the rate of a reaction",
   "State the four factors that change the rate and how each does so",
   "Explain how each factor increases the frequency of successful collisions"
  ],
  [
   "Rate of reaction: the speed at which reactants are used up or products are formed, measured as the change in amount per unit time.",
   "Raising the temperature, increasing concentration or pressure, increasing surface area, and adding a catalyst all increase the rate.",
   "Collision theory: a reaction happens only when particles collide with enough energy and the correct orientation."
  ],
  match_lab("Reaction Rate Definition and Factors", "Drag each factor onto how it changes the rate.",
      [
       {"id": "e1", "label": "Raising the temperature", "target": "Makes the particles move faster and collide more often and more energetically"},
       {"id": "e2", "label": "Increasing the concentration", "target": "Puts more particles in the same space and so increases the frequency of collisions"},
       {"id": "e3", "label": "Increasing the surface area", "target": "Exposes more particles to the reaction"},
       {"id": "e4", "label": "A catalyst", "target": "An alternative pathway of lower activation energy"},
      ])),
L("chem-rate-data-and-graphs", "Interpreting Rate Data and Graphs",
  [
   "The progress of a reaction is followed by measuring the amount of product formed, or reactant left, at intervals, and plotting the results against time. The amount of product formed rises steeply at first, because the reactants are at their highest concentration, and then the rise flattens as the reaction slows, until the curve levels off when the reaction is complete.",
   "The rate of the reaction at any moment is the gradient of the amount-time graph at that point. A steeper gradient means a faster reaction, so the reaction is fastest at the start, when the gradient is steepest, and it has stopped when the graph becomes horizontal. Comparing two curves on the same axes shows the effect of a factor, such as a higher temperature giving a steeper initial gradient and reaching the same final amount sooner.",
   "Graphs can also show the final amount of product. A reaction that uses more of a reactant produces more product, so its curve levels off at a higher value, and the graph of the amount of reactant left falls from the starting amount to zero as the reaction goes to completion."
  ],
  [
   "Describe the shape of an amount-against-time graph",
   "Relate the gradient of the graph to the rate of reaction",
   "Interpret two curves on the same axes to compare the effects of a factor"
  ],
  [
   "The amount of product formed rises steeply at first and then flattens as the reaction slows, levelling off when the reaction is complete.",
   "The rate of reaction at any moment is the gradient of the amount-time graph, and a steeper gradient means a faster reaction.",
   "A higher temperature gives a steeper initial gradient and reaches the same final amount sooner."
  ],
  match_lab("Interpreting Rate Data and Graphs", "Drag each feature onto what it shows.",
      [
       {"id": "e1", "label": "A steeper gradient", "target": "Means a faster reaction"},
       {"id": "e2", "label": "The gradient of the amount-time graph", "target": "The rate of reaction at any moment"},
       {"id": "e3", "label": "The graph becomes horizontal", "target": "It has stopped"},
       {"id": "e4", "label": "A higher temperature", "target": "Gives a steeper initial gradient and reaches the same final amount sooner"},
      ])),
# ------------------------------------------------- energy-changes (3, NEW section)
L("chem-exothermic-and-endothermic-reactions", "Exothermic and Endothermic Reactions",
  [
   "A chemical reaction is exothermic if it releases heat energy to its surroundings, so the temperature of the surroundings rises, and endothermic if it absorbs heat energy from its surroundings, so the temperature of the surroundings falls. Combustion, the neutralisation of an acid and the reaction of a metal with an acid are all exothermic, and dissolving some salts also gives out heat.",
   "Endothermic reactions take in heat. Thermal decomposition, such as heating a metal carbonate to break it down, and photosynthesis are endothermic, and dissolving some salts in water cools the solution. Whether a reaction is exothermic or endothermic depends on the balance between the energy needed to break bonds in the reactants and the energy released when new bonds form in the products.",
   "Energy is always conserved in a chemical reaction. In an exothermic reaction more energy is released when the products' bonds form than was needed to break the reactants' bonds, so the extra is given out, while in an endothermic reaction more energy is absorbed to break bonds than is released, so the reaction takes heat from its surroundings."
  ],
  [
   "Distinguish an exothermic reaction from an endothermic reaction",
   "Give examples of each kind of reaction",
   "Explain exothermic and endothermic changes in terms of bond breaking and bond making"
  ],
  [
   "Exothermic reaction: releases heat energy to its surroundings, so the temperature of the surroundings rises.",
   "Endothermic reaction: absorbs heat energy from its surroundings, so the temperature of the surroundings falls.",
   "In an exothermic reaction more energy is released when bonds form than was needed to break the reactants' bonds."
  ],
  sort_lab("Exothermic and Endothermic Reactions", "Sort each change under Exothermic or Endothermic.",
      [{"id": "exo", "label": "Exothermic"},
       {"id": "endo", "label": "Endothermic"}
      ],
      [
       {"id": "e1", "label": "Combustion", "category": "exo"},
       {"id": "e2", "label": "The neutralisation of an acid", "category": "exo"},
       {"id": "e3", "label": "The reaction of a metal with an acid", "category": "exo"},
       {"id": "e4", "label": "Releases heat energy to its surroundings", "category": "exo"},
       {"id": "e5", "label": "Thermal decomposition", "category": "endo"},
       {"id": "e6", "label": "Photosynthesis", "category": "endo"},
       {"id": "e7", "label": "Absorbs heat energy from its surroundings", "category": "endo"},
      ])),
L("chem-energy-profile-diagrams", "Energy Profile Diagrams",
  [
   "An energy profile diagram shows how the energy of a reaction changes as the reactants change into products. Energy is plotted on the vertical axis and the progress of the reaction on the horizontal axis. In an exothermic reaction the products are at a lower energy than the reactants, so the line ends lower than it starts, while in an endothermic reaction the products are at a higher energy and the line ends higher.",
   "The hump in the middle of the profile is the activation energy, the minimum energy that colliding particles must have for a reaction to happen. Even an exothermic reaction needs this initial energy before it can begin, which is why a fuel does not catch fire until it is lit. A catalyst lowers the activation energy, so the hump is smaller and a greater proportion of the particles have enough energy to react, which makes the reaction faster.",
   "The overall energy change of the reaction is the difference between the energy of the products and the energy of the reactants. For an exothermic reaction this difference is given out as heat, and for an endothermic reaction it is taken in, and the difference is written as the enthalpy change of the reaction."
  ],
  [
   "Sketch an energy profile diagram for an exothermic and an endothermic reaction",
   "Define activation energy and show it on the diagram",
   "Explain how a catalyst changes the profile diagram"
  ],
  [
   "Energy profile diagram: a graph of energy against the progress of the reaction, with the products lower than the reactants for an exothermic reaction.",
   "Activation energy: the minimum energy that colliding particles must have for a reaction to happen, shown as the hump in the profile.",
   "A catalyst lowers the activation energy, so the hump is smaller and the reaction is faster."
  ],
  match_lab("Energy Profile Diagrams", "Drag each feature onto what it shows.",
      [
       {"id": "e1", "label": "The hump in the middle of the profile", "target": "The activation energy, the minimum energy that colliding particles must have"},
       {"id": "e2", "label": "Products lower than the reactants", "target": "An exothermic reaction"},
       {"id": "e3", "label": "Products are at a higher energy", "target": "An endothermic reaction"},
       {"id": "e4", "label": "A catalyst", "target": "Lowers the activation energy, so the hump is smaller and the reaction is faster"},
      ])),
L("chem-calculating-energy-changes", "Calculating Energy Changes",
  [
   "The energy change of a reaction can be calculated from bond energies or measured by experiment. Bond energy is the energy needed to break one mole of a bond, and in a reaction the total energy change is the energy taken in to break the bonds in the reactants minus the energy given out when the new bonds form in the products.",
   "The calculation uses the equation: energy change equals the total energy of bond breaking minus the total energy of bond making. If bond making gives out more than bond breaking takes in, the value is negative and the reaction is exothermic; if bond breaking takes in more, the value is positive and the reaction is endothermic.",
   "The energy change can also be measured by calorimetry, in which a reaction is carried out in a container and the temperature rise or fall of a known mass of water is recorded. The heat transferred is calculated with the equation heat equals mass times specific heat capacity times temperature change, and this value, adjusted for the number of moles, gives the enthalpy change of the reaction."
  ],
  [
   "Define bond energy",
   "Calculate an energy change from bond energies",
   "Describe how calorimetry measures an energy change"
  ],
  [
   "Bond energy: the energy needed to break one mole of a bond.",
   "Energy change equals the total energy of bond breaking minus the total energy of bond making.",
   "Calorimetry records the temperature rise or fall of a known mass of water, and heat equals mass times specific heat capacity times temperature change."
  ],
  match_lab("Calculating Energy Changes", "Drag each term onto what it means.",
      [
       {"id": "e1", "label": "Bond energy", "target": "The energy needed to break one mole of a bond"},
       {"id": "e2", "label": "Energy change", "target": "The total energy of bond breaking minus the total energy of bond making"},
       {"id": "e3", "label": "Calorimetry", "target": "Records the temperature rise or fall of a known mass of water"},
       {"id": "e4", "label": "Heat transferred", "target": "Mass times specific heat capacity times temperature change"},
      ])),
]

# ============================================================================
# EXTEND rows (9) — insertions into named existing lessons, ids frozen.
# ============================================================================
EXTEND_ROWS = [
    {
        "row": "Isotopes and Their Uses",
        "lesson": "atomic-structure",
        "paragraphs": [
            "Because isotopes of an element have the same number of electrons, they have identical chemical properties, but their different numbers of neutrons give them different masses, which is what makes them useful. Radioactive isotopes, called radioisotopes, are used as tracers: a small amount of a radioisotope is introduced into a system and its radiation is followed to track where the substance goes, for example through a plant or through a person's body.",
            "Radioisotopes have further uses. Carbon-14 is used to date ancient remains, because it decays at a known rate after a living thing dies, and iodine-131 and cobalt-60 are used in medicine to treat disease and sterilise equipment. The same isotope that is useful can also be dangerous, because its radiation must be handled with shielding and kept away from living tissue.",
        ],
        "objectives": [
            "Explain why isotopes have identical chemical properties but different masses",
            "Describe the uses of radioisotopes as tracers, in dating and in medicine",
        ],
        "concepts": [
            "Radioisotopes: radioactive isotopes used as tracers, for carbon dating and in medicine.",
            "Carbon-14 is used to date ancient remains because it decays at a known rate after death.",
        ],
    },
    {
        "row": "Predicting Element Properties",
        "lesson": "periodic-table-trends",
        "paragraphs": [
            "The position of an element in the table lets you predict its properties before you ever see it. An element in the same group as a known element has the same number of valence electrons and so behaves in a similar way, and an element in the same period has its outer electrons in the same shell, so its properties change in a regular way across the period.",
            "To predict a property, find the element's group and period and apply the trend. From its group you can predict how many electrons it will gain, lose or share and its likely formula, and from its position you can predict whether it is a metal or a non-metal and how reactive it is likely to be. This is why the table is used to work out the properties of an element such as an alkali metal or a halogen, even one the student has never handled.",
        ],
        "objectives": [
            "Predict the properties of an element from its group and period",
            "Use the trends to forecast the reactivity and bonding of an element",
        ],
        "concepts": [
            "Elements in the same group behave in a similar way, and properties change in a regular way across a period.",
            "Predicting a property uses the element's group and period to forecast its reactivity, bonding and likely formula.",
        ],
    },
    {
        "row": "Crystal Structures and Properties",
        "lesson": "ionic-covalent-bonding",
        "paragraphs": [
            "The properties of a substance follow from the structure of its crystals. An ionic lattice is a regular repeating arrangement of oppositely charged ions held by strong electrostatic forces, so ionic compounds are hard and have high melting and boiling points, and they conduct electricity only when molten or dissolved, because only then are the ions free to move.",
            "Giant covalent structures have their atoms joined by covalent bonds throughout, which gives them high melting points, while simple covalent molecules have strong bonds inside each molecule but only weak forces between molecules, which is why they have low melting points. Comparing structure to property in this way lets you explain why one substance is hard, another conducts, and a third is a gas at room temperature.",
        ],
        "objectives": [
            "Relate the structure of a crystal to its melting point, hardness and conductivity",
            "Compare ionic lattices, giant covalent structures and simple molecules",
        ],
        "concepts": [
            "Ionic compounds are hard with high melting points and conduct only when molten or dissolved.",
            "Simple covalent molecules have low melting points because of the weak forces between molecules.",
        ],
    },
    {
        "row": "Allotropy",
        "lesson": "ionic-covalent-bonding",
        "paragraphs": [
            "Allotropy is the existence of the same element in more than one form in the same physical state, and carbon is the classic example. Diamond and graphite are both pure carbon, yet diamond is hard, transparent and an electrical insulator, while graphite is soft, grey and a conductor of electricity, because their carbon atoms are arranged differently.",
            "In diamond each carbon atom is bonded to four others in a rigid three-dimensional network, which makes diamond the hardest natural substance and gives it a very high melting point. In graphite each carbon atom is bonded to only three others in flat layers, and the fourth electron of each atom is delocalised, which lets graphite conduct electricity and lets the layers slide over one another, which is why graphite is used as a lubricant and in pencil lead.",
        ],
        "objectives": [
            "Define allotropy and give carbon as the example",
            "Explain why diamond and graphite differ in hardness and conductivity",
        ],
        "concepts": [
            "Allotropy: the existence of the same element in more than one form in the same state, such as diamond and graphite for carbon.",
            "Diamond is hard and an insulator, while graphite is soft and conducts, because their carbon atoms are arranged differently.",
        ],
    },
    {
        "row": "Mole Concept in Stoichiometry",
        "lesson": "molar-mass-calculations",
        "paragraphs": [
            "Stoichiometry uses the balanced equation to work out the masses of substances that react together. The coefficients in the balanced equation give the molar ratio, so the ratio of the moles of the reactants and products is fixed, and from the moles of one substance the moles of every other substance can be found.",
            "A reacting-mass calculation has three steps. First, convert the given mass to moles with n = m / M. Then use the molar ratio from the equation to find the moles of the substance asked for. Finally, convert those moles back to a mass with m = n x M. This sequence is used to predict the mass of product formed from a given mass of reactant and the mass of reactant needed to make a given mass of product.",
        ],
        "objectives": [
            "Use the molar ratio from a balanced equation to relate reactants and products",
            "Calculate reacting masses with the n = m / M sequence",
        ],
        "concepts": [
            "The coefficients in a balanced equation give the molar ratio between reactants and products.",
            "A reacting-mass calculation converts mass to moles, applies the molar ratio, and converts back to mass.",
        ],
    },
    {
        "row": "Acid-Base Definitions and pH",
        "lesson": "ph-scale-indicators",
        "paragraphs": [
            "An acid and a base are defined by the ions they form in water. An acid is a substance that produces hydrogen ions, H\u207a, when dissolved in water, and a base is a substance that produces hydroxide ions, OH\u207b, when dissolved in water. An alkali is a soluble base, so every alkali is a base but not every base is an alkali.",
            "This definition ties directly to the pH scale. The more hydrogen ions a solution contains, the lower its pH and the stronger the acid, while a base lowers the concentration of hydrogen ions and raises the pH. Neutralisation is then the reaction in which hydrogen ions and hydroxide ions join to form water, which is why the pH of a solution moves towards 7 as an acid and a base neutralise each other.",
        ],
        "objectives": [
            "Define an acid and a base in terms of hydrogen and hydroxide ions",
            "Relate the concentration of hydrogen ions to the pH of a solution",
        ],
        "concepts": [
            "Acid: a substance that produces hydrogen ions, H\u207a, in water; base: a substance that produces hydroxide ions, OH\u207b, in water.",
            "The more hydrogen ions a solution contains, the lower its pH.",
        ],
    },
    {
        "row": "Reactions of Acids and Bases",
        "lesson": "neutralization",
        "paragraphs": [
            "Acids react with several classes of substance in addition to bases and carbonates. An acid reacts with a reactive metal to give a salt and hydrogen gas, for example hydrochloric acid with zinc to give zinc chloride and hydrogen, and the test for the hydrogen is a lighted splint that gives a squeaky pop.",
            "An acid also reacts with a metal oxide or a metal hydroxide to give a salt and water only, for example sulphuric acid with copper(II) oxide to give copper(II) sulphate and water. Each reaction follows the same pattern of producing a salt, so the salt formed can be predicted by knowing which acid supplies its negative ion and which metal supplies its positive ion.",
        ],
        "objectives": [
            "Describe the reaction of an acid with a metal and with a metal oxide or hydroxide",
            "Predict the salt formed from a given acid and metal",
        ],
        "concepts": [
            "An acid reacts with a reactive metal to give a salt and hydrogen gas.",
            "An acid reacts with a metal oxide or hydroxide to give a salt and water only.",
        ],
    },
    {
        "row": "Neutralisation and Volumetric Analysis",
        "lesson": "neutralization",
        "paragraphs": [
            "Volumetric analysis uses titration to find the concentration of an unknown solution. A known volume of one solution is measured into a flask, an indicator is added, and the other solution is run in from a burette until the indicator changes colour at the end point, when the two solutions have reacted exactly.",
            "The titration calculation uses the volumes and one known concentration. From the concentration and volume of one solution its amount in moles is found with n = c x V, the mole ratio from the equation gives the moles of the other solution, and dividing by its volume gives its concentration. The titre is the volume read from the burette, and repeating the titration until concordant results agree makes the answer reliable.",
        ],
        "objectives": [
            "Describe the steps of a titration and how the end point is detected",
            "Calculate a concentration from titre data using n = c x V",
        ],
        "concepts": [
            "Titration runs one solution from a burette into a flask until the indicator changes colour at the end point.",
            "A concentration is found from the moles of one solution, the mole ratio and the volume of the other.",
        ],
    },
    {
        "row": "Oxidising and Reducing Substances",
        "lesson": "defining-redox",
        "paragraphs": [
            "Common oxidising agents accept electrons and are themselves reduced, while common reducing agents donate electrons and are themselves oxidised. Familiar oxidising agents include oxygen, the halogens such as chlorine, and acidified potassium manganate(VII), which changes colour from purple to colourless as it is reduced.",
            "Familiar reducing agents include hydrogen, carbon, carbon monoxide and reactive metals such as sodium. Hydrogen removes oxygen from metal oxides to give the metal, and carbon does the same in the extraction of metals, while a reactive metal gives up its electrons to a less reactive metal ion in a displacement reaction. Identifying the oxidising and reducing substances in a given reaction is a standard CSEC skill.",
        ],
        "objectives": [
            "Name common oxidising agents and common reducing agents",
            "Identify which substance is oxidised and which is reduced in a reaction",
        ],
        "concepts": [
            "Oxidising agents accept electrons and are themselves reduced, such as oxygen, chlorine and acidified potassium manganate(VII).",
            "Reducing agents donate electrons and are themselves oxidised, such as hydrogen, carbon, carbon monoxide and reactive metals.",
        ],
    },
]

# ============================================================================
# Section layout: where each new lesson lives, and the new sections to create.
# ============================================================================
LESSON_SECTION = {
    "chem-pure-substances-and-mixtures": "principles-of-chemistry",
    "chem-solutions-suspensions-and-colloids": "principles-of-chemistry",
    "chem-solubility-and-separation-techniques": "principles-of-chemistry",
    "chem-sucrose-extraction": "principles-of-chemistry",
    "chem-metallic-bonding": "periodic-table-bonding",
    "chem-avogadros-law": "mole-concept",
    "chem-chemical-equations-and-conservation": "mole-concept",
    "chem-salt-preparation": "acids-bases-salts",
    "chem-uses-and-dangers-of-salts": "acids-bases-salts",
    "chem-conduction-and-electrolytes": "electrolysis",
    "chem-electrolysis-principles": "electrolysis",
    "chem-factors-affecting-electrolysis": "electrolysis",
    "chem-faraday-constant-and-calculations": "electrolysis",
    "chem-industrial-electrolysis": "electrolysis",
    "chem-reaction-rate-definition-and-factors": "reaction-kinetics",
    "chem-rate-data-and-graphs": "reaction-kinetics",
    "chem-exothermic-and-endothermic-reactions": "energy-changes",
    "chem-energy-profile-diagrams": "energy-changes",
    "chem-calculating-energy-changes": "energy-changes",
}

# Existing sections that receive appended lessons, in file order.
EXISTING_SECTIONS = ["principles-of-chemistry", "periodic-table-bonding",
                     "mole-concept", "acids-bases-salts"]

# New sections to create, inserted (in this order) before organic-chemistry.
NEW_SECTIONS = [
    ("electrolysis", "Electrolysis"),
    ("reaction-kinetics", "Reaction Kinetics"),
    ("energy-changes", "Energy Changes in Reactions"),
]

# The 9 frozen chemistry lessons (type-keyed; must never gain a per-lesson set).
FROZEN_LESSONS = [
    "states-of-matter", "atomic-structure", "periodic-table-trends",
    "ionic-covalent-bonding", "molar-mass-calculations", "ph-scale-indicators",
    "neutralization", "defining-redox", "hydrocarbons-alkanes",
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
        if not re.fullmatch(r"chem-[a-z0-9-]+", lid):
            problems.append("%s: id must be kebab-case and chem- prefixed" % lid)
        if lid not in LESSON_SECTION:
            problems.append("%s: no section assigned" % lid)
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
    for r in EXTEND_ROWS:
        if not r["lesson"] or not r["row"]:
            problems.append("extend row missing lesson/row name")
        if not r["paragraphs"] or not r["objectives"] or not r["concepts"]:
            problems.append("%s: extend row must add paragraphs, objectives and concepts"
                            % r["row"])
    banned = ["color", "colors", "colored", "center", "centers", "meter", "liter",
              "fiber", "defense", "aluminum", "sulfur", "sulfuric", "sulfate",
              "sulfite", "sulfide", "neutralize", "neutralizing", "oxidize",
              "oxidizing", "ionize", "ionizing", "realize", "analyze", "vapor",
              "catalyze", "catalyzing", "gray", "modeling", "canceled"]
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
def array_span(text, key_idx):
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


def strip_extensions(text, row):
    lid = row["lesson"]
    add = "\\n\\n" + json.dumps("\n\n".join(row["paragraphs"]), ensure_ascii=True)[1:-1]
    if add in text:
        text = text.replace(add, "", 1)
    for s in row["objectives"] + row["concepts"]:
        tok = ",\n                    " + json.dumps(s, ensure_ascii=True)
        if tok in text:
            text = text.replace(tok, "", 1)
    return text


def append_lessons_to_section(text, section_id, new_lessons):
    sec_start = text.index('"id": "%s"' % section_id)
    key_idx = text.index('"lessons": [', sec_start)
    open_idx, close_idx = array_span(text, key_idx)
    block = json_block([lesson_object(l) for l in new_lessons], base=12)
    last_close = text.rfind("}", open_idx, close_idx)
    return text[:last_close + 1] + ",\n" + block + text[last_close + 1:]


def section_object(section_id, title, lessons):
    return {
        "id": section_id,
        "title": title,
        "lessons": [lesson_object(l) for l in lessons],
    }


def section_block(section_id, title, lessons):
    dump = json.dumps(section_object(section_id, title, lessons),
                      ensure_ascii=True, indent=4, sort_keys=False)
    return indented(dump, 4)


def apply_modules(dry):
    path = os.path.join(REPO, MODULES)
    orig = open(path, encoding="utf-8").read()
    for lid in FROZEN_LESSONS:
        if '"id": "%s"' % lid not in orig:
            raise SystemExit("modules.json: frozen lesson %s missing" % lid)
    # 1. apply the 9 EXTEND rows (strip-then-insert, so a rerun is idempotent)
    text = orig
    for r in EXTEND_ROWS:
        text = strip_extensions(text, r)
        text = extend_lesson(text, r["lesson"], r["paragraphs"], r["objectives"],
                             r["concepts"])
    # 2. append the new lessons to their existing sections
    for sec in EXISTING_SECTIONS:
        sec_lessons = [l for l in NEW_LESSONS if LESSON_SECTION[l["id"]] == sec]
        if sec_lessons:
            text = append_lessons_to_section(text, sec, sec_lessons)
    # 3. insert the new sections before organic-chemistry
    anchor = '"id": "organic-chemistry"'
    aidx = text.index(anchor)
    brace = text.rfind("\n    {", 0, aidx)
    new_sec_json = ""
    for sec_id, sec_title in NEW_SECTIONS:
        sec_lessons = [l for l in NEW_LESSONS if LESSON_SECTION[l["id"]] == sec_id]
        new_sec_json += "\n" + section_block(sec_id, sec_title, sec_lessons) + ","
    text = text[:brace] + new_sec_json + text[brace:]
    # 4. assertions
    parsed = json.loads(text)
    before = json.loads(orig)
    by_id_new = {s["id"]: s for s in parsed}
    by_id_old = {s["id"]: s for s in before}
    for sec in EXISTING_SECTIONS:
        sec_lessons = [l["id"] for l in NEW_LESSONS if LESSON_SECTION[l["id"]] == sec]
        want = [l["id"] for l in by_id_old[sec]["lessons"]] + sec_lessons
        got = [l["id"] for l in by_id_new[sec]["lessons"]]
        if got != want:
            raise SystemExit("section %s lessons wrong:\n  want %s\n  got  %s"
                             % (sec, want, got))
    for sec_id, _ in NEW_SECTIONS:
        sec_lessons = [l["id"] for l in NEW_LESSONS if LESSON_SECTION[l["id"]] == sec_id]
        got = [l["id"] for l in by_id_new[sec_id]["lessons"]]
        if got != sec_lessons:
            raise SystemExit("new section %s lessons wrong: %s" % (sec_id, got))
    # the new sections sit between redox-reactions and organic-chemistry
    order = [s["id"] for s in parsed]
    if order != ["principles-of-chemistry", "periodic-table-bonding", "mole-concept",
                 "acids-bases-salts", "redox-reactions", "electrolysis",
                 "reaction-kinetics", "energy-changes", "organic-chemistry"]:
        raise SystemExit("section order wrong: %s" % order)
    # frozen lessons' ids keep their positions; EXTENDed lessons changed in-place
    touched = {r["lesson"] for r in EXTEND_ROWS}
    for sec in before:
        for old_l in sec["lessons"]:
            new_l = next((l for l in by_id_new[sec["id"]]["lessons"]
                          if l["id"] == old_l["id"]), None)
            if new_l is None:
                raise SystemExit("frozen lesson %s vanished" % old_l["id"])
            if old_l["id"] in touched:
                continue  # EXTENDed: verified separately below
            if json.dumps(new_l, sort_keys=True) != json.dumps(old_l, sort_keys=True):
                raise SystemExit("frozen lesson %s changed" % old_l["id"])
    # EXTENDed lessons = frozen copy + this generator's insertions
    for r in EXTEND_ROWS:
        lid = r["lesson"]
        old_l = next(l for s in before for l in s["lessons"] if l["id"] == lid)
        new_l = next(l for s in parsed for l in s["lessons"] if l["id"] == lid)
        want_content = old_l["content"] + "".join(
            "\n\n" + "\n\n".join(x["paragraphs"]) for x in EXTEND_ROWS if x["lesson"] == lid)
        if new_l["content"] != want_content:
            raise SystemExit("%s: content is not the frozen copy + the extend rows" % lid)
        want_obj = list(old_l["objectives"]) + [o for x in EXTEND_ROWS if x["lesson"] == lid
                                                for o in x["objectives"]]
        if new_l["objectives"] != want_obj:
            raise SystemExit("%s: objectives are not the frozen copy + the extend rows" % lid)
        want_con = list(old_l["concepts"]) + [c for x in EXTEND_ROWS if x["lesson"] == lid
                                              for c in x["concepts"]]
        if new_l["concepts"] != want_con:
            raise SystemExit("%s: concepts are not the frozen copy + the extend rows" % lid)
    if not dry:
        open(path, "w", encoding="utf-8").write(text)
        open(os.path.join(REPO, MIRROR), "w", encoding="utf-8").write(text)
    return len(before), len(parsed)


# ------------------------------------------------ lessonSets.js (Play-tab decks)
def apply_lesson_sets(dry):
    path = os.path.join(REPO, LESSON_SETS)
    orig = open(path, encoding="utf-8").read()
    if "chemistry: {" in orig and MARKER not in orig:
        raise SystemExit("lessonSets.js: chemistry key exists without our marker")
    header = (MARKER + "\n"
              "    //      19 net-new lessons, each with its own topic-matched set;\n"
              "    //      the 9 frozen lessons stay type-keyed via subjectTypeSets.chemistry.\n")
    block = header + js_block(NEW_LESSONS) + "\n"
    if MARKER in orig:
        # already applied on this tree: rebuild this section's slice
        start = orig.index(MARKER)
        ends = []
        for lid in [l["id"] for l in NEW_LESSONS]:
            key = "    %s: {" % js_string(lid)
            if key in orig:
                i = orig.index(key)
                ends.append(orig.index("\n    },\n", i) + len("\n    },\n"))
        if not ends:
            raise SystemExit("lessonSets.js: marker present but no section-A entry found")
        new = orig[:start] + block + orig[max(ends):]
    else:
        # first application: add a chemistry key at the end of the object
        tail = orig.rstrip()
        assert tail.endswith("};"), "lessonSets.js must end with };"
        head = tail[:-2].rstrip() + "\n"
        new = head + "  chemistry: {\n" + block + "  },\n};\n"
    for lid in [l["id"] for l in NEW_LESSONS]:
        if ('    "%s": {' % lid) not in new:
            raise SystemExit("lessonSets.js: %s was not written" % lid)
    for lid in FROZEN_LESSONS:
        if ('    "%s": {' % lid) in new:
            raise SystemExit("lessonSets.js: frozen lesson %s must not gain a set" % lid)
    if not dry:
        open(path, "w", encoding="utf-8").write(new)
    return len(NEW_LESSONS)


def main():
    dry = "--apply" not in sys.argv
    problems = validate()
    print("== audit reconciliation, Chemistry Section A")
    print("   NEW lessons: %d" % len(NEW_LESSONS))
    for l in NEW_LESSONS:
        print("      %-46s -> %-24s %5d chars  %d obj  %d concepts  lab %s"
              % (l["id"], LESSON_SECTION[l["id"]], len("\n\n".join(l["paragraphs"])),
                 len(l["objectives"]), len(l["concepts"]), l["lab"]["kind"]))
    print("   EXTEND rows: %d" % len(EXTEND_ROWS))
    for r in EXTEND_ROWS:
        print("      %-40s -> %s" % (r["row"], r["lesson"]))
    print("   REUSE rows: 10 (nothing written)")
    print("   arithmetic: 38 target chapters = 10 REUSE + 9 EXTEND + 19 NEW")
    print("== displayed strings traced to lesson copy: %d"
          % sum(len(shown_strings(l["lab"])) for l in NEW_LESSONS))
    if problems:
        print("\n!! %d PROBLEM(S)" % len(problems))
        for p in problems:
            print("   - " + p)
        raise SystemExit(1)
    print("== no problems: ids, labs, targets, traceability and extend rows all clean")
    before, after = apply_modules(dry)
    print("== modules.json: %d -> %d sections (%d new), 9 -> %d lessons"
          % (before, after, after - before, 9 + len(NEW_LESSONS)))
    apply_lesson_sets(dry)
    print("== lessonSets.js: %d set(s) written into the chemistry block" % len(NEW_LESSONS))
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
