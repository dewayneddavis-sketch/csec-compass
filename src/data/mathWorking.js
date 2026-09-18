// Worked solutions for the Mathematics labs (Play tab).
//
// Premier-school feedback (2026-09-17): when a student answers a lab question
// WRONG the lab must reveal the correct answer plus the STEP-BY-STEP maths, so
// the mistake becomes the lesson. The assessment tabs (Knowledge Check, Extra
// Practice, Mock Exam) deliberately do the opposite — they grade silently.
//
// This file is the content half: `mathLabWorkings` holds the numbered steps for
// every answer in the Mathematics lab sets (keyed by the lab experiment type and
// the item id used in src/components/DragDropLabel.jsx). The correct ANSWER
// itself is read from the lab set, so there is only one source of truth for it;
// `tools/check-math-working.mjs` verifies every item has steps and that the last
// step actually states that item's answer.
//
// `solveBalanceMethod` is the other half: the balance-scale lab builds an
// equation from whatever the student drops on the pans, so its working is
// computed from their own setup rather than stored.

export const mathLabWorkings = {
  // ---- Operations on Real Numbers (BODMAS) --------------------------------
  "interactive-quiz": {
    r1: ["BODMAS: work the multiplication before the addition", "2 × 5 = 10", "6 + 10 = 16"],
    r2: ["BODMAS: multiplication first", "4 × 1 = 4", "3 + 4 = 7"],
    r3: ["BODMAS: do the multiplication first", "3 × 3 = 9", "2 + 9 + 2 = 13"],
    r4: ["BODMAS: multiplication first", "2 × 4 = 8", "10 − 8 = 2", "2 − 1 = 1"],
    r5: ["BODMAS: brackets first", "2 + 5 = 7", "7 × 3 = 21"],
  },
  // ---- Fractions, Decimals & Percentages ----------------------------------
  "visual-converter": {
    f1: ["A fraction is top ÷ bottom", "1 ÷ 2 = 0.5", "To a percentage: 0.5 × 100 = 50%"],
    f2: ["1 ÷ 4 = 0.25", "0.25 × 100 = 25%"],
    f3: ["3 ÷ 4 = 0.75", "0.75 × 100 = 75%"],
    f4: ["1 ÷ 5 = 0.2", "0.2 × 100 = 20%"],
    f5: ["1 ÷ 10 = 0.1", "0.1 × 100 = 10%"],
  },
  // ---- Introduction to Functions (f(x) = 2x + 1) --------------------------
  "function-machine": {
    fx1: ["Substitute x = 0 into f(x) = 2x + 1", "2 × 0 + 1 = 0 + 1", "f(0) = 1"],
    fx2: ["Substitute x = 1", "2 × 1 + 1 = 2 + 1", "f(1) = 3"],
    fx3: ["Substitute x = 2", "2 × 2 + 1 = 4 + 1", "f(2) = 5"],
    fx4: ["Substitute x = 3", "2 × 3 + 1 = 6 + 1", "f(3) = 7"],
    fx5: ["Substitute x = 4", "2 × 4 + 1 = 8 + 1", "f(4) = 9"],
  },
  // ---- Pythagoras' Theorem ------------------------------------------------
  "interactive-triangle": {
    p1: ["Pythagoras: c² = a² + b² (c is the hypotenuse)", "c² = 3² + 4² = 9 + 16 = 25", "c = √25 = 5"],
    p2: ["c² = 6² + 8² = 36 + 64 = 100", "c = √100 = 10"],
    p3: ["c² = 5² + 12² = 25 + 144 = 169", "c = √169 = 13"],
    p4: ["c² = 9² + 12² = 81 + 144 = 225", "c = √225 = 15"],
    p5: ["c² = 8² + 15² = 64 + 225 = 289", "c = √289 = 17"],
  },
  // ---- Trig Ratios (SOH CAH TOA) ------------------------------------------
  "trig-circle": {
    t1: ["SOH: Sin = Opposite ÷ Hypotenuse", "For angle θ the ratio is opposite ÷ hypotenuse"],
    t2: ["CAH: Cos = Adjacent ÷ Hypotenuse", "For angle θ the ratio is adjacent ÷ hypotenuse"],
    t3: ["TOA: Tan = Opposite ÷ Adjacent", "For angle θ the ratio is opposite ÷ adjacent"],
    t4: ["SOH is the memory aid: Sin = Opposite ÷ Hypotenuse", "So SOH means sin θ = opposite/hypotenuse"],
    t5: ["CAH is the memory aid: Cos = Adjacent ÷ Hypotenuse", "So CAH means cos θ = adjacent/hypotenuse"],
    t6: ["TOA is the memory aid: Tan = Opposite ÷ Adjacent", "So TOA means tan θ = opposite/adjacent"],
  },
  // ---- Introduction to Vectors (scalar or vector) -------------------------
  "vector-addition": {
    sp1: ["Ask: is a direction given?", "Speed is 6 m/s — magnitude only", "Magnitude with no direction means Scalar"],
    sp2: ["40 m is a distance with no direction stated", "Magnitude only, so Scalar"],
    sp3: ["Mass is measured in kg and has no direction", "Magnitude only, so Scalar"],
    sp4: ["Time (3 s) is a single magnitude with no direction", "So it is Scalar"],
    vt1: ["Velocity is speed WITH a direction", "6 m/s north gives both magnitude and direction", "So it is a Vector"],
    vt2: ["Displacement is distance in a stated direction", "'40 m east' names the direction", "So it is a Vector"],
    vt3: ["Force has a magnitude of 10 N and a direction ('down')", "So it is a Vector"],
  },
  // ---- Matrices & Determinants -------------------------------------------
  "matrix-transformer": {
    m2: ["A matrix's order is written rows × columns", "2 × 2 means 2 rows, 2 columns"],
    m3: ["Order = rows × columns", "3 × 1 means 3 rows, 1 column"],
    m4: ["Order = rows × columns", "2 × 3 means 2 rows, 3 columns"],
    m5: ["Order = rows × columns", "1 × 4 means 1 row, 4 columns"],
  },
  // ---- Measures of Central Tendency ({2, 4, 4, 6, 10}) --------------------
  "data-visualizer": {
    d1: ["Mean = sum of values ÷ number of values", "Sum = 2 + 4 + 4 + 6 + 10 = 26", "Mean = 26 ÷ 5 = 5.2"],
    d2: ["Put the values in order: 2, 4, 4, 6, 10", "The middle (3rd of 5) value is the median", "Median = 4"],
    d3: ["Mode = the value that appears most often", "4 appears twice; 2, 6 and 10 appear once", "Mode = 4"],
    d4: ["Range = highest − lowest", "10 − 2 = 8", "Range = 8"],
    d5: ["Count the data set: 2, 4, 4, 6, 10", "There are 5 values"],
    d6: ["Add the values step by step", "2 + 4 = 6, then 6 + 4 = 10, then 10 + 6 = 16", "16 + 10 = 26"],
  },
  // ---- Basic Probability -------------------------------------------------
  "probability-sim": {
    pr1: ["P(event) = favourable outcomes ÷ total outcomes", "One coin has 2 outcomes: heads or tails", "P(heads) = 1/2"],
    pr2: ["A fair die has 6 equally likely outcomes", "Only one of them is a 6", "P(rolling a 6) = 1/6"],
    pr3: ["Even numbers on a die: 2, 4, 6 → 3 outcomes", "Out of 6 outcomes in total", "P(even) = 3/6"],
    pr4: ["Odd numbers on a die: 1, 3, 5 → 3 outcomes", "Out of 6 outcomes in total", "P(odd) = 3/6"],
    pr5: ["A die shows 1 to 6, and every one of those is less than 7", "All 6 outcomes are favourable", "P(less than 7) = 1, a certainty"],
  },
};

// Worked steps for one lab item, or null when the lab set has none.
export function getLabWorking(subjectId, experimentType, itemId) {
  if (subjectId !== "mathematics" || !experimentType || !itemId) return null;
  const steps = mathLabWorkings[experimentType]?.[itemId];
  return Array.isArray(steps) && steps.length > 0 ? steps : null;
}

// ---------------------------------------------------------------------------
// Balance-scale lab — the working is computed from the student's own pans.
// ---------------------------------------------------------------------------

function countX(side) {
  return (side || []).filter((i) => i === "x").length;
}
function sumNumbers(side) {
  return (side || []).reduce((s, i) => s + (i === "x" ? 0 : Number(i)), 0);
}

// "2x + 3", "3", "2x", "0" — how a pan reads as an algebraic expression.
export function sideText(side) {
  const xs = countX(side);
  const n = sumNumbers(side);
  const parts = [];
  if (xs > 0) parts.push(xs === 1 ? "x" : `${xs}x`);
  if (n !== 0 || xs === 0) parts.push(String(n));
  return parts.join(" + ").replace(/\+ -/, "− ");
}

function fmt(n) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

// Step-by-step method for the equation the student has built on the pans.
// Returns { balanced, answer, steps } — pure, so it is unit-testable.
export function solveBalanceMethod(leftSide, rightSide) {
  const leftX = countX(leftSide);
  const rightX = countX(rightSide);
  const leftN = sumNumbers(leftSide);
  const rightN = sumNumbers(rightSide);
  const netX = leftX - rightX;
  const netN = rightN - leftN; // numbers still to be moved across
  const left = sideText(leftSide);
  const right = sideText(rightSide);
  const equation = `${left} = ${right}`;

  if (netX === 0 && netN === 0) {
    return {
      balanced: true,
      answer: null,
      steps: [
        `Read the scale: ${equation}`,
        "Both pans hold the same number of x-terms and the same total",
        "The two sides are equal, so the scale balances for every value of x",
      ],
    };
  }

  if (netX === 0) {
    return {
      balanced: false,
      answer: null,
      steps: [
        `Read the scale: ${equation}`,
        "The x-terms cancel (each side has the same number of x)",
        `Left total = ${leftN}, right total = ${rightN} — the numbers do not match`,
        "No value of x can fix unequal totals: move a number weight across to balance it",
      ],
    };
  }

  // netX x = netN, normalised so the coefficient is positive.
  let coef = netX;
  let value = netN;
  const steps = [`Read the scale: ${equation}`];

  if (coef < 0) {
    coef = -coef;
    value = -value;
    steps.push(`Collect the x-terms on the left and flip the signs: ${coef}x = ${fmt(value)}`);
  } else if (rightX > 0) {
    steps.push(`Move the x-terms together: ${coef}x = ${fmt(value)} (take ${rightX}x from both sides)`);
  } else if (leftN !== 0) {
    steps.push(
      `Move the numbers across: subtract ${leftN} from both sides → ${coef}x = ${rightN} − ${leftN} = ${fmt(value)}`
    );
  } else {
    steps.push(`The x-terms are already alone: ${coef}x = ${fmt(value)}`);
  }

  if (coef === 1) {
    steps.push(`Read off the answer: x = ${fmt(value)}`);
  } else {
    steps.push(`Divide both sides by ${coef}: x = ${fmt(value)} ÷ ${coef}`);
    steps.push(`x = ${fmt(value / coef)}`);
  }

  const x = value / coef;
  const checkLeft = leftX * x + leftN;
  const checkRight = rightX * x + rightN;
  if (checkLeft === checkRight) {
    steps.push(
      `Check with x = ${fmt(x)}: left pan = ${fmt(checkLeft)}, right pan = ${fmt(checkRight)} — both pans balance ✓`
    );
  }

  return { balanced: true, answer: x, steps };
}
