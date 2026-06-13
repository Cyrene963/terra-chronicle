#!/usr/bin/env python3
"""批量生成游戏贴图: gpt-image-2 → 品红色键抠图 → 裁切缩放 → assets/sprites/"""
import json, base64, io, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

API = "https://ai.input.im/v1/images/generations"
KEY = "20090603_WeHaveToBeinHKU"
OUT = "/root/terra-chronicle-game/assets/sprites"
RAW = "/root/terra-chronicle-game/assets/sprites/_raw"
os.makedirs(OUT, exist_ok=True); os.makedirs(RAW, exist_ok=True)

STYLE = ("hand-painted storybook game art, soft watercolor texture with clean shapes, "
         "Studio Ghibli warmth, rich color, gentle painterly shading, masterpiece quality, "
         "no text, no watermark, no border")
MAGENTA = ("single isolated game sprite centered, displayed on a perfectly flat solid pure "
           "magenta background (#FF00FF), the magenta covers the entire background evenly, "
           "no shadow cast on the background, ")

SPRITES = [
  ("player_idle", "cute small farmer adventurer character, front three-quarter view standing, "
   "wide straw hat, cream linen tunic, dark boots, friendly dot eyes, Don't Starve-like charming "
   "paper-doll proportion but soft and warm, full body visible"),
  ("tree_oak", "one lush deciduous oak tree, round layered canopy, sturdy trunk, top-down "
   "three-quarter game view, whole tree visible"),
  ("tree_cherry", "one blooming cherry blossom tree full of pink petals, elegant dark trunk, "
   "top-down three-quarter game view, whole tree visible"),
  ("rock", "one mossy grey boulder with subtle cracks and a patch of moss, top-down three-quarter game view"),
  ("bush", "one round leafy green bush with a few small red berries, top-down three-quarter game view"),
  ("house", "one cozy small farmhouse, white plaster walls with timber frame, warm terracotta "
   "tiled roof, wooden door, two small windows, chimney, top-down three-quarter game view, whole building visible"),
  ("windmill", "one tall rustic wooden windmill with four canvas blades, stone base, top-down "
   "three-quarter game view, whole structure visible"),
  ("fence", "one short rustic wooden fence segment with two posts and two horizontal rails, "
   "top-down three-quarter game view"),
  ("crop", "one young green wheat crop sprout cluster with a few leaves, top-down three-quarter game view"),
]
TILES = [
  ("tile_grass", "seamless tileable texture of lush painterly meadow grass viewed directly from above, "
   "subtle blade clusters and tiny flowers, even lighting, no border, edges must tile perfectly"),
  ("tile_soil", "seamless tileable texture of packed earthen dirt path viewed directly from above, "
   "subtle pebbles, even lighting, edges must tile perfectly"),
  ("tile_water", "seamless tileable texture of clear teal river water viewed directly from above, "
   "gentle painterly ripples and sparkles, even lighting, edges must tile perfectly"),
  ("tile_sand", "seamless tileable texture of warm sandy ground with wooden plank hints viewed "
   "directly from above, even lighting, edges must tile perfectly"),
  ("tile_plot", "seamless tileable texture of freshly tilled dark farm soil with neat furrow rows "
   "viewed directly from above, even lighting, edges must tile perfectly"),
]

def call_api(prompt, size="1024x1024", tries=3):
    # 实测: 此代理 size>1536 不被采纳(square 上限 ~1254);quality=high 是真实可用的最高档。
    body = json.dumps({"model":"gpt-image-2","prompt":prompt,"size":size,
                       "quality":"high","n":1}).encode()
    for i in range(tries):
        try:
            req = urllib.request.Request(API, data=body, headers={
                "Authorization":"Bearer "+KEY,"Content-Type":"application/json"})
            with urllib.request.urlopen(req, timeout=460) as r:
                d = json.load(r)
            return base64.b64decode(d["data"][0]["b64_json"])
        except Exception as e:
            print(f"  retry {i+1} after error: {e}", flush=True)
            time.sleep(8)
    raise RuntimeError("api failed")

def chroma_key(im, thr=100):
    """去品红背景: 角点采样背景基色 + 全局色距 + 去边缘溢色 + 1px alpha 腐蚀去毛边"""
    from PIL import ImageFilter
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

def trim_pad(im, pad=6):
    bbox = im.getbbox()
    if not bbox: return im
    im = im.crop(bbox)
    out = Image.new("RGBA",(im.width+pad*2, im.height+pad*2),(0,0,0,0))
    out.paste(im,(pad,pad)); return out

def gen_sprite(item):
    name, desc = item
    t0=time.time()
    raw = call_api(MAGENTA + desc + ", " + STYLE)
    open(f"{RAW}/{name}.png","wb").write(raw)
    im = Image.open(io.BytesIO(raw))
    im = chroma_key(im); im = trim_pad(im)
    if max(im.size)>512:
        s=512/max(im.size); im=im.resize((int(im.width*s),int(im.height*s)),Image.LANCZOS)
    im.save(f"{OUT}/{name}.png")
    print(f"OK sprite {name} {im.size} {time.time()-t0:.0f}s", flush=True)

def gen_tile(item):
    name, desc = item
    t0=time.time()
    raw = call_api(desc + ", " + STYLE)
    open(f"{RAW}/{name}.png","wb").write(raw)
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    im = im.resize((256,256), Image.LANCZOS)
    im.save(f"{OUT}/{name}.png")
    print(f"OK tile {name} {time.time()-t0:.0f}s", flush=True)

with ThreadPoolExecutor(max_workers=4) as ex:
    futs=[ex.submit(gen_sprite,s) for s in SPRITES]+[ex.submit(gen_tile,t) for t in TILES]
    for f in futs: f.result()
print("ALL_SPRITES_DONE", flush=True)
