# THE QUESTION FACTORY — daily run book

**The gate (CEO, 2026-08-10): no beta tester sees Qpio below 2,000 verified questions.**
472 on 10 Aug · +1,528 needed · ~75/day from 11 Aug lands 2,000 on 31 Aug.

## Why 2,000 and not "more is better"

At five questions a day, 2,000 questions is **400 days** before the daily challenge
can repeat itself. Below that number a committed beta tester exhausts the bank
during the beta, and the repeat problem — the one that would have shipped — comes
straight back. 2,000 is the smallest number that makes the no-repeat promise real
for a year.

## The balance being built to

Today's bank is lopsided because it grew by commission rather than by plan:
History has 139 questions and Nature has 20. The target flattens it, because a
reader who picks Nature deserves the same depth as one who picks History.

| Category | 10 Aug | Target | Gap | Sub-areas to fill |
|---|---:|---:|---:|---|
| History | 139 | 400 | +261 | Asia, Americas, Middle East, Europe (Africa is already deep at 67) |
| Science | 121 | 400 | +279 | Physics 11 and Earth & Space 7 are nearly empty; Chemistry 16 |
| Geography | 117 | 350 | +233 | Cities & Places 5, Landscapes 21; capitals, rivers, borders |
| Arts | 20 | 250 | +230 | the whole category — music, cinema, literature, architecture, non-Western art |
| Tech | 55 | 300 | +245 | how things work, inventors, the internet, AI literacy |
| Nature | 20 | 300 | +280 | animals, plants, ecosystems, weather, oceans, evolution |
| **Total** | **472** | **2,000** | **+1,528** | |

## The daily run

```
node tools/run_daily_batch.js <category> [count]
```

Each run: subject editors write against the house rules, a second agent attacks
every question with the source article open, `check_sources.py` proves every
citation is a real Wikipedia article, `merge_questions.py` refuses the batch on
any structural fault, then the entity data (images, French titles, hooks) rebuilds.

**Nothing ships unverified.** A batch whose checkers fail is held, not shipped —
this has happened twice and both times the content waited.

## The three gates every question passes

1. **Written** by a subject editor against the house rules: the fact must teach
   something the reader did not know, distractors must be plausible and
   same-kind, the source must be the article about the *subject*.
2. **Attacked** by a second agent with the Wikipedia article open: is the answer
   actually right, is the fact overstated, is there a reading where two options
   are both correct, is the French a real translation.
3. **Proved** mechanically: every `src` resolved against the live Wikipedia API —
   dead links, redirects and disambiguation pages are hard failures.

On the last 144-question batch that pipeline corrected 18 and dropped 2.

## Daily log

| Date | Category | Written | Kept | Dropped | Bank after |
|---|---|---:|---:|---:|---:|
| 10 Aug | *(baseline)* | — | — | — | 472 |
| 11 Aug | Nature · Arts · Tech · Physics · Earth&Space | 160 | 159 | 1 | **631** |
