# 🦉 Curio

**Five questions a day about the world, each with the story behind the
answer. Free to play. I am curious to become wise.**

Qpio is a progressive web app in plain HTML, CSS and JavaScript with no build
step, served by a small Cloudflare Worker (worker/) that also runs the
anonymous counting and the optional morning reminder. Your progress and
settings live in your own browser (localStorage), and nothing here ever asks
for a name or an email — Qpio measures the pool, never the person (Charter §8).
Install it from your phone's browser; the doors out to the real world need a
connection.

## Principles

1. All knowledge content is free, forever. No paywalled questions, ever.
2. No ad networks, no data selling, no engagement-bait dark patterns.
3. Every answer teaches: right or wrong, you get a "depth fact."
4. Works on a cheap phone in a browser. No forced app install.

## Run locally

Serve the folder with any static server, e.g.:

```
py -m http.server 8123
```

…or just open `index.html` in a browser (offline/PWA features need a server).

## Project docs

- `docs/PLAN.md` — product plan, monetization principles, roadmap
- `docs/RESEARCH.md` — fact-checked competitive landscape & edge strategy
- `docs/STATUS.md` — current build/gate status
- `docs/MORNING.md` — daily working notes
