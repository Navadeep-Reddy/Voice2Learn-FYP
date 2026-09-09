"""FastAPI app: lesson, learner, demo reset, and local Whisper STT."""

from __future__ import annotations

import json
import logging
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from . import stt
from .models import LearnerState, Lesson, TranscriptionResponse
from .state import read_learner_state, reset_learner_state

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
LESSON_PATH = DATA_DIR / "lesson.json"

app = FastAPI(title="Voice2Learn API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_lesson() -> Lesson:
    with LESSON_PATH.open("r", encoding="utf-8") as handle:
        return Lesson.model_validate(json.load(handle))


@app.get("/api/lesson", response_model=Lesson)
def get_lesson() -> Lesson:
    return load_lesson()


@app.get("/api/learner", response_model=LearnerState)
def get_learner() -> LearnerState:
    return read_learner_state()


@app.post("/api/demo/reset", response_model=LearnerState)
def reset_demo() -> LearnerState:
    return reset_learner_state()


log = logging.getLogger("voice2learn.api")

FRIENDLY_STT_ERROR = "I didn't catch that. Try again."
MAX_AUDIO_BYTES = 10 * 1024 * 1024
ALLOWED_AUDIO_EXTENSIONS = {".wav", ".webm", ".mp3", ".m4a", ".ogg", ".oga", ".opus"}


@app.post("/api/stt/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(file: UploadFile = File(...)) -> TranscriptionResponse:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=422, detail=FRIENDLY_STT_ERROR)
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail=FRIENDLY_STT_ERROR)

    raw_name = Path(file.filename or "").name
    extension = Path(raw_name).suffix.lower()
    if extension not in ALLOWED_AUDIO_EXTENSIONS:
        extension = ".webm"

    temp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=extension, delete=False) as handle:
            handle.write(data)
            temp_path = Path(handle.name)
        text = stt.transcribe(temp_path)
        return TranscriptionResponse(text=text)
    except stt.TranscriptionError:
        log.warning("stt transcription failed", exc_info=True)
        raise HTTPException(status_code=422, detail=FRIENDLY_STT_ERROR)
    except Exception:  # noqa: BLE001 - never leak internals to the student UI
        log.exception("stt endpoint failed")
        raise HTTPException(status_code=503, detail=FRIENDLY_STT_ERROR)
    finally:
        await file.close()
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)
