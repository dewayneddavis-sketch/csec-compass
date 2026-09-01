import { useState } from "react";
import { lessonSets } from "./lessonSets";

// ---- Subject-aware content sets ------------------------------------------
// Every set's CONTENT belongs to its own subject. `kind: "diagram"` keeps the
// biology cell diagram; `kind: "match"` is a list-style matching activity;
// `kind: "sort"` lets multiple items drop into shared category zones;
// `kind: "order"` places items into a correct sequence.
const subjectSets = {
  biology: {
    title: "Label the Animal Cell",
    subtitle: "Drag each label to its correct position on the diagram.",
    kind: "diagram",
    labels: [
      { id: "mitochondria", label: "Mitochondria" },
      { id: "nucleus", label: "Nucleus" },
      { id: "cell-membrane", label: "Cell Membrane" },
      { id: "cytoplasm", label: "Cytoplasm" },
      { id: "ribosomes", label: "Ribosomes" },
    ],
    targetZones: [
      { id: "mitochondria", label: "Mitochondria", x: 27, y: 55, w: 22, h: 18 },
      { id: "nucleus", label: "Nucleus", x: 38, y: 35, w: 18, h: 18 },
      { id: "cell-membrane", label: "Cell Membrane", x: 10, y: 15, w: 28, h: 12 },
      { id: "cytoplasm", label: "Cytoplasm", x: 28, y: 72, w: 24, h: 16 },
      { id: "ribosomes", label: "Ribosomes", x: 57, y: 28, w: 22, h: 14 },
    ],
  },
  "english-a": {
    title: "Match Literary Devices",
    subtitle: "Drag each literary device to its example.",
    kind: "match",
    pairs: [
      { id: "simile", target: "Uses 'like' or 'as' to compare", label: "Simile" },
      { id: "metaphor", target: "States one thing IS another", label: "Metaphor" },
      { id: "personification", target: "Gives human qualities to objects", label: "Personification" },
      { id: "hyperbole", target: "Extreme exaggeration for effect", label: "Hyperbole" },
      { id: "onomatopoeia", target: "Words that imitate sounds (buzz, hiss)", label: "Onomatopoeia" },
      { id: "alliteration", target: "Repeated initial consonant sounds", label: "Alliteration" },
    ],
  },
  mathematics: {
    title: "Match Math Terms",
    subtitle: "Drag each term to its meaning.",
    kind: "match",
    pairs: [
      { id: "mean", target: "Sum of values ÷ number of values", label: "Mean" },
      { id: "median", target: "Middle value when data is ordered", label: "Median" },
      { id: "mode", target: "Most frequently occurring value", label: "Mode" },
      { id: "gradient", target: "Rise over run — steepness of a line", label: "Gradient" },
      { id: "intercept", target: "Where a line crosses the y-axis", label: "Intercept" },
      { id: "hypotenuse", target: "Longest side of a right-angled triangle", label: "Hypotenuse" },
      { id: "prime", target: "Number with exactly two factors: 1 and itself", label: "Prime number" },
    ],
  },
  physics: {
    title: "Match Quantities to Units",
    subtitle: "Drag each quantity to its SI unit.",
    kind: "match",
    pairs: [
      { id: "force", target: "Newton (N)", label: "Force" },
      { id: "energy", target: "Joule (J)", label: "Energy" },
      { id: "power", target: "Watt (W)", label: "Power" },
      { id: "voltage", target: "Volt (V)", label: "Voltage" },
      { id: "current", target: "Ampere (A)", label: "Current" },
    ],
  },
  chemistry: {
    title: "Match Equipment to Use",
    subtitle: "Drag each piece of equipment to its use.",
    kind: "match",
    pairs: [
      { id: "beaker", target: "Holding and mixing liquids", label: "Beaker" },
      { id: "burette", target: "Measuring exact volumes in titrations", label: "Burette" },
      { id: "test-tube", target: "Heating small amounts of substances", label: "Test tube" },
      { id: "volumetric-flask", target: "Preparing precise solution volumes", label: "Volumetric flask" },
      { id: "evaporating-dish", target: "Evaporating liquids to obtain solids", label: "Evaporating dish" },
    ],
  },
  "principles-of-accounts": {
    title: "Classify Balance Sheet Items",
    subtitle: "Drag each item into Asset, Liability, or Equity.",
    kind: "sort",
    categories: [
      { id: "asset", label: "Asset" },
      { id: "liability", label: "Liability" },
      { id: "equity", label: "Equity" },
    ],
    items: [
      { id: "cash", label: "Cash", category: "asset" },
      { id: "inventory", label: "Inventory", category: "asset" },
      { id: "equipment", label: "Equipment", category: "asset" },
      { id: "land", label: "Land & Buildings", category: "asset" },
      { id: "receivables", label: "Receivables", category: "asset" },
      { id: "loan", label: "Bank Loan", category: "liability" },
      { id: "payables", label: "Payables", category: "liability" },
      { id: "mortgage", label: "Mortgage", category: "liability" },
      { id: "capital", label: "Owner's Capital", category: "equity" },
      { id: "profit", label: "Retained Profit", category: "equity" },
    ],
  },
  "information-technology": {
    title: "Match Devices to Categories",
    subtitle: "Drag each device to its correct category.",
    kind: "match",
    pairs: [
      { id: "keyboard", target: "Input device", label: "Keyboard" },
      { id: "monitor", target: "Output device", label: "Monitor" },
      { id: "ssd", target: "Storage device", label: "SSD" },
      { id: "router", target: "Networking device", label: "Router" },
    ],
  },
  "social-studies": {
    title: "Match Institutions to Functions",
    subtitle: "Drag each institution to its function in society.",
    kind: "match",
    pairs: [
      { id: "family", target: "Socialization of children", label: "Family" },
      { id: "school", target: "Education and learning", label: "School" },
      { id: "courts", target: "Justice and law enforcement", label: "Courts" },
      { id: "church", target: "Spiritual and moral guidance", label: "Church" },
    ],
  },
  spanish: {
    title: "Spanish Word Match",
    subtitle: "Drag each Spanish word to its English meaning.",
    kind: "match",
    pairs: [
      { id: "hola", target: "Hello", label: "Hola" },
      { id: "gracias", target: "Thank you", label: "Gracias" },
      { id: "casa", target: "House", label: "Casa" },
      { id: "comida", target: "Food", label: "Comida" },
    ],
  },
};

// ---- English A: per-lesson sets keyed by experiment.type ------------------
// Each of the 10 English A lessons gets its own distinct activity whose
// content matches that lesson's topic. No two lessons collapse to the same set.
const englishSets = {
  // 1. literal-meaning (highlight-tool) — sort sentences by whether they
  //    support a stated inference.
  "highlight-tool": {
    title: "Find the Evidence",
    subtitle: "Inference: Maria had been running in the rain. Sort each sentence into 'Supports' or 'Does NOT support' the inference.",
    kind: "sort",
    categories: [
      { id: "support", label: "Supports the inference" },
      { id: "not-support", label: "Does NOT support" },
    ],
    items: [
      { id: "s1", label: "Maria's shirt was soaked through.", category: "support" },
      { id: "s2", label: "Drops of water fell from her hair.", category: "support" },
      { id: "s3", label: "Her shoes squelched with every step.", category: "support" },
      { id: "s4", label: "Maria enjoys listening to music.", category: "not-support" },
      { id: "s5", label: "It was a warm, sunny afternoon.", category: "not-support" },
    ],
  },
  // 2. figurative-language (matching-game) — the literary-devices match set.
  "matching-game": {
    title: "Match Literary Devices",
    subtitle: "Drag each literary device to its example.",
    kind: "match",
    pairs: [
      { id: "simile", target: "Uses 'like' or 'as' to compare", label: "Simile" },
      { id: "metaphor", target: "States one thing IS another", label: "Metaphor" },
      { id: "personification", target: "Gives human qualities to objects", label: "Personification" },
      { id: "hyperbole", target: "Extreme exaggeration for effect", label: "Hyperbole" },
      { id: "onomatopoeia", target: "Words that imitate sounds (buzz, hiss)", label: "Onomatopoeia" },
      { id: "alliteration", target: "Repeated initial consonant sounds", label: "Alliteration" },
      { id: "irony", target: "Saying the opposite of what is meant", label: "Irony" },
    ],
  },
  // 3. identifying-main-points (text-trimmer) — keep the main points.
  "text-trimmer": {
    title: "Trim to the Main Point",
    subtitle: "Sort each sentence: keep only the sentences that state the MAIN POINT; trim the extra details.",
    kind: "sort",
    categories: [
      { id: "main", label: "Main Point — Keep" },
      { id: "trim", label: "Detail — Trim" },
    ],
    items: [
      { id: "m1", label: "Deforestation harms the climate.", category: "main" },
      { id: "m2", label: "Forests absorb carbon dioxide from the air.", category: "main" },
      { id: "m3", label: "Trees give shade to the villagers.", category: "trim" },
      { id: "m4", label: "Some birds build nests in the tallest branches.", category: "trim" },
      { id: "m5", label: "The forest floor is covered in fallen leaves.", category: "trim" },
    ],
  },
  // 4. drafting-summary (dialogue-builder) — order the summary sentences.
  "dialogue-builder": {
    title: "Build the Summary",
    subtitle: "Arrange the summary sentences in the correct order (who → what happened → why / outcome).",
    kind: "order",
    items: [
      { id: "q1", label: "The farmer planted the seeds in early spring.", order: 1 },
      { id: "q2", label: "He watered the field every day.", order: 2 },
      { id: "q3", label: "The crops grew tall and healthy.", order: 3 },
      { id: "q4", label: "By summer, the harvest was ready.", order: 4 },
      { id: "q5", label: "The farmer sold the crop at the market.", order: 5 },
    ],
  },
  // 5. subject-verb-agreement (sentence-fixer) — match sentence to correct verb.
  "sentence-fixer": {
    title: "Fix Subject–Verb Agreement",
    subtitle: "Drag each sentence to the verb that makes it correct.",
    kind: "match",
    pairs: [
      { id: "v1", target: "is", label: "Each of the boys ___ ready." },
      { id: "v2", target: "are", label: "The dogs ___ barking loudly." },
      { id: "v3", target: "were", label: "Neither the teacher nor the students ___ late." },
      { id: "v4", target: "has", label: "Everyone ___ to bring a pencil." },
      { id: "v5", target: "was", label: "Mathematics ___ my favourite subject." },
    ],
  },
  // 6. punctuation-mastery (punctuation-drag-drop) — match sentence to the
  //    punctuation mark that fixes it.
  "punctuation-drag-drop": {
    title: "Insert the Punctuation",
    subtitle: "Drag each sentence to the punctuation mark that completes it.",
    kind: "match",
    pairs: [
      { id: "p1", target: "?", label: "She asked What time is it?" },
      { id: "p2", target: "'", label: "The dog s bone belongs to Rex." },
      { id: "p3", target: ",", label: "We need bread milk and eggs." },
      { id: "p4", target: "!", label: "Wow what a performance" },
      { id: "p5", target: ".", label: "The meeting ends at three o'clock" },
    ],
  },
  // 7. synonyms-antonyms (word-swap) — match a word to its best synonym.
  "word-swap": {
    title: "Swap in the Best Synonym",
    subtitle: "Drag each highlighted word to its best synonym replacement.",
    kind: "match",
    pairs: [
      { id: "w1", target: "joyful", label: "happy" },
      { id: "w2", target: "tiny", label: "small" },
      { id: "w3", target: "furious", label: "angry" },
      { id: "w4", target: "intelligent", label: "smart" },
      { id: "w5", target: "rapid", label: "fast" },
    ],
  },
  // 8. diction-context (vocab-flashcards) — handled by FlashcardSystem; no
  //    DragDropLabel set here (see ExperimentSandbox routing).
  // 9. plot-structure (plot-arranger) — order the story events.
  "plot-arranger": {
    title: "Arrange the Plot",
    subtitle: "Arrange the story events in chronological (plot) order.",
    kind: "order",
    items: [
      { id: "a1", label: "The hero finds a mysterious map.", order: 1 },
      { id: "a2", label: "The hero follows the map into the forest.", order: 2 },
      { id: "a3", label: "A storm traps the hero in a cave.", order: 3 },
      { id: "a4", label: "The hero discovers the hidden treasure.", order: 4 },
      { id: "a5", label: "The hero returns home as a hero.", order: 5 },
    ],
  },
  // 10. argument-structure (outliner) — order the argument outline.
  "outliner": {
    title: "Build the Argument Outline",
    subtitle: "Arrange the parts of the argument in the correct order: claim → reason → evidence → counterargument → rebuttal.",
    kind: "order",
    items: [
      { id: "o1", label: "Claim: School uniforms should be required.", order: 1 },
      { id: "o2", label: "Reason: They reduce classroom distractions.", order: 2 },
      { id: "o3", label: "Evidence: Schools report better focus.", order: 3 },
      { id: "o4", label: "Counterargument: Some say uniforms limit self-expression.", order: 4 },
      { id: "o5", label: "Rebuttal: Creativity can still be shown in other ways.", order: 5 },
    ],
  },
};

// ---- Mathematics / Physics / Chemistry: per (subject, experimentType) sets --
// Each lesson's experiment.type resolves to a distinct set whose content
// matches that lesson's topic. Builders that already produce a distinct,
// topic-matched interaction (graph plotting, balance scale, circuit builder)
// stay on their dedicated tools and are NOT listed here.
const subjectTypeSets = {
  mathematics: {
    // Operations on Real Numbers — match each expression to its result.
    "interactive-quiz": {
      title: "Order of Operations Challenge",
      subtitle: "Use BODMAS to evaluate each expression, then drag it to its correct result.",
      kind: "match",
      pairs: [
        { id: "r1", target: "16", label: "6 + 2 × 5" },
        { id: "r2", target: "7", label: "3 + 4 × 1" },
        { id: "r3", target: "13", label: "2 + 3 × 3 + 2" },
        { id: "r4", target: "1", label: "10 − 2 × 4 − 1" },
        { id: "r5", target: "21", label: "(2 + 5) × 3" },
      ],
    },
    // Fractions, Decimals & Percentages — match fraction to percentage.
    "visual-converter": {
      title: "Fraction ↔ Percentage Match",
      subtitle: "Drag each fraction to its equivalent percentage.",
      kind: "match",
      pairs: [
        { id: "f1", target: "50%", label: "1/2" },
        { id: "f2", target: "25%", label: "1/4" },
        { id: "f3", target: "75%", label: "3/4" },
        { id: "f4", target: "20%", label: "1/5" },
        { id: "f5", target: "10%", label: "1/10" },
      ],
    },
    // Introduction to Functions — match input to output of f(x) = 2x + 1.
    "function-machine": {
      title: "Function Machine: f(x) = 2x + 1",
      subtitle: "Drag each input to the output the machine would produce.",
      kind: "match",
      pairs: [
        { id: "fx1", target: "1", label: "f(0)" },
        { id: "fx2", target: "3", label: "f(1)" },
        { id: "fx3", target: "5", label: "f(2)" },
        { id: "fx4", target: "7", label: "f(3)" },
        { id: "fx5", target: "9", label: "f(4)" },
      ],
    },
    // Pythagoras' Theorem — match triangle side pairs to missing hypotenuse.
    "interactive-triangle": {
      title: "Find the Hypotenuse",
      subtitle: "For each right-angled triangle (two shorter sides given), drag it to its hypotenuse length.",
      kind: "match",
      pairs: [
        { id: "p1", target: "5", label: "Sides 3 and 4" },
        { id: "p2", target: "10", label: "Sides 6 and 8" },
        { id: "p3", target: "13", label: "Sides 5 and 12" },
        { id: "p4", target: "15", label: "Sides 9 and 12" },
        { id: "p5", target: "17", label: "Sides 8 and 15" },
      ],
    },
    // Trig Ratios (SOH CAH TOA) — match ratio to its formula.
    "trig-circle": {
      title: "Match the Trig Ratios",
      subtitle: "Drag each ratio to the correct SOH-CAH-TOA definition.",
      kind: "match",
      pairs: [
        { id: "t1", target: "opposite ÷ hypotenuse", label: "sin θ" },
        { id: "t2", target: "adjacent ÷ hypotenuse", label: "cos θ" },
        { id: "t3", target: "opposite ÷ adjacent", label: "tan θ" },
        { id: "t4", target: "sin θ = opposite/hypotenuse", label: "SOH" },
        { id: "t5", target: "cos θ = adjacent/hypotenuse", label: "CAH" },
        { id: "t6", target: "tan θ = opposite/adjacent", label: "TOA" },
      ],
    },
    // Introduction to Vectors — sort quantities as scalar or vector.
    "vector-addition": {
      title: "Scalar or Vector?",
      subtitle: "Sort each quantity into Scalar (magnitude only) or Vector (magnitude AND direction).",
      kind: "sort",
      categories: [
        { id: "scalar", label: "Scalar" },
        { id: "vector", label: "Vector" },
      ],
      items: [
        { id: "sp1", label: "Speed: 6 m/s", category: "scalar" },
        { id: "sp2", label: "Distance: 40 m", category: "scalar" },
        { id: "sp3", label: "Mass: 5 kg", category: "scalar" },
        { id: "sp4", label: "Time: 3 s", category: "scalar" },
        { id: "vt1", label: "Velocity: 6 m/s north", category: "vector" },
        { id: "vt2", label: "Displacement: 40 m east", category: "vector" },
        { id: "vt3", label: "Force: 10 N down", category: "vector" },
      ],
    },
    // Matrices & Determinants — match matrix size to its order.
    "matrix-transformer": {
      title: "Matrix Dimensions",
      subtitle: "Drag each matrix size to its correct order (rows × columns).",
      kind: "match",
      pairs: [
        { id: "m2", target: "2 rows, 2 columns", label: "A 2 × 2 matrix" },
        { id: "m3", target: "3 rows, 1 column", label: "A 3 × 1 matrix" },
        { id: "m4", target: "2 rows, 3 columns", label: "A 2 × 3 matrix" },
        { id: "m5", target: "1 row, 4 columns", label: "A 1 × 4 matrix" },
      ],
    },
    // Measures of Central Tendency — match term to value for the data
    // set {2, 4, 4, 6, 10}.
    "data-visualizer": {
      title: "Live Stats for {2, 4, 4, 6, 10}",
      subtitle: "Drag each measure of central tendency to its value for this data set.",
      kind: "match",
      pairs: [
        { id: "d1", target: "5.2", label: "Mean" },
        { id: "d2", target: "4", label: "Median" },
        { id: "d3", target: "4", label: "Mode" },
        { id: "d4", target: "8", label: "Range" },
        { id: "d5", target: "5", label: "Number of values" },
        { id: "d6", target: "26", label: "Sum of values" },
      ],
    },
    // Basic Probability — match event to probability.
    "probability-sim": {
      title: "Coin & Dice Chances",
      subtitle: "Drag each event to its probability.",
      kind: "match",
      pairs: [
        { id: "pr1", target: "1/2", label: "Getting heads on one coin flip" },
        { id: "pr2", target: "1/6", label: "Rolling a 6 on a fair die" },
        { id: "pr3", target: "3/6", label: "Rolling an even number on a die" },
        { id: "pr4", target: "3/6", label: "Rolling an odd number on a die" },
        { id: "pr5", target: "1", label: "Rolling a number less than 7" },
      ],
    },
  },
  physics: {
    // Scalars and Vectors — sort quantities as scalar or vector.
    "vector-addition": {
      title: "Scalar or Vector?",
      subtitle: "Sort each physics quantity into Scalar (magnitude only) or Vector (magnitude AND direction).",
      kind: "sort",
      categories: [
        { id: "scalar", label: "Scalar" },
        { id: "vector", label: "Vector" },
      ],
      items: [
        { id: "p1", label: "Speed", category: "scalar" },
        { id: "p2", label: "Distance", category: "scalar" },
        { id: "p3", label: "Temperature", category: "scalar" },
        { id: "p4", label: "Mass", category: "scalar" },
        { id: "p5", label: "Velocity", category: "vector" },
        { id: "p6", label: "Displacement", category: "vector" },
        { id: "p7", label: "Acceleration", category: "vector" },
        { id: "p8", label: "Force", category: "vector" },
      ],
    },
    // Distance-Time & Velocity-Time Graphs — match graph segment to motion.
    "graph-sim": {
      title: "Read the Motion Graph",
      subtitle: "Drag each graph feature to the motion it describes.",
      kind: "match",
      pairs: [
        { id: "g1", target: "At rest (not moving)", label: "Horizontal flat line on a distance–time graph" },
        { id: "g2", target: "Constant speed", label: "Straight sloped line on a distance–time graph" },
        { id: "g3", target: "Constant velocity", label: "Horizontal line above zero on a velocity–time graph" },
        { id: "g4", target: "Constant acceleration", label: "Straight sloped line on a velocity–time graph" },
        { id: "g5", target: "Zero velocity", label: "Flat line on the zero line of a velocity–time graph" },
      ],
    },
    // Temperature and Heat Transfer — sort into methods of heat transfer.
    "heat-sim": {
      title: "How Does Heat Move?",
      subtitle: "Sort each example into Conduction, Convection, or Radiation.",
      kind: "sort",
      categories: [
        { id: "cond", label: "Conduction" },
        { id: "conv", label: "Convection" },
        { id: "rad", label: "Radiation" },
      ],
      items: [
        { id: "h1", label: "Metal spoon heats up in hot soup", category: "cond" },
        { id: "h2", label: "Handle of a frying pan gets hot", category: "cond" },
        { id: "h3", label: "Hot air rises above a heater", category: "conv" },
        { id: "h4", label: "Water boils and circulates", category: "conv" },
        { id: "h5", label: "Sun warms your skin", category: "rad" },
        { id: "h6", label: "Heat from a fire felt across a room", category: "rad" },
      ],
    },
    // The Gas Laws — match each gas law to its relationship.
    "piston-sim": {
      title: "The Gas Laws",
      subtitle: "Drag each gas law to the relationship it describes.",
      kind: "match",
      pairs: [
        { id: "b1", target: "Pressure is inversely proportional to volume (constant temperature)", label: "Boyle's Law" },
        { id: "b2", target: "Volume is proportional to temperature (constant pressure)", label: "Charles's Law" },
        { id: "b3", target: "Pressure is proportional to temperature (constant volume)", label: "The Pressure Law" },
        { id: "b4", target: "Pressure ∝ 1/Volume", label: "Boyle's Law (mathematically)" },
        { id: "b5", target: "V ∝ T", label: "Charles's Law (mathematically)" },
      ],
    },
    // Properties of Waves — match term to definition.
    "ripple-tank": {
      title: "Wave Terms",
      subtitle: "Drag each wave property to its definition.",
      kind: "match",
      pairs: [
        { id: "w1", target: "Distance between successive crests", label: "Wavelength" },
        { id: "w2", target: "Number of waves per second (Hz)", label: "Frequency" },
        { id: "w3", target: "Maximum height of a wave from its rest position", label: "Amplitude" },
        { id: "w4", target: "Frequency × wavelength", label: "Wave speed" },
      ],
    },
    // Refraction and Lenses — match lens to its behaviour.
    "optics-bench": {
      title: "Lenses & Refraction",
      subtitle: "Drag each item to the behaviour it describes.",
      kind: "match",
      pairs: [
        { id: "o1", target: "Brings parallel rays together", label: "Convex (converging) lens" },
        { id: "o2", target: "Spreads parallel rays apart", label: "Concave (diverging) lens" },
        { id: "o3", target: "The bending of light as it passes between materials", label: "Refraction" },
        { id: "o4", target: "The line perpendicular to a surface at the point of impact", label: "Normal" },
      ],
    },
    // Radioactivity and Half-Life — match emission to its property.
    "decay-sim": {
      title: "Types of Radiation",
      subtitle: "Drag each type of emission to the statement that describes it.",
      kind: "match",
      pairs: [
        { id: "r1", target: "A helium nucleus, stopped by paper", label: "Alpha (α)" },
        { id: "r2", target: "A fast electron, stopped by aluminium", label: "Beta (β)" },
        { id: "r3", target: "Electromagnetic radiation, needs thick lead", label: "Gamma (γ)" },
        { id: "r4", target: "The time for half of the atoms to decay", label: "Half-life" },
      ],
    },
  },
  chemistry: {
    // States of Matter — sort properties into solid/liquid/gas.
    simulation: {
      title: "Solid, Liquid or Gas?",
      subtitle: "Sort each property into the state of matter it describes.",
      kind: "sort",
      categories: [
        { id: "solid", label: "Solid" },
        { id: "liquid", label: "Liquid" },
        { id: "gas", label: "Gas" },
      ],
      items: [
        { id: "s1", label: "Fixed shape and fixed volume", category: "solid" },
        { id: "s2", label: "Particles vibrate in fixed positions", category: "solid" },
        { id: "s3", label: "Fixed volume, takes the shape of its container", category: "liquid" },
        { id: "s4", label: "Particles slide over each other", category: "liquid" },
        { id: "s5", label: "No fixed shape or volume", category: "gas" },
        { id: "s6", label: "Particles move freely and far apart", category: "gas" },
      ],
    },
    // Atomic Structure — match subatomic particle to property.
    "atom-builder": {
      title: "Build the Atom",
      subtitle: "Drag each subatomic particle or number to its correct description.",
      kind: "match",
      pairs: [
        { id: "a1", target: "Positive, found in the nucleus", label: "Proton" },
        { id: "a2", target: "Neutral, found in the nucleus", label: "Neutron" },
        { id: "a3", target: "Negative, found in shells around the nucleus", label: "Electron" },
        { id: "a4", target: "Protons + neutrons", label: "Mass number" },
        { id: "a5", target: "Number of protons", label: "Atomic number" },
      ],
    },
    // Periodic Table Trends — sort elements as metal or non-metal.
    "interactive-table": {
      title: "Metal or Non-metal?",
      subtitle: "Sort each element into Metal or Non-metal.",
      kind: "sort",
      categories: [
        { id: "metal", label: "Metal" },
        { id: "nonmetal", label: "Non-metal" },
      ],
      items: [
        { id: "e1", label: "Sodium (Na)", category: "metal" },
        { id: "e2", label: "Iron (Fe)", category: "metal" },
        { id: "e3", label: "Potassium (K)", category: "metal" },
        { id: "e4", label: "Oxygen (O)", category: "nonmetal" },
        { id: "e5", label: "Chlorine (Cl)", category: "nonmetal" },
        { id: "e6", label: "Carbon (C)", category: "nonmetal" },
      ],
    },
    // Ionic and Covalent Bonding — sort into ionic or covalent.
    "bond-creator": {
      title: "Ionic or Covalent?",
      subtitle: "Sort each example into Ionic (electron transfer) or Covalent (electron sharing).",
      kind: "sort",
      categories: [
        { id: "ionic", label: "Ionic" },
        { id: "covalent", label: "Covalent" },
      ],
      items: [
        { id: "b1", label: "Sodium chloride (NaCl)", category: "ionic" },
        { id: "b2", label: "Metal bonded to a non-metal", category: "ionic" },
        { id: "b3", label: "Electrons transferred", category: "ionic" },
        { id: "b4", label: "Water (H₂O)", category: "covalent" },
        { id: "b5", label: "Methane (CH₄)", category: "covalent" },
        { id: "b6", label: "Electrons shared", category: "covalent" },
      ],
    },
    // Molar Mass Calculations — match compound to approximate molar mass.
    "calculator-tool": {
      title: "Molar Mass Match",
      subtitle: "Drag each compound to its approximate molar mass.",
      kind: "match",
      pairs: [
        { id: "c1", target: "18 g/mol", label: "H₂O" },
        { id: "c2", target: "44 g/mol", label: "CO₂" },
        { id: "c3", target: "58.5 g/mol", label: "NaCl" },
        { id: "c4", target: "32 g/mol", label: "O₂" },
        { id: "c5", target: "16 g/mol", label: "CH₄" },
      ],
    },
    // pH Scale and Indicators — sort substances as acid/neutral/base.
    "virtual-lab": {
      title: "Acid, Neutral or Base?",
      subtitle: "Sort each substance by its pH classification.",
      kind: "sort",
      categories: [
        { id: "acid", label: "Acid" },
        { id: "neutral", label: "Neutral" },
        { id: "base", label: "Base" },
      ],
      items: [
        { id: "ph1", label: "Lemon juice", category: "acid" },
        { id: "ph2", label: "Vinegar", category: "acid" },
        { id: "ph3", label: "Pure water (pH 7)", category: "neutral" },
        { id: "ph4", label: "Salt water", category: "neutral" },
        { id: "ph5", label: "Soap", category: "base" },
        { id: "ph6", label: "Washing soda", category: "base" },
      ],
    },
    // Neutralization & Salt Formation — order the titration steps.
    "titration-sim": {
      title: "Set Up the Titration",
      subtitle: "Arrange the titration steps in the correct order.",
      kind: "order",
      items: [
        { id: "t1", label: "Rinse the burette with the base solution.", order: 1 },
        { id: "t2", label: "Fill the burette with base and record the initial reading.", order: 2 },
        { id: "t3", label: "Pipette a known volume of acid into the conical flask.", order: 3 },
        { id: "t4", label: "Add a few drops of indicator to the acid.", order: 4 },
        { id: "t5", label: "Add base slowly until the indicator changes colour.", order: 5 },
        { id: "t6", label: "Record the final burette reading.", order: 6 },
      ],
    },
    // Defining Redox — sort as oxidation or reduction.
    "interactive-equation": {
      title: "Oxidation or Reduction?",
      subtitle: "Sort each change into Oxidation or Reduction.",
      kind: "sort",
      categories: [
        { id: "ox", label: "Oxidation" },
        { id: "red", label: "Reduction" },
      ],
      items: [
        { id: "d1", label: "Loss of electrons", category: "ox" },
        { id: "d2", label: "Increase in oxidation state", category: "ox" },
        { id: "d3", label: "Gain of oxygen", category: "ox" },
        { id: "d4", label: "Gain of electrons", category: "red" },
        { id: "d5", label: "Decrease in oxidation state", category: "red" },
        { id: "d6", label: "Loss of oxygen", category: "red" },
      ],
    },
    // Introduction to Hydrocarbons (Alkanes) — match alkane to formula.
    "molecule-builder": {
      title: "Names to Formulae",
      subtitle: "Drag each alkane to its correct molecular formula.",
      kind: "match",
      pairs: [
        { id: "y1", target: "CH₄", label: "Methane (1 carbon)" },
        { id: "y2", target: "C₂H₆", label: "Ethane (2 carbons)" },
        { id: "y3", target: "C₃H₈", label: "Propane (3 carbons)" },
        { id: "y4", target: "C₄H₁₀", label: "Butane (4 carbons)" },
        { id: "y5", target: "CnH₂n₊₂", label: "General alkane formula" },
      ],
    },
  },
};

// Shuffled starting positions
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ord(n) {
  const s = ["1st", "2nd", "3rd"];
  return s[n - 1] || `${n}th`;
}

export default function DragDropLabel({ subjectId, experimentType, lessonId }) {
  // Resolve per lesson: subjects with per-lesson sets match on lessonId first,
  // then English A and Mathematics/Physics/Chemistry use their per-
  // (subject, experimentType) set library, and finally the subject-level set.
  let set;
  if (lessonSets[subjectId] && lessonSets[subjectId][lessonId]) {
    set = lessonSets[subjectId][lessonId];
  } else if (subjectId === "english-a" && englishSets[experimentType]) {
    set = englishSets[experimentType];
  } else if (subjectTypeSets[subjectId] && subjectTypeSets[subjectId][experimentType]) {
    set = subjectTypeSets[subjectId][experimentType];
  } else {
    set = subjectSets[subjectId] || subjectSets["english-a"];
  }

  const [placed, setPlaced] = useState({});
  const [dragging, setDragging] = useState(null);
  const shuffled = useState(() => shuffle(
    set.kind === "diagram" ? set.labels : (set.kind === "match" ? set.pairs : set.items)
  ))[0];
  const [feedback, setFeedback] = useState("");

  function handleDragStart(e, itemId) {
    setDragging(itemId);
    e.dataTransfer.setData("text/plain", itemId);
  }

  function isCorrect(itemId, zoneId) {
    if (set.kind === "diagram") return itemId === zoneId;
    if (set.kind === "order") {
      const item = set.items.find((i) => i.id === itemId);
      return item && Number(item.order) === Number(zoneId);
    }
    if (set.kind === "sort") {
      const item = set.items.find((i) => i.id === itemId);
      return item && item.category === zoneId;
    }
    const pair = set.pairs.find((p) => p.id === itemId);
    return pair && pair.id === zoneId;
  }

  function displayLabel(itemId) {
    if (set.kind === "diagram") return set.labels.find((l) => l.id === itemId)?.label;
    if (set.kind === "order") return set.items.find((i) => i.id === itemId)?.label;
    if (set.kind === "sort") return set.items.find((i) => i.id === itemId)?.label;
    return set.pairs.find((p) => p.id === itemId)?.label;
  }

  function handleDrop(e, zoneId) {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain");
    if (!itemId) return;
    if (isCorrect(itemId, zoneId)) {
      setPlaced((prev) => {
        const next = { ...prev };
        if (set.kind === "sort") {
          const current = next[zoneId] || [];
          if (!current.includes(itemId)) next[zoneId] = [...current, itemId];
        } else {
          next[zoneId] = itemId;
        }
        return next;
      });
      setDragging(null);
      setFeedback(`✅ Correct! "${displayLabel(itemId)}" is right!`);
    } else {
      setFeedback(`❌ Not quite. "${displayLabel(itemId)}" doesn't go there. Try again!`);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleReset() {
    setPlaced({});
    setDragging(null);
    setFeedback("");
  }

  const totalItems = set.kind === "sort"
    ? set.items.length
    : set.kind === "diagram"
      ? set.labels.length
      : set.kind === "order" ? set.items.length : set.pairs.length;
  const placedCount = set.kind === "sort"
    ? Object.values(placed).reduce((s, arr) => s + arr.length, 0)
    : Object.keys(placed).length;
  const allPlaced = placedCount === totalItems;

  // ---- Render ------------------------------------------------------------
  const header = (
    <div className="dd-header">
      <h4>{set.title}</h4>
      <p>{set.subtitle}</p>
    </div>
  );

  const feedbackEl = feedback && (
    <div className={`dd-feedback ${feedback.startsWith("✅") ? "correct" : "incorrect"}`}>{feedback}</div>
  );

  const actionsEl = (
    <div className="dd-actions">
      <button className="quiz-btn quiz-btn-ghost" onClick={handleReset}>🔄 Reset</button>
      {allPlaced && <span className="dd-success">🎉 Great job! {placedCount}/{totalItems} {set.kind === "order" ? "in order" : "matched"}!</span>}
    </div>
  );

  // Biology diagram (SVG) layout
  if (set.kind === "diagram") {
    return (
      <div className="drag-drop">
        {header}
        <div className="dd-main">
          <div className="dd-diagram">
            <svg viewBox="0 0 100 100" className="dd-svg">
              <ellipse cx="50" cy="50" rx="45" ry="42" fill="#f0fdf4" stroke="#22c55e" strokeWidth="1.5" />
              <circle cx="48" cy="42" r="12" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.2" />
              <circle cx="48" cy="42" r="5" fill="#93c5fd" />
              <ellipse cx="32" cy="58" rx="10" ry="6" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" />
              <circle cx="60" cy="32" r="3" fill="#fce7f3" stroke="#ec4899" strokeWidth="0.8" />
              <circle cx="65" cy="35" r="3" fill="#fce7f3" stroke="#ec4899" strokeWidth="0.8" />
              {set.targetZones.map((z) => (
                <rect
                  key={z.id}
                  x={z.x} y={z.y} width={z.w} height={z.h}
                  fill={placed[z.id] ? "rgba(34,197,94,0.15)" : "rgba(37,99,235,0.08)"}
                  stroke={placed[z.id] ? "#22c55e" : "#93c5fd"}
                  strokeWidth="0.8"
                  strokeDasharray={placed[z.id] ? "none" : "3,2"}
                  rx="3"
                  onDrop={(e) => handleDrop(e, z.id)}
                  onDragOver={handleDragOver}
                  style={{ cursor: "pointer" }}
                />
              ))}
              {set.targetZones.map((z) => (
                <text
                  key={`label-${z.id}`}
                  x={z.x + z.w / 2} y={z.y + z.h / 2 + 1}
                  textAnchor="middle"
                  fontSize="3"
                  fill={placed[z.id] ? "#16a34a" : "#6b7280"}
                  fontWeight="bold"
                >
                  {placed[z.id] ? displayLabel(z.id) : "?"}
                </text>
              ))}
            </svg>
          </div>
          <div className="dd-labels">
            <h4>Labels</h4>
            {shuffled.map((l) => {
              if (placed[l.id]) return null;
              return (
                <div
                  key={l.id}
                  className="dd-label"
                  draggable
                  onDragStart={(e) => handleDragStart(e, l.id)}
                  style={{ opacity: dragging === l.id ? 0.5 : 1 }}
                >
                  {l.label}
                </div>
              );
            })}
            {allPlaced && <p className="dd-done">✅ All placed!</p>}
          </div>
        </div>
        {feedbackEl}
        {actionsEl}
      </div>
    );
  }

  // List-style match / sort / order layout
  let zones;
  if (set.kind === "sort") {
    zones = set.categories;
  } else if (set.kind === "order") {
    zones = set.items.map((it) => ({ id: String(it.order), label: `${ord(it.order)} position` }));
  } else {
    zones = set.pairs.map((p) => ({ id: p.id, label: p.target }));
  }


  return (
    <div className="drag-drop">
      {header}
      <div className="dd-main dd-main-list">
        <div className="dd-labels">
          <h4>{set.kind === "order" ? "Drag items in order" : "Drag items"}</h4>
          {shuffled.map((item) => {
            const itemId = item.id;
            const isPlaced = set.kind === "sort"
              ? (placed[item.category] || []).includes(itemId)
              : Object.values(placed).includes(itemId);
            if (isPlaced) return null;
            return (
              <div
                key={itemId}
                className="dd-label"
                draggable
                onDragStart={(e) => handleDragStart(e, itemId)}
                style={{ opacity: dragging === itemId ? 0.5 : 1 }}
              >
                {item.label}
              </div>
            );
          })}
          {allPlaced && <p className="dd-done">✅ All placed!</p>}
        </div>
        <div className="dd-zones">
          <h4>Drop zones</h4>
          {zones.map((z) => {
            const placedHere = set.kind === "sort"
              ? (placed[z.id] || []).map(displayLabel)
              : placed[z.id] ? [displayLabel(placed[z.id])] : [];
            return (
              <div
                key={z.id}
                className={`dd-zone ${placedHere.length ? "filled" : ""}`}
                onDrop={(e) => handleDrop(e, z.id)}
                onDragOver={handleDragOver}
              >
                <span className="dd-zone-label">{z.label}</span>
                <span className="dd-zone-value">
                  {placedHere.length ? placedHere.join(", ") : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {feedbackEl}
      {actionsEl}
    </div>
  );
}
