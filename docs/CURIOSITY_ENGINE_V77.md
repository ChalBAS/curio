# Curiosity Engine v77

**The release where Question Intelligence starts making decisions.** v76 shipped the data layer (discovery, resources, hooks); v77 ships the judgement layer: every question in the bank now carries curiosity metadata, the Daily Challenge is *paced* by it, and the resource matcher listens to it.

> **All scores are editorial metadata, not scientific measurements.**

Authorship boundary (founder-assigned): **ChatGPT** owns curiosity strategy, topics, question authorship and framing. **Hermes** owns repository implementation, data transformation, scoring application, resource/image/link integration, the selection algorithm, validation, testing and UAT deployment. Hermes classifies and scores; Hermes does not rewrite the corpus. Weak-question opportunities are recorded for ChatGPT's next pass in `docs/QI_REFRAME_CANDIDATES_V77.md`.

---

## 1. The three-stage model

The curiosity journey is `ENTRY PULL → ANSWER → SPARK → PORTAL → RESOURCE → RABBIT HOLE`, and the schema mirrors it. Every numerical dimension is an integer 0–5.

```
intelligence: {
  archetypes: [ … ],          // 11 values, several allowed; archetype ≠ quality
  role: "…",                  // session function (§2)
  entry_pull: { curiosity_gap, familiarity, novelty, tension, intrigue },
  spark:      { surprise, discovery, human_pull, perspective_shift, closure_risk },
  portal:     { connection, rabbit_hole_depth, resource_depth, resource_density,
                resource_diversity, resource_resonance, experiential, next_step },
  rabbit_hole: { branches: […], entities: […] },
  diagnosis: "…",             // editorial triage (§4)
  provenance: "editor" | "heuristic-v77"
}
```

- **entry_pull** measures the QUESTION before the answer is known.
- **spark** measures ANSWER + FACT. `closure_risk` is the only NEGATIVE metric: 0 = curiosity stays open, 5 = the loop is effectively closed.
- **portal** measures where curiosity can go. `resource_resonance` (do resources follow from *this* question?) is distinct from `resource_density` (do resources exist at all) — the mandate's rule is that resonance outranks abundance.

Where V1 (docs/QUESTION_INTELLIGENCE_V1.md, kept as the calibration record) had seven loosely-grouped dimensions, the final model regroups them by journey stage and adds `intrigue` (the pull of the question text itself). The 30 calibration entries were mapped across mechanically and re-reviewed; their editor scores are in `src/intelligence.data.js`.

## 2. Content roles — session functions, not a ladder

`anchor · curiosity · discovery · portal · deep · trivia`

A role is what a question DOES in a session. An anchor is not bad; a portal is not automatically better; low familiarity is not bad — it means the framing needs a stronger bridge. Roles are derived by `CURIO_QI.deriveRole()` with declared, ordered rules (`src/intelligence.js`), current corpus distribution:

| role | count | | role | count |
|---|---|---|---|---|
| curiosity | 264 | | trivia | 163 |
| anchor | 261 | | deep | 20 |
| portal | 36 | | discovery | 16 |

The bank is honestly recall-heavy — that is a content fact, and it is why the Daily pacer (§5) exists. `discovery` is the scarcest useful role: flagged for ChatGPT's next content pass.

## 3. Provenance — two kinds of scores

| provenance | rows | source |
|---|---|---|
| `editor` | 41 | the 30 V1 calibration questions (mapped) + the 11 new v77 package questions, hand-scored with rationale in `src/intelligence.data.js` |
| `heuristic-v77` | 719 | transparent rules over observable features, applied by `tools/build_intelligence_corpus.js` |

The heuristic rules are declared, not learned: difficulty and kids flag set the familiarity base; question form (`What is…` vs `Why…`) sets gap/intrigue; fact-text signals (`still debated`, superlatives, contradiction markers, human-story markers) move spark dimensions; entity shelves (PLACES, hooks, meta type) and `deeper` material move portal dimensions; CRN match count feeds density. Every rule is visible in the generator and can be argued with. Rebuilding is one command: `node tools/build_intelligence_corpus.js` (editor rows always win).

`tools/intelligence.test.js` proves on every run: the corpus aligns 1:1 with the bank, every row decodes and validates, the 41 editor echoes are verbatim against the live bank, and editor scores — not heuristic ones — sit at editor slots.

## 4. Editorial diagnosis

`keep · enhance_question · enhance_spark · enrich_portal · reframe · replace · review`

The mandate's grid with declared thresholds (LOW < 2.5, HIGH ≥ 3.5):

- LOW entry / HIGH spark / HIGH portal → **enhance_question**
- HIGH entry / LOW spark / HIGH portal → **enhance_spark**
- HIGH entry / HIGH spark / LOW portal → **enrich_portal**
- LOW / LOW / LOW → **reframe** (or replace)

Diagnosis is triage, not verdict — `reframe` currently marks 69 rows, all listed in `docs/QI_REFRAME_CANDIDATES_V77.md` for ChatGPT. No question was rewritten by Hermes on the strength of a diagnosis.

## 5. The Daily selector — curiosity pacing on the walk

**What did not change:** the deterministic daily identity. The bank is still shuffled once per epoch with the same seed formula (epoch × 7919 + pool size × 131 + mode salt), identical on every device; quick-fire still draws only unseen questions from a dated ledger; today's daily five are still excluded from quick-fire; kids mode still draws from the kids pool.

**What changed:** the walk deals **eight** cards a day and `CURIO_QI.paceDaily()` serves **five** of them. Windows are disjoint slices of the same deterministic deck, so epoch-uniqueness is untouched — and `paceDaily` is a pure function of (window, day), with every tie-break on deck position, never on question text, so **English and French pick the same bank rows** (a test proves it; an earlier text-hash tie-break broke FR alignment and was caught by that test).

The target composition for a five-question Daily — a target, not a rigid order:

> 1 accessible foothold · 1 curiosity · 1 stronger surprise/contradiction · 1 discovery · 1 strong portal

The pacer scores every 5-subset of the window (56 evaluations — cheap and exact) against declared guardrails, then orders the chosen five along the pacing curve (foothold first, strongest continuation last):

| guardrail | rule |
|---|---|
| NOVELTY BUDGET | at most 2 of 5 with familiarity ≤ 2 (dominant penalty) |
| ROLE DIVERSITY | no role on 3+ of 5 |
| ARCHETYPE DIVERSITY | no single mechanic on 3+ of 5 |
| PORTAL PRESENCE | the set keeps the window's strongest rabbit hole |
| FLAT GUARD | never five closure_risk ≥ 4 cards |
| STRETCH GUARD | never 4+ maximum-intensity cards |

**Precedence (documented):** no-repeat > topic/eligibility > novelty budget / role diversity > portal preference > curiosity optimisation. A window that cannot satisfy a guardrail still deals five — guardrails degrade, never fail. The one allowed exception in practice: when the window's best continuation is itself low-familiarity and the budget is spent, the budget wins (observed 1/30 days in simulation, delta 0.12 — correct behaviour).

## 6. Quick Fire — light balancing

Topic relevance is sacred: the topic filter runs first and nothing outside it can be introduced. `CURIO_QI.balanceQuickfire()` then re-orders the random walk to avoid 3-runs of one role or 3-runs of obscure (familiarity ≤ 2) cards, with a finishing swap pass. A pool that arithmetically cannot satisfy the bounds keeps its cards — fullness and the no-repeat ledger always beat pacing.

## 7. UAT diagnostic — `?qidiag=1`

UAT-only, never normal UX. `?qidiag=1` persists for the session (`?qidiag=0` clears). During a quiz each question shows its role, archetypes and entry/spark/portal means; at Daily results the role sequence and novelty sequence render under the shelf. English-only on purpose — it is a founder's tool, deliberately not routed through the i18n dictionary.

## 8. Resources — resonance sharpened by intelligence

The CRN matcher (`src/resources.js`) keeps its P1.5 rules; v77 adds one additive block: rabbit-hole **branches** overlapping a resource's topics score +2, and rabbit-hole **entities** named in a resource's title/description score +2. The ≥3 relevance threshold is unchanged, so intelligence sharpens ordering but can never manufacture a match from nothing. **Commercial fields are never read** — a test asserts the score is bit-identical with `commercial`/`partner`/`affiliate` set or cleared (Charter VAL-12).

## 9. Links and images

- **Links:** PLACES gained five curated destinations for the new package (British Museum for the Ea-nasir tablet, the Met for Hatshepsut and for Arms and Armor, UNESCO for Nazca, Pompeii Archaeological Park for the thermopolium). Watch still only ever emits scoped searches inside vetted channels — a test asserts no open YouTube search is reachable, and that an uncovered category yields *no* Watch slot.
- **Images:** nine new entity images, all Wikimedia Commons lead images with full credit metadata, all production-safe licences (Public domain ×3, CC0 ×2, CC BY-SA ×2, CC BY ×1, CC BY-SA 3.0 ×1 — fetched via the repo's own pipeline, `tools/fetch_entity_images.py`). One legacy entry with no licence metadata (`Basilica_of_Our_Lady_of_Peace`) was **removed**. The licence gate now lives in `tools/resources.test.js`: every shipped image must carry a vetted licence (PD / CC0 / CC BY / CC BY-SA / FAL / GFDL / GPL-family / Attribution / GODL-India / QPIO's own generated illustrations) and anything NC, non-commercial, all-rights-reserved, fair-use or unclear is rejected.
- One CRN data defect class was repaired in passing: 8 exhibition records missing `status`/`last_verified_at`, and 4 `http://` source URLs upgraded to https.

## 10. Privacy-safe future learning loop (contract only)

Not built in v77 — the contract, so a future backend has nothing to redesign:

```
event: question_shown    { qid, at }
event: answer_revealed   { qid, correct, at }
event: deeper_opened     { qid, at }
event: resource_opened   { qid, resource_id, resource_type, at }
```

Question ID + aggregate counts only. No identity, no history graph, no personal profiling. The eventual model is `EDITORIAL PRIOR + REAL BEHAVIOUR → BETTER FUTURE SELECTION`: role/archetype priors re-weighted by aggregate revealed behaviour. No personal-data analytics platform.

## 11. External curiosity signals (schema hook for ChatGPT's research stream)

Not collected in v77 — the schema, so future ChatGPT research packages have a stable shape to land in:

```
external_signals: {
  search_interest: 0-5,            // search-demand proxy
  video_attention: 0-5,            // video-platform attention proxy
  book_purchase_proxy: 0-5,        // books commerce proxy
  community_interest: 0-5,         // forum/community proxy
  institutional_resource_strength: 0-5,
  observed_at: "ISO-8601",
  evidence: [ { kind, note, url } ]
}
```

These are topic/opportunity metadata for **new question commissioning**. They never override editorial or factual quality, and they never feed commercial ranking. No Google/Amazon/YouTube scraping in v77.

## 12. Validation & tests

| gate | what it proves |
|---|---|
| `npm test` | syntax of every core file + CRN integration suite |
| `node tools/intelligence.test.js` | final-model validator contract (A–J), codec, corpus integrity, editor echo verbatim |
| `node tools/selection.test.js` | daily determinism (EN/FR/kids), epoch no-repeat, kids eligibility, guardrails (synthetic + 30-day simulation), quick-fire balance |
| `node tools/resources.test.js` | CRN schema validity, relevance, VAL-12 ordering blindness, vetted Watch, PLACES/links structure, image licences, degradation |
| `node tools/preflight.js` | all of the above (gate 4c) + the classic release gates |
| `node tools/preflight.js --full` | adds live source verification |

## 13. Out of scope in v77 (unchanged)

Mass question rewriting · new-question mass generation · demand-signal scraping · monetisation scoring · affiliate ordering · a recommendation-engine rebuild · personal analytics · any change to the free-knowledge principle. The Daily pacer is the only user-facing behaviour change; everything else is data and tests.
