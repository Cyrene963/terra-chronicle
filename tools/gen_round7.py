import json,base64,io,os,time,urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageFilter
API="https://ai.input.im/v1/images/generations"; KEY="20090603_WeHaveToBeinHKU"
OUT="/root/terra-chronicle-game/assets/sprites"; SRC=OUT+"/_src512"; RAW=OUT+"/_raw"
for d in (OUT,SRC,RAW): os.makedirs(d,exist_ok=True)
SS=("hand-painted storybook game art, crisp clean brushwork, soft cel shading, Studio Ghibli warmth, "
    "masterpiece, sharp focus, no text, no watermark, no border")
MAG=("a single isolated game asset perfectly centered on a 100% flat uniform pure magenta background "
     "(RGB 255,0,255) filling the whole frame, subject not touching edges, no shadow, ")
ITEMS=[
 ("beast_fire","an adorable small fire spirit elemental, a cute round creature made of living warm "
  "flame and glowing embers, big friendly eyes, little flickering fire-wisp tail, orange-gold "
  "bioluminescence, floating, front view",448),
 ("incubator","a magical beast incubation altar: an ornate stone pedestal cradling a large glowing "
  "translucent egg-crystal with swirling teal life-energy inside, faint runes, soft particles, "
  "three-quarter top-down RPG game view",460),
 ("furnace","a cozy rustic blacksmith forge furnace, stone and brick with a glowing orange fire "
  "inside and a small chimney, anvil beside it, three-quarter top-down RPG game view",430),
]
def call(p,tries=3):
    body=json.dumps({"model":"gpt-image-2","prompt":p,"size":"1024x1024","quality":"high","n":1}).encode()
    for i in range(tries):
        try:
            req=urllib.request.Request(API,data=body,headers={"Authorization":"Bearer "+KEY,"Content-Type":"application/json"})
            with urllib.request.urlopen(req,timeout=460) as r: return base64.b64decode(json.load(r)["data"][0]["b64_json"])
        except Exception as e: print("retry",i,e,flush=True); time.sleep(8)
    raise RuntimeError("fail")
def run(it):
    name,prompt,mx=it; raw=call(MAG+prompt+", "+SS); open(f"{RAW}/{name}.png","wb").write(raw)
    im=Image.open(io.BytesIO(raw)).convert("RGBA"); px=im.load(); w,h=im.size
    cs=[px[3,3],px[w-4,3],px[3,h-4],px[w-4,h-4]]; br=sum(c[0] for c in cs)//4; bg=sum(c[1] for c in cs)//4; bb=sum(c[2] for c in cs)//4
    for y in range(h):
        for x in range(w):
            r,g,b,a=px[x,y]
            if (r-br)**2+(g-bg)**2+(b-bb)**2<100*100: px[x,y]=(0,0,0,0)
            elif r>g+35 and b>g+35: m=min(r,b); px[x,y]=(min(r,m+(r-m)//2),g,min(b,m+(b-m)//2),a)
    im.putalpha(im.getchannel("A").filter(ImageFilter.MinFilter(3)))
    im=im.crop(im.getbbox()); pad=Image.new("RGBA",(im.width+12,im.height+12),(0,0,0,0)); pad.paste(im,(6,6))
    if max(pad.size)>mx: s=mx/max(pad.size); pad=pad.resize((round(pad.width*s),round(pad.height*s)),Image.LANCZOS)
    pad.save(f"{OUT}/{name}.png"); pad.save(f"{SRC}/{name}.png"); print("OK",name,pad.size,flush=True)
with ThreadPoolExecutor(max_workers=3) as ex:
    for f in [ex.submit(run,i) for i in ITEMS]:
        try: f.result()
        except Exception as e: print("FAIL",e,flush=True)
print("ROUND7_DONE",flush=True)
