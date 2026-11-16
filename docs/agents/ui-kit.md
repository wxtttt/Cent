# 全局界面规范：二级页与底部抽屉（`components/sheet-kit.tsx`）

> 由根目录 `AGENTS.md` 拆分而来，属于功能级文档（渐进式披露）。**新增 / 重构任何二级页、任何底部抽屉前先读本文**；本文与 `docs/agents/ui-tokens.md`（令牌、配色作用域）配套，令牌管「颜色从哪来」，本文管「结构怎么摆」。

## 0. 一句话

二级页 = **页面标题 + 一组「分组小标题 + 白卡」**；底部抽屉 = **`SheetShell`（拖拽条 + 居中标题 + 白卡 + 橙色提醒 + 双按钮底栏）**。两者都从 `apps/cent/src/components/sheet-kit.tsx` 取，不再各写一份。

## 1. 页面标题

- **字号 / 字重 / 颜色固定 `text-[18px] font-semibold text-ink`**，通过 `PopupLayout` 的 `title` 传入：

```tsx
<PopupLayout
    title={<span className="text-[18px] font-semibold text-ink">{t("...")}</span>}
    backStyle="circle"
    className="dp-drawer-surface h-full bg-ground"
/>
```

- 基准实现：`components/category/list.tsx`（分类管理）、`components/budget/list.tsx`（预算管理）、`components/loan-calculator/form.tsx`（贷款管理）。
- 顶栏右侧动作与左侧圆形返回**必须同距边 16px**：`PopupLayout` 在 `backStyle="circle"` 时已把 `right` 挂到 `right-4`，页面里不要再加 `-mr-1`。
- 二级页底色一律 `dp-drawer-surface` + `bg-ground`（中性灰白 `#f4f4f4` + 纯白卡）；只有一级 tab 页保留暖米。

## 2. 分组小标题 + 白卡

**所有二级页都是这个节奏**：`GroupTitle`（12px 次级灰，在卡片**外面**）→ 一张白卡；卡片之间只靠分组标题分隔，不插其他容器。

```tsx
<GroupTitle title="还款进度" first />        {/* 页面第一个分组 */}
<GroupTitle title="提前还款" action={<AddChip />} />  {/* 组级动作放右侧 */}
<ListCard>
    <ListRow title="月度预算" subtitle="..." value="¥3,000" onClick={...} />
</ListCard>
```

| 组件 | 规格 | 用途 |
| --- | --- | --- |
| `GroupTitle` | `text-[12px] text-ink-secondary`，`mt-4`（第一个）/ `mt-3`，`px-1 mb-1.5` | 卡片外的分组小标题，与预算页「预算周期 / 预算范围 / 特殊预算」完全一致 |
| `ListCard` | `rounded-2xl bg-panel` + `divide-y divide-rule/70` + 轻投影 | 分组连卡（组内行只有细分隔线、行间无间隙） |
| `ListRow` | 58px 高；标题 15px `text-ink`；副标题 11px `text-ink-secondary`；右侧值 14px `text-ink` + chevron | 列表 / 设置行 |
| `CARD` | 白卡常量（圆角 16 + 纯白 + `0 1px 6px rgba(92,62,30,.05)`） | 单卡场景（详情页统计卡、图表卡） |
| `PlaceholderCard` | `CARD` + `flex min-h-[58px] items-center px-4 py-3`，卡内一行 12px `text-ink-secondary` | 分组空态占位卡：贷款「提前还款 / 利率调整」、预算「特殊预算」、币种「自定义币种」、标签「无」同款；**高度与一条 `ListRow` 齐平（58px）**，文案折行时才变高 |
| `SheetFooter` | `SHEET_FOOTER` + 两颗等宽按钮（48px / 圆角 12 / 间距 10），左侧可换成 `BTN_DANGER` 删除 | **所有表单抽屉的唯一底栏**：`SheetShell` 内部用它，`PopupLayout` 自绘内容的表单（分类、车辆、医疗、物品、筛选）也用它 |

- **卡片能合就合**：同一屏里属于同一主题的块并进一张卡（贷款详情把「剩余本金进度」与「下次还款」并成一张，中间用 `border-t border-rule/60` 分段），不要每块都开一张新卡。
- 卡片内需要小标题时用 `text-[15px] dp-text-medium text-ink`，**不再用第二层分组标题**。

- **空态一律用「缺省白卡」，不用虚线框、也不在卡里放按钮**（用户明确「用缺省卡片吧，不要这种空态添加框了」）：某个分组一条记录都没有时，仍在分组标题下渲染一张白卡，卡内只有一行 12px 灰字，说明这里有什么、能拿来做什么（文案参考 `loan-prepay-empty`、`no-special-budget`）；**添加动作统一由页头右上角圆形 ＋ 或分组标题右侧胶囊承担**，空卡只负责让用户知道功能存在。历史只读周期若没有记录，整组不渲染，避免出现「看着能加、其实只读」的错觉。

## 2.1 间距口径（页面 / 分组 / 卡片）

| 位置 | 值 | 实现 |
| --- | --- | --- |
| 页面标题 → 第一个控件或分组 | **20px** | `PopupLayout` 页头 `pb-2` + 内容容器 `pt-1`（分组用 `GroupTitle first` 的 `mt-4`）；有分段控件的页面用容器 `pt-3` |
| 分段控件 → 分组小标题 | **16px** | 分段容器 `pb-4`，`GroupTitle` 保留 `mb-1.5` |
| 分组小标题 → 卡片 | **6px** | `GroupTitle` 的 `mb-1.5`，卡片不再加 `mt-*` |
| 卡片 → 下一个分组小标题 | **12px** | `GroupTitle` 的 `mt-3` |
| 段落 / 提示文字 → 卡片 | 8px | `mt-1.5`~`mt-2` |

- **不要在 flex 列上再用 `gap` 表达分组间距**：`gap` 会和 `GroupTitle` 自带的 `mb-1.5` 叠加（分类页曾因此变成 18px）。分组间距一律交给 `GroupTitle` 的 `mt-*`，容器只负责左右 padding。
- 分段控件（支出/收入、特殊/普通）统一「白底胶囊容器 `bg-panel p-1 shadow-sm`（40px）+ 选中项 `bg-ground-muted`（32px）+ 14px 文字」，与记一笔的支出/收入段控同款。

## 3. 文字颜色层级（重要黑 / 次要灰）

| 层级 | 类 | 用在哪 |
| --- | --- | --- |
| 重要 | `text-ink` | 行标题、金额、日期、结果值、按钮文案、提示块主文案 |
| 次要 | `text-ink-secondary` | 行副标题、单位后缀、说明段、图表刻度、图例 |
| 弱化 | `text-ink-secondary/60` | 行尾 chevron、占位图标 |
| 品牌 | `text-brand` | 只给「¥金额」与选中态、橙色提醒的强调片段 |

- 不要把主信息做成灰色；灰色只承担「补充说明」。
- 中文字重用 `dp-text-medium`（500）或 `font-semibold`；金额数字用 `font-display font-bold tabular-nums`。

## 4. 底部抽屉：`SheetShell`

**所有底部抽屉的唯一壳**（`components/sheet-kit.tsx`）：

```tsx
<SheetShell
    title={t("loan-prepay-date")}
    hint={/* 可选，标题下的居中说明 */}
    onCancel={onCancel}
    onConfirm={onConfirm}
    cancelLabel={isEdit ? t("delete") : undefined}  // 编辑态左侧变「删除」
    cancelDanger={isEdit}
    confirmDisabled={!valid}
>
    <SheetCard>
        <SheetRow label="还款时间">…</SheetRow>
    </SheetCard>
    <SheetHint>…</SheetHint>
</SheetShell>
```

结构顺序固定：`拖拽条 → 居中标题 17px semibold →（可选）12px 居中说明 → 内容（白卡 + 提醒）→ SHEET_FOOTER 底栏`。

### 4.1 抽屉内的行

| 组件 | 规格 |
| --- | --- |
| `SheetCard` | 白卡 + `divide-y divide-rule/60`，行之间只有细线 |
| `SheetRow` | **固定 52px**，左标签 `w-[92px] text-[14px] text-ink`，右侧内容右对齐；可点行进下一层时传 `onClick` |
| `SheetLinkValue` | 右侧「当前值（13px 灰）+ chevron」 |

- 长表单不在主卡里展开：点行再弹一层独立抽屉（见第 6 节）。
- 行内输入统一「无边框、右对齐、聚焦全选」：`bg-transparent text-right text-[17px] dp-text-medium text-ink tabular-nums outline-none`。

### 4.2 橙色提醒（`SheetHint`）

**抽屉里所有「会发生什么 / 折算成什么 / 政策口径」提示一律用它**，不再出现绿色、黄色等第二种提示色：

```tsx
<SheetHint>
    <p className="text-[15px] font-semibold text-ink">生效日：<span className="text-brand tabular-nums">11月15日</span></p>
    <p className="mt-1 text-[11px] text-ink-secondary">新预算周期：11/15 - 12/14</p>
</SheetHint>
```

- 容器：`rounded-2xl bg-brand/10 px-3.5 py-3`（`SheetHint` 已内置）。
- 主文案 15px semibold `text-ink`（短提示）/ 13px `text-ink`（整句结果）；副文案 11px `text-ink-secondary`。
- 上下两段之间用 `SheetHintDivider`（`my-2.5 h-px bg-ink-secondary/15`）。
- 基准实现：预算起始日抽屉（`budget/sheet.tsx` 的 `StartDayForm`）、贷款首付 / 提前还款 / 利率调整抽屉。

### 4.3 底栏按钮

- 固定 `SHEET_FOOTER`（`border-t + px-5 + pt-3 + pb-[calc(20px+var(--safe-area-inset-bottom))]`）+ `flex gap-2.5` + **两颗 `flex-1` 等宽按钮**。
- 右 = 确认 `BTN_PRIMARY`；左 = 取消 `BTN_SECONDARY`，编辑态换「删除」`BTN_DANGER`（浅红底红字）。
- **基准就是「编辑特殊预算」的底栏**；贷款页上一版把确认写成 `flex-[2]`，宽度和卡片对不上，已改回等宽。
- 单按钮场景（保存方案 / 新增方案 / 菜单）用 `footer={<button className={cn(BTN_PRIMARY,"w-full")}>}` 覆盖整行。

## 5. 抽屉的打开方式

- **一律 `createConfirmProvider`**（`components/confirm/index.tsx`）——它负责滑入动画、软键盘避让、画布染色、焦点回填、层级栈（`zIndex = 4 + 可见数`）。**不要再手写 `Dialog` + `fixed z-50`**：贷款页曾因此出现「抽屉遮罩盖住全局删除确认」。
- 一个模块一个抽屉实例 + 一个 `type` 联合，返回值统一带 `kind`：

```tsx
export type LoanSheetValue = { type: "term"; years: number } | ...;
export const [LoanSheetProvider, showLoanSheet] = createConfirmProvider<LoanSheetValue, LoanSheetResult>(SheetForm, {
    dialogTitle: "Loan Sheet",
    dialogModalClose: true,
    from: "bottom",
    contentClassName: "w-full max-w-full rounded-t-[28px] border-0 bg-ground p-0 shadow-none sm:w-[90vw] sm:max-w-[500px] sm:rounded-md",
});
```

- `contentClassName` 必须把 `bg-ground`（灰底）与 `p-0` 补上，否则退回 `bg-panel` 白底。
- Provider 挂在模块根节点（页面里或 `main-layout`），**同一实例只能挂一次**，挂两次会渲染两份。

## 6. 三种标准二级交互（「以后默认都这样」）

| 场景 | 用 | 行为 |
| --- | --- | --- |
| **单行文案**（名称 / 标题） | `components/name-dialog.tsx` 的 `createNameDialog()` | 行上显示当前值 + 小铅笔；点行从底部再弹一层改名抽屉（标题 15px semibold + 单行输入 `h-10 rounded-[10px] border border-rule` + 取消/确认） |
| **多选项**（标签 / 成员 / 分类） | `components/option-sheet.tsx` 的 `createOptionSheet()` | 行右侧只显示摘要（`未设置 / #标签 / 全部 / 已选 N 项` + chevron）；点行弹选项抽屉：标题 17px + 白卡行 + 右侧 18px 圆形勾选 + 取消/确认。**行内不再铺 chip** |
| **破坏性删除** | `components/delete-confirm.tsx` 的 `createDeleteConfirm()` | 必须先二次确认；编辑态底栏左键就是「删除」，不再另挂红色文字链 |

- **预算管理页的「计入成员」已按本规范改**（此前是行内 chip 的例外，现取消）：`budget/list.tsx` 的 `openMembers` 直接调 `showBudgetOptions`，与「关联特殊标签」完全同款。
- 名称 / 选项 / 删除三个工厂**按模块各建一次实例**，Provider 挂到模块根节点。

## 7. 日期 / 周期选择

- 一律 `components/wheel-date-picker.tsx`（经 `components/date-picker.tsx` 的 `DatePicker` 调用）：底部滚轮、`type="month"` 只选年月。
- 标题用「选择预算周期」同一条口径（`select-budget-period`）或字段名；不要用 `<input type="month">`（iOS 上是另一套系统弹窗，与产品割裂）。
- 年月文案统一 `2026年12月`（中文）/ `Dec 2026`（英文），实现见 `loan-calculator/month-field.tsx` 的 `ymText`。
- 需要跨二三十年（贷款还款生涯）时给 `WheelDatePicker` 传 `years: [起, 止]`。

## 8. 新增 / 重构页面的 checklist

1. 页头：`PopupLayout` + `backStyle="circle"` + 18px semibold 标题 + `dp-drawer-surface bg-ground`。
2. 内容：`GroupTitle` + `ListCard/ListRow`（或 `CARD` 单卡），分组间距 `mt-3/mt-4`，页面左右留白 `px-4`。
3. 页底固定操作：`PAGE_FOOTER`（**不要**用 `SHEET_FOOTER`，它自带安全区，页面会二次叠加把按钮顶出屏幕）。
4. 抽屉：`createConfirmProvider` + `SheetShell` + `SheetCard/SheetRow` + `SheetHint` + `SHEET_FOOTER` 双等宽按钮。
5. 名称 / 多选 / 删除：走第 6 节的三个工厂。
6. 所有时间字段：`MonthField` / `WheelDatePicker`。
7. 文案同步 `zh.json` / `en.json`（UTF-8）。
8. 注释与文案里**不要出现参考产品的名字**，需要指代时写「APK」「参考实现」。

## 9. 迁移现状与待办

| 模块 | 状态 |
| --- | --- |
| 预算管理（`budget/list.tsx`、`budget/sheet.tsx`） | ✅ 已用 `sheet-kit`；计入成员改选项抽屉；标题 18px；特殊预算空态 = `PlaceholderCard` |
| 贷款管理（`loan-calculator/*`） | ✅ 全部抽屉改用 `createConfirmProvider` + `SheetShell`；详情页「分组标题 + 白卡」；绿色提示块统一为橙色提醒 |
| 汇率与货币（`currency/list.tsx`、`edit.tsx`、`manual-rate-form.tsx`） | ✅ 页头 18px + 右侧圆形 ＋；四组 `GroupTitle + ListCard + ListRow`；自定义币种空态 = `PlaceholderCard`；编辑 / 手动汇率抽屉改 `SheetShell`（编辑态左键「删除」） |
| 通用选项抽屉（`option-sheet.tsx`） | ✅ 改 `SheetShell + SheetCard`（搜索框在白卡上方，空结果用 `PlaceholderCard`），预算 / 币种 / 成员共用 |
| 车辆记录（`pages/vehicle/index.tsx`） | ✅ 页头圆形返回 + 18px 标题 + 40px 编辑按钮；删掉本地 `CARD` / `GroupTitle` 副本，月份小标题与记录卡改用 `GroupTitle` / `ListCard`；空记录 = `PlaceholderCard` |
| 分类管理（`category/list.tsx`） | ✅ 页头圆形返回 + 右侧圆形 ＋（原「添加标签」文字按钮删除），分组标题改 `GroupTitle`；**拖拽列表仍用本地行结构**（`item.tsx` 的 54px 行 + 拖拽手柄是 APK 口径，不要换 `ListRow`） |
| 周期记账（`scheduled/list.tsx`） | ✅ 页头圆形返回 + 右侧圆形 ＋；行改「`ListCard` 内 58px 行 + 开关 + 编辑 / 删除小圆按钮」（`BTN_TAP`）；空态 = `PlaceholderCard` |
| 标签管理（`bill-tag/list.tsx`） | ✅ 页头圆形返回 + 右侧圆形 ＋；两段 `GroupTitle + ListCard + ListRow`（色点当 badge），空态 `PlaceholderCard`；分段控件与分类页同款；**删除段标题右侧的「⊕ 添加」文字链接** |
| 标签编辑（`bill-tag/tag.tsx`） | ✅ 自绘壳改 `SheetShell`；编辑态左键「删除」（`BTN_DANGER`） |
| 分类编辑（`category/form.tsx`） | ✅ 标题交 `PopupLayout`（17px）；底部通栏按钮改 `SheetFooter` |
| 车辆 / 物品 / 医疗表单（`vehicle/forms.tsx`、`inventory/item-form.tsx`、`medical/forms.tsx`） | ✅ 底栏统一 `SheetFooter`：车辆 / 物品原来是通栏橙色按钮、医疗是右上角小「保存」，现在都是左「取消 / 删除」右「确认 / 保存」 |
| 账单筛选（`ledger/filter-sheet.tsx`） | ✅ 拖拽条 `w-10` + 17px 标题对齐；底栏改 `SheetFooter`（左「重置」右「确定」）；底色从写死的 `#f4f4f4` 换回 `bg-ground` |
| 生活模块表单（车辆 / 医疗 / 物品等，`form-rows.tsx`） | ✅ `FormCard` / `FormRow` / `FormSection` 改为**委托** `ListCard` / `SheetRow` / `GroupTitle`，不再各写一份 class；`RowInput` / `CountedRowInput` / `RowChevron` / `FormBlock` 保留 |
| 记一笔（`bill-editor/*`） | ⏸ 一级 tab 页 + 自绘键盘，分类区是 APK 口径的横滑结构；**内部三个弹层（分类选择 / 币种 / 备注）仍是自绘壳**，是本轮之后仅剩的未统一抽屉 |
| 改名弹层（`name-dialog.tsx`） | ✅ 已是双等宽 `BTN_SECONDARY / BTN_PRIMARY`，紧凑弹层，不套 `SheetShell` |
| 归医 / 知物列表页（`pages/medical`、`pages/inventory`） | ⏸ 一级 tab 页保留自身的 17px 标题 + 插画节奏；其中「物品筛选」仍是手写 `Dialog`（见下方待办） |

> 迁移原则：**先换壳不改逻辑**——把自绘 Dialog 换成 `createConfirmProvider`，把卡片 / 行 / 底栏换成 `sheet-kit`，业务状态与文案一律不动，改完跑一遍该模块的验证脚本。

### 9.1 本轮迁移踩到的坑（务必保留修复）

- **flex 列会把卡片压扁**：二级页滚动容器是 `flex flex-col overflow-y-auto`，卡片作为 flex 子项默认 `flex-shrink: 1`。内容一多（如币种页 30 条汇率），顶部两张小卡会被压到 16px、行被 `overflow-hidden` 裁成一条白边。已在 `sheet-kit` 里给 `ListCard` / `SheetCard` / `PlaceholderCard` / `GroupTitle` 统一加 `shrink-0`，**不要为了「撑满」把这个类去掉**。
- **`SheetRow` 标签宽度**：从写死 `w-[92px]` 改成 `min-w-[92px] max-w-[45%]`，长标签（如「上次就诊时间」）自然撑开，不再把右侧值挤成省略号。
- **`SheetRow` 高度**：`h-[52px]` → `min-h-[52px]`，带计数副行的 `CountedRowInput` 不再溢出。
- **列表行为统一**：`ListRow` 现在把剩余 `data-*` / `aria-*` 透传到根节点，验证脚本用的 `data-currency-*` 等钩子可以继续挂在 `ListRow` 上；值过长时传 `valueClassName="min-w-0 shrink truncate"`。
- **`PopupLayout` 的字符串标题**：自动渲染 18px / 600 / `text-ink`，传 `ReactNode` 的页面仍自己控制，避免每个页面都写一遍 `<span>`。
- **抽屉标题 17px、二级页标题 18px**：`PopupLayout` 收到字符串标题时按 `handle`（有拖拽条 = 抽屉）自动选 17 / 18，与 `SheetShell` 的 17px 对齐；此前抽屉被渲染成 18px、和 `SheetShell` 抽屉不一致。
- **一行通栏大按钮已全部退场**：车辆 / 物品 / 分类表单原来是「底部通栏橙色按钮 + 文字删除」，医疗是「右上角小保存」，已统一成 `SheetFooter`（左「取消 / 删除」右「确认 / 保存」）。新增抽屉不要再写 `h-12 w-full rounded-full bg-brand`。
- **`PlaceholderCard` 高度**：从 `py-3` 的 44px 改成 `min-h-[58px]`，币种页实测缺省卡 58px = 本位币行 58px；空态卡和有记录卡片在同一分组里高度一致。
