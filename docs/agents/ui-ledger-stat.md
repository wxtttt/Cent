# 记账页、账单卡与筛选

> 由根目录 `AGENTS.md` 拆分而来，属于功能级文档（渐进式披露）。先读 `AGENTS.md` 了解全局约定，改到本模块时再读本文；本模块有新口径 / 新规则时，同步更新 `AGENTS.md` 索引与本文。

## 记账页与账单卡
- **记账页字体 / 账单卡配色 / 票券星形（APK 1080×2340 逐点取样，round16）**：① 「明细记录」小标题 `text-base font-bold text-ink`（16px/700；原 15px medium 在 Windows 上 medium≡400 显细，APK 实测墨高 42 图像 px≈16px 粗体）；日头日期 `text-[15px] font-bold`（APK 墨高 39≈15px），星期/支收仍 `text-xs text-ink-secondary`。② **Money 小数与整数同字号同色**（`components/money` 的 decimal 不再 `text-[0.8em] opacity-70`）：APK 整数与小数墨高相同（各 40 图像 px）、核心色同为 #25c454，淡化/缩小是小数显「淡」的根因；账单金额整体 `text-xl`（20px，APK 数字帽高 40≈20px）。③ **分类插画底是中性浅灰圆**（`bg-icon-well`=#f4f4f5、`rounded-full`、`size-10`=40px，内 `CategoryIcon className="size-8"`），**不是品牌橙 `bg-brand/10` 也不是圆角方**；令牌 `--dp-color-icon-well` 暗色 #2a231c。④ 账单卡底 `#fffdf6`、卡间页面底 `#fbf7ef` 与 APK 一致（无需改）；卡描边 APK #ebe5d8 与令牌 rule 接近保持。⑤ **票券卡四角星是单颗凹边四角芒星**（`TicketCard` 内 `CornerStar` 内联 SVG，`text-ticket-star`=#ebc979、暗色 #8a744d），**不要用 lucide--sparkles 多星簇**；相对卡片位置实测：右上 10px 星 `right-3 top-[5px]`（中心距卡右≈17/卡顶≈10），左下 7px 星 `left-3 bottom-1.5`（中心距卡左≈16/卡底≈9），ledger/inventory/wealth/todo 共用。

## 统计卡的预算周期口径

- **标题与周期时间**：卡片标题「{归属月}月收支」后显示该期 `periodLabel`（如 `10/15 - 11/14`）；该期为过渡期时再跟一个「过渡」标签（`transition-tag`）。归属月取周期起始日所在月，不是自然月。
- **默认范围**：无筛选时统计「当前日所在记账周期」，优先读覆盖今天的普通预算记录冻结边界（与首页一致），回落 `periodContaining(now, clampStartDay(startDay))`。
- **筛选档位**：「本月 / 上月 / 其他月份」由 `resolveQuickTimeRange(filter, startDay, budgets)` 映射到**该月对应的那一期**（优先用已有预算记录的冻结边界），不是自然月 1 号到月末；自定义起止日按天原样生效。
- **自定义时间**：`fullPeriod = false`，卡片不显示周期时间标签，预算率栏显示「非完整周期」（`partial-period`）而不是百分比。
- **预算率与字号**：只累加「归属月等于当前周期起始月」且计入当前成员的预算总额，分配额度不参与总额；「未设置」用 11px 次要文字，普通百分比是 13px。

## 账单卡创建者显示

- 创建者名称先查 `infos.creators`、再查 `GlobalMeta.members`，最后才回落 `t("unknown-user")`；**不要写死字面量 `"unknown-user"`**（曾导致首页与记账页账单卡右下角出现一堆英文 key）。两种成员体系 ID 不保证一致，见 `docs/agents/domain-model.md`。
