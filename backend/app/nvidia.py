"""Isolated NVIDIA Integrate client for Nemotron chat completions."""

from __future__ import annotations

import logging
import os
from http import HTTPStatus

import httpx

NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b"
log = logging.getLogger("voice2learn.nvidia")


class NvidiaError(RuntimeError):
    """Raised when NVIDIA cannot return a valid chat completion."""


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
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    try:
        timeout = httpx.Timeout(30.0, connect=3.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(NVIDIA_URL, json=payload, headers=headers)
    except Exception as exc:
        log.warning("NVIDIA transport failure (%s)", type(exc).__name__)
        raise NvidiaError("provider request failed") from exc
    if response.status_code >= 400:
        try:
            reason = HTTPStatus(response.status_code).phrase
        except ValueError:
            reason = "Unknown status"
        log.warning("NVIDIA request rejected (HTTP %s: %s)", response.status_code, reason)
        raise NvidiaError("provider request failed")
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
