# Terra Chronicle `card_slash_sprout_gameplay_v1` QA

## 结论

`assets/generated/composited-cards/card_slash_sprout_gameplay_v1.png` 可以作为 `battle.js` 战斗手牌改造的静态参考。

## 相比上一版改善

- 费用珠可读性明显提升
- 标题区独立，不再和费用珠互相打架
- 插画区更像内嵌窗口
- 描述区对比和排版更稳定
- 仍保留暖羊皮纸、青铜、植物、金色斩击的 Terra 感

## 尚需注意

- `ATTACK · EARTH` 类型行可再提高一点对比
- 标题区与插画区距离还可以略微拉开
- 实际接入 `battle.js` 时，不能直接全图当卡牌模板；应提炼成 CSS 结构和局部资产

## 下一步

在 `battle.js` 中参考该布局：
- 强化费用珠
- 独立标题条
- 更清晰的插画窗
- 更稳定的描述文本块
- 保持现有手牌尺寸下的可读性
