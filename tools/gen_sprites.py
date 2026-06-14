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
  # Crop growth stages: 5 crops × 3 stages = 15 sprites
  ("wheat_seedling", "one tiny wheat seedling sprout with 2-3 thin green leaves just emerging from soil, very small, top-down view"),
  ("wheat_growing", "one medium-sized wheat plant with fuller green stalks and leaves, about half grown, top-down view"),
  ("wheat_mature", "one fully grown golden wheat plant with ripe grain heads bending gracefully, tall and complete, top-down view"),

  ("corn_seedling", "one tiny corn seedling sprout with 2-3 small pointed green leaves just emerging from soil, very small, top-down view"),
  ("corn_growing", "one medium-sized corn plant with broader green leaves and developing stalk, about half grown, top-down view"),
  ("corn_mature", "one fully grown tall corn plant with large leaves and golden corn cob visible, complete and ripe, top-down view"),

  ("tomato_seedling", "one tiny tomato seedling sprout with 2-3 small rounded green leaves just emerging from soil, very small, top-down view"),
  ("tomato_growing", "one medium-sized tomato plant with fuller green foliage and small yellow flowers, about half grown, top-down view"),
  ("tomato_mature", "one fully grown bushy tomato plant with lush green leaves and bright red ripe tomatoes visible, complete harvest-ready, top-down view"),

  ("rice_seedling", "one tiny rice seedling sprout with 2-3 thin blade-like green leaves just emerging from flooded soil, very small, top-down view"),
  ("rice_growing", "one medium-sized rice plant with fuller green grass-like stalks in shallow water, about half grown, top-down view"),
  ("rice_mature", "one fully grown golden rice plant with drooping grain panicles heavy with rice, tall and ready to harvest, top-down view"),

  ("magic_herb_seedling", "one tiny magical herb seedling with 2-3 small glowing leaves just emerging from soil, faint mystical sparkles, very small, top-down view"),
  ("magic_herb_growing", "one medium-sized magical herb plant with glowing foliage and gentle arcane shimmer, about half grown, top-down view"),
  ("magic_herb_mature", "one fully grown mystical herb plant with luminous leaves and bright magical aura, ethereal glow, complete and potent, top-down view"),
  ("water_serpent", "one blue serpent-like beast with flowing snake body and graceful fins, "
   "aquatic mystical creature, top-down three-quarter game view, full body visible"),
  ("fire_fox", "one orange fox beast with flames trailing from tail and paws, fiery mystical creature, "
   "top-down three-quarter game view, full body visible"),
  ("wind_bird", "one cyan bird beast with flowing wind trails and air currents around wings, "
   "aerial mystical creature, top-down three-quarter game view, full body visible"),
  ("earth_golem", "one brown rock golem beast made of stacked boulders and moss, sturdy elemental creature, "
   "top-down three-quarter game view, full body visible"),
  ("light_fairy", "one golden glowing fairy beast with luminous wings and radiant aura, "
   "ethereal mystical creature, top-down three-quarter game view, full body visible"),
  ("shadow_wolf", "one dark purple wolf beast with shadowy wisps trailing from fur, mysterious creature, "
   "top-down three-quarter game view, full body visible"),
  ("forest_deer", "one green antlered deer beast with leafy antlers and vine patterns, nature spirit creature, "
   "top-down three-quarter game view, full body visible"),
  ("thunder_cat", "one yellow electric cat beast with lightning sparks and crackling energy, "
   "storm mystical creature, top-down three-quarter game view, full body visible"),
  ("ice_bear", "one white crystalline bear beast with icy frost patterns and frozen spikes, "
   "glacial mystical creature, top-down three-quarter game view, full body visible"),
  ("magma_lizard", "one red lava lizard beast with molten patterns and volcanic glow, "
   "fire elemental creature, top-down three-quarter game view, full body visible"),
  ("ranch_building", "one wooden barn with rustic timber walls, sloped hay-covered roof, "
   "fenced yard with wooden posts around it, cozy livestock shelter, top-down three-quarter game view, whole building visible"),
  ("warehouse", "one large stone storage building with thick grey brick walls, reinforced wooden door, "
   "small barred windows, flat or low-pitched roof, sturdy merchant depot, top-down three-quarter game view, whole building visible"),
  ("alchemy_tower", "one mystical tower with spiraling stone architecture, glowing crystal orbs embedded in walls, "
   "arcane runes, pointed conical roof with magical aura, enchanted laboratory, top-down three-quarter game view, whole tower visible"),
  ("workshop", "one craftsman shed with wooden plank walls, sloped roof, open shutters showing tools inside, "
   "anvil or workbench visible, artisan workspace, top-down three-quarter game view, whole building visible"),
  ("well", "one stone water well with circular brick rim, wooden crossbeam with rope and bucket, "
   "moss growing on stones, village water source, top-down three-quarter game view, whole structure visible"),
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
  # Diagonal water-land transitions (eliminate stair-step jaggedness)
  ("water_diag_tl", "square tile 256x256, top-left corner is lush green grass, bottom-right corner is "
   "clear teal water, smooth diagonal transition line from top-right to bottom-left, soft natural shoreline "
   "with water lapping onto grass, painterly hand-painted style, viewed from directly above, seamless edges"),
  ("water_diag_tr", "square tile 256x256, top-right corner is lush green grass, bottom-left corner is "
   "clear teal water, smooth diagonal transition line from top-left to bottom-right, soft natural shoreline "
   "with water lapping onto grass, painterly hand-painted style, viewed from directly above, seamless edges"),
  ("water_diag_bl", "square tile 256x256, bottom-left corner is lush green grass, top-right corner is "
   "clear teal water, smooth diagonal transition line from top-left to bottom-right, soft natural shoreline "
   "with water lapping onto grass, painterly hand-painted style, viewed from directly above, seamless edges"),
  ("water_diag_br", "square tile 256x256, bottom-right corner is lush green grass, top-left corner is "
   "clear teal water, smooth diagonal transition line from top-right to bottom-left, soft natural shoreline "
   "with water lapping onto grass, painterly hand-painted style, viewed from directly above, seamless edges"),
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
