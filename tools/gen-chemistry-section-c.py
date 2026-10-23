#!/usr/bin/env python3
"""Chemistry Section C (Inorganic Chemistry) — 18 net-new lessons of the coverage build.

Section C is entirely greenfield: none of the 9 existing Chemistry lessons is inorganic,
so all 18 target chapters are NEW (REUSE 0 / EXTEND 0 / NEW 18), each a new `inorg-`
lesson in a new top-level module `inorganic-chemistry`.

Edits made (surgical, both trees):
  content/chemistry/modules.json        (+ public/content mirror, byte-identical)
  content/chemistry/metadata.json       (estimatedModules 6 -> 7, both mirrors)
  src/components/lessonSets.js          (one `chemistry:` key, one topic-matched set per lesson)
  src/components/ExperimentSandbox.jsx  (per-lesson lookup before the CHEM_DRAG_TYPES library)

Existing lesson ids are NOT touched, renamed or reordered. The practice (100) and
knowledge-check (25) banks are NOT edited by this build.

Run:  python3 ~/gen/gen_chem_secC.py [--check]
      --check  assert everything, change nothing
"""
import json
import os
import re
import sys

REPO = os.path.expanduser("~/csec-compass")
MODULES = "content/chemistry/modules.json"
MIRROR = "public/content/chemistry/modules.json"
META = "content/chemistry/metadata.json"
META_MIRROR = "public/content/chemistry/metadata.json"
LESSON_SETS = "src/components/lessonSets.js"
MODULE_ID = "inorganic-chemistry"
MODULE_TITLE = "Inorganic Chemistry"

MATCH = "matching-game"
SORT = "classifier-sim"


def L(lid, title, paras, objectives, concepts, lab):
    return {"id": lid, "title": title, "paragraphs": paras,
            "objectives": objectives, "concepts": concepts, "lab": lab}


def match_lab(title, subtitle, pairs):
    return {"kind": "match", "title": title, "subtitle": subtitle, "pairs": pairs}


def sort_lab(title, subtitle, categories, items):
    return {"kind": "sort", "title": title, "subtitle": subtitle,
            "categories": categories, "items": items}


LESSONS = [
    # --------------------------------------------------- Properties and Reactivity of Metals
    L("inorg-metal-properties", "Physical and Chemical Properties of Metals",
      ["Metals share a set of physical properties that make them easy to recognise. Metals have a shiny lustre when freshly cut or polished. Metals are good conductors of heat and electricity. Metals are malleable, so they can be hammered into sheets, and metals are ductile, so they can be drawn into wires. A physical property is one that can be observed without changing the metal into a new substance.",
       "The chemical properties of metals show up in the way they react. Metals react with oxygen to form basic oxides, and a metal oxide that dissolves in water gives an alkaline solution. Metals react with dilute acids to release hydrogen gas, and the more reactive the metal, the faster and more vigorous the reaction is. A chemical property is seen only when the metal takes part in a reaction, and metals always lose electrons to form positive ions.",
       "The most reactive metals tarnish quickly in air and react with cold water, while the least reactive metals, such as gold, stay shiny for centuries because they do not react with oxygen at all. This spread of reactivity is the basis of the reactivity series, and it also explains why different metals are extracted from their ores in different ways."],
      ["Describe the physical properties of metals",
       "Describe the chemical properties of metals",
       "Relate a metal's reactivity to how it reacts with oxygen and acids"],
      ["Metals have a shiny lustre, and they are malleable, ductile and good conductors of heat and electricity.",
       "Metals react with oxygen to form basic oxides, and they react with dilute acids to release hydrogen gas."],
      sort_lab("Physical and Chemical Properties of Metals",
               "Sort each property under Physical property or Chemical property.",
               [{"id": "physical", "label": "Physical property"},
                {"id": "chemical", "label": "Chemical property"}],
               [{"id": "i1", "label": "Metals have a shiny lustre", "category": "physical"},
                {"id": "i2", "label": "Metals are malleable, so they can be hammered into sheets", "category": "physical"},
                {"id": "i3", "label": "Metals are ductile, so they can be drawn into wires", "category": "physical"},
                {"id": "i4", "label": "Metals are good conductors of heat and electricity", "category": "physical"},
                {"id": "i5", "label": "Metals react with oxygen to form basic oxides", "category": "chemical"},
                {"id": "i6", "label": "Metals react with dilute acids to release hydrogen gas", "category": "chemical"}])),

    L("inorg-reactions-of-metallic-compounds", "Reactions of Metallic Compounds",
      ["Metallic compounds are the oxides, hydroxides and carbonates formed when a metal combines with a non-metal or a polyatomic ion. A metal oxide and metal hydroxide are basic, and they react with acids to form a salt and water: copper(II) oxide is a basic oxide, and sodium hydroxide is an alkali when it dissolves in water.",
       "A metal carbonate reacts with dilute acids to form a salt, water and carbon dioxide gas. The gas can be identified by bubbling it through limewater, which turns milky. Carbonates of the less reactive metals also break down when they are heated: copper(II) carbonate decomposes on heating to form copper(II) oxide and carbon dioxide, and this is called thermal decomposition.",
       "The action of heat on a metallic compound is a useful way to tell how reactive its metal is. The carbonates and hydroxides of the very reactive metals, such as sodium and potassium, do not decompose on heating in the laboratory, while those of the less reactive metals, such as copper, decompose easily. This trend is another face of the reactivity series."],
      ["Describe the reactions of metal oxides and metal hydroxides with acids",
       "Describe the reaction of metal carbonates with acids and their thermal decomposition",
       "Relate the decomposition of a metallic compound to the reactivity of its metal"],
      ["Metal oxides and metal hydroxides are basic and react with acids to form a salt and water.",
       "Metal carbonates react with dilute acids to form a salt, water and carbon dioxide gas.",
       "The carbonates of the less reactive metals decompose on heating, which is called thermal decomposition."],
      sort_lab("Reactions of Metallic Compounds",
               "Sort each statement under Metal carbonate or Metal oxide and metal hydroxide.",
               [{"id": "carbonate", "label": "Metal carbonate"},
                {"id": "oxide", "label": "Metal oxide and metal hydroxide"}],
               [{"id": "i1", "label": "Reacts with dilute acids to form a salt, water and carbon dioxide gas", "category": "carbonate"},
                {"id": "i2", "label": "The gas can be identified by bubbling it through limewater, which turns milky", "category": "carbonate"},
                {"id": "i3", "label": "Copper(II) carbonate decomposes on heating to form copper(II) oxide and carbon dioxide", "category": "carbonate"},
                {"id": "i4", "label": "They react with acids to form a salt and water", "category": "oxide"},
                {"id": "i5", "label": "Sodium hydroxide is an alkali when it dissolves in water", "category": "oxide"},
                {"id": "i6", "label": "Copper(II) oxide is a basic oxide", "category": "oxide"}])),

    L("inorg-reactivity-series", "Reactivity Series of Metals",
      ["The reactivity series is a list of metals arranged in order of how readily they lose electrons and react. At the top of the series, potassium and sodium react violently with cold water, while calcium and magnesium react more slowly. The metals aluminium, zinc, iron and lead sit in the middle of the series, and they react with dilute acids but not with cold water, though zinc and iron react with steam.",
       "Below hydrogen in the series are copper, silver and gold, and they do not react with dilute acids at all. Hydrogen is placed in the series as a reference point: a metal above hydrogen is more reactive than hydrogen and displaces hydrogen from a dilute acid, while a metal below hydrogen is less reactive than hydrogen and will not. Copper, silver and gold are found free in the earth because they are so unreactive.",
       "The series is used to predict displacement reactions. A more reactive metal will displace a less reactive metal from a solution of its salt: iron displaces copper from copper(II) sulphate solution, and the blue solution fades as the copper is deposited. The reverse does not happen, because a less reactive metal cannot displace a more reactive one from its compound."],
      ["Place the common metals in order of reactivity",
       "Explain why hydrogen is used as a reference point in the series",
       "Predict displacement reactions between a metal and a salt solution"],
      ["The reactivity series lists metals in order of how readily they lose electrons and react.",
       "Any metal above hydrogen displaces hydrogen from a dilute acid, while a metal below hydrogen does not.",
       "A more reactive metal displaces a less reactive metal from a solution of its salt."],
      sort_lab("Reactivity Series of Metals",
               "Sort each statement under More reactive than hydrogen or Less reactive than hydrogen.",
               [{"id": "more", "label": "More reactive than hydrogen"},
                {"id": "less", "label": "Less reactive than hydrogen"}],
               [{"id": "i1", "label": "Potassium and sodium react violently with cold water", "category": "more"},
                {"id": "i2", "label": "They react with dilute acids but not with cold water", "category": "more"},
                {"id": "i3", "label": "Iron displaces copper from copper(II) sulphate solution", "category": "more"},
                {"id": "i4", "label": "They do not react with dilute acids at all", "category": "less"},
                {"id": "i5", "label": "Silver and gold are found free in the earth", "category": "less"},
                {"id": "i6", "label": "A metal below hydrogen is less reactive than hydrogen and will not", "category": "less"}])),

    L("inorg-extraction-of-aluminium-and-iron", "Extraction of Aluminium and Iron",
      ["Aluminium is extracted from its ore bauxite, which is mainly aluminium oxide, by electrolysis. The aluminium oxide is dissolved in molten cryolite to lower its very high melting point, and the mixture is electrolysed in a cell lined with carbon. Aluminium forms at the negative electrode and is tapped off, while oxygen forms at the positive electrode and reacts with the carbon anodes, which have to be replaced. This is called the Hall-Heroult process.",
       "Iron is extracted from its ores haematite and magnetite, which are oxides of iron, in a blast furnace. The furnace is charged with iron ore, coke and limestone, and a blast of hot air is blown in. The coke burns to form carbon monoxide, which reduces the iron oxide to molten iron, while the limestone removes the sandy impurities as slag. The molten iron is tapped from the bottom of the furnace.",
       "The two extractions differ because of the reactivity of the metal. Aluminium is too reactive to be reduced by carbon, so it needs electrolysis, which is expensive. Iron is less reactive and can be reduced by carbon monoxide, so the blast furnace is cheaper. Both processes show that the method of extraction depends on the metal's position in the reactivity series."],
      ["Describe the extraction of aluminium by electrolysis of molten aluminium oxide",
       "Describe the extraction of iron in the blast furnace",
       "Explain why aluminium and iron are extracted by different methods"],
      ["Aluminium is extracted from bauxite by electrolysis, with the aluminium oxide dissolved in molten cryolite.",
       "Iron is extracted in a blast furnace, where carbon monoxide reduces the iron oxide to molten iron.",
       "The method of extraction depends on the metal's position in the reactivity series."],
      sort_lab("Extraction of Aluminium and Iron",
               "Sort each statement under Extraction of aluminium or Extraction of iron.",
               [{"id": "al", "label": "Extraction of aluminium"},
                {"id": "fe", "label": "Extraction of iron"}],
               [{"id": "i1", "label": "The aluminium oxide is dissolved in molten cryolite", "category": "al"},
                {"id": "i2", "label": "Aluminium forms at the negative electrode and is tapped off", "category": "al"},
                {"id": "i3", "label": "Aluminium is too reactive to be reduced by carbon, so it needs electrolysis", "category": "al"},
                {"id": "i4", "label": "The furnace is charged with iron ore, coke and limestone", "category": "fe"},
                {"id": "i5", "label": "Carbon monoxide reduces the iron oxide to molten iron", "category": "fe"},
                {"id": "i6", "label": "The limestone removes the sandy impurities as slag", "category": "fe"}])),

    L("inorg-alloys-and-uses", "Metal Alloys and Uses",
      ["An alloy is a mixture of a metal with one or more other elements, usually other metals or carbon. Alloys are made because they are often stronger and more useful than the pure metals they come from. The atoms of the added element have a different size, so they break up the regular layers of metal atoms and stop the layers from sliding over each other, which is why an alloy is harder than the pure metal.",
       "Brass is an alloy of copper and zinc, used for door fittings and musical instruments. Bronze is an alloy of copper and tin, used for statues and coins. Steel is an alloy of iron with a little carbon, used for construction. Stainless steel contains chromium and nickel, which resist rusting, so it is used for cutlery and sinks. Duralumin is an aluminium alloy used in aircraft because it is light and strong.",
       "The choice of alloy depends on the job it has to do. Steel is used for the framework of buildings because it is strong and cheap, brass is used for taps because it resists corrosion and polishes well, and stainless steel is used in hospitals and kitchens because it resists rusting and is easy to clean."],
      ["Explain why an alloy is harder than the pure metal it comes from",
       "Name common alloys and the metals they contain",
       "Relate the use of an alloy to its properties"],
      ["An alloy is a mixture of a metal with one or more other elements, and it is harder than the pure metal.",
       "Brass is copper and zinc, bronze is copper and tin, and steel is iron with a little carbon."],
      match_lab("Metal Alloys and Uses",
                "Drag each alloy onto what it is made from and used for.",
                [{"id": "i1", "label": "Brass", "target": "An alloy of copper and zinc, used for door fittings and musical instruments"},
                 {"id": "i2", "label": "Bronze", "target": "An alloy of copper and tin, used for statues and coins"},
                 {"id": "i3", "label": "Steel", "target": "An alloy of iron with a little carbon, used for construction"},
                 {"id": "i4", "label": "Stainless steel", "target": "Contains chromium and nickel, which resist rusting, so it is used for cutlery and sinks"},
                 {"id": "i5", "label": "Duralumin", "target": "An aluminium alloy used in aircraft because it is light and strong"}])),

    L("inorg-corrosion-of-metals", "Corrosion of Metals",
      ["Corrosion is the slow destruction of a metal by reaction with its surroundings, and rusting is the corrosion of iron. Iron rusts only when both oxygen and water are present, because the rusting of iron is an oxidation reaction that needs air and moisture. Salt water speeds up rusting, which is why cars rust faster near the sea, and acidic conditions speed it up too.",
       "Rust is a flaky, reddish-brown solid that falls away and exposes fresh iron to attack, so once rusting starts it keeps going until the iron is eaten away. Rusting is expensive because it weakens bridges, ships and pipes, and it can be prevented by keeping air and water away from the iron.",
       "The main methods of preventing rust are painting, oiling or greasing, which coat the iron to keep out air and water, and galvanising, which coats the iron with zinc. Painting coats the iron with a layer of paint to keep out air and water, while oiling or greasing coats moving parts to keep out air and water. Zinc protects the iron even when the coating is scratched, because zinc is more reactive than iron and corrodes instead, which is called sacrificial protection."],
      ["State the conditions needed for iron to rust",
       "Explain why rusting is a problem",
       "Describe the main methods of preventing rust"],
      ["Iron rusts only when both oxygen and water are present, because rusting is an oxidation reaction.",
       "Rusting can be prevented by painting, oiling or greasing and by galvanising, which coats the iron with zinc.",
       "Zinc protects iron by sacrificial protection, because zinc is more reactive than iron and corrodes instead."],
      match_lab("Corrosion of Metals",
                "Drag each method onto how it prevents rusting.",
                [{"id": "i1", "label": "Painting", "target": "Coats the iron with a layer of paint to keep out air and water"},
                 {"id": "i2", "label": "Oiling or greasing", "target": "Coats moving parts to keep out air and water"},
                 {"id": "i3", "label": "Galvanising", "target": "Coats the iron with zinc"},
                 {"id": "i4", "label": "Sacrificial protection", "target": "Zinc is more reactive than iron and corrodes instead"}])),

    # ------------------------------------------------- Environmental Chemistry of Metals
    L("inorg-metals-and-living-systems", "Impact of Metals on Living Systems",
      ["Some metals are essential to living things, because the body needs them in small amounts to work properly. Iron is needed to make haemoglobin, which carries oxygen in the blood, calcium builds bones and teeth, and zinc is needed for growth and for healing wounds. These are called essential metals, and a shortage of any of them causes illness.",
       "Other metals are toxic, because they poison the body even in tiny amounts. Lead damages the brain and the nervous system, and mercury poisons the kidneys and the brain. Lead and mercury build up in the body instead of being removed, which is why they are so dangerous.",
       "The harm a metal does depends on the dose and on how it gets into the body. Toxic metals can enter through contaminated food or water, or through the skin, and once inside they build up in the tissues. Essential metals are safe only in the right amounts, so too much iron or zinc is harmful too: the dose matters for every metal."],
      ["Distinguish between essential metals and toxic metals",
       "Explain how toxic metals damage the body",
       "Relate the harm caused by a metal to its dose"],
      ["Essential metals such as iron, calcium and zinc are needed in small amounts for the body to work.",
       "Toxic metals such as lead and mercury poison the body and build up in the tissues."],
      sort_lab("Impact of Metals on Living Systems",
               "Sort each metal under Essential metal or Toxic metal.",
               [{"id": "essential", "label": "Essential metal"},
                {"id": "toxic", "label": "Toxic metal"}],
               [{"id": "i1", "label": "Iron is needed to make haemoglobin, which carries oxygen in the blood", "category": "essential"},
                {"id": "i2", "label": "Calcium builds bones and teeth", "category": "essential"},
                {"id": "i3", "label": "Zinc is needed for growth and for healing wounds", "category": "essential"},
                {"id": "i4", "label": "Lead damages the brain and the nervous system", "category": "toxic"},
                {"id": "i5", "label": "Mercury poisons the kidneys and the brain", "category": "toxic"},
                {"id": "i6", "label": "Lead and mercury build up in the body instead of being removed", "category": "toxic"}])),

    # -------------------------------------------- Properties and Uses of Non-Metals
    L("inorg-nonmetal-properties", "Physical and Chemical Properties of Non-Metals",
      ["Non-metals share a set of physical properties that contrast with those of metals. Non-metals are usually dull and do not have a shiny lustre, and non-metals are poor conductors of heat and electricity. Most non-metals are brittle when solid and have low melting and boiling points, and they exist as gases, liquids or dull solids at room temperature. A physical property is one that can be observed without changing the substance into something new.",
       "The chemical properties of non-metals show up in the way they react. Non-metals react with metals to form ionic compounds, and they gain electrons to form negative ions. Non-metals react with oxygen to form acidic oxides, and an acidic oxide dissolves in water to give an acidic solution. A chemical property is seen only when the non-metal takes part in a reaction.",
       "Non-metals vary a great deal in reactivity. The halogens, such as fluorine and chlorine, are very reactive, while the noble gases, such as helium and neon, hardly react at all. This spread of reactivity explains why non-metals are found both free and combined in nature."],
      ["Describe the physical properties of non-metals",
       "Describe the chemical properties of non-metals",
       "Compare the reactivity of the halogens with that of the noble gases"],
      ["Non-metals are usually dull, brittle and poor conductors of heat and electricity.",
       "Non-metals react with oxygen to form acidic oxides and gain electrons to form negative ions."],
      sort_lab("Physical and Chemical Properties of Non-Metals",
               "Sort each property under Physical property or Chemical property.",
               [{"id": "physical", "label": "Physical property"},
                {"id": "chemical", "label": "Chemical property"}],
               [{"id": "i1", "label": "Non-metals are usually dull and do not have a shiny lustre", "category": "physical"},
                {"id": "i2", "label": "Non-metals are poor conductors of heat and electricity", "category": "physical"},
                {"id": "i3", "label": "Most non-metals are brittle when solid and have low melting and boiling points", "category": "physical"},
                {"id": "i4", "label": "Non-metals react with metals to form ionic compounds", "category": "chemical"},
                {"id": "i5", "label": "Non-metals react with oxygen to form acidic oxides", "category": "chemical"},
                {"id": "i6", "label": "They gain electrons to form negative ions", "category": "chemical"}])),

    L("inorg-preparation-of-gases", "Laboratory Preparation and Uses of Gases",
      ["Gases are prepared in the laboratory from reactions chosen to release them cleanly. Oxygen is prepared by decomposing hydrogen peroxide with manganese(IV) oxide, which acts as a catalyst and speeds the reaction up. Hydrogen is prepared by adding zinc to dilute hydrochloric acid, and carbon dioxide is prepared by adding dilute hydrochloric acid to calcium carbonate.",
       "Chlorine is prepared by oxidising concentrated hydrochloric acid with manganese(IV) oxide. Each gas is collected by a method that suits it: oxygen and hydrogen, which are only slightly soluble in water, are collected over water, while chlorine is collected by upward delivery because it is denser than air.",
       "These gases have important uses. Oxygen is used in hospitals and in oxy-acetylene welding, hydrogen is used to make margarine and ammonia, and carbon dioxide is used in fizzy drinks and in fire extinguishers. Chlorine is used to kill bacteria in water treatment and to make bleach."],
      ["Describe the laboratory preparation of oxygen, hydrogen, carbon dioxide and chlorine",
       "Describe how each gas is collected",
       "Give a use for each of the gases"],
      ["Oxygen is prepared by decomposing hydrogen peroxide with manganese(IV) oxide, and hydrogen by adding zinc to dilute hydrochloric acid.",
       "Carbon dioxide is prepared by adding dilute hydrochloric acid to calcium carbonate, and chlorine by oxidising concentrated hydrochloric acid with manganese(IV) oxide."],
      match_lab("Laboratory Preparation and Uses of Gases",
                "Drag each gas onto how it is prepared.",
                [{"id": "i1", "label": "Oxygen", "target": "Prepared by decomposing hydrogen peroxide with manganese(IV) oxide"},
                 {"id": "i2", "label": "Hydrogen", "target": "Prepared by adding zinc to dilute hydrochloric acid"},
                 {"id": "i3", "label": "Carbon dioxide", "target": "Prepared by adding dilute hydrochloric acid to calcium carbonate"},
                 {"id": "i4", "label": "Chlorine", "target": "Prepared by oxidising concentrated hydrochloric acid with manganese(IV) oxide"}])),

    L("inorg-uses-of-nonmetals", "Uses of Non-Metals and Compounds",
      ["Non-metals and their compounds are used all around us. Nitrogen fills food packaging to keep food fresh, because it is unreactive and pushes out the oxygen that would let the food spoil. Chlorine kills bacteria in drinking water and in swimming pools, which makes the water safe to drink and to swim in.",
       "Carbon is used in many forms. Graphite, a form of carbon, is used in pencils and as electrodes, while diamond is used in cutting tools because it is the hardest natural substance. Sulphur is used to make sulphuric acid and to vulcanise rubber, which makes the rubber tougher and more elastic.",
       "Compounds of non-metals are just as useful as the elements themselves. Ammonia is used to make fertilisers, which help crops grow, and sulphuric acid is used in car batteries and in the manufacture of many other chemicals."],
      ["Describe the uses of nitrogen, chlorine, carbon and sulphur",
       "Describe the uses of ammonia and sulphuric acid",
       "Relate the use of a non-metal to its properties"],
      ["Nitrogen fills food packaging, and chlorine kills bacteria in drinking water and in swimming pools.",
       "Sulphur is used to make sulphuric acid, and ammonia is used to make fertilisers."],
      match_lab("Uses of Non-Metals and Compounds",
                "Drag each non-metal or compound onto its use.",
                [{"id": "i1", "label": "Nitrogen", "target": "Fills food packaging to keep food fresh"},
                 {"id": "i2", "label": "Chlorine", "target": "Kills bacteria in drinking water and in swimming pools"},
                 {"id": "i3", "label": "Sulphur", "target": "Used to make sulphuric acid and to vulcanise rubber"},
                 {"id": "i4", "label": "Ammonia", "target": "Used to make fertilisers, which help crops grow"},
                 {"id": "i5", "label": "Graphite", "target": "Used in pencils and as electrodes"}])),

    L("inorg-environmental-impact-of-nonmetals", "Environmental Impact of Non-Metals",
      ["When fuels burn, the non-metal oxides they release damage the environment. Carbon dioxide is a greenhouse gas that traps heat in the atmosphere, which contributes to global warming. Carbon monoxide is a poisonous gas that reduces the amount of oxygen the blood can carry, and it forms when fuels burn without enough air.",
       "Sulphur dioxide and the oxides of nitrogen are acidic gases. Sulphur dioxide dissolves in rain water to form acid rain, and the oxides of nitrogen from car exhausts also form acid rain and smog. Acid rain damages buildings, kills fish in lakes and harms trees and crops.",
       "These problems are reduced by burning fuels more cleanly. Removing sulphur from fuels before they are burned, fitting catalytic converters to cars and burning less fuel all reduce the oxides that reach the air. The same gases show that burning fossil fuels has a real cost to the environment."],
      ["Describe how the oxides of non-metals cause global warming and acid rain",
       "Explain how carbon monoxide harms the body",
       "Describe ways of reducing the oxides released by burning fuels"],
      ["Carbon dioxide is a greenhouse gas that traps heat in the atmosphere, and carbon monoxide is a poisonous gas.",
       "Sulphur dioxide dissolves in rain water to form acid rain, and the oxides of nitrogen form acid rain and smog."],
      match_lab("Environmental Impact of Non-Metals",
                "Drag each gas onto its effect on the environment.",
                [{"id": "i1", "label": "Carbon dioxide", "target": "A greenhouse gas that traps heat in the atmosphere"},
                 {"id": "i2", "label": "Carbon monoxide", "target": "A poisonous gas that reduces the amount of oxygen the blood can carry"},
                 {"id": "i3", "label": "Sulphur dioxide", "target": "Dissolves in rain water to form acid rain"},
                 {"id": "i4", "label": "The oxides of nitrogen", "target": "Form acid rain and smog"}])),

    # ------------------------------------------------------- Chemistry of Water
    L("inorg-properties-of-water", "Unique Properties of Water",
      ["Water has a set of properties that make it essential for life. Water has a high specific heat capacity, so it heats up and cools down slowly, which keeps the temperature of the oceans and of our bodies steady. Water is an excellent solvent, so it dissolves many substances, which is why it carries dissolved nutrients around the body.",
       "Water is unusual because ice is less dense than liquid water, so ice floats on water. This happens because water expands when it freezes, and it is why ponds freeze from the top down while fish survive underneath. Water also has a high surface tension, so small insects can walk on water without sinking.",
       "These properties depend on the shape of the water molecule and on the hydrogen bonds between water molecules. The hydrogen bonds hold the molecules together, which explains the high boiling point, the high specific heat capacity and the fact that ice floats."],
      ["Describe the thermal and solvent properties of water",
       "Explain why ice floats on water",
       "Explain how the properties of water support life"],
      ["Water has a high specific heat capacity, so it heats up and cools down slowly.",
       "Ice is less dense than liquid water, so ice floats on water, and water has a high surface tension."],
      match_lab("Unique Properties of Water",
                "Drag each property onto what it causes.",
                [{"id": "i1", "label": "High specific heat capacity", "target": "Heats up and cools down slowly"},
                 {"id": "i2", "label": "Excellent solvent", "target": "Dissolves many substances"},
                 {"id": "i3", "label": "Ice is less dense than liquid water", "target": "Ice floats on water"},
                 {"id": "i4", "label": "High surface tension", "target": "Small insects can walk on water"}])),

    L("inorg-water-hardness", "Solvent Properties and Water Hardness",
      ["Water is an excellent solvent, so it dissolves many substances and is called the universal solvent. As water runs through the ground it dissolves minerals. Hard water contains dissolved calcium and magnesium salts. Soft water contains few dissolved minerals, and soft water lathers easily with soap.",
       "Hardness has two kinds. Temporary hardness is caused by dissolved calcium hydrogencarbonate, and it is removed by boiling, because boiling decomposes the hydrogencarbonate and the calcium carbonate settles out. Permanent hardness is caused by dissolved calcium sulphate, and it is not removed by boiling.",
       "Hard water is a nuisance because it does not lather easily with soap, so more soap is wasted, and because it leaves scale in kettles and pipes when it is heated. Hard water is softened by boiling, for temporary hardness, or by adding washing soda or by ion exchange, which removes the calcium and magnesium ions."],
      ["Distinguish between hard water and soft water",
       "Explain the difference between temporary and permanent hardness",
       "Describe how hard water is softened"],
      ["Hard water contains dissolved calcium and magnesium salts, while soft water contains few dissolved minerals.",
       "Temporary hardness is removed by boiling, but permanent hardness is not."],
      sort_lab("Solvent Properties and Water Hardness",
               "Sort each statement under Hard water or Soft water.",
               [{"id": "hard", "label": "Hard water"},
                {"id": "soft", "label": "Soft water"}],
               [{"id": "i1", "label": "Hard water contains dissolved calcium and magnesium salts", "category": "hard"},
                {"id": "i2", "label": "It does not lather easily with soap", "category": "hard"},
                {"id": "i3", "label": "It leaves scale in kettles and pipes when it is heated", "category": "hard"},
                {"id": "i4", "label": "Soft water contains few dissolved minerals", "category": "soft"},
                {"id": "i5", "label": "Soft water lathers easily with soap", "category": "soft"}])),

    L("inorg-water-treatment", "Water Treatment for Domestic Use",
      ["Water from rivers and reservoirs is treated before it reaches the home. The first stage is screening, which removes large debris such as leaves and sticks, and then the water passes into a settling tank, where sedimentation lets the heavier particles settle to the bottom.",
       "After sedimentation the water is filtered. Filtration removes solid particles by passing the water through beds of sand and gravel. The final stage is chlorination, where a little chlorine is added, which kills bacteria and germs and makes the water safe to drink.",
       "Fluoride is sometimes added to help protect teeth, and the treated water is stored in covered reservoirs and pumped through pipes to homes. Each stage removes something different, and together they make the water clear and safe to drink."],
      ["Describe the stages of water treatment",
       "Explain what each stage removes",
       "Explain why chlorination makes water safe to drink"],
      ["Screening removes large debris, sedimentation lets the heavier particles settle, and filtration removes solid particles.",
       "Chlorination adds a little chlorine, which kills bacteria and germs."],
      match_lab("Water Treatment for Domestic Use",
                "Drag each stage onto what it does.",
                [{"id": "i1", "label": "Screening", "target": "Removes large debris such as leaves and sticks"},
                 {"id": "i2", "label": "Sedimentation", "target": "Lets the heavier particles settle to the bottom"},
                 {"id": "i3", "label": "Filtration", "target": "Removes solid particles by passing the water through beds of sand and gravel"},
                 {"id": "i4", "label": "Chlorination", "target": "Kills bacteria and germs"}])),

    L("inorg-green-chemistry", "Green Chemistry Principles",
      ["Green chemistry is a way of designing chemical processes that produce less waste and use safer substances. The first principle is prevention: it is better to prevent waste than to clean it up afterwards. Atom economy means designing reactions so that as many of the reactant atoms as possible end up in the product, leaving little behind.",
       "A less hazardous chemical synthesis designs processes that use and make safer chemicals, so that accidents and exposure are less harmful. Renewable feedstocks use raw materials that can be replaced, such as plant material, instead of those that will run out, such as crude oil.",
       "Energy efficiency runs reactions at room temperature and pressure wherever possible, so less energy is used, and catalysis uses catalysts to speed reactions up without the need for extra chemicals. Together these principles cut waste, save energy and reduce the hazards of the chemical industry."],
      ["State the main principles of green chemistry",
       "Explain what atom economy means",
       "Describe how green chemistry reduces waste and hazards"],
      ["Prevention is better than cleaning up waste, and atom economy keeps the reactant atoms in the product.",
       "Renewable feedstocks use materials that can be replaced, and energy efficiency runs reactions at room temperature and pressure."],
      match_lab("Green Chemistry Principles",
                "Drag each principle onto what it means.",
                [{"id": "i1", "label": "Prevention", "target": "Better to prevent waste than to clean it up afterwards"},
                 {"id": "i2", "label": "Atom economy", "target": "As many of the reactant atoms as possible end up in the product"},
                 {"id": "i3", "label": "Less hazardous chemical synthesis", "target": "Processes that use and make safer chemicals"},
                 {"id": "i4", "label": "Renewable feedstocks", "target": "Raw materials that can be replaced, such as plant material"},
                 {"id": "i5", "label": "Energy efficiency", "target": "Runs reactions at room temperature and pressure"}])),

    # --------------------------------------- Qualitative Analysis of Ions and Gases
    L("inorg-identification-of-cations", "Identification of Cations",
      ["Cations are positive ions, and they are identified by the colour they give to a flame or by the precipitates they form with sodium hydroxide. In a flame test, a clean wire is dipped in the salt and held in a blue flame. Sodium gives a yellow flame, potassium gives a lilac flame, and calcium gives a brick-red flame.",
       "Copper(II) gives a blue-green flame. When sodium hydroxide solution is added to a solution of a salt, the precipitate identifies the cation: copper(II) gives a blue precipitate with sodium hydroxide, iron(II) gives a green precipitate, and iron(III) gives a brown precipitate.",
       "Ammonium is identified by warming the salt with sodium hydroxide, which releases ammonia gas that turns damp red litmus paper blue. The flame test and the sodium hydroxide test are the two standard ways of identifying a cation in the laboratory."],
      ["Describe the flame test for cations",
       "Describe the sodium hydroxide test for cations",
       "Identify the colour each cation gives to a flame or precipitate"],
      ["Sodium gives a yellow flame, potassium gives a lilac flame, and calcium gives a brick-red flame.",
       "Copper(II) gives a blue precipitate with sodium hydroxide, iron(II) gives a green precipitate, and iron(III) gives a brown precipitate."],
      sort_lab("Identification of Cations",
               "Sort each result under Flame test or Sodium hydroxide test.",
               [{"id": "flame", "label": "Flame test"},
                {"id": "naoh", "label": "Sodium hydroxide test"}],
               [{"id": "i1", "label": "Sodium gives a yellow flame", "category": "flame"},
                {"id": "i2", "label": "Potassium gives a lilac flame", "category": "flame"},
                {"id": "i3", "label": "Calcium gives a brick-red flame", "category": "flame"},
                {"id": "i4", "label": "Copper(II) gives a blue precipitate with sodium hydroxide", "category": "naoh"},
                {"id": "i5", "label": "Iron(II) gives a green precipitate", "category": "naoh"},
                {"id": "i6", "label": "Iron(III) gives a brown precipitate", "category": "naoh"}])),

    L("inorg-identification-of-anions", "Identification of Anions",
      ["Anions are negative ions, and each has a test that identifies it. A carbonate fizzes with dilute acid, and the gas released turns limewater milky. This is the test for a carbonate.",
       "A chloride gives a white precipitate with silver nitrate solution, and the precipitate dissolves in dilute ammonia. A sulphate gives a white precipitate with barium chloride solution, and this precipitate does not dissolve in acid. The two white precipitates are told apart by what dissolves them.",
       "A nitrate is identified by the brown ring test: iron(II) sulphate solution is added, then concentrated sulphuric acid is poured carefully down the side, and a brown ring forms where the two liquids meet."],
      ["Describe the test for a carbonate",
       "Describe the tests for chloride and sulphate, and how they are told apart",
       "Describe the brown ring test for a nitrate"],
      ["A carbonate fizzes with dilute acid, and the gas released turns limewater milky.",
       "A chloride gives a white precipitate with silver nitrate solution, and a sulphate gives a white precipitate with barium chloride solution."],
      match_lab("Identification of Anions",
                "Drag each anion onto its test.",
                [{"id": "i1", "label": "Carbonate", "target": "Fizzes with dilute acid, and the gas released turns limewater milky"},
                 {"id": "i2", "label": "Chloride", "target": "Gives a white precipitate with silver nitrate solution"},
                 {"id": "i3", "label": "Sulphate", "target": "Gives a white precipitate with barium chloride solution"},
                 {"id": "i4", "label": "Nitrate", "target": "Identified by the brown ring test"}])),

    L("inorg-identification-of-gases", "Identification of Gases",
      ["Gases are identified by simple tests that give a clear result. Oxygen relights a glowing splint, and hydrogen burns with a squeaky pop when a lighted splint is held to it. These two tests tell oxygen and hydrogen apart from the other gases.",
       "Carbon dioxide turns limewater milky when it is bubbled through it. Chlorine bleaches damp blue litmus paper, and it has a sharp, choking smell. These tests use a glowing splint, limewater and litmus paper, which are the standard ways of identifying a gas.",
       "Ammonia turns damp red litmus paper blue, and it has a sharp smell. Each gas has a test that no other common gas gives, so the tests are used one after another until the gas is identified."],
      ["Describe the test for oxygen and for hydrogen",
       "Describe the test for carbon dioxide, chlorine and ammonia",
       "Explain how the gas tests tell the gases apart"],
      ["Oxygen relights a glowing splint, and hydrogen burns with a squeaky pop.",
       "Carbon dioxide turns limewater milky, chlorine bleaches damp blue litmus paper, and ammonia turns damp red litmus paper blue."],
      match_lab("Identification of Gases",
                "Drag each gas onto its test.",
                [{"id": "i1", "label": "Oxygen", "target": "Relights a glowing splint"},
                 {"id": "i2", "label": "Hydrogen", "target": "Burns with a squeaky pop"},
                 {"id": "i3", "label": "Carbon dioxide", "target": "Turns limewater milky"},
                 {"id": "i4", "label": "Chlorine", "target": "Bleaches damp blue litmus paper"},
                 {"id": "i5", "label": "Ammonia", "target": "Turns damp red litmus paper blue"}])),
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
    ids = [l["id"] for l in LESSONS]
    if len(set(ids)) != len(ids):
        problems.append("duplicate lesson id")
    for lesson in LESSONS:
        lid = lesson["id"]
        if not re.fullmatch(r"inorg-[a-z0-9-]+", lid):
            problems.append("%s: id must be kebab-case and inorg- prefixed" % lid)
        if len(lesson["objectives"]) < 2:
            problems.append("%s: needs at least 2 objectives" % lid)
        if not all(isinstance(c, str) for c in lesson["concepts"]):
            problems.append("%s: concepts must be strings" % lid)
        if len(lesson["concepts"]) < 2:
            problems.append("%s: needs at least 2 concepts" % lid)
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
    # the authored copy must not lean on American spellings
    banned = ["color", "vapor", "magnetize", "ionize", "realize", "center", "meter",
              "analyze", "fiber", "liter", "defense", "aluminum", "sulfate", "sulfur",
              "neutralize", "oxidize", "fertilize", "recognize", "emphasize"]
    blob = " ".join(["\n\n".join(l["paragraphs"]) for l in LESSONS]).lower()
    for b in banned:
        if re.search(r"\b" + b + r"\b", blob):
            problems.append("American spelling candidate present: %r" % b)
    return problems


# ------------------------------------------------------------------ emission
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


def apply_modules(dry):
    path = os.path.join(REPO, MODULES)
    orig = open(path, encoding="utf-8").read()
    if any(('"id": "%s"' % l["id"]) in orig for l in LESSONS):
        raise SystemExit("a new lesson id is already in modules.json - already applied?")
    if ('"id": "%s"' % MODULE_ID) in orig:
        raise SystemExit("module %s already present" % MODULE_ID)
    anchor = "        ]\n    }\n]"
    if orig.count(anchor) != 1:
        raise SystemExit("modules.json end anchor not unique (%d)" % orig.count(anchor))
    block = json_block([lesson_object(l) for l in LESSONS], base=12)
    module = ('    {\n'
              '        "id": "%s",\n'
              '        "title": "%s",\n'
              '        "lessons": [\n'
              '%s\n'
              '        ]\n'
              '    }\n' % (MODULE_ID, MODULE_TITLE, block))
    new = orig.replace(anchor, "        ]\n    },\n" + module + "]", 1)
    before = json.loads(orig)
    parsed = json.loads(new)
    # the 9 frozen ids survive, in order, unchanged
    before_ids = [l["id"] for m in before for l in m.get("lessons", [])]
    after_ids = [l["id"] for m in parsed for l in m.get("lessons", [])]
    if before_ids != after_ids[:len(before_ids)]:
        raise SystemExit("existing lesson ids changed or reordered")
    for a, b in zip(before, parsed[:len(before)]):
        if json.dumps(a, sort_keys=True) != json.dumps(b, sort_keys=True):
            raise SystemExit("existing module %s changed" % a["id"])
    added = after_ids[len(before_ids):]
    if added != [l["id"] for l in LESSONS]:
        raise SystemExit("added lessons mismatch: %s" % added)
    new_mod = [m for m in parsed if m["id"] == MODULE_ID]
    if len(new_mod) != 1 or len(new_mod[0]["lessons"]) != len(LESSONS):
        raise SystemExit("new module not found or wrong size")
    if len({m["id"] for m in parsed}) != len(parsed):
        raise SystemExit("module ids not unique")
    if not dry:
        open(path, "w", encoding="utf-8").write(new)
        open(os.path.join(REPO, MIRROR), "w", encoding="utf-8").write(new)
    return len(before), len(parsed), added


def apply_lesson_sets(dry):
    path = os.path.join(REPO, LESSON_SETS)
    orig = open(path, encoding="utf-8").read()
    if "  chemistry: {" in orig:
        raise SystemExit("lessonSets.js already has a chemistry key - rebase or extend it")
    if any(('    "%s": {' % l["id"]) in orig for l in LESSONS):
        raise SystemExit("a new lesson already has a lessonSets entry - already applied?")
    anchor = "  },\n};\n"
    if orig.count(anchor) != 1:
        raise SystemExit("lessonSets.js end anchor not unique (%d)" % orig.count(anchor))
    header = ("  // ---- Chemistry Section C (Inorganic Chemistry) coverage build: 18 net-new\n"
              "  //      lessons, each with its own topic-matched set. Sections A (chem-) and\n"
              "  //      B (org-) add their own keys to this same block. Every id below is a real\n"
              "  //      lesson id in content/chemistry/modules.json.\n")
    new = orig.replace(anchor, "  },\n  chemistry: {\n" + header + js_block(LESSONS) + "\n  },\n};\n", 1)
    if not dry:
        open(path, "w", encoding="utf-8").write(new)
    return orig.count(anchor)


def apply_metadata(dry):
    for rel in (META, META_MIRROR):
        path = os.path.join(REPO, rel)
        data = json.load(open(path, encoding="utf-8"))
        if data.get("estimatedModules") != 6:
            raise SystemExit("%s estimatedModules is %r, expected 6" % (rel, data.get("estimatedModules")))
        data["estimatedModules"] = 7
        if not dry:
            open(path, "w", encoding="utf-8").write(
                json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def apply_sandbox(dry):
    path = os.path.join(REPO, "src/components/ExperimentSandbox.jsx")
    orig = open(path, encoding="utf-8").read()
    if 'lessonSets["chemistry"] && lessonSets["chemistry"][lessonId]' in orig:
        if not dry:
            print("== ExperimentSandbox.jsx: per-lesson chemistry lookup already present")
        return 0
    anchor = ("  // ---- chemistry: molecule/bond/atom builders → chemistry drag set\n"
              "  if (subjectId === \"chemistry\") {\n"
              "    if (CHEM_DRAG_TYPES.has(t)) return <DragDropLabel subjectId=\"chemistry\" experimentType={t} />;\n"
              "    return flash(\"chemistry\");\n"
              "  }\n")
    if orig.count(anchor) != 1:
        raise SystemExit("ExperimentSandbox.jsx chemistry branch anchor not unique (%d)" % orig.count(anchor))
    replacement = ("  // ---- chemistry: molecule/bond/atom builders → chemistry drag set\n"
                   "  if (subjectId === \"chemistry\") {\n"
                   "    // Section C (inorganic) lessons carry their own topic-matched set, so resolve\n"
                   "    // them by lessonId BEFORE the experiment-type library below.\n"
                   "    if (lessonId && lessonSets[\"chemistry\"] && lessonSets[\"chemistry\"][lessonId]) {\n"
                   "      return <DragDropLabel subjectId=\"chemistry\" experimentType={t} lessonId={lessonId} />;\n"
                   "    }\n"
                   "    if (CHEM_DRAG_TYPES.has(t)) return <DragDropLabel subjectId=\"chemistry\" experimentType={t} />;\n"
                   "    return flash(\"chemistry\");\n"
                   "  }\n")
    if not dry:
        open(path, "w", encoding="utf-8").write(orig.replace(anchor, replacement, 1))
    return orig.count(anchor)


def main():
    dry = "--check" in sys.argv
    problems = validate()
    print("== authored lessons: %d" % len(LESSONS))
    for l in LESSONS:
        print("   %-48s %5d chars  %d obj  %d concepts  %s lab %d"
              % (l["id"], len("\n\n".join(l["paragraphs"])), len(l["objectives"]),
                 len(l["concepts"]), l["lab"]["kind"],
                 len(l["lab"].get("pairs") or l["lab"]["items"])))
    print("== displayed strings traced to lesson copy: %d"
          % sum(len(shown_strings(l["lab"])) for l in LESSONS))
    if problems:
        print("\n!! %d PROBLEM(S)" % len(problems))
        for p in problems:
            print("   - " + p)
        raise SystemExit(1)
    print("== no problems: ids, labs, targets and traceability all clean")
    n_before, n_after, added = apply_modules(dry)
    print("== modules.json: %d -> %d modules (+1); %d lessons added" % (n_before, n_after, len(added)))
    apply_lesson_sets(dry)
    print("== lessonSets.js: %d set(s) written into a new chemistry block" % len(LESSONS))
    apply_metadata(dry)
    print("== metadata.json: estimatedModules 6 -> 7 (both trees)")
    apply_sandbox(dry)
    if not dry:
        a = open(os.path.join(REPO, MODULES), "rb").read()
        b = open(os.path.join(REPO, MIRROR), "rb").read()
        if a != b:
            raise SystemExit("modules mirrors differ after write")
        ma = open(os.path.join(REPO, META), "rb").read()
        mb = open(os.path.join(REPO, META_MIRROR), "rb").read()
        if ma != mb:
            raise SystemExit("metadata mirrors differ after write")
        print("== mirrors byte-identical (both trees)")
    if dry:
        print("== dry run: nothing written")


if __name__ == "__main__":
    main()




