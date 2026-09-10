# Voice2Learn — Pre-Review MVP Build Plan

Implement one pass at a time.

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
