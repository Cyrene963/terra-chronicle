#!/usr/bin/env python3
"""第六轮资产: 扁平手绘地表 + 季节变体 + 风车拆分 + 地城/敌人。
   工艺: 精灵走品红色键(角点采样+1px腐蚀); 瓦片为 RGB 无缝(扁平风自然无缝)。"""
import json, base64, io, os, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageFilter
API="https://ai.input.im/v1/images/generations"; KEY="20090603_WeHaveToBeinHKU"
OUT="/root/terra-chronicle-game/assets/sprites"; SRC=OUT+"/_src512"; RAW=OUT+"/_raw"
for d in (OUT,SRC,RAW): os.makedirs(d,exist_ok=True)

# 扁平手绘地表风格(关键:大色块、柔和、无细碎草丝噪点)
FLAT=("flat cel-shaded stylized game ground texture, large soft color blocks with simple gentle "
      "cel shadows, smooth clean minimal, NO fine grass blades, NO high-frequency noise, NO photo "
      "detail, painterly Stardew-Valley / Genshin stylized look, seamless tileable, top-down flat lay, even lighting")
SPRITE_STYLE=("hand-painted storybook game art, crisp clean confident brushwork, soft cel shading, "
              "Studio Ghibli warmth, masterpiece, sharp focus, no text, no watermark, no border")
MAG=("a single isolated game asset perfectly centered on a 100% flat uniform pure magenta "
     "background (RGB 255,0,255) filling the whole frame, subject not touching edges, no shadow, ")

TILES=[  # (name, prompt) → RGB 256
 ("tile_grass","lush summer meadow grass, soft warm green, "+FLAT),
 ("tile_soil","tilled dark brown farm soil, gentle furrow hints, "+FLAT),
 ("tile_sand","warm sandy path ground, soft tan, "+FLAT),
 ("tile_water","calm stylized water, soft teal-blue with very subtle smooth ripple bands, glossy, "+FLAT),
 ("grass_spring","fresh spring grass, light tender green with a few tiny soft wildflowers (white pink yellow), "+FLAT),
 ("grass_autumn","autumn grass, warm golden amber and tan tones, gentle dry-grass feel, "+FLAT),
]
SPRITES=[ # (name, prompt, maxlong) → RGBA keyed
 ("tree_oak_autumn","one oak tree in full autumn, canopy of golden yellow orange and red maple-like "
  "leaves, sturdy trunk, three-quarter top-down RPG game view, whole tree in frame",512),
 ("tree_cherry_autumn","one cherry tree in autumn, deep crimson and dark orange foliage, some bare "
  "branches, graceful dark trunk, three-quarter top-down RPG game view, whole tree in frame",512),
 ("windmill_base","a rustic wooden windmill tower WITHOUT any blades or sails, just the conical "
  "wood-and-stone tower body with a small door and the empty front hub, three-quarter top-down game view",420),
 ("windmill_blades","four-blade windmill sail cross, cream canvas sails on slim wooden cross frame, "
  "viewed flat head-on, centered, symmetric, nothing else",420),
 ("portal","an ancient mysterious stone portal gateway standing on the ground, weathered runic arch "
  "with a swirling glowing teal-violet void inside, faint magic particles, three-quarter top-down RPG game view",460),
 ("enemy_blight","a corrupted blighted wood-spirit monster, a hunched gnarled dark-bark creature with "
  "glowing sickly purple cracks and angry eyes, dripping ooze, menacing but stylized, front view full body",512),
]
def call(prompt, tries=3):
    body=json.dumps({"model":"gpt-image-2","prompt":prompt,"size":"1024x1024","quality":"high","n":1}).encode()
    for i in range(tries):
        try:
            req=urllib.request.Request(API,data=body,headers={"Authorization":"Bearer "+KEY,"Content-Type":"application/json"})
            with urllib.request.urlopen(req,timeout=460) as r: return base64.b64decode(json.load(r)["data"][0]["b64_json"])
        except Exception as e: print("  retry",i,e,flush=True); time.sleep(8)
    raise RuntimeError("fail")
def gen_tile(item):
    name,prompt=item; raw=call(prompt); open(f"{RAW}/{name}.png","wb").write(raw)
    im=Image.open(io.BytesIO(raw)).convert("RGB").resize((256,256),Image.LANCZOS)
    im=im.filter(ImageFilter.GaussianBlur(0.4))           # 轻微柔化,再杀一层高频
    im.save(f"{OUT}/{name}.png"); im.save(f"{SRC}/{name}.png"); print("OK tile",name,flush=True)
def gen_sprite(item):
    name,prompt,maxlong=item; raw=call(MAG+prompt+", "+SPRITE_STYLE); open(f"{RAW}/{name}.png","wb").write(raw)
    im=Image.open(io.BytesIO(raw)).convert("RGBA"); px=im.load(); w,h=im.size
    cs=[px[3,3],px[w-4,3],px[3,h-4],px[w-4,h-4]]; br=sum(c[0] for c in cs)//4; bg=sum(c[1] for c in cs)//4; bb=sum(c[2] for c in cs)//4
    for y in range(h):
        for x in range(w):
            r,g,b,a=px[x,y]
            if (r-br)**2+(g-bg)**2+(b-bb)**2<100*100: px[x,y]=(0,0,0,0)
            elif r>g+35 and b>g+35: m=min(r,b); px[x,y]=(min(r,m+(r-m)//2),g,min(b,m+(b-m)//2),a)
    im.putalpha(im.getchannel("A").filter(ImageFilter.MinFilter(3)))
    im=im.crop(im.getbbox()); pad=Image.new("RGBA",(im.width+12,im.height+12),(0,0,0,0)); pad.paste(im,(6,6))
    if max(pad.size)>maxlong: s=maxlong/max(pad.size); pad=pad.resize((round(pad.width*s),round(pad.height*s)),Image.LANCZOS)
    pad.save(f"{OUT}/{name}.png"); pad.save(f"{SRC}/{name}.png"); print("OK sprite",name,pad.size,flush=True)
with ThreadPoolExecutor(max_workers=4) as ex:
    futs=[ex.submit(gen_tile,t) for t in TILES]+[ex.submit(gen_sprite,s) for s in SPRITES]
    for f in futs:
        try: f.result()
        except Exception as e: print("FAIL",e,flush=True)
print("ROUND6_DONE",flush=True)
