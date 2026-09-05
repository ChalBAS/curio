# Picture rights — how to check them without trusting us

Qpio ships around 930 pictures. This page exists so that the founder, a lawyer,
an investor or a partner can satisfy themselves about the rights **without
taking anybody's word for it**, including this repository's.

---

## The one command

```bash
node tools/verify_image_rights.js
```

It exits **0** only if every picture is clear. Any problem exits non-zero and
names the picture, the file and the reason. To keep a dated copy:

```bash
node tools/verify_image_rights.js --report rights-2026-09-05.txt
```

### It runs on its own, every day

You do not have to remember to run it.

| When | What happens |
|---|---|
| **Every day at 08:12** | The Windows task `Qpio-DailyDashboard` runs the HQ sync, which runs this check before it builds anything else. The verdict is written to state, committed, and pushed. |
| **In the cockpit** | The verdict appears in the question-bank card — green when clear, red when not, **shown either way**. A control you only see when it fails is one you stop believing when it passes. |
| **Before any release** | `node tools/preflight.js` runs it too, so a version cannot be promoted while a picture is unclear. |

**A stale pass is not a pass, and the daily control knows it.** Two guards, both
tested by deliberately breaking them:

- **Older than 36 hours** → reads `STALE`, not clear.
- **The pictures changed since the check ran** → reads
  `STALE — PICTURES CHANGED SINCE`. A green light from before the change is
  worse than a red one, because nobody looks twice at green.

If the check cannot reach Wikimedia, it fails rather than passing quietly, and
the sync carries on so one network hiccup does not stop the rest of the day.
"Could not check" never reads as "checked".

---

## Why this check is different from the others

There are three picture tools in this repository and only one of them is
evidence.

| Tool | What it reads | What it is worth |
|---|---|---|
| `audit_image_licences.py` | the licence **this repository claims** | useful for tidying; **not evidence** — it marks its own homework |
| `check_image_credits.py` | the credit **this repository claims** | same |
| **`verify_image_rights.js`** | **what Wikimedia Commons says today** | **evidence** — it ignores our records and compares |

The first two would happily pass a picture whose recorded licence is wrong.
The third catches exactly that, and did: it found one picture this repository
described as CC BY-SA that Commons says is public domain, eight served from a
location where the licence could not be checked at all, and two pictures that
were AI-generated without our saying so.

---

## What the check actually does

For every picture the app ships:

1. **Establishes where it is hosted.** Three outcomes are possible, and only
   two are acceptable — Wikimedia Commons, or our own files. Anything else
   fails, because a picture we cannot trace is a picture we cannot defend.
2. **Asks Wikimedia Commons what the licence is**, live, today — not what we
   recorded when the picture was added.
3. **Requires the licence to permit commercial use and derivative works.**
   The accepted list is deliberately short:
   *Public domain · CC0 · CC BY (any version) · CC BY-SA (any version) · FAL ·
   GODL-India.*
4. **Requires a credit** wherever the licence asks for one — the CC BY and
   CC BY-SA family do.
5. **Compares Commons' answer to our record** and fails on any disagreement,
   because a repository describing a picture wrongly is the failure this
   whole check exists to catch.
6. **Reads Commons' restriction notes** and separates the ones that matter
   from the ones that do not (below).
7. **Requires AI-generated pictures to be marked** as such.

## Restrictions: which matter and which do not

Commons attaches advisory notes to many files. Treating them all as blockers
would bury the one that matters under 160 that do not, so they are classified:

**Advisory — these do not block.** `insignia`, `coa`, `currency` warn that a
flag or coat of arms may be protected by laws about the *misuse of national
symbols*. They do not limit copyright reuse, and showing a national flag in a
quiz about flags is the ordinary permitted use. `communist`, `israelflag`,
`nazi` flag symbols restricted in particular countries — a distribution
question for those markets, not a copyright bar. `trademarked`, `personality`,
`noresize`, `costume`, `design` are trademark, publicity or rendering notes.

**Blocking — these fail the check.** Anything else. In practice the one that
has bitten was **`ita-mibac`**: Italy's cultural heritage code restricts
commercial reproduction of images of Italian cultural property without the
custodian's permission, and it has been litigated — the Uffizi and the
Accademia have both sued over it. A picture of the Colosseum carried it and was
replaced on 5 September 2026.

**A disclosure duty, not a restriction.** `ai` means Commons has recorded the
file as machine-generated. It does not limit use; it creates an obligation to
say so. The check therefore passes such a picture **only if** we have marked it
as AI-generated in the app, and fails loudly otherwise. Two pictures were
caught this way.

---

## What this proves, and what it does not

**Proven.** Every picture is either our own, or carries a licence published by
Wikimedia Commons that permits commercial use and derivative works, with the
credit that licence requires, described correctly in this repository, and
confirmed on the date the check was run.

**Not proven, and nobody can prove it.** That each person who uploaded a file
to Commons genuinely held the rights they granted. There is no way to verify
that for 920 files, and any tool claiming to is lying. What can be said is that
every picture rests on a free licence from a source with its own takedown
process and its own community reviewing uploads — and that if a file is later
removed from Commons, re-running this check will say so.

**Also not covered.** Our own AI-generated illustrations carry no third-party
rights, but they follow a separate rule recorded in `tools/gen_images.json`:
never generate a likeness of a real person, a copy of a real artwork, or an
imitation of a living cultural tradition. Where the subject is a person, a work
or a tradition, the illustration shows the *subject matter* instead. That rule
is enforced by editorial judgement, not by a script, and it is worth
re-reading before any new illustration is added.

---

## If the check fails

`node tools/fix_rights_findings.js` closes the four kinds of finding it has
seen so far — a restricted picture, an unmarked AI picture, a wrong licence
record, and a picture served from somewhere unverifiable. It replaces rather
than removes, and re-running the verification proves the result.

Anything it cannot fix is printed by name and needs a human decision: either
find a different picture, or drop the illustration for that subject.

---

*Last full verification: see the dated report produced by `--report`.
The check is only as current as the day it was run — Commons licences can
change, and files can be deleted. Run it before every promotion to production.*
