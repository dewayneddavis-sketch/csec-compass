// Content Loader — fetches from public/content/ JSON with hardcoded fallback

const iconMap = { Calculate: "📐", Description: "📝", Science: "🧬", default: "📚" };

const colorMap = {
  mathematics: "#2563eb", "english-a": "#7c3aed", biology: "#059669",
  chemistry: "#dc2626", physics: "#f59e0b", "information-technology": "#0891b2",
  "principles-of-accounts": "#d97706", "principles-of-business": "#0d9488",
  "social-studies": "#16a34a", history: "#b91c1c", geography: "#65a30d",
  "human-social-biology": "#e11d48", spanish: "#c2410c", french: "#4338ca",
  "agricultural-science": "#4d7c0f",
};

const fallbackSubjects = [
  { id: "chemistry", name: "Chemistry", description: "Learn atomic structure, bonding, reactions, and stoichiometry through interactive lab simulations.", icon: "⚗️", color: "#dc2626", modules: [{ id: "atomic", title: "Atomic Structure", lessons: [{ id: "atoms", title: "Atoms & Elements" }, { id: "electron-config", title: "Electron Configuration" }, { id: "periodic-table", title: "Periodic Table" }] }, { id: "bonding", title: "Chemical Bonding", lessons: [{ id: "ionic", title: "Ionic Bonding" }, { id: "covalent", title: "Covalent Bonding" }, { id: "metallic", title: "Metallic Bonding" }] }, { id: "reactions", title: "Chemical Reactions", lessons: [{ id: "types", title: "Types of Reactions" }, { id: "balancing", title: "Balancing Equations" }, { id: "rates", title: "Rates of Reaction" }] }, { id: "stoichiometry", title: "Stoichiometry", lessons: [{ id: "moles", title: "Moles & Mass" }, { id: "concentration", title: "Concentration" }, { id: "gas-volumes", title: "Gas Volumes" }] }], experiment: "lab-sim" },
  { id: "physics", name: "Physics", description: "Understand motion, forces, energy, waves, and electricity with interactive simulations.", icon: "⚡", color: "#f59e0b", modules: [{ id: "mechanics", title: "Mechanics", lessons: [{ id: "motion", title: "Motion" }, { id: "forces", title: "Forces" }, { id: "energy", title: "Energy & Work" }] }, { id: "waves", title: "Waves & Optics", lessons: [{ id: "wave-props", title: "Wave Properties" }, { id: "sound", title: "Sound" }, { id: "light", title: "Light & Lenses" }] }, { id: "electricity", title: "Electricity", lessons: [{ id: "circuits", title: "Circuits" }, { id: "current", title: "Current & Voltage" }, { id: "resistance", title: "Resistance" }] }, { id: "thermal", title: "Thermal Physics", lessons: [{ id: "heat", title: "Heat Transfer" }, { id: "temp", title: "Temperature" }, { id: "gas-laws", title: "Gas Laws" }] }], experiment: "circuit-builder" },
  { id: "information-technology", name: "Information Technology", description: "Cover programming fundamentals, databases, networking, and web technologies.", icon: "💻", color: "#0891b2", modules: [{ id: "programming", title: "Programming", lessons: [{ id: "vars", title: "Variables & Data Types" }, { id: "control", title: "Control Structures" }, { id: "functions", title: "Functions" }] }, { id: "databases", title: "Databases", lessons: [{ id: "tables", title: "Tables & Queries" }, { id: "forms", title: "Forms & Reports" }, { id: "integrity", title: "Data Integrity" }] }, { id: "networking", title: "Networking", lessons: [{ id: "types", title: "Network Types" }, { id: "ip", title: "IP Addressing" }, { id: "security", title: "Security" }] }, { id: "web", title: "Web Technology", lessons: [{ id: "html", title: "HTML & CSS" }, { id: "js", title: "JavaScript Basics" }, { id: "responsive", title: "Responsive Design" }] }], experiment: "code-playground" },
  { id: "principles-of-accounts", name: "Principles of Accounts", description: "Learn double-entry bookkeeping, financial statements, and accounting principles.", icon: "📊", color: "#d97706", modules: [{ id: "basics", title: "Accounting Basics", lessons: [{ id: "equation", title: "The Accounting Equation" }, { id: "double-entry", title: "Double Entry" }, { id: "ledgers", title: "Ledgers" }] }, { id: "statements", title: "Financial Statements", lessons: [{ id: "trading", title: "Trading Account" }, { id: "pnl", title: "Profit & Loss" }, { id: "balance", title: "Balance Sheet" }] }, { id: "adjustments", title: "Adjustments", lessons: [{ id: "depreciation", title: "Depreciation" }, { id: "bad-debts", title: "Bad Debts" }, { id: "accruals", title: "Accruals & Prepayments" }] }, { id: "analysis", title: "Analysis", lessons: [{ id: "ratios", title: "Ratios" }, { id: "interpretation", title: "Interpretation" }, { id: "cash-flow", title: "Cash Flow" }] }], experiment: "ledger-tool" },
  { id: "principles-of-business", name: "Principles of Business", description: "Explore business concepts including entrepreneurship, marketing, and production.", icon: "🏢", color: "#0d9488", modules: [{ id: "business-org", title: "Business Organizations", lessons: [{ id: "types", title: "Types of Businesses" }, { id: "sole-trader", title: "Sole Trader" }, { id: "partnership", title: "Partnership" }, { id: "companies", title: "Companies" }] }, { id: "marketing", title: "Marketing", lessons: [{ id: "mix", title: "Marketing Mix" }, { id: "research", title: "Market Research" }, { id: "promotion", title: "Promotion" }] }, { id: "production", title: "Production", lessons: [{ id: "factors", title: "Factors of Production" }, { id: "types", title: "Types of Production" }, { id: "economies", title: "Economies of Scale" }] }, { id: "finance", title: "Finance", lessons: [{ id: "sources", title: "Sources of Finance" }, { id: "banking", title: "Banking" }, { id: "insurance", title: "Insurance" }] }], experiment: "data-explorer" },
  { id: "social-studies", name: "Social Studies", description: "Examine Caribbean society, governance, regional integration, and sustainable development.", icon: "🌍", color: "#16a34a", modules: [{ id: "society", title: "Caribbean Society", lessons: [{ id: "stratification", title: "Social Stratification" }, { id: "institutions", title: "Institutions" }, { id: "culture", title: "Culture" }] }, { id: "governance", title: "Governance", lessons: [{ id: "political", title: "Political Systems" }, { id: "constitution", title: "The Constitution" }, { id: "citizenship", title: "Citizenship" }] }, { id: "development", title: "Development", lessons: [{ id: "sustainable", title: "Sustainable Development" }, { id: "integration", title: "Regional Integration" }, { id: "globalization", title: "Globalization" }] }, { id: "research", title: "Research Skills", lessons: [{ id: "data", title: "Data Collection" }, { id: "questionnaire", title: "Questionnaire Design" }, { id: "reporting", title: "Reporting" }] }], experiment: "data-explorer" },
  { id: "history", name: "History", description: "Explore Caribbean history from indigenous peoples to modern independence movements.", icon: "📜", color: "#b91c1c", modules: [{ id: "indigenous", title: "Indigenous Peoples", lessons: [{ id: "taino", title: "The Taíno" }, { id: "kalinago", title: "The Kalinago" }, { id: "impact", title: "European Contact" }] }, { id: "colonial", title: "Colonial Era", lessons: [{ id: "sugar", title: "Sugar Plantations" }, { id: "slavery", title: "The Slave Trade" }, { id: "resistance", title: "Resistance & Rebellion" }] }, { id: "emancipation", title: "Post-Emancipation", lessons: [{ id: "freedom", title: "Emancipation" }, { id: "indentureship", title: "Indentureship" }, { id: "society", title: "New Societies" }] }, { id: "independence", title: "Independence", lessons: [{ id: "nationalism", title: "Nationalism" }, { id: "federation", title: "The Federation" }, { id: "modern", title: "Modern Caribbean" }] }], experiment: "timeline" },
  { id: "geography", name: "Geography", description: "Study physical and human geography, map reading, and environmental management.", icon: "🗺️", color: "#65a30d", modules: [{ id: "mapwork", title: "Mapwork & Skills", lessons: [{ id: "reading", title: "Map Reading" }, { id: "coordinates", title: "Coordinates & Grids" }, { id: "scale", title: "Scale & Distance" }] }, { id: "physical", title: "Physical Geography", lessons: [{ id: "tectonics", title: "Plate Tectonics" }, { id: "weathering", title: "Weathering & Erosion" }, { id: "rivers", title: "River Processes" }] }, { id: "climate", title: "Climate & Vegetation", lessons: [{ id: "weather", title: "Weather & Climate" }, { id: "ecosystems", title: "Ecosystems" }, { id: "natural", title: "Natural Hazards" }] }, { id: "human", title: "Human Geography", lessons: [{ id: "population", title: "Population" }, { id: "urbanization", title: "Urbanization" }, { id: "resources", title: "Resource Management" }] }], experiment: "map-explorer" },
  { id: "human-social-biology", name: "Human & Social Biology", description: "Study the human body systems, health, nutrition, and social implications of disease.", icon: "🫀", color: "#e11d48", modules: [{ id: "body-systems", title: "Body Systems", lessons: [{ id: "skeletal", title: "Skeletal & Muscular" }, { id: "cardiovascular", title: "Cardiovascular" }, { id: "respiratory", title: "Respiratory" }, { id: "excretory", title: "Excretory" }] }, { id: "nutrition", title: "Health & Nutrition", lessons: [{ id: "food-groups", title: "Food Groups" }, { id: "vitamins", title: "Vitamins & Minerals" }, { id: "diet", title: "Dietary Requirements" }] }, { id: "disease", title: "Disease", lessons: [{ id: "communicable", title: "Communicable Diseases" }, { id: "non-communicable", title: "Non-Communicable Diseases" }, { id: "immunity", title: "Immunity" }] }, { id: "social-health", title: "Social Health", lessons: [{ id: "population", title: "Population" }, { id: "pollution", title: "Pollution" }, { id: "public-health", title: "Public Health" }] }], experiment: "body-explorer" },
  { id: "spanish", name: "Spanish", description: "Build vocabulary, grammar, reading, and oral communication skills for CSEC Spanish.", icon: "🇪🇸", color: "#c2410c", modules: [{ id: "vocabulary", title: "Vocabulary", lessons: [{ id: "greetings", title: "Greetings & Introductions" }, { id: "daily-life", title: "Daily Life" }, { id: "food-travel", title: "Food & Travel" }] }, { id: "grammar", title: "Grammar", lessons: [{ id: "nouns", title: "Nouns & Articles" }, { id: "verbs", title: "Verb Tenses" }, { id: "adjectives", title: "Adjectives & Adverbs" }] }, { id: "reading-writing", title: "Reading & Writing", lessons: [{ id: "comprehension", title: "Comprehension Passages" }, { id: "letters", title: "Letter Writing" }, { id: "dialogue", title: "Dialogue" }] }, { id: "culture", title: "Culture", lessons: [{ id: "hispanic", title: "Hispanic Culture" }, { id: "caribbean", title: "Caribbean Spanish" }, { id: "festivals", title: "Festivals" }] }], experiment: "vocab-flashcards" },
  { id: "french", name: "French", description: "Develop reading, writing, listening, and speaking skills for CSEC French.", icon: "🇫🇷", color: "#4338ca", modules: [{ id: "vocabulary", title: "Vocabulary", lessons: [{ id: "greetings", title: "Greetings & Introductions" }, { id: "daily-life", title: "Daily Life" }, { id: "travel", title: "Travel & Tourism" }] }, { id: "grammar", title: "Grammar", lessons: [{ id: "nouns", title: "Nouns & Articles" }, { id: "verbs", title: "Verb Conjugation" }, { id: "tenses", title: "Tenses" }] }, { id: "reading-writing", title: "Reading & Writing", lessons: [{ id: "comprehension", title: "Comprehension" }, { id: "essays", title: "Essay Writing" }, { id: "letters", title: "Letter Writing" }] }, { id: "culture", title: "Francophone Culture", lessons: [{ id: "caribbean", title: "French Caribbean" }, { id: "festivals", title: "Festivals & Traditions" }, { id: "literature", title: "Literature" }] }], experiment: "vocab-flashcards" },
  { id: "agricultural-science", name: "Agricultural Science", description: "Explore crop production, animal husbandry, soil science, and agricultural economics.", icon: "🌱", color: "#4d7c0f", modules: [{ id: "soil", title: "Soil Science", lessons: [{ id: "types", title: "Soil Types" }, { id: "fertility", title: "Soil Fertility" }, { id: "conservation", title: "Soil Conservation" }] }, { id: "crops", title: "Crop Production", lessons: [{ id: "propagation", title: "Propagation" }, { id: "management", title: "Crop Management" }, { id: "pests", title: "Pest & Disease Control" }] }, { id: "animals", title: "Animal Husbandry", lessons: [{ id: "breeds", title: "Breeds of Livestock" }, { id: "nutrition", title: "Animal Nutrition" }, { id: "health", title: "Animal Health" }] }, { id: "economics", title: "Agricultural Economics", lessons: [{ id: "systems", title: "Farming Systems" }, { id: "marketing", title: "Marketing" }, { id: "finance", title: "Farm Finance" }] }], experiment: "lab-sim" },
];

export const experimentTypes = {
  "graphing": { title: "Graphing Calculator", description: "Plot y = mx + b with draggable sliders for m (slope) and b (intercept).", interactive: "graphing-calc" },
  "drag-drop": { title: "Drag & Drop Label", description: "Drag labels to the correct positions on a diagram.", interactive: "drag-drop" },
  "circuit-builder": { title: "Circuit Builder", description: "Build electrical circuits with batteries, bulbs, resistors, and switches.", interactive: "circuit-builder" },
  "balance-scale": { title: "Balance Scale", description: "Solve equations by keeping the scale balanced with weights and variables.", interactive: "balance-scale" },
  "vocab-flashcards": { title: "Flashcard Trainer", description: "Build vocabulary with flip-and-review flashcards.", interactive: "flashcard" },
  "interactive-quiz": { title: "Interactive Quiz", description: "Test your knowledge with instant feedback on each answer." },
  "visual-converter": { title: "Visual Converter", description: "See how values convert between different representations." },
  "graph-plotter": { title: "Graph Plotter", description: "Adjust parameters and see graphs update in real-time." },
  "graph-linear": { title: "Line Lab", description: "Plot y=mx+b with draggable sliders for m and b.", interactive: "graphing-calc" },
  "number-line-plotter": { title: "Number Line Plotter", description: "Visualize inequalities on an interactive number line." },
  "function-machine": { title: "Function Machine", description: "See how functions transform inputs to outputs." },
  "interactive-triangle": { title: "Triangle Visualizer", description: "Explore triangles and the Pythagorean theorem." },
  "trig-circle": { title: "Unit Circle Explorer", description: "Visualize sine and cosine on the unit circle." },
  "vector-addition": { title: "Vector Lab", description: "Add vectors and see the resultant." },
  "matrix-transformer": { title: "Matrix Transformer", description: "Apply matrices to shapes and see transformations." },
  "data-visualizer": { title: "Data Visualizer", description: "See how statistics change as you add/remove data." },
  "probability-sim": { title: "Probability Simulator", description: "Run simulations and compare experimental to theoretical probability." },
  "area-builder": { title: "Area Builder", description: "Resize shapes and watch area/perimeter update." },
  "volume-filler": { title: "Volume Lab", description: "Fill 3D containers to visualize volume." },
};

async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Not found");
    return await res.json();
  } catch { return null; }
}

// Hardcoded fallback quizzes (for subjects without content JSON)
const fallbackQuizzes = {
  mathematics: [
    { id: "m1", question: "What is the value of 5 + 3 × 2?", options: ["16", "11", "10", "13"], answer: "11", explanation: "BODMAS: multiplication before addition. 3×2=6, 5+6=11." },
    { id: "m2", question: "If 20% of a number is 40, what is the number?", options: ["80", "100", "200", "400"], answer: "200", explanation: "20% is 1/5. If 1/5 of a number is 40, the number is 40×5=200." },
    { id: "m3", question: "Simplify: 3x + 5y - x + 2y", options: ["2x+7y", "4x+7y", "2x+3y", "4x+3y"], answer: "2x+7y", explanation: "(3x-x) + (5y+2y) = 2x+7y." },
    { id: "m4", question: "Solve: 2x - 4 = 10", options: ["3", "5", "7", "14"], answer: "7", explanation: "Add 4: 2x=14. Divide: x=7." },
    { id: "m5", question: "Gradient of line through (1,2) and (3,6)?", options: ["2", "4", "0.5", "3"], answer: "2", explanation: "m=(6-2)/(3-1)=4/2=2." },
  ],
  chemistry: [
    { id: "c1", question: "What is the atomic number?", options: ["# of neutrons", "# of protons", "protons+neutrons", "outer electrons"], answer: "# of protons", explanation: "Atomic number = number of protons." },
    { id: "c2", question: "Which bond involves electron transfer?", options: ["Covalent", "Ionic", "Metallic", "Hydrogen"], answer: "Ionic", explanation: "Ionic bonding transfers electrons." },
    { id: "c3", question: "pH of a neutral solution?", options: ["0", "7", "14", "1"], answer: "7", explanation: "pH 7 is neutral." },
    { id: "c4", question: "What is a mole?", options: ["Mass in grams", "6.02×10²³ particles", "Atoms in 1g", "Volume in L"], answer: "6.02×10²³ particles", explanation: "1 mole = Avogadro's number of particles." },
  ],
  physics: [
    { id: "p1", question: "SI unit of force?", options: ["Joule", "Newton", "Watt", "Pascal"], answer: "Newton", explanation: "Force is measured in Newtons." },
    { id: "p2", question: "120 km in 2 hours. Average speed?", options: ["40 km/h", "60 km/h", "80 km/h", "120 km/h"], answer: "60 km/h", explanation: "Speed = 120/2 = 60 km/h." },
    { id: "p3", question: "Which is a vector?", options: ["Speed", "Distance", "Velocity", "Mass"], answer: "Velocity", explanation: "Velocity has magnitude and direction." },
  ],
  biology: [
    { id: "b1", question: "Which organelle does photosynthesis?", options: ["Mitochondria", "Chloroplast", "Nucleus", "Ribosome"], answer: "Chloroplast", explanation: "Chloroplasts contain chlorophyll." },
    { id: "b2", question: "Main function of red blood cells?", options: ["Fight infection", "Carry oxygen", "Clot blood", "Produce hormones"], answer: "Carry oxygen", explanation: "RBCs contain haemoglobin for oxygen transport." },
  ],
};

// Get all subjects
export async function getAllSubjects() {
  const subjectList = await fetchJSON("/content/subjects.json");
  const merged = [];
  const usedIds = new Set();

  if (subjectList && Array.isArray(subjectList)) {
    for (const s of subjectList) {
      usedIds.add(s.id);
      const fb = fallbackSubjects.find((f) => f.id === s.id);
      merged.push({ ...s, icon: iconMap[s.icon] || iconMap.default, color: colorMap[s.id] || "#6b7280", modules: fb ? fb.modules : [], experiment: fb ? fb.experiment : null });
    }
  }
  for (const f of fallbackSubjects) {
    if (!usedIds.has(f.id)) merged.push(f);
  }
  return merged;
}

export async function getSubject(id) {
  const all = await getAllSubjects();
  return all.find((s) => s.id === id) || null;
}

export async function getSubjectModules(id) {
  const contentModules = await fetchJSON(`/content/${id}/modules.json`);
  if (contentModules && contentModules.length > 0) return contentModules;
  const subject = await getSubject(id);
  return subject ? subject.modules : [];
}

export async function getSubjectQuiz(id) {
  const contentQuiz = await fetchJSON(`/content/${id}/knowledge-check.json`);
  if (contentQuiz && contentQuiz.length > 0) return contentQuiz;
  return fallbackQuizzes[id] || null;
}

export function normalizeModules(modules) {
  return (modules || []).map((m) => ({
    id: m.id,
    title: m.title,
    lessons: Array.isArray(m.lessons) ? m.lessons.map((l) => ({
      id: l.id || l.title?.toLowerCase().replace(/\s+/g, "-") || "",
      title: l.title || l,
      objectives: l.objectives || [],
      concepts: l.concepts || [],
      experiment: l.experiment || null,
    })) : [],
  }));
}

export function getExperimentConfig(subjectId) {
  const fb = fallbackSubjects.find((f) => f.id === subjectId);
  if (!fb || !fb.experiment) return null;
  return experimentTypes[fb.experiment] || null;
}

export function getLessonExperiment(experimentType) {
  if (!experimentType) return null;
  if (typeof experimentType === "object") return experimentType;
  return experimentTypes[experimentType] || { title: "Interactive Activity", description: "Explore this concept hands-on." };
}
