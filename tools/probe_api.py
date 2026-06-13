#!/usr/bin/env python3
"""探测 gpt-image-2 经此代理的真实能力: 各 quality/size/background 组合下
   实际返回的像素尺寸、色彩模式、是否带 alpha。决定资产管线上限。"""
import json, base64, io, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
API="https://ai.input.im/v1/images/generations"; KEY="20090603_WeHaveToBeinHKU"
def probe(label, body):
    try:
        req=urllib.request.Request(API,data=json.dumps(body).encode(),
            headers={"Authorization":"Bearer "+KEY,"Content-Type":"application/json"})
        with urllib.request.urlopen(req,timeout=420) as r: d=json.load(r)
        if "data" not in d: return f"{label}: ERR {str(d)[:160]}"
        raw=base64.b64decode(d["data"][0]["b64_json"])
        im=Image.open(io.BytesIO(raw))
        info=f"{label}: {im.size} mode={im.mode} bytes={len(raw)//1024}KB"
        if im.mode=="RGBA":
            a=im.getchannel("A").getextrema(); info+=f" alpha={a}"
        return info
    except Exception as e:
        return f"{label}: EXC {e}"
PROBES=[
 ("q=high 1024",   {"model":"gpt-image-2","prompt":"a single red apple, game sprite","size":"1024x1024","quality":"high","n":1}),
 ("q=high 1536",   {"model":"gpt-image-2","prompt":"a single red apple, game sprite","size":"1536x1024","quality":"high","n":1}),
 ("size 2048",     {"model":"gpt-image-2","prompt":"a single red apple, game sprite","size":"2048x2048","quality":"high","n":1}),
 ("q=high+transp", {"model":"gpt-image-2","prompt":"a single red apple, game sprite","size":"1024x1024","quality":"high","background":"transparent","n":1}),
 ("q=auto 1024",   {"model":"gpt-image-2","prompt":"a single red apple, game sprite","size":"1024x1024","quality":"auto","n":1}),
]
with ThreadPoolExecutor(max_workers=5) as ex:
    for r in ex.map(lambda p: probe(*p), PROBES): print(r, flush=True)
print("PROBE_DONE", flush=True)
