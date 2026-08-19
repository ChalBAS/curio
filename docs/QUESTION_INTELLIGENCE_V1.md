# Question Intelligence V1

> **Historical record — the calibration phase.** V1's three-groups schema was superseded by the final three-stage model (entry_pull / spark / portal) shipped in v77. Current truth: `docs/CURIOSITY_ENGINE_V77.md`. The 30 calibration scores below were mapped into the final model and remain editor-provenance rows in `src/intelligence.data.js`.

**Status:** infrastructure + calibration · awaiting human review of the calibration sample
**Scope:** additive metadata layer for questions. No product redesign, no mass enrichment, no selection-engine work.

> **These scores are editorial intelligence metadata, not scientifically validated measurements.**

---

## 1. Purpose

QPIO is evolving from a quiz/question collection into a **curiosity and cultural-discovery engine**. Question Intelligence V1 makes questions machine-describable in those terms: each question can carry an optional `intelligence` object describing what it *does* to a curious reader — how much curiosity it opens, how it stretches familiarity against novelty, what it can lead to, and whether it closes the loop it opens.

V1 delivers four things and nothing more:

| Deliverable | Path |
|---|---|
| Semantic model + validator + provisional tier interface | `src/intelligence.js` |
| Calibration sample (30 questions, enriched by hand) | `src/intelligence.data.js` |
| Test suite (validator contract + non-regression + calibration integrity) | `tools/intelligence.test.js` |
| Calibration report (methodology, distributions, boundary cases) | `docs/QI_CALIBRATION_V1.md` |

The test suite is wired into `tools/preflight.js` (gate 4c).

## 2. Product philosophy

The intended user journey is:

```
QUESTION → ANSWER → SPARK → PORTAL → RABBIT HOLE → CULTURAL RESOURCES → DEEPER DISCOVERY
```

Two rules follow, and both are load-bearing:

1. **The free answer stays genuinely useful and complete.** QPIO never intentionally weakens the answer to force a purchase. The answer satisfies the immediate question — *understanding it reveals how much more there is to discover.*
2. **There is no monetisation score.** The intelligence layer measures curiosity and resource opportunity, never purchase pressure. Commercial opportunities may arise downstream when users voluntarily choose books, museums, documentaries or courses; nothing in this schema ranks, weights or filters by them. (Charter VAL-12 already forbids money moving destinations in `golinks.js`; this layer inherits that rule by construction — it has no commercial fields at all.)

## 3. Schema

`intelligence` is an **optional** property of a question. A question without it is valid; the layer is additive and nothing in the running app depends on it.

```js
intelligence: {
  archetypes: [],                      // non-empty array of ARCHETYPES (§5)

  curiosity: {                         // all integers 0–5 (§4)
    curiosity_gap: 0, surprise: 0, familiarity_anchor: 0, human_pull: 0,
    connection: 0, discovery: 0, perspective_shift: 0
  },

  tension: { familiarity: 0, novelty: 0, optimality: 0 },      // §6

  resource_depth: {                    // §8
    depth: 0, density: 0, diversity: 0, resonance: 0,
    experiential: 0, next_step: 0
  },

  closure: { risk: 0 },                // §7 — negative metric

  rabbit_hole: {                       // §9
    depth: 0,
    branches: [],                      // strings; suggested vocabulary advisory
    entities: []                       // Wikipedia-slug-form strings (golinks convention)
  }
}
```

**Physical representation in V1.** The mandate's conceptual model is `question.intelligence`, and that is preserved. Physically, the calibration sample lives in a **sidecar** (`src/intelligence.data.js`): each entry is question-shaped — original fields echoed *verbatim*, plus `intelligence`, plus an internal scoring `note` — and is keyed to the live bank two ways:

- `id` — the app's own question id (`qid()` from `app.js`, reimplemented character-for-character in `src/intelligence.js`), and
- `bank_index` — the row in `window.CURIO_QUESTIONS`.

`tools/intelligence.test.js` re-verifies every echoed field against the live bank on every run: if a question's wording is edited later, the suite fails loudly instead of leaving intelligence attached to stale text. Whether mass enrichment (post-review) inlines `intelligence` into the banks or keeps the sidecar is a decision **deferred until after calibration review**; the validator treats both shapes identically. Note that if intelligence is ever inlined into `src/questions.js`, `app.js`'s `mergeTranslated()` already overlays all EN metadata onto the French bank by index — the French reader inherits it for free.

**Validator strictness.** When `intelligence` is present it must be *complete*: all five groups, all dimensions, no unknown keys. A typo like `curousity` fails validation rather than silently scoring zero. Partial enrichment is rejected in V1 — half-scores read as signal downstream. `CURIO_QI.validate(intel)` and `CURIO_QI.validateQuestion(q)` return `{ ok, errors, warnings }`.

## 4. Score definitions

All numerical dimensions are **integers 0–5**.

| Dimension | 0 | 5 |
|---|---|---|
| `curiosity_gap` | essentially no unresolved curiosity | strong "I need to understand this" response |
| `surprise` | entirely expected | strongly challenges expectation |
| `familiarity_anchor` | almost no recognisable context for a general user | highly recognisable starting point |
| `human_pull` | human/emotional dimension absent (ambition, conflict, love, survival, betrayal, ingenuity, injustice, obsession, sacrifice, creativity, identity, discovery) | exceptionally strong |
| `connection` | isolated fact | many strong cross-domain pathways |
| `discovery` | already familiar | major "I didn't know this existed" potential |
| `perspective_shift` | simply adds a fact | exposes a substantially different historical/cultural/intellectual frame (1–2 nuance · 3 reframes · 4 changes the frame) |

## 5. Archetypes

A question may legitimately have **several** archetypes. An enriched question must have at least one.

| Archetype | Definition |
|---|---|
| `anchor` | A familiar, accessible entry point |
| `surprise` | The answer materially differs from likely expectation |
| `reveal` | Introduces something the user may not have known existed |
| `contradiction` | Challenges a common assumption or misconception |
| `human_story` | Human experience/person/conflict drives the curiosity |
| `mystery` | Creates a meaningful unresolved puzzle |
| `origin` | Explores how or why something came into existence |
| `connection` | Links subjects users may not naturally associate |
| `perspective_shift` | Changes the frame through which the subject is understood |
| `counterfactual` | Explores "what if?" or alternative outcomes |
| `portal` | An unusually strong gateway into a larger cultural/intellectual ecosystem |

## 6. Curiosity tension — the rubber-band principle

Enough familiarity for the user to care; enough novelty to stretch understanding.

- `tension.familiarity` — how recognisable the starting point is.
- `tension.novelty` — how far beyond expected knowledge the question reaches.
- `tension.optimality` — how effective the *combination* is. **A 5 does not mean maximum obscurity.** A 5 means: *"I know enough to care, but not enough to be satisfied."* Novelty alone is not inherently good: a question with familiarity 1 and novelty 5 starts with a slack band (see Lalibela in the calibration sample).

## 7. Closure risk

`closure.risk` is a **negative metric**:

- **0** = the answer/spark naturally leaves meaningful curiosity alive
- **5** = the answer/fact combination probably closes the curiosity loop completely

High closure risk does **not** mean "bad question." Simple anchor questions are valuable for session pacing (§11). The metric exists so the future selection engine understands what the question *does*, not to condemn recall questions.

## 8. Resource Depth Potential

| Dimension | Question it answers |
|---|---|
| `depth` | Can the subject sustain meaningful further exploration? |
| `density` | Are substantial reputable resources available? |
| `diversity` | Can it be explored through multiple forms — books, audiobooks, articles, research, documentaries, films, podcasts, lectures, courses, museums, collections, exhibitions, events, archives, people, places? |
| `resonance` | Do those resources follow naturally from **this particular question**? (Distinct from generic availability — see Mona Lisa: density 5, resonance 3.) |
| `experiential` | Can curiosity become an experience — visit, see, hear, watch, travel, attend, explore a collection? |
| `next_step` | Does the answer naturally create another meaningful question? |

This layer *describes* potential; it does not rebuild the cultural-resource infrastructure. `src/resources.js` (the pilot resource network) stays exactly as it is.

## 9. Rabbit-hole architecture

- `rabbit_hole.depth` — 0 no meaningful continuation · 1 one obvious follow-up · 2 limited · 3 several meaningful directions · 4 broad exploration ecosystem · 5 exceptionally rich multi-domain rabbit hole.
- `rabbit_hole.branches` — conceptual exploration directions. Suggested vocabulary (advisory, **not** enforced — the validator warns rather than rejects): `history politics science technology art literature religion philosophy economics people place architecture archaeology music environment culture`.
- `rabbit_hole.entities` — important entities that can eventually connect the question to QPIO's cultural-resource graph. **Slug form** (`Menelik_II`, not `Menelik II`), following the repo's existing convention: the app's entity identity *is* the Wikipedia article slug (`CURIO_GO.entityOf()` derives it from `q.src`; `CURIO_META`, `CURIO_IMAGES` and `CURIO_HOOKS` are all keyed by it). No parallel entity system was created. Entities naming articles that have no `CURIO_META` entry yet are expected and harmless — reconciliation with the resource graph is a later-phase task.

## 10. Question quality tiers

Five tiers are defined as a product classification:

| Tier | Name | Meaning |
|---|---|---|
| A | PORTAL | High curiosity + high resource depth |
| B | DISCOVERY | Strong surprise/discovery with meaningful continuation |
| C | CURIOSITY | Interesting and useful, more limited depth |
| D | ANCHOR | Accessible/familiar, useful for session pacing |
| E | TRIVIA | Primarily tests recall, weak curiosity continuation |

`CURIO_QI.deriveTier(intel)` returns `{ tier, label, provisional: true, basis }`. **The thresholds in `TIER_RULES` are placeholders.** They were not tuned and are not empirical; they exist so the calibration sample produces concrete labels for a human to react to. Final tier calibration is **pending human review** — see `docs/QI_CALIBRATION_V1.md` for the boundary cases the current thresholds produce. Nothing downstream may treat a derived tier as authoritative while `provisional` is true.

## 11. Session pacing principle

> **Documented for the future selection engine. Not implemented in V1.**

Future QPIO sessions should not simply rank questions by highest curiosity score. The desired experience allows pacing such as:

```
ANCHOR → SURPRISE → ANCHOR → DISCOVERY → PORTAL → DEEP
```

If every question is maximum-intensity curiosity, the experience becomes exhausting and the strongest discoveries lose contrast. Tiers D and E exist *because* pacing needs them. Implementing this is a selection-engine requirement and is deliberately out of scope here.

## 12. Calibration methodology

The calibration sample (30 questions, `src/intelligence.data.js`) was selected to span: all six categories · multiple geographies · all three difficulties · kids and non-kids · questions with and without `deeper` · obvious trivia, strong discovery and strong portal candidates · high and low familiarity. It includes every named mandate case still present in the corpus (Moon landing, Great Pyramid, Hundred Years' War, Sudan's pyramids, Adwa, Benin Bronzes, Lalibela, Mona Lisa, Starry Night, Bering/Diomede, Bolivia's navy).

Scoring used reasoned editorial judgement against §4–§9. Original wording was **not** modified — the sample echoes the bank verbatim and the test suite proves it on every run. Each entry carries a short internal scoring `note` (the why behind the numbers), and `docs/QI_CALIBRATION_V1.md` analyses the distribution and boundary cases. **The rubric is expected to be revised by the human review before any mass enrichment.**

## 13. Known limitations

- **Subjectivity.** One editor scored the sample. Inter-rater reliability is unknown by construction; that is what the review is for.
- **Anglophone familiarity skew.** `familiarity_anchor` and `tension.familiarity` were scored for a general Anglophone reader. French-reader familiarity differs (Hangul vs. Huguenots). The schema has one score slot, not one per locale — a real limitation to revisit before localising intelligence.
- **Entity slugs are best-effort.** Rabbit-hole entities name canonical English Wikipedia articles but are not yet verified against the live article set or reconciled with `CURIO_META` keys.
- **`mystery` and `counterfactual` are structurally rare** in the current corpus (recall-oriented by design). The sample contains one mystery (Terracotta, carried by its `deeper` material) and no counterfactual — the archetypes are defined but barely exercised.
- **Tier thresholds are placeholders** (§10). The provisional B rule is visibly permissive on this sample (14 of 30).
- **No UI consumer exists.** Nothing renders intelligence; its only consumers are tests and reviewers.

## 14. What remains intentionally unimplemented

Per the mandate, all of the following are **out of scope** for V1 and remain so:

- Mass scoring the full question corpus
- Automatically rewriting questions; generating new questions
- Google Trends / search-demand / YouTube / Amazon / Reddit demand collection
- Monetisation scoring, affiliate optimisation
- Recommendation/selection-engine overhaul (including the §11 pacing logic)
- Large UI redesign; any rendering of intelligence
- Automated resource purchasing logic
- Wiring `src/intelligence.js` into `index.html`/`sw.js` (it ships to no reader)
- Changing QPIO's free-knowledge principle

The next stage requires human + reviewer calibration of the sample before the rubric propagates across the corpus.
