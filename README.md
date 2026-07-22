# 🃏 Poker Percentile Trainer

A spaced-repetition web app that drills you on the **percentile rank of every
starting hand** in Texas Hold'em (0 = strongest, 100 = weakest), based on the
169-hand reference chart.

Each hand is shown as a pair of **realistic playing cards** — proper pip
layouts, face cards, and suits chosen at random each time (a suited hand shares
one suit; pairs and offsuit hands get two different suits).

## How it works

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

Crucially, **the margin of error grows as the hand gets stronger** (lower
percentile), because premium hands cluster tightly at the top of the chart, so
an absolute miss there is more forgivable. The base margins (±20 / ±30 / ±40
points for Easy / Good / Hard) apply at `p = 0` and shrink smoothly toward
`p = 100`. So at `AA` (p=0) you have ±20 to still score Easy; at `72o` (p=100)
that tightens to ±7.

All four knobs live at the top of `srs.js` and are meant to be tuned by feel:

```js
const TOLERANCE_BASE = { easy: 20, good: 30, hard: 40 }; // margins at p=0
const TOLERANCE_MIN_FACTOR = 0.35;                        // fraction of that at p=100
```

### Spaced repetition (SM-2)

Scheduling uses the classic **SM-2 algorithm** (the SuperMemo / Anki family):

- Each hand tracks an easiness factor, interval, and repetition streak.
- Correct answers push the next review further out; misses bring it back soon.
- The computed grade maps to an SM-2 quality score (Easy → 5, Good → 4,
  Hard → 3, Wrong → 1).
- Progress is saved in `localStorage`, so due cards persist across sessions.

Each session pulls all **due** cards first (most overdue first), then introduces
up to 15 **new** hands.

## Run it

It's a static site — no build step. Just open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Keyboard shortcuts

| Key       | Action                        |
|-----------|-------------------------------|
| `Space` / `Enter` | Reveal, then advance to the next hand |

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
