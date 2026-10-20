# Voice2Learn — Voice Navigation List

Commands use the current lesson’s actual content and available actions. **[R]** needs baseline wiring/review; **[10]** and **[11]** are planned extension passes. Other commands have existing code paths, not a claim of live verification. Jev routing begins in Pass 8. Voice applies after initial microphone setup, while listening.

- “Start lesson” / “Let's learn” — start the available lesson from Home.
- “Next” / “Continue” — move to the next scene after passing its quick check.
- “Back” / “Previous scene” — go back one scene; from the first scene, return Home.
- “Go home” — return Home from Lesson; **[10]** also from Results; **[11]** from Quiz after confirmation.
- “Repeat” / “Say that again” — replay lesson narration and its quick check/options.
- “Explain this” / “I don't understand” — receive contextual tutoring on the current lesson scene.
- **[R]** “Option <label>” / “The <ordinal> one” / “My answer is <answer>” — answer the active lesson check; wrong answers can be retried.
- **[R]** “Start quiz” / “Quiz me” — begin the quiz only after the final scene’s check is passed. The current voice dispatch checks only that it is the final scene; Prerequisite R must add the completion guard.
- “Option <label>” / “The <ordinal> one” / “My answer is <answer>” — submit the matching available quiz option; ambiguous answers need clarification.
- “Repeat the question” — hear the current quiz question and options again.
- “Show lesson notes” — open the authored lesson recap without leaving the question.
- **[R]** “Hide lesson notes” — close the recap without changing the question.
- “Read lesson notes” — hear the authored lesson recap.
- **[R]** “Try again” / “Retry the question” — retry a failed question load; do not resubmit a graded answer.
- “What can I do here?” / “Help” — hear commands available in the current state.
- “Review lesson” — return from Results to the beginning of the lesson with fresh checks.
- “Take the quiz again” — start a fresh quiz from Results; retain proficiency.
- **[10]** “Start the lesson over” — restart the lesson and its checks; retain proficiency.
- **[10]** “Go to scene <number>” / “Go to section <number>” — jump to an existing scene, subject to check gating.
- **[10]** “Take me to <topic>” — open the matching existing lesson section; clarify ambiguity.
- **[10]** “Go to the beginning” — jump to the current lesson’s first scene.
- **[10]** “Go to the last scene” — jump to the final scene only when required preceding checks are passed.
- **[10]** “Continue where I left off” — resume the saved lesson visit from Home within the open app.
- **[10]** “Go back to where I was” — return to the scene visited before a direct jump, subject to check gating.
- **[10]** “Repeat your answer” — replay the latest tutor answer on this scene.
- **[10]** “Where am I?” — hear current screen and scene/question position.
- **[10]** “Read my progress” — hear available proficiency on Home or Results.
- **[10]** “How did I do?” / “Repeat my results” — hear the score and encouragement on Results.
- **[11]** “Wait” / “Let me think” — pause the lesson or unanswered quiz between speech turns; keep listening for resume.
- **[11]** “Resume” / “I'm ready” — resume the paused task without submitting or advancing.
- **[11]** “Continue” — resume when paused; advance from graded quiz feedback when the quiz is waiting. “Next” on an active lesson moves to its next scene. After the last graded answer, quiz Continue opens Results.
- **[11]** “Repeat the feedback” — replay the latest graded explanation before advancing.
- **[11]** “Leave the quiz” — request an exit from a stable quiz state.
- **[11]** “Yes, leave” — confirm the pending exit to Home; retain grades already recorded.
- **[11]** “No, stay” — cancel the pending exit and restore the same quiz state.
