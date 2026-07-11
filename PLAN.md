# Curio — Product Plan (v1, 2026-07-05)

> Working title. "Cabinet of curiosities": fun on the surface, depth underneath.
> Mission: **make being a nerd sexy again.** Knowledge is free, forever.

## 1. What it is

A free general-knowledge app that does for history, science, geography and the
arts what Duolingo did for languages: a daily habit built on play, streaks and
friendly competition — but with real retention underneath (every answer teaches
you something; later versions add spaced repetition so it sticks).

**Differentiator vs. existing trivia apps:** they *test* what you already know
and monetize with ads/paywalls. Curio *builds* knowledge and never paywalls
content.

## 2. Principles (non-negotiable)

1. All knowledge content is free, forever. No paywalled questions, ever.
2. No ad networks, no data selling, no engagement-bait dark patterns.
3. Every question teaches: answering (right or wrong) reveals a "depth fact."
4. Works on a cheap phone in a browser. No forced app install.

## 3. Audience

- Curious adults 18–45 who share Wordle scores and watch explainer YouTube.
- Pub-quiz teams, student groups, workplace Slack channels (viral loops).
- Later (B2B): teachers, quiz hosts, corporate events.

## 4. Monetization ladder (ethical, in order of rollout)

| Stage | Model | Who pays |
|---|---|---|
| v1 | Nothing. Free tiers cost ~$0/mo | Nobody |
| v2 | Supporter tier: cosmetics, badges, "founding nerd" flair, private leagues | Fans, voluntarily |
| v2 | Patronage ("keep knowledge free") à la Wikipedia/Signal | Fans |
| v3 | Services: hosted quiz nights, classroom dashboards, custom packs | Institutions |

Never: ads, data sales, pay-to-win, paywalled learning.

## 5. Tech & cost

- **v1 (this repo):** static site — vanilla HTML/CSS/JS, no build step, no
  backend. State in localStorage. Runs from a double-click; hosts free on
  Cloudflare Pages / GitHub Pages / Vercel.
- **v2:** Supabase or Cloudflare D1 (free tier) for accounts, global
  leaderboards, real leagues. PWA manifest → installable on phones, no app
  store cut.
- **Content:** own curated bank (in `questions.js`), later Open Trivia DB API
  (free) for endless mode and Wikidata/Wikipedia (CC) for learning paths.

## 6. MVP scope (v1 — built now)

- **Daily Challenge** — 5 questions, same for everyone each day, Wordle-style
  shareable emoji result. The viral hook.
- **Quick-Fire** — 10 timed questions by category (or all), speed bonus,
  local high-score board.
- **Streaks** — daily-challenge streak with best-streak record.
- **Depth facts** — every answer reveals a one-line "whoa" fact. The soul of
  the app.
- Question bank: 72 curated questions, 6 categories (History, Science,
  Geography, Arts & Letters, Tech & Math, Nature).

## 7. Roadmap after MVP

*Sharpened 2026-07-12 by the fact-checked competitive scan — see RESEARCH.md
for the full teardown, ranked edge features, and verified monetization models.*

- v1.0 ✅ shipped: MVP + PWA (installable, offline, icons, install prompts).
- v1.1: **Memory Vault** (spaced repetition on missed facts, inside the daily
  loop) + **Rabbit Holes** (depth facts link to connected facts) + more
  questions (target 500).
- v2: accounts, global daily leaderboard, friend leagues, **Curio Nights**
  (free pub-quiz group mode, no player cap — Kahoot just cut free to 10),
  supporter tier + nerd-credential cosmetics.
- v2.5: **Fact vs. Fake** source-literacy mode (mission flagship; grant-
  fundable), learning paths ("Ancient Rome in 30 days").
- v3: community question studio with credibility scoring, B2B pack studio
  (schools / quiz hosts / companies).

Positioning line, validated by the market's retreat from free:
**"Duolingo's fun, without the wall."**

## 8. Success metrics

- D7 retention on the daily challenge (target 25%+).
- Share-rate of daily results (the growth engine — target 10% of completions).
- Time-to-boredom honest check: do *we* still play it after 2 weeks?

## 9. Name

"Curio" is the working title. Alternatives kept: Noggin, Polymath, Erudite,
Quill. Decide before any public launch; check domain + trademark then.
