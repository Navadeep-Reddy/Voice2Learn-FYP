"""Backend Nemotron semantic intent classifier: POST /api/intent/classify."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

from . import llm
from .context_builder import rebuild_intent_context
from .models import Lesson
from .state import read_learner_state

log = logging.getLogger("voice2learn.intent")

FRIENDLY_INTENT_ERROR = "My helper is having trouble right now. Try again."

router = APIRouter()

LESSON_PATH = Path(__file__).resolve().parents[1] / "data" / "lesson.json"

Screen = Literal["home", "lesson", "quiz", "results"]
IntentAction = Literal[
    "start-lesson",
    "next",
    "back",
    "repeat",
    "start-quiz",
    "ask-question",
    "select-option",
    "repeat-question",
    "select-check",
    "help",
    "home",
    "retry-question",
    "open-notes",
    "close-notes",
    "read-notes",
    "review-lesson",
    "retake-quiz",
    "unclear",
]
OptionId = Literal["A", "B", "C", "D"]

ALLOWED_ACTIONS: dict[str, set[str]] = {
    "home": {"start-lesson", "help", "unclear"},
    "lesson": {"next", "back", "home", "repeat", "start-quiz", "ask-question", "select-check", "help", "unclear"},
    "quiz": {"select-option", "repeat-question", "open-notes", "close-notes", "read-notes", "retry-question", "help", "unclear"},
    "results": {"review-lesson", "retake-quiz", "help", "unclear"},
}

SYSTEM_PROMPT = (
    "You are the Voice2Learn voice intent classifier for a child aged 8-12. "
    "Map the raw STT transcript semantically to exactly one action allowed on "
    "the current screen, using the provided screen context. STT is imperfect: "
    "match meaning, not exact words. "
    "On any screen, explain available commands with help. "
    "On home, lesson-start requests (start, let's learn, multiplication and "
    "division) map to start-lesson. "
    "On lesson, go home maps to home; go back/previous maps to back (from the first scene, back returns home). "
    "When a visible understanding check is active, spoken letters, option labels or visible answer text map to select-check and its matching option. "
    "On lesson, continue/go on/move on map to next; repeat/say again map to "
    "repeat; start quiz/quiz me map to start-quiz (final scene only); a "
    "free-form question about the lesson maps to ask-question; anything else "
    "maps to unclear. "
    "On quiz, spoken letters and variants (bee, be, see, sea, dee, option B, "
    "second one, I think twelve where twelve matches the visible option text) "
    "map to select-option with the matching visible option id A/B/C/D; "
    "repeat question maps to repeat-question; show/open lesson notes maps to open-notes, close/hide notes maps to close-notes, read lesson notes aloud maps to read-notes; retry loading a failed question maps to retry-question. Otherwise unclear. "
    "On results, review lesson maps to review-lesson; take quiz again maps to "
    "retake-quiz; anything else maps to unclear. "
    'Reply with JSON only in exactly this shape: {"action": "...", '
    '"option": "A"|"B"|"C"|"D"|null}. '
    "Option is required for select-option or select-check and must be null otherwise. "
    "Never include or rewrite question content."
)


def load_lesson() -> Lesson:
    with LESSON_PATH.open("r", encoding="utf-8") as handle:
        return Lesson.model_validate(json.load(handle))


class IntentQuizOption(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: OptionId
    text: str = Field(min_length=1)


class IntentClassifyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transcript: str = Field(min_length=1)
    screen: Screen
    scene_id: str | None = None
    quiz_question: str | None = None
    quiz_options: list[IntentQuizOption] | None = None
    check_question: str | None = None
    check_options: list[IntentQuizOption] | None = None
    notes_open: bool = False
    quiz_error: bool = False

    @field_validator("transcript")
    @classmethod
    def transcript_nonblank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("transcript must not be blank")
        return value

    @model_validator(mode="after")
    def check_screen_context(self) -> "IntentClassifyRequest":
        if self.screen == "lesson":
            if not (self.scene_id or "").strip():
                raise ValueError("scene_id is required for lesson")
            if self.quiz_question is not None or self.quiz_options is not None or self.notes_open or self.quiz_error:
                raise ValueError("quiz context is only allowed for quiz")
            if (self.check_question is None) != (self.check_options is None):
                raise ValueError("check question and options are required together")
            if self.check_options is not None and (not self.check_question or sorted(o.id for o in self.check_options) != ["A", "B", "C", "D"]):
                raise ValueError("invalid check context")
        elif self.screen == "quiz":
            if self.scene_id is not None or self.check_question is not None or self.check_options is not None:
                raise ValueError("lesson context is only allowed for lesson")
            if self.quiz_error and (self.quiz_question is not None or self.quiz_options is not None):
                raise ValueError("failed quiz question must not include options")
            if not self.quiz_error and not (self.quiz_question or "").strip():
                raise ValueError("quiz_question is required for quiz")
            if self.quiz_options is None and not self.quiz_error:
                raise ValueError("quiz_options is required for quiz")
            if self.quiz_options is not None and len(self.quiz_options) != 4:
                raise ValueError("quiz_options must contain exactly 4 options")
            ids = sorted(option.id for option in (self.quiz_options or [])) if not self.quiz_error else ["A", "B", "C", "D"]
            if ids != ["A", "B", "C", "D"]:
                raise ValueError("quiz_options must contain exactly A/B/C/D once each")
            for option in (self.quiz_options or []):
                if not option.text.strip():
                    raise ValueError("quiz option text must not be blank")
        else:
            if self.scene_id is not None or self.check_question is not None or self.check_options is not None or self.notes_open or self.quiz_error:
                raise ValueError("context is only allowed on its screen")
            if self.quiz_question is not None or self.quiz_options is not None:
                raise ValueError("quiz context is only allowed for quiz")
        return self


class IntentClassifyResponse(BaseModel):
    action: IntentAction
    option: OptionId | None = None


class IntentModelOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action: IntentAction
    option: OptionId | None = None


def allowed_actions_for(screen: str, is_final_scene: bool) -> list[str]:
    actions = set(ALLOWED_ACTIONS[screen])
    if screen == "lesson" and not is_final_scene:
        actions.discard("start-quiz")
    return sorted(actions)


def parse_intent(
    content: str, allowed: set[str] | list[str], is_final_scene: bool
) -> IntentClassifyResponse:
    text = (content or "").strip()
    if not text:
        raise ValueError("empty provider content")
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError("provider content is not JSON") from exc
    try:
        parsed = IntentModelOutput.model_validate(data)
    except ValidationError as exc:
        raise ValueError("provider content invalid") from exc
    if parsed.action not in set(allowed):
        raise ValueError("action not allowed for screen")
    if parsed.action in {"select-option", "select-check"}:
        if parsed.option is None:
            raise ValueError("option is required for selection")
    elif parsed.option is not None:
        raise ValueError("option must be null unless selecting")
    if parsed.action == "start-quiz" and not is_final_scene:
        raise ValueError("start-quiz is only allowed on the final scene")
    return IntentClassifyResponse(action=parsed.action, option=parsed.option)


@router.post("/api/intent/classify", response_model=IntentClassifyResponse)
async def classify_intent(body: IntentClassifyRequest) -> IntentClassifyResponse:
    lesson = load_lesson()
    transcript = body.transcript.strip()

    scene = None
    scene_index: int | None = None
    is_final = False
    if body.screen == "lesson":
        scene_id = (body.scene_id or "").strip()
        scene_index = next(
            (i for i, s in enumerate(lesson.scenes) if s.id == scene_id), None
        )
        if scene_index is None:
            raise HTTPException(status_code=404, detail="Unknown scene.")
        scene = lesson.scenes[scene_index]
        is_final = scene_index == len(lesson.scenes) - 1

    quiz_question: str | None = None
    quiz_options: list[dict[str, str]] | None = None
    if body.screen == "quiz":
        quiz_question = (body.quiz_question or "").strip()
        quiz_options = [
            {"id": option.id, "text": option.text.strip()}
            for option in (body.quiz_options or [])
        ]

    allowed = allowed_actions_for(body.screen, is_final)
    if body.screen == "lesson":
        if body.check_question is None:
            allowed.remove("select-check")
        elif scene and (body.check_question != scene.check.question or [(o.id, o.text) for o in body.check_options or []] != [(o.id, o.text) for o in scene.check.options]):
            raise HTTPException(status_code=422, detail="Invalid check context.")
    if body.screen == "quiz":
        if body.quiz_error:
            allowed = [a for a in allowed if a not in {"select-option", "repeat-question"}]
        else:
            allowed.remove("retry-question")
        if body.notes_open:
            allowed.remove("open-notes")
        else:
            allowed.remove("close-notes")

    last_error: Exception | None = None
    for _ in range(2):
        # Reread learner state and rebuild context before EVERY attempt.
        learner = read_learner_state()
        context_text = rebuild_intent_context(
            lesson,
            learner,
            transcript,
            body.screen,
            allowed,
            scene,
            scene_index,
            is_final if body.screen == "lesson" else None,
            quiz_question,
            quiz_options,
            body.check_question,
            ([{"id": o.id, "text": o.text} for o in body.check_options] if body.check_options else None),
            body.notes_open,
            body.quiz_error,
        )
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": context_text},
        ]
        try:
            content = await llm.chat_completion(messages)
        except llm.LLMError:
            log.warning("Intent classification failed: NVIDIA Nemotron unavailable; see provider diagnostics")
            raise HTTPException(status_code=502, detail=FRIENDLY_INTENT_ERROR)
        except Exception:  # noqa: BLE001 - never leak internals
            log.exception("intent call failed")
            raise HTTPException(status_code=502, detail=FRIENDLY_INTENT_ERROR)
        try:
            return parse_intent(content, set(allowed), is_final)
        except (ValueError, json.JSONDecodeError) as exc:
            last_error = exc
            log.warning("Intent output rejected (%s); retrying", str(exc))
            continue
    log.warning("intent invalid output twice: %s", last_error)
    raise HTTPException(status_code=502, detail=FRIENDLY_INTENT_ERROR)
