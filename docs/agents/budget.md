# 预算与标签

> 由根目录 `AGENTS.md` 拆分而来的功能级文档（渐进式披露）。改预算周期、预算页、月度预算抽屉、标签口径前读本文；改完同步更新 `AGENTS.md` 索引与本文。设计稿 / ADR / 验收记录是历史存档，不更新。

## 代码位置

| 文件 | 职责 |
| --- | --- |
| `src/ledger/extra-type.ts` / `type.ts` | `Budget`（`kind: "normal" \| "special"`、`periodStart/periodEnd`、`joiners`、`totalBudget`、`categoriesBudget`、`tagIds`、`repeatMonthly`、`isTransition`）、`BillTag.kind`、`GlobalMeta.members` / `budgets` / `budgetStartDay` / `tags` |
| `src/components/budget/period.ts` | 周期锚点与边界：`anchorFor` / `periodFrom` / `periodContaining` / `periodForMonth` / `firstAnchorAfter` / `periodMonthKey` / `periodLabel` |
| `src/hooks/use-budget.ts` | 记录链的补齐（`ensureCurrentBudgets`）、起始日变更（`setStartDay`）、CRUD |
| `src/components/budget/util.ts` | `budgetTotal` / `budgetRange` / `budgetEncountered`（互斥计账、父吃子、孤儿回落） |
| `src/components/budget/list.tsx` / `sheet.tsx` | 预算页单卡周期视图、底部抽屉（月度预算 / 起始日 / 成员 / 特殊预算）、`SheetRow` / `AmountRows` 行基元与五个 Provider 的挂载点 |
| `src/components/budget/amount-input.tsx` | 共享金额输入：无框、灰色 0 占位、`¥` 后置、黑色数字、聚焦全选、失焦千分位 |
| `src/components/budget/allocation-sheet.tsx` | 「详细分配」独立抽屉：居中标题、**智能分配在分类卡片外面**、无上限提示块、状态栏文字全黑只让 ¥金额 染橙的轻量汇总、黑色主信息（分类名 / 金额 / 按钮符号）、分类名固定成列 + 金额列右移到中线略左 + 两段空白托住且按钮全在右、`+N` 微反馈精确飘在金额正上方、短按 ±50 / 长按 50→100→500、细滑动条 + 吸附整百 + 点击轨道跳转 + **恒橙**端点对齐纯数字 + 覆盖 0%/100% 的 10 个空心圆刻度、单项 `[0, 总额]` 自由改 + 超额时确认禁用 |
| `src/components/button-styles.ts` | 弹层按钮共享样式：`BTN_BASE`（48px / 15px 主操作）、`SHEET_FOOTER`（统一底部操作栏，含 iOS 安全区）、`BTN_PRIMARY` / `BTN_SECONDARY` / `BTN_DANGER`（可点/禁用双态）、`BTN_TAP`（28px 圆形图标钮，黑色图标、无禁用态）、`BTN_COMPACT`（黑色文字）、`PRESSABLE_ROW` |
| `src/components/name-dialog.tsx` / `option-sheet.tsx` / `delete-confirm.tsx` | 共享弹层工厂：改名抽屉 / 多选选项抽屉 / 删除二次确认；分类管理与预算共用 |
| `src/locale/lang/{zh,en}.json` | 文案（两套语言包必须同步，UTF-8 读写） |

## 领域口径（当前实现）

- **普通预算 / 特殊预算、普通标签 / 特殊标签**：同一笔支出互斥，不双计；带特殊标签且该期存在对应特殊预算时只进特殊预算，否则回落普通预算；父分类吃子分类。自定义标签组已删除。
- **总额口径**：`budgetTotal = totalBudget`。「分配预算」（旧称「分类预算」）只是普通预算内部的分项上限，**不累加进总额**；但记账时这些账单支出仍照常累加进普通预算的已支出。界面上主卡行标签统一叫「详细分配」（`detailed-allocation`），抽屉标题同名；数据字段仍叫 `categoriesBudget`，不要因为改文案去动领域字段。
- **月度记录链**：每条预算记录自带冻结的 `periodStart/periodEnd`，起始日为 1–31（无该日的月份取当月最后一天）。`joiners: []` 表示全部成员（含以后新增的）。
- **归属月**：`periodMonthKey(periodStart)`，即周期起始日所在年月，不是自然月。
- **分项额度的编辑上限**（2026-11-14 r20 定稿，取代 r15 的动态封顶）：`capOf() = total`，单项范围固定 **[0, 预算金额]**，所有入口（金额输入 / 滑动条 / ± / 长按 / 智能分配）共用，最大值就是预算金额、最小值 0。中途**允许合计超额**（状态栏标红「已超额 ¥N」），但底部确认按钮 `disabled={over > 0}` 直接置灰，**不弹 toast / 二次确认等任何拦截**——用户明确「超出预算无法确认就行」。这样超额状态下每个单项仍能改回去，不再出现「一旦超额下面一个都改不动」。到单项边界依旧「不加不减」。记账口径不变：分项额度只是预算内部上限，各分类支出仍只累加进总预算一次。

## 起始日生效规则（2026-11-13 定稿）

**从「今天之后的第一个匹配日」立即生效，不是下月生效，也不是当前记录结束才生效。**

例：10/1 把起始日从 1 改成 15：

| 区间 | 归属 | 说明 |
| --- | --- | --- |
| 10/1–10/14 | 9 月期 | 并入 9 月预算，过渡期 `[9/15, 10/14]`，`isTransition: true` |
| 10/15–11/14 | 10 月期 | 新的 10 月预算，立即建好可在预算页切换 |

`setStartDay()` 的实现要点：

1. `periodContaining(now, nextDay)` 得到过渡期；`firstAnchorAfter(now, nextDay)` 得到下一个匹配日，用 `periodFrom` 建下一期。
2. 过渡期沿用当前生效预算的设置（每类预算取覆盖今天的一条，否则取最新一条），标记 `isTransition`。
3. 早于过渡期的历史记录保留，跨进过渡期的裁剪到「过渡期前一天」，避免两条记录重叠。
4. 下一期只延续普通预算与「每月重复」的特殊预算；一次性特殊预算不复制。
5. `list.tsx` 的 `openStartDay` 在 `setStartDay` 后调用 `ensureCurrentBudgets()` 补齐链条。

## 起始日周期预览（2026-11-14 r22 定稿）

`StartDayForm` **无论是否改动都要显示信息**：默认态直接给出当前周期，选中新日期后即时预演生效周期与过渡期。提示与落库共用 `period.ts` 的锚点算法，不能另写一套日期推算：

- 「当前周期」优先取账本里覆盖今天的普通预算记录 `periodStart/periodEnd`（冻结边界），无记录才回落 `periodContaining(now, edit.value)`；`current.isTransition` 决定默认态下半显示「当前为过渡周期」还是「无过渡期」。
- `effective = firstAnchorAfter(now, value)` → 生效日；`periodFrom(effective, value)` → 新预算周期区间（副标题仍用 `periodLabel` 的 `M/D - M/D`）。
- 上期归属月 = `periodContaining(now, value)` 的 `tStart` 年月（不是自然月，也不是 `effective` 所在月），用 `start-day-month-cn` 格式化。
- **过渡期 = 当前周期起始 → `effective - 1 天`**（不是 `now.startOf("day")` 起算）：11/14 把 1 号改成 15 号时显示「11月1日 - 11月14日」；`hasGap` 为假时显示「无过渡期」。

- **排版（r22 定稿）**：橙框分**上下两段 + 一条极淡分隔线**（`my-2.5 h-px bg-ink-secondary/15`）。上半主标题「生效日：{日期}」15px 加粗 + 副标题「新预算周期：M/D - M/D」11px 浅灰；下半主标题「过渡期：{起} - {止}」14px 加粗 + 副标题「此期间花费将计入上期（X月）预算」11px 浅灰。默认态同结构：「当前周期：{起} - {止}」+「起始日：每月 N 日」/「无过渡期」+「本期按完整周期结算」。**主标题 `text-ink`、副标题 `text-ink-secondary`、日期 `tabular-nums`**。
- **高亮联动（r22）**：主标题里与日历选中项对应的日期用 `text-brand` 橘色——选中态是生效日「11月15日」，默认态是当前周期起始「11月1日」；实测 `rgb(255,132,53)` 与日历 `button.bg-brand` 背景色完全一致。
- 语言键：`start-day-date-cn` / `start-day-month-cn` / `start-day-current-title` / `start-day-current-note` / `start-day-effective-title` / `start-day-new-period-note` / `start-day-transition-title` / `start-day-transition-note` / `start-day-no-transition` / `start-day-no-transition-note` / `start-day-transition-active` / `start-day-transition-active-note`。r20 的 `*-hint` / `*-period` / `start-day-note`、r21 的 `*-label` / `start-day-join` / `budget-period-month` 均已删除。
- **历史**：r20 两条 bullet + 底部 29–31 说明；r21 压成两行 label-value 并删掉底部说明；r22 改为上下两段结构化卡片，补默认态周期信息与橘色联动。
- **计入成员**（r20）：设置行与 `MembersForm` 抽屉标题统一用 `included-members`「计入成员」，不再用 `participants`「参与者」；行副标题仍是 `participants-hint`。

## 预算抽屉结构（2026-11-13 定稿）

- **一张白卡**：`sheet.tsx` 的 `SheetRow`（左 92px 标签 / 右内容，固定 `h-[52px]`）+ `divide-y divide-rule/60 rounded-2xl bg-panel`。特殊预算的名称、关联特殊标签、每月重复、参与者、金额、详细分配**全在同一张卡里**，六行高度必须完全相同；月度预算抽屉复用同一组 `AmountRows` 放进同款白卡。禁止上半白卡 + 下半 `bg-ground-muted` 灰卡混搭。
- **主卡文案与行顺序**（2026-11-13 r15 定稿）：月度与特殊预算抽屉共用 `AmountRows`，两行标签固定为「金额」（`budget-amount`）与「详细分配」（`detailed-allocation`），**不要再出现「普通预算 / 分配预算」**；卡片外（预算页列表）仍用「普通预算」等原有术语。**特殊预算里 `AmountRows` 紧跟名称行，是白卡的第 2、3 行**（预算名称 → 金额 → 详细分配 → 关联特殊标签 → 每月重复 → 参与者）；月度预算抽屉只有这两行。月度抽屉标题下的说明固定为「金额是本月上限，可以对各个分类做详细的分配。」（`monthly-budget-sheet-hint`，中英同步）。
- **按钮样式**（`components/button-styles.ts`，r20 定稿）：`BTN_BASE` 由 40px / 14px / `rounded-[10px]` 放大为 **48px / 15px / `rounded-[12px]`**（用户「确认和取消按钮太小、离底部太近，最好全局统一改」）；底部操作栏统一 `SHEET_FOOTER = border-t + px-5 + pt-3 + pb-[calc(20px+var(--safe-area-inset-bottom))]`，预算 / 详细分配 / 选项 / 改名抽屉共用，不再是各写一套 `pt-2.5 pb-5`。`BTN_PRIMARY` / `BTN_SECONDARY` / `BTN_DANGER` 保留表单级禁用态（如未填名称时确认禁用），hover/active 一律加 `enabled:` 前缀。**行内按钮用 `BTN_TAP`**：28px 圆形 + 1px 细描边 + 白底 + 轻投影，图标色 r17 改为**主文字黑 `text-ink`**（r15 的次级灰被反馈「灰得像禁用态」），与分类名 / 金额同色同级；hover 变品牌色边框、active 缩到 90%；靠形状与按压反馈表达可点，也不做禁用态。`BTN_COMPACT`（智能分配）文字同步改黑。`BTN_STEP` / `BTN_ICON` 已删除。
- **控件尺寸**：弹层底部按钮统一 `BTN_BASE`（48px / 15px）+ `SHEET_FOOTER`（预算抽屉、详细分配抽屉、选项抽屉、改名抽屉共用）；金额输入区 `h-9`（36px），主卡总额 `w-[124px]`、分配抽屉每行 `w-[58px]`；起始日日期格子 `h-9`。
- **起始日日期格子（r24 回滚 r23）**：31 个格子恢复 `h-9 rounded-lg text-[13px]`，靠 `line-height` 原始居中；选中态 `bg-brand text-on-brand` 无边框、未选中态 `border border-rule bg-panel text-ink`。不要再加 `flex` / `pb-[2px]` / `leading-none` / `tabular-nums` 做光学补偿（用户反馈补偿后日历看着偏右、原来的更好）。
- **`AmountRows`**：只有金额行 + 详细分配行，两行都是 52px；详细分配行右侧显示「已设置 N 项 / 未设置」+ `chevron-right`，点行从底部再弹一层独立抽屉，**不在主卡内展开分类明细**。特殊预算中它排在名称之后（第 2、3 行），月度预算中它就是整张卡。
- **金额输入交互**（2026-11-13 定稿）：`amount-input.tsx` 的 `AmountInput` 用 `type="text" inputMode="decimal"`，**无边框、不做成选项框**：未设置时显示灰色 `0` 占位，`¥` 放在数字右侧；填入后一律主文字黑色，不用品牌橙。仍保留「0 不写进 value + 聚焦 `select()` 全选覆盖 + 失焦 `toLocaleString` 千分位」，聚焦期间用内部 `draft` 保留键入原文（含末尾小数点），粘贴 `¥3,000` 会清洗成 3000。
- **详细分配独立抽屉**（`allocation-sheet.tsx`，2026-11-14 r19 定稿，取代 r17 口径）：
  - 标题「详细分配」**居中且独占一行**（`justify-center` + `text-center`，标题行里没有任何按钮）。**智能分配放在卡片外面**（r19）：白卡上方紧邻的独立一行 `data-smart-row`（`h-7 mb-1.5 flex justify-end pr-1`、透明无背景；r20 把汇总区到卡片的 `mt-2 pt-4` 收紧为 `mt-1 pt-2`，解决「卡片离上面的状态栏太远」），按钮右对齐；白卡内部不再有 `data-card-head` 头部行，首行分类重新承担 `rounded-t-2xl`（空态占位补 `rounded-2xl`）。标题下**不再有任何说明块**：r16 删掉了「分项合计不能超过总额 ¥N」整块（连带 `cannot-exceed-total` / `over-allocated` 语言键），「留空表示未设置」与「点分类行或金额，展开滑动条微调」引导条也早已删除——好的交互不需要说明书，看到 `+` 自然会点、看到 `chevron-down` 自然会展开。
  - 汇总**去掉整块橘色背景卡片**：常驻顶部、不随列表滚动、文字居中，只有两行。第一行「已分配 ¥X / 总额 ¥Y」是 11px `text-ink`；第二行 `remaining-allocatable-label`「剩余可分配」也是 **13px 常规字重的主文字黑 `text-ink`**（r18 用户要求「状态栏的灰字也改成黑色」），只有后面的 `¥Z` 是 20px `text-brand`——**只有金额橙色**。超额时整行改「已超额 ¥N」红字；`total <= 0` 时把 `set-total-first`「请先在上一层设置预算金额」**直接渲染在第二行**（r18 也改黑），不另起说明块；底部「确认」在 `over > 0` 时置灰不可点（r20，见上文口径）。
  - 每个分类一行 52px：**分类名固定 `w-[60px]` 成列**，中间 `data-row-leader` 与 `data-row-tail` 是两段无边框的 `flex-1` 空白，`data-amount-col` 金额列被托在**行中线略左**（CR 金额中心 178 / 行中线 201，WK 176 / 199；用户「金额列往右边点，放到中间线的左边试试」）；右侧操作组 = `-` + `+` + 清零 + `chevron-down`，**按钮依旧全部靠右且位置完全不动**（`gap-0.5`，卡片右内边距 12px）。按钮都是 `BTN_TAP` 圆形图标钮，**只留 `+` / `-` 图标、不写 100 之类文案**。**颜色层级**：分类名、金额、按钮符号全用 `text-ink` 主文字黑；灰色只留给未设置的 `0` 占位，橙色只给 ¥金额 / 滑块 / 拖动高亮 / 微反馈。整行可点：底层铺 `absolute inset-0` 的语义 `<button>`，控件 `relative z-10` 浮在上层避免 button 嵌套；点金额输入由 `onFocusRow` 展开，行尾 chevron 展开时旋转。
  - **微反馈定位（r18 修复）**：`+N` / `-N` 气泡挂在金额列 `data-amount-col` 里，`absolute bottom-full left-1/2`。**不能再加 `-translate-x-1/2`**：Tailwind v4 的 translate 工具类使用独立的 `translate` 属性，而 `@keyframes budget-step-float` 用的是 `transform: translate(-50%, y)`，两者会叠加成 **-100%** 水平位移，气泡飘到分类名上方。水平居中只由动画的 `translate(-50%)` 负责，实测气泡中心与金额列中心偏差 0px 且严格在金额上方。
  - **只有确认按钮有禁用态（r20）**：`capOf() = total` 让输入 / 滑动条 / ± / 长按 / 智能分配共用「单项不超过预算金额」边界，到边界点击就是不加不减；这些行内控件依旧**没有 `disabled`**。唯一例外是底部确认：`over > 0` 时置灰，且不弹任何拦截提示。`itemsRef` 同步更新，保证长按连发期间不基于旧 state 累加。
  - **± 交互（r17）**：短按 `onPointerDown` 立即 **±50**（`TAP_STEP = 50`）并飘出微反馈；按住 420ms 后每 90ms 连发，步进按 `HOLD_RAMP` 从 50 → 100 → 500 递增（按住 1.5s / 3s 切档）；`pointerup` / `pointercancel` / `pointerleave` 都停止连发。用时间戳 `suppressClickUntil` 在 **pointerdown 与 pointerup 两处**压住随后 700ms 内派发的 `click`，否则 Chromium 长按 3 秒松开后补派一次 click 会多 +50；键盘激活（无 pointer 事件）走 `onStepClick` 兜底。实际增量非 0 时，金额上方用 `budget-step-float` 动画飘出 720ms 的 `+N` / `-N` 小提示。
  - **展开区滑动条（r17 加吸附）**：轨道 `h-1`（4px）、滑块 12px 白边橙心、`outline-none` 去掉浏览器给整条轨道套的默认焦点框，焦点环只落在滑块上；`SLIDER_STEP = 10`（拖动细粒度）、最小 0 / 最大总额，**两侧不再有 ±10 微调按钮**。展开区 padding `px-3`（12px，r16 由 `px-7` 收窄）。**吸附与跳转（r17）**：拖动 / 点击轨道 / 键盘微调都走 `onSlide()` → `snapTo(v) = round(v / 100) * 100` 落到最近的整百，再由 `setAmount` 按 `capOf()` 封顶；金额输入框手填值不吸附。轨道容器 `data-slider-track` 自己按 `(clientX - left) / width` 处理 `onPointerDown` 让**点击空白处直接跳到该位置**，不依赖浏览器原生 range 的点击行为（真 WebKit 不可靠）。滑块正上方**不要气泡**，只悬浮一段纯 `¥金额` 文字；**刻度与悬浮数字共用 `centerOf(pct) = calc(pct% + 6px - pct*12/100 px)`**，这个公式就是原生 range 滑块中心的轨迹（滑块直径 12px）。**两端不 clamp**，端点数字的中心也必须正对滑块。**轨道渐变只画在 `[THUMB/2, 宽-THUMB/2]`（r20）**：`backgroundSize: calc(100% - 12px) 100%` + `backgroundPosition: 6px 0` + `no-repeat`，否则原生 range 滑块中心在 0%/100% 内缩半个滑块宽，渐变铺满整条轨道就会在左右各凸出一截。**悬浮数字恒橙（r18）**：不再用 `draggingId` 条件的「拖动时橙 / 平时黑」双态，改成恒定 `text-brand`，刚展开未拖动的 `¥0` 也是橙色（用户反馈「刚打开滑轨的时候为什么 0 是黑色的，应该都是橙色」）；`data-dragging` 属性仅保留给验证脚本读取。`markDragging()` 仍以 `onChange` 触发（真 WebKit 不保证给 range 派发 `pointerdown`），只驱动状态不再改颜色。轨道上叠 **10 个空心圆刻度**：`TICKS = (i * 100) / 9`，**覆盖 0% 与 100% 两个端点**，所以 ¥0 正落在最左刻度、¥max 正落在最右刻度（r15 的 `(i+0.5)*10` 会让两端各空半格）；已填充段白边 / 未填充段灰边，**下方不再有文字刻度**。任何改动都直接改 state，汇总实时重算。
  - 「智能分配」按常见生活开支比例一键分配：居住 25 / 餐饮 24 / 交通 10 / 购物 12 / 娱乐 8 / 医疗 6 / 教育 6 / 人情 5 / 其他 4（按分类名中英文关键词匹配，未命中默认权重 5）；按权重分总额后先取整到 100，零头按小数部分大小回填，**保证合计恰好等于总额、不会超额**。`total <= 0` 时按钮不做事，提示由第二行状态文字承载。
- **名称行**：标签与预算标题同一行，点击弹 `showBudgetName()`（共享改名抽屉，与「编辑分类名称」同款）；**不常驻输入框**，所以新建时必须先改名才能确认（`saveDisabled` 依赖标题非空）。
- **标签 / 成员行**：点击弹 `showBudgetOptions()` 多选抽屉，行右侧只显示摘要（「未设置 / #标签 / 全部 / 已选 N 项」+ 右箭头），**不再在行内铺 chip**。成员「全选」经 `normalizeJoiners` 回落为 `joiners: []`（= 全部成员，含以后新增的）。
- **编辑态**：标题 `edit-special-budget`；底部左侧按钮由「取消」改为「删除」（浅红底 `bg-[#fcdada]`），点击先弹 `showBudgetDelete()` 二次确认，确认后才 `onConfirm("delete")`；原来挂在按钮下方的红色删除链接已删除。取消抽屉仍可点遮罩关闭。
- **Provider 挂载**：`list.tsx` 里 `BudgetSheetProvider` / `BudgetNameProvider` / `BudgetOptionProvider` / `BudgetDeleteProvider` / `BudgetAllocationProvider` 五个实例各自挂载；三层弹层（预算页 → 预算抽屉 → 分配 / 选项 / 确认抽屉）依赖 `createConfirmProvider` 的 zIndex 栈，Chromium 与真 WebKit 均已实测可用。

## 预算周期卡片的分类明细（r20）

- `list.tsx` 的 `categoryLines(b)` 不再固定铺满所有一级支出分类：先算每个分类的「额度」与「当期已支出」，**只保留 `budget > 0 || used > 0` 的行**。既没设额度又没支出的一律不显示，避免展开后铺一屏「未设置」；全部被过滤时容器内显示 `no-budget` 空态。两种展开样式（只有普通预算 / 有特殊预算）共用同一函数。

## 边界

- 首页概览卡、记账票券卡与筛选**如何消费**这些周期，分别见 `docs/agents/ui-home.md` 与 `docs/agents/ui-ledger-stat.md`；本文只负责产生周期与预算数据。
- 预算 / 标签的数据结构与成员、分类模型见 `docs/agents/domain-model.md`。
