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
  el('grade-row').classList.add('hidden');
  el('guess').disabled = false;
  el('slider').disabled = false;
  el('guess').focus();
}

function syncGuess(v) {
  v = Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
  el('guess').value = v;
  el('slider').value = v;
  el('guess-display').textContent = v;
}

function reveal() {
  if (revealed) return;
  revealed = true;
  const guess = Math.max(0, Math.min(100, Math.round(Number(el('guess').value) || 0)));
  const actual = current.percentile;
  const err = Math.abs(guess - actual);
  const autoQ = qualityFromError(err);

  el('guess').disabled = true;
  el('slider').disabled = true;
  el('reveal-btn').classList.add('hidden');

  el('actual-val').textContent = actual;
  el('guess-val').textContent = guess;
  el('error-val').textContent = err === 0 ? 'exact!' : `off by ${err}`;

  const verdict = el('verdict');
  if (err === 0) { verdict.textContent = '🎯 Perfect'; verdict.className = 'verdict great'; }
  else if (err <= 3) { verdict.textContent = '✅ Excellent'; verdict.className = 'verdict great'; }
  else if (err <= 8) { verdict.textContent = '👍 Close'; verdict.className = 'verdict good'; }
  else if (err <= 15) { verdict.textContent = '😬 Rough'; verdict.className = 'verdict meh'; }
  else { verdict.textContent = '❌ Way off'; verdict.className = 'verdict bad'; }

  // position markers on the scale
  el('marker-actual').style.left = actual + '%';
  el('marker-guess').style.left = guess + '%';

  el('answer-box').classList.remove('hidden');
  el('grade-row').classList.remove('hidden');

  // highlight the suggested grade button
  document.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('suggested'));
  const map = { 5: 'easy', 4: 'good', 3: 'good', 2: 'hard', 1: 'again', 0: 'again' };
  const suggestedBtn = document.querySelector(`.grade-btn[data-grade="${map[autoQ]}"]`);
  if (suggestedBtn) suggestedBtn.classList.add('suggested');

  if (autoQ >= 3) sessionCorrect++;
}

function grade(gradeName) {
  if (!revealed) return;
  const qMap = { again: 1, hard: 3, good: 4, easy: 5 };
  const card = getCard(state, current.id);
  review(card, qMap[gradeName], Date.now());
  saveState(state);
  sessionCount++;
  el('session-count').textContent = sessionCount;
  el('session-acc').textContent = sessionCount
    ? Math.round((sessionCorrect / sessionCount) * 100) + '%'
    : '—';
  refreshStats();
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
document.querySelectorAll('.grade-btn').forEach(btn => {
  btn.addEventListener('click', () => grade(btn.dataset.grade));
});
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

// keyboard grading: 1=again 2=hard 3=good 4=easy, space=reveal
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (!revealed && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); reveal(); return; }
  if (revealed) {
    const keys = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' };
    if (keys[e.key]) { e.preventDefault(); grade(keys[e.key]); }
  }
});

// ---- init ----
refreshStats();
nextCard();
