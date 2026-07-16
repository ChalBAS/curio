# ☀️ Morning report — night build of 2026-07-12

*You said: "impress me… I give freedom to add features, we can review tomorrow."
Here's everything that shipped overnight, every judgment call I made on your
behalf, and what I deliberately did NOT do. All of it is live at
https://chalbas.github.io/curio/ — reload twice on your phone to get the
update (the offline cache updates one load behind).*

## Shipped (all verified in-browser, locally AND on production)

### 1. Comfort panel ⚙️ (the feature you approved)
Gear icon, top right. Seven settings, all persisted on-device:
- **Quick-Fire timer: Normal (15s) / Relaxed (30s) / Off.** The copy says why:
  "Timers measure speed, not knowledge." Scoring stays fair — speed bonus only
  exists when timed, and Relaxed's bonus is capped so it can't out-score Normal.
- **Dyslexia-friendly reading** — rounder font, wider letter/word spacing, taller lines.
- **Text size** — Normal / Large / XL.
- **Read questions aloud** — device's built-in voice reads each question, its
  options, and the depth fact. Free, works offline, plus a 🔊 replay button.
- **Reduced motion** — kills all animations (also auto-respects the OS-level
  preference for everyone, always).
- **High contrast** mode.
- **Age mode: Everyone / Kids (8–12)** — your idea, v1: Kids mode draws only
  from kid-flagged questions (69 of 120), gets its own daily challenge, and
  stays COPPA-clean by design (no accounts, no tracking, nothing to consent to).
- Plus a "reset all my data" escape hatch, and visible keyboard-focus outlines.

### 2. Memory Vault 🗝️ (the flagship differentiator)
Every question you get wrong — anywhere — enters the Vault. It comes back on
a spaced-repetition ladder: **1 → 3 → 7 → 16 → 35 days.** Answer it right at
each step and it climbs; wrong resets it. Survive all five rungs and the fact
is **Mastered** — counted forever on your stats. The home screen shows a
Vault card when reviews are due. This is the feature that makes Curio a
*learning* app instead of a quiz app — it's what Quizlet paywalled and what
Anki never made pleasant.

### 3. Brain Map 🧠
Six bars on the home screen — your accuracy per domain, with titles that make
knowledge a flex: Explorer → Apprentice 📖 → Scholar 🎓 → Sage 🧙. Earn Sage in
all six. (This is the seed of the "knowledge-graph profile" from RESEARCH.md.)

### 4. Question bank: 48 → 120, adversarially fact-checked
- 12 new questions per category, written to be globally minded (Mansa Musa,
  Zheng He, Aksum, Tale of Genji, Things Fall Apart, Frida Kahlo…).
- Every question carries a depth fact; 69 are kid-flagged.
- **Fact-checking:** Geography & Tech were verified by independent agents with
  web search; the other four categories were checked by me question-by-question
  after the checker agents hit the session's usage limit mid-run.
- Errors caught and fixed before shipping: my old Australia fact wrongly
  called it "the world's largest island" (that's Greenland); "first email"
  question had two defensible answers (now pinned to ARPANET); dropped the
  contested "elephants are the only mammal that can't jump" claim; fixed an
  overstated crocodile-bite number; removed a duplicate nitrogen question.

### 5. Plumbing that will matter later
- **Mobile-native share sheet** (Web Share API) for daily results, with
  clipboard fallback — the share text now includes the app link.
- **Versioned assets** (`?v=2`): fixes a real bug I hit where phones would
  keep running stale code after a deploy. Release recipe is now: bump `?v=`
  in index.html + sw.js, bump the cache name, push.
- ✓/✗ icons on answers (colorblind-safe, not just green/red).

## Judgment calls to review (disagree with any → easy to change)
1. Vault ladder intervals (1/3/7/16/35) and "mastered after 5 climbs".
2. Kids flags: I chose generously (69/120) — a curious 10-year-old can handle
   medium questions; Kids mode still has its own difficulty spread.
3. Read-aloud auto-speaks on each new question when enabled (not opt-in per question).
4. Brain Map titles (Explorer/Apprentice/Scholar/Sage) — first pass at "nerd credentials".
5. I pushed everything straight to production since you're the only user.

## Deliberately NOT built (needs your call first)
- **Rabbit Holes** (connected facts) — needs a content model decision.
- **Fact vs. Fake mode** — wants proper per-fact source citations; doing it
  half-way would undercut the mission.
- Translations — architecture note is in PLAN.md §7b; strings not yet extracted.

## Next session candidates
Rabbit Holes → source citations on every fact (unlocks Fact vs. Fake AND
grant applications) → "explain it back" free-recall mode → PWA shortcuts.
