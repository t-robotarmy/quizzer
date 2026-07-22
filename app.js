// Main quiz controller wiring cards + SRS together.

const state = loadState();
let queue = [];
let current = null;
let revealed = false;
let sessionCount = 0;
let sessionCorrect = 0;

const el = (id) => document.getElementById(id);

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

  // reset controls
  el('guess').value = 50;
  el('slider').value = 50;
  el('guess-display').textContent = '50';
  el('answer-box').classList.add('hidden');
  el('reveal-btn').classList.remove('hidden');
  el('grade-result').classList.add('hidden');
  el('guess').disabled = false;
  el('slider').disabled = false;
  el('guess').focus();
}

// Position a tolerance band (a centered ±tol window) on the 0-100 scale.
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

const GRADE_META = {
  easy:  { label: 'Easy',  cls: 'great', emoji: '🎯' },
  good:  { label: 'Good',  cls: 'good',  emoji: '👍' },
  hard:  { label: 'Hard',  cls: 'meh',   emoji: '😬' },
  wrong: { label: 'Wrong', cls: 'bad',   emoji: '❌' }
};

function reveal() {
  if (revealed) return;
  revealed = true;
  const guess = Math.max(0, Math.min(100, Math.round(Number(el('guess').value) || 0)));
  const actual = current.percentile;
  const res = gradeGuess(actual, guess);
  const meta = GRADE_META[res.grade];

  el('guess').disabled = true;
  el('slider').disabled = true;
  el('reveal-btn').classList.add('hidden');

  el('actual-val').textContent = actual;
  el('guess-val').textContent = guess;
  el('error-val').textContent = res.err === 0 ? 'exact!' : `off by ${res.err}`;

  const verdict = el('verdict');
  verdict.textContent = `${meta.emoji} ${meta.label}`;
  verdict.className = 'verdict ' + meta.cls;

  // draw tolerance bands (widest first) then the two markers
  placeBand('band-hard', actual, res.tol.hard);
  placeBand('band-good', actual, res.tol.good);
  placeBand('band-easy', actual, res.tol.easy);
  el('marker-actual').style.left = actual + '%';
  el('marker-guess').style.left = guess + '%';

  el('answer-box').classList.remove('hidden');

  // grade badge + explanatory note
  const badge = el('grade-badge');
  badge.textContent = meta.label;
  badge.className = 'grade-badge ' + meta.cls;
  const within = res.grade === 'wrong'
    ? `outside the Hard band (±${res.tol.hard.toFixed(0)})`
    : `within the ${meta.label} band (±${res.tol[res.grade].toFixed(0)})`;
  el('grade-note').textContent = `Off by ${res.err} — ${within} at this percentile.`;
  el('grade-result').classList.remove('hidden');

  // grading is automatic: apply the SM-2 update immediately
  const card = getCard(state, current.id);
  review(card, res.quality, Date.now());
  saveState(state);
  sessionCount++;
  if (res.quality >= 3) sessionCorrect++;
  el('session-count').textContent = sessionCount;
  el('session-acc').textContent = sessionCount
    ? Math.round((sessionCorrect / sessionCount) * 100) + '%'
    : '—';
  refreshStats();
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
  if (e.key === 'Enter' && !revealed) { e.preventDefault(); reveal(); }
});
el('reveal-btn').addEventListener('click', reveal);
el('continue-btn').addEventListener('click', advance);
el('next-btn').addEventListener('click', () => { queue = []; nextCard(); });
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

// space / enter: reveal the answer, then advance to the next hand
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (revealed) advance(); else reveal();
  }
});

// ---- init ----
refreshStats();
nextCard();
