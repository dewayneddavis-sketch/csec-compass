// ---------------------------------------------------------------------------
// Per-lesson interactive sets for subjects where multiple lessons share the
// same experiment.type. Each key is a LESSON id (from modules.json) and maps
// to content matched to that lesson's topic, so lessons that share a type
// (e.g. biology has several 'simulation' lessons) still show distinct labs.
//
// Resolution order in DragDropLabel: lessonSets[subject][lessonId]  →
// subjectTypeSets[subject][experimentType] → subjectSets[subject].
// A lesson deliberately omitted here falls back to its subject-level set in
// subjectSets (used when that set already matches the lesson's topic exactly).
// ---------------------------------------------------------------------------

export const lessonSets = {
  // ------------------------------------------------------------------ BIOLOGY
  biology: {
    // (cell-structure intentionally omitted → subjectSets.biology cell diagram)
    // Diffusion & Osmosis — match each transport process to its description.
    "osmosis-diffusion": {
      title: "Transport in and out of Cells",
      subtitle: "Drag each process to its correct description.",
      kind: "match",
      pairs: [
        { id: "b1", target: "Particles spread from a high to a low concentration", label: "Diffusion" },
        { id: "b2", target: "Water moves across a partially permeable membrane", label: "Osmosis" },
        { id: "b3", target: "Uses energy to move particles against the gradient", label: "Active transport" },
        { id: "b4", target: "A solution with a lower solute concentration", label: "Hypotonic" },
        { id: "b5", target: "A solution with a higher solute concentration", label: "Hypertonic" },
      ],
    },
    // Photosynthesis — sort inputs vs products.
    photosynthesis: {
      title: "Photosynthesis Inputs and Products",
      subtitle: "Sort each substance into Input (needed) or Product (made).",
      kind: "sort",
      categories: [
        { id: "in", label: "Inputs" },
        { id: "out", label: "Products" },
      ],
      items: [
        { id: "p1", label: "Carbon dioxide", category: "in" },
        { id: "p2", label: "Water", category: "in" },
        { id: "p3", label: "Light energy", category: "in" },
        { id: "p4", label: "Glucose", category: "out" },
        { id: "p5", label: "Oxygen", category: "out" },
      ],
    },
    // Circulatory System — order the path of blood through the heart.
    "circulatory-system": {
      title: "Pathway of Blood Through the Heart",
      subtitle: "Arrange the route blood takes in the correct order.",
      kind: "order",
      items: [
        { id: "c1", label: "Deoxygenated blood enters the right atrium via the vena cava", order: 1 },
        { id: "c2", label: "Blood moves into the right ventricle", order: 2 },
        { id: "c3", label: "Pumped to the lungs via the pulmonary artery", order: 3 },
        { id: "c4", label: "Oxygenated blood returns via the pulmonary vein", order: 4 },
        { id: "c5", label: "Blood enters the left atrium", order: 5 },
        { id: "c6", label: "Pumped out to the body through the aorta", order: 6 },
      ],
    },
    // Respiration — match respiration type to its equation/description.
    respiration: {
      title: "Aerobic or Anaerobic?",
      subtitle: "Match each statement to the correct type of respiration.",
      kind: "match",
      pairs: [
        { id: "r1", target: "Glucose + oxygen → carbon dioxide + water + energy", label: "Aerobic respiration" },
        { id: "r2", target: "Occurs with oxygen and releases the most energy", label: "Aerobic respiration" },
        { id: "r3", target: "Glucose → lactic acid + a little energy (in muscles)", label: "Anaerobic respiration" },
        { id: "r4", target: "Glucose → ethanol + carbon dioxide + energy (in yeast)", label: "Anaerobic respiration" },
        { id: "r5", target: "Occurs without oxygen and releases little energy", label: "Anaerobic respiration" },
      ],
    },
    // Excretion & Homeostasis — match organ to its role.
    "excretion-homeostasis": {
      title: "Organs and Their Roles",
      subtitle: "Match each organ to its excretory or homeostatic role.",
      kind: "match",
      pairs: [
        { id: "e1", target: "Remove urea and excess water as urine", label: "Kidneys" },
        { id: "e2", target: "Remove carbon dioxide from the blood", label: "Lungs" },
        { id: "e3", target: "Remove water, salts and heat through sweat", label: "Skin" },
        { id: "e4", target: "Converts excess amino acids into urea", label: "Liver" },
        { id: "e5", target: "Controls body temperature and blood sugar", label: "Hormones (endocrine)" },
      ],
    },
    // Food Chains & Webs — order the food chain.
    "food-chains": {
      title: "Build the Food Chain",
      subtitle: "Arrange the organisms in the correct energy-flow order.",
      kind: "order",
      items: [
        { id: "fc1", label: "Grass (producer)", order: 1 },
        { id: "fc2", label: "Grasshopper (primary consumer)", order: 2 },
        { id: "fc3", label: "Frog (secondary consumer)", order: 3 },
        { id: "fc4", label: "Snake (tertiary consumer)", order: 4 },
        { id: "fc5", label: "Hawk (apex consumer)", order: 5 },
      ],
    },
    // Human Impact — match activity to its environmental effect.
    "human-impact": {
      title: "Human Activities and Their Effects",
      subtitle: "Match each human activity to its environmental effect.",
      kind: "match",
      pairs: [
        { id: "h1", target: "Increased atmospheric CO₂ and global warming", label: "Burning fossil fuels" },
        { id: "h2", target: "Loss of habitats and a smaller carbon sink", label: "Deforestation" },
        { id: "h3", target: "Decline in fish populations", label: "Overfishing" },
        { id: "h4", target: "Harms non-target species", label: "Using pesticides" },
        { id: "h5", target: "Water pollution and eutrophication", label: "Dumping untreated sewage" },
      ],
    },
    // DNA & Inheritance — match genotype to its meaning.
    "dna-inheritance": {
      title: "Genotypes and Phenotypes",
      subtitle: "Match each genotype to what it describes.",
      kind: "match",
      pairs: [
        { id: "d1", target: "Homozygous dominant — shows the dominant trait", label: "BB" },
        { id: "d2", target: "Heterozygous — shows the dominant trait", label: "Bb" },
        { id: "d3", target: "Homozygous recessive — shows the recessive trait", label: "bb" },
        { id: "d4", target: "The physical appearance of an organism", label: "Phenotype" },
        { id: "d5", target: "The genetic make-up of an organism", label: "Genotype" },
      ],
    },
    // Natural Selection & Evolution — match concept to definition.
    "selection-evolution": {
      title: "Evolution and Natural Selection",
      subtitle: "Match each concept to its definition.",
      kind: "match",
      pairs: [
        { id: "s1", target: "Best-adapted organisms survive and reproduce", label: "Natural selection" },
        { id: "s2", target: "Differences between individuals of the same species", label: "Variation" },
        { id: "s3", target: "A sudden random change in DNA creating new variation", label: "Mutation" },
        { id: "s4", target: "A characteristic that helps an organism survive", label: "Adaptation" },
        { id: "s5", target: "The formation of a new species over time", label: "Speciation" },
      ],
    },
  },

  // --------------------------------------------------- INFORMATION TECHNOLOGY
  "information-technology": {
    // Hardware & Software — sort items as hardware or software.
    "it-l1-1": {
      title: "Hardware or Software?",
      subtitle: "Sort each item into Hardware (physical) or Software (programs).",
      kind: "sort",
      categories: [
        { id: "hw", label: "Hardware" },
        { id: "sw", label: "Software" },
      ],
      items: [
        { id: "i1", label: "CPU", category: "hw" },
        { id: "i2", label: "RAM", category: "hw" },
        { id: "i3", label: "Monitor", category: "hw" },
        { id: "i4", label: "Operating system", category: "sw" },
        { id: "i5", label: "Word processor", category: "sw" },
        { id: "i6", label: "Web browser", category: "sw" },
      ],
    },
    // Data Representation — match binary / number systems.
    "it-l1-2": {
      title: "Binary and Number Systems",
      subtitle: "Match each value or system to its meaning.",
      kind: "match",
      pairs: [
        { id: "dr1", target: "13 (in denary)", label: "1101₂" },
        { id: "dr2", target: "10 (in denary)", label: "1010₂" },
        { id: "dr3", target: "Base 2", label: "Binary" },
        { id: "dr4", target: "Base 10", label: "Denary" },
        { id: "dr5", target: "Base 16", label: "Hexadecimal" },
        { id: "dr6", target: "8 bits", label: "1 byte" },
      ],
    },
    // Algorithms & Flowcharts — match flowchart symbol to purpose.
    "it-l2-1": {
      title: "Flowchart Symbols",
      subtitle: "Match each flowchart symbol to its purpose.",
      kind: "match",
      pairs: [
        { id: "al1", target: "Start / End (terminator)", label: "Oval" },
        { id: "al2", target: "A process or calculation", label: "Rectangle" },
        { id: "al3", target: "A decision (yes / no)", label: "Diamond" },
        { id: "al4", target: "Input or output of data", label: "Parallelogram" },
        { id: "al5", target: "Shows the direction of flow", label: "Arrow" },
      ],
    },
    // Programming Constructs — match construct to its example.
    "it-l2-2": {
      title: "Programming Constructs",
      subtitle: "Match each programming construct to its example.",
      kind: "match",
      pairs: [
        { id: "pc1", target: "Lines of code that run one after another", label: "Sequence" },
        { id: "pc2", target: "Choosing a path — IF ... THEN ... ELSE", label: "Selection" },
        { id: "pc3", target: "Repeating code — WHILE loop / FOR loop", label: "Iteration" },
        { id: "pc4", target: "A named location that stores a value", label: "Variable" },
        { id: "pc5", target: "The remainder left after division", label: "Modulus" },
      ],
    },
    // Database Design — match term to definition.
    "it-l3-1": {
      title: "Database Terms",
      subtitle: "Match each database term to its definition.",
      kind: "match",
      pairs: [
        { id: "db1", target: "A unique identifier for each record", label: "Primary key" },
        { id: "db2", target: "A field that links two tables together", label: "Foreign key" },
        { id: "db3", target: "A single column in a table", label: "Field" },
        { id: "db4", target: "A single row of data in a table", label: "Record" },
        { id: "db5", target: "Defines what a field can store (text, number, date)", label: "Data type" },
      ],
    },
    // Queries & Reports — match SQL clause to its function.
    "it-l3-2": {
      title: "Writing Queries",
      subtitle: "Match each SQL clause to what it does.",
      kind: "match",
      pairs: [
        { id: "q1", target: "Chooses which fields to display", label: "SELECT" },
        { id: "q2", target: "Specifies which table to query", label: "FROM" },
        { id: "q3", target: "Filters records by a condition", label: "WHERE" },
        { id: "q4", target: "Sorts the results", label: "ORDER BY" },
        { id: "q5", target: "Gathers records by a field", label: "GROUP BY" },
      ],
    },
    // Network Topologies — match topology to description.
    "it-l4-1": {
      title: "Network Topologies",
      subtitle: "Match each network topology to its description.",
      kind: "match",
      pairs: [
        { id: "nt1", target: "All devices connect to a central switch or hub", label: "Star" },
        { id: "nt2", target: "All devices share a single backbone cable", label: "Bus" },
        { id: "nt3", target: "Devices are connected in a closed loop", label: "Ring" },
        { id: "nt4", target: "Each device connects to several others", label: "Mesh" },
        { id: "nt5", target: "A network covering a single site or building", label: "LAN" },
      ],
    },
    // Internet Security & Ethics — sort safe vs unsafe practices.
    "it-l4-2": {
      title: "Staying Safe Online",
      subtitle: "Sort each practice into Safe or Unsafe.",
      kind: "sort",
      categories: [
        { id: "safe", label: "Safe practice" },
        { id: "unsafe", label: "Unsafe practice" },
      ],
      items: [
        { id: "is1", label: "Using strong, unique passwords", category: "safe" },
        { id: "is2", label: "Enabling two-factor authentication", category: "safe" },
        { id: "is3", label: "Keeping software up to date", category: "safe" },
        { id: "is4", label: "Clicking unknown links in emails", category: "unsafe" },
        { id: "is5", label: "Sharing passwords with others", category: "unsafe" },
        { id: "is6", label: "Downloading from untrusted sites", category: "unsafe" },
      ],
    },
    // HTML Fundamentals — match tag to purpose.
    "it-l5-1": {
      title: "HTML Tags",
      subtitle: "Match each HTML tag to what it is used for.",
      kind: "match",
      pairs: [
        { id: "ht1", target: "The root element of the document", label: "<html>" },
        { id: "ht2", target: "Holds meta information and the title", label: "<head>" },
        { id: "ht3", target: "Contains the main visible content", label: "<body>" },
        { id: "ht4", target: "The main heading of a page", label: "<h1>" },
        { id: "ht5", target: "Inserts a hyperlink", label: "<a>" },
        { id: "ht6", target: "Inserts an image", label: "<img>" },
      ],
    },
    // Styling & Interactivity — match CSS property to its effect.
    "it-l5-2": {
      title: "CSS Properties",
      subtitle: "Match each CSS property to what it controls.",
      kind: "match",
      pairs: [
        { id: "cs1", target: "The colour of the text", label: "color" },
        { id: "cs2", target: "The background colour of an element", label: "background-color" },
        { id: "cs3", target: "The size of the text", label: "font-size" },
        { id: "cs4", target: "Space INSIDE an element's border", label: "padding" },
        { id: "cs5", target: "Space OUTSIDE an element's border", label: "margin" },
        { id: "cs6", target: "The outline around an element", label: "border" },
      ],
    },
    // Advanced Word Processing — match feature to purpose.
    "it-l6-1": {
      title: "Word Processing Tools",
      subtitle: "Match each feature to its purpose.",
      kind: "match",
      pairs: [
        { id: "wp1", target: "Combines a template with a data source to make letters", label: "Mail merge" },
        { id: "wp2", target: "Records edits made by reviewers", label: "Track changes" },
        { id: "wp3", target: "Reusable text and paragraph formatting", label: "Styles" },
        { id: "wp4", target: "Searches for text and swaps it with new text", label: "Find & Replace" },
        { id: "wp5", target: "Repeated text at the top or bottom of pages", label: "Headers / Footers" },
      ],
    },
    // Spreadsheets — match function to purpose.
    "it-l6-2": {
      title: "Spreadsheet Functions",
      subtitle: "Match each spreadsheet function to what it does.",
      kind: "match",
      pairs: [
        { id: "ss1", target: "Adds up the values in a range", label: "=SUM(A1:A10)" },
        { id: "ss2", target: "Finds the mean of a range", label: "=AVERAGE(A1:A10)" },
        { id: "ss3", target: "Finds the largest value in a range", label: "=MAX(A1:A10)" },
        { id: "ss4", target: "Returns one value if true and another if false", label: "=IF(...)" },
        { id: "ss5", target: "Counts the numeric cells in a range", label: "=COUNT(A1:A10)" },
      ],
    },
  },

  // ------------------------------------------------- PRINCIPLES OF ACCOUNTS
  // (accounting-equation → BalanceScale builder; statement-financial-position
  //  → subjectSets POA asset/liability/equity sort, both omitted here.)
  "principles-of-accounts": {
    // Accounting Concepts — match principle to its meaning.
    "accounting-concepts": {
      title: "Accounting Concepts",
      subtitle: "Match each principle to its meaning.",
      kind: "match",
      pairs: [
        { id: "ac1", target: "The business will continue operating in the future", label: "Going concern" },
        { id: "ac2", target: "Use the same accounting method year after year", label: "Consistency" },
        { id: "ac3", target: "Do not overstate assets or profits", label: "Prudence" },
        { id: "ac4", target: "Record income and expenses in the period they occur", label: "Matching" },
        { id: "ac5", target: "Business finances are separate from the owner's", label: "Business entity" },
      ],
    },
    // Double-entry Bookkeeping — match transaction to the ledger entries.
    "double-entry-system": {
      title: "Double-entry Bookkeeping",
      subtitle: "Match each transaction to the correct ledger entries.",
      kind: "match",
      pairs: [
        { id: "de1", target: "Debit Rent; Credit Cash", label: "Paid rent by cash" },
        { id: "de2", target: "Debit Cash; Credit Sales", label: "Received cash from a customer" },
        { id: "de3", target: "Debit Purchases; Credit Payables", label: "Bought goods on credit" },
        { id: "de4", target: "Debit Payables; Credit Bank", label: "Paid a supplier by cheque" },
        { id: "de5", target: "Debit Bank; Credit Capital", label: "Owner introduced capital" },
      ],
    },
    // Balancing the Ledger — order the balancing steps.
    "balancing-ledger": {
      title: "Balance the Ledger Account",
      subtitle: "Arrange the balancing steps in the correct order.",
      kind: "order",
      items: [
        { id: "bl1", label: "Total the debit side and the credit side", order: 1 },
        { id: "bl2", label: "Find the difference (balance) between the two sides", order: 2 },
        { id: "bl3", label: "Enter the smaller figure on the smaller side to balance", order: 3 },
        { id: "bl4", label: "Record the balance on the larger side", order: 4 },
        { id: "bl5", label: "Carry the balance down to the next period", order: 5 },
      ],
    },
    // Journals & Daybooks — match transaction to its daybook.
    "journals-daybooks": {
      title: "Which Daybook?",
      subtitle: "Match each transaction to the correct journal or daybook.",
      kind: "match",
      pairs: [
        { id: "jd1", target: "Sales journal", label: "Credit sales" },
        { id: "jd2", target: "Purchases journal", label: "Credit purchases" },
        { id: "jd3", target: "Returns outwards journal", label: "Goods returned to a supplier" },
        { id: "jd4", target: "Cash book", label: "Payment made in cash" },
        { id: "jd5", target: "Cash book", label: "Cheque received from a customer" },
      ],
    },
    // The Cash Book — sort cash vs bank transactions.
    "cash-book": {
      title: "Cash or Bank Column?",
      subtitle: "Sort each transaction into the Cash or Bank column.",
      kind: "sort",
      categories: [
        { id: "cash", label: "Cash column" },
        { id: "bank", label: "Bank column" },
      ],
      items: [
        { id: "cb1", label: "Receipts of coins and notes", category: "cash" },
        { id: "cb2", label: "Payments made in cash", category: "cash" },
        { id: "cb3", label: "Cheques received", category: "bank" },
        { id: "cb4", label: "Payments made by cheque", category: "bank" },
        { id: "cb5", label: "Direct deposits into the bank", category: "bank" },
      ],
    },
    // Preparing a Trial Balance — sort debit vs credit balances.
    "preparing-trial-balance": {
      title: "Debit or Credit Balance?",
      subtitle: "Sort each account into its normal trial-balance side.",
      kind: "sort",
      categories: [
        { id: "dr", label: "Debit balance" },
        { id: "cr", label: "Credit balance" },
      ],
      items: [
        { id: "tb1", label: "Cash at bank", category: "dr" },
        { id: "tb2", label: "Accounts receivable", category: "dr" },
        { id: "tb3", label: "Purchases", category: "dr" },
        { id: "tb4", label: "Drawings", category: "dr" },
        { id: "tb5", label: "Sales", category: "cr" },
        { id: "tb6", label: "Accounts payable (creditors)", category: "cr" },
        { id: "tb7", label: "Capital", category: "cr" },
        { id: "tb8", label: "Bank loan", category: "cr" },
      ],
    },
    // Types of Accounting Errors — match error to its type.
    "accounting-errors": {
      title: "Detect the Error",
      subtitle: "Match each error scenario to its type.",
      kind: "match",
      pairs: [
        { id: "ae1", target: "A transaction was completely left out of the books", label: "Error of omission" },
        { id: "ae2", target: "The right amount was entered in the wrong person's account", label: "Error of commission" },
        { id: "ae3", target: "An amount was entered in the wrong class of account", label: "Error of principle" },
        { id: "ae4", target: "Figures were recorded in the wrong order (e.g. 56 for 65)", label: "Transposition error" },
        { id: "ae5", target: "Two equal errors that offset one another", label: "Compensating error" },
      ],
    },
    // The Income Statement — sort income vs expenses.
    "income-statement": {
      title: "Income Statement Items",
      subtitle: "Sort each item into Income or Expense.",
      kind: "sort",
      categories: [
        { id: "inc", label: "Income" },
        { id: "exp", label: "Expense" },
      ],
      items: [
        { id: "is1", label: "Sales", category: "inc" },
        { id: "is2", label: "Rent received", category: "inc" },
        { id: "is3", label: "Discount received", category: "inc" },
        { id: "is4", label: "Cost of sales", category: "exp" },
        { id: "is5", label: "Wages", category: "exp" },
        { id: "is6", label: "Rent paid", category: "exp" },
        { id: "is7", label: "Office expenses", category: "exp" },
      ],
    },
    // Accruals & Prepayments — match adjustment to treatment.
    "accruals-prepayments": {
      title: "Accruals and Prepayments",
      subtitle: "Match each adjustment to its accounting treatment.",
      kind: "match",
      pairs: [
        { id: "ap1", target: "Expense owed but not yet paid — add to expenses", label: "Accrued expense" },
        { id: "ap2", target: "Expense already paid for a future period — deduct", label: "Prepaid expense" },
        { id: "ap3", target: "Income earned but not yet received", label: "Accrued income" },
        { id: "ap4", target: "Income received but not yet earned — a liability", label: "Income received in advance" },
      ],
    },
    // Depreciation — match method to its calculation.
    "depreciation-assets": {
      title: "Methods of Depreciation",
      subtitle: "Match each depreciation method to its calculation.",
      kind: "match",
      pairs: [
        { id: "dp1", target: "Cost − Residual value ÷ Useful life (equal each year)", label: "Straight-line method" },
        { id: "dp2", target: "A fixed % of the decreasing book value each year", label: "Reducing-balance method" },
        { id: "dp3", target: "Allocating an asset's cost over its useful life", label: "Depreciation" },
        { id: "dp4", target: "Cost − Accumulated depreciation", label: "Book value" },
        { id: "dp5", target: "The expected value of an asset at the end of its life", label: "Residual value" },
      ],
    },

  },
  // ------------------------------------------------------------- SOCIAL STUDIES
  "social-studies": {
    "ss-l1-1": {
      title: "Family Types",
      subtitle: "Match each family type to its structure.",
      kind: "match",
      pairs: [
        { id: "s1", target: "Parents and their children living together", label: "Nuclear family" },
        { id: "s2", target: "Parents, children, grandparents and other relatives", label: "Extended family" },
        { id: "s3", target: "One parent raising their child or children", label: "Single-parent family" },
        { id: "s4", target: "A remarried parent with children from a previous union", label: "Reconstituted family" },
      ],
    },
    "ss-l1-2": {
      title: "Roles and Responsibilities",
      subtitle: "Match each responsibility to the family role.",
      kind: "match",
      pairs: [
        { id: "s2a", target: "Providing financial support for the family", label: "Provider" },
        { id: "s2b", target: "Caring for and nurturing young children", label: "Nurturer" },
        { id: "s2c", target: "Teaching values and social norms", label: "Socializer" },
        { id: "s2d", target: "Maintaining the family home and household", label: "Homemaker" },
      ],
    },
    "ss-l2-1": {
      title: "Primary or Secondary Group?",
      subtitle: "Sort each group into Primary or Secondary.",
      kind: "sort",
      categories: [ { id: "pri", label: "Primary group" }, { id: "sec", label: "Secondary group" } ],
      items: [
        { id: "g1", label: "Immediate family", category: "pri" },
        { id: "g2", label: "Close childhood friends", category: "pri" },
        { id: "g3", label: "A school club", category: "sec" },
        { id: "g4", label: "A political party", category: "sec" },
        { id: "g5", label: "Work colleagues", category: "sec" },
      ],
    },
    "ss-l2-2": {
      title: "Social Institutions",
      subtitle: "Match each social need to the institution that meets it.",
      kind: "match",
      pairs: [
        { id: "si1", target: "Socializing children and providing care", label: "Family" },
        { id: "si2", target: "Providing education and knowledge", label: "Education" },
        { id: "si3", target: "Maintaining law and order", label: "Government/Legal" },
        { id: "si4", target: "Guiding moral and spiritual beliefs", label: "Religion" },
        { id: "si5", target: "Producing and distributing goods and services", label: "Economy" },
      ],
    },
    "ss-l3-1": {
      title: "Systems of Government",
      subtitle: "Match each system of government to its feature.",
      kind: "match",
      pairs: [
        { id: "gov1", target: "Citizens elect representatives to govern on their behalf", label: "Democracy" },
        { id: "gov2", target: "A monarch (king/queen) holds power, often inherited", label: "Monarchy" },
        { id: "gov3", target: "A single ruler or small group holds absolute power", label: "Dictatorship" },
        { id: "gov4", target: "The state controls most aspects of life", label: "Totalitarianism" },
      ],
    },
    "ss-l3-2": {
      title: "Branches of Government",
      subtitle: "Match each branch to its main function.",
      kind: "match",
      pairs: [
        { id: "br1", target: "Makes and passes laws", label: "Legislature" },
        { id: "br2", target: "Carries out and enforces the laws", label: "Executive" },
        { id: "br3", target: "Interprets laws and settles disputes", label: "Judiciary" },
      ],
    },
    "ss-l4-1": {
      title: "CARICOM Objectives",
      subtitle: "Match each CARICOM objective to its description.",
      kind: "match",
      pairs: [
        { id: "c1", target: "Strengthening cooperation among Caribbean states", label: "Regional integration" },
        { id: "c2", target: "Free movement of goods and services among members", label: "Trade and markets" },
        { id: "c3", target: "Improving the standard of living of the people", label: "Economic development" },
        { id: "c4", target: "Coordination of foreign policy among members", label: "Foreign policy coordination" },
      ],
    },
    "ss-l4-2": {
      title: "Caribbean Integration",
      subtitle: "Sort each statement into a Benefit or a Challenge.",
      kind: "sort",
      categories: [ { id: "ben", label: "Benefit" }, { id: "chal", label: "Challenge" } ],
      items: [
        { id: "iv1", label: "Larger combined market for goods", category: "ben" },
        { id: "iv2", label: "Bargaining power as a united region", category: "ben" },
        { id: "iv3", label: "Free movement of labour between members", category: "ben" },
        { id: "iv4", label: "Loss of some national sovereignty", category: "chal" },
        { id: "iv5", label: "Uneven economic size of member states", category: "chal" },
      ],
    },
    "ss-l5-1": {
      title: "Population Terms",
      subtitle: "Match each population term to its definition.",
      kind: "match",
      pairs: [
        { id: "pop1", target: "Number of births per 1000 people per year", label: "Birth rate" },
        { id: "pop2", target: "Number of deaths per 1000 people per year", label: "Death rate" },
        { id: "pop3", target: "Movement of people into or out of an area", label: "Migration" },
        { id: "pop4", target: "Difference between birth rate and death rate", label: "Natural increase" },
      ],
    },
    "ss-l5-2": {
      title: "Push and Pull Factors",
      subtitle: "Sort each factor into Push or Pull for migration.",
      kind: "sort",
      categories: [ { id: "push", label: "Push factor" }, { id: "pull", label: "Pull factor" } ],
      items: [
        { id: "m1", label: "Unemployment at home", category: "push" },
        { id: "m2", label: "Natural disasters", category: "push" },
        { id: "m3", label: "Political instability", category: "push" },
        { id: "m4", label: "Better job opportunities abroad", category: "pull" },
        { id: "m5", label: "Better education and healthcare", category: "pull" },
      ],
    },
    "ss-l6-1": {
      title: "Forms of Communication",
      subtitle: "Match each communication form to an example.",
      kind: "match",
      pairs: [
        { id: "com1", target: "Newspaper, letter, poster", label: "Written communication" },
        { id: "com2", target: "Phone call, face-to-face talk", label: "Verbal communication" },
        { id: "com3", target: "Facial expressions, body language", label: "Non-verbal communication" },
        { id: "com4", target: "Television, radio, internet", label: "Mass media" },
      ],
    },
    "ss-l6-2": {
      title: "Consumer Rights",
      subtitle: "Match each consumer right to its description.",
      kind: "match",
      pairs: [
        { id: "con1", target: "Products meet acceptable standards of quality and safety", label: "Right to safety" },
        { id: "con2", target: "Accurate information before purchase", label: "Right to information" },
        { id: "con3", target: "A choice among products and services", label: "Right to choose" },
        { id: "con4", target: "To be heard and make complaints", label: "Right to be heard" },
      ],
    },
  },

  // ------------------------------------------------- HUMAN & SOCIAL BIOLOGY
  "human-social-biology": {
    "hsb-l1-1": {
      title: "The Skeletal and Muscular Systems",
      subtitle: "Match each structure to its function.",
      kind: "match",
      pairs: [
        { id: "h1", target: "Supports the body and protects organs", label: "Skeleton" },
        { id: "h2", target: "Allows movement by contracting and relaxing", label: "Muscles" },
        { id: "h3", target: "The point where two bones meet", label: "Joint" },
        { id: "h4", target: "Produces red blood cells", label: "Bone marrow" },
      ],
    },
    "hsb-l1-2": {
      title: "Heart and Lungs",
      subtitle: "Arrange the route of blood through the heart and lungs.",
      kind: "order",
      items: [
        { id: "he1", label: "Blood enters the right atrium", order: 1 },
        { id: "he2", label: "Blood moves to the right ventricle", order: 2 },
        { id: "he3", label: "Pumped to the lungs to pick up oxygen", order: 3 },
        { id: "he4", label: "Oxygenated blood returns to the left atrium", order: 4 },
        { id: "he5", label: "Pumped from the left ventricle to the body", order: 5 },
      ],
    },
    "hsb-l2-1": {
      title: "Cell Structure",
      subtitle: "Match each cell part to its function.",
      kind: "match",
      pairs: [
        { id: "c1", target: "Controls the cell and contains DNA", label: "Nucleus" },
        { id: "c2", target: "Releases energy through respiration", label: "Mitochondria" },
        { id: "c3", target: "Controls what enters and leaves the cell", label: "Cell membrane" },
        { id: "c4", target: "A jelly-like fluid filling the cell", label: "Cytoplasm" },
      ],
    },
    "hsb-l2-2": {
      title: "Cell Division",
      subtitle: "Arrange the stages of mitosis in order.",
      kind: "order",
      items: [
        { id: "cd1", label: "Chromosomes become visible and shorten", order: 1 },
        { id: "cd2", label: "Chromosomes line up along the centre of the cell", order: 2 },
        { id: "cd3", label: "Chromatids are pulled apart to opposite poles", order: 3 },
        { id: "cd4", label: "Two new nuclei form and the cell divides", order: 4 },
      ],
    },
    "hsb-l3-1": {
      title: "Nutrients",
      subtitle: "Match each nutrient to its function.",
      kind: "match",
      pairs: [
        { id: "n1", target: "Provides energy", label: "Carbohydrates" },
        { id: "n2", target: "Builds and repairs body tissue", label: "Protein" },
        { id: "n3", target: "Provides stored energy and insulation", label: "Fats" },
        { id: "n4", target: "Helps prevent disease and keeps the body healthy", label: "Vitamins and minerals" },
      ],
    },
    "hsb-l3-2": {
      title: "Digestion and Absorption",
      subtitle: "Match each part of the digestive system to its role.",
      kind: "match",
      pairs: [
        { id: "d1", target: "Breaks down food using acid and enzymes", label: "Stomach" },
        { id: "d2", target: "Where most nutrients are absorbed", label: "Small intestine" },
        { id: "d3", target: "Absorbs water from undigested food", label: "Large intestine" },
        { id: "d4", target: "Produces bile to help digest fats", label: "Liver" },
      ],
    },
    "hsb-l4-1": {
      title: "Communicable or Non-communicable?",
      subtitle: "Sort each disease into the correct group.",
      kind: "sort",
      categories: [ { id: "comm", label: "Communicable" }, { id: "non", label: "Non-communicable" } ],
      items: [
        { id: "dis1", label: "Influenza", category: "comm" },
        { id: "dis2", label: "Tuberculosis", category: "comm" },
        { id: "dis3", label: "Chickenpox", category: "comm" },
        { id: "dis4", label: "Diabetes", category: "non" },
        { id: "dis5", label: "Cancer", category: "non" },
      ],
    },
    "hsb-l4-2": {
      title: "Immunity and Vaccination",
      subtitle: "Match each immune component to its function.",
      kind: "match",
      pairs: [
        { id: "im1", target: "White blood cells that destroy pathogens", label: "Phagocytes" },
        { id: "im2", target: "Cells that produce antibodies", label: "Lymphocytes" },
        { id: "im3", target: "Proteins that target specific pathogens", label: "Antibodies" },
        { id: "im4", target: "Exposing the body to a harmless form of a pathogen", label: "Vaccination" },
      ],
    },
    "hsb-l5-1": {
      title: "Water Purification",
      subtitle: "Arrange the steps of water treatment in order.",
      kind: "order",
      items: [
        { id: "w1", label: "Sedimentation — heavy particles settle", order: 1 },
        { id: "w2", label: "Filtration through sand and gravel", order: 2 },
        { id: "w3", label: "Chlorination — adding chlorine to kill germs", order: 3 },
        { id: "w4", label: "Distribution of clean water to homes", order: 4 },
      ],
    },
    "hsb-l5-2": {
      title: "Waste Disposal",
      subtitle: "Sort each waste item into the correct disposal group.",
      kind: "sort",
      categories: [ { id: "rec", label: "Recyclable" }, { id: "bio", label: "Biodegradable" }, { id: "nb", label: "Non-biodegradable" } ],
      items: [
        { id: "wa1", label: "Glass bottles", category: "rec" },
        { id: "wa2", label: "Aluminium cans", category: "rec" },
        { id: "wa3", label: "Fruit peels", category: "bio" },
        { id: "wa4", label: "Paper and cardboard", category: "bio" },
        { id: "wa5", label: "Plastic bags", category: "nb" },
      ],
    },
    "hsb-l6-1": {
      title: "Effects of Substances",
      subtitle: "Match each substance to its effect on the body.",
      kind: "match",
      pairs: [
        { id: "sub1", target: "Damages the lungs and causes breathlessness", label: "Smoking tobacco" },
        { id: "sub2", target: "Slows the nervous system and impairs coordination", label: "Alcohol" },
        { id: "sub3", target: "Stimulants that increase heart rate", label: "Caffeine" },
        { id: "sub4", target: "Highly addictive drugs that damage health and finances", label: "Illegal drugs" },
      ],
    },
    "hsb-l6-2": {
      title: "Family Planning",
      subtitle: "Match each contraceptive method to its description.",
      kind: "match",
      pairs: [
        { id: "fp1", target: "A physical barrier that prevents sperm reaching the egg", label: "Condom" },
        { id: "fp2", target: "Hormonal pills taken daily", label: "Oral contraceptive" },
        { id: "fp3", target: "A long-term implant fitted in the uterus", label: "IUD" },
        { id: "fp4", target: "Surgical sterilization for men", label: "Vasectomy" },
      ],
    },
  },

  // ---------------------------------------------------------------- SPANISH
  spanish: {
    "spa-l1-1": {
      title: "Greetings",
      subtitle: "Match each Spanish greeting to its English meaning.",
      kind: "match",
      pairs: [
        { id: "sp1", target: "Hello", label: "Hola" },
        { id: "sp2", target: "Good morning", label: "Buenos días" },
        { id: "sp3", target: "Good night", label: "Buenas noches" },
        { id: "sp4", target: "My name is...", label: "Me llamo..." },
      ],
    },
    "spa-l1-2": {
      title: "House and School Vocabulary",
      subtitle: "Match each Spanish word to its English meaning.",
      kind: "match",
      pairs: [
        { id: "spa1", target: "La casa", label: "House (the)" },
        { id: "spa2", target: "La escuela", label: "School (the)" },
        { id: "spa3", target: "La tienda", label: "Shop (the)" },
        { id: "spa4", target: "La comida", label: "Food (the)" },
      ],
    },
    "spa-l2-1": {
      title: "Articles and Gender",
      subtitle: "Sort each noun by the article it takes.",
      kind: "sort",
      categories: [ { id: "el", label: "el (masculine)" }, { id: "la", label: "la (feminine)" } ],
      items: [
        { id: "a1", label: "chico", category: "el" },
        { id: "a2", label: "libro", category: "el" },
        { id: "a3", label: "zapato", category: "el" },
        { id: "a4", label: "chica", category: "la" },
        { id: "a5", label: "casa", category: "la" },
      ],
    },
    "spa-l2-2": {
      title: "Verb Tenses",
      subtitle: "Match each verb form to its tense.",
      kind: "match",
      pairs: [
        { id: "vt1", target: "Present tense", label: "hablo (I speak)" },
        { id: "vt2", target: "Past tense", label: "hablé (I spoke)" },
        { id: "vt3", target: "Future tense", label: "hablaré (I will speak)" },
        { id: "vt4", target: "Present — he/she", label: "habla" },
      ],
    },
    "spa-l3-1": {
      title: "Build the Passage",
      subtitle: "Arrange these sentences into a logical passage.",
      kind: "order",
      items: [
        { id: "p1", label: "Me llamo María.", order: 1 },
        { id: "p2", label: "Soy de Trinidad.", order: 2 },
        { id: "p3", label: "Tengo dieciséis años.", order: 3 },
        { id: "p4", label: "Vivo en Puerto España.", order: 4 },
      ],
    },
    "spa-l3-2": {
      title: "Public Signs",
      subtitle: "Match each Spanish sign to its meaning.",
      kind: "match",
      pairs: [
        { id: "sg1", target: "Entrance", label: "Entrada" },
        { id: "sg2", target: "Exit", label: "Salida" },
        { id: "sg3", target: "Open", label: "Abierto" },
        { id: "sg4", target: "Closed", label: "Cerrado" },
      ],
    },
    "spa-l4-1": {
      title: "Build the Email",
      subtitle: "Arrange the phrases to build a short email.",
      kind: "order",
      items: [
        { id: "e1", label: "Querido amigo,", order: 1 },
        { id: "e2", label: "Espero que estés bien.", order: 2 },
        { id: "e3", label: "Te escribo para invitarte a mi fiesta.", order: 3 },
        { id: "e4", label: "Un abrazo,", order: 4 },
      ],
    },
    "spa-l4-2": {
      title: "Write a Narrative",
      subtitle: "Arrange the sentences to create a short narrative.",
      kind: "order",
      items: [
        { id: "n1", label: "Ayer fui al mercado.", order: 1 },
        { id: "n2", label: "Compré frutas y verduras.", order: 2 },
        { id: "n3", label: "Después volví a casa.", order: 3 },
        { id: "n4", label: "Hice una ensalada deliciosa.", order: 4 },
      ],
    },
    "spa-l5-1": {
      title: "Role-Play Phrases",
      subtitle: "Match each phrase to its role-play context.",
      kind: "match",
      pairs: [
        { id: "r1", target: "At the doctor's", label: "Me duele la cabeza." },
        { id: "r2", target: "In a shop", label: "¿Cuánto cuesta?" },
        { id: "r3", target: "At a restaurant", label: "La cuenta, por favor." },
        { id: "r4", target: "Asking directions", label: "¿Dónde está el banco?" },
      ],
    },
    "spa-l5-2": {
      title: "Pronunciation",
      subtitle: "Match each Spanish word to its sound.",
      kind: "match",
      pairs: [
        { id: "pr1", target: "/ˈxwese/", label: "jueves" },
        { id: "pr2", target: "/ˈβeɾðe/", label: "verde" },
        { id: "pr3", target: "/ˈkaʝe/", label: "calle" },
        { id: "pr4", target: "/ˈpex/", label: "peje" },
      ],
    },
    "spa-l6-1": {
      title: "Festivals",
      subtitle: "Match each festival to its description.",
      kind: "match",
      pairs: [
        { id: "f1", target: "Carnival — costumes and street parades", label: "Carnaval" },
        { id: "f2", target: "A colourful celebration of culture", label: "Fiesta" },
        { id: "f3", target: "Independence celebration", label: "Día de la Independencia" },
      ],
    },
    "spa-l6-2": {
      title: "Notable Figures",
      subtitle: "Match each figure to their contribution.",
      kind: "match",
      pairs: [
        { id: "nf1", target: "A famous novelist, author of Don Quixote", label: "Cervantes" },
        { id: "nf2", target: "A celebrated painter from Spain", label: "Picasso" },
        { id: "nf3", target: "A renowned Latin American singer", label: "Celia Cruz" },
      ],
    },
  },
  // ------------------------------------------------------------------ ENGLISH B
  "english-b": {
    // The Three Genres — match each kind of writing to its feature.
    "eb-l1-1": {
    title: "The Three Genres of Literature",
    subtitle: "Match each kind of writing to its key feature.",
    kind: "match",
    pairs: [
      { id: "g1", target: "Written in lines and stanzas, using imagery, rhythm and sound", label: "Poetry" },
      { id: "g2", target: "Written in sentences and paragraphs and told by a narrator", label: "Prose fiction" },
      { id: "g3", target: "Written to be performed, using dialogue and stage directions", label: "Drama" },
      { id: "g4", target: "Writing about real people, events and ideas", label: "Non-fiction prose" },
      { id: "g5", target: "A category of writing such as prose, poetry or drama", label: "Genre" },
    ],
    },
    // Literal or Inferential? — sort each question by the kind of reading it needs.
    "eb-l1-2": {
    title: "Literal or Inferential?",
    subtitle: "Sort each question into Literal (answered directly by the text) or Inferential (you must work it out).",
    kind: "sort",
    categories: [
      { id: "lit", label: "Literal" },
      { id: "inf", label: "Inferential" },
    ],
    items: [
      { id: "q1", label: "What colour was the gate?", category: "lit" },
      { id: "q2", label: "Where does the scene take place?", category: "lit" },
      { id: "q3", label: "How many brothers does the narrator have?", category: "lit" },
      { id: "q4", label: "How does the speaker feel about leaving?", category: "inf" },
      { id: "q5", label: "What is the writer's attitude to the crowd?", category: "inf" },
      { id: "q6", label: "Why does the character fall silent?", category: "inf" },
    ],
    },
    // Subject and Theme — match each subject to the theme it explores.
    "eb-l1-3": {
    title: "Subject and Theme",
    subtitle: "Match each subject to the theme it most naturally explores.",
    kind: "match",
    pairs: [
      { id: "t1", target: "A family rebuilding after a hurricane", label: "Resilience" },
      { id: "t2", target: "A boy leaving his village for the city", label: "Identity and belonging" },
      { id: "t3", target: "A community divided over a new road", label: "Conflict and change" },
      { id: "t4", target: "An old fisherman teaching his grandchild", label: "Tradition and inheritance" },
      { id: "t5", target: "The idea a text explores through its subject", label: "Theme" },
    ],
    },
    // Poetic Devices — match each quotation to the device it uses.
    "eb-l2-1": {
    title: "Poetic Devices",
    subtitle: "Match each quotation to the device it uses.",
    kind: "match",
    pairs: [
      { id: "d1", target: "Her voice was like gravel on a road", label: "Simile" },
      { id: "d2", target: "The classroom was a beehive", label: "Metaphor" },
      { id: "d3", target: "The mango tree stretched its arms across the yard", label: "Personification" },
      { id: "d4", target: "I have told you a million times", label: "Hyperbole" },
      { id: "d5", target: "A deafening silence", label: "Oxymoron" },
      { id: "d6", target: "crash, hiss, clatter", label: "Onomatopoeia" },
    ],
    },
    // Sound and Form — match each term to its definition.
    "eb-l2-2": {
    title: "Sound, Rhythm and Form",
    subtitle: "Match each term to its definition.",
    kind: "match",
    pairs: [
      { id: "s1", target: "A regular pattern of stressed and unstressed syllables", label: "Metre" },
      { id: "s2", target: "The pattern of end rhymes across a poem", label: "Rhyme scheme" },
      { id: "s3", target: "A sentence that runs past the end of a line", label: "Enjambment" },
      { id: "s4", target: "A line repeated at intervals, often at the end of stanzas", label: "Refrain" },
      { id: "s5", target: "A pause inside a line of poetry", label: "Caesura" },
      { id: "s6", target: "Poetry with no regular rhyme or metre", label: "Free verse" },
    ],
    },
    // Tone Words — match each tone word to what it describes.
    "eb-l2-3": {
    title: "Tone and Mood",
    subtitle: "Match each tone word or term to what it describes.",
    kind: "match",
    pairs: [
      { id: "tn1", target: "Admiring and deeply respectful", label: "Reverent" },
      { id: "tn2", target: "Longing for something or somewhere in the past", label: "Nostalgic" },
      { id: "tn3", target: "Calm and untroubled", label: "Serene" },
      { id: "tn4", target: "Bitter and resentful about a wrong", label: "Acrimonious" },
      { id: "tn5", target: "The speaker's attitude towards the subject", label: "Tone" },
      { id: "tn6", target: "The feeling the poem creates in the reader", label: "Mood" },
    ],
    },
    // Parts of a Play — sort each element into what it controls.
    "eb-l3-1": {
    title: "Elements of Drama",
    subtitle: "Sort each element by what it controls: Plot & Action, Character, or Staging.",
    kind: "sort",
    categories: [
      { id: "act", label: "Plot & Action" },
      { id: "char", label: "Character" },
      { id: "stage", label: "Staging" },
    ],
    items: [
      { id: "e1", label: "The exposition that introduces the situation", category: "act" },
      { id: "e2", label: "The climax, where tension is highest", category: "act" },
      { id: "e3", label: "A stage direction that the lamp is switched on", category: "stage" },
      { id: "e4", label: "The yard and verandah the play is set in", category: "stage" },
      { id: "e5", label: "A soliloquy that reveals the speaker's motive", category: "char" },
      { id: "e6", label: "Dialogue in which two sisters argue", category: "char" },
    ],
    },
    // Dramatic Techniques — match each technique to its effect.
    "eb-l3-2": {
    title: "Dramatic Techniques and Conflict",
    subtitle: "Match each technique to the effect it creates.",
    kind: "match",
    pairs: [
      { id: "dt1", target: "The audience knows what a character does not", label: "Dramatic irony" },
      { id: "dt2", target: "A brief remark the other characters cannot hear", label: "Aside" },
      { id: "dt3", target: "A long speech alone on stage, revealing private thoughts", label: "Soliloquy" },
      { id: "dt4", target: "Hints planted early about what will happen later", label: "Foreshadowing" },
      { id: "dt5", target: "Two contrasting scenes placed side by side", label: "Dramatic juxtaposition" },
      { id: "dt6", target: "A struggle between a character and her own conscience", label: "Internal conflict" },
    ],
    },
    // Character and Motive — match each action to the motive behind it.
    "eb-l3-3": {
    title: "Character, Motivation and Theme",
    subtitle: "Match each action to the motive that best explains it.",
    kind: "match",
    pairs: [
      { id: "m1", target: "She hides the letter from her brother", label: "Fear of the truth coming out" },
      { id: "m2", target: "He works two jobs and never complains", label: "Duty to family" },
      { id: "m3", target: "She refuses a scholarship to stay home", label: "Sacrifice for others" },
      { id: "m4", target: "He takes the blame for his friend's mistake", label: "Loyalty" },
      { id: "m5", target: "She pretends not to know him in the market", label: "Shame and social ambition" },
      { id: "m6", target: "He gives away the last of his money", label: "Generosity or guilt" },
    ],
    },
    // Plot Structure — arrange the stages of a story in order.
    "eb-l4-1": {
    title: "Plot, Conflict and Structure",
    subtitle: "Arrange the stages of a plot in the order they occur.",
    kind: "order",
    items: [
      { id: "ps1", label: "Exposition — setting, characters and situation established", order: 1 },
      { id: "ps2", label: "Complication — the balance is disturbed", order: 2 },
      { id: "ps3", label: "Rising action — conflict builds through events", order: 3 },
      { id: "ps4", label: "Climax — the moment of highest tension or decisive choice", order: 4 },
      { id: "ps5", label: "Falling action — the consequences unfold", order: 5 },
      { id: "ps6", label: "Resolution — the outcome settles, or is left open", order: 6 },
    ],
    },
    // Narrative Voice — match each narrator or method to its description.
    "eb-l4-2": {
    title: "Characterisation and Point of View",
    subtitle: "Match each narrator or method to its description.",
    kind: "match",
    pairs: [
      { id: "n1", target: "Uses 'I' and may be unreliable", label: "First-person narrator" },
      { id: "n2", target: "Knows the thoughts of every character", label: "Omniscient narrator" },
      { id: "n3", target: "Stays close to one character's thoughts", label: "Third-person limited narrator" },
      { id: "n4", target: "Reports only what can be seen and heard", label: "Objective narrator" },
      { id: "n5", target: "Shows what a character is like through her actions", label: "Indirect characterisation" },
      { id: "n6", target: "Tells the reader directly what a character is like", label: "Direct characterisation" },
    ],
    },
    // Setting and Symbol — match each term to its example.
    "eb-l4-3": {
    title: "Setting, Atmosphere and Symbolism",
    subtitle: "Match each term to its example or meaning.",
    kind: "match",
    pairs: [
      { id: "sy1", target: "A storm breaking during a family quarrel", label: "Pathetic fallacy" },
      { id: "sy2", target: "The feeling a place creates for the reader", label: "Atmosphere" },
      { id: "sy3", target: "A locked gate that stands for exclusion", label: "Symbol" },
      { id: "sy4", target: "The time and social world of a story", label: "Setting" },
      { id: "sy5", target: "Language that appeals to the five senses", label: "Imagery" },
      { id: "sy6", target: "The object or place a story keeps returning to", label: "Motif" },
    ],
    },
    // Building an Argument — arrange the moves of a non-fiction piece in order.
    "eb-l5-1": {
    title: "Purpose, Audience and Form",
    subtitle: "Arrange the moves of a persuasive article in the order that works best.",
    kind: "order",
    items: [
      { id: "ar1", label: "Open with an anecdote or a striking claim", order: 1 },
      { id: "ar2", label: "State the claim the writer wants accepted", order: 2 },
      { id: "ar3", label: "Support the claim with evidence and examples", order: 3 },
      { id: "ar4", label: "Answer the strongest counter-argument", order: 4 },
      { id: "ar5", label: "Close with an appeal or a recommendation", order: 5 },
    ],
    },
    // Appeals in Persuasion — sort each extract by the appeal it makes.
    "eb-l5-2": {
    title: "Persuasive and Emotive Language",
    subtitle: "Sort each extract by its main appeal: Reason (logos), Trust (ethos) or Emotion (pathos).",
    kind: "sort",
    categories: [
      { id: "logos", label: "Reason (logos)" },
      { id: "ethos", label: "Trust (ethos)" },
      { id: "pathos", label: "Emotion (pathos)" },
    ],
    items: [
      { id: "ap1", label: "A national survey of 2,000 households found a 12% rise in rent", category: "logos" },
      { id: "ap2", label: "Figures from the Ministry show the road carries 9,000 vehicles a day", category: "logos" },
      { id: "ap3", label: "As a nurse of twenty years, I have watched children leave in ambulances", category: "ethos" },
      { id: "ap4", label: "The Consumers' Association supports this proposal", category: "ethos" },
      { id: "ap5", label: "Picture a child walking four miles with an empty bucket", category: "pathos" },
      { id: "ap6", label: "Do we really want our children to breathe this air?", category: "pathos" },
    ],
    },
    // Critical Reading — sort each statement as fact, opinion or unverifiable claim.
    "eb-l5-3": {
    title: "Reading Non-Fiction Critically",
    subtitle: "Sort each statement: Fact (can be checked), Opinion (a judgement) or Unverifiable claim (source unnamed).",
    kind: "sort",
    categories: [
      { id: "fact", label: "Fact" },
      { id: "op", label: "Opinion" },
      { id: "uv", label: "Unverifiable claim" },
    ],
    items: [
      { id: "cs1", label: "Rainfall in the parish rose by 14% last year", category: "fact" },
      { id: "cs2", label: "The school has 640 students on roll", category: "fact" },
      { id: "cs3", label: "The council is the worst in the country", category: "op" },
      { id: "cs4", label: "The new market is badly designed", category: "op" },
      { id: "cs5", label: "Experts say the situation is getting worse", category: "uv" },
      { id: "cs6", label: "It is widely believed that the road will be repaired", category: "uv" },
    ],
    },
    // Planning an Essay — arrange the planning steps in order.
    "eb-l6-1": {
    title: "Planning and Structuring a Literature Essay",
    subtitle: "Arrange the steps of planning a literature essay in the order you should do them.",
    kind: "order",
    items: [
      { id: "pl1", label: "Unpack the question and identify its focus", order: 1 },
      { id: "pl2", label: "Decide the line of argument you will defend", order: 2 },
      { id: "pl3", label: "Select three or four moments that support it", order: 3 },
      { id: "pl4", label: "Write a topic sentence for each body paragraph", order: 4 },
      { id: "pl5", label: "Plan a conclusion that answers the question asked", order: 5 },
    ],
    },
    // Using Evidence — match each technique to what it means.
    "eb-l6-2": {
    title: "Using Quotations and Evidence",
    subtitle: "Match each technique to what it means in practice.",
    kind: "match",
    pairs: [
      { id: "ev1", target: "A few words of the text inside your own sentence", label: "Short embedded quotation" },
      { id: "ev2", target: "Restating a moment accurately when you cannot recall the words", label: "Paraphrase" },
      { id: "ev3", target: "Point, evidence, explanation", label: "PEE structure" },
      { id: "ev4", target: "Asking why the writer chose 'sea' rather than 'field'", label: "Word-level analysis" },
      { id: "ev5", target: "Copying out four lines and leaving them unexplained", label: "Block quotation (to avoid)" },
      { id: "ev6", target: "Using evidence that supports the point you have made", label: "Relevant evidence" },
    ],
    },
    // Command Words — match each command word to what the examiner wants.
    "eb-l6-3": {
    title: "Writing Under Examination Conditions",
    subtitle: "Match each command word to what it asks you to do.",
    kind: "match",
    pairs: [
      { id: "cw1", target: "Give a fact or a single brief point", label: "State" },
      { id: "cw2", target: "Give details about what something is like", label: "Describe" },
      { id: "cw3", target: "Give reasons for something", label: "Explain" },
      { id: "cw4", target: "Present both sides and reach a judgement", label: "Discuss" },
      { id: "cw5", target: "Show similarities and differences", label: "Compare" },
      { id: "cw6", target: "Judge against criteria and conclude", label: "Evaluate" },
    ],
    },
  },
  // ------------------------------------------- CLOTHING, TEXTILE AND FASHION
  "clothing-textile-and-fashion": {
    // Natural Fibres — match each fibre to the description that fits it.
    "ctf-l1-1": {
      title: "Natural Fibres and their Properties",
      subtitle: "Drag each fibre to the description that matches it.",
      kind: "match",
      pairs: [
        { id: "f1", target: "From the seed boll of a plant; absorbent, cool and strong when wet", label: "Cotton" },
        { id: "f2", target: "From the stalk of a plant; crisp, cool and creases easily", label: "Linen" },
        { id: "f3", target: "From the cocoon of a moth larva; smooth, lustrous and expensive", label: "Silk" },
        { id: "f4", target: "From the fleece of a sheep; warm, resilient and shrinks if washed badly", label: "Wool" },
        { id: "f5", target: "From the leaves of a plant; hard-wearing, used for rope and sacking", label: "Manila hemp" },
      ],
    },
    // Man-made fibres and fabric construction — match term to description.
    "ctf-l1-2": {
      title: "Man-made Fibres and Fabric Construction",
      subtitle: "Drag each term to the description that matches it.",
      kind: "match",
      pairs: [
        { id: "m1", target: "A synthetic fibre made from petroleum; strong, quick-drying, used for sportswear", label: "Polyester" },
        { id: "m2", target: "A regenerated fibre made from wood pulp; soft, absorbent and drapes well", label: "Viscose (rayon)" },
        { id: "m3", target: "A synthetic fibre with high stretch and recovery; used in swimwear", label: "Spandex (elastane)" },
        { id: "m4", target: "Made by interlacing warp and weft threads on a loom; firm and does not stretch", label: "Woven fabric" },
        { id: "m5", target: "Made from interlocking loops of yarn; stretches and does not fray", label: "Knitted fabric" },
        { id: "m6", target: "Made by bonding fibres with heat or adhesive instead of weaving", label: "Non-woven fabric" },
      ],
    },
    // Care labels and laundering — match the care symbol to what it means.
    "ctf-l1-3": {
      title: "Reading a Care Label",
      subtitle: "Drag each instruction to the care symbol it belongs to.",
      kind: "match",
      pairs: [
        { id: "c1", target: "A washtub with the number 40 written inside it", label: "Machine wash at 40 °C" },
        { id: "c2", target: "A triangle with a cross through it", label: "Do not bleach" },
        { id: "c3", target: "A square with a circle inside it and one dot", label: "Tumble dry on low heat" },
        { id: "c4", target: "An iron containing one dot", label: "Iron on a cool setting" },
        { id: "c5", target: "A circle with a cross through it", label: "Do not dry clean" },
      ],
    },
    // Tools and the sewing machine — match each tool or part to its job.
    "ctf-l2-1": {
      title: "Tools, Equipment and the Sewing Machine",
      subtitle: "Drag each tool or machine part to the job it does.",
      kind: "match",
      pairs: [
        { id: "t1", target: "Used to take body measurements accurately", label: "Tape measure" },
        { id: "t2", target: "Used to cut fabric and can be re-sharpened by a professional", label: "Dressmaker's shears" },
        { id: "t3", target: "Used to unpick a line of stitching without cutting the fabric", label: "Seam ripper" },
        { id: "t4", target: "Holds the fabric layers together temporarily before stitching", label: "Pins" },
        { id: "t5", target: "Carries the thread down through the fabric to form the stitch", label: "Machine needle" },
        { id: "t6", target: "Sets how long each machine stitch is", label: "Stitch length regulator" },
      ],
    },
    // Hand and machine stitches — sort each stitch by how it is made.
    "ctf-l2-2": {
      title: "Hand and Machine Stitches",
      subtitle: "Sort each stitch into Hand stitch or Machine stitch.",
      kind: "sort",
      categories: [
        { id: "hand", label: "Hand stitch" },
        { id: "mach", label: "Machine stitch" },
      ],
      items: [
        { id: "s1", label: "Running stitch", category: "hand" },
        { id: "s2", label: "Backstitch", category: "hand" },
        { id: "s3", label: "Blanket stitch", category: "hand" },
        { id: "s4", label: "Chain stitch used as embroidery", category: "hand" },
        { id: "s5", label: "Straight stitch", category: "mach" },
        { id: "s6", label: "Zigzag stitch", category: "mach" },
        { id: "s7", label: "Overlocking to neaten a raw edge", category: "mach" },
        { id: "s8", label: "Stay-stitching a curved neckline", category: "mach" },
      ],
    },
    // Taking measurements — match each body measurement to its description.
    "ctf-l2-3": {
      title: "Taking Body Measurements",
      subtitle: "Drag each measurement name to the description of how it is taken.",
      kind: "match",
      pairs: [
        { id: "b1", target: "Taken around the fullest part of the chest with the tape level all round", label: "Bust or chest" },
        { id: "b2", target: "Taken around the narrowest part of the torso, without pulling tight", label: "Waist" },
        { id: "b3", target: "Taken around the fullest part of the seat with the feet together", label: "Hip" },
        { id: "b4", target: "Taken from the nape of the neck down to the natural waistline", label: "Centre back length" },
        { id: "b5", target: "Taken from the shoulder tip to the wrist with the arm slightly bent", label: "Sleeve length" },
        { id: "b6", target: "Taken from the waist down to the hem level you want", label: "Skirt length" },
      ],
    },
    // Elements and principles of design — sort each into the right group.
    "ctf-l3-1": {
      title: "Elements and Principles of Design",
      subtitle: "Sort each term into Element of design or Principle of design.",
      kind: "sort",
      categories: [
        { id: "el", label: "Element" },
        { id: "pr", label: "Principle" },
      ],
      items: [
        { id: "e1", label: "Line", category: "el" },
        { id: "e2", label: "Shape", category: "el" },
        { id: "e3", label: "Colour", category: "el" },
        { id: "e4", label: "Texture", category: "el" },
        { id: "p1", label: "Balance", category: "pr" },
        { id: "p2", label: "Rhythm", category: "pr" },
        { id: "p3", label: "Proportion", category: "pr" },
        { id: "p4", label: "Emphasis", category: "pr" },
      ],
    },
    // Constructing a garment — put the order of work in sequence.
    "ctf-l3-2": {
      title: "Constructing a Garment in Order",
      subtitle: "Arrange the stages of making up a garment in the correct order.",
      kind: "order",
      items: [
        { id: "o1", label: "Take body measurements and choose the right pattern size", order: 1 },
        { id: "o2", label: "Prepare and cut out the paper pattern pieces", order: 2 },
        { id: "o3", label: "Lay, pin and cut out the fabric, following the grain line", order: 3 },
        { id: "o4", label: "Transfer all pattern markings — darts, notches and balance marks", order: 4 },
        { id: "o5", label: "Tack the pieces together and check the fit", order: 5 },
        { id: "o6", label: "Machine stitch the seams and press each one as you go", order: 6 },
        { id: "o7", label: "Insert the fastening — zip or buttonholes", order: 7 },
        { id: "o8", label: "Attach facings or waistband and neaten the raw edges", order: 8 },
        { id: "o9", label: "Work the hem and give the garment a final press", order: 9 },
      ],
    },
    // Decorative techniques — match each technique to its description.
    "ctf-l3-3": {
      title: "Decorative Techniques and Embellishment",
      subtitle: "Drag each technique to the description that matches it.",
      kind: "match",
      pairs: [
        { id: "d1", target: "Shapes cut from fabric and stitched onto a background", label: "Appliqué" },
        { id: "d2", target: "Decorative stitching worked by hand or machine to form a pattern", label: "Embroidery" },
        { id: "d3", target: "Rows of gathered stitches held in place by decorative stitching, giving stretch", label: "Smocking" },
        { id: "d4", target: "Hot wax is applied to cloth before dyeing so the dye is resisted", label: "Batik" },
        { id: "d5", target: "Cloth is tied or bound tightly so dye cannot reach some areas", label: "Tie-dye" },
        { id: "d6", target: "Beads, sequins or shells sewn on as surface decoration", label: "Beadwork" },
      ],
    },
    // Consumer skills — match each document or term to its meaning.
    "ctf-l4-1": {
      title: "Smart Clothing Consumer",
      subtitle: "Drag each term to the meaning that matches it.",
      kind: "match",
      pairs: [
        { id: "k1", target: "Proof of where and when you bought an item, needed for a complaint", label: "Receipt" },
        { id: "k2", target: "The maker's promise to repair or replace a faulty item within a set time", label: "Guarantee" },
        { id: "k3", target: "States the fibre content, washing instructions and country of origin", label: "Care and content label" },
        { id: "k4", target: "Judging a garment by how much wear you will get for the price paid", label: "Value for money" },
        { id: "k5", target: "Buying quickly without checking fit, quality or the returns policy", label: "Impulse buying" },
        { id: "k6", target: "The law that protects you when goods are faulty or not as described", label: "Consumer protection" },
      ],
    },
    // Textiles in the home — match each item to the fabric quality it needs.
    "ctf-l4-2": {
      title: "Textiles in the Home",
      subtitle: "Drag each item to the fabric quality it needs.",
      kind: "match",
      pairs: [
        { id: "h1", target: "Hangs at the window; needs a fabric that resists fading and can be lined", label: "Curtains" },
        { id: "h2", target: "Takes the hardest wear of all; needs a strong, closely woven fabric", label: "Upholstery" },
        { id: "h3", target: "Next to the skin every night; needs a soft, absorbent fabric that washes well", label: "Bed linen" },
        { id: "h4", target: "Used for drying dishes; needs a fabric that absorbs water and dries quickly", label: "Tea towels" },
        { id: "h5", target: "Covers for a seat; needs a zip or flap so it can be removed and laundered", label: "Cushions" },
        { id: "h6", target: "Protects the tabletop and decorates the room for meals", label: "Table linen" },
      ],
    },
    // The fashion industry — match each job to its duty.
    "ctf-l4-3": {
      title: "Jobs in the Fashion Industry",
      subtitle: "Drag each job title to the work it involves.",
      kind: "match",
      pairs: [
        { id: "j1", target: "Sketches designs and selects the colours, fabrics and trims for a range", label: "Fashion designer" },
        { id: "j2", target: "Turns a design into pattern pieces in the full range of sizes", label: "Pattern cutter" },
        { id: "j3", target: "Operates industrial machines to join the parts of a garment", label: "Machinist" },
        { id: "j4", target: "Chooses and buys stock for a store and negotiates prices with suppliers", label: "Buyer" },
        { id: "j5", target: "Plans quantities, delivery dates and promotes the range to shops", label: "Merchandiser" },
        { id: "j6", target: "Sells the finished garment face to face and advises the customer", label: "Retail sales assistant" },
      ],
    },
    // Workroom safety — sort each habit by whether it is safe.
    "ctf-l5-1": {
      title: "Safety in the Workroom",
      subtitle: "Sort each habit into Safe practice or Unsafe practice.",
      kind: "sort",
      categories: [
        { id: "ok", label: "Safe practice" },
        { id: "bad", label: "Unsafe practice" },
      ],
      items: [
        { id: "w1", label: "Storing pins in a pin cushion", category: "ok" },
        { id: "w2", label: "Switching the iron off and unplugging it after use", category: "ok" },
        { id: "w3", label: "Reporting a bent or broken machine needle at once", category: "ok" },
        { id: "w4", label: "Tying back long hair before using a machine", category: "ok" },
        { id: "w5", label: "Holding pins in your mouth", category: "bad" },
        { id: "w6", label: "Leaving a hot iron face down on the fabric", category: "bad" },
        { id: "w7", label: "Running and pushing in the workroom", category: "bad" },
        { id: "w8", label: "Using a machine with the needle guard removed", category: "bad" },
      ],
    },
    // Sustainable textiles — order the waste hierarchy.
    "ctf-l5-2": {
      title: "The Textile Waste Hierarchy",
      subtitle: "Arrange the choices from best for the planet down to the last resort.",
      kind: "order",
      items: [
        { id: "g1", label: "Reduce — buy less, choose good quality that will last", order: 1 },
        { id: "g2", label: "Reuse — pass garments on, swap or restyle them", order: 2 },
        { id: "g3", label: "Repair — mend, darn or alter a garment instead of replacing it", order: 3 },
        { id: "g4", label: "Recycle — cut down into patchwork or send to textile recycling", order: 4 },
        { id: "g5", label: "Dispose — throw away in the rubbish bin, the very last resort", order: 5 },
      ],
    },
    // Caribbean textiles and craft — match each tradition to its description.
    "ctf-l5-3": {
      title: "Caribbean Textiles and Craft Traditions",
      subtitle: "Drag each tradition to the description that matches it.",
      kind: "match",
      pairs: [
        { id: "n1", target: "Bright checked cloth used for head ties and national dress", label: "Madras" },
        { id: "n2", target: "Wax-resist dyed cloth with fine crackle lines, worked across the region", label: "Batik" },
        { id: "n3", target: "Looping yarn with a hook to make doilies, bags and garments", label: "Crochet" },
        { id: "n4", target: "Plaiting dried straw or palm to make hats, mats and baskets", label: "Straw plaiting" },
        { id: "n5", target: "Cloth tied and bound before dyeing, used for T-shirts and home textiles", label: "Tie-dye" },
      ],
    },
  },
};

