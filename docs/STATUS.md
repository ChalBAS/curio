# Curio — current status (2026-07-12)

Live at **https://chalbas.github.io/curio/** · repo github.com/ChalBAS/curio

## ✅ Shipped & live

**v1.0** — MVP: daily challenge, quick-fire, streaks, depth facts, PWA (installable, offline).
**v1.1** — Comfort panel (no-timer / dyslexia / text size / read-aloud / reduced-motion / high-contrast), Memory Vault (spaced repetition), Brain Map, Kids mode, bank 48 → 120.
**v1.2** —
- **🔎 Fact or Fake?** — the media-literacy mode. Judge a claim Real vs. Fake; the reveal names the misinformation *trick* and links a source. 16 editor-verified statements.
- **Source citations** — a "source ↗" link on every cited fact.
- **🕳️ Rabbit Holes** — "Go deeper" unfolds connected facts on richer questions.
- **🧠 Explain it back** — on Vault repeats you type the answer from memory first (typo-tolerant, +25).

**v1.3** (just shipped) —
- **🌍 Decolonized region history** — history bank 20 → 70 questions, tagged and region-balanced (Africa 14, Americas 12, Asia 15, Europe 16, Middle East 11), told from each people's own perspective. A region sub-filter appears when you pick History in Quick-Fire.
- **🧳 Before you travel** — 5 fact-checked city packs (Rome, Kyoto, Cairo, Mexico City, Istanbul): a city quiz (history incl. pre-colonial + culture + food + landmarks, all cited), 6 useful local phrases each (spoken aloud in the native language), and 5 "know before you go" etiquette tips.
- Every new item was authored then adversarially fact-checked; the batch had 1 fix and 0 drops.

## 🚧 Held back on purpose (unverified)

90 new History/Science/Geography questions and 24 Fact-or-Fake drafts were authored but their **fact-check step failed** (account session limits mid-run). Per the core rule — *never ship an unverified fact* — they're parked in the run's output file for a verification pass later, not shipped.

## Content principle (locked in)

History is told from **all peoples' perspectives, not the coloniser's** — region-balanced, centering the civilizations whose history it is. Every fact carries a citation. This is both the mission and the reach strategy.

## Release recipe

Bump `?v=N` on styles/app/questions/truthlab/citypacks in `index.html` **and** in `sw.js` (ASSETS + CACHE name), then `git push`. Currently at `v7`.
