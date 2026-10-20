# Voice2Learn — Pre-Review MVP Build Plan

Implement one pass at a time. Passes 1–6 below are approved historical definitions; do not replay or rewrite them. The current branch also contains unapproved post-review implementation. Its remaining reconciliation work and the authorized local Laya/navigation follow-up are defined after Pass 6. Read `PROGRESS.md` to select the current pass.

**After every pass: stop, verify, summarize, and wait for review.**

Do not begin the next pass automatically.

## Pass 1 — Foundation and Data Contracts

### Goal

Create the minimum working frontend/backend structure and the stable data contracts used by later passes.

### Build

- React + TypeScript + Vite frontend.
- Tailwind CSS.
- FastAPI backend.
- CORS for local frontend/backend development.
- `backend/data/lesson.json` containing the exact five scenes from `SPEC.md`.
- `backend/data/learner_state.json` initialized to Alex with 50/50 proficiency.
- small learner-state read/write helper.
- routes:
  - `GET /api/lesson`
  - `GET /api/learner`
  - `POST /api/demo/reset`
- basic Pydantic models for shared API payloads.
- `.env.example` placeholders.
- frontend API client with one configurable API base URL.

### Do Not Build Yet

- final UI polish
- Whisper
- microphone capture
- OpenRouter
- Nemotron
- quiz
- context builder

### Verify

- backend starts;
- frontend starts;
- frontend can fetch lesson and learner state;
- reset restores 50/50 proficiency;
- frontend production build succeeds.

---

## Pass 2 — Design Shell and Interactive Lesson

### Goal

Make the application visually convincing before adding AI.

### Build

- apply `DESIGN.md`;
- Voice2Learn header;
- subtle floating math background;
- persistent microphone component in an idle visual state;
- Home screen with exactly one Multiplication & Division card;
- learner proficiency preview;
- Lesson screen;
- five authored scenes;
- scene progress;
- Back/Next fallback controls;
- scene-specific animations;
- browser TTS narration;
- lesson-complete transition toward the quiz.

### Required Visual Quality

The lesson must visibly demonstrate:

- groups appearing;
- repeated addition being built;
- multiplication replacing repeated addition;
- apples being shared into groups;
- the multiplication/division relationship.

Do not substitute five text slides.

### Do Not Build Yet

- real STT
- Nemotron Q&A
- dynamic quiz
- proficiency mutation

### Verify

- Home -> Lesson works by click;
- all five scenes work forward/backward;
- TTS can read scene narration;
- layout works on desktop and narrow mobile width;
- motion respects reduced-motion preference;
- frontend build succeeds.

---

## Pass 3 — Voice Loop and Local Whisper

### Goal

Make the authored lesson operable by voice.

### First Step

Inspect the user's actual local Whisper installation.

Do not assume:

- a specific Python package;
- whisper.cpp;
- faster-whisper;
- a specific model path;
- a specific CLI.

Choose the smallest integration that uses what is already installed.

Contain all local Whisper details inside one STT module.

### Build

Backend:

- `POST /api/stt/transcribe`;
- local Whisper adapter;
- audio format conversion only if the installed runtime requires it.

Frontend:

- browser audio recording;
- microphone permission flow;
- voice states:
  - idle
  - listening
  - processing
  - speaking
  - error
- transcript command resolver (clearly temporary: only for this pass's isolated pre-OpenRouter verification; explicitly replaced by the backend semantic intent classifier in Pass 5);
- lesson commands for this temporary verification only:
  - next (including spoken `continue` as a variant of `next`)
  - back
  - repeat
  - start quiz / quiz me on the final scene
- automatic listening resume after TTS where browser behavior permits;
- click/tap microphone fallback.

### Important

Do not implement true barge-in.

Pause listening while TTS is speaking.

### Verify

Without repeatedly clicking controls after initial activation, demonstrate:

- start lesson by voice;
- next;
- back;
- repeat.

Whisper failure must not crash the UI.

---

## Pass 4 — Context Builder and Nemotron Lesson Q&A

### Goal

Let the child ask a natural question about the current lesson.

### Build

Backend:

- OpenRouter client;
- model configured through environment variable;
- one context-builder module;
- generate/overwrite `backend/data/context.md` before each Nemotron call;
- Pydantic tutor response model;
- `POST /api/tutor/ask`.

Context includes:

- Alex;
- chapter;
- lesson;
- current scene;
- current scene narration;
- visual description;
- concepts taught so far;
- current proficiency;
- recent attempts;
- child question.

Frontend:

- while on the lesson screen, forward transcripts classified as lesson questions (`ask-question`) to tutor Q&A (final routing via the Pass 5 semantic intent classifier, using the original transcript);
- show a friendly tutor speech bubble/panel without leaving the lesson;
- speak the answer with browser TTS;
- return to the same lesson scene afterward.

### Reliability

- keep tutor answers short;
- validate JSON;
- retry once on invalid structured output;
- show a friendly recoverable error after second failure.

### Verify

On at least two different scenes, ask a context-dependent question and confirm the response references the correct scene.

Example:

`Why is it three times four?`

The answer must be relevant to the visible three-groups-of-four explanation.

---

## Pass 5 — Nemotron Quiz and Learner Proficiency

### Goal

Complete the learning loop with a dynamic five-question assessment.

### Build

Backend:

- Nemotron quiz-generation prompt using the context builder;
- strict Pydantic question model;
- arithmetic verifier for `a*b` and `a/b`;
- retry once on invalid/unverifiable output;
- server-side storage of the current question answer;
- `POST /api/quiz/next`;
- `POST /api/quiz/answer`;
- deterministic grading;
- backend Nemotron semantic intent classifier (`POST /api/intent/classify`) using the context builder, replacing the temporary Pass 3 exact resolver as the final routing behavior;
- strict Pydantic intent model, retry once on invalid output, friendly recoverable error;
- proficiency update:
  - correct `+10`
  - incorrect `-5`
  - clamp `0..100`;
- persist only the most recent 10 attempts.

Frontend:

- five-question quiz flow;
- question count;
- four tactile options;
- TTS reads the question and A/B/C/D options before listening;
- route every non-empty quiz transcript to `POST /api/intent/classify` (no frontend exact local phrase matching as final behavior); voice answers:
  - A/B/C/D (including imperfect STT variants)
  - option A/B/C/D
- repeat-question voice action via the classifier;
- correct/incorrect feedback;
- speak feedback;
- generate the next question only after state update;
- Results screen with score and updated multiplication/division proficiency;
- Review Lesson and Take Quiz Again.
- route every non-empty transcript on every screen through `POST /api/intent/classify`; lesson `ask-question` actions forward the original transcript to `POST /api/tutor/ask`.

### Security / Correctness

Do not send `correct_option` or `explanation` to the frontend before submission.

Quiz intent classification may receive only the visible sanitized question/options, never the hidden correct answer or explanation. Empty transcripts are never sent to the LLM; listening resumes silently.

### Verify

- five questions complete end-to-end;
- questions are Nemotron-generated;
- each has four options;
- invalid arithmetic is rejected;
- every non-empty transcript on home/lesson/quiz/results is routed to `POST /api/intent/classify` and mapped semantically (including imperfect STT) to a screen-allowed action; no final exact local phrase matching remains;
- voice answer selection works;
- proficiency visibly changes;
- later questions receive updated context;
- results match the learner-state file.

---

## Pass 6 — Demo Hardening and Polish

### Goal

Make the Pre-Review demo reliable and presentation-ready.

### Build/Fix Only What Is Needed

- smooth screen transitions;
- polish microphone state animation;
- improve lesson visual timing;
- improve correct/incorrect feedback;
- ensure no content is hidden behind the fixed microphone;
- improve empty/loading/error states;
- remove debugging UI;
- remove placeholder content;
- ensure all copy says Voice2Learn;
- reset endpoint/action available for repeatable demos;
- update `README.md` to match the real installation;
- verify no out-of-scope feature was added.

### End-to-End Demo

Run this exact path:

1. reset demo;
2. open Home;
3. activate microphone once;
4. say `start lesson`;
5. navigate lesson by voice;
6. ask a contextual lesson question;
7. finish the lesson;
8. complete five MCQs by voice;
9. show changed proficiency;
10. take/review the next action by voice.

### Final Verification

- frontend production build succeeds;
- backend starts cleanly;
- no raw provider errors reach the UI;
- no secret exists in frontend code;
- normal demo path works without repeated physical input after initial microphone activation;
- visual result follows `DESIGN.md`;
- implementation still matches `SPEC.md`.

Stop after this pass. Do not begin final-project expansion.


---

## Follow-Up Order and Review Gates

Order: **Prerequisite R → 7 → 8 → 9 → 10 → 11 → 12**. Each is a separate review boundary. This documentation change authorizes planning, not starting code. Do not infer approval from committed code or import earlier branch status. No new architecture, API-contract, plan, or tracker documents; sources are `SPEC.md`, this file and `PROGRESS.md`. `USER_NAVIGATION.md` stays a concise user command list.

## Prerequisite R — Reconcile the Existing Post-Review Baseline

### Goal

Finish and verify the already requested comprehension/voice-access work on this branch before replacing its classifier. This consolidates the former `POST_REVIEW_PLAN.md`; no approval is implied.

### Scope

- Preserve one authored four-option check per scene; narrate it after scene narration, require correctness to unlock forward/Start Quiz, preserve passed checks while moving backward within a visit, and keep them separate from proficiency/quiz length.
- Preserve voice Home/back-from-first-scene/help; quiz recap open/close/read without losing a question; question-load retry; neural TTS with browser speech fallback; continuous VAD utterances with no barge-in.
- Repair frontend classifier request construction: send visible active check/options, notes state and real question-load failure state. Current code defines these fields but omits them in `handleTranscript`.
- Add the coordinated `check_passed`/`quiz_phase` state fields specified in SPEC Section 12; use state-aware action availability. Distinguish question-load errors from answer-submission errors. Suppress duplicate/stale requests when any relevant state changes.
- Preserve current response/action vocabulary, Nemotron routing, five-question quiz and backend grading. Check grading currently compares authored options in the application; do not misdescribe it as backend assessment.
- Review/fix only demonstrated blockers in this existing slice; do not add Section 17 extensions or port a superseded remote classifier implementation here.

### Files

Targeted `frontend/src/App.tsx`, `types.ts`, existing components/voice hook only where evidence requires; backend `intent.py`, intent context helpers/models as required for the specified fields. Preserve provider/STT implementations. Update README for actual setup and PROGRESS for evidence; coordinate shared changes with the other developer.

### Verify and stop

Exercise voice check selection/unlock/retry, gated forward movement, Back/Home, help, quiz notes and load-error retry with correct request bodies; malformed state/answer context; stale replies after state changes; existing tutor and quiz behavior. Build frontend, start backend and preview. Record browser/microphone checks and network-dependent speech separately from static/stubbed checks. Preserve user learner data. Report and wait for approval before Pass 7.

## Pass 7 — Isolated Local Laya Typed-Decisions Boundary

### Scope

- Implement isolated `backend/app/laya.py` around official `laya==0.4.12`, pinned local `convaiinnovations/laya-typed-decisions` checkpoint and synchronous Choice API; no application routing switch.
- Local path only; no import/startup/request download or network access. Default ignored artifact path `backend/models/laya-typed-decisions`; optional `VOICE2LEARN_LAYA_MODEL_DIR` override and `auto|cuda|mps|cpu` selection (`CUDA > MPS > CPU`). Explicit unavailable/mismatched device is an error.
- Validate typed choices, exact finite probability distribution, confidence, maximum-choice consistency and ambiguity. Limit offered choices to 19. Sanitize failures and serialize shared model inference; no retry, confidence threshold or Nemotron classifier fallback here.
- Preserve current classifier on Nemotron. Pin Laya only; do not universal-pin platform-specific Torch. Setup supports macOS/MPS and CPU; Windows NVIDIA users install the correct CUDA PyTorch wheel per official instructions.

### Files

`backend/app/jev.py` (delete), `backend/app/laya.py`, `backend/.env.example`, `backend/requirements.txt`, README, AGENTS, SPEC, BUILD_PLAN, PROGRESS, DESIGN and USER_NAVIGATION only for architecture/provider/status updates.

### Verify and stop

Test input/output failures, ties, singleton concurrency, device selection/unavailability/mismatch, sanitized errors and offline local path with fakes. Install and introspect actual package API, download the exact pinned checkpoint, record revision/inventory/hash, then run repeated local Choices on available hardware and CPU if feasible. Verify imports/startup do not load Torch/Laya or make network calls and current intent still uses Nemotron. Run backend/frontend checks and learner-state hash. Report Windows CUDA as unverified actual hardware here. Stop for review; no Pass 8 work.

## Pass 8 — Laya Routing for the Current Application

### Scope

- Switch only `/api/intent/classify` to the isolated local Laya boundary. Preserve the full existing actions, public `{action, option}` shape and prerequisite state fields.
- Use one screen/state-specific Choice over allowed actions. Internal check-A/B/C/D and select-A/B/C/D normalize to `select-check` and `select-option`. Offer no answer selection during loading/grading/feedback/error or without an active visible question/check.
- Include current scene/final status, check completion, visible check/quiz options, notes and error/phase context. Resolve authored data backend-side; never include hidden answers, check hints, old graded explanations or raw learner-attempt answer records in classification state.
- Evaluate named acceptance thresholds; low confidence → unclear without retry. Invalid Laya output/load/inference → sanitized 502 without retry or Nemotron classifier fallback.
- Preserve gate notices, Back-from-first-scene Home, original-transcript tutor forwarding, notes, local check comparison and deterministic quiz grading. Do not change neural/browser TTS, VAD or model-generation provider fallbacks.
- Recheck screen/state before action execution; extend guards only where necessary to preserve the new context. No navigation extensions from Section 17 yet.

### Files

`backend/app/intent.py`, `laya.py`, intent helpers in `context_builder.py`; narrowly scoped frontend guard corrections if required by the state contract, coordinated with its owner; PROGRESS. No unrelated tutor/quiz/provider refactor.

### Verify and stop

Controlled Laya cases for every existing action and A/B/C/D in both selection modes; gates, notes open/closed, quiz load failure, malformed context, wrong-state actions, uncertainty/negation/mixed requests, model failure, stale results. Confirm classifier makes no Nemotron call; tutoring/generation still do. Preserve raw transcript, hidden answers and result shape. Build/start/preview; report hardware gaps and await approval.

## Pass 9 — Evaluate and Review the Core Migration

### Scope / verification

- Small labeled set from representative written examples and actual local Whisper transcripts across all screens, including checks, quiz options, notes, retry, help, negation, mixed requests, ambiguity and gates. Store no raw child audio or credentials.
- Evaluate wrong actions and valid commands rejected; tune named thresholds separately for navigation and selections based on evidence. Confidence is not calibrated accuracy by assumption.
- Compare baseline and Laya classification latency under comparable contexts and conditions. Separately measure VAD/Whisper/TTS/full-turn delay; keep the current utterance capture behavior. Missing baseline/access is a reported limitation, not invented data.
- End-to-end Home → checks/lesson → contextual tutor on two scenes → gated quiz start → notes/repeat/retry → five answers/grades → Results → review/retake by voice, after one initial activation.
- Frontend build/backend startup/error recovery/continuous listening; preserve and restore verification data without overwriting learner data. README setup and PROGRESS evidence reflect reality.

Stop for approval. Pass 9 approves only core Laya routing; additional general voice navigation remains planned until its own passes are reviewed.

## Pass 10 — General Voice Destinations, Resume and Orientation

### Scope

Implement exactly SPEC Section 17's first group and corresponding USER_NAVIGATION commands: extend `home` to Results; restart/jump/resume/return lesson; repeat tutor answer; read position/progress/results. Preserve original actions and proficiency behavior.

- Derive destinations from authored IDs/order/titles/concepts; no fixed lesson phrases/count or new curriculum engine.
- Add nullable `target_scene_id` to Python/TypeScript results together. One internal Laya choice per existing jump destination; no second model call. A requested blocked forward jump explains the check gate without moving. Validate target IDs and completed-check path before execution.
- Add only the specified optional session context and simple local state: lesson resume/check snapshot, single jump origin, tutor-answer availability. Resume is within the open application; no persisted navigation/history schema.
- Keep this file's allowed new actions consistent with SPEC/USER_NAVIGATION; invalid or ambiguous destinations clarify without moving. Keep speech/listening/stale-response protection.

### Files / verification

Coordinated changes to intent/context/result types, frontend App/types/API and existing UI components only as required; lesson JSON stays authored data. Verify each action across valid/invalid states, named/numbered/ambiguous destinations, gates, correct session restore, original tutoring and quiz paths, no lost/duplicated grades. Build/start/preview; update README/PROGRESS and stop for review.

## Pass 11 — Voice Pacing, Feedback and Confirmed Quiz Exit

### Scope

Implement exactly SPEC Section 17's second group: pause/resume between spoken turns, learner-controlled quiz continuation, repeat feedback, and confirmed quiz exit/cancel. Generic retry continues to use the safe current-state `retry-question` action; no automatic answer resubmission.

- Coordinated `paused` and `exit_confirmation_pending` context; preserve prior quiz phase for cancel. No voice pause while STT is off during narration, wake-word subsystem or barge-in.
- After grading, show/speak feedback then listen; only Continue advances or opens Results after Q5. Never grade/update proficiency again for repeat/continue.
- Permit exit only from specified stable phases; confirmation commits the exit, cancellation restores the same question/notes/phase. Persisted grades are retained; no unfinished quiz resume or rollback.
- Keep scene gates and existing voice actions valid. Add concise hints and phase-aware help within the existing screens.

### Verify and stop

All pause/resume/continue meanings by state, repeated feedback, last-question Results, exit yes/no, ambiguity, denied loading/grading exits, provider failures, duplicate/stale action results and unchanged persisted grading. Verify no repeated physical input is needed. Build/start/preview, update README/PROGRESS, stop for review.

## Pass 12 — Full Voice Navigation Acceptance and Handoff

### Verify / adjust only for demonstrated defects

- Exercise every USER_NAVIGATION command in its allowed state with real local speech where available; unavailable commands clarify safely. No unsupported cross-lesson features.
- Full lesson/check/tutor/quiz/notes/pacing/exit/resume/results path, including pauses, named/numbered jumps, blocked forward jumps, unclear input, provider errors and TTS fallback.
- Reevaluate Laya choices/thresholds/latency after the action-set expansion; state the model/revision/device and actual sample count. Mocks do not prove real speech/model compatibility.
- Build frontend, start backend/preview, verify keys/answer separation and no duplicate grades/data loss; restore disposable verification state safely.
- Update README and PROGRESS with branch/base/approved commits when known, evidence, live gaps and remaining issues. USER_NAVIGATION status must match approved implementation. Do not claim earlier untested actions live.

Stop for approval. No automatic merge, extra curriculum, new platform infrastructure or deployment. Integration with any other branch needs explicit authorization and combined verification; a clean Git merge is insufficient.
