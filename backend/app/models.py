"""Shared Pydantic response/data models for the Pre-Review MVP."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class Proficiency(BaseModel):
    multiplication: int = Field(ge=0, le=100)
    division: int = Field(ge=0, le=100)


class Attempt(BaseModel):
    skill: Literal["multiplication", "division"]
    question: str
    selected_option: str
    correct_option: str
    correct: bool
    timestamp: str


class LearnerState(BaseModel):
    student_name: str
    proficiency: Proficiency
    recent_attempts: list[Attempt] = Field(default_factory=list)


class Scene(BaseModel):
    id: str
    title: str
    concept: str
    narration: str
    visual_description: str


class Lesson(BaseModel):
    chapter: str
    title: str
    scenes: list[Scene]


class TranscriptionResponse(BaseModel):
    text: str
