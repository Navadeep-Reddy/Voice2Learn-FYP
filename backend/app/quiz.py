"""Nemotron quiz generation + deterministic grading (Pass 5).

Single-user MVP: one active (current) question is kept in module memory
behind a small lock. A new successful ``POST /api/quiz/next`` replaces it;
answering consumes it so duplicate grading cannot mutate learner state twice.
"""

from __future__ import annotations

import json
import logging
import re
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from . import openrouter
from .context_builder import rebuild_quiz_context
from .models import Attempt, Lesson, Proficiency
from .state import read_learner_state, write_learner_state

log = logging.getLogger("voice2learn.quiz")

FRIENDLY_QUIZ_ERROR = "My helper is having trouble right now. Try again."
STALE_QUESTION_MESSAGE = "That question is not active anymore. Please try again."

router = APIRouter()

LESSON_PATH = Path(__file__).resolve().parents[1] / "data" / "lesson.json"

Skill = Literal["multiplication", "division"]
OptionId = Literal["A", "B", "C", "D"]


def load_lesson() -> Lesson:
    with LESSON_PATH.open("r", encoding="utf-8") as handle:
        return Lesson.model_validate(json.load(handle))


SYSTEM_PROMPT = (
    "You are a kind math question writer for a child aged 8-12 in the "
    "Voice2Learn lesson 'Groups and Sharing' (chapter 'Multiplication & "
    "Division'). Use the provided quiz context, including proficiency and "
    "recent attempts, to prefer the skill needing more practice. "
    "Write exactly one short multiple-choice question about equal groups, "
    "repeated addition as multiplication, simple multiplication, equal "
    "sharing division, or the multiplication/division relationship. "
    "Rules: integers only; multiplication factors 2-10 with result at most "
    "50; division must divide evenly with no remainder; no fractions, "
    "decimals, or long multiplication/division. "
    "Reply with JSON only in exactly this shape: "
    '{"skill": "multiplication"|"division", "question": "...", '
    '"expression": "3*4" or "12/3", '
    '"options": [{"id": "A", "text": "7"}, ... exactly A, B, C, D], '
    '"correct_option": "A"|"B"|"C"|"D", "explanation": "..."}.'
)


class QuizOption(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: OptionId
    text: str = Field(min_length=1)


class QuizGenerated(BaseModel):
    """Strict Nemotron question contract; extra fields are forbidden."""

    model_config = ConfigDict(extra="forbid")

    skill: Skill
    question: str = Field(min_length=1)
    expression: str = Field(min_length=1)
    options: list[QuizOption] = Field(min_length=4, max_length=4)
    correct_option: OptionId
    explanation: str = Field(min_length=1)


class QuizNextResponse(BaseModel):
    question_id: str
    skill: Skill
    question: str
    options: list[QuizOption]


class QuizAnswerRequest(BaseModel):
    question_id: str = Field(min_length=1)
    selected_option: OptionId


class QuizAnswerResponse(BaseModel):
    correct: bool
    correct_option: OptionId
    explanation: str
    proficiency: Proficiency


_lock = threading.Lock()
_active: dict | None = None


def reset_active_question() -> None:
    """Clear the in-memory current question (used by demo reset)."""
    global _active
    with _lock:
        _active = None


def parse_generated(content: str) -> QuizGenerated:
    text = (content or "").strip()
    if not text:
        raise ValueError("empty provider content")
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError("provider content is not JSON") from exc
    try:
        return QuizGenerated.model_validate(data)
    except ValidationError as exc:
        raise ValueError("provider content invalid") from exc


_EXPRESSION_RE = re.compile(r"^\s*(\d+)\s*([*/])\s*(\d+)\s*$")
_INTEGER_RE = re.compile(r"^[+-]?\d+$")


def verify_question(generated: QuizGenerated) -> int:
    """Verify arithmetic and option integrity; return the computed answer.

    Never uses ``eval``: the two operands and operator are parsed explicitly.
    Raises ``ValueError`` for anything malformed or unverifiable.
    """
    match = _EXPRESSION_RE.match(generated.expression or "")
    if not match:
        raise ValueError("expression must be integer*integer or integer/integer")
    left = int(match.group(1))
    operator = match.group(2)
    right = int(match.group(3))

    expected_operator = "*" if generated.skill == "multiplication" else "/"
    if operator != expected_operator:
        raise ValueError("operator must match skill")

    if generated.skill == "multiplication":
        if not (2 <= left <= 10 and 2 <= right <= 10):
            raise ValueError("multiplication factors are normally 2-10")
        answer = left * right
        if answer > 50:
            raise ValueError("multiplication result must be <= 50")
    else:
        if right == 0:
            raise ValueError("division by zero")
        if left % right != 0:
            raise ValueError("division must divide evenly")
        answer = left // right

    ids = [option.id for option in generated.options]
    if sorted(ids) != ["A", "B", "C", "D"]:
        raise ValueError("option ids must be exactly A/B/C/D once each")

    seen: set[int] = set()
    for option in generated.options:
        text = option.text.strip()
        if not _INTEGER_RE.match(text):
            raise ValueError("option texts must represent integers")
        seen.add(int(text))
    if len(seen) != 4:
        raise ValueError("distractors must be unique")

    matches = [
        option.id
        for option in generated.options
        if int(option.text.strip()) == answer
    ]
    if len(matches) != 1 or matches[0] != generated.correct_option:
        raise ValueError("computed answer must match correct_option exactly once")

    if not generated.question.strip() or not generated.explanation.strip():
        raise ValueError("question and explanation must not be empty")
    return answer


@router.post("/api/quiz/next", response_model=QuizNextResponse)
async def next_question() -> QuizNextResponse:
    global _active
    lesson = load_lesson()
    for _ in range(2):
        # Reread current learner state and rebuild context before EVERY
        # provider attempt, including the retry.
        learner = read_learner_state()
        context_text = rebuild_quiz_context(lesson, learner)
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": context_text},
        ]
        try:
            content = await openrouter.chat_completion(messages)
        except openrouter.OpenRouterError:
            log.warning("quiz provider call failed", exc_info=True)
            raise HTTPException(status_code=502, detail=FRIENDLY_QUIZ_ERROR)
        except Exception:  # noqa: BLE001 - never leak internals
            log.exception("quiz call failed")
            raise HTTPException(status_code=502, detail=FRIENDLY_QUIZ_ERROR)
        try:
            generated = parse_generated(content)
            verify_question(generated)
        except ValueError:
            log.warning("quiz invalid output, retrying", exc_info=True)
            continue
        question_id = str(uuid.uuid4())
        with _lock:
            _active = {
                "question_id": question_id,
                "skill": generated.skill,
                "question": generated.question.strip(),
                "options": generated.options,
                "correct_option": generated.correct_option,
                "explanation": generated.explanation.strip(),
                "expression": generated.expression.strip(),
            }
        return QuizNextResponse(
            question_id=question_id,
            skill=generated.skill,
            question=generated.question.strip(),
            options=generated.options,
        )
    log.warning("quiz invalid output twice; no learner mutation")
    raise HTTPException(status_code=502, detail=FRIENDLY_QUIZ_ERROR)


@router.post("/api/quiz/answer", response_model=QuizAnswerResponse)
def answer_question(body: QuizAnswerRequest) -> QuizAnswerResponse:
    global _active
    with _lock:
        active = _active
        if active is None:
            raise HTTPException(status_code=404, detail=STALE_QUESTION_MESSAGE)
        if body.question_id != active["question_id"]:
            raise HTTPException(status_code=409, detail=STALE_QUESTION_MESSAGE)
        # Consume the question so duplicate grading cannot mutate twice.
        _active = None

    skill: Skill = active["skill"]
    correct = body.selected_option == active["correct_option"]

    learner = read_learner_state()
    current = getattr(learner.proficiency, skill)
    updated = max(0, min(100, current + (10 if correct else -5)))
    setattr(learner.proficiency, skill, updated)

    learner.recent_attempts.append(
        Attempt(
            skill=skill,
            question=active["question"],
            selected_option=body.selected_option,
            correct_option=active["correct_option"],
            correct=correct,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
    )
    learner.recent_attempts = learner.recent_attempts[-10:]
    write_learner_state(learner)

    return QuizAnswerResponse(
        correct=correct,
        correct_option=active["correct_option"],
        explanation=active["explanation"],
        proficiency=learner.proficiency,
    )
