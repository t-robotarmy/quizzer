// Renders realistic playing cards as SVG, with proper pip layouts.

const SUITS = {
  spade:   { glyph: '♠', color: '#1a1a2e', name: 'spades' },
  heart:   { glyph: '♥', color: '#d1345b', name: 'hearts' },
  diamond: { glyph: '♦', color: '#d1345b', name: 'diamonds' },
  club:    { glyph: '♣', color: '#1a1a2e', name: 'clubs' }
};
const SUIT_KEYS = ['spade', 'heart', 'diamond', 'club'];

// Pip column positions (x) and row positions (y) on a 100x140 card face.
const CX = { left: 30, mid: 50, right: 70 };
const RY = { top: 30, upTop: 42, up: 48, upMid: 58, mid: 70, loMid: 82, lo: 92, down: 98, downLo: 110 };

// Layouts: list of [x, y, flipped]. Bottom-half pips are drawn upside down (flipped).
const PIP_LAYOUTS = {
  '2':  [[CX.mid, RY.top, false], [CX.mid, RY.downLo, true]],
  '3':  [[CX.mid, RY.top, false], [CX.mid, RY.mid, false], [CX.mid, RY.downLo, true]],
  '4':  [[CX.left, RY.top, false], [CX.right, RY.top, false], [CX.left, RY.downLo, true], [CX.right, RY.downLo, true]],
  '5':  [[CX.left, RY.top, false], [CX.right, RY.top, false], [CX.mid, RY.mid, false], [CX.left, RY.downLo, true], [CX.right, RY.downLo, true]],
  '6':  [[CX.left, RY.top, false], [CX.right, RY.top, false], [CX.left, RY.mid, false], [CX.right, RY.mid, false], [CX.left, RY.downLo, true], [CX.right, RY.downLo, true]],
  '7':  [[CX.left, RY.top, false], [CX.right, RY.top, false], [CX.mid, 50, false], [CX.left, RY.mid, false], [CX.right, RY.mid, false], [CX.left, RY.downLo, true], [CX.right, RY.downLo, true]],
  '8':  [[CX.left, RY.top, false], [CX.right, RY.top, false], [CX.mid, 50, false], [CX.left, RY.mid, false], [CX.right, RY.mid, false], [CX.mid, 90, true], [CX.left, RY.downLo, true], [CX.right, RY.downLo, true]],
  '9':  [[CX.left, RY.top, false], [CX.right, RY.top, false], [CX.left, RY.up, false], [CX.right, RY.up, false], [CX.mid, RY.mid, false], [CX.left, 92, true], [CX.right, 92, true], [CX.left, RY.downLo, true], [CX.right, RY.downLo, true]],
  '10': [[CX.left, RY.top, false], [CX.right, RY.top, false], [CX.mid, 44, false], [CX.left, RY.up, false], [CX.right, RY.up, false], [CX.left, 92, true], [CX.right, 92, true], [CX.mid, 96, true], [CX.left, RY.downLo, true], [CX.right, RY.downLo, true]]
};

const RANK_DISPLAY = { 'T': '10' };
function rankText(r) { return RANK_DISPLAY[r] || r; }

// Deterministic-ish random suit choice for a hand, but shuffled per render call
// so repeated appearances vary. type: 'pair'|'suited'|'offsuit'
function chooseSuits(type) {
  const shuffled = [...SUIT_KEYS].sort(() => Math.random() - 0.5);
  if (type === 'suited') {
    const s = shuffled[0];
    return [s, s];
  }
  // pair or offsuit: two different suits
  return [shuffled[0], shuffled[1]];
}

function cardSVG(rankChar, suitKey) {
  const suit = SUITS[suitKey];
  const g = suit.glyph;
  const color = suit.color;
  const rt = rankText(rankChar);
  const cornerFont = rt.length > 1 ? 20 : 24;

  let center = '';
  if (PIP_LAYOUTS[rankChar]) {
    center = PIP_LAYOUTS[rankChar].map(([x, y, flip]) => {
      const rot = flip ? `rotate(180 ${x} ${y})` : '';
      return `<text x="${x}" y="${y}" class="pip" fill="${color}" transform="${rot}">${g}</text>`;
    }).join('');
  } else if (rankChar === 'A') {
    center = `<text x="50" y="82" class="pip-big" fill="${color}">${g}</text>`;
  } else {
    // Face cards J/Q/K
    center = `
      <rect x="24" y="34" width="52" height="72" rx="5" fill="none" stroke="${color}" stroke-width="1.4" opacity="0.5"/>
      <text x="50" y="66" class="face-letter" fill="${color}">${rt}</text>
      <text x="50" y="96" class="face-suit" fill="${color}">${g}</text>`;
  }

  return `
  <svg class="card" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${rt} of ${suit.name}">
    <rect x="1.5" y="1.5" width="97" height="137" rx="10" fill="#ffffff" stroke="#d7d7e0" stroke-width="1"/>
    <g class="corner tl" fill="${color}">
      <text x="11" y="24" font-size="${cornerFont}" font-weight="700">${rt}</text>
      <text x="12" y="40" font-size="15">${g}</text>
    </g>
    <g class="corner br" fill="${color}" transform="rotate(180 50 70)">
      <text x="11" y="24" font-size="${cornerFont}" font-weight="700">${rt}</text>
      <text x="12" y="40" font-size="15">${g}</text>
    </g>
    ${center}
  </svg>`;
}

// Render a two-card hand. Returns HTML string of the two overlapping/fanned cards.
function handSVG(hand) {
  const [suitA, suitB] = chooseSuits(hand.type);
  const [hi, lo] = hand.ranks;
  return `
    <div class="hand-cards">
      <div class="card-wrap left">${cardSVG(hi, suitA)}</div>
      <div class="card-wrap right">${cardSVG(lo, suitB)}</div>
    </div>`;
}
