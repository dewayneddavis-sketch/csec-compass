import { useState, useEffect, useRef } from "react";

const sampleDecks = {
  spanish: { title: "Spanish Vocabulary", cards: [
    { front: "Hello", back: "Hola" }, { front: "Goodbye", back: "Adiós" },
    { front: "Thank you", back: "Gracias" }, { front: "Please", back: "Por favor" },
    { front: "Yes / No", back: "Sí / No" }, { front: "Good morning", back: "Buenos días" },
    { front: "Good night", back: "Buenas noches" }, { front: "How are you?", back: "¿Cómo estás?" },
    { front: "Water", back: "Agua" }, { front: "Food", back: "Comida" },
    { front: "Friend", back: "Amigo" }, { front: "One / Two / Three", back: "Uno / Dos / Tres" },
  ]},
  chemistry: { title: "Chemistry Terms", cards: [
    { front: "Atomic number", back: "Number of protons in the nucleus" },
    { front: "Isotope", back: "Atoms with same protons, different neutrons" },
    { front: "Ionic bond", back: "Transfer of electrons between atoms" },
    { front: "Covalent bond", back: "Sharing of electron pairs" },
    { front: "pH of 7", back: "Neutral (pure water)" },
    { front: "Catalyst", back: "Speeds up a reaction without being consumed" },
    { front: "Oxidation", back: "Loss of electrons" },
    { front: "Reduction", back: "Gain of electrons" },
    { front: "Mole", back: "6.02 × 10²³ particles" },
    { front: "Endothermic", back: "Reaction that absorbs heat" },
    { front: "Valency", back: "Number of electrons an atom gains, loses, or shares to become stable" },
    { front: "Electrolysis", back: "Decomposition of a compound using an electric current" },
  ]},
  biology: { title: "Biology Concepts", cards: [
    { front: "Mitochondria", back: "Powerhouse of the cell — produces ATP" },
    { front: "Nucleus", back: "Contains genetic material (DNA)" },
    { front: "Chloroplast", back: "Site of photosynthesis" },
    { front: "Ribosome", back: "Site of protein synthesis" },
    { front: "Cell membrane", back: "Controls what enters and leaves the cell" },
    { front: "Cytoplasm", back: "Jelly-like substance filling the cell" },
    { front: "Meiosis", back: "Cell division producing gametes (4 cells)" },
    { front: "Mitosis", back: "Cell division producing 2 identical cells" },
    { front: "Enzyme", back: "Biological catalyst that speeds up reactions" },
    { front: "Homeostasis", back: "Maintaining a stable internal environment" },
    { front: "Photosynthesis", back: "Making glucose from CO₂ and water using sunlight" },
    { front: "Diffusion", back: "Movement of particles from high to low concentration" },
  ]},
  "english-a": { title: "English A Literary Terms", cards: [
    { front: "Simile", back: "Comparison using 'like' or 'as'" },
    { front: "Metaphor", back: "Comparison stating one thing IS another" },
    { front: "Personification", back: "Giving human qualities to non-human things" },
    { front: "Hyperbole", back: "Extreme exaggeration for effect" },
    { front: "Onomatopoeia", back: "Words that imitate sounds (buzz, hiss)" },
    { front: "Alliteration", back: "Repeated initial consonant sounds" },
    { front: "Irony", back: "Saying the opposite of what is meant / unexpected outcome" },
    { front: "Theme", back: "Central idea or message of a text" },
    { front: "Characterization", back: "How an author reveals a character's personality" },
    { front: "Summary", back: "Brief restatement of main points in your own words" },
    { front: "Protagonist", back: "Main character in a story" },
    { front: "Dialogue", back: "Conversation between characters in a text" },
  ]},
  mathematics: { title: "Mathematics Terms", cards: [
    { front: "Mean", back: "Sum of values divided by the number of values" },
    { front: "Median", back: "Middle value when data is arranged in order" },
    { front: "Mode", back: "Most frequently occurring value" },
    { front: "Gradient", back: "Steepness of a line — rise over run (m)" },
    { front: "Intercept", back: "Where a line crosses an axis (y-intercept = b)" },
    { front: "BODMAS", back: "Order of operations: Brackets, Of, Division, Multiplication, Addition, Subtraction" },
    { front: "Prime number", back: "Number with exactly two factors: 1 and itself" },
    { front: "Composite number", back: "Number with more than two factors" },
    { front: "Quadratic", back: "Expression of the form ax² + bx + c" },
    { front: "Hypotenuse", back: "Longest side of a right-angled triangle" },
    { front: "Range", back: "Largest value minus the smallest value" },
    { front: "Factor", back: "A number that divides another exactly" },
  ]},
  physics: { title: "Physics Terms", cards: [
    { front: "Force", back: "A push or pull — measured in Newtons (N)" },
    { front: "Energy", back: "Capacity to do work — measured in Joules (J)" },
    { front: "Power", back: "Rate of doing work — measured in Watts (W)" },
    { front: "Velocity", back: "Speed in a given direction (m/s)" },
    { front: "Acceleration", back: "Rate of change of velocity (m/s²)" },
    { front: "Wavelength", back: "Distance between successive wave crests" },
    { front: "Frequency", back: "Number of waves per second — Hertz (Hz)" },
    { front: "Current", back: "Flow of electric charge — Amperes (A)" },
    { front: "Voltage", back: "Electrical pressure / energy per charge — Volts (V)" },
    { front: "Resistance", back: "Opposition to current flow — Ohms (Ω)" },
    { front: "Work", back: "Force × distance moved in direction of force (J)" },
    { front: "Mass", back: "Amount of matter in an object — kilograms (kg)" },
  ]},
  "information-technology": { title: "IT Key Terms", cards: [
    { front: "Hardware", back: "Physical components of a computer system" },
    { front: "Software", back: "Programs and instructions that run on hardware" },
    { front: "CPU", back: "Central Processing Unit — the 'brain' of the computer" },
    { front: "RAM", back: "Random Access Memory — temporary, volatile storage" },
    { front: "ROM", back: "Read-Only Memory — permanent, non-volatile storage" },
    { front: "Algorithm", back: "Step-by-step procedure to solve a problem" },
    { front: "Query", back: "A request for data from a database" },
    { front: "Bandwidth", back: "Amount of data a connection can carry per second" },
    { front: "Firewall", back: "Security system that filters incoming/outgoing traffic" },
    { front: "URL", back: "Uniform Resource Locator — web address" },
    { front: "Bit", back: "Smallest unit of data (0 or 1)" },
    { front: "Byte", back: "Group of 8 bits" },
  ]},
  "principles-of-accounts": { title: "Principles of Accounts Terms", cards: [
    { front: "Asset", back: "Something of value owned by the business" },
    { front: "Liability", back: "Amount the business owes to others" },
    { front: "Equity", back: "Owner's claim on the business (Capital + Profit)" },
    { front: "Revenue", back: "Income from sales of goods or services" },
    { front: "Expense", back: "Cost incurred in running the business" },
    { front: "Gross profit", back: "Sales − Cost of Goods Sold" },
    { front: "Net profit", back: "Gross profit − all expenses" },
    { front: "Depreciation", back: "Spread of a fixed asset's cost over its useful life" },
    { front: "Debit", back: "Entry on the left side of an account (Dr)" },
    { front: "Credit", back: "Entry on the right side of an account (Cr)" },
    { front: "Ledger", back: "Book of accounts where transactions are posted" },
    { front: "Balance sheet", back: "Statement showing assets, liabilities, and equity" },
  ]},
  "social-studies": { title: "Social Studies Terms", cards: [
    { front: "Socialization", back: "Process of learning society's norms and values" },
    { front: "Culture", back: "Shared beliefs, customs, and way of life of a group" },
    { front: "Stratification", back: "Layering of society into social classes" },
    { front: "Institution", back: "Stable structure that meets society's needs (family, school)" },
    { front: "Democracy", back: "Government by the people, through elected representatives" },
    { front: "Constitution", back: "Supreme law that sets out rules of government" },
    { front: "Globalization", back: "Growing interconnection of economies and cultures worldwide" },
    { front: "Sustainable development", back: "Meeting present needs without harming future generations" },
    { front: "Consumer rights", back: "Protections for buyers — safety, information, redress" },
    { front: "Regional integration", back: "Countries cooperating, e.g. CARICOM" },
    { front: "Citizenship", back: "Legal membership of a state with rights and duties" },
    { front: "Census", back: "Official count of a country's population" },
  ]},
  general: { title: "General Study Tips", cards: [
    { front: "Active Recall", back: "Test yourself instead of re-reading notes" },
    { front: "Spaced Repetition", back: "Review material at increasing intervals" },
    { front: "Pomodoro Method", back: "25 min study, 5 min break cycles" },
    { front: "Mind Map", back: "Visual diagram connecting related concepts" },
    { front: "Feynman Technique", back: "Explain a concept in simple terms as if teaching a child" },
  ]},
};

// Map every subject to its OWN deck. The fallback is a subject-labeled
// general deck so no lesson ever shows another subject's content.
const SUBJECT_DECK = {
  spanish: "spanish",
  french: "spanish",
  chemistry: "chemistry",
  biology: "biology",
  "human-social-biology": "biology",
  "english-a": "english-a",
  mathematics: "mathematics",
  physics: "physics",
  "information-technology": "information-technology",
  "principles-of-accounts": "principles-of-accounts",
  "social-studies": "social-studies",
};

function subjectLabel(subjectId) {
  if (!subjectId) return "General Study";
  return subjectId
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function FlashcardSystem({ subjectId }) {
  const [deck, setDeck] = useState(null);
  const [currentCard, setCurrentCard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState([]);
  const [reviewLater, setReviewLater] = useState([]);
  const [unknown, setUnknown] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const cardRef = useRef(null);
  const swipeStart = useRef(0);

  useEffect(() => {
    const deckKey = SUBJECT_DECK[subjectId] || "general";
    const chosenDeck = sampleDecks[deckKey] || sampleDecks.general;
    // Label the fallback deck with the subject so it never looks foreign.
    const labeledDeck = deckKey === "general"
      ? { ...chosenDeck, title: `${subjectLabel(subjectId)} Study Cards` }
      : chosenDeck;
    const shuffled = [...labeledDeck.cards].sort(() => Math.random() - 0.5);
    setDeck({ ...labeledDeck, cards: shuffled });
    setCurrentCard(0); setFlipped(false); setKnown([]); setReviewLater([]); setUnknown([]); setShowResult(false);
  }, [subjectId]);

  if (!deck) return <div className="fc-loading">Loading flashcards...</div>;

  const card = deck.cards[currentCard];
  const total = deck.cards.length;
  const knownCount = known.length;
  const progress = total > 0 ? Math.round(((knownCount) / total) * 100) : 0;

  function handleFlip() { setFlipped((f) => !f); setSwipeOffset(0); }

  function markKnown() {
    setKnown((prev) => [...prev, currentCard]);
    nextCard();
  }

  function markReviewLater() {
    setReviewLater((prev) => [...prev, currentCard]);
    nextCard();
  }

  function markUnknown() {
    setUnknown((prev) => [...prev, currentCard]);
    nextCard();
  }

  function nextCard() {
    if (currentCard < total - 1) {
      setCurrentCard((c) => c + 1);
      setFlipped(false);
      setSwipeOffset(0);
    } else {
      setShowResult(true);
    }
  }

  // Touch swipe handlers
  function handleTouchStart(e) {
    swipeStart.current = e.touches[0].clientX;
  }
  function handleTouchMove(e) {
    const dx = e.touches[0].clientX - swipeStart.current;
    if (Math.abs(dx) > 20) setSwipeOffset(dx);
  }
  function handleTouchEnd() {
    if (swipeOffset > 80) { markKnown(); }
    else if (swipeOffset < -80) { markUnknown(); }
    else { setSwipeOffset(0); }
  }

  function handleRestart() {
    const shuffled = [...deck.cards].sort(() => Math.random() - 0.5);
    setDeck({ ...deck, cards: shuffled });
    setCurrentCard(0); setFlipped(false); setKnown([]); setReviewLater([]); setUnknown([]); setShowResult(false);
  }

  if (showResult) {
    const unknownCount = unknown.length + reviewLater.length;
    const score = total > 0 ? Math.round((knownCount / total) * 100) : 0;
    return (
      <div className="fc-result">
        <div className="fc-result-icon">{score >= 70 ? "🎉" : score >= 40 ? "💪" : "📚"}</div>
        <h3>Session Complete!</h3>
        <p className="fc-score">You knew <strong>{knownCount}</strong> of <strong>{total}</strong> cards ({score}%)</p>
        <div className="fc-stats">
          <span className="fc-stat fc-stat-known">Known: {knownCount}</span>
          <span className="fc-stat fc-stat-review">Review: {reviewLater.length}</span>
          <span className="fc-stat fc-stat-unknown">Struggled: {unknown.length}</span>
        </div>
        {unknown.length > 0 && <p className="fc-hint">Review "Struggled" and "Review Later" cards and try again!</p>}
        <button className="quiz-btn quiz-btn-primary" onClick={handleRestart}>Study Again</button>
      </div>
    );
  }

  const swipeStyle = {
    transform: `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.05}deg)`,
    transition: swipeOffset === 0 ? "transform 0.3s ease" : "none",
  };

  return (
    <div className="flashcard-system"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="fc-header">
        <h4>{deck.title}</h4>
        <span className="fc-progress">Card {currentCard + 1}/{total} ({progress}% known)</span>
      </div>

      <div ref={cardRef} className={`fc-card ${flipped ? "flipped" : ""}`} onClick={handleFlip} style={swipeStyle}>
        <div className="fc-card-inner">
          <div className="fc-card-front">
            <span className="fc-card-label">TERM</span>
            <p className="fc-card-text">{card.front}</p>
            <span className="fc-card-hint">Tap to reveal definition</span>
          </div>
          <div className="fc-card-back">
            <span className="fc-card-label">DEFINITION</span>
            <p className="fc-card-text">{card.back}</p>
            <span className="fc-card-hint">Swipe right = Known &bull; Swipe left = Struggle</span>
          </div>
        </div>
      </div>

      <div className="fc-actions">
        <button className="fc-btn fc-btn-unknown" onClick={markUnknown} disabled={!flipped}>Struggled</button>
        <button className="fc-btn fc-btn-review" onClick={markReviewLater} disabled={!flipped}>Review Later</button>
        <button className="fc-btn fc-btn-known" onClick={markKnown} disabled={!flipped}>Known</button>
      </div>

      <div className="fc-progress-bar">
        {deck.cards.map((_, i) => (
          <div key={i} className={`fc-pdot ${i === currentCard ? "current" : ""} ${known.includes(i) ? "known" : ""} ${reviewLater.includes(i) ? "review" : ""} ${unknown.includes(i) ? "unknown" : ""} ${i > currentCard && !known.includes(i) && !reviewLater.includes(i) && !unknown.includes(i) ? "pending" : ""}`} />
        ))}
      </div>
    </div>
  );
}
