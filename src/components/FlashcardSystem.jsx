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
  ]},
  general: { title: "General Study Tips", cards: [
    { front: "Active Recall", back: "Test yourself instead of re-reading notes" },
    { front: "Spaced Repetition", back: "Review material at increasing intervals" },
    { front: "Pomodoro Method", back: "25 min study, 5 min break cycles" },
    { front: "Mind Map", back: "Visual diagram connecting related concepts" },
    { front: "Feynman Technique", back: "Explain a concept in simple terms as if teaching a child" },
  ]},
};

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
    let chosenDeck = sampleDecks.general;
    if (subjectId === "spanish" || subjectId === "french") chosenDeck = sampleDecks.spanish;
    else if (subjectId === "chemistry") chosenDeck = sampleDecks.chemistry;
    else if (subjectId === "biology" || subjectId === "human-social-biology") chosenDeck = sampleDecks.biology;
    const shuffled = [...chosenDeck.cards].sort(() => Math.random() - 0.5);
    setDeck({ ...chosenDeck, cards: shuffled });
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