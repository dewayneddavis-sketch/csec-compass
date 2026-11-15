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
};
