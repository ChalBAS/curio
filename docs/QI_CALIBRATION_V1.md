# QI Calibration V1 — Sample Report

> **Historical record.** The calibration review informed the final model; the A–E tiers here were replaced by session-function **roles** (anchor/curiosity/discovery/portal/deep/trivia) in v77. Current truth: `docs/CURIOSITY_ENGINE_V77.md`.

**Companion to `docs/QUESTION_INTELLIGENCE_V1.md`.** This report is what the human review calibrates against. Per-question scores and their internal rationale (`note`) live with the data in `src/intelligence.data.js`; this report covers composition, distributions, boundary cases and findings.

**Reminder: these scores are editorial intelligence metadata, not scientifically validated measurements.**

## Sample composition

30 questions from `window.CURIO_QUESTIONS` (749 rows), selected by bank index. All named mandate cases present in the corpus are included.

| Axis | Coverage |
|---|---|
| Category | History 11 · Science 5 · Arts 5 · Geography 3 · Tech 3 · Nature 3 |
| Difficulty | d1 ×11 · d2 ×11 · d3 ×8 |
| Kids flag | kids 16 · non-kids 14 |
| `deeper` material | present 10 · absent 20 |
| Region | Africa 6 · Asia 2 · Europe 1 · Americas 1 · MiddleEast 1 · Global 1 · untagged 18 |
| Familiarity | from 5 (Moon, Mona Lisa, photosynthesis) to 1 (Lalibela, Qarawiyyin, Sembène, Qingming) |

Region spread mirrors the corpus's own skew (610 of 749 rows are region-untagged; Africa is the most-tagged region at 67). It is a property of the bank, not of the sampling.

## Provisional tier distribution

From `CURIO_QI.deriveTier` — **placeholder thresholds**, shown here so the review can judge the rules, not just the labels. `cm` = curiosity mean, `dm` = resource-depth mean.

| # | Tier | cm | dm | Archetypes | Question (abridged) |
|---|---|---|---|---|---|
| 01 | D | 2.29 | 4.17 | anchor | Which ancient wonder still stands today? |
| 02 | D | 2.00 | 3.67 | anchor | First person to walk on the Moon |
| 03 | D | 2.86 | 3.33 | contradiction, surprise | Hundred Years' War actual duration |
| 04 | A | 4.00 | 4.00 | surprise, reveal, perspective_shift | Sudan has more ancient pyramids than Egypt |
| 05 | A | 4.29 | 4.17 | human_story, perspective_shift, portal | Battle of Adwa |
| 06 | A | 4.14 | 4.83 | reveal, perspective_shift, portal | Benin Bronzes |
| 07 | B | 3.43 | 4.17 | reveal, portal | Lalibela churches carved downward |
| 08 | B | 3.29 | 3.67 | reveal, perspective_shift, origin | Haudenosaunee Great Law of Peace |
| 09 | C | 3.14 | 4.33 | anchor, mystery | Terracotta Army |
| 10 | B | 3.43 | 3.33 | origin, human_story, reveal | Hangul created under Sejong |
| 11 | B | 3.43 | 3.83 | connection, origin | Al-Khwarizmi and 'algebra' |
| 12 | B | 3.71 | 4.00 | reveal, human_story, origin | al-Qarawiyyin / Fatima al-Fihri |
| 13 | E | 1.00 | 2.67 | anchor | Gas plants absorb for photosynthesis |
| 14 | C | 3.14 | 4.00 | origin, human_story, surprise | Discovery of penicillin |
| 15 | B | 3.43 | 3.17 | surprise, connection | Bering Strait / Diomede Islands |
| 16 | B | 3.86 | 3.83 | surprise, contradiction, human_story | Bolivia's landlocked navy |
| 17 | D | 2.14 | 4.00 | anchor | Who painted the Mona Lisa? |
| 18 | C | 3.14 | 4.33 | anchor, human_story | The Starry Night |
| 19 | B | 3.71 | 4.00 | portal, perspective_shift, human_story | Things Fall Apart |
| 20 | E | 0.86 | 1.83 | anchor | What does 'HTTP' stand for? |
| 21 | C | 2.29 | 3.17 | surprise, anchor | Octopus hearts |
| 22 | B | 3.86 | 4.17 | human_story, reveal | Katherine Johnson / John Glenn |
| 23 | B | 3.86 | 4.00 | connection, surprise, origin | Eratosthenes measures Earth |
| 24 | B | 4.14 | 3.67 | surprise, perspective_shift, human_story | Florence Nightingale, statistician |
| 25 | B | 3.43 | 3.17 | human_story, origin, perspective_shift | Berners-Lee gives the Web away |
| 26 | A | 4.29 | 4.33 | human_story, contradiction, portal | Joy Buolamwini / face recognition |
| 27 | D | 2.29 | 3.00 | surprise, anchor | Egg-laying mammals |
| 28 | B | 3.86 | 3.83 | human_story, perspective_shift, origin | Sembène turns to cinema |
| 29 | B | 3.00 | 3.67 | connection, reveal, surprise | Qingming scroll format |
| 30 | C | 2.86 | 3.67 | reveal, surprise | Salar de Uyuni |

**Distribution: A=4 · B=14 · C=5 · D=5 · E=2.**

## Boundary cases the review should rule on

1. **B is too permissive.** 14 of 30 land B under the provisional rule (surprise ≥ 4 *or* discovery ≥ 4, rabbit-hole ≥ 3, curiosity mean ≥ 3). Candidates to tighten: require cm ≥ 3.5, or require surprise *and* discovery both ≥ 4, or fold resonance into the rule. Decide with rows 10, 11, 15, 25, 29 in view — which of those are *really* discovery-tier?
2. **Hundred Years' War (#03) lands D (anchor)** — a contradiction question wearing an anchor label, because the D rule (familiarity ≥ 4, novelty ≤ 2, cm < 3) reads its familiarity first. Arguably correct for pacing (it *is* an accessible opener that happens to contradict). Arguably wrong (a contradiction should never pace like a pyramid question). The tiers need a rule about archetype-tier interaction, or accept the overlap.
3. **Terracotta (#09) lands C despite being a genuine mystery** — because the mystery lives in the `deeper` material (unopened tomb, mercury rivers), not in the question text. Should `deeper` content count toward archetype/score assignment? V1 scored the whole card (question + answer + fact + deeper) — say so explicitly in the rubric, or reverse it.
4. **The slack-band family** (Lalibela, Qarawiyyin, Sembène, Qingming: familiarity 1, novelty 5, optimality 3). The tension model predicts these start cold for a general reader. None landed A despite portal-grade depth. That is the model working as designed — confirm the design is wanted before mass scoring, or low-familiarity portals will systematically under-tier.
5. **Starry Night (C) vs Mona Lisa (D).** Same painter-recall shape; the asylum/one-sale fact adds human pull and lifts it out of anchor-tier. Validates that scoring the *card* (not just the question line) produces distinctions a reader would recognise.
6. **Sudan pyramids at A (cm exactly 4.00).** Sits on the A/B boundary by one rounding step. If the review scores its density 4 instead of 3 (Meroë is a UNESCO site with growing coverage), nothing changes; if discovery drops to 4, it falls to B. Borderline cases need a stability note in the rubric.

## Findings for the corpus (observations, not work items)

- **`counterfactual` does not exist in the corpus.** No question in the 749 asks "what if?". If counterfactual questions are wanted, they must be *authored* in a later content phase — this layer cannot manufacture them.
- **`mystery` is nearly as rare.** The sample's only case (Terracotta) borrows its mystery from `deeper`. The corpus's fact-complete style tends to close loops by default — visible in how many otherwise strong questions score closure.risk 2–3 rather than 0–1.
- **Closure risk concentrates at 1–3** for discovery questions and 4–5 for recall, matching intuition — except HTTP and photosynthesis, whose `fact` fields add no spark at all. The fact field is doing the anti-closure work everywhere else. That makes `fact` quality the single highest-leverage editorial variable for curiosity — before any new infrastructure.
- **density ≠ resonance, demonstrated.** Mona Lisa scores density 5 / resonance 3; photosynthesis density 5 / resonance 2; Benin Bronzes 4 / 5. The distinction survives contact with real questions and is worth keeping.
- **Kids' questions span the full tier range** (D anchors to A/B discoveries). Kids mode is not a curiosity ghetto; the pacing principle (§11) should apply there too.

## Method notes

- One editor (this agent), one pass, rubric §4–§9 in hand. No inter-rater check yet — by design; the human review is the second reader.
- Echo integrity is machine-enforced: `tools/intelligence.test.js` fails if any echoed field drifts from the live bank, so this sample cannot silently detach from edited wording.
- Scores were authored against the **whole card** a reader sees (question + answer + fact + deeper), not the question line alone. This choice produced boundary case #3 and should be ratified or reversed by the review.

## What happens next (gate before any propagation)

1. Human + reviewer read this report and the 30 `note` rationales.
2. Rubric revisions (wording of anchors, the deeper-content rule, B-tier thresholds, archetype-tier interaction).
3. Re-score disagreements on this same sample to measure rubric stability.
4. Only then: decide inline-vs-sidecar for mass enrichment, and start Phase 2.
