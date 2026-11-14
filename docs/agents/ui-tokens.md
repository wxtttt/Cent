# UI 通用规范：设计令牌、配色作用域与运行时约定

> 由根目录 `AGENTS.md` 拆分而来，属于功能级文档（渐进式披露）。先读 `AGENTS.md` 了解全局约定，改到本模块时再读本文；本模块有新口径 / 新规则时，同步更新 `AGENTS.md` 索引与本文。

## 设计令牌与全局样式

设计令牌定义在 `apps/cent/src/index.css`，通过 Tailwind v4 暴露为 `bg-ground`、`text-ink` 等工具类。不要硬编码颜色，优先用令牌或语义色。

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| `--dp-color-ground` | `#fbf7ef` | 页面底色（暖米白，对齐家小满） |
| `--dp-color-ground-muted` | `#eee0c8` | 次级底色 / 浅色块 |
| `--dp-color-panel` | `#ffffff` | 卡片、弹层、键盘按键（APK 实测纯白；首页另有 `#fffdf6` 局部覆盖） |
| `--dp-color-ink` | `#2a2018` | 主文字 |
| `--dp-color-ink-secondary` | `#8b8178` | 次要文字 |
| `--dp-color-rule` | `#e9dcc6` | 边框 / 分割线 |
| `--dp-color-accent` | `#ff8435`（暗色 `#ff8a3d`） | 品牌色（`bg-brand`），四个一级页签页统一 |
| `--color-expense` | `#1f9d63` | 支出语义色（绿色，`text-semantic-expense`） |
| `--color-income` | `#e2544a` | 收入语义色（红色，`text-semantic-income`） |
| `--dp-radius-panel` | `12px` | 普通面板圆角 |
| `--dp-radius-card` | `28px` | 卡片 / 底部抽屉顶部圆角 |
| `--dp-motion-interaction` | `160ms` | 交互过渡时长 |
| `--dp-motion-easing` | `ease-out` | 交互缓动 |
- **渐变只在 `index.css` 定义令牌**：`--dp-gradient-page-top`（页头暖米纵向）、`--dp-gradient-ticket{,-ledger,-inventory,-wealth,-plain}`（统计卡按页签区分方向）、`--dp-ticket-*-corner`（实色硬边扇形）、`--dp-ticket-tape`；组件不写死渐变，`TicketCard` 用 `variant` 选对应渐变、装饰角位置与吉祥物布局。暗色同名覆盖。

- **抽屉配色作用域隔离**：`html:not(.dark) .dp-drawer-surface` 局部重定义 `--dp-color-*`，让个人抽屉用 APK 的中性灰白（背景 `#f4f4f4` / 卡片 `#ffffff` / 主文字 `#383230` / 星期 `#b3ada8`），首页等页面仍是暖米主题。`@theme inline` 编译出的工具类直接引用变量，子元素自动继承；挂点要同时覆盖弹层 `contentClassName` 与 `ProfileForm` 根节点，暗色主题不受影响。

- **卡片色按作用域分层**：全局 `--dp-color-panel` 保持**纯白 `#ffffff`**（用户明确要求，APK 实测所有抽屉卡片都是纯白；曾短暂改回 `#fffdf8` 导致「记一笔 / 添加物品」整套观感发黄，已再次改回，不要再动）；`.dp-home-surface`（首页**与记账页**都挂）单独覆盖成 APK 实测的 `#fffdf6`，`.dp-drawer-surface` / `.dp-category-surface` 也是纯白。暖米主视觉只由 `--dp-color-ground`、页头渐变、统计卡渐变、胶带、hero 圆等令牌承载，**不要靠把 panel 调成米白来实现**。

- **底部抽屉统一中性灰白 `.dp-sheet-surface`**（APK 1080×2340 逐点取色）：抽屉底 `#f4f4f4`、卡片 `#ffffff`、胶囊与分类块 `#ececec`、分隔线 `#efeae5`。这些弹层经 Radix Portal 挂到 `body`，拿不到页面级作用域，所以在其容器上重定义 `--dp-color-ground` / `panel` / `ground-muted` / `rule` / `track`，**不动 ink 字色、不改全局 ground**（首页暖米主视觉不受影响）。落点：`components/confirm/index.tsx` 的 `DialogContent` 基础类（一次性覆盖所有 `createConfirmProvider` 弹层）+ `app-chrome` 快捷新建抽屉根节点 + `components/ui/popover.tsx` 的 `PopoverContent` 基础类（Radix Popover 同样 Portal 到 body，否则「分类管理」这类 `bg-ground-muted` 按钮会吃回全局暖米 `#eee0c8`）；`bill-editor` 等 `contentClassName: "bg-ground"` 会自动取到作用域内的 `#f4f4f4`。内部已有 `.dp-drawer-surface` / `.dp-category-surface` 的子元素变量就近优先，互不干扰。

- **中文字重**：Windows 中文字体只有 400/700 两档（400≡500、600≡700），`dp-text-medium` 只保留 `font-weight:500`；**禁用 `-webkit-text-stroke` 补中黑**（笔画边缘会叠出灰边/双线重影）。iOS PWA 命中 `PingFang SC` Medium，天然更接近 APK 的中黑；金额数字保持 `font-bold`。

- **DPR=1 的亚像素坑**：日历圆环必须整数环宽 31/27/23px（橙环、白环各 2px）；1.5px 环宽会被取整成「1px 实色 + 1px 半透明」，左上半圈发淡、白环断开。任何 <2px 的边框/环宽都要在实景截图里按圆周角度取色验证，不能只看 DOM 尺寸。

- 注意语义色是反直觉的：支出为绿色、收入为红色，与现有账单卡片一致。

- 深色模式通过 `.dark` 下的同名令牌覆盖实现，新增颜色必须同时考虑两套值。

- 安全区统一用 `var(--safe-area-inset-*)` 或项目封装变量，不要在业务组件里直接写 `env(safe-area-inset-*)`。

- 页面是移动优先，主内容最大宽度约 960px；底部操作栏/键盘需处理 `--safe-area-inset-bottom`。

- **圆形分类图标格子不要用 `aspect-square`**（iOS WebKit 踩坑）：`aspect-ratio:1` 在 WebKit 上按内容盒算比例后再叠加 `padding` + `border`，真机（iPhone 16 Pro，402×874）实测 59.3px 宽的圆被拉成 59.3×73.3 竖椭圆（多出 14px 正好是 `p-1.5` 12px + 1px 边框 ×2），Chromium 下完全正常，所以只在真机暴露。`BillCategoryCell`（`bill-editor/category-sheet.tsx`，主表单与分类抽屉共用）与 `IllustrationCell`（`category/form.tsx`）统一用 `relative block w-full rounded-full` + 行内 `paddingBottom: "100%"`（百分比内边距始终相对宽度，与 `box-sizing` 无关），内边距与图片放进 `absolute inset-0` 内层，选中描边用 `ring-1 ring-inset ring-brand`（box-shadow 不占盒尺寸）；**外框不要再叠加 `aspect-ratio` 或 `padding`/`border`**，否则直接变 2:1 椭圆。

- 图标全站统一用 **Lucide 细线图标集**（`@iconify-json/lucide`），类名形如 `icon-[lucide--utensils]`，与家小满 APK 的单色细线按钮图标同源；**不要再新增 `mdi--*`**（旧 MDI 集仅保留作依赖兜底）。`src/utils/icon-map.ts` 是唯一的旧数据兼容层：258 个 `mdi--*` → `lucide--*` 映射以字面量列出（Tailwind 据此生成 mask 规则，勿改成动态拼接），`normalizeIconClass()` 在渲染时把账本/自定义分类里存下来的旧 className 归一化到新图标。分类图标（`components/category/icon.tsx`）按 icon 值分四种渲染：图片 URL（`/`、`http`、`data:` 开头，走 `<img>`）、SVG 字符串、**emoji 纯文本**（非 `icon-` 开头按字符渲染；自定义分类仍可用，默认分类已改为 WebP 插画）、其余按 Iconify 类名。**APK 原 SVG 图标集**：`apps/cent/icons/apk/` 是本地 `@iconify-json/apk` 包（`file:./icons/apk` 依赖），由 `E:\code\_apk_homefull\tools\build-apk-iconset.py` 把反编译导出的 64 个原 SVG 转成 `icons.json` + 插件必需的 `info.json`，类名形如 `icon-[apk--budget]`。单色图标把颜色归一为 `currentColor` 并补 `<g fill="none">`（原 `<svg fill="none">` 外壳属性会被 Iconify 丢掉，不补会渲染成实心剪影）；非正方形图标用 `left/top` 归一到正方形 viewBox 居中，避免 `size-*` 拉伸；彩色插画保留原色。抽屉宫格 / 快捷记账 / 底部输入条与全站通用操作共 19 个图标走这套，APK 无对应资源的入口继续用 Lucide。图标按需内联成 CSS data URI，不新增 HTTP 请求或 PWA precache 条目；改动图标集后要重跑生成脚本再 `pnpm build`。Biome 已排除 `apps/cent/icons/**` 与 `dist-apktest*`，避免把构建产物和单行 JSON 算进格式检查。

- **家小满对齐组件**（改 UI 优先复用，勿另造）：`components/ticket-card`（票券卡：打孔虚线+胶带贴纸+装饰角+吉祥物探头）、`components/segmented-tabs`（页面分段控件：浅容器+白色凸起激活胶囊）、`components/empty-state`（吉祥物空态，注意家小满的列表空态是纯文字，仅引导型空态才用插画）、`components/form-rows`（**行卡片表单基元**：FormSection 分组标题 / FormCard 白卡细分割线 / FormRow 左标签右值 / RowInput 行内透明输入 / CountedRowInput 带 n/255 计数，生活模块五个表单全部用它，勿再写 label+Input 堆叠式）、`components/wheel-date-picker`（**滚轮日期选择器**：底部二级抽屉 ✕/标题/橙✓ + scroll-snap 滚轮；datetime-local 五列、date 三列、month 两列只选年月；支持 open/onOpenChange 受控打开；中性样式为 #f4f4f4 底、白色胶囊、选中 #0a0a0a / 未选 #8b8b8c、17px semibold 标题；头部两个圆按钮 `size-9`(36px)，白圆内 `apk--close` 叉 14px、橙圆内 `lucide--check` 勾 20px——原为 44px 圆 + 20/24px 图标，用户嫌叉太大，左右必须同步缩小才能保持对称）。吉祥物立绘在 `src/assets/mascots/`（webp）。字体保持系统默认（用户已明确不用 Noto Sans SC webfont）。

- 文案必须同时更新 `src/locale/lang/zh.json` 和 `en.json`；组件内用 `useIntl()` 的 `t()`，非组件代码用 `@/locale` 导出的 `t()`。两个语言包不参与 Biome 检查，手动保持格式一致（key 近似按字母序）。**语言包必须以 UTF-8 读写**：曾发生并发会话以 GBK 写入导致中文大面积损坏（423 处截断），恢复手段见 `docs/agents/homefull-reference.md`。

- **弹层类交互的默认约定**（用户明确「以后默认都这样」，新增表单一律照此实现，不要再写行内输入框 / 行内 chip）：
  - 名称 / 标题类字段：标签与值同一行，点击文字或铅笔从底部弹改名抽屉 → `components/name-dialog.tsx` 的 `createNameDialog()`（分类编辑、特殊预算名称共用）。
  - 多选类字段：行右侧只放摘要（当前值 + `chevron-right`），点击从底部弹带勾选圆点的选项抽屉 → `components/option-sheet.tsx` 的 `createOptionSheet()`；**不在行内铺 chip**，chip 只留给本身就是选项抽屉的页面（如预算页「计入成员」）。
  - 破坏性删除：必须 `components/delete-confirm.tsx` 的 `createDeleteConfirm()` 二次确认；编辑态底部左侧按钮直接换成「删除」（`bg-[#fcdada] text-[#ef4444]`），**不再在按钮下方另挂红色删除链接**。
  - 三个工厂都是 `createConfirmProvider` 的实例工厂，**按模块各调一次**并把返回的 Provider 挂载到该模块根节点；同一 Provider 被挂两次会渲染两份弹层。嵌套三层弹层（页面 → 表单抽屉 → 选项/确认抽屉）由 confirm store 的 zIndex 栈支持，已过 Chromium + 真 WebKit。
  - 抽屉内分组统一「一张白卡 + `divide-y divide-rule/60` 细分割线」的行列表，**每行固定 `h-[52px]`**，不要因行内控件高度不同把行撑成参差；长明细（如详细分配）不在主卡里展开，点行再弹一层独立抽屉，标题行右侧给「已设置 N 项 / 未设置」+ `chevron-right`。
  - 所有弹层的操作按钮统一 `h-10` / `text-[14px]` / `rounded-[10px]`，且**一律走 `components/button-styles.ts` 的共享常量**：可点态用实心品牌色或白底描边 + 轻投影 + 字重 600 + `enabled:hover` / `enabled:active` 按压反馈，禁用态用灰底灰字 + `cursor-not-allowed` + 无投影。禁止再用 `bg-ground-muted` 表示可点（和禁用态几乎一样，用户明确反馈「淡淡的像不能点击」）；hover/active 必须带 `enabled:` 前缀。
  - **行内小按钮 `BTN_TAP`（r17 定稿）**：28px 圆形 + 1px 细描边 + 白底 + 轻投影，图标色改为主文字黑 `text-ink`（r15 的 `text-ink-secondary/80` 被用户反馈「灰得像禁用态」）；靠形状 + 边框 + hover/active 缩放表达可点，图标与分类名 / 金额**同色同级**。`BTN_COMPACT` 文字同样改黑。`BTN_TAP` 不做禁用态：越界由数据层 `capOf()` 封顶，「不加不减」即可。`BTN_STEP` / `BTN_ICON` 已删除，`PRESSABLE_ROW` 给行 / chip / 日期格。
  - **轻量状态汇总与微反馈**（r18 定稿）：顶部汇总卡不要用抢眼的橘色背景，也不要整行染橙——「已分配」「剩余可分配」等**所有状态文字都用主文字黑 `text-ink`**（r18 用户「状态栏的灰字也改成黑色吧」，r16 的 `text-ink-secondary/80` 已废弃），只有后面的 `¥金额` 放大成 20px 品牌橙，其余信息压成 11px。零总额 / 超额提示直接落在这一行并同样用黑色（超额红字除外），不再单独占一条说明块。点击微调时用 `index.css` 的 `@keyframes budget-step-float` 让 `+N` / `-N` 在金额上方飘出 720ms。**关键坑**：气泡水平居中只能由动画的 `transform: translate(-50%, …)` 负责，绝不能再叠加 Tailwind v4 的 `-translate-x-1/2`（独立的 `translate` 属性），否则两者合成 -100% 位移、气泡飘到分类名上方。数值本身保持主文字黑色。
  - **颜色层级**（r18）：分类标题、金额、`+` / `-` / 清零 / 智能分配等按钮符号、状态栏文字**全部用主文字黑 `text-ink`**；灰色只留给未设置的 `0` 占位；橙色只用于 ¥金额、滑块与滑轨悬浮数字（**恒橙，包括刚展开的 ¥0**，不再做拖动双态）、微反馈气泡。不要把主要信息做成灰色，也不要给金额画虚线下划线。
  - **密集行的信息/操作分组**（r18）：当一行里既有分类名 + 金额、又有一串按钮时，**分类名固定成列（`w-[60px]`）**，中间用两段无边框的 `flex-1` 空白把**金额列托到行中线略左**，按钮全部留在右侧并收紧间距（`gap-0.5`）。r17 把金额紧贴分类名（8px）会在中间留下整块空白，用户反馈「现在中间有点空，放到中间线的左边试试」；两段留白既填补空白又让金额列对齐成列，**按钮组位置完全不动**。不要在中间画贯穿的灰色引导虚线（r16 的虚线已被 r17 删除）。
  - **功能按钮的位置**（r19）：作用于整张列表的操作（如「智能分配」）放在**白卡外面**——卡片上方紧邻的独立一行 `data-smart-row`（`h-7 mb-2 flex justify-end pr-1`、透明无背景），右对齐；既不与居中标题挤同一行，也不占用白卡内部空间（r18 的卡片内 `data-card-head` 头部行已删除）。标题行只保留一个居中 `h2`，卡片首行重新承担 `rounded-t-2xl`。
  - **滑轨端点与刻度**（r16）：刻度必须与悬浮数字共用滑块中心公式 `calc(pct% + 6px - pct*12/100 px)`，且 10 个刻度里**必须包含 0% 与 100%**，否则 ¥0 会落在最左刻度右边、两端各空出一截；展开区左右 padding 用 `px-3` 而不是 `px-7`。端点数字不做 `clamp()`，中心始终正对滑块。
  - **吸附与点击跳转**（r17）：拖动 / 点击轨道 / 键盘微调统一经 `snapTo(v) = round(v / 100) * 100` 落到整百，`step=10` 只保留拖动细粒度；轨道容器自己按 `(clientX - left) / width` 处理 `onPointerDown` 直接跳转，不要依赖浏览器原生 range 的点击行为（真 WebKit 不可靠）。手填金额不吸附。
  - **长按合成的 click**（r17 踩坑）：pointerdown 与 pointerup 都要压住随后 700ms 内的 `click` 兜底（时间戳 `suppressClickUntil`），否则 Chromium 在长按 3 秒松开后补派一次 click，会多出一个短按步进；键盘激活（无 pointer 事件）仍要能正常触发。
  - 数字金额输入不做成「选项框」（不要浅底圆角 + focus ring）：无边框，未设置时是灰色 `0` 占位、`¥` 放在数字右侧，填入后一律用主文字黑色（**不用品牌橙**）；仍是「空值 + 聚焦全选 + 失焦千分位」，`text + inputMode="decimal"`。见 `components/budget/amount-input.tsx` 与 `docs/agents/budget.md`。
  - **可展开行的入口提示**：整行可点时，底层铺 `absolute inset-0` 的语义 `<button>`、交互控件 `relative z-10` 浮在上层（避免 button 嵌套 button 触发 Biome a11y 报错）；行尾加会旋转的 chevron 就够了，**r17 起金额不再加虚线下划线**，也**不要写「点分类行或金额，展开滑动条微调」这类说明书式引导条**（用户明确「好的交互不需要说明书」）。
  - 预算抽屉主卡两行文案固定为「金额 / 详细分配」（`budget-amount` / `detailed-allocation`），月度与特殊预算共用；抽屉标题同步用「详细分配」。**特殊预算里这两行紧跟名称排在白卡第 2、3 行**；月度抽屉标题下提示「金额是本月上限，可以对各个分类做详细的分配。」详见 `docs/agents/budget.md`。
- 二级页面（`/stat`、`/search`、`/inventory`、`/medical`、`/vehicle`）使用自己的返回头部，全局 AppChrome 会隐藏；修改壳层时先读 `components/app-chrome/index.tsx`（底部 dock 含吉祥物切换与加号分派）。

- **四个已踩过的坑**：① `components/ui/dialog/index.tsx` 的 WAAPI 动画收尾必须用 `commitStylesSafe()`（快速关闭时元素已出 DOM，直接 `commitStyles()` 抛 InvalidStateError）；② `Intl.DateTimeFormat` 的 `dateStyle` 与 `weekday` 等分量选项互斥，同传会抛 `Invalid option` 白屏；③ `useLedgerStore` 的选择器若返回 `?? []` 之类的新引用，必须包 `useShallow` 或复用带 `useShallow` 的现成 hook（如 `useAutoRules()`）——裸选择器会让 React 判定快照永远在变，`getSnapshot should be cached` 警告 + `Maximum update depth exceeded` 崩溃（记一笔曾因此打不开）；④ 本应用是 MemoryRouter，`window.location` 不反映路由（hash/search 恒空），跨组件读路由状态一律用 `useLocation()` / `useSearchParams()`。
