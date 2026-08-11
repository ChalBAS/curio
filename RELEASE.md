# RELEASE METHODOLOGY

**CEO, 2026-08-11:** *"We need a UAT version of the app I can test locally or in a sandbox
before we push to the customer… strict criteria and release methodology. Nothing worse
than breaking a customer's trust with an unstable app."*

Not critical while the only user is the founder. **Critical from the first beta tester**
(milestone M2). Written now because a release process retrofitted after the first bad
release is a process written in an emergency.

---

## The three environments

| | Where | Who sees it | Purpose |
|---|---|---|---|
| **LOCAL** | `http://localhost:8749` | me, during work | Every change is seen here before it is committed at all |
| **UAT** | `uat.qpio.app` *(to be connected — see below)* | the CEO, and later a handful of testers | The build the CEO signs off. Identical code to what would ship. Separate origin, so its own cache and its own saved progress — testing it cannot corrupt real data |
| **PRODUCTION** | `qpio.app` | everyone | Only ever receives a build the CEO has accepted on UAT |

**Why a separate origin matters more than it looks.** A browser scopes the service worker,
the cache and every saved streak to the origin. Testing on a different origin means a
half-finished build can never poison a real reader's saved progress, and a tester's
experiments can never be mistaken for real usage data once analytics exists.

---

## The flow

```
work  →  git push origin uat  →  UAT deploys automatically  →  CEO tests
                                                                  ↓
                                        rejected ──────────┐   accepted
                                                           ↓      ↓
                                                    fix on uat   merge uat → main
                                                                  ↓
                                                          PRODUCTION
```

**Branches.** `uat` is where work lands. `main` is production and is only ever written to
by a merge from `uat`. Nothing is committed directly to `main` again.

---

## The gate — `node tools/preflight.js`

One command, one answer. It exits non-zero and the release stops.

| # | Check | The failure it prevents |
|---|---|---|
| 1 | Every script parses | A syntax error in a data file is a blank screen on a phone, not an error message |
| 2 | `index.html`, `sw.js` and the cache name all on the same version; every loaded asset precached | **The stale-asset bug.** This class has bitten us for real: a version bumped in one file and not the other served yesterday's app to a returning reader |
| 3 | EN/FR banks equal length and answer-index aligned; no malformed options, answers, sources or missing alt text; no duplicate questions | Silent French breakage (the merge refuses and serves French unmerged), unanswerable picture questions, the flag-collision duplicate class |
| 4 | Every UI string translated (strict) | A French reader hitting an English sentence |
| 5 | `--full`: every question's source resolves to a live Wikipedia article | Dead links, redirects and disambiguation pages — which break the picture, the French title and the go-further links all at once, quietly |

```bash
node tools/preflight.js          # fast, no network — before every push to uat
node tools/preflight.js --full   # adds source verification — before every promotion to production
```

**Green does not mean good.** It means structurally sound. Whether the app is *good* is a
human judgement and that is exactly what UAT is for.

---

## Acceptance criteria — what the CEO is signing off

A build is accepted when all of these are true on a real phone, not a simulator:

**Must pass — any failure blocks the release**
1. A first-time visitor can complete the daily five without instruction.
2. Nothing needs scrolling to be usable: on every answered question the fact, the
   destination and Next are all on screen above the tab bar.
3. No question repeats within a session, and none repeats one already answered this month.
4. Every picture loads, or degrades to something that still makes sense.
5. Both languages: switch to French and the same journey works, with no English left on
   screen except proper nouns.
6. Offline: turn on aeroplane mode mid-session — the app keeps working.
7. Install to the home screen, close it fully, reopen — progress is intact and the version
   is the new one.
8. Nothing in the browser console is red.

**Should pass — a failure is logged, and may still ship with the CEO's explicit call**
9. Every new question's source opens and supports the fact.
10. Sub-topics have enough questions to fill a round.
11. The app is usable one-handed on a 360px-wide phone.

**Sign-off is a sentence in the release issue:** *"Accepted for production"* or *"Rejected —
<reason>"*. No merge to `main` without it, once beta testers exist.

---

## Rollback

Production is a static site in git. Rolling back is reverting a merge and pushing — under a
minute, no build, no database migration. The service worker is network-first for the page
shell, so a returning reader picks up the rollback on their next open rather than staying
stuck on the bad version. **This is why the shell is network-first, and why it must stay that
way.**

---

## Connecting UAT — 15 minutes, free, CEO action

Cloudflare Pages gives a preview deployment per branch at no cost, and DNS is already at
Cloudflare. (The technology research separately recommends moving hosting there anyway:
GitHub Pages has a 100 GB/month soft bandwidth limit that an image-heavy app will meet.)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Pick the `ChalBAS/curio` repository.
3. Framework preset **None**. Build command **empty**. Output directory **`/`** — the app is
   static, there is nothing to build.
4. Set the **production branch to `uat`**, not `main`. This is deliberate: the Cloudflare
   project serves UAT only. Production stays on GitHub Pages at qpio.app, untouched, so
   connecting UAT cannot affect live readers.
5. Once it deploys, **Custom domains** → add `uat.qpio.app`.

Result: every push to `uat` publishes to `uat.qpio.app` within about a minute, automatically,
and qpio.app does not move until a human merges.

*Until this is connected, UAT is `http://localhost:8749` on this machine — real, but only
testable here.*

---

## What this does not cover yet, honestly

- **No automated browser test.** The acceptance criteria above are run by a human. A
  scripted smoke test through the daily five is worth building when a release goes out
  weekly rather than several times a day.
- **No analytics on UAT** — deliberately. UAT traffic must never contaminate real numbers.
- **No staged rollout.** Everyone gets a release at once. Fine at this scale; revisit past
  a few thousand readers.
