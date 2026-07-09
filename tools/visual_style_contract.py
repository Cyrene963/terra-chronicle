"""Shared image-generation route and visual style contract for Terra tools."""
from __future__ import annotations

import os

STYLE_ANCHOR = (
    "MUST STRICTLY USE: Studio Ghibli art style, Legend of Zelda Breath of the Wild style, "
    "bright and warm pastel colors, cute and stylized flat shading. "
    "ABSOLUTELY NO dark fantasy, NO photorealism, NO horror elements."
)

API_BASE = os.environ.get("TERRA_IMAGE_API_BASE", "https://ai.input.im").rstrip("/")
API_URL = f"{API_BASE}/v1/images/generations"
API_KEY = os.environ.get("TERRA_IMAGE_API_KEY") or os.environ.get("OPENAI_API_KEY")


def anchored(prompt: str) -> str:
    prompt = (prompt or "").strip()
    return f"{prompt}, {STYLE_ANCHOR}"


def require_api_key() -> str:
    if not API_KEY:
        raise RuntimeError("Set TERRA_IMAGE_API_KEY (preferred) or OPENAI_API_KEY before generating Terra assets")
    return API_KEY
