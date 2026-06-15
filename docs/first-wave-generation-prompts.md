# Terra Chronicle 首发生成提示词包

这份文档是给绘制、生成、概念迭代直接使用的提示词基底。它尽量让每个资产一次就接近 Terra 风格，而不是生成一堆不统一的图再挑。

## 使用方式

1. 先使用 `docs/unified-art-design-spec.md` 作为总规则。
2. 再用本文件的首发提示词生成图或草图。
3. 如果结果风格不一致，先修母版，不要单独修某一张图。
4. 首发图只允许在统一体系内微调，不允许偏离 Terra 母题。

## 1. `ui_card_frame_terra`

### 主提示词
A premium fantasy card frame for Terra Chronicle, warm parchment and leather material, bronze metal corners, subtle worn edges, elegant serif typography zones, centered illustration window, left-top energy orb slot, artisanal handcrafted feeling, refined game UI, warm golden accents, moss green and土黄 details, high-end commercial card game UI, clean readable layout, no neon, no plastic, no sci-fi, no clutter.

### 约束词
- parchment texture
- bronze trim
- leather binding
- old paper edges
- premium UI frame
- clear title area
- clear description area
- icon-friendly composition

### 负面词
- neon
- plastic
- cyberpunk
- flat generic frame
- messy decoration
- anime sticker look

## 2. `card_slash_sprout`

### 主提示词
A Terra Chronicle attack card that combines a fresh sprout, plant growth, and a curved blade slash, like a living agricultural weapon. Warm parchment card base, bronze border, moss green and warm gold palette, a sprouting plant split by a clean crescent blade in the center, elegant serif title, copper cost orb in the top-left corner, premium fantasy card design, handcrafted game artifact, clear attack readability, not mechanical, not sci-fi, not overcomplicated.

### 约束词
- sprout
- curved slash
- plant growth
- bronze border
- parchment base
- moss green accents
- warm gold highlight

### 负面词
- sci-fi blade
- neon glow
- abstract blob
- unreadable composition
- over-rendered weapon art

## 3. `monster_root_worm`

### 主提示词
A Terra Chronicle polluted root worm monster, a long twisted body that feels half root and half worm, emerging from soil corruption, with root-horn head details, cracked mouth or spore eyes, earthy mud, wood, moss, fungal membrane textures, dark purple pollution accents, not a generic insect, not a skeleton, not a demon, clearly born from corrupted roots and soil ecology, premium fantasy monster design, readable silhouette, threatening but not gory.

### 约束词
- root creature
- worm-like body
- soil corruption
- moss and fungal texture
- earthy palette
- distinct head silhouette
- eco-pollution monster

### 负面词
- pure insect
- pure demon
- skeleton
- blood gore
- sci-fi monster

## 4. `beast_spring_drop`

### 主提示词
A Terra Chronicle water spirit beast, small and friendly, like a spring droplet guardian that helps farm irrigation and moisture control. Tiny elegant silhouette, droplet body, leaf-like fins or tail, transparent crystal water feel, bright eyes, calm and helpful expression, pale blue, soft green and crystal white palette, premium fantasy pet design, functional and cute, not childish, not a fish, not a generic water elemental.

### 约束词
- water spirit beast
- droplet body
- leaf fins
- crystal white
- pale blue
- gentle expression
- farm helper

### 负面词
- fish
- generic elemental
- baby mascot
- overly childish
- flat toy style

## 5. `crop_star_wheat`

### 主提示词
A Terra Chronicle staple crop called star wheat, a fantasy grain crop with strong harvest appeal, golden ears with subtle star-like sparkle, visible seedling and mature stages, warm gold and grass green palette, earthy soil connection, clean silhouette, premium game crop design, highly readable, suitable for farm UI and alchemy ingredients, not a generic stock wheat illustration, not too realistic, not too cartoonish.

### 约束词
- grain crop
- star-like sparkle
- harvest appeal
- seedling stage
- mature golden ears
- fantasy agriculture
- Terra staple crop

### 负面词
- stock photo wheat
- hyperreal agriculture photo
- toy-like cartoon crop
- generic grain icon

## 6. 统一批量提示补充

当后续生成同家族资产时，统一附加以下母题词：
- Terra Chronicle
- warm fantasy
- parchment and bronze
- earth and growth
- premium game art
- handcrafted but clean
- coherent with existing UI

如果要做污染系资产，再加：
- purple corruption accents
- cracked soil
- fungal spores
- ecological imbalance

如果要做农场系资产，再加：
- soil fertility
- seasonal growth
- harvest warmth
- living agriculture

## 7. 结论

这份提示词包的目标不是替代设计，而是把首发资产的生成口径固定下来。以后任何新图，都先从这里出发，再根据家族调整细节。
