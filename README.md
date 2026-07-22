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
3. Hit **Reveal** to see the actual value, how far off you were, and both
   positions plotted on the scale.
4. Rate how well you knew it — **Again / Hard / Good / Easy**. A grade is
   auto-suggested from your accuracy, but you have the final say.

### Spaced repetition (SM-2)

Scheduling uses the classic **SM-2 algorithm** (the SuperMemo / Anki family):

- Each hand tracks an easiness factor, interval, and repetition streak.
- Correct answers push the next review further out; misses bring it back soon.
- Your guessing error is mapped to an SM-2 quality score (exact → 5, wildly
  off → 0) to seed the suggested grade.
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

| Key       | Action                    |
|-----------|---------------------------|
| `Space` / `Enter` | Reveal the answer |
| `1` `2` `3` `4`   | Again / Hard / Good / Easy |

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
