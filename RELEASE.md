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

---

## Sign-off — how the CEO releases a build

**CEO, 2026-08-13:** *"how do i communicate with you that if we release the uat? and the
release notes and version number? we need an audit tracker of the app i can review."*

**One sentence, in one place.** When a build goes to UAT I open **one release issue** in
`curio-hq` labelled `release`, titled `Release v<N> — sign-off`, pre-filled with the
version, what changed, what the suite covers and the three checks a script cannot do.

You reply to that issue with **`Accepted for production`** — or **`Rejected — <reason>`**.

That sentence is the whole authorisation. Nothing else is needed and **nothing else
counts**: not a message in chat, not a thumbs-up. This is deliberate — the audit record is
built by reading those issues, so a decision made anywhere else would be invisible to it.

**The reading is defensive**, because a misread verdict either ships an unapproved build
or hides one:

| Rule | Why |
|---|---|
| Only **comments** are read, never the issue body | The body is the instruction sheet I write and it contains the words *"Accepted for production — or Rejected"*. The first version of the tool read it and reported v65 as rejected, quoting my own instructions back as your decision |
| Quoted and code-formatted text is stripped first | Replying by quoting the instruction — the natural thing on a phone — must not be read as a verdict |
| Only the CEO's GitHub login can authorise | Otherwise any account with comment access could ship |
| The **latest** verdict wins, both ways | Rejected → fixed → accepted in one thread reads as accepted; an acceptance later withdrawn reads as rejected |

`tools/releases.test.js` holds 21 cases covering each of those, and **preflight runs it**.

### The version number

**There is one number: the `?v=N` in `index.html`.** It is already load-bearing — the
service worker's cache name must match it, and a mismatch is the stale-asset bug. A second
marketing-style version would be a number that can disagree with reality, so there isn't
one. v65 is the sixty-fifth release, full stop.

### The audit tracker

```bash
node tools/releases.js
```

Regenerates **`RELEASES.md`** (in this repo, git-diffable) and **`releases.json`** (read by
the HQ page at `hq.qpioapp.com`, behind your login). Every version ever shipped: date,
question count, the commits that made it, and who signed it off.

**Nothing in it is typed by hand.** The previous log was, and it rotted fifty-five versions
out of date. The version for each commit is read from `index.html` *as it was at that
commit* — so a mistyped commit message cannot falsify the record, and a clash between the
two is reported rather than resolved silently. It also reports **drift** (`main` says v65
but production serves v64) and any release that reached readers without a recorded yes.

Sign-off starts at **v65**. Everything before it shipped under the founder-only regime with
no second party to sign, and is marked *pre-process* — unsigned by design, not by omission.

```bash
node tools/release_issue.js        # open the sign-off ticket for whatever is on UAT
node tools/releases.js --check     # exits 1 if production is unsigned or drifted
```

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

## The scripted run — `tests/uat.html`

Open it on the device that matters: `uat.qpio.app/tests/uat.html` (or `qpio.app/tests/uat.html`
to check what readers actually have). One button. It loads the real app in a frame and drives it.

**36 checks, ~60 seconds**, and the number grows on its own: every journey runs **once per
language × once per screen size**. Adding Spanish is one line in `tests/suite.js` and every
journey re-runs in Spanish forever. Adding a tablet is one line. That is the mutualisation —
authoring cost is paid once, coverage multiplies.

It covers criteria 1–5 and 8: the daily five completes, Next is reachable without scrolling on
every answered question, the destination sits above Next, no question repeats across three
rounds, pictures load and carry alt text in the reader's language, no English prose survives on
a French screen, and nothing throws.

**Storage is snapshotted and restored**, so running it never costs the tester their streak.

**It was proven against a deliberately broken build.** The layout fix was removed from `app.js`
and the suite caught it on both screens — *"5 of 5 questions hid Next behind the tab bar"*.
An earlier version of the suite had **passed** that same broken build, because it only tested
one screen size; that is why sizes are now a dimension. A test that has never failed has never
been tested.

## What this does not cover yet, honestly
- **No analytics on UAT** — deliberately. UAT traffic must never contaminate real numbers.
- **No staged rollout.** Everyone gets a release at once. Fine at this scale; revisit past
  a few thousand readers.
