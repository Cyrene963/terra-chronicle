#!/usr/bin/env python3
"""把贴图预缩放到显示尺寸的 1.5 倍(=最高 devicePixelRatio),
   消除 GPU 大比例缩小采样导致的发糊与移动闪烁。
   源 512px 图保留在 _src512/,可随时重出。"""
import os, shutil
from PIL import Image
D="/root/terra-chronicle-game/assets/sprites"
SRC=D+"/_src512"; os.makedirs(SRC,exist_ok=True)
# 显示尺寸(同 main.js ASSETS) × 1.5
TARGET={
 "player_idle":110, "tree_oak":192, "tree_cherry":189, "rock":93, "bush":87,
 "house":348, "windmill":276, "fence":99, "crop":63,
 "tree_oak_winter":192, "tree_cherry_winter":189, "bush_winter":87, "house_winter":348,
}
TILES=["tile_grass","tile_soil","tile_water","tile_sand","tile_plot"]
for name,md in TARGET.items():
    p=f"{D}/{name}.png"
    if not os.path.exists(p): print("skip",name); continue
    src=f"{SRC}/{name}.png"
    if not os.path.exists(src): shutil.copy(p,src)
    im=Image.open(src).convert("RGBA")
    s=md/max(im.size)
    if s<1:
        im=im.resize((round(im.width*s),round(im.height*s)),Image.LANCZOS)
    im.save(p); print("resized",name,im.size)
for name in TILES:
    p=f"{D}/{name}.png"; src=f"{SRC}/{name}.png"
    if not os.path.exists(src): shutil.copy(p,src)
    im=Image.open(src).convert("RGB").resize((96,96),Image.LANCZOS)
    im.save(p); print("resized",name,(96,96))
print("RESIZE_DONE")
