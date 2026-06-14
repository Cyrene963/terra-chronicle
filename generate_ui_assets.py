#!/usr/bin/env python3
"""
Generate professional game UI assets for Terra Chronicle
Using gpt-image-2 API at ai.input.im
"""

import requests
import os
from pathlib import Path

API_URL = "https://ai.input.im/v1/images/generations"
API_KEY = "20090603_WeHaveToBeinHKU"
OUTPUT_DIR = "/root/terra-chronicle-game/assets/ui"

def generate_image(prompt: str, output_path: str, size: str = "256x256"):
    """Generate image using gpt-image-2 API"""
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "gpt-image-2",
        "prompt": prompt,
        "n": 1,
        "size": size,
        "quality": "standard"
    }

    print(f"Generating: {output_path}")
    print(f"Prompt: {prompt}")

    response = requests.post(API_URL, json=payload, headers=headers)

    if response.status_code != 200:
        print(f"Error: {response.status_code} - {response.text}")
        return False

    result = response.json()

    if "data" not in result or len(result["data"]) == 0:
        print(f"No image data returned")
        return False

    image_url = result["data"][0]["url"]

    # Download the image
    img_response = requests.get(image_url)
    if img_response.status_code == 200:
        with open(output_path, "wb") as f:
            f.write(img_response.content)
        file_size = os.path.getsize(output_path)
        print(f"✓ Saved: {output_path} ({file_size} bytes)\n")
        return True
    else:
        print(f"Failed to download image from {image_url}")
        return False

def main():
    """Generate all UI assets"""

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    assets = []

    # 1. Season Icons (128x128)
    season_icons = [
        {
            "name": "spring_icon.png",
            "prompt": "Hand-painted fantasy game icon of a delicate pink cherry blossom, warm pastel colors, clear silhouette, icon style, game UI asset, centered composition, soft glow, 128x128 pixels",
            "size": "256x256"
        },
        {
            "name": "summer_icon.png",
            "prompt": "Hand-painted fantasy game icon of a golden sun with green leaves around it, warm bright colors, clear silhouette, icon style, game UI asset, centered composition, radiant glow, 128x128 pixels",
            "size": "256x256"
        },
        {
            "name": "autumn_icon.png",
            "prompt": "Hand-painted fantasy game icon of a red-orange maple leaf, warm autumn colors, clear silhouette, icon style, game UI asset, centered composition, gentle glow, 128x128 pixels",
            "size": "256x256"
        },
        {
            "name": "winter_icon.png",
            "prompt": "Hand-painted fantasy game icon of an elegant snowflake, cool blue and white colors, clear silhouette, icon style, game UI asset, centered composition, icy sparkle, 128x128 pixels",
            "size": "256x256"
        }
    ]

    print("=== GENERATING SEASON ICONS ===\n")
    for icon in season_icons:
        path = os.path.join(OUTPUT_DIR, icon["name"])
        if generate_image(icon["prompt"], path, icon["size"]):
            assets.append(path)

    # 2. Resource Icons (64x64)
    resource_icons = [
        {
            "name": "wheat_icon.png",
            "prompt": "Hand-painted fantasy game icon of a golden wheat bundle tied with rope, warm golden yellow colors, clear silhouette, icon style, game UI asset, centered composition, 64x64 pixels",
            "size": "256x256"
        },
        {
            "name": "wood_icon.png",
            "prompt": "Hand-painted fantasy game icon of stacked wooden logs, rich brown colors, clear silhouette, icon style, game UI asset, centered composition, 64x64 pixels",
            "size": "256x256"
        },
        {
            "name": "card_icon.png",
            "prompt": "Hand-painted fantasy game icon of mystical playing cards with magical glow, purple and gold colors, clear silhouette, icon style, game UI asset, centered composition, ethereal sparkle, 64x64 pixels",
            "size": "256x256"
        }
    ]

    print("\n=== GENERATING RESOURCE ICONS ===\n")
    for icon in resource_icons:
        path = os.path.join(OUTPUT_DIR, icon["name"])
        if generate_image(icon["prompt"], path, icon["size"]):
            assets.append(path)

    # 3. Button Decorations
    button_decorations = [
        {
            "name": "craft_button_bg.png",
            "prompt": "Ornate fantasy game button background with gold trim and decorative corners, rectangular 256x64 pixels, rich brown wood texture with golden embellishments, medieval fantasy style, game UI element",
            "size": "256x256"
        },
        {
            "name": "action_button_template.png",
            "prompt": "Reusable fantasy game button template, rounded rectangle with elegant border, stone texture with golden highlights, medieval fantasy style, versatile game UI element, 200x60 pixels",
            "size": "256x256"
        }
    ]

    print("\n=== GENERATING BUTTON DECORATIONS ===\n")
    for decoration in button_decorations:
        path = os.path.join(OUTPUT_DIR, decoration["name"])
        if generate_image(decoration["prompt"], path, decoration["size"]):
            assets.append(path)

    # Print summary
    print("\n" + "="*60)
    print("GENERATION COMPLETE")
    print("="*60)
    print(f"\nGenerated {len(assets)} assets:\n")

    for asset_path in assets:
        size = os.path.getsize(asset_path)
        print(f"  • {asset_path} ({size:,} bytes)")

    print(f"\nAll assets saved to: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
