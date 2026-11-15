// Worked solutions for the Mathematics PER-LESSON lab sets (Play tab).
//
// The defect this file exists for (measured 2026-11-08 on main b325760):
// `getLabWorking()` in src/data/mathWorking.js keyed its working by ACTIVITY
// TYPE, and `mathLabWorkings` only carries the nine `MATH_DRAG_TYPES`. The 32
// Mathematics lessons that own a per-lesson set in `lessonSets.mathematics` are
// all `matching-game` / `classifier-sim` (17 + 7) or `interactive-quiz` (8) with
// item ids reused across lessons (p1…p6), so the type lookup returned null,
// `reveal` was null, and a wrong drop showed "❌ Not quite" with no correct
// answer and no working. 8 of the 32 sit on `interactive-quiz`, a type that IS
// keyed, and failed only because their item ids do not line up with r1…r5 —
// which is exactly why the resolver must never fall through to the type table
// for a lesson that owns its own set.
//
// KEY SHAPE — lesson first, then item:
//
//     mathLessonWorkings[lessonId][itemId] = ["step 1", "step 2", …]
//
//   * `lessonId` is a lesson id from content/mathematics/modules.json, and it
//     MUST be a lesson that owns a set in `lessonSets.mathematics`. A lesson
//     without its own set keeps resolving through the type table
//     (`mathLabWorkings`), which is untouched by this file.
//   * `itemId` is the id of the item inside THAT lesson's own set (`pairs[].id`
//     for kind "match", `items[].id` for kind "sort"). Ids are only unique
//     within a set, which is the whole reason the type table could not express
//     this.
//   * The correct ANSWER is never stored here — it is read from the lab set
//     itself, so there is exactly one source of truth for it. Each array's LAST
//     step must state that item's answer.
//
// STAGE 1 (PR #223) shipped the file EMPTY and the lookup wired. The 32 lesson
// ids that already owned a set are listed in `PENDING` inside
// tools/check-math-working.mjs, and that harness asserts
// `PENDING ∪ authored === every live per-lesson set` exactly, so a lesson can
// neither silently escape the backfill nor have its key silently vanish. The
// backfill then empties lessons out of PENDING one module-owned slice at a time
// (consumer-arithmetic · sets · number-theory-computation · measurement ·
// algebra + relations · geometry + statistics = 181 items, ≈540 steps).
//
// SLICE 3 (2026-11-08) authored the first four: the four NEW Statistics lessons
// this slice adds — mat-stat-data-types-and-sampling, mat-stat-statistical-
// diagrams, mat-stat-standard-deviation and mat-stat-statistical-inference.
// They are authored here rather than deferred because a new per-lesson set is
// LIVE the moment lessonSets.js carries it, and A2 would fail the moment it was
// in neither list. 4 sets / 24 items, 3 steps each. The 32 pre-existing sets
// stayed in PENDING at that point and are backfilled slice by slice.
//
// BACKFILL SLICE A (2026-11-08) — the `consumer-arithmetic` module, first of the
// six module-owned backfill slices: 6 sets / 35 items, 3 steps each.
//   profit-loss-and-discounts (5) · simple-and-compound-interest (6, sort) ·
//   hire-purchase-and-instalments (5) · taxes-and-utility-bills (6, sort) ·
//   exchange-rates-and-currency (5) · insurance-and-budgeting (8, sort).
// Those six lesson ids left `PENDING` in tools/check-math-working.mjs in the
// same PR (A3), taking PENDING 32 → 26 and authored sets 4 → 10. Every step is
// grounded in that lesson's own copy in content/mathematics/modules.json — the
// formulas, the worked figures and the units are the lesson's, not invented —
// and every answer was re-derived independently (the table in the PR body),
// because the harness proves structure and the answer, never the mathematics.
//
// BACKFILL SLICE B (2026-11-09) — the `sets` module, second of the six
// module-owned slices: 6 sets / 31 items, 3 steps each.
//   set-notation (5) · subsets-and-cardinality (6, sort) · venn-diagrams (5) ·
//   union-intersection-complement (5) · shading-venn-regions (5) ·
//   set-word-problems (5).
// Those six lesson ids left `PENDING` in tools/check-math-working.mjs in the
// same PR (A3), taking PENDING 26 → 20 and authored sets 10 → 16. Every step is
// grounded in that lesson's own copy — venn-diagrams uses the lesson's filling
// order and its own survey (40 · 25 cricket · 18 football · both 10 → 15 / 8 /
// 7, check 15 + 10 + 8 + 7 = 40), which is exactly what the lesson's shipped
// figure draws, so the working and the picture cannot drift apart.
//
// WHAT THE HARNESS PROVES, HONESTLY: structure and the answer — that every
// authored key is a real lesson and a real item, that the last step states that
// item's answer, that per-lesson working beats type-level working, and that the
// answer is revealed for all 205 items whether or not any working exists yet.
// It does NOT prove the mathematics is correct, and it does NOT check these step
// strings against the lesson copy (the corpus rule in
// tools/check-mathematics-labs.mjs covers a set's labels and targets, never its
// workings). Correctness of each step is a review obligation carried by every
// backfill PR, together with an independently re-derived arithmetic table.

export const mathLessonWorkings = {
  // ---------------------------------------------------------------------
  // BACKFILL SLICE A — consumer-arithmetic (6 sets / 35 items)
  // ---------------------------------------------------------------------
  "profit-loss-and-discounts": {
    p1: [
        "Profit = selling price − cost price, so profit = $3,000 − $2,500 = $500",
        "Percentage profit = (profit ÷ cost price) × 100, so $500 ÷ $2,500 = 0.2",
        "0.2 × 100 = 20, so this story matches: 20% profit",
    ],
    p2: [
        "The selling price is smaller than the cost price, so the difference is a loss",
        "Loss = $2,500 − $2,000 = $500",
        "Percentage loss = (loss ÷ cost price) × 100 = $500 ÷ $2,500 × 100 = 20, so this story matches: 20% loss",
    ],
    p3: [
        "A discount is a percentage of the MARKED price, never the cost price, so the discount is 0.25 × $40,000 = $10,000",
        "Sale price = marked price − discount = $40,000 − $10,000 = $30,000",
        "Check: the customer pays 75% of the marked price, and 0.75 × $40,000 = $30,000, so this story matches: $30,000",
    ],
    p4: [
        "The first 20% comes off the marked price: $1,000 × 0.8 = $800",
        "The second 10% comes off the NEW price, not the original: $800 × 0.9 = $720",
        "Successive discounts are multiplied, not added: 0.8 × 0.9 = 0.72 and $1,000 × 0.72 = $720, so this story matches: $720",
    ],
    p5: [
        "The cost price is the unknown 100%, and the selling price is 115% of it",
        "$4,600 ÷ 1.15 = $4,000",
        "Check: 15% of $4,000 is $600 and $4,000 + $600 = $4,600, so this story matches: Cost price $4,000",
    ],
  },
  "simple-and-compound-interest": {
    i1: [
        "I = PRT ÷ 100 is the simple-interest formula, and it is written I = (P × R × T) ÷ 100",
        "P is the principal, R the yearly rate and T the time in years, and the principal never changes",
        "Interest is paid on the principal only, so this statement belongs under: Simple interest",
    ],
    i2: [
        "A = P(1 + r/100)^n is the compound-interest formula",
        "P is the principal, r the yearly rate and n the number of years, and the bracket grows the amount each year",
        "The interest earns interest, so this statement belongs under: Compound interest",
    ],
    i3: [
        "Substitute into I = (P × R × T) ÷ 100: I = (10,000 × 8 × 3) ÷ 100",
        "10,000 × 8 × 3 = 240,000 and 240,000 ÷ 100 = $2,400, which is $800 a year on the principal",
        "The interest is paid on the original sum only, so this statement belongs under: Simple interest",
    ],
    i4: [
        "Substitute into A = P(1 + R/100)^n: A = 10,000 × 1.08^3",
        "1.08^3 = 1.259712 and 10,000 × 1.259712 = $12,597.12",
        "The amount grows on the running total, so this statement belongs under: Compound interest",
    ],
    i5: [
        "The original sum is the principal, and here only the principal earns interest",
        "That is I = (P × R × T) ÷ 100 with the same P in every year",
        "So this statement belongs under: Simple interest",
    ],
    i6: [
        "Interest added to the account joins the principal for the next year",
        "That is compounding, A = P(1 + R/100)^n, where the running amount grows",
        "So this statement belongs under: Compound interest",
    ],
  },
  "hire-purchase-and-instalments": {
    p1: [
        "A deposit is usually a percentage of the cash price, so deposit = rate × cash price",
        "Deposit = 0.20 × $48,000 = $9,600",
        "So this part of the agreement matches: $9,600 deposit",
    ],
    p2: [
        "The instalments are the monthly instalment multiplied by the number of instalments",
        "12 × $3,600 = $43,200",
        "So this part of the agreement matches: $43,200",
    ],
    p3: [
        "Total hire purchase price = deposit + (instalment × number of instalments)",
        "Deposit $9,600 + 12 × $3,600 = $9,600 + $43,200 = $52,800",
        "So this part of the agreement matches: $52,800 total",
    ],
    p4: [
        "Hire purchase costs more than the cash price because the buyer is paying for credit",
        "Extra cost = total hire purchase price − cash price = $52,800 − $48,000 = $4,800",
        "So this part of the agreement matches: $4,800 extra",
    ],
    p5: [
        "Extra cost as a percentage = (extra cost ÷ cash price) × 100",
        "$4,800 ÷ $48,000 = 0.1",
        "0.1 × 100 = 10, so this part of the agreement matches: 10%",
    ],
  },
  "taxes-and-utility-bills": {
    i1: [
        "Chargeable income = gross pay − allowances, and income tax is charged on it in bands",
        "A lower percentage applies up to the stated threshold and a higher percentage to the amount above it",
        "So this line belongs under: Income tax",
    ],
    i2: [
        "GCT is the consumption tax added to the price of goods",
        "At 15% an item priced at $5,000 costs $5,000 × 1.15 = $5,750, of which $750 is tax",
        "So this line belongs under: GCT",
    ],
    i3: [
        "An electricity bill is the number of kilowatt-hours used multiplied by the rate",
        "The units used are the present meter reading minus the previous one, then units × rate",
        "So this line belongs under: Usage charge",
    ],
    i4: [
        "A fixed charge is the same on every bill, whatever the meter reading",
        "It is added to the usage cost and any tax to give the bill total",
        "So this line belongs under: Fixed charge",
    ],
    i5: [
        "Gross pay minus allowances gives chargeable income",
        "Chargeable income is the base the income tax bands are applied to",
        "So this line belongs under: Income tax",
    ],
    i6: [
        "Tax-inclusive price = pre-tax price × (1 + tax rate), which is × 1.15 at 15%",
        "To reverse it, divide by 1.15: $8,050 ÷ 1.15 = $7,000 before tax",
        "So this line belongs under: GCT",
    ],
  },
  "exchange-rates-and-currency": {
    p1: [
        "To change local currency into foreign currency, divide by the exchange rate",
        "J$50,000 ÷ 155.60 = 321.3367…, and money is rounded to two decimal places",
        "So this request matches: US$321.34",
    ],
    p2: [
        "To change foreign currency into local currency, multiply by the exchange rate",
        "US$250 × 155.60 = 38,900",
        "So this request matches: J$38,900",
    ],
    p3: [
        "A bank publishes two rates: a buying rate and a selling rate",
        "The selling rate is the rate the bank charges you for foreign cash, and it is the higher of the two",
        "So this request matches: Selling rate",
    ],
    p4: [
        "The buying rate is the rate the bank pays you for your foreign cash",
        "It is the lower of the two rates, because the bank buys from you and sells to the next customer",
        "So this request matches: Buying rate",
    ],
    p5: [
        "Commission reduces the amount received, so multiply by (1 − commission rate)",
        "1 − 0.015 = 0.985 and US$321.34 × 0.985 = 316.5199",
        "Rounded to two decimal places, so this request matches: US$316.52",
    ],
  },
  "insurance-and-budgeting": {
    i1: [
        "A fixed expense stays the same every month, so the budget can rely on it",
        "Rent is paid on the first of every month and does not change with how much is used",
        "So this payment belongs under: Fixed expense",
    ],
    i2: [
        "A loan repayment is the same amount every month for the agreed term",
        "It does not move with usage, so it is planned in advance",
        "So this payment belongs under: Fixed expense",
    ],
    i3: [
        "A variable expense changes from month to month with how much is used",
        "The electricity bill moves with the number of kilowatt-hours used",
        "So this payment belongs under: Variable expense",
    ],
    i4: [
        "Food and bus fare are bought as they are needed, so the amount changes",
        "They are variable expenses: estimated in the budget, never fixed",
        "So this payment belongs under: Variable expense",
    ],
    i5: [
        "The premium is what the policyholder pays, usually each year, to keep the cover",
        "It is part of the insurance contract, not a household usage bill",
        "So this line belongs under: Insurance term",
    ],
    i6: [
        "The excess is the first part of any loss the policyholder must pay",
        "On a theft of $150,000 with a $20,000 excess the insurer pays $150,000 − $20,000 = $130,000",
        "So this line belongs under: Insurance term",
    ],
    i7: [
        "The sum insured is the most the insurer will pay on a claim",
        "A claim larger than the sum insured is limited to the sum insured, however great the loss",
        "So this line belongs under: Insurance term",
    ],
    i8: [
        "A school fee instalment is the same amount each term and is planned in advance",
        "It does not change with how much the household uses",
        "So this payment belongs under: Fixed expense",
    ],
  },
  // ---------------------------------------------------------------------
  // BACKFILL SLICE B — sets (6 sets / 31 items)
  // Grounded in each lesson's own copy in content/mathematics/modules.json:
  //   set-notation uses the lesson's n(A) = 4 for {2, 4, 6, 8}, its ∈ / ∉
  //   reading, its set-builder example {x : x is even and 0 < x < 10} and its
  //   ∅ vs {0} contrast; venn-diagrams uses the lesson's filling ORDER and its
  //   own survey numbers (40 · C 25 · F 18 · both 10 → 15 / 8 / 7, check
  //   15 + 10 + 8 + 7 = 40), which are also the numbers the shipped figure
  //   draws; union-intersection-complement uses the lesson's worked example
  //   ξ = {1…8}, A = {1…5}, B = {4, 5, 6, 7}; set-word-problems applies the
  //   lesson's two-club method to its own lab survey (40 · D 24 · C 20 ·
  //   both 7). subsets-and-cardinality and shading-venn-regions are `sort`
  //   sets, so their last step states the CATEGORY LABEL the item sorts into.
  // ---------------------------------------------------------------------
  "set-notation": {
    p1: [
        "n(A) means the number of elements in the set A, so count the items written inside the braces and ignore the commas",
        "The set {2, 4, 6, 8} lists the elements 2, 4, 6 and 8, and an element repeated would still be counted once",
        "Counting them gives 1, 2, 3, 4, so n({2, 4, 6, 8}) = 4",
    ],
    p2: [
        "The symbol ∈ means 'is an element of', so the question is whether 3 is written inside the braces",
        "The set {1, 3, 5} lists the elements 1, 3 and 5, and 3 is one of them",
        "So the statement 3 ∈ {1, 3, 5} is True",
    ],
    p3: [
        "The symbol ∈ means 'is an element of', so the question is whether 4 is written inside the braces",
        "The set {1, 3, 5} lists the elements 1, 3 and 5, and 4 is not among them, so the membership fails",
        "So the statement 4 ∈ {1, 3, 5} is False",
    ],
    p4: [
        "Set-builder notation gives the rule instead of the list: x must be even, and 0 < x < 10 means x is greater than 0 and less than 10",
        "The even numbers between 0 and 10 are 2, 4, 6 and 8, and 0 and 10 are excluded because both inequalities are strict",
        "Written in roster form, which lists the elements in braces, the set is {2, 4, 6, 8}",
    ],
    p5: [
        "The empty set is the set with no elements at all, and it is written ∅ or { }",
        "It is not the same as {0}, because {0} is a set with one element in it, the number 0",
        "So a set with no elements is ∅",
    ],
  },
  "subsets-and-cardinality": {
    i1: [
        "A ⊆ B means every element of A is also an element of B, and the empty set ∅ is a subset of every set",
        "Every set is a subset of itself as well, so {1, 2, 3} ⊆ {1, 2, 3}",
        "Both parts of the statement are about the subset relation, so it belongs under: Subsets",
    ],
    i2: [
        "The statement gives the meaning of the symbol ⊆, which is read as 'is a subset of'",
        "If A ⊆ B then every element of A is also an element of B, and when A has fewer elements than B it is a proper subset, A ⊂ B",
        "So this definition belongs under: Subsets",
    ],
    i3: [
        "The symbol ξ names the universal set, the set that contains every element being discussed in the problem",
        "The complement A' is everything in ξ that is not in A, so choosing a different ξ changes what A' contains",
        "So the statement is about the universal set and belongs under: Complement and universal set",
    ],
    i4: [
        "The dash in A' marks the complement, and the complement is defined as A' = {x : x ∈ ξ, x ∉ A}",
        "So A' holds every element of ξ that is not in A: with ξ = {1, 2, 3, 4, 5} and A = {2, 4}, A' = {1, 3, 5}",
        "That is the complement taken inside the universal set, so it belongs under: Complement and universal set",
    ],
    i5: [
        "A set with n elements has 2^n subsets in total, and here n = 3",
        "2^3 = 2 × 2 × 2 = 8, so a set with 3 elements has 8 subsets, of which 2^3 − 1 = 7 are proper subsets",
        "The statement is a count of the subsets, so it belongs under: Counting elements",
    ],
    i6: [
        "n(A) means the number of elements of A, which is its cardinal number",
        "A = {2, 4, 6, 8} lists 2, 4, 6 and 8, so counting them gives n(A) = 4",
        "This is counting the elements of a set, so it belongs under: Counting elements",
    ],
  },
  "venn-diagrams": {
    p1: [
        "The overlap of the two circles holds the students who play both games, and the survey says 10 play both",
        "n(C) = 25 and n(F) = 18, and both of those totals include these 10 students, so the overlap is written first",
        "So the number who play both cricket and football is 10",
    ],
    p2: [
        "Cricket only is the part of the C circle outside the overlap, so it is n(C) minus the overlap",
        "25 − 10 = 15",
        "So 15 students play cricket only",
    ],
    p3: [
        "Football only is the part of the F circle outside the overlap, so it is n(F) minus the overlap",
        "18 − 10 = 8",
        "So 8 students play football only",
    ],
    p4: [
        "The three regions inside the circles are 15, 10 and 8, and they add to 15 + 10 + 8 = 33",
        "The neither region is what is left of the 40 students surveyed: 40 − 33 = 7",
        "So 7 students play neither game, written inside the rectangle but outside both circles",
    ],
    p5: [
        "n(ξ) is the total number of students surveyed, and the four regions must add up to it",
        "Check the diagram: 15 + 10 + 8 + 7 = 40",
        "So the total number of students surveyed is 40, which is n(ξ)",
    ],
  },
  "union-intersection-complement": {
    p1: [
        "The union A ∪ B holds everything in A or in B or in both, so take every element of ξ that appears in at least one of the two sets",
        "A = {1, 2, 3, 4, 5} and B = {4, 5, 6, 7}, and 4 and 5 are in both sets so each is written once",
        "So A ∪ B = {1, 2, 3, 4, 5, 6, 7}",
    ],
    p2: [
        "The intersection A ∩ B holds only the elements that are in A and in B, so look for the elements common to both lists",
        "A = {1, 2, 3, 4, 5} and B = {4, 5, 6, 7}, and the common elements are 4 and 5",
        "So A ∩ B = {4, 5}",
    ],
    p3: [
        "The complement A' holds the elements of the universal set ξ that are not in A",
        "ξ = {1, 2, 3, 4, 5, 6, 7, 8} and A = {1, 2, 3, 4, 5}, so 1, 2, 3, 4 and 5 are removed from ξ",
        "So A' = {6, 7, 8}",
    ],
    p4: [
        "The set difference A − B, also written A ∩ B', holds the elements of A that are not in B",
        "A = {1, 2, 3, 4, 5} and B = {4, 5, 6, 7}, so 4 and 5 are removed from A, and 6 and 7 were never in A",
        "So A − B = {1, 2, 3}",
    ],
    p5: [
        "The set difference B − A, also written B ∩ A', holds the elements of B that are not in A",
        "B = {4, 5, 6, 7} and A = {1, 2, 3, 4, 5}, so 4 and 5 are removed from B and 6 and 7 stay",
        "So B − A = {6, 7}",
    ],
  },
  "shading-venn-regions": {
    p1: [
        "Read the notation one symbol at a time: B' is everything outside B, and ∩ means 'and', so A ∩ B' needs an element in A and not in B",
        "On the diagram that is the part of the A circle that does not overlap the B circle",
        "Translate the notation into words: In A but not in B",
    ],
    p2: [
        "The bracket is worked first: A ∪ B is everything inside the two circles",
        "The dash then takes the complement of that union, so the region is everything in ξ outside both circles",
        "Translate the notation into words: In neither A nor B",
    ],
    p3: [
        "Each ∩ means 'and', so A ∩ B ∩ C needs an element that is in A and in B and in C",
        "In a three-set diagram that is the middle region where all three circles overlap, one of the eight regions",
        "Translate the notation into words: In all three sets",
    ],
    p4: [
        "A ∩ B holds the elements in both A and B, and joining C' adds the condition 'and not in C'",
        "So take the overlap of A and B and remove the part of it that also lies inside C",
        "Translate the notation into words: In A and B but not C",
    ],
    p5: [
        "B' means not in B and C' means not in C, and both conditions are joined to A by ∩",
        "So the region is inside A and outside both B and C, the part of A that overlaps neither circle",
        "Translate the notation into words: In A only",
    ],
  },
  "set-word-problems": {
    p1: [
        "The overlap of the two circles holds the students who belong to both clubs, and the survey gives both = 7",
        "n(D) = 24 and n(C) = 20, and each of those totals already counts these 7 students, so the overlap is written first",
        "So 7 students belong to both clubs",
    ],
    p2: [
        "Debating only is the part of the D circle outside the overlap, so it is n(D) minus the overlap",
        "24 − 7 = 17",
        "So 17 students belong to the debating club only",
    ],
    p3: [
        "Chess only is the part of the C circle outside the overlap, so it is n(C) minus the overlap",
        "20 − 7 = 13",
        "So 13 students belong to the chess club only",
    ],
    p4: [
        "The three regions inside the circles are 17, 7 and 13, and they add to 17 + 7 + 13 = 37",
        "The neither region is what is left of the 40 students: 40 − 37 = 3",
        "So 3 students belong to neither club",
    ],
    p5: [
        "'At least one club' means the union D ∪ C, so it is every region inside the two circles",
        "Add the three regions: 17 + 7 + 13 = 37",
        "So 37 students belong to at least one club",
    ],
  },
  // ---------------------------------------------------------------------
  // SLICE 3 — the four new Statistics lessons (4 sets / 24 items)
  // ---------------------------------------------------------------------
  "mat-stat-data-types-and-sampling": {
    p1: [
        "A population is the whole group you want to know about",
        "The whole group means every member of the group, not just the ones you can reach",
        "So Population matches: every member of the group",
    ],
    p2: [
        "A sample is a smaller group taken from the population",
        "It has to stand in for the whole group, so it is a part chosen to represent the whole",
        "So Sample matches: a part chosen to represent the whole",
    ],
    p3: [
        "A census leaves nobody out",
        "It asks every member of the population, which is why it is slow and expensive",
        "So Census matches: asks every member of the population",
    ],
    p4: [
        "A survey puts questions to the people being studied",
        "The people asked are a sample, not the whole population",
        "So Survey matches: questions asked of a sample",
    ],
    p5: [
        "Discrete data comes from counting things that cannot be split",
        "You cannot have half a student, so it takes only whole-number values",
        "So Discrete data matches: only whole-number values",
    ],
    p6: [
        "Continuous data comes from measuring, and a measurement can always be made more precise",
        "So it can take any value in a range, such as 1.62 m or 12.4 s",
        "So Continuous data matches: any value in a range",
    ],
  },
  "mat-stat-statistical-diagrams": {
    p1: [
        "A bar chart compares separate categories, one bar for each",
        "Because the categories are separate, the bars are drawn with gaps between them",
        "So Bar chart matches: bars with gaps between them",
    ],
    p2: [
        "A pie chart shows each category's share of a total",
        "The whole is drawn as one circle cut into sectors, one per category",
        "So Pie chart matches: one circle cut into sectors",
    ],
    p3: [
        "A histogram is the diagram for grouped continuous data",
        "Its classes touch at the boundaries, so it has bars with no gaps, for grouped data",
        "So Histogram matches: bars with no gaps, for grouped data",
    ],
    p4: [
        "A frequency polygon shows the shape of a distribution",
        "Each bar contributes its midpoint, and the points are joined up",
        "So Frequency polygon matches: the class midpoints joined by straight lines",
    ],
    p5: [
        "An ogive is the graph the median and the quartiles are read from",
        "It plots the running total of the frequencies against the top of each class",
        "So Ogive matches: cumulative frequency plotted against the upper class boundary",
    ],
    p6: [
        "A sector's share of the circle is its frequency divided by the total frequency",
        "A whole circle is 360°, so multiply that share by 360 to get the angle",
        "So Pie-chart angle matches: (frequency ÷ total) × 360°",
    ],
  },
  "mat-stat-standard-deviation": {
    p1: [
        "The mean is where the data sits, and every other step is measured from it",
        "To get it, add the values and divide by how many there are",
        "So Mean: add the values and divide by how many there are",
    ],
    p2: [
        "A deviation measures how far one value sits from the mean",
        "It is the value minus the mean, and the deviations always add to zero",
        "So Deviation: value minus the mean",
    ],
    p3: [
        "The deviations are positive and negative, so they cancel when they are added",
        "Squaring fixes that, because the squared deviation is the deviation multiplied by itself",
        "So Squared deviation: the deviation multiplied by itself",
    ],
    p4: [
        "Add the squared deviations, then divide by how many values there are",
        "That average is the mean of the squared deviations, and it is called the variance",
        "So Variance: the mean of the squared deviations",
    ],
    p5: [
        "The variance is in squared units, so it cannot be compared with the data itself",
        "Taking the square root brings the units back: the standard deviation is the square root of the variance",
        "So Standard deviation: the square root of the variance",
    ],
    p6: [
        "The range uses only two of the values, the biggest and the smallest",
        "It is the highest value minus lowest value, so one outlier can change it completely",
        "So Range: highest value minus lowest value",
    ],
  },
  "mat-stat-statistical-inference": {
    p1: [
        "An inference joins what you measured to the group you did not measure",
        "It is a conclusion about a population drawn from a sample, so it is an estimate and never a certainty",
        "So Inference: a conclusion about a population drawn from a sample",
    ],
    p2: [
        "A prediction scales the sample result up to the whole population",
        "It is a statement about a value not yet measured, so it is quoted with 'about'",
        "So Prediction: a statement about a value not yet measured",
    ],
    p3: [
        "A comparison asks whether a difference between two groups is real",
        "It puts two samples placed side by side and compares their means or proportions, never their totals",
        "So Comparison: two samples placed side by side",
    ],
    p4: [
        "A representative sample has the same mix as the population it stands for",
        "It is chosen so the sample mirrors the population, with the same ages and the same proportions",
        "So Representative sample: chosen so the sample mirrors the population",
    ],
    p5: [
        "One unusual value has less and less effect as the sample grows",
        "So a larger sample gives a more reliable estimate, though size cannot repair a biased method",
        "So Larger sample: a more reliable estimate",
    ],
    p6: [
        "Reliability is about repeating the study, not about the first result",
        "It is how much a repeated sample would agree with the first",
        "So Reliability: how much a repeated sample would agree",
    ],
  },
  // ---------------------------------------------------------------------
  // BACKFILL SLICE C — number-theory-computation (8 sets / 46 items)
  // The rule-heavy module, so each step NAMES the rule it applies (index law,
  // place-value expansion, significant-figure rule, ratio-sharing method)
  // rather than only showing arithmetic. Grounded in each lesson's own copy in
  // content/mathematics/modules.json:
  //   types-of-numbers uses its own definitions (a prime has exactly two
  //   factors, 1 has a single factor, 9 = 3 × 3, √2 cannot be written as an
  //   exact fraction); indices-and-surds uses its index laws, its a^0 = 1 and
  //   a^-n = 1/a^n, and its own surd examples √50 = 5√2 and 1/√3 = √3/3;
  //   standard-form uses its own conversions and its "adjust A and the index
  //   until it is inside 1 to 10"; the bases lesson uses its
  //   1011₂ = 1 × 8 + 0 × 4 + 1 × 2 + 1 × 1 expansion, its 45 = 101101₂
  //   repeated division and its "carry at 2, never 10"; significant figures
  //   uses its 3.8462 → 3.85 worked rounding and its 0.0047256 / 2.007
  //   examples; properties-of-operations uses the worked instances printed in
  //   its copy; number-sequences uses its 5, 8, 11, 14 → 3n + 2 derivation and
  //   its 3n - 1 substitution; ratio-and-proportion uses its share-25-in-3:2
  //   worked method and its 4-pens-for-$12 unitary example.
  // All eight sets are `match`, so every last step states that item's
  // pairs[].target string exactly as the set stores it (A4 is literal, and
  // token-bounded for the purely numeric answers 32 / 25 / 1 / 3.85).
  // ---------------------------------------------------------------------
  "types-of-numbers": {
    p1: [
        "A number is classified by the MOST SPECIFIC family that applies, so ask what 9 is made of before choosing one",
        "9 = 3 × 3, a whole number multiplied by itself, so 9 is a square number",
        "No other family is more specific here, so 9 belongs under: Perfect square",
    ],
    p2: [
        "A prime number has exactly two factors, 1 and itself, so count the factors of 7",
        "The factors of 7 are 1 and 7 and nothing else, because 2, 3, 4, 5 and 6 do not divide it exactly",
        "Exactly two factors makes 7 a: Prime number",
    ],
    p3: [
        "A cube number is a whole number multiplied by itself twice, so ask whether 27 splits into three equal factors",
        "27 = 3 × 3 × 3, which is 3³, and 27 is not a square because no whole number squares to 27",
        "So the most specific family for 27 is: A cube number",
    ],
    p4: [
        "A rational number can be written as a fraction of two integers, and an irrational number cannot be written that way",
        "√2 is about 1.41421…, and its decimal never ends and never repeats, so no fraction of two integers equals it exactly",
        "Because √2 cannot be written as an exact fraction, it is: Irrational",
    ],
    p5: [
        "A prime has exactly two factors and a composite number has more than two, so count the factors of 1",
        "The only factor of 1 is 1 itself, because 1 × 1 = 1, so 1 has a single factor",
        "One factor is neither two nor more than two, so 1 is: Neither prime nor composite",
    ],
  },
  "indices-and-surds": {
    p1: [
        "The index law for multiplying powers of the same base is a^m × a^n = a^(m+n), so add the indices and keep the base 2",
        "3 + 2 = 5, so 2³ × 2² = 2⁵",
        "2⁵ = 2 × 2 × 2 × 2 × 2 = 32",
    ],
    p2: [
        "The index law for dividing powers of the same base is a^m ÷ a^n = a^(m-n), so subtract the indices and keep the base 5",
        "6 - 4 = 2, so 5⁶ ÷ 5⁴ = 5²",
        "5² = 5 × 5 = 25",
    ],
    p3: [
        "The zero index follows from the division law: 2³ ÷ 2³ = 2^(3-3) = 2⁰",
        "Dividing any non-zero number by itself gives 1, so 2⁰ must be 1 for the law to keep working",
        "So a^0 = 1 for every a ≠ 0, and 2⁰ = 1",
    ],
    p4: [
        "A negative index means a reciprocal, because a^-n = 1/a^n, so 2⁻³ = 1/2³",
        "2³ = 2 × 2 × 2 = 8",
        "So 2⁻³ = 1/2³ = 1/8",
    ],
    p5: [
        "A surd is simplified by removing square factors, so look for a square number that divides 50",
        "50 = 25 × 2 and 25 is a square, so √50 = √25 × √2",
        "√25 = 5, so √50 = 5√2",
    ],
    p6: [
        "A surd is not left in a denominator, so rationalise by multiplying the top and the bottom by √3",
        "1/√3 × √3/√3 = √3 ÷ (√3 × √3), and √3 × √3 = 3",
        "So 1/√3 = √3/3",
    ],
  },
  "standard-form": {
    p1: [
        "Standard form is A × 10^n with A at least 1 and less than 10, so place the decimal point after the first non-zero digit",
        "45,000 becomes 4.5, and the point has moved 4 places to the left, so the index is +4",
        "So 45,000 = 4.5 × 10⁴, and A = 4.5 is inside 1 to 10",
    ],
    p2: [
        "Place the decimal point after the first non-zero digit: 6,700,000 becomes 6.7",
        "The point moves 6 places to the left, and moving left gives a positive index, so n = 6",
        "So 6,700,000 = 6.7 × 10⁶",
    ],
    p3: [
        "Place the decimal point after the first non-zero digit, which is the 7, so the number part is 7.2",
        "The point moves 4 places to the right to get from 0.00072 to 7.2, and moving right gives a negative index",
        "So 0.00072 = 7.2 × 10⁻⁴",
    ],
    p4: [
        "Multiplying in standard form multiplies the number parts and adds the indices: (3 × 10⁵) × (2 × 10³) = (3 × 2) × 10^(5+3)",
        "3 × 2 = 6 and 5 + 3 = 8, so the result is 6 × 10⁸",
        "A = 6 is already inside 1 to 10, so no adjustment is needed: 6 × 10⁸",
    ],
    p5: [
        "Multiplying in standard form multiplies the number parts and adds the indices: 5 × 4 = 20 and 3 + 2 = 5, giving 20 × 10⁵",
        "20 is not between 1 and 10, so adjust A and the index until it is: 20 × 10⁵ = 2 × 10 × 10⁵ = 2 × 10⁶",
        "So (5 × 10³) × (4 × 10²) = 2 × 10⁶",
    ],
  },
  "mat-num-number-bases-and-place-value": {
    p1: [
        "A base of n uses only the digits 0 to n - 1, so base 2 allows the digits 0 and 1 and nothing higher",
        "The digit 3 is never legal in base two, because the column has not reached 2 yet and 3 is not one of the available digits",
        "So Base 2 (binary) uses only 0 and 1",
    ],
    p2: [
        "A base of n uses only the digits 0 to n - 1, so base 8 allows 0, 1, 2, 3, 4, 5, 6 and 7",
        "Base 8 (octal) has columns worth 1, 8, 64 and 512, but the digits still stop at 7",
        "So Base 8 (octal) uses 0 to 7",
    ],
    p3: [
        "Each column of a base two number is worth twice the column on its right, so 1011₂ has columns worth 8, 4, 2 and 1",
        "Expanding by place value multiplies each digit by the value of its own column and adds the results",
        "So 1011₂ expands to 1 × 8 + 0 × 4 + 1 × 2 + 1 × 1",
    ],
    p4: [
        "Repeated division converts base ten into another base: divide by the base again and again, recording each remainder",
        "For 45 in base two the remainders come out 1, 0, 1, 1, 0, 1 from the top down, which is the digits of the answer backwards",
        "So read the remainders from the bottom up, which gives 45 = 101101₂",
    ],
    p5: [
        "In base ten a column carries at 10, because that is the base; in base two the same column reaches the base at 2",
        "Adding 1 + 1 in a binary column gives 2, which is 10 in base two, so write 0 and carry 1",
        "So adding in base two means carry a 1 as soon as a column reaches 2",
    ],
    p6: [
        "Every answer in any base can be converted back to base ten by expanding by place value",
        "45 = 101101₂ converts back as 32 + 0 + 8 + 4 + 0 + 1 = 45, so the two methods agree",
        "That makes converting back to base ten the check that always works",
    ],
  },
  "mat-num-significant-figures-and-decimal-places": {
    p1: [
        "Significant figures are the digits that carry information, and the count starts at the first digit that is not zero",
        "In 0.0047256 the digits 4, 7, 2, 5 and 6 carry information, while the zeros in front only fix the size of the number",
        "So the first significant figure is the first non-zero digit, which here is the 4",
    ],
    p2: [
        "In 0.0047256 the two zeros between the point and the 4 sit at the start of the decimal",
        "They only fix how small the number is, so they are never counted as significant figures",
        "Leading zeros are therefore the zeros at the start of a decimal",
    ],
    p3: [
        "A zero that sits between two non-zero digits cannot be dropped, because it holds the place of a column",
        "In 2.007 the two zeros sit between the 2 and the 7 and both count, so 2.007 has four significant figures",
        "So significant zeros are the zeros between two non-zero digits",
    ],
    p4: [
        "To round, keep the digits you were asked for and look at the very next digit",
        "If that next digit is 5 or more the last kept digit goes up by one, otherwise it is left alone",
        "That is the rounding rule: round up if it is 5 or more",
    ],
    p5: [
        "Decimal places count from the decimal point, so one decimal place keeps one digit after the point",
        "The nearest whole number has no digits after the point at all, which is zero of them",
        "So rounding to the nearest whole number is rounding to 0 decimal places",
    ],
    p6: [
        "The first significant figure is the first non-zero digit, so keep the 3, the 8 and the 4 and look at the next digit, which is 6",
        "The rounding rule says round up if it is 5 or more, and 6 is 5 or more, so the 4 rounds up to 5",
        "So 3.8462 to 3 significant figures is 3.85",
    ],
  },
  "mat-num-properties-of-operations": {
    p1: [
        "The commutative property says order does not matter for addition and multiplication",
        "Here the two numbers 3 and 5 have swapped sides of the plus sign and nothing else has changed",
        "That is the commutative property: 3 + 5 = 5 + 3",
    ],
    p2: [
        "The associative property says grouping does not matter when three or more numbers are added or multiplied",
        "The numbers 2, 3 and 4 stay in the same order and only the brackets move",
        "That is the associative property: (2 + 3) + 4 = 2 + (3 + 4)",
    ],
    p3: [
        "The distributive property is a(b - c) = ab - ac, which splits one multiplication into two simpler ones",
        "98 is written as 100 - 2 so the 7 can be distributed: 7 × 100 - 7 × 2 = 700 - 14 = 686",
        "That is the distributive property at work: 7 × 98 = 7 × (100 - 2)",
    ],
    p4: [
        "The identity property names the number that changes nothing when it is combined with another",
        "Adding 0 leaves 12 exactly as it was, so 0 is the additive identity",
        "So the additive identity is shown by 12 + 0 = 12",
    ],
    p5: [
        "The identity property names the number that changes nothing when it is combined with another",
        "Multiplying by 1 leaves 9 exactly as it was, so 1 is the multiplicative identity",
        "So the multiplicative identity is shown by 9 × 1 = 9",
    ],
    p6: [
        "The inverse property pairs a number with the partner that cancels it out",
        "For addition the partner of 8 is -8, because the two of them together give the additive identity 0",
        "So the inverse property is shown by 8 + (-8) = 0",
    ],
  },
  "mat-num-number-sequences": {
    p1: [
        "The term-to-term rule says how to get from one term to the next, so compare consecutive terms",
        "8 - 5 = 3, 11 - 8 = 3 and 14 - 11 = 3, so the same number is added every time",
        "So the term-to-term rule is add 3 each time",
    ],
    p2: [
        "In a linear sequence the nth term is written an + b, where a is the number in front of n",
        "The rule has that shape because the same amount is added each time, and that amount is the common difference",
        "So the number in front of n is the common difference",
    ],
    p3: [
        "The common difference is 3, because 8 - 5 = 3 and 11 - 8 = 3, so the rule looks like 3n + b",
        "Put n = 1, because the first term must be 5: 3(1) + b = 5, so b = 2",
        "Check with n = 4: 3(4) + 2 = 14, which is right, so the nth term of 5, 8, 11, 14 is 3n + 2",
    ],
    p4: [
        "Compare consecutive terms by dividing instead of subtracting: 6 ÷ 2 = 3, 18 ÷ 6 = 3 and 54 ÷ 18 = 3",
        "The same number multiplies every term, and that number is the common ratio, here 3",
        "So a geometric sequence multiplies by the same number each time",
    ],
    p5: [
        "A square number is a whole number multiplied by itself, so take 1 × 1, 2 × 2, 3 × 3 and so on",
        "1 × 1 = 1, 2 × 2 = 4, 3 × 3 = 9, 4 × 4 = 16 and 5 × 5 = 25",
        "So the square numbers are 1, 4, 9, 16, 25",
    ],
    p6: [
        "To jump straight to a term, substitute its position into the rule: n = 10 for the 10th term",
        "Replacing n with 10 in 3n - 1 gives 3(10) - 1",
        "So the 10th term of 3n - 1 is written 3(10) - 1, which works out as 30 - 1 = 29",
    ],
  },
  "mat-num-ratio-and-proportion": {
    p1: [
        "The total tells you how many equal parts the whole is cut into, so the parts must be added before anything is shared",
        "For a ratio of 3:2 the parts are 3 + 2 = 5, and for 2:3:4 they are 2 + 3 + 4 = 9",
        "So the first step is add the parts of the ratio",
    ],
    p2: [
        "The value of one part is the quantity divided by the total number of parts",
        "Sharing 25 students in the ratio 3:2 gives 3 + 2 = 5 parts, so divide the 25 by the 5",
        "So the value of one part is 25 ÷ 5 = 5",
    ],
    p3: [
        "Each share is that number of parts multiplied by the value of one part",
        "The boys have 3 parts and one part is worth 5, so multiply 3 by 5",
        "So the boys' share is 3 × 5 = 15",
    ],
    p4: [
        "Two ratios are equivalent when they simplify to the same thing, so divide every part rather than subtract",
        "12:18 divides by the highest common factor 6 to give 2:3, and 2 and 3 share no factor except 1",
        "So simplifying a ratio means divide every part by the highest common factor",
    ],
    p5: [
        "The unitary method finds the value of one first and then multiplies",
        "If 4 pens cost $12, divide by 4 to find the cost of a single pen",
        "So one pen costs $12 ÷ 4 = $3, and 7 pens would cost 7 × $3 = $21",
    ],
    p6: [
        "A sharing question is finished only when the shares have been tested against the whole",
        "For 25 students shared in 3:2 the shares are 15 and 10, and 15 + 10 = 25, which is the whole",
        "So the check is that the shares add back to the whole",
    ],
  },
  // ---------------------------------------------------------------------
  // BACKFILL SLICE D — measurement (4 sets / 26 items)
  // Units are part of the answer here, so each step carries the unit (and the
  // power, where the unit is squared or cubed) from the point the factor is
  // applied, never only on the last line. Grounded in each lesson's own copy in
  // content/mathematics/modules.json:
  //   si-units-and-conversion uses its prefixes (kilo 1000, centi 1/100, milli
  //   1/1000), its 1 m² = 100 cm × 100 cm = 10,000 cm², its 1 m³ =
  //   1,000,000 cm³ with 1 cm³ = 1 mL and 1 m³ = 1000 L, its 72 × 5/18 = 20 m/s
  //   conversion, its "2 hours 45 minutes is 2.75 hours, not 2.45 hours", and
  //   its y = kx / y = k/x definitions; surface-area-of-solids uses its "name
  //   each face in words, write down its dimensions" rule (no diagram), its
  //   6 × side², 2(lw + lh + wh) and 2πr² + 2πrh formulas and its "subtract the
  //   top face"; measurement-error uses its 0.5 × 10⁻ᵈ greatest-possible-error
  //   rule, its 4.6 kg → 4.55 kg to 4.65 kg and 25 cm → 24.5 cm to 25.5 cm
  //   bounds, and its "the denominator is the true value, never the measured
  //   value"; scale-and-scale-drawings uses its 1:50 and 1:25,000 readings, its
  //   7 × 50 = 350 cm = 3.5 m worked wall and its 50² = 2500 area factor.
  // All four sets are `match`, so every last step states that item's
  // pairs[].target string exactly as the set stores it (A4 is literal here —
  // not one of these 26 answers is purely numeric, so no token boundary
  // applies and the unit, the comma in 10,000 and the superscripts must match).
  // ---------------------------------------------------------------------
  "si-units-and-conversion": {
    p1: [
        "The prefix kilo means 1000, so a kilometre is 1000 times as long as a metre",
        "1 km = 1 × 1000 m, and multiplying by 1000 moves the decimal point three places to the right",
        "So 1 km = 1000 m",
    ],
    p2: [
        "Area is measured in square units, so the length factor is applied twice and must be squared",
        "1 m = 100 cm, so 1 m² = 100 cm × 100 cm",
        "100 × 100 = 10,000, so 1 m² = 10,000 cm²",
    ],
    p3: [
        "Volume is measured in cubic units, so the length factor is cubed: 1 m³ = 100 cm × 100 cm × 100 cm = 1,000,000 cm³",
        "Capacity and volume are linked by 1 cm³ = 1 mL, so 1,000,000 cm³ holds 1,000,000 mL",
        "There are 1000 mL in a litre, so 1,000,000 ÷ 1000 = 1000 L, which is 1 m³ = 1000 L",
    ],
    p4: [
        "Capacity and volume are linked directly: the space inside 1 cm³ holds the same as 1 mL of liquid",
        "A cube 1 cm × 1 cm × 1 cm has volume 1 cm³, and it fills exactly one millilitre",
        "So 1 cm³ = 1 mL",
    ],
    p5: [
        "To change km/h into m/s, multiply by 1000/3600, because 1 km is 1000 m and 1 hour is 3600 s",
        "1000/3600 simplifies to 5/18, so 72 km/h becomes 72 × 5/18",
        "72 × 5 = 360 and 360 ÷ 18 = 20, so 72 km/h = 20 m/s",
    ],
    p6: [
        "Time is not decimal, so the minutes are converted on their own: 45 minutes ÷ 60 = 0.75 hours",
        "Add the whole hours back: 2 + 0.75 = 2.75",
        "So 2 hours 45 minutes = 2.75 hours, not 2.45 hours",
    ],
    p7: [
        "In direct proportion one quantity is a constant multiple of the other, so doubling x doubles y",
        "That constant multiple is k, the unit rate, found from the pair you are given: k = y ÷ x, so 5 m of cloth costing $120 gives k = 120 ÷ 5 = 24 dollars per metre",
        "Written as a formula, direct proportion is y = kx",
    ],
    p8: [
        "In inverse proportion the product of the two quantities stays the same, so doubling x halves y",
        "That fixed product is k, found by multiplying the given pair: 4 workers taking 12 days gives k = 4 × 12 = 48 worker-days, so 6 workers take 48 ÷ 6 = 8 days",
        "Written as a formula, inverse proportion is y = k/x",
    ],
  },
  "mat-meas-surface-area-of-solids": {
    p1: [
        "Volume says how much space is inside a solid; surface area says how much material it takes to cover the outside",
        "So work one face at a time: name each face, find its area, and add the face areas together",
        "Surface area is the total area of every face, measured in square units such as cm² or m²",
    ],
    p2: [
        "A net turns one 3D problem into a set of 2D ones, because every face is laid out flat in the plane",
        "The net of a cube is six equal squares, the net of a cuboid is six rectangles in three matching pairs, and the net of a triangular prism is two triangles and three rectangles",
        "So a net is the solid opened out and laid flat, and the area of the net is the surface area",
    ],
    p3: [
        "Name the faces in words: a cube has six faces, and every one of them is a square of side s",
        "Each face has area s × s = s², and there are six of them, so s² is added six times",
        "So a cube has surface area 6 × side², and a 4 cm cube gives 6 × 16 = 96 cm²",
    ],
    p4: [
        "Name the faces in words: top and bottom are l × w, front and back are l × h, and the two ends are w × h",
        "Each of those three face areas appears twice, so the total is 2 × lw + 2 × lh + 2 × wh",
        "So a cuboid has surface area 2(lw + lh + wh), and 8 cm by 5 cm by 3 cm gives 2 × 79 = 158 cm²",
    ],
    p5: [
        "Name the faces in words: a cylinder has two circular ends of area πr² each, and a curved side",
        "The curved side opens out into a rectangle as wide as the circumference 2πr and as tall as the height h, so its area is 2πrh",
        "So a cylinder has surface area 2πr² + 2πrh, and r = 7 cm with h = 10 cm gives 307.9 + 439.8 = 747.7 cm²",
    ],
    p6: [
        "Read the question for the face that is missing: an open-top tank has no lid",
        "Work the full surface area of the solid first, then take away the one face that is not there",
        "So for an open-top tank you subtract the top face from the total",
    ],
  },
  "mat-meas-measurement-error": {
    p1: [
        "Absolute error is the size of the gap between the measured value and the true value, kept in the units of the measurement",
        "Subtract the true value from the measured value: a rod measured as 25 cm whose true length is 24.8 cm gives 25 − 24.8 = 0.2 cm",
        "So absolute error = measured value − true value, and the sign is ignored because a measurement can be too high or too low",
    ],
    p2: [
        "Relative error compares the error with the true value instead of with the units, so it has no units at all",
        "Divide the absolute error by the true value: 0.2 ÷ 24.8 = 0.00806 to 3 significant figures",
        "So relative error = absolute error ÷ true value, and the denominator is the true value, never the measured value",
    ],
    p3: [
        "Percentage error puts the same comparison into hundredths, so it is still a ratio and still has no units",
        "Multiply the relative error by 100: 0.00806 × 100 = 0.806 = 0.81% to 2 decimal places",
        "So percentage error = relative error × 100, which for this rod is about 0.81% too high",
    ],
    p4: [
        "A value written to d decimal places was rounded to the nearest 10⁻ᵈ, so for 4.6 kg to 1 d.p. the rounding unit is 0.1 kg",
        "The greatest possible error is half a rounding unit: 0.5 × 0.1 = 0.05 kg",
        "Go that far either side of 4.6 kg: 4.6 − 0.05 = 4.55 and 4.6 + 0.05 = 4.65, so the bounds are 4.55 kg to 4.65 kg",
    ],
    p5: [
        "The true value was rounded to the nearest 10⁻ᵈ, so it can be up to half a rounding unit away from the value written",
        "For a mass recorded to 1 d.p., d = 1, so the rounding unit is 10⁻¹ = 0.1 kg",
        "Half of that unit is 0.5 × 0.1, so the greatest possible error is 0.5 × 10⁻¹ = 0.05 kg",
    ],
    p6: [
        "Nearest cm means the value was rounded to 0 decimal places, so d = 0 and the rounding unit is 10⁰ = 1 cm",
        "The greatest possible error is half a rounding unit: 0.5 × 10⁰ = 0.5 cm",
        "Go 0.5 cm either side of 25 cm: 25 − 0.5 = 24.5 and 25 + 0.5 = 25.5, so the bounds are 24.5 cm to 25.5 cm",
    ],
  },
  "mat-meas-scale-and-scale-drawings": {
    p1: [
        "A scale is a ratio written drawing : real, so 1:50 is read aloud as one to fifty",
        "The first number is the drawing, so 1 unit on the drawing stands for 50 of the same unit in real life",
        "In centimetres that means 1 cm on the drawing is 50 cm real, which is 0.5 m",
    ],
    p2: [
        "The scale factor is the second number of the ratio, so at 1:50 the scale factor is 50",
        "The drawing is the real object shrunk by that factor, so going back up to real life means multiplying: 7 × 50 = 350 cm",
        "So real length = drawing length × scale factor, and the units must match before you multiply",
    ],
    p3: [
        "Going from real life down to the drawing is the opposite direction, so the scale factor divides",
        "A 4 m wall is 400 cm real, and at 1:50 the scale factor is 50, so 400 ÷ 50 = 8 cm on the drawing",
        "So drawing length = real length ÷ scale factor, with both lengths in the same unit",
    ],
    p4: [
        "A map scale of 1:25,000 is the same ratio idea with larger numbers: 1 unit on the map is 25,000 of the same unit on the ground",
        "In centimetres that is 25,000 cm, and 25,000 cm ÷ 100 = 250 m",
        "So 1 cm on the map is 250 m, which is 0.25 km",
    ],
    p5: [
        "An area applies the length factor twice, once for each dimension, so the area factor is the square of the length factor",
        "At 1:50 the length factor is 50, so the area scale factor is 50 × 50 = 2500",
        "So the area scale factor is 50² = 2500, and a 48 cm² drawing covers 48 × 2500 = 120,000 cm² = 12 m² real",
    ],
    p6: [
        "Write the scale as its own step first: drawing : real = 1 : 50, so the scale factor is 50",
        "Multiply the drawing length by the scale factor: 7 × 50 = 350 cm",
        "Convert to a sensible unit with 100 cm = 1 m: 350 ÷ 100 = 3.5, so 350 cm = 3.5 m",
    ],
  },

  // ---------------------------------------------------------------------
  // BACKFILL SLICE E — algebra (3 sets / 15 items) +
  // relations-functions-graphs (1 set / 5 items) = 4 sets / 20 items
  // Every step is grounded in that lesson's own copy in
  // content/mathematics/modules.json, and each item's working names the RULE
  // before it is applied, because that is the whole product here:
  //   factorization uses its highest-common-factor-first order, its
  //   a² − b² = (a + b)(a − b) pattern, its "two numbers multiplying to c and
  //   adding to b" rule, its split-the-middle-term rule for 6x² + 11x + 4
  //   (product 6 × 4 = 24, sum 11, so 8 and 3), its "if a product is zero then a
  //   factor is zero", and its own worked factorisations 6x² + 9x, 25x² − 16,
  //   x² + 7x + 12, 6x² + 11x + 4 and x² − 5x + 6 — each checked by expanding
  //   the factors back.
  //   algebraic-fractions uses its "factorise before you cancel, cancel only
  //   factors never terms", its common denominator xy for 1/x + 1/y, its
  //   (x² − 9)/(x + 3) = x − 3, its (a/b) ÷ (c/d) = (a/b) × (d/c), its
  //   1/x + 1/3 = 1/2 → 6 + 2x = 3x → x = 6, and its "3 and 5 are not factors"
  //   reason for (x + 3)/(x + 5).
  //   transposition-and-substitution uses its inverse-operations-in-reverse-
  //   order rule, its t = (v − u)/a, r = √(A/π) and b = P/2 − l, its
  //   s = ut + ½at² with u = 4, a = 3, t = 5 → 20 + 37.5 = 57.5, and its
  //   "square a negative inside brackets" warning for a = −2 → a² = 4.
  //   linear-and-quadratic-graphs uses its y = mx + c reading (m the gradient,
  //   c the y-intercept), its "a negative gradient slopes downwards", its
  //   "opens upwards when a is positive and downwards when a is negative", its
  //   "roots are where y = 0" and its worked x² − 2x − 3 = 0 → x = −1 and x = 3.
  // All four sets are `match`, so every last step states that item's
  // pairs[].target string exactly as the set stores it. Two of the twenty
  // answers are purely numeric (57.5 and 4), so A4's token boundary applies to
  // those two — each stands alone in the final step, never as part of a longer
  // number.
  // ---------------------------------------------------------------------
  "factorization": {
    p1: [
        "Factorising is expanding in reverse, so start with the highest common factor: 6x² = 2 × 3 × x × x and 9x = 3 × 3 × x",
        "The highest common factor is 3 × x = 3x, so divide each term by it: 6x² ÷ 3x = 2x and 9x ÷ 3x = 3",
        "So 6x² + 9x = 3x(2x + 3), and expanding back gives 3x × 2x = 6x² and 3x × 3 = 9x, which matches: 3x(2x + 3)",
    ],
    p2: [
        "There is no common factor and only two terms with a minus between them, so test the difference of two squares, a² − b² = (a + b)(a − b)",
        "Both terms are perfect squares: 25x² = (5x)² so a = 5x, and 16 = 4² so b = 4",
        "Apply the pattern and expand back to check: (5x + 4)(5x − 4) = 25x² − 20x + 20x − 16 = 25x² − 16, so the factorised form is (5x + 4)(5x − 4)",
    ],
    p3: [
        "The coefficient of x² is 1, so the factors have the form (x + ?)(x + ?) and the two numbers must multiply to the constant 12 and add to the middle coefficient 7",
        "The pair that does both is 3 and 4, because 3 × 4 = 12 and 3 + 4 = 7",
        "So x² + 7x + 12 = (x + 3)(x + 4), and expanding back gives x² + 4x + 3x + 12 = x² + 7x + 12",
    ],
    p4: [
        "The coefficient of x² is 6, not 1, so split the middle term: multiply 6 × 4 = 24 and look for two numbers that multiply to 24 and add to 11",
        "The pair is 8 and 3, so rewrite the expression as 6x² + 8x + 3x + 4 and factorise in pairs: 2x(3x + 4) + 1(3x + 4)",
        "The repeated bracket is a common factor, so 6x² + 11x + 4 = (3x + 4)(2x + 1), and expanding back gives 6x² + 3x + 8x + 4 = 6x² + 11x + 4",
    ],
    p5: [
        "A product is zero only when one of its factors is zero, so rearrange the equation to equal zero first (it already does) and factorise x² − 5x + 6",
        "Two numbers that multiply to +6 and add to −5 are −2 and −3, so x² − 5x + 6 = (x − 2)(x − 3) = 0",
        "Set each factor to zero: x − 2 = 0 gives x = 2, and x − 3 = 0 gives x = 3, so the roots are x = 2 or x = 3",
    ],
  },
  "algebraic-fractions": {
    p1: [
        "Fractions can only be added when the denominators match, so find the lowest common multiple of x and y, which is xy",
        "Multiply each fraction top and bottom by what its own denominator is missing: 1/x becomes y/xy, and 1/y becomes x/xy",
        "Now the denominators are the same, so add the numerators over the single denominator: (y + x)/xy, which is written 1/x + 1/y = (x + y)/xy",
    ],
    p2: [
        "Factorise before you cancel: the numerator is a difference of two squares, so x² − 9 = (x + 3)(x − 3)",
        "A factor may be cancelled only when it multiplies the WHOLE numerator and the WHOLE denominator, and (x + 3) does both, so it cancels",
        "What is left is (x − 3)/1 = x − 3, so the fraction simplifies to x − 3 (with x ≠ −3, where the original denominator would be zero)",
    ],
    p3: [
        "Dividing by a fraction is the same as multiplying by its reciprocal, so turn the second fraction upside down: (a/b) ÷ (c/d) = (a/b) × (d/c)",
        "Multiplying fractions means multiplying the numerators together and the denominators together: (a × d) over (b × c)",
        "So (a/b) ÷ (c/d) = (a × d)/(b × c), provided b, c and d are all non-zero",
    ],
    p4: [
        "Clear the fractions first by multiplying every term by the common denominator of x, 3 and 2, which is 6x",
        "That gives 6x/x + 6x/3 = 6x/2, so 6 + 2x = 3x",
        "Subtract 2x from both sides to collect the x terms: 6 = x, so x = 6",
    ],
    p5: [
        "Factorise the top and the bottom first: x + 3 and x + 5 are each already fully factorised, and they have no common factor",
        "The 3 and the 5 are terms added to x, not factors multiplying the whole expression, so cancelling them across the fraction bar is not allowed",
        "With nothing common to cancel, this fraction matches: Cannot be simplified",
    ],
  },
  "transposition-and-substitution": {
    p1: [
        "The subject must stand alone, so undo the operations in the reverse order to the one that built the right-hand side, starting with the last one: + at",
        "The inverse of adding at is subtracting at, so subtract u from both sides: v − u = at",
        "The inverse of multiplying by a is dividing by a, so divide both sides by a: t = (v − u)/a",
    ],
    p2: [
        "The right-hand side was built as r, then squared, then multiplied by π, so undo in the opposite order and divide by π first: A/π = r²",
        "The inverse of squaring is the square root, and it is taken of the whole side, not of A alone",
        "So r = √(A/π), taking the positive root because a radius cannot be negative",
    ],
    p3: [
        "The bracket l + b was multiplied by 2, so undo that first by dividing both sides by 2: P/2 = l + b",
        "Then undo the addition of l by subtracting l from both sides: P/2 − l = b",
        "Written with the new subject on the left, b = P/2 − l",
    ],
    p4: [
        "Write the formula, then substitute each letter for its number: s = ut + ½at² becomes s = (4 × 5) + ½ × 3 × 5²",
        "Powers come before multiplication, and the negative-and-square rule means squaring inside the bracket: 5² = 25, so 4 × 5 = 20 and ½ × 3 × 25 = 37.5",
        "Add the two parts: 20 + 37.5 = 57.5, so s = 57.5",
    ],
    p5: [
        "Substitute the number for the letter and keep it inside a bracket before squaring, because a² means a × a",
        "So a² = (−2) × (−2), and a negative times a negative is positive: (−2) × (−2) = 4",
        "So with a = −2, a² = 4 and not −4",
    ],
  },
  "linear-and-quadratic-graphs": {
    p1: [
        "Compare the equation with y = mx + c: the number multiplying x is m, the gradient, and the constant on its own is c, the y-intercept, which is the value of y when x = 0",
        "Here m = 3 and c = 2, so the line rises 3 for every 1 step across and passes through (0, 2)",
        "So this graph has Gradient 3, intercept 2",
    ],
    p2: [
        "The gradient is the number multiplying x, and here m = −2",
        "A negative gradient means y decreases as x increases, so the line goes downhill when it is read from left to right",
        "So this line matches: Falls from left to right",
    ],
    p3: [
        "The highest power of x is 2, so y = ax² + bx + c is a parabola rather than a straight line",
        "Here a = 1, the coefficient of x², and the sign of a decides which way the curve opens",
        "a = 1 is positive, so this curve matches: Parabola opening upwards",
    ],
    p4: [
        "The x² term makes this a parabola, and writing it in full as y = −1 × x² + 0 × x + 4 gives a = −1",
        "A negative a turns the curve over, so it opens downwards instead of upwards",
        "With a = −1, this curve matches: Parabola opening downwards",
    ],
    p5: [
        "Roots are the x-values where y = 0, so solve x² − 2x − 3 = 0 by finding two numbers that multiply to −3 and add to −2, namely −3 and 1",
        "So (x − 3)(x + 1) = 0, giving x = 3 from x − 3 = 0 and x = −1 from x + 1 = 0",
        "Check both in y = x² − 2x − 3: x = 3 gives 9 − 6 − 3 = 0 and x = −1 gives 1 + 2 − 3 = 0, so the roots are x = −1 and x = 3",
    ],
  },

  // ---------------------------------------------------------------------
  // BACKFILL SLICE F — the LAST slice: geometry-trigonometry (3 sets /
  // 17 items) + statistics-probability (1 set / 6 items) = 4 sets / 23 items.
  // This empties PENDING to zero: every Mathematics lesson that owns a
  // per-lesson lab set now carries authored working.
  // The traps this slice had to get right, item by item:
  //   angles-and-polygons uses (n − 2) × 180° for the interior-angle SUM, that
  //   total ÷ n for each interior angle of a regular polygon, and 360° ÷ n for
  //   each exterior angle — and the polygon NAMED in each step is the one whose
  //   side count is used (triangle n = 3, quadrilateral n = 4, pentagon n = 5,
  //   hexagon n = 6, octagon n = 8, 10-sided n = 10).
  //   circle-theorems names the theorem in each step and says why its
  //   configuration fits: angle in a semicircle (diameter subtends 90°), angle
  //   at the centre = 2 × angle at the circumference ON THE SAME ARC, angles in
  //   the same segment equal, opposite angles of a cyclic quadrilateral summing
  //   to 180°, tangent ⊥ radius at the point of contact, and two tangents from
  //   one external point equal because the two right-angled triangles are
  //   congruent (RHS).
  //   transformations states the full description each one needs — mirror line;
  //   centre, angle and direction; column vector; scale factor and centre — and
  //   checks the image by actually transforming coordinates ((1, 2) → (3, 6)
  //   at k = 3; (2, 1) → (−2, −1) at k = −1).
  //   frequency-tables-and-cumulative-frequency keeps ONE dataset inside each
  //   working: the ogive of 40 students' marks (cumulative frequency 10 at 44
  //   marks, 20 at 52, 30 at 61) for the median and quartile items, and a
  //   grouped table of 20 students (10 – 19 : 4, 20 – 29 : 6, 30 – 39 : 10,
  //   midpoints 14.5 / 24.5 / 34.5) for the estimated mean and modal class. The
  //   lesson copy also holds a second, incompatible ogive (cumulative frequency
  //   20 at 30 marks, 34 at 40 marks); it is never mixed into these workings.
  // Every last step states that item's pairs[].target string exactly as the set
  // stores it. None of the 23 answers is purely numeric, so A4's token boundary
  // does not apply here — containment is the whole rule for this slice.
  // ---------------------------------------------------------------------
  "angles-and-polygons": {
    p1: [
        "A triangle is a polygon with n = 3 sides, so its interior angles are found from the polygon rule (n − 2) × 180°",
        "Substitute n = 3: (3 − 2) × 180° = 1 × 180° = 180°",
        "The interior angle sum of a triangle is 180°",
    ],
    p2: [
        "A quadrilateral is a polygon with n = 4 sides, so its interior angles use the same rule, (n − 2) × 180°",
        "Substitute n = 4: (4 − 2) × 180° = 2 × 180° = 360°",
        "The interior angle sum of a quadrilateral is 360°",
    ],
    p3: [
        "A regular pentagon has n = 5 equal sides and equal angles, so its interior angles total (5 − 2) × 180° = 3 × 180° = 540°",
        "A regular polygon shares that total equally between its 5 angles: 540° ÷ 5 = 108°, which agrees with the exterior-angle route 180° − 360°/5 = 180° − 72° = 108°",
        "Each interior angle of a regular pentagon is 108°",
    ],
    p4: [
        "The exterior angles of any polygon add to 360°, whatever the number of sides",
        "A regular hexagon has n = 6 equal exterior angles, so divide 360° equally between them: 360° ÷ 6 = 60°",
        "Each exterior angle of a regular hexagon is 60°",
    ],
    p5: [
        "A regular octagon has n = 8 equal sides, so each exterior angle is 360° ÷ 8 = 45°",
        "The interior and exterior angles at the same vertex lie on a straight line, so each interior angle is 180° − 45° = 135°",
        "Each interior angle of a regular octagon is 135°, and the eight of them total 8 × 135° = 1080° = (8 − 2) × 180°",
    ],
    p6: [
        "A 10-sided polygon has n = 10, so its interior angles total (n − 2) × 180°",
        "Substitute n = 10: (10 − 2) × 180° = 8 × 180° = 1440°",
        "The interior angles of a 10-sided polygon add to 1440°",
    ],
  },
  "circle-theorems": {
    p1: [
        "A diameter cuts the circle into two semicircles, and any angle the diameter subtends at a point on the circumference is the angle in a semicircle",
        "The angle-in-a-semicircle theorem says that angle is a right angle, so it is 90° whatever the position of the point on the arc",
        "So an angle in a semicircle is 90°",
    ],
    p2: [
        "The angle at the centre is twice the angle at the circumference only when both stand on the SAME arc, and here AOB at the centre and ACB at the circumference are both subtended by arc AB",
        "So angle AOB = 2 × angle ACB: with AOB = 130° at the centre, ACB = 130° ÷ 2 = 65° at the circumference",
        "So the Centre angle is double the angle at the circumference on that arc",
    ],
    p3: [
        "Angles in the same segment are subtended by the same arc and have their vertices on the same side of the chord, which is the configuration this theorem needs",
        "That theorem says the two angles are equal, so once both are identified as standing on the same arc in the same segment no arithmetic is needed",
        "So angles in the same segment are Equal",
    ],
    p4: [
        "A cyclic quadrilateral has all four vertices on the circumference, so each pair of opposite angles is subtended by the arc joining the other two vertices",
        "The cyclic-quadrilateral theorem says each pair of opposite angles sums to 180°, so with one angle 110° the opposite angle is 180° − 110° = 70°",
        "Add to 180°: opposite angles of a cyclic quadrilateral are supplementary, and 110° + 70° = 180° checks it",
    ],
    p5: [
        "A tangent touches the circle at exactly one point, the point of contact, and the radius drawn to that point is the radius of the circle there",
        "The tangent–radius theorem says the radius at the point of contact is perpendicular to the tangent, so the angle between them is 90°",
        "So a radius meeting a tangent at the point of contact makes a Right angle",
    ],
    p6: [
        "From an external point P, tangents PA and PB touch the circle at A and B, and OA and OB are the radii to those points of contact",
        "Each radius is perpendicular to its own tangent, so triangles OAP and OBP are right-angled, with the common hypotenuse OP and OA = OB = r, and they are congruent by RHS",
        "Congruent triangles give PA = PB, so two tangents from one external point are Equal in length",
    ],
  },
  "transformations": {
    p1: [
        "A reflection flips the shape so that every point is the same distance from the mirror on the opposite side, and points on the mirror itself do not move",
        "So the one piece of information that fixes the image completely is the line reflected in, whether that is the x-axis, the y-axis or a line such as y = x",
        "So a reflection is fully described by its Mirror line",
    ],
    p2: [
        "A rotation turns the shape about a fixed point, so that point — the centre of rotation — must be named",
        "The turn itself must be given as an angle (90°, 180° or 270°) AND a direction, because 90° clockwise and 90° anticlockwise produce different images",
        "So a rotation needs its Centre, angle and direction",
    ],
    p3: [
        "A translation slides the shape without turning or flipping it, so every point moves by the same amount and the orientation is unchanged",
        "That movement is written as a column vector such as (3 over −2): 3 right and 2 down, applied to every vertex in turn",
        "So a translation is fully described by its Column vector",
    ],
    p4: [
        "An enlargement multiplies the distance of every point from the centre by the scale factor, so with centre (0, 0), k = 3 and object point (1, 2) the image is (1 × 3, 2 × 3) = (3, 6)",
        "Lengths are multiplied by k once, but area is two-dimensional so it is multiplied by k twice: k² = 3 × 3 = 9",
        "Area becomes 9 times: a 2 cm² shape under this enlargement becomes 2 × 9 = 18 cm²",
    ],
    p5: [
        "A negative scale factor still multiplies the distance from the centre, and the minus sign reverses the direction as well",
        "Check it on coordinates with centre (0, 0), scale factor −1 and object point (2, 1): (2 × −1, 1 × −1) = (−2, −1), which is the opposite side of the centre from (2, 1)",
        "So with a negative scale factor the Image lands on the other side of the centre",
    ],
  },
  "frequency-tables-and-cumulative-frequency": {
    p1: [
        "The cumulative frequency column is a running total against the upper class boundary, so the ogive rises to the total number of students, n = 40",
        "Half of the total is 40 ÷ 2 = 20, and the curve reads 52 marks at cumulative frequency 20",
        "At n/2 on the cumulative axis: the median is the mark at cumulative frequency 20, which is 52 marks",
    ],
    p2: [
        "The lower quartile is one quarter of the way through the cumulative frequency, so divide the total by 4: 40 ÷ 4 = 10",
        "The curve reads 44 marks at cumulative frequency 10",
        "At n/4 on the cumulative axis: the lower quartile Q1 is 44 marks",
    ],
    p3: [
        "The upper quartile is three quarters of the way through the cumulative frequency: 3 × 40 ÷ 4 = 30",
        "The curve reads 61 marks at cumulative frequency 30",
        "At 3n/4 on the cumulative axis: the upper quartile Q3 is 61 marks",
    ],
    p4: [
        "The interquartile range describes the middle half of the data, so both quartiles are read from the same ogive: Q1 = 44 marks at cumulative frequency 10 and Q3 = 61 marks at cumulative frequency 30",
        "Subtract the lower quartile from the upper one: 61 − 44 = 17 marks, and the semi-interquartile range is 17 ÷ 2 = 8.5 marks",
        "Q3 − Q1 = 61 − 44 = 17 marks, so the middle half of the class spans 17 marks",
    ],
    p5: [
        "Grouped data has no individual values, so each class is represented by its midpoint: 10 – 19 gives 14.5, 20 – 29 gives 24.5 and 30 – 39 gives 34.5",
        "Multiply each midpoint by its frequency and add: 4 × 14.5 = 58, 6 × 24.5 = 147 and 10 × 34.5 = 345, so Σfx = 58 + 147 + 345 = 550, and Σf = 4 + 6 + 10 = 20",
        "Σfx ÷ Σf = 550 ÷ 20 = 27.5, so the estimated mean is 27.5 marks",
    ],
    p6: [
        "The modal class is the class interval holding the most data, so compare the frequencies themselves rather than the midpoints",
        "The frequencies are 4, 6 and 10, and the largest is 10, which belongs to the interval 30 – 39 marks",
        "Interval with the highest frequency: 30 – 39 marks has 10 students against 6 and 4, so the modal class is 30 – 39 marks",
    ],
  },
  "mat-alg-binary-operations-and-distributive-law": {
    p1: [
        "The rule is a★b = a + 2b, so the first value is used as it stands and the second is doubled",
        "Substitute a = 3 and b = 5: 3 + 2 × 5 = 3 + 10",
        "3 + 10 = 13, so 3★5 = 13",
    ],
    p2: [
        "Apply the same rule with the values the other way round, because order is what commutativity is about",
        "Substitute a = 5 and b = 3: 5 + 2 × 3 = 5 + 6",
        "5 + 6 = 11, so 5★3 = 11 — which is not 13, so this operation is not commutative",
    ],
    p3: [
        "An unknown inside the operation is just an equation: put b = x in a★b = a + 2b",
        "4 + 2x = 20, so subtract 4 from both sides to get 2x = 16 and divide by 2",
        "x = 8, and substituting back gives 4 + 2 × 8 = 20, so 4★x = 20 gives x = 8",
    ],
    p4: [
        "The factor in front of each bracket multiplies every term inside it, and the sign travels with it",
        "4(x - 2) = 4x - 8, and -3(x + 1) = -3x - 3 because the minus makes both terms negative",
        "Collect like terms: 4x - 3x = x and -8 - 3 = -11, so the expansion is x - 11",
    ],
    p5: [
        "Two brackets are expanded by multiplying every term in the first by every term in the second",
        "x(x + 3) = x² + 3x, and 2(x + 3) = 2x + 6, giving the four products x², 3x, 2x and 6",
        "Collect the like terms 3x + 2x = 5x, so (x + 2)(x + 3) = x² + 5x + 6",
    ],
    p6: [
        "Factorising is the same rule read backwards, so look for two numbers that multiply to 6 and add to 5",
        "The pair is 2 and 3, because 2 × 3 = 6 and 2 + 3 = 5",
        "So x² + 5x + 6 = (x + 2)(x + 3), and expanding back returns x² + 5x + 6",
    ],
    p7: [
        "A defined operation applied to its own result is read from the inside out, so (3★5)★2 works out the bracket first",
        "3★5 = 13, and the outer application takes a = 13 and b = 2: 13 + 2 × 2 = 13 + 4",
        "13 + 4 = 17, so 13★2 = 17 and (3★5)★2 = 17",
    ],
  },
  "mat-alg-simultaneous-equations": {
    p1: [
        "The y terms are +y and -y, so adding the two equations makes them cancel",
        "2x + x = 3x and 11 + 1 = 12, so 3x = 12 and x = 4",
        "Substitute x = 4 into x - y = 1: 4 - y = 1 so y = 3, and the solution is x = 4, y = 3",
    ],
    p2: [
        "Neither variable cancels as written, so scale the equations until one coefficient matches",
        "3 × (3x + 2y = 16) is 9x + 6y = 48 and 2 × (2x + 3y = 19) is 4x + 6y = 38",
        "Subtracting gives 5x = 10 so x = 2, then 3 × 2 + 2y = 16 gives 2y = 10 and y = 5, so the solution is x = 2, y = 5",
    ],
    p3: [
        "The first equation already has y alone, so it can be substituted into the second",
        "3x + 2x - 1 = 9 gives 5x = 10, so x = 2",
        "Back-substitute: y = 2 × 2 - 1 = 3, so the solution is x = 2, y = 3, and 3 × 2 + 3 = 9 checks it",
    ],
    p4: [
        "Both equations give y, so the two right-hand sides must be equal: x + 1 = x² - 1",
        "Rearrange to zero and factorise: x² - x - 2 = 0 gives (x - 2)(x + 1) = 0, so x = 2 or x = -1",
        "Back-substitute each x into y = x + 1: x = 2 gives y = 3 and x = -1 gives y = 0, so the points are (2, 3) and (-1, 0)",
    ],
    p5: [
        "A quadratic has to equal zero before it can be factorised, so collect everything on one side",
        "Subtract x from both sides and add 1 to both sides: x² - x - 2 = 0",
        "So x + 1 = x² - 1 rearranges to x² - x - 2 = 0, which is the quadratic to solve",
    ],
    p6: [
        "The coefficient of x² is 1, so look for two numbers that multiply to -2 and add to -1",
        "The pair is -2 and 1, because -2 × 1 = -2 and -2 + 1 = -1",
        "So x² - x - 2 = 0 factorises as (x - 2)(x + 1) = 0, and the roots are x = 2 and x = -1",
    ],
  },
  "mat-alg-word-problems": {
    p1: [
        "Name the unknown: let n be the smallest integer, so the other two are n + 1 and n + 2",
        "The words \"sum to 63\" become n + (n + 1) + (n + 2) = 63, which collects to 3n + 3 = 63",
        "3n = 60 gives n = 20, so the integers are 20, 21 and 22, and 20 + 21 + 22 = 63 checks it",
    ],
    p2: [
        "Let the son be s, so the father is 4s; in 12 years their ages are s + 12 and 4s + 12",
        "\"Twice as old\" at that time gives 4s + 12 = 2(s + 12), so 4s + 12 = 2s + 24 and 2s = 12",
        "s = 6, so the son is 6 and the father is 24, and in 12 years 36 is twice 18",
    ],
    p3: [
        "Let the width be w, so the length is w + 3 and the perimeter gives 2(w + w + 3) = 34",
        "4w + 6 = 34 gives 4w = 28, so w = 7 and the length is 7 + 3 = 10",
        "So the width is 7 cm and the length 10 cm, and 2(7 + 10) = 34 checks it",
    ],
    p4: [
        "Let a tie cost t dollars, so a shirt costs t + 12 dollars",
        "Three ties and two shirts give 3t + 2(t + 12) = 164, so 5t + 24 = 164 and 5t = 140",
        "t = 28, so a tie costs $28 and a shirt $40, and 3 × 28 + 2 × 40 = 164 checks it",
    ],
    p5: [
        "Two unknowns need two equations: let a pencil cost p and a pen cost q",
        "5p + 3q = 31 and 2p + 3q = 25; subtracting removes q and leaves 3p = 6, so p = 2",
        "2 × 2 + 3q = 25 gives 3q = 21 and q = 7, so a pencil costs $2 and a pen $7, and 5 × 2 + 3 × 7 = 31 checks it",
    ],
    p6: [
        "The three integers are n, n + 1 and n + 2, and \"sum to 63\" is the equation to write down",
        "Collect the n terms, n + n + n = 3n, and the constants, 1 + 2 = 3",
        "So n + (n + 1) + (n + 2) = 63 simplifies to 3n + 3 = 63",
    ],
    p7: [
        "A check substitutes the values back into the condition the question gave",
        "5 pencils at $2 and 3 pens at $7 give 5 × 2 + 3 × 7 = 10 + 21",
        "10 + 21 = 31, which is the stated cost, so 5 × 2 + 3 × 7 = 31",
    ],
  },
  "mat-alg-variation": {
    i1: [
        "The symbol ∝ in y ∝ x means the two quantities keep a constant ratio, and a constant ratio is written y = kx",
        "k is the constant of variation, found from one stated pair of values",
        "So y = kx is the algebraic statement of direct variation: this item belongs under Direct variation",
    ],
    i2: [
        "\"Varies inversely\" means the product xy stays constant, and a constant product is written y = k/x",
        "Doubling x halves y, which is exactly what a constant product does",
        "So y = k/x is the algebraic statement of inverse variation: this item belongs under Inverse variation",
    ],
    i3: [
        "\"Varies jointly as x and y\" means z depends on both of them at once, so z = kxy",
        "The single constant k is found from one stated set of three values",
        "So z = kxy is the algebraic statement of joint variation: this item belongs under Joint variation",
    ],
    i4: [
        "Partial variation has a direct part kx with a fixed part c added to it",
        "c is the value of y when x is zero, which is why its graph does not pass through the origin",
        "So y = kx + c is the equation of partial variation: this item belongs under Partial variation",
    ],
    i5: [
        "y = kx has no constant term, so when x = 0 the value of y is also 0",
        "Two points fix a straight line, and (0, 0) is always one of the points on y = kx",
        "So y = kx graphs as a straight line through the origin: this item belongs under Direct variation",
    ],
    i6: [
        "k divided by a number is never zero, so y = k/x can never be zero",
        "x cannot be zero either, because dividing by zero is undefined, so the curve approaches both axes without meeting them",
        "So y = k/x graphs as a curve that never touches either axis: this item belongs under Inverse variation",
    ],
    i7: [
        "Joint variation is z = kxy, and k comes from one stated set of three values",
        "24 = k × 3 × 2 gives 6k = 24, so k = 4",
        "Substituting k = 4 gives z = 4xy, and x = 5, y = 6 then gives z = 4 × 5 × 6 = 120: this item belongs under Joint variation",
    ],
    i8: [
        "Partial variation is y = kx + c, and the two stated pairs give 2k + c = 11 and 5k + c = 20",
        "Subtracting removes c: 3k = 9, so k = 3 and c = 11 - 6 = 5",
        "So the equation is y = 3x + 5, and x = 10 gives y = 35: this item belongs under Partial variation",
    ],
  },
};
