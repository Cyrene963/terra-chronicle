#!/usr/bin/env python3
"""
生成序列帧动画 Spritesheet (4帧或8帧水平排列)
用 gpt-image-2 生成,然后引擎用 PIXI.AnimatedSprite 播放
"""
import requests, json, sys, time
from PIL import Image, ImageFilter
import io

API_BASE = "https://ai.input.im"
API_KEY = "20090603_WeHaveToBeinHKU"

def call_api(prompt, size="1024x1024", quality="high", steps=30):
    """调用 gpt-image-2 生成图像"""
    url = f"{API_BASE}/v1/images/generations"
    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "gpt-image-2",
        "prompt": prompt,
        "n": 1,
        "size": size,
        "quality": quality,
        "steps": steps
    }
    print(f"[API] {prompt[:80]}... size={size} quality={quality}")
    resp = requests.post(url, headers=headers, json=payload, timeout=120)
    if resp.status_code != 200:
        print(f"[ERROR] {resp.status_code}: {resp.text}")
        return None
    data = resp.json()
    if "data" not in data or not data["data"]:
        print(f"[ERROR] No image returned: {data}")
        return None
    img_url = data["data"][0]["url"]
    print(f"[OK] Got image URL")
    return img_url

def download_image(url):
    """下载图像到 PIL.Image"""
    resp = requests.get(url, timeout=60)
    if resp.status_code != 200:
        print(f"[ERROR] Download failed: {resp.status_code}")
        return None
    return Image.open(io.BytesIO(resp.content))

def chroma_key(im, thr=100):
    """去品红背景: 角点采样背景基色 + 全局色距 + 去边缘溢色 + 1px alpha 腐蚀去毛边"""
    im = im.convert("RGBA"); px = im.load(); w,h = im.size
    cs=[px[3,3],px[w-4,3],px[3,h-4],px[w-4,h-4]]
    br=sum(c[0] for c in cs)//4; bg=sum(c[1] for c in cs)//4; bb=sum(c[2] for c in cs)//4
    for y in range(h):
        for x in range(w):
            r,g,b,a = px[x,y]
            if (r-br)**2 + (g-bg)**2 + (b-bb)**2 < thr*thr: px[x,y]=(0,0,0,0)
            elif r>g+35 and b>g+35:                      # 半透明边缘去品红溢色
                m=min(r,b); px[x,y]=(min(r,m+(r-m)//2), g, min(b,m+(b-m)//2), a)
    im.putalpha(im.getchannel("A").filter(ImageFilter.MinFilter(3)))  # 吃掉残留半透明毛边
    return im

def generate_spritesheet(name, prompt, frames=4, frame_size=64, output_path=None):
    """
    生成序列帧 Spritesheet
    frames: 帧数 (4 or 8)
    frame_size: 单帧尺寸 (64x64 或 128x128)
    """
    # 构造水平序列提示词 - 使用品红背景以便抠图
    full_prompt = f"{prompt}. Show {frames} animation frames in a horizontal sequence from left to right, each frame {frame_size}x{frame_size} pixels, no gaps, perfectly flat solid pure magenta background (#FF00FF), the magenta covers the entire background evenly, no shadow cast on the background, hand-painted storybook game art, soft watercolor texture with clean shapes, Studio Ghibli warmth, rich color, gentle painterly shading, masterpiece quality, consistent character across all frames"

    # 计算总尺寸 (水平排列)
    total_width = frame_size * frames
    size_str = f"{total_width}x{frame_size}"

    # API 上限检查
    if total_width > 1254 or frame_size > 1254:
        print(f"[WARN] Size {size_str} may exceed API limit, clamping to 1024x{frame_size}")
        size_str = f"1024x{frame_size}"

    img_url = call_api(full_prompt, size=size_str, quality="high")
    if not img_url:
        return False

    img = download_image(img_url)
    if not img:
        return False

    # 应用品红色抠图
    print(f"[CHROMA] Removing magenta background...")
    img = chroma_key(img)

    # 保存
    if not output_path:
        output_path = f"assets/sprites/{name}_sheet.png"
    img.save(output_path, "PNG")
    print(f"[SAVED] {output_path} ({img.size[0]}x{img.size[1]})")
    return True

if __name__ == "__main__":
    # 生成主要角色和灵兽的行走序列帧

    # 1. 主角行走 (4帧, 侧面行走循环)
    generate_spritesheet(
        "player_walk",
        "A young farmer character walking cycle, side view, carrying a wooden hoe, straw hat, simple linen clothes, pastoral painterly style",
        frames=4,
        frame_size=64,
        output_path="assets/sprites/player_walk_sheet.png"
    )
    time.sleep(2)

    # 2. 水灵兽行走 (4帧, 可爱水滴生物)
    generate_spritesheet(
        "beast_water_walk",
        "A cute water spirit creature walking cycle, translucent blue body with water droplets, round friendly face, flowing water trail, painterly fantasy style",
        frames=4,
        frame_size=64,
        output_path="assets/sprites/beast_water_walk_sheet.png"
    )
    time.sleep(2)

    # 3. 火灵兽行走 (4帧, 火焰精灵)
    generate_spritesheet(
        "beast_fire_walk",
        "A fire spirit creature walking cycle, orange-red flame body with ember particles, warm glow, playful expression, painterly fantasy style",
        frames=4,
        frame_size=64,
        output_path="assets/sprites/beast_fire_walk_sheet.png"
    )

    print("\n[DONE] All animation spritesheets generated!")
    print("Next: Update main.js to parse these with PIXI.AnimatedSprite")
