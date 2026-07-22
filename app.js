// Main quiz controller wiring cards + SRS together.

const state = loadState();
let queue = [];
let current = null;
let currentPos = null;      // active seat context in position mode
let revealed = false;
let mode = 'percentile';    // 'percentile' | 'position'
let sessionCount = 0;
let sessionCorrect = 0;

const el = (id) => document.getElementById(id);

// Opening (raise-first-in) ranges as "top X%" thresholds. Approximate, blending
// a Sklansky-style positional tightening with modern GTO frequencies. A hand is
// an open if its percentile <= threshold. Tune freely.
const POSITIONS = [
  { table: '9-max', seat: 'UTG', threshold: 9 },
  { table: '9-max', seat: 'MP',  threshold: 14 },
  { table: '9-max', seat: 'HJ',  threshold: 18 },
  { table: '9-max', seat: 'CO',  threshold: 26 },
  { table: '9-max', seat: 'BTN', threshold: 46 },
  { table: '9-max', seat: 'SB',  threshold: 42 },
  { table: '6-max', seat: 'UTG', threshold: 19 },
  { table: '6-max', seat: 'HJ',  threshold: 23 },
  { table: '6-max', seat: 'CO',  threshold: 30 },
  { table: '6-max', seat: 'BTN', threshold: 48 },
  { table: '6-max', seat: 'SB',  threshold: 43 }
];

const GRADE_META = {
  easy:  { label: 'Easy',  cls: 'great', emoji: '🎯' },
  good:  { label: 'Good',  cls: 'good',  emoji: '👍' },
  hard:  { label: 'Hard',  cls: 'meh',   emoji: '😬' },
  wrong: { label: 'Wrong', cls: 'bad',   emoji: '❌' }
};

function refreshStats() {
  const s = stats(state, HANDS);
  el('stat-learned').textContent = s.learned;
  el('stat-due').textContent = s.due;
  el('stat-new').textContent = s.fresh;
  el('stat-mature').textContent = s.mature;
  const pct = Math.round((s.learned / s.total) * 100);
  el('progress-fill').style.width = pct + '%';
  el('progress-label').textContent = `${s.learned}/${s.total} hands learned`;
}

function nextCard() {
  revealed = false;
  if (queue.length === 0) {
    queue = buildQueue(state, HANDS, { newLimit: 15 });
  }
  if (queue.length === 0) {
    showAllDone();
    return;
  }
  current = queue.shift();
  renderQuestion();
}

function renderQuestion() {
  el('done-screen').classList.add('hidden');
  el('quiz').classList.remove('hidden');

  el('card-area').innerHTML = handSVG(current);
  el('hand-label').textContent = current.label;
  el('hand-type').textContent = current.type;
  el('hand-type').className = 'type-badge ' + current.type;

  const card = getCard(state, current.id);
  el('card-meta').textContent = card.seen === 0
    ? 'new hand'
    : `seen ${card.seen}× · streak ${card.reps}`;

  el('answer-box').classList.add('hidden');
  el('grade-result').classList.add('hidden');

  if (mode === 'percentile') {
    el('mode-percentile').classList.remove('hidden');
    el('mode-position').classList.add('hidden');
    el('prompt').textContent = 'What percentile is this hand?';
    el('guess').value = 50;
    el('slider').value = 50;
    el('guess-display').textContent = '50';
    el('guess').disabled = false;
    el('slider').disabled = false;
    el('reveal-btn').classList.remove('hidden');
    el('guess').focus();
  } else {
    el('mode-position').classList.remove('hidden');
    el('mode-percentile').classList.add('hidden');
    currentPos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
    el('seat-table').textContent = currentPos.table;
    el('seat-name').textContent = currentPos.seat;
    el('prompt').textContent = 'Open or fold from this seat?';
    el('open-btn').disabled = false;
    el('fold-btn').disabled = false;
  }
}

// Position a band (a window on the 0-100 scale) via absolute left/width.
function placeBand(id, center, tol) {
  const lo = Math.max(0, center - tol);
  const hi = Math.min(100, center + tol);
  el(id).style.left = lo + '%';
  el(id).style.width = (hi - lo) + '%';
}

function syncGuess(v) {
  v = Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
  el('guess').value = v;
  el('slider').value = v;
  el('guess-display').textContent = v;
}

// Shared tail: show verdict/badge/note, apply the SM-2 update, reveal the panel.
function finishReveal(grade, verdictText, noteText) {
  const meta = GRADE_META[grade];
  const verdict = el('verdict');
  verdict.textContent = verdictText;
  verdict.className = 'verdict ' + meta.cls;

  const badge = el('grade-badge');
  badge.textContent = meta.label;
  badge.className = 'grade-badge ' + meta.cls;
  el('grade-note').textContent = noteText;

  el('answer-box').classList.remove('hidden');
  el('grade-result').classList.remove('hidden');

  const card = getCard(state, current.id);
  const quality = GRADE_QUALITY[grade];
  review(card, quality, Date.now());
  saveState(state);
  sessionCount++;
  if (quality >= 3) sessionCorrect++;
  el('session-count').textContent = sessionCount;
  el('session-acc').textContent = Math.round((sessionCorrect / sessionCount) * 100) + '%';
  refreshStats();
}

function revealPercentile() {
  if (revealed) return;
  revealed = true;
  const guess = Math.max(0, Math.min(100, Math.round(Number(el('guess').value) || 0)));
  const actual = current.percentile;
  const res = gradeGuess(actual, guess);
  const meta = GRADE_META[res.grade];

  el('guess').disabled = true;
  el('slider').disabled = true;
  el('reveal-btn').classList.add('hidden');

  el('ans-percentile').classList.remove('hidden');
  el('ans-position').classList.add('hidden');

  el('actual-val').textContent = actual;
  el('guess-val').textContent = guess;
  el('error-val').textContent = res.err === 0 ? 'exact!' : `off by ${res.err}`;

  placeBand('band-hard', actual, res.tol.hard);
  placeBand('band-good', actual, res.tol.good);
  placeBand('band-easy', actual, res.tol.easy);
  el('marker-actual').style.left = actual + '%';
  el('marker-guess').style.left = guess + '%';

  const within = res.grade === 'wrong'
    ? `outside the Hard band (±${res.tol.hard.toFixed(0)})`
    : `within the ${meta.label} band (±${res.tol[res.grade].toFixed(0)})`;
  finishReveal(res.grade, `${meta.emoji} ${meta.label}`,
    `Off by ${res.err} — ${within} at this percentile.`);
}

function revealPosition(action) {
  if (revealed) return;
  revealed = true;
  const p = current.percentile;
  const t = currentPos.threshold;
  const res = gradePositionDecision(p, t, action);

  el('open-btn').disabled = true;
  el('fold-btn').disabled = true;

  el('ans-position').classList.remove('hidden');
  el('ans-percentile').classList.add('hidden');

  el('pos-pct').textContent = p;
  el('pos-thresh').textContent = 'top ' + t + '%';
  el('pos-correct').textContent = res.shouldOpen ? 'Open' : 'Fold';

  el('open-zone').style.left = '0%';
  el('open-zone').style.width = t + '%';
  el('marker-thresh').style.left = t + '%';
  el('marker-hand').style.left = p + '%';

  const yourAction = action === 'open' ? 'Open' : 'Fold';
  const emoji = res.correct ? (res.close ? '👍' : '✅') : '❌';
  const verdictText = res.correct
    ? `${emoji} Correct — ${yourAction}`
    : `${emoji} ${yourAction} — should ${res.shouldOpen ? 'Open' : 'Fold'}`;
  const note = `${current.label} is ${p}th pct · ${currentPos.table} ${currentPos.seat} opens top ${t}%`
    + (res.close ? ' — a marginal, mixed spot.' : '.');
  finishReveal(res.grade, verdictText, note);
}

function advance() {
  if (!revealed) return;
  nextCard();
}

function showAllDone() {
  el('quiz').classList.add('hidden');
  el('done-screen').classList.remove('hidden');
  const s = stats(state, HANDS);
  el('done-msg').textContent = s.fresh === 0
    ? 'You have studied every hand at least once. Come back as cards fall due!'
    : 'Nothing due right now — great work.';
}

// ---- events ----
el('slider').addEventListener('input', (e) => syncGuess(e.target.value));
el('guess').addEventListener('input', (e) => syncGuess(e.target.value));
el('guess').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !revealed) { e.preventDefault(); revealPercentile(); }
});
el('reveal-btn').addEventListener('click', revealPercentile);
el('open-btn').addEventListener('click', () => revealPosition('open'));
el('fold-btn').addEventListener('click', () => revealPosition('fold'));
el('continue-btn').addEventListener('click', advance);
el('next-btn').addEventListener('click', () => { queue = []; nextCard(); });

document.querySelectorAll('.mode-btn').forEach((b) => {
  b.addEventListener('click', () => {
    if (b.dataset.mode === mode) return;
    mode = b.dataset.mode;
    document.querySelectorAll('.mode-btn').forEach((x) =>
      x.classList.toggle('active', x.dataset.mode === mode));
    queue = [];
    nextCard();
  });
});

el('reset-btn').addEventListener('click', () => {
  if (confirm('Reset all learning progress? This cannot be undone.')) {
    resetState();
    for (const k in state) delete state[k];
    queue = [];
    sessionCount = 0; sessionCorrect = 0;
    el('session-count').textContent = 0;
    el('session-acc').textContent = '—';
    refreshStats();
    nextCard();
  }
});

// keyboard: space/enter reveals or advances; O/F choose the action in position mode
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (revealed) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advance(); }
    return;
  }
  if (mode === 'percentile') {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); revealPercentile(); }
  } else {
    if (e.key === 'o' || e.key === 'O') { e.preventDefault(); revealPosition('open'); }
    else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); revealPosition('fold'); }
  }
});

// ---- init ----
refreshStats();
nextCard();
