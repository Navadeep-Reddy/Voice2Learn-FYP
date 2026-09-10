"""Backend Nemotron semantic intent classifier: POST /api/intent/classify."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

from . import openrouter
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
    "review-lesson",
    "retake-quiz",
    "unclear",
]
OptionId = Literal["A", "B", "C", "D"]

ALLOWED_ACTIONS: dict[str, set[str]] = {
    "home": {"start-lesson", "unclear"},
    "lesson": {"next", "back", "repeat", "start-quiz", "ask-question", "unclear"},
    "quiz": {"select-option", "repeat-question", "unclear"},
    "results": {"review-lesson", "retake-quiz", "unclear"},
}

SYSTEM_PROMPT = (
    "You are the Voice2Learn voice intent classifier for a child aged 8-12. "
    "Map the raw STT transcript semantically to exactly one action allowed on "
    "the current screen, using the provided screen context. STT is imperfect: "
    "match meaning, not exact words. "
    "On home, lesson-start requests (start, let's learn, multiplication and "
    "division) map to start-lesson. "
    "On lesson, continue/go on/move on map to next; repeat/say again map to "
    "repeat; start quiz/quiz me map to start-quiz (final scene only); a "
    "free-form question about the lesson maps to ask-question; anything else "
    "maps to unclear. "
    "On quiz, spoken letters and variants (bee, be, see, sea, dee, option B, "
    "second one, I think twelve where twelve matches the visible option text) "
    "map to select-option with the matching visible option id A/B/C/D; "
    "repeat question maps to repeat-question; anything else maps to unclear. "
    "On results, review lesson maps to review-lesson; take quiz again maps to "
    "retake-quiz; anything else maps to unclear. "
    'Reply with JSON only in exactly this shape: {"action": "...", '
    '"option": "A"|"B"|"C"|"D"|null}. '
    "Option is required only for select-option and must be null otherwise. "
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
            if self.quiz_question is not None or self.quiz_options is not None:
                raise ValueError("quiz context is only allowed for quiz")
        elif self.screen == "quiz":
            if self.scene_id is not None:
                raise ValueError("scene_id is only allowed for lesson")
            if not (self.quiz_question or "").strip():
                raise ValueError("quiz_question is required for quiz")
            if self.quiz_options is None:
                raise ValueError("quiz_options is required for quiz")
            if len(self.quiz_options) != 4:
                raise ValueError("quiz_options must contain exactly 4 options")
            ids = sorted(option.id for option in self.quiz_options)
            if ids != ["A", "B", "C", "D"]:
                raise ValueError("quiz_options must contain exactly A/B/C/D once each")
            for option in self.quiz_options:
                if not option.text.strip():
                    raise ValueError("quiz option text must not be blank")
        else:
            if self.scene_id is not None:
                raise ValueError("scene_id is only allowed for lesson")
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
    if parsed.action == "select-option":
        if parsed.option is None:
            raise ValueError("option is required for select-option")
    elif parsed.option is not None:
        raise ValueError("option must be null unless select-option")
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
        )
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": context_text},
        ]
        try:
            content = await openrouter.chat_completion(messages)
        except openrouter.OpenRouterError:
            log.warning("intent provider call failed", exc_info=True)
            raise HTTPException(status_code=502, detail=FRIENDLY_INTENT_ERROR)
        except Exception:  # noqa: BLE001 - never leak internals
            log.exception("intent call failed")
            raise HTTPException(status_code=502, detail=FRIENDLY_INTENT_ERROR)
        try:
            return parse_intent(content, set(allowed), is_final)
        except (ValueError, json.JSONDecodeError) as exc:
            last_error = exc
            log.warning("intent invalid output, retrying", exc_info=True)
            continue
    log.warning("intent invalid output twice: %s", last_error)
    raise HTTPException(status_code=502, detail=FRIENDLY_INTENT_ERROR)
