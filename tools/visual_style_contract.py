"""Shared visual style contract for every Terra image-generation script."""

STYLE_ANCHOR = (
    "MUST STRICTLY USE: Studio Ghibli art style, Legend of Zelda Breath of the Wild style, "
    "bright and warm pastel colors, cute and stylized flat shading. "
    "ABSOLUTELY NO dark fantasy, NO photorealism, NO horror elements."
)


def anchored(prompt: str) -> str:
    prompt = (prompt or "").strip()
    return f"{prompt}, {STYLE_ANCHOR}"
