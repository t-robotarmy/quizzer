# 🃏 Poker Percentile Trainer

A spaced-repetition web app that drills you on the **percentile rank of every
starting hand** in Texas Hold'em (0 = strongest, 100 = weakest), based on the
169-hand reference chart.

Each hand is shown as a pair of **realistic playing cards** — proper pip
layouts, face cards, and suits chosen at random each time (a suited hand shares
one suit; pairs and offsuit hands get two different suits).

Two study modes share the same spaced-repetition schedule:

- **Percentile** — guess the hand's exact rank.
- **Play or Fold** — a hand is dealt for a random seat (table size + position);
  you decide whether to open (raise first in) or fold. Trains the actual
  decision rather than an abstract number.

## Percentile mode

1. A hand is dealt as two cards (e.g. `A♠ 5♦`).
2. You guess its percentile using the slider or the number box (0–100).
3. Hit **Reveal** to see the actual value, how far off you were, both positions
   plotted on the scale, and the shaded **Easy / Good / Hard tolerance bands**.

### Grading (percentile-scaled margin of error)

The grade is computed automatically from how close your guess is:

| Grade  | Guess is within… |
|--------|------------------|
| Easy   | the Easy margin  |
| Good   | the Good margin  |
| Hard   | the Hard margin  |
| Wrong  | outside all bands |

Crucially, **the margin of error shrinks as the hand gets stronger** (lower
percentile), and it stays tight across the whole *decision zone*. Every
open/fold call lives in roughly the top ~50 percentiles (UTG ~8% up to the
button ~48%), so precision has to hold across that entire band — not just at
the very top — then blow out in the fold zone where rank is irrelevant (60th vs
80th is the same fold).

To get that shape, the margin follows a **power curve**: the base margins are
the *widest* case (at `p = 100`) and shrink toward `p = 0`, with `GAMMA > 1`
keeping the top of the chart tight until you're deep in the fold zone. Easy
margin works out to ≈ ±3.3 at the 8th percentile, ±3.9 at the 25th, ±5.8 at the
45th, then ±10 by the 70th and ±18 at the bottom.

All three knobs live at the top of `srs.js` and are meant to be tuned by feel:

```js
const TOLERANCE_BASE = { easy: 18, good: 28, hard: 40 }; // widest margins, at p=100
const TOLERANCE_MIN_FACTOR = 0.18;   // fraction of that at p=0 (strongest)
const TOLERANCE_GAMMA = 2.2;         // 1 = linear; higher = only the top matters
```

### Spaced repetition (SM-2)

Scheduling uses the classic **SM-2 algorithm** (the SuperMemo / Anki family):

- Each hand tracks an easiness factor, interval, and repetition streak.
- Correct answers push the next review further out; misses bring it back soon.
- The computed grade maps to an SM-2 quality score (Easy → 5, Good → 4,
  Hard → 3, Wrong → 1).
- Progress is saved in `localStorage`, so due cards persist across sessions.

Each session pulls all **due** cards first (most overdue first), then introduces
up to 15 **new** hands. Both modes feed the same schedule, since both test the
same underlying knowledge of a hand's strength.

## Play or Fold mode

A hand is dealt alongside a random seat — table size (`9-max` / `6-max`) and
position (`UTG`, `MP`, `HJ`, `CO`, `BTN`, `SB`). You choose **Open / Raise** or
**Fold**; the reveal shows the hand's percentile against that seat's opening
cutoff, with the open range shaded on the scale.

Each seat has a "top X%" opening (raise-first-in) threshold — a hand is an open
if its percentile ≤ threshold. Hands near the cutoff are treated as marginal
(mixed in practice), so being on the wrong side there only costs a **Hard**, not
a **Wrong**. The thresholds are approximate — a blend of Sklansky-style
positional tightening and modern GTO frequencies — and live in the `POSITIONS`
table at the top of `app.js`, ready to match whatever ranges your class uses:

```js
const POSITIONS = [
  { table: '9-max', seat: 'UTG', threshold: 9 },
  { table: '9-max', seat: 'CO',  threshold: 26 },
  { table: '9-max', seat: 'BTN', threshold: 46 },
  // …edit / add rows freely
];
```

> Note: a single global ranking is a simplification — real ranges re-order hands
> by situation (suited connectors and small pairs gain value multiway/deep;
> offsuit broadways lose it). This mode builds the positional backbone; pair it
> with a full range tool as you go deeper.

## Run it

It's a static site — no build step. Just open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Keyboard shortcuts

| Key       | Action                        |
|-----------|-------------------------------|
| `Space` / `Enter` | Reveal (percentile mode), then advance to the next hand |
| `O` / `F` | Open / Fold (Play or Fold mode) |

## Files

| File         | Purpose                                              |
|--------------|------------------------------------------------------|
| `index.html` | Markup + layout                                      |
| `styles.css` | Styling (dark felt-inspired theme)                   |
| `data.js`    | The 13×13 percentile chart → 169 canonical hands     |
| `cards.js`   | SVG playing-card renderer (pips, faces, suits)       |
| `srs.js`     | SM-2 spaced-repetition engine + localStorage         |
| `app.js`     | Quiz flow, grading, and stats                        |

## Resetting

The **Reset progress** button clears all saved scheduling data.
