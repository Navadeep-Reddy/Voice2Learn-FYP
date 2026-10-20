# Voice2Learn — Progress

## Current pass

**Prerequisite R — Reconcile the Existing Post-Review Baseline (implementation present in part; repair and verification pending; not approved).**

Documentation has been rebased onto the current `main-ish` implementation for the Jev migration. This is a documentation-only update; it starts no implementation pass. Follow the fixed order in `BUILD_PLAN.md` and stop for review after each pass.

## Approved history

- [x] Pass 1 — Foundation and Data Contracts (approved)
- [x] Pass 2 — Design Shell and Interactive Lesson (approved)
- [x] Pass 3 — Voice Loop and Local Whisper (approved)
- [x] Pass 4 — Context Builder and Nemotron Lesson Q&A (approved)
- [x] Pass 5 — Nemotron Quiz and Learner Proficiency (approved)
- [x] Pass 6 — Demo Hardening and Polish (approved)

## Follow-up sequence

- [ ] Prerequisite R — existing post-review reconciliation; pending, not approved
- [ ] Pass 7 — isolated Vercel Jev client/config; not started on this base
- [ ] Pass 8 — current screen/state-aware Jev routing; not started
- [ ] Pass 9 — core migration evaluation/review; not started
- [ ] Pass 10 — general voice destinations/resume/orientation; not started
- [ ] Pass 11 — pacing/feedback/confirmed quiz exit; not started
- [ ] Pass 12 — full navigation acceptance/handoff; not started

Code present or committed does not establish approval. Earlier Jev branch implementation/evidence is not implementation or approval on this base. Revalidate any authorized reuse.

## Current implementation, inspected 2026-10-20

- Branch `main-ish`, inspected HEAD `8686105` (same as locally recorded `origin/main-ish`); post-review implementation commit `b24ba1e`. No remote fetch, branch change or merge performed.
- Public intent classification is still Nemotron through `llm.py`: NVIDIA Integrate primary, OpenRouter fallback. No `backend/app/jev.py` exists on this base.
- Existing code includes authored checks in lesson JSON/UI, local comparison/unlock in App, help/Home actions, quiz recap actions and error retry support, neural edge-tts endpoint/browser fallback, and speech-boundary capture (~800 ms silence, 14 s cap).
- Quiz questions remain Nemotron-generated; backend grading and JSON proficiency writes remain separate from lesson checks. Quiz feedback currently advances automatically; manual Next also exists as a UI handler, not a classifier action.
- No live provider, microphone, preview, build or backend-start check was run during this documentation update. Existing pending hands-on review remains pending.

## Known gaps and assumptions

- `App.tsx` `handleTranscript` currently omits `check_question`/`check_options`, `notes_open`, and `quiz_error` even though API types/backend support them. Thus select-check is excluded, close-notes state may be wrong, and failed-load voice retry may hit request validation. The `start-quiz` dispatch checks the final-scene boundary but not whether its understanding check passed. Prerequisite R must wire these contexts and enforce the quiz-start gate. Do not claim all post-review voice operations work end-to-end.
- The current contract does not carry check-completion or quiz phase; Prerequisite R adds the specified coordinated state fields and guards. Existing screen/scene/question guards do not fully cover notes/check/phase changes.
- SPEC previously listed only original actions in Section 12; updated docs now include the actual expanded vocabulary and mark planned additions explicitly.
- README previously described browser-only TTS in places and machine-specific Whisper defaults as universally verified. Setup now distinguishes current code defaults from local-machine verification.
- Local Whisper defaults point to the original developer's Linux cached model path and CUDA. Inspect the actual local runtime/model before STT work; do not download a model or assume this path works on this machine.
- Neural speech needs network access. Browser microphone/voice and responsive layout still need hands-on review.
- Vercel Jev credentials/team access and successful Choice response are not verified on this base. Historical key/access results on another branch are not a new live check. Never print/read out a key for diagnostics.
- `USER_NAVIGATION.md` includes later planned actions. Destination resolution is generic over existing lesson data; scope remains one chapter/lesson. Resume is in-session only; no cross-lesson engine or persistent navigation state.

## Documentation and verification log

- 2026-10-20: inspected current code, root docs and Git state; reconciled architecture/contracts and pass order for Jev plus the requested voice navigation. Consolidated former `POST_REVIEW_PLAN.md` content into Prerequisite R in BUILD_PLAN; preserved its unapproved state. No application/configuration/model code changed.
- Documentation consistency checks: all 18 current classifier action names documented, Markdown fences/whitespace checked, original BUILD_PLAN Passes 1–6 preserved byte-for-byte, obsolete plan consolidated, and git diff --check passed. No application tests/builds or preview were needed/run for this documentation-only task.
- Provider references checked against official Vercel TypeSafe-compatible API and TypeSafe Choice docs. This verifies documentation, not model access/performance.
- Pre-existing untracked `.DS_Store` preserved; USER_NAVIGATION catalogue retained and revised. No staging, commit, push, branch creation or merge.

## Next action

When implementation is requested, finish Prerequisite R only: repair state/context wiring, run its focused checks, start preview, report evidence/limitations and wait for review. User approval is required before marking it complete and starting Pass 7. Update only this tracker for evidence/progress; do not rewrite plan definitions to record status.
