// Poker starting-hand percentile chart (0 = strongest, 100 = weakest).
// Transcribed from the reference chart. Rows/cols use rank order below.
// Grid convention: diagonal = pocket pairs, upper-right = suited, lower-left = offsuit.

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

// percentiles[row][col]
const PERCENTILE_GRID = [
  [0, 2, 2, 3, 5, 8, 10, 13, 14, 12, 14, 14, 17],       // A
  [5, 1, 3, 3, 6, 10, 16, 19, 24, 25, 25, 26, 26],      // K
  [8, 9, 1, 5, 6, 10, 19, 26, 28, 29, 29, 30, 31],      // Q
  [12, 14, 15, 2, 6, 11, 17, 27, 33, 35, 37, 37, 38],   // J
  [18, 20, 22, 21, 4, 10, 16, 25, 31, 40, 40, 41, 41],  // T
  [32, 35, 36, 34, 31, 7, 17, 24, 29, 38, 47, 47, 49],  // 9
  [39, 50, 53, 48, 43, 42, 9, 21, 27, 33, 40, 53, 54],  // 8
  [45, 57, 66, 64, 59, 55, 52, 12, 25, 28, 37, 45, 56], // 7
  [51, 60, 71, 80, 74, 68, 61, 57, 16, 27, 29, 38, 49], // 6
  [44, 63, 75, 82, 89, 83, 73, 65, 58, 20, 28, 32, 39], // 5
  [46, 67, 76, 85, 90, 95, 88, 78, 70, 62, 23, 36, 41], // 4
  [49, 67, 77, 86, 93, 96, 98, 93, 81, 74, 76, 23, 46], // 3
  [54, 69, 79, 87, 94, 97, 99, 100, 95, 84, 86, 76, 24] // 2
];

// Build the full list of 169 canonical hands.
// Each: { id, label, type: 'pair'|'suited'|'offsuit', ranks: [hi, lo], percentile }
function buildHands() {
  const hands = [];
  for (let i = 0; i < RANKS.length; i++) {
    for (let j = 0; j < RANKS.length; j++) {
      const percentile = PERCENTILE_GRID[i][j];
      let type, hi, lo, label;
      if (i === j) {
        type = 'pair';
        hi = lo = RANKS[i];
        label = hi + lo;
      } else if (j > i) {
        // upper-right triangle => suited, RANKS[i] is the higher rank
        type = 'suited';
        hi = RANKS[i];
        lo = RANKS[j];
        label = hi + lo + 's';
      } else {
        // lower-left triangle => offsuit, RANKS[j] is the higher rank
        type = 'offsuit';
        hi = RANKS[j];
        lo = RANKS[i];
        label = hi + lo + 'o';
      }
      hands.push({
        id: label,
        label,
        type,
        ranks: [hi, lo],
        percentile
      });
    }
  }
  return hands;
}

const HANDS = buildHands();
