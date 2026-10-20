"""Isolated NVIDIA Integrate client for Nemotron chat completions."""

from __future__ import annotations

import asyncio
import logging
import os
import time
from http import HTTPStatus

import httpx

NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b"
REQUEST_TIMEOUT_SECONDS = 60.0
RETRYABLE_STATUS_CODES = {500, 502, 503, 504}
RETRY_DELAYS_SECONDS = (0.5, 1.0, 2.0)
MAX_ATTEMPTS = len(RETRY_DELAYS_SECONDS) + 1
log = logging.getLogger("voice2learn.nvidia")


class NvidiaError(RuntimeError):
    """Raised when NVIDIA cannot return a valid chat completion."""


class NvidiaTimeoutError(NvidiaError):
    """Raised when NVIDIA exceeds the bounded request deadline."""


def get_model() -> str:
    configured = os.environ.get("NVIDIA_MODEL", DEFAULT_MODEL)
    return (configured or DEFAULT_MODEL).strip() or DEFAULT_MODEL


def get_api_key() -> str:
    key = os.environ.get("NVIDIA_API_KEY", "").strip()
    if not key:
        log.warning("NVIDIA configuration error: NVIDIA_API_KEY is missing")
        raise NvidiaError("missing api key")
    return key


async def chat_completion(messages: list[dict[str, str]]) -> str:
    api_key = get_api_key()
    payload = {
        "model": get_model(),
        "messages": messages,
        "temperature": 0.5,
        "top_p": 1,
        "max_tokens": 1024,
        "chat_template_kwargs": {"enable_thinking": False},
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    started = time.monotonic()
    try:
        timeout = httpx.Timeout(REQUEST_TIMEOUT_SECONDS, connect=5.0)
        async with asyncio.timeout(REQUEST_TIMEOUT_SECONDS):
            async with httpx.AsyncClient(timeout=timeout) as client:
                for attempt in range(1, MAX_ATTEMPTS + 1):
                    response = await client.post(NVIDIA_URL, json=payload, headers=headers)
                    if response.status_code not in RETRYABLE_STATUS_CODES or attempt == MAX_ATTEMPTS:
                        break
                    delay = RETRY_DELAYS_SECONDS[attempt - 1]
                    log.warning(
                        "NVIDIA transient HTTP %s (attempt %s/%s); retrying in %.1fs within %.0fs deadline",
                        response.status_code, attempt, MAX_ATTEMPTS, delay, REQUEST_TIMEOUT_SECONDS,
                    )
                    await asyncio.sleep(delay)
    except (httpx.TimeoutException, TimeoutError) as exc:
        log.warning("NVIDIA timeout (%s) after %.1fs; deadline %.0fs", type(exc).__name__, time.monotonic() - started, REQUEST_TIMEOUT_SECONDS)
        raise NvidiaTimeoutError("provider timed out") from exc
    except Exception as exc:
        log.warning("NVIDIA transport failure (%s)", type(exc).__name__)
        raise NvidiaError("provider request failed") from exc
    if response.status_code >= 400:
        try:
            reason = HTTPStatus(response.status_code).phrase
        except ValueError:
            reason = "Unknown status"
        log.warning("NVIDIA request rejected (HTTP %s: %s) after %s attempt(s)", response.status_code, reason, attempt)
        raise NvidiaError("provider request failed")
    if attempt > 1:
        log.info("NVIDIA recovered on attempt %s/%s after %.1fs", attempt, MAX_ATTEMPTS, time.monotonic() - started)
    try:
        data = response.json()
        content = data["choices"][0]["message"]["content"]
    except Exception as exc:
        log.warning("NVIDIA response invalid: missing or malformed completion (%s)", type(exc).__name__)
        raise NvidiaError("provider response invalid") from exc
    if not isinstance(content, str) or not content.strip():
        log.warning("NVIDIA response invalid: completion content is empty or not text")
        raise NvidiaError("provider response invalid")
    return content
