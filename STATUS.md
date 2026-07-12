# Curio — current status (2026-07-12)

Live at **https://chalbas.github.io/curio/** · repo github.com/ChalBAS/curio

## ✅ Shipped & live

**v1.0** — MVP: daily challenge, quick-fire, streaks, depth facts, PWA (installable, offline).
**v1.1** — Comfort panel (no-timer / dyslexia / text size / read-aloud / reduced-motion / high-contrast), Memory Vault (spaced repetition), Brain Map, Kids mode, bank 48 → 120.
**v1.2** (just shipped) —
- **🔎 Fact or Fake?** — the media-literacy mode. Judge a claim Real vs. Fake; the reveal names the misinformation *trick* and links a source. 16 editor-verified statements.
- **Source citations** — a "source ↗" link on every cited fact. 60 of 120 facts cited so far.
- **🕳️ Rabbit Holes** — "Go deeper" unfolds connected facts on richer questions.
- **🧠 Explain it back** — on Vault repeats you type the answer from memory first (typo-tolerant, +25).

## ⏳ Generating now (background)

Decolonized **region-tagged history** (Africa, Americas, Asia, Europe, Middle East — 10 each) and **5 full pre-travel city packs** (Rome, Kyoto, Cairo, Mexico City, Istanbul: history incl. pre-colonial + culture + food + landmarks + 6 local phrases + 5 etiquette tips). Each item is fact-checked before it can ship. When it lands: merge → build the city-packs UI + History region filter → verify → deploy.

## 🚧 Held back on purpose (unverified)

90 new History/Science/Geography questions and 24 Fact-or-Fake drafts were authored but their **fact-check step failed** (account session limits mid-run). Per the core rule — *never ship an unverified fact* — they're parked in the run's output file for a verification pass later, not shipped.

## Content principle (locked in)

History is told from **all peoples' perspectives, not the coloniser's** — region-balanced, centering the civilizations whose history it is. Every fact carries a citation. This is both the mission and the reach strategy.

## Release recipe

Bump `?v=N` on styles/app/questions/truthlab in `index.html` **and** in `sw.js` (ASSETS + CACHE name), then `git push`. Currently at `v6`.
