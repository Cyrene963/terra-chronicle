# Terra Chronicle 美术资产制作入口

这是 Terra Chronicle 后续所有怪物、卡牌、宠物、农作物、材料、UI 资产工作的入口文件。

## 1. 必读顺序

1. `docs/unified-art-design-spec.md`
   - 总体美术母版
   - 定义 Terra 的统一审美、材质、色彩、禁止项

2. `docs/asset-master-list.md`
   - 全量资产总表
   - 定义哪些资产需要统一，优先级是什么

3. `docs/first-wave-asset-families.md`
   - 首发资产家族
   - 定义最先做的卡牌、怪物、灵兽、作物、UI 母版

4. `docs/first-wave-visual-briefs.md`
   - 首发视觉 brief
   - 定义每个首发资产的目标、关键词、构成与禁用项

5. `docs/first-wave-generation-prompts.md`
   - 首发生成提示词
   - 可直接用于生成参考图或概念草图

6. `docs/first-wave-production-breakdown.md`
   - 首发制作分镜
   - 定义首发资产的结构分层和制作顺序

7. `docs/second-wave-asset-families.md`
   - 第二批资产家族
   - 补齐地城节点、状态图标、根茎作物、菌群怪物、火系灵兽、基础材料

8. `docs/second-wave-visual-prompts.md`
   - 第二批视觉 brief 与生成提示词
   - 可直接用于第二批资产候选生成

## 2. 实际制作顺序

### 第一阶段
1. `ui_card_frame_terra`
2. `card_slash_sprout`
3. `monster_root_worm`
4. `beast_spring_drop`
5. `crop_star_wheat`

### 第二阶段
1. `ui_dungeon_node_combat`
2. `status_shield`
3. `crop_moon_turnip`
4. `monster_spore_gnarl`
5. `beast_forge_ember`
6. `material_wood_raw`

## 3. 工作规则

- 先统一母版，再生成候选。
- 先小批量 reference board，再批量扩展。
- 先做能回流到游戏核心体验的资产。
- 任何新资产都必须能解释它属于哪个 Terra 家族。
- 不允许生成一堆风格不一致的漂亮图再硬塞进游戏。

## 4. 当前最推荐继续做的事

下一步最有价值的是生成第一阶段 5 个资产的 reference board，然后选出统一方向，再进入游戏落地。

如果要继续推进，不需要重新讨论路线，直接从 `ui_card_frame_terra` 开始。
