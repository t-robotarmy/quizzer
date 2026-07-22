// Spaced repetition using the SM-2 algorithm, persisted to localStorage.

const SRS_KEY = 'poker-percentile-srs-v1';
const DAY_MS = 24 * 60 * 60 * 1000;

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(SRS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveState(state) {
  localStorage.setItem(SRS_KEY, JSON.stringify(state));
}

// Return the SRS record for a hand id, creating a fresh one if needed.
function getCard(state, id) {
  if (!state[id]) {
    state[id] = {
      id,
      ef: 2.5,        // easiness factor
      interval: 0,    // days
      reps: 0,        // successful reps in a row
      due: 0,         // timestamp (0 = new, always due)
      lapses: 0,
      seen: 0,
      lastError: null
    };
  }
  return state[id];
}

// ---- Grading ----------------------------------------------------------
// A guess g for a hand of percentile p is graded by how close it is:
//   within EASY margin -> Easy, within GOOD -> Good, within HARD -> Hard,
//   otherwise Wrong.
//
// The margin of error SHRINKS as the hand gets stronger (lower percentile):
// precision matters for premium hands (is this the 8th or the 12th percentile?
// that changes whether you play it), but barely matters for weak hands (60th vs
// 80th is the same fold at a full table). So the tightest tolerances are at the
// top of the chart. The base margins below (in percentile points) are the
// WIDEST case and apply at p = 100 (weakest); they shrink to TOLERANCE_MIN_FACTOR
// of that at p = 0 (strongest). All four numbers are meant to be tuned by feel.
const TOLERANCE_BASE = { easy: 20, good: 30, hard: 40 };
const TOLERANCE_MIN_FACTOR = 0.25; // margin at p=0 as a fraction of the base

// Absolute point-margin allowed at percentile p for a given base margin.
function toleranceAt(p, base) {
  const factor = TOLERANCE_MIN_FACTOR + (1 - TOLERANCE_MIN_FACTOR) * (p / 100);
  return base * factor;
}

// The three (Easy/Good/Hard) margins for a given percentile.
function tolerancesFor(p) {
  return {
    easy: toleranceAt(p, TOLERANCE_BASE.easy),
    good: toleranceAt(p, TOLERANCE_BASE.good),
    hard: toleranceAt(p, TOLERANCE_BASE.hard)
  };
}

const GRADE_QUALITY = { easy: 5, good: 4, hard: 3, wrong: 1 };

// Grade a guess. Returns { grade, quality, err, tol:{easy,good,hard} }.
function gradeGuess(p, g) {
  const err = Math.abs(g - p);
  const tol = tolerancesFor(p);
  let grade;
  if (err <= tol.easy) grade = 'easy';
  else if (err <= tol.good) grade = 'good';
  else if (err <= tol.hard) grade = 'hard';
  else grade = 'wrong';
  return { grade, quality: GRADE_QUALITY[grade], err, tol };
}

// Apply an SM-2 update. quality 0-5. now = current timestamp.
function review(card, quality, now) {
  card.seen += 1;
  if (quality >= 3) {
    if (card.reps === 0) card.interval = 1;
    else if (card.reps === 1) card.interval = 3;
    else card.interval = Math.round(card.interval * card.ef);
    card.reps += 1;
  } else {
    card.reps = 0;
    card.interval = quality <= 1 ? 0 : 1; // failed badly => relearn this session
    card.lapses += 1;
  }
  // update easiness factor
  card.ef = Math.max(1.3, card.ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  card.due = card.interval === 0
    ? now + 60 * 1000            // relearn in ~1 min (same session)
    : now + card.interval * DAY_MS;
  return card;
}

// Build a study queue: due cards first (most overdue), then a capped batch of new cards.
function buildQueue(state, hands, opts = {}) {
  const now = opts.now ?? Date.now();
  const newLimit = opts.newLimit ?? 15;

  const due = [];
  const fresh = [];
  for (const hand of hands) {
    const card = getCard(state, hand.id);
    if (card.seen === 0) {
      fresh.push(hand);
    } else if (card.due <= now) {
      due.push(hand);
    }
  }
  due.sort((a, b) => state[a.id].due - state[b.id].due);
  // Shuffle new cards so we don't always drill AA first.
  for (let i = fresh.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
  }
  return due.concat(fresh.slice(0, newLimit));
}

function stats(state, hands, now = Date.now()) {
  let learned = 0, due = 0, fresh = 0, mature = 0;
  for (const hand of hands) {
    const card = state[hand.id];
    if (!card || card.seen === 0) { fresh += 1; continue; }
    learned += 1;
    if (card.interval >= 21) mature += 1;
    if (card.due <= now) due += 1;
  }
  return { learned, due, fresh, mature, total: hands.length };
}

function resetState() {
  localStorage.removeItem(SRS_KEY);
}
