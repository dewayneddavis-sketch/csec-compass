// The mock exam's rules, in ONE place.
//
// These three numbers used to be private to src/components/MockExam.jsx. The
// Compass Guide (src/data/guideFacts.js) now tells buyers what a mock exam is —
// "40 questions, about a minute and a half each, 60% to pass" — and a guide that
// quotes its own copy of the pass mark is exactly the drift this repo keeps
// getting bitten by (the bundle saving, the subject list and the free-preview
// count all had a second copy at some point). So the component imports them from
// here and the guide quotes the same values, and tools/check-guide-bot.mjs fails
// if the guide and this file disagree.
//
// Changing a number here changes the exam AND what the guide says about it.
export const SECONDS_PER_QUESTION = 90; // ~1.5 min per question
export const MAX_QUESTIONS = 40; // CSEC Paper 1-style fixed length
export const PASS_PERCENTAGE = 60;
