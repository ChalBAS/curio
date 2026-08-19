# UNIVERSAL AGENT CONTRACT

**Applies to every capable agent — Claude, Hermes, ChatGPT, Gemini, Kimi, scripts, and future agents. No agent owns this repository. Agents are interchangeable execution resources.**

The repository is the durable source of truth. Chat history is not.

---

## BEFORE SUBSTANTIVE WORK

Every agent MUST:

1. Read `.ai/AGENT_CONTRACT.md` (this file).
2. Read `.ai/project-state.json`.
3. Read relevant documents referenced by `pointers`.
4. Inspect the relevant existing implementation.
5. Preserve established decisions unless explicitly superseded.
6. Continue from current repository state rather than reconstructing state from chat history.

## DURING WORK

1. Prefer deterministic scripts (`scripts/ai_state.py`) over hand-editing JSON.
2. Keep `.ai/project-state.json` a current-state snapshot and index — detail belongs in the canonical documents referenced by `pointers`.
3. Never commit secrets. Never force-push. Never rewrite shared history. Never overwrite unrelated work.
4. A hypothetical/test action must never be recorded as live operational state. Distinguish: LIVE FACT / TEST / PROPOSAL / PENDING APPROVAL / EXECUTED ACTION.

## AFTER A MAJOR TASK

Every agent MUST:

1. Finish the implementation.
2. Verify the success criteria with real evidence.
3. Update relevant canonical documentation.
4. Update `.ai/project-state.json` (via `scripts/ai_state.py` where possible).
5. Record material new decisions.
6. Record non-blocking imperfections as PARKED.
7. Regenerate `PROJECT_STATUS.md` (`python scripts/ai_state.py status`).
8. Validate project state (`python scripts/ai_state.py validate`).
9. Inspect `git diff` / `git status`.
10. Commit relevant work with a clear, scoped message.
11. Push when authorized.
12. Verify remote synchronization.

**A major repository-based task is not complete until repository state reflects reality.**

## STATE TOOLING

```bash
python scripts/ai_state.py show                 # read current state
python scripts/ai_state.py validate             # validate against schema
python scripts/ai_state.py focus "..."          # set current focus
python scripts/ai_state.py complete ID --summary "..." [--commit sha]
python scripts/ai_state.py next add "..." [--id ID]
python scripts/ai_state.py blocker add ID --summary "..."
python scripts/ai_state.py blocker resolve ID
python scripts/ai_state.py park ID --summary "..." --reason "..." [--revisit "..."]
python scripts/ai_state.py decision add ID --summary "..." [--source path]
python scripts/ai_state.py health tests passing|failing|unknown|not-run
python scripts/ai_state.py health deployment verified|unverified|failing|unknown
python scripts/ai_state.py status               # regenerate PROJECT_STATUS.md
```

Every mutation validates the state and regenerates `PROJECT_STATUS.md` automatically.

---

*Protocol version 1.0. Canonical home: `ChalBAS/ai-operating-system`. Adoption guide: `docs/PROJECT-STATE-PROTOCOL.md`.*
