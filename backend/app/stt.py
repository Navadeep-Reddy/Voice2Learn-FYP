"""Local Whisper STT boundary for the Pre-Review MVP.

All local Whisper details live in this module. The rest of the app calls
``transcribe(audio_path) -> str`` and nothing else.

Strategy (explicit and bounded):

- Direct in-process adapter: ``faster_whisper.WhisperModel`` is imported
  lazily inside this backend process and the cached model snapshot is
  loaded exactly once (singleton), so every 3-5 second voice turn stays
  low-latency instead of paying model startup per request.
- No model is ever downloaded: the model is constructed with
  ``local_files_only=True`` against the exact cached snapshot directory.
- CUDA ``float16`` is tried first; any load failure falls back to CPU
  ``int8``. Pip-provided CUDA shared libraries (``nvidia-cublas-cu12``,
  ``nvidia-cudnn-cu12``) are preloaded with ``ctypes`` before model
  initialization so no bespoke shell ``LD_LIBRARY_PATH`` export is needed.
- All calls are serialized under a module lock: model init happens once
  and each transcription runs one at a time.

Environment (all optional, documented in ``backend/.env.example``):

- ``VOICE2LEARN_WHISPER_MODEL_DIR``: exact cached model snapshot directory
- ``VOICE2LEARN_WHISPER_DEVICE``: ``cuda`` (default) with CPU fallback
- ``VOICE2LEARN_WHISPER_COMPUTE_TYPE``: ``float16`` (default) / ``int8``
"""

from __future__ import annotations

import ctypes
import glob
import logging
import os
import sys
import threading
from pathlib import Path

log = logging.getLogger("voice2learn.stt")

MODEL_DIR = os.environ.get(
    "VOICE2LEARN_WHISPER_MODEL_DIR",
    "/home/navadeep/.cache/huggingface/hub/models--Systran--faster-distil-whisper-large-v3"
    "/snapshots/c3058b475261292e64a0412df1d2681c06260fab",
)
DEVICE = os.environ.get("VOICE2LEARN_WHISPER_DEVICE", "cuda")
COMPUTE_TYPE = os.environ.get("VOICE2LEARN_WHISPER_COMPUTE_TYPE", "float16")


class TranscriptionError(RuntimeError):
    """Raised when local transcription cannot produce text."""


_lock = threading.Lock()
_model: object | None = None
_preloaded = False


def _preload_cuda_libs() -> None:
    """Preload pip-provided CUDA libs so ctranslate2 finds them in-process."""
    global _preloaded
    if _preloaded:
        return
    _preloaded = True
    patterns = (
        os.path.join(sys.prefix, "lib", "python*/site-packages/nvidia/cublas/lib/lib*.so*"),
        os.path.join(sys.prefix, "lib", "python*/site-packages/nvidia/cudnn/lib/lib*.so*"),
    )
    for pattern in patterns:
        for path in sorted(glob.glob(pattern)):
            try:
                ctypes.CDLL(path, mode=os.RTLD_GLOBAL)
            except OSError:
                log.warning("could not preload cuda lib: %s", path, exc_info=True)


def _load_model(model_dir: str, device: str, compute_type: str):
    from faster_whisper import WhisperModel  # noqa: PLC0415 - lazy, keep startup light

    _preload_cuda_libs()
    return WhisperModel(
        model_dir,
        device=device,
        compute_type=compute_type,
        local_files_only=True,
    )


def _get_model_locked():
    """Return the singleton model, loading it once per backend process."""
    global _model
    if _model is not None:
        return _model
    model_dir = Path(MODEL_DIR)
    if not model_dir.is_dir():
        raise TranscriptionError("model unavailable")
    try:
        _model = _load_model(str(model_dir), DEVICE, COMPUTE_TYPE)
        log.warning("whisper ready device=%s compute=%s", DEVICE, COMPUTE_TYPE)
    except Exception as exc:
        log.warning(
            "whisper %s/%s unavailable; falling back to cpu/int8",
            DEVICE,
            COMPUTE_TYPE,
            exc_info=True,
        )
        try:
            _model = _load_model(str(model_dir), "cpu", "int8")
            log.warning("whisper ready device=cpu compute=int8")
        except Exception as fallback_exc:
            raise TranscriptionError("model unavailable") from fallback_exc
    return _model


def transcribe(audio_path: str | Path) -> str:
    """Transcribe an audio file to text using the in-process model."""
    path = Path(audio_path)
    if not path.is_file() or path.stat().st_size == 0:
        raise TranscriptionError("empty audio")
    with _lock:
        model = _get_model_locked()
        try:
            segments, _info = model.transcribe(str(path), language="en", beam_size=1)
            return "".join(segment.text for segment in segments).strip()
        except TranscriptionError:
            raise
        except Exception as exc:
            raise TranscriptionError("transcription failed") from exc
