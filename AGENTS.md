# AGENTS.md

本文件面向在本仓库工作的 AI 编码助手。开始改代码前先读本文件；涉及具体模块时再读对应源码。

> **文档约定（用户明确要求，2026-11-13）**：文档按「渐进式披露」组织——本文件只留全局约定，功能级细节拆到 `docs/agents/*.md`，改到哪个模块再读哪个文档。每轮改动后**必更新 `AGENTS.md`**（全局规则 / 索引 / 口径变化），并同步更新命中的分模块文档；`docs/tag-and-budget-design.md`、`docs/adr/*`、`docs/design/*`、`CONTEXT.md` 及其它设计稿 / 验收记录是历史存档，**一律不更新**。**条目标识（用户明确要求，2026-11-15）**：多分支并行期间，所有新条目一律用「YYYY-MM-DD HH:MM」时间标识（不再用 rNN 全局序号，r28 及更早的历史条目保留原样）；脚本 / 截图用语义命名，不带轮次前缀。

## 0. 渐进式披露索引

本文件只保留**全局约定**。改到具体模块时，再按下表读对应文档，不要一次性把所有细节塞回本文件。

| 文档 | 什么时候读 |
| --- | --- |
| `docs/agents/domain-model.md` | 改账单 / 分类 / 标签 / 预算等领域模型、数据结构、兼容性 |
| `docs/agents/budget.md` | 改预算周期、预算页、月度预算抽屉、标签口径 |
| `docs/agents/ui-tokens.md` | 改配色、令牌、抽屉壳、字体、通用 UI 约束 |
| `docs/agents/ui-home.md` | 改首页、顶栏、dock、页签、今日总结、品牌图标 |
| `docs/agents/ui-bill-editor.md` | 改记一笔表单、分类选择、币种、键盘、金额输入 |
| `docs/agents/ui-ledger-stat.md` | 改记账页、账单卡、票券统计卡、月份筛选 |
| `docs/agents/ui-forms.md` | 改物品 / 医疗等生活模块表单与通用表单抽屉 |
| `docs/agents/ui-vehicle.md` | 改车辆记录 / 行车能耗页、车辆领域模型、统计与示例数据、APK 实测口径差异 |
| `docs/agents/ui-login.md` | 改登录页、登录方式选择、未登录引导层 |
| `docs/agents/ui-currency.md` | 改汇率与货币页、记一笔币种选择抽屉、手动汇率 / 自定义币种弹层 |
| `docs/agents/navigation.md` | 改二级页出场方式、路由表、`routePath` / FromRight 右滑、弹层与页面的边界 |
| `docs/agents/fork-customizations.md` | 查 fork 相对上游已重做的功能清单 |
| `docs/agents/verification.md` | 写 / 跑浏览器验证脚本、WebKit 双引擎验证 |
| `docs/agents/deployment.md` | 构建产物、Cloudflare 部署、Git / SSH 通道 |
| `docs/agents/homefull-reference.md` | APK 现场对照、参考资产、语言包损坏恢复 |

**每轮改动后的文档义务**：① 必更新 `AGENTS.md`（全局规则、索引、口径变化）；② 若改动落在上表某个模块，同步更新该模块文档；③ `docs/tag-and-budget-design.md`、`docs/adr/*`、`docs/design/*`、`CONTEXT.md` 及各类验收记录是**历史存档，一律不更新**。

**2026-11-13 口径变更登记**（细节按功能域写在对应文档，不在此展开）：预算起始日改为「今天之后第一个匹配日」生效、界面术语统一为「分配预算」→ `docs/agents/budget.md`；首页标题与金额口径 → `docs/agents/ui-home.md`；记账卡周期时间 / 过渡标签 / 筛选 / 预算率 → `docs/agents/ui-ledger-stat.md`；账单卡创建者回退 → `docs/agents/domain-model.md`。

**2026-11-13 晚间口径变更登记**：起始日选中后的「生效日 + 过渡期归属月」预演提示、特殊预算抽屉统一白卡行、标签/成员改选项抽屉、分配预算默认折叠 → `docs/agents/budget.md`；「名称 / 多选 / 删除」三类交互的默认弹层约定（用户明确「以后默认都这样」）→ `docs/agents/ui-tokens.md`；抽屉行高 52px / 弹层按钮 40px / 金额输入「空值 + 聚焦全选 + 千分位」的控件尺寸与交互口径 → `docs/agents/budget.md`、`docs/agents/ui-tokens.md`；金额输入改为无框「灰色 0 + 后置 ¥ + 黑色数字」、分配预算拆成独立抽屉（实时状态栏、超额禁用确认、±100 与清零、滑动条 ±10 与 5 刻度、智能分配）→ `docs/agents/budget.md`。

**2026-11-13 r14 口径变更登记**：主卡术语「普通预算 / 分配预算」→「金额 / 详细分配」（抽屉标题同步）、所有弹层按钮统一可点/禁用双态（`components/button-styles.ts`）、详细分配抽屉重排（智能分配在标题右、状态栏居中、±100 文字按钮在金额右、4px 细滑动条 + 实时数字气泡 + 无字刻度、上限提示置标题下、引导条提示整行可展开）→ `docs/agents/budget.md`、`docs/agents/ui-tokens.md`；r14 双引擎验证脚本与两个踩坑记录 → `docs/agents/verification.md`。

**2026-11-13 r15 口径变更登记**（取代 r14 的详细分配抽屉规格）：特殊预算白卡顺序改为「预算名称 → 金额 → 详细分配 → 关联特殊标签 → 每月重复 → 参与者」、月度提示改「金额是本月上限，可以对各个分类做详细的分配。」；详细分配抽屉改为轻量版——标题居中、提示居左无框、删除说明书式引导条、汇总去橘底只凸显剩余额度、抽屉内零禁用态（数据层 `capOf()` 封顶到边界不加不减）、`BTN_TAP` 圆形浅色图标钮取代深色文字按钮、只留 `+` / `-` 图标配短按 ±10 与长按 10→50→100→500 加速与 `+N` 微反馈、滑动条无气泡纯数字悬浮且端点中心严格对齐、10 个空心圆刻度、`step=10` 且两侧无 ±10 → `docs/agents/budget.md`、`docs/agents/ui-tokens.md`；r15 双引擎验证脚本、三个测量坑与 WebKit 空白过渡态 → `docs/agents/verification.md`。

**2026-11-14 r16 口径变更登记**（在 r15 基础上继续收紧详细分配抽屉）：删除标题下「分项合计不能超过总额 ¥N」整块及 `cannot-exceed-total` / `over-allocated` / `remaining-allocatable` 语言键；状态区「剩余可分配」标签改与「已分配」同色（同一 `text-ink-secondary/80`），**只有 ¥金额 用品牌橙**，零总额时把「请先在上一层设置预算金额」直接放在这一行；分类行重排为「名称 + 金额（8px）成组 → 极淡虚线引导 → 全部按钮靠右」，解决名字与金额之间空白过大；滑动条 10 个刻度改为覆盖 0% / 100% 端点、与悬浮数字共用 `centerOf()` 滑块中心公式，展开区 padding `px-7 → px-3` 收窄两侧留白 → `docs/agents/budget.md`、`docs/agents/ui-tokens.md`；r16 双引擎 33/33 验证脚本、oklab 基础色比较的测量坑 → `docs/agents/verification.md`。

**2026-11-14 r17 口径变更登记**（在 r16 基础上改交互与颜色层级）：滑动条加 Snap，拖动 / 点击轨道 / 键盘微调统一吸附到最近的 **100 倍数**（`step` 仍为 10），轨道容器自己按落点比例 `onPointerDown` 实现**点击空白处直接跳转**；加减按钮短按从 ±10 改成 **±50**，长按 50 → 100 → 500；`BTN_TAP` 图标与 `BTN_COMPACT` 文字改**主文字黑**、分类标题改黑、金额下划线虚线与行内引导虚线全部删掉，**灰色只留给提示 / 状态文字**；修复 Chromium 长按松开后补派 `click` 多 +50 的问题（pointerdown + pointerup 双处 `suppressClickUntil` 抑制） → `docs/agents/budget.md`、`docs/agents/ui-tokens.md`；r17 双引擎 27/27 验证脚本与 Tailwind preflight `border-style:solid(width:0)` 测量坑 → `docs/agents/verification.md`。

**2026-11-14 r18 口径变更登记**（在 r17 基础上重排行布局与配色）：`+N` 微反馈修复偏位——去掉 `-translate-x-1/2`（Tailwind v4 的 `translate` 属性与动画 `transform: translate(-50%)` 叠加成 -100%），气泡中心严格对齐金额列正上方；金额列从紧贴分类名改为**固定分类名 60px 成列 + 两段 `flex-1` 留白把金额托到行中线略左**，按钮组位置完全不动；刚展开滑轨的 `¥0` 从「拖动才橙」双态改为**恒定 `text-brand` 橙**；状态栏「已分配 / 剩余可分配」及零总额提示全部 `text-ink-secondary/80 → text-ink` **黑字**，只有 ¥金额 保留橙；智能分配从标题右侧移到**分类卡片内部第一个 `data-card-head` 头部行右对齐**，标题行只剩居中 `h2` → `docs/agents/budget.md`、`docs/agents/ui-tokens.md`；r18 双引擎 29/29 验证脚本与 translate 叠加坑 → `docs/agents/verification.md`。

**2026-11-14 r19 口径变更登记**（在 r18 基础上把功能按钮移出白卡）：「智能分配」从白卡内部 `data-card-head` 头部行移到**卡片外面、卡片上方相邻的独立一行** `data-smart-row`（`h-7` / `mb-2` / `justify-end` / 透明无背景），白卡内不再有 40px 头部行；卡片首行恢复 `rounded-t-2xl`、空态占位补 `rounded-2xl`，标题仍居中独占一行 → `docs/agents/budget.md`、`docs/agents/ui-tokens.md`；r19 双引擎 30/30 验证脚本 → `docs/agents/verification.md`。

**2026-11-14 r20 口径变更登记**（7 项收口，细节按功能域写在对应文档，不在此展开）：① 弹层按钮全局放大到 `BTN_BASE` 48px / 15px、底部操作栏抽成 `SHEET_FOOTER`（含 iOS 安全区），预算 / 详细分配 / 选项 / 改名抽屉共用 → `docs/agents/ui-tokens.md`、`docs/agents/budget.md`；② 详细分配改为「单项 [0, 预算金额] 自由改、中途允许超额、确认按钮 `disabled={over>0}` 置灰，**不弹任何拦截提示**」（取代 r15 的动态封顶零禁用态），收紧汇总区到分类卡片的间距，滑轨渐变用 `backgroundSize/Position` 裁到 `[THUMB/2, 宽-THUMB/2]` 消掉两端凸出 → `docs/agents/budget.md`；③ 起始日提示改结构化渲染（日期单独成行 + `tabular-nums` + `nowrap`），底部 29–31 日说明保留（**r21 已按用户要求删除**）；④ 计入成员抽屉标题与设置行统一「计入成员」；⑤ 周期卡片分类明细只列「设了额度或当期有支出」的行 → ③④⑤ `docs/agents/budget.md`；⑥ iOS 首页整页下拉回弹：`html` 固定 + `overscroll-behavior:none`、首页滚动容器加 `overscroll-contain`；⑦ 左侧抽屉日历非本月已记录圈弱化、本月实心橙圈不变 → ⑥⑦ `docs/agents/ui-home.md`。

**2026-11-14 r21 口径变更登记**（起始日提示精简，细节 → `docs/agents/budget.md`）：删除橙框下方整段灰色 `start-day-note`（29–31 日说明 + 与橙框重复的生效规则），橙框从「两条解释句 + 两行日期」压成**两行 label-value**：`生效日` = 黑色生效日 + 灰「新周期」+ 黑色周期范围；`过渡期` = 黑色 gap 范围 + 灰「并入」+ 黑色归属月。**日期与数值一律 `text-ink` 加粗 `tabular-nums`，标签与说明一律 `text-ink-secondary` 灰色小字**，不再有整句解释、圆点 bullet 和折行；橙框自带 `mb-3` 与操作栏留白。中英语言键同步增删。（r22 已改为上下两段卡片，此处为历史。）

**2026-11-14 r22 口径变更登记**（起始日周期预览重做，细节 → `docs/agents/budget.md`）：① **默认态不再等用户选**，1 号直接显示「当前周期：11月1日 - 11月30日」+「无过渡期」，当前周期取账本覆盖今天的普通预算记录、无记录才按起始日现算；② 选中态橙框分**上下两段 + 一条极淡分隔线**：上半「生效日：11月15日」+ 浅灰副标题「新预算周期：11/15 - 12/14」，下半「过渡期：11月1日 - 11月14日」+ 浅灰副标题「此期间花费将计入上期（10月）预算」；**过渡期口径改为「当前周期起始 → 生效前一天」**（不再是今天起算）；③ 主标题里与日历选中项对应的日期用 `text-brand` 橘色呼应（选中态生效日 / 默认态周期起始日），实测与日历 `bg-brand` 同色。中英语言键整套替换。

**2026-11-14 r24 口径变更登记**（**r23 整体回滚**）：用户反馈「感觉日历的偏右边了」「日历原来的挺好的啊」，**r23 的数字光学居中改动全部撤销**，起始日 1–31 格子与左侧抽屉日历恢复到 r22 的原始渲染：不包 `dayLabel` span、不加 `pb-[2px]` / `-top-px` / `tabular-nums`，数字直接由 `line-height` 居中。**以后不要再给这两处日历数字做像素级光学补偿或等宽数字处理**，视觉上用户认的是原始效果。滚轮日期选择器始终未改。r23 的验证断言 / 截图 / 实验脚本一并作废，相关口径已从 `docs/agents/ui-tokens.md`、`ui-home.md`、`budget.md`、`verification.md` 删除。

**2026-11-14 r25 口径变更登记**（**Widget 功能整体删除**）：用户要求「widget 功能删掉」，按**无迁移、彻底删除**处理，`apps/cent/src` 里已无任何 `widget` 字样。删除 `components/widget/`（DSL runner / compile、设置页、编辑器、预览共 15 个文件）、`hooks/use-widget.ts`、`assistant/tools/widget-tool/`（AI `createWidget` 工具与 skill）；移除首页「小组件」横向滑动区、左侧抽屉「Widget设置」入口、`meet-widget-api` 推广位、统计筛选视图的 `widget-*` 自定义模块、main-layout 两个 Provider；数据层删 `GlobalMeta.widgets` / `PersonalMeta.homeWidgets` / `BillFilterViewModule` 的 `widget-${string}` 与 `Widget` 类型，预设导出/合并的 `widgets` 段与 `WIDGETS_WOULD_CHANGE` 风险、`measurement` 的 `widget_count` / `home_widget_count` 与 `widget` / `home_widget` 埋点、zh/en 各 16 个语言键。**旧账本残留的 `widgets` / `homeWidgets` 字段不做迁移，读侧直接忽略**（多余字段不解析、不报错）。细节按功能域：数据字段 → `docs/agents/domain-model.md`；首页与设置入口 → `docs/agents/ui-home.md`；统计筛选 → `docs/agents/ui-ledger-stat.md`；验证 → `docs/agents/verification.md`。

**2026-11-14 r26 口径登记**（已被 r27 取代，仅保留删除项）：登录页删掉黑色遮罩、深棕色 `bg-field` 品牌区、通用 `Button` 胶囊按钮、`beta` 角标、下划线「或者使用现有的token」链接；这些**不要恢复**。五种登录方式、手动 Token、埋点、PWA 提示、App 下载、介绍链接、协议全部保留；`data-login-page` 验证探针保留。r26 的暖米底 / 居中大品牌头 / 单张五行连卡版式已在 r27 替换。

**2026-11-14 r27 口径变更登记**（**登录页按预算管理 / 分类管理重新设计**，细节 → `docs/agents/ui-login.md`）：用户再次要求「参考分类管理和预算管理，重新设计重构下登录页」，r26 只学了「分组小标题 + 单张白卡」一半，r27 按参考页完整结构重做 `components/login/index.tsx`：① 根节点挂 **`dp-drawer-surface`**，改走预算管理同款中性灰白体系（亮色 `#f4f4f4` 底 / 纯白卡 / 近黑字），**不再用首页暖米 `bg-ground`**；该作用域只在亮色生效，深色自动回落全局暗色；② 补 `PopupLayout` 同款 **17px 居中顶栏「登录」**（左 36px 圆形品牌图标占位）；③ 居中 84px 大品牌头压成**一张一行式概览卡**（44px 图标 + 16px 名 + 11px 介绍 + 卡内 `border-t` 橘色 PWA 脚注）；④ 登录方式按 **云端仓库 / 自建服务 / 本地使用** 拆成三组「卡外 12px 小标题 + 一张 `rounded-2xl` 连卡」，行数 2/2/1；⑤ 行对齐 `SettingRow`：`min-h-[58px]`、32px 图标块、`15px font-medium` 标题 + 11px 灰说明 + 右侧值 / Token 胶囊 + chevron，离线模式加「无需账号」右值；⑥ GitHub 换**官方 Octocat 实心 SVG**（`icon-[lucide--github]` 是猫头轮廓，18px 下像竖拇指）。整行 `absolute inset-0` 主按钮 + `relative z-10` Token 按钮的免嵌套结构、五种方式、埋点、loading、下载 / 介绍 / 协议全部保留。zh/en 新增 5 键（`login-page-title` / `login-group-*` ×3 / `login-no-account`）、删除 `login-methods`。双引擎 + 360/430 视口 + 深色回归通过 → `docs/agents/verification.md`。

**2026-11-15 r28 口径变更登记**（**APK 行车能耗有数据态实测 + 车辆页重构收尾**，细节 → `docs/agents/ui-vehicle.md`，采集方法 → `docs/agents/homefull-reference.md`，验证 → `docs/agents/verification.md`）：用户要求「有数据的部分去 apk 测试」，在模拟器 `emulator-5554` 真机造出 3 台车（燃油 / 纯电 / 混动）+ 多条加油充电记录，采到空态、有车无记录、1 条 / 2 条记录、跨月双柱、三种能源类型与四类抽屉共 20+ 张 1080×2340 截图，整合图 `r28-apk-vehicle-states.png` / `r28-apk-vehicle-interactions.png`。**实测纠正了之前只靠空态的推断**：主卡是「平均油耗大字 + 三栏」、有独立「油耗趋势」卡、记录卡有「距上次加油 N km」、纯电走 kWh/100km 蓝线、混动是油电左右双栏且记录抽屉有「加油 / 充电」段控、记录必须标「加满了」才参与油耗分段、还有「同步记账 / 付款账户」与账本联动。这些与当前实现的差异已逐条列在 `ui-vehicle.md`，**未经确认不要自行补齐**。本轮同时把上一轮被打断的车辆页收尾：补齐 zh/en 各 29 个 `vehicle-*` 语言键（此前会显示 key 字符串）、`dialogTitle` 英文改中文、车辆卡横向滚动区加 `flex-shrink-0` 修复被纵向 flex 压成 0 高、三栏指标 label 缩短免截断。示例数据在离线空账本自动载入（2 台车 / 15 笔记录，可一键清除），`pnpm lint` 通过、完整重建 200 文件、5173 与 dist 哈希对齐、WebKit 402×874 回归 `errors: []`。**没有 commit / push / 部署，Cloudflare 线上仍是旧版。**

**2026-11-15 r29 口径变更登记**（车辆模块四项改造，细节 → `docs/agents/ui-vehicle.md`，验证 → `docs/agents/verification.md`）：① **示例数据只能在「数据管理 → 载入示例数据」由用户主动载入**（用户明确「不要自己默认载入」）：删 `vehicle/sample-data.ts` 与车辆页自动载入 / 橙色提示条 / 清除入口，`createSampleData()` 直接产出 `entries.vehicle`（3 台车 + 19 笔记录，覆盖燃油 / 纯电 / 混动、油号、加满标记），经 `importFromPreviewResult({ strategy: "overlap" })` 覆盖写入 `entry: vehicle` 桶；② **车辆页与预算管理同款弹层**：删 `/vehicle` 路由与 `app-chrome` 特判，新增 `components/vehicle/page-form.tsx` 的 `showVehicle()` 全屏 `createConfirmProvider`，入口仍是左侧抽屉宫格；③ **记一笔抽屉按 APK 字段**：底栏「记一笔」、类型段控按车能源类型过滤、燃油显示 92#/95#/98#、日期标题「日期」且必须传 `displayFormatter={() => ""}`（dayjs 未加载 `localizedFormat` 时会把 `L` 当字面量输出，这是「日期后面有个 L」的根因）、里程表度数 + 后置 `km` + 灰占位「仪表盘总里程」、本次行驶 / 距上次、金额 `¥`、备注「选填」只保留 placeholder 一份、加满了 / 充满了；④ **主卡合并 + 顶部胶囊联动**：「我的车辆」与「能耗概览」合成一张卡，顶部「全部 / 每台车 / 添加车辆」胶囊，概览 / 每月花费 / 记录列表随筛选联动，混动车油电双栏。zh/en 语言键同步（写入必须用独立 `.py` + `write_bytes` 保持 LF）。`pnpm lint` 通过、`--no-emptyOutDir` 完整重建（`dist` 被占用时 `mv` 与 safe-delete 都会失败，见 `verification.md`）、5173 与 dist 哈希 `index-UGexWI5p.js` 对齐、Chromium 402×874 **45/45**、零 pageerror；WebKit 那轮 40/44 的 4 项失败全是脚本层误报（placeholder 不进 innerText、默认车是混动、Radix 抽屉按钮 unstable、reload 打断 module import），脚本已逐条修好，备注去重后**未复跑 WebKit**（用户要求清理内存、少开浏览器）。没有 commit / push / 部署。

**2026-11-15 r30 口径变更登记**（细节按功能域：导航 → `docs/agents/navigation.md`，车辆 → `docs/agents/ui-vehicle.md`，验证 → `docs/agents/verification.md`）：① **全屏二级页全部改成独立路由页 + 右侧滑入**（用户明确「都要改，但有一些是抽屉的不用改，二级页面的话就得改」）：`createConfirmProvider` 增 `routePath` 分支，由 `location` 驱动、`.dp-route-from-right` 260ms 动画、返回走 `navigate(-1)`，无遮罩无圆角；`confirm/navigation.ts` 做模块级导航桥；12 个全屏列表页接入（`/vehicle` `/budget` `/category` `/tags` `/members` `/loan` `/currency` `/data` `/preset` `/settings` `/auto-rules` `/scheduled`），底部抽屉 / 小弹层 / 带返回值的表单一律不接；`route.tsx` 用 `path="*"` 兜底保留 TabPager 实例。**UWP 的 `SlideNavigationTransitionEffect.FromRight` 在 Web 里用 CSS keyframes 等价实现，不要去找这个 API**。② **记一笔抽屉**：顶部 tab 固定 5 项且「加油 / 充电」都在，选中类型决定下面车辆行里能看到哪些车（加油=燃油+混动、充电=纯电+混动），点车辆不改变上面的类型；打开时默认带出上一次加油 / 充电的类型与油号 / 加满 / 车辆等同类型上次记录的有价值选项（保养维修不参与默认）；日期滚轮 `title` 传「日期」（默认是全局 `t("time")` =「时间」）；「距上次 X」按当前选中类型并找上一条同类型记录，里程改灰；选项字号 12→13px / 11→12px、字重 medium、选中态加细描边，垂直 padding 收 1–2px 保持整行高不变。③ **主卡**：按筛选范围内是否有能加油 / 能充电的车分别显示平均油耗 / 平均电耗（全部态双栏、单车态只显示对应一项），删「添加爱车照片」占位，显式写出「按上次加满计算 · 日期 里程」锚点，记录行加「加满了 / 充满了」标记，让 `isFull` 的分段作用可见。④ 车辆页删车 / 删记录改用 `createDeleteConfirm()`，与「删除特殊预算」同款白卡二次确认。zh/en 共增 6 键（保持 LF）。**验证：WebKit 46/46 + Chromium 46/46、零 pageerror**（用户明确「WebKit 也要验证」）；为控内存两个引擎**串行**跑、跑完立即关，WebKit 跳过截图（连续截图会把内存紧张下的浏览器拖崩）。**关键环境事实：5173 跑的是 `dist` 预览（`index-*.js` 入口），不是 dev server——改完源码必须重新 `vite build` 才会被验证脚本看到**；`playwright-cli open` 的输出不能接 `head`，管道提前关闭会带走浏览器进程。`pnpm lint` 通过（368 files）、`--no-emptyOutDir` 重建 `index-B3T5R_5F.js`、5173 与 dist 对齐。本轮收尾后按用户要求提交、push 并合入 `release/next`（见下条）；**仍未部署，Cloudflare 线上是旧版**。

**2026-11-15 r30 提交登记**（用户明确「提交并 push，同时合并到 release-next」）：仓库里发布分支实际叫 **`release/next`**（`origin/release/next`），没有 `release-next`，不要新建同名分支。本次把 r26~r30 累积的全部工作区改动一次性提交到 `feat-ui-261106` 并 push，再用 `--no-ff` 合入 `release/next` 后 push `origin/release/next`；合并前两分支树内容一致，只有历史 merge commit 差异，无冲突。**部署仍需单独明确要求**，历史登记里「没有 commit / push」描述的是各自当时的状态，不是当前状态。
**2026-11-15 22:31 口径变更登记**（**登录二级页对齐登录页 + 选择账本/身份合并为一个页面，同 worktree，amend 登录提交**，细节 → `docs/agents/ui-login.md`，验证 → `docs/agents/verification.md`）：用户反馈——① 二级路由页「常用服务商点开后背景色变了，就要和登录页一个背景色」，下划线「不一定要顶到两边这么长，太丑，参考主流 iOS 登录页弄得高级点」，「取消按钮去掉，就一个确认按钮」；② 「选择账本和选择用户可以直接做成一个页面」。本轮落地：**背景对齐** = web-dav / s3 表单内包一层 `dp-drawer-surface bg-ground text-ink` 全幅 `min-h-full` 列（根因：外层路由包裹只有裸 `bg-ground`，缺 `dp-drawer-surface` 时亮色回落暖米 `#fbf7ef`；**`dp-drawer-surface` 只覆盖令牌变量，必须有元素实际涂 `bg-ground`**——第一版只挂 surface 没挂 bg-ground，照旧漏暖米，构建后复查看穿）；**字段列收窄居中 `max-w-[300px]`**（下划线不再顶满两边，常用服务商 chips 改白色描边胶囊整组居中；两文件重复的 FieldRow 抽到 `components/login/field-row.tsx`，细线减淡为 `border-ink-secondary/15`）；**取消按钮删除**，底部只留一颗 54px `BTN_PRIMARY` 确认（返回走左上角悬浮圆钮）。**选择账本 + 选择用户合并**：`book/form.tsx` 重写为「账本」「用户」两个 iOS 分组列表（灰组标签 + `rounded-2xl` 白卡 + `divide-y` 细线 + 选中行品牌色对勾 + 卡内「+ 新建」加行弹 prompt），点按只改本地选中态、**底部一颗 54px 确认统一生效**（账本单本自动预选、身份默认第一个候选；未齐时禁用）；需要身份时**先同步写 config.customUserName、再直接 setState 写 currentBookId、最后 `setCurrentUser` 统一别名登记 + reload**——`switchToBook` 与 `setCurrentUser` 都会 `location.reload()`，顺序错了身份写入会被 reload 打断；`book/index.tsx` 门条件扩为「无账本 或 共享账号缺身份」，`components/book/select-user.tsx` 删除、main-layout 移除挂载；从个人页等入口 `showBookGuide()` 进入时提供左上返回、无改动确认即关页；删账本只删到当前账本才回引导态。zh/en：增 `login-finish-setup` / `login-section-books` / `login-section-users` / `please-input-user-name`，删 `custom-user-name` / `custom-user-name-tooltip`（placeholder 保留给 prompt），S3 可选字段标签去掉「(可选)」后缀（「选填」统一由 FieldRow 渲染，避免叠字）。验证：`verify-login.js` / `verify-login-responsive.js` 扩断言（路由页背景实测 `rgb(244,244,244)`、取消 count=0、字段列 300 居中、确认底隙 20、合并页分组与禁用态、深色回落 `rgb(23,19,15)`），WebKit / Chromium / 360-430 / 深色全 `errors: []`；**坑**：locator `boundingBox()` 在路由页入场 transform 瞬间偶发返回 null（断言改 `evaluate` 直读几何）、`dp-drawer-surface` 必须配实际涂色元素。构建 `index-BQ03HoXt.js`、5174 与 dist 哈希对齐；主工作树未动、未 push。

**2026-11-15 16:51 口径变更登记**（**登录页重构 + 登录方式路由页 + 路由适配层，在 worktree `feat-login-261115` 实施**，细节 → `docs/agents/ui-login.md`，验证 → `docs/agents/verification.md`）：用户反馈 r27 的登录页「不像个登录页」，本轮重排为典型登录页结构——**删设置式顶栏与一行式品牌信息卡**，改居中品牌欢迎区（72px 图标 + 22px 应用名 + 13px 灰标语，无卡片直接铺在 `#f4f4f4` 底色上，顶部 padding safe-area+40px）；主操作为**五颗 54px 大按钮一列堆叠**（`BTN_*` 加 `h-[54px]!`，用户口径「按钮比例按窄屏、高度宽度比例要对」：54/402 ≈ 48/360；BTN_* 常量自带 h-12 同属性冲突，必须用 Tailwind v4 后缀 `!` 覆盖）：**Gitee 橙色主按钮、GitHub 白色次按钮、WebDAV 白色、S3 白色、离线模式白色压轴放最下**（用户口径：国内访问 GitHub 不便故 Gitee 优先；离线模式位置两度调整后定为压轴——「离线使用还是放在最下面」，右值「无需账号」挂在按钮右缘 `value` 槽位）；「现有 Token」胶囊叠按钮右缘（兄弟节点绝对定位，非嵌套 button）；离线按钮右值「无需账号」与 Token 胶囊**同几何**（px-2.5 py-1 text-[11px] rounded-full）但用中性灰底 `bg-ground-muted` 表明不可点；**WebDAV / S3 直接以大按钮进入各自的二级路由页**，「其他方式」分组与行卡已移除（`login-more` / `GroupTitle` / `CARD` / `LoginRow` 删除）。**上下比例（用户 2026-11-15 追加口径）**：只有核心内容块 `my-auto` 垂直居中，**页脚钉在页面最底部**，PWA「添加到主屏幕」提示保持在下载 / 查看介绍按钮的**上面**（页脚内顺序：提示 → 下载圆钮 + 查看介绍 → 协议——「要在最下面」指的是页脚整体钉底，用户明确纠正过提示的行序；溢出时 auto margin 归零，窄屏比例不变，`flex-1` 撑底已删除）。**欢迎区尺寸对齐窄屏视觉比例**（用户反馈 402 截图元素比 360 截图「小气」）：图标 72→80px（rounded-[24px]）、应用名 22→24px、标语 13→14px、按钮/行内图标 18→20px——80/402 ≈ 72/360 ≈ 0.2，只在本页生效不动全局令牌；标语 `app-introduce` 改为「多人协作家庭管理App」（该键全应用仅登录页使用，en 同步 "Collaborative Family Management App"）。**登录入口点进去的弹层 / 页面按用户反馈重设计**：共用 `modal.prompt` 标题 16px semibold + 输入框 h-10 + 取消/确认 48px `BTN_SECONDARY`/`BTN_PRIMARY` 等宽成对（该 prompt 全应用 30+ 处调用，一并补齐 r20 弹层按钮约定）；**WebDAV / S3 从底部抽屉改为二级路由页**（用户多轮口径演进：抽屉 → 路由页 → 「只放品牌图标、一框一输入不要卡片」→「保留 56px 居中图标方案」）：`routePath: "/login/webdav"` / `"/login/s3"`，页面 = **无标题栏 + 居中 56px 图标（rounded-[18px]）+ 方式说明一行** + **`LoginField` 字段块**（`components/login/login-field.tsx`：label 在上 + `loginInputClass` 输入框（`bg-ground-muted/60 border-ink-secondary/30` 加深对比，用户口径）+ 错误红字垫底，一个输入框一条，弃行卡）+ 底部**「测试连接」（`login-test-connection`，只校验不落库，成功 / 失败 toast）+ 取消 / 确认 54px 同一行左右排布**；**常用服务商预设**（WebDAV：坚果云完整地址 / Nextcloud、群晖带中文占位模板；S3：AWS / 阿里云 OSS / 腾讯云 COS，点击填入标准地址）；**必填 / 选填标注**（LoginField `required` 红星 / `optional` 「选填」）。路由页拿不到 edit 注入，**表单自持完成链**——zod → `checkWebDAVConfig`/`checkS3Config`（失败 sonner toast 留在本页）→ `saveWebDAVAccount`/`saveS3Account`（写库 + reload），账号存取下沉到 `api/endpoints/*/account.ts`（endpoint `login()` 只负责 openRoute，规避 form→endpoint→modal→form 循环依赖）。**昵称（customUserName）从登录表单移除，身份改由登录后「选择账本 → 选择用户」流程决定**：endpoint 新增 `getUserChoices`（自己回退 + 账本别名）/ `setCurrentUser`（写 config.customUserName + 账本别名 + reload）；`components/book/select-user.tsx` 全屏页（z-3，webdav/s3 且 config 无 customUserName 时出现，列别名 + 新建）；账单 creatorId 语义不变，无数据迁移；BookGuide / BookForm 重设计为登录页同款全屏页（56px 图标 + 居中标题 + 行卡账本列表 + 54px 新建账本）。「现有 Token」prompt 保持居中弹窗（16px 标题 + h-10 输入框 + 48px 双态按钮，全应用 30+ 处共用）。**路由基础设施按用户四条建议优化**：新增 `confirm/route-modal.ts` 适配层（`openRoute` / `useRoutePage(routePath, fallback)`），provider 只做渲染宿主、消除命令式与 location 双源；关闭流程 = `requestClose`（幂等）→ `.dp-route-to-right` 右滑出场 → `onAnimationEnd`（`e.target === e.currentTarget` 排除子元素动画）→ 回退；回退守卫用 **`location.key !== "default"`** 判断内部历史——**MemoryRouter 不写 window.history，`window.history.state.idx` 恒空，后退守卫不能读它**；栈底（刷新 / 深链理论场景）`navigate(fallback, { replace: true })`；`prefers-reduced-motion` 跳过动画直接关；系统返回 / 边缘手势走 popstate 直接卸载、无出场动画——接受该差异并在文档注明；12 个既有路由页零配置改动，自动获得出场动画与守卫返回。**r26 的「不要恢复居中大品牌头」禁令就此解除**（黑色遮罩 / 深棕品牌区 / 通用 Button / beta 角标 / 下划线 token 链接仍禁）。**发现 r27 声称新增的 13 个 login-* 语言键实际从未落盘**（页面一直显示 key 字符串），本轮补齐 zh/en（`login-page-title` sr-only / `login-more` / `login-token` / WebDAV、S3 两个 hint / `login-no-account`），`login-group-*` 三键随组合并废弃、`login-offline-hint` 随离线升大按钮删除。登录逻辑、埋点、`data-login-page` 探针、页脚全部不动。本轮在独立 worktree（`E:\code\_cent_login`，分支 `feat-login-261115`）进行，登录提交已 rebase 到 `feat-ui-261106` 的 r29/r30（48b7866，含 confirm 导航桥改造）之上并全量回归；主工作树 `E:\code\_cent_analysis` 未做任何改动。**执行约束（用户 2026-11-15）**：安装依赖走国内镜像（npmmirror / Playwright 走 `cdn.npmmirror.com`）；构建 / 验证前先扫进程错峰（其他会话可能同时在构建），lint / build / 双引擎验证严格串行，绝不并行。

**2026-11-15 r31 口径变更登记**（细节 → `docs/agents/ui-vehicle.md`，验证 → `docs/agents/verification.md`）：① 记一笔顶部类型段控改用**记账「记一笔」同款**（白底胶囊容器 + `ring-1 ring-rule/50`、选中 `bg-ground-muted text-ink`、`h-9` 36px / `text-sm`），不再用白底阴影凸起；② 燃油 / 纯电单车态主卡右侧补「最近一次 / 均价 / 本月」三行辅助读数消掉留白，混动双栏不变；③ 删记录 / 删车辆移到各自**编辑抽屉「保存」下方红字**，页面记录行与主卡右上角不再有垃圾桶，二次确认仍用 `createDeleteConfirm()` 同款白卡（Provider 挂在抽屉内部、`onDelete` 由页面经 `edit` 注入）；④ 记录行「距上次 X」改按**同类型**找上一条并补天数（`tripInfo(records, current, type)` 返回 `days`）；⑤ **统计层修真实误差**：加满法按 `vehicleId` **分别切段**（原「全部」态跨车混算里程表，数值不可用）、油电均价分开算（原来把 L 与 kWh 相加）、加权平均改用总量 / 总里程、未加满油量进 `pending*` 并在主卡提示「下次补满后计入」；锚点改取分段起点，不再跨车取最近两笔加满。**算法口径：两次都真加满时剩余油量互相抵消，剩余油量本身不引入误差；误差来自误标加满、漏记加油、混动车油电共用里程分母、以及跨车混算。** 示例数据补 1 笔未加满加油与 1 笔第二笔维修，用于演示 pending 与「距上次维修 X km · Y 天」。zh/en 各增 7 键（保持 LF）。`pnpm lint` 通过（368 files）、`--no-emptyOutDir` 重建 `index-DWVHjFDc.js`、5173 与 dist 对齐、**双引擎串行 WebKit 34/34 + Chromium 34/34、零 pageerror**（控内存：WebKit 跳过截图）。**本轮未 commit / push / 部署**：r30 已提交历史改动，r31 是新增未提交改动。

**2026-11-15 r32 / r33 口径变更与提交登记**（细节 → `docs/agents/ui-vehicle.md`，验证 → `docs/agents/verification.md`）：① r32 用户问「不加满会计算吗」→ 加**估算兜底**：某车某能源凑不齐两次加满但有 ≥2 条补能记录时，按「第 2 条起累计加注量 ÷ 首末里程差」造 `estimated` 段，主卡大字前标 `≈` 并显示「按累计补能量估算 · 补满两次后转精确」，凑齐真加满自动切回精确；顺手修双栏视图油/电 `pending` 写死为 0、估算与锚点提示两行打架、估算段仍显示旧「最近一次」。示例数据小蓝 6 笔充电改为未充满用于演示。② r33 用户明确「默认不勾加满了」：记一笔抽屉新增时 `isFull` 默认 `false`、切「加油 / 充电」tab 也重置为不勾、**不再「记住上次」的勾选**，编辑已有记录沿用原值；录入侧去掉「误标加满」这个风险最高的方向，配合 r32 估算不会让主卡空着。r32 验证：`pnpm lint` 368 files、一次构建 `index-2f9dqOqO.js`、5173 与 dist 对齐、双引擎串行 **WebKit 37/37 + Chromium 37/37 零 pageerror**，概览图 `r32-vehicle-overview.png`（截图只在 Chromium 出、纯 Pillow 拼图）。**r33 这一行改动按用户明确要求「改动后不用验证了」，未跑构建与浏览器验证**，故 5173 的 dist 仍是 r32 的 bundle。随后按用户要求把 r31~r33 全部工作区改动一次性提交到 `feat-ui-261106`、push，再 `--no-ff` 合入 **`release/next`**（远端实际名，没有 `release-next`）并 push。**部署仍需单独明确要求，Cloudflare 线上仍是旧版**；另 `--no-emptyOutDir` 已让 precaches 累积到 376 条 / 11.9 MB，正式部署前需先停 5173 再彻底清 `dist`。

**2026-11-15 r34 口径变更登记**（本轮起工作区是 **git worktree `E:\code\_cent_currency`**，分支 `feat-currency-261115` 基于 `release/next`；主仓 `feat-ui-261106` 另有他人未提交改动，不要动；编号说明：车辆能耗轮次已用编号 r31~r33，货币轮原记 r31 / r31b、随合并改记为 **r34 / r34b**）：① **记一笔币种抽屉加搜索**（用户确认「币种抽屉搜索名称」）：`bill-editor/currency-sheet.tsx` 标题右侧 `w-[116px]` 圆角搜索框替代关闭 X（关抽屉靠点遮罩），匹配名称 / 代码 / 符号，命中后平铺 2 列结果格、空态 `search-empty-results`，与分类抽屉同款交互；② **汇率与货币页整体重构**为预算/车辆管理同款中性灰白路由页（`backStyle="circle"` + `dp-drawer-surface`）：四段「卡外小标题 + FormCard 白卡」＝本位币 / 快捷币种 / 自定义币种 / 汇率（r34b：**自定义币种在汇率上方**，汇率 30 行太长会把它埋掉；**新增按钮在页面右上角** `data-currency-add`），本位币与快捷币种走选项抽屉（**r34b：两处都 `searchable: true`**，`option-sheet.tsx` 新增可选搜索框，只过滤可见项不影响 selected；本位币是**单选语义复用多选抽屉，取 result 里非当前本位币的最后一个**），手动汇率与自定义币种弹层改底部抽屉（SHEET_FOOTER + BTN_BASE 成对），删除走 `createDeleteConfirm` 二次确认，汇率显示 4 位有效数字 + 手动「徽标」，删掉旧 Select / Popover / ghost 体系，页脚 ecb 来源说明；zh/en 新增 5 键（`base-currency-switch-hint` / `custom-currencies` / `custom-currencies-empty` / `manual-rate` / `rate-invert`）。细节与手动汇率换算方向口径 → `docs/agents/ui-currency.md`；③ **构建纪律（用户明确）**：装依赖用国内镜像（`--registry=https://registry.npmmirror.com`，本轮全部命中全局 store 零下载）；构建 / 验证前先查有没有其他会话或应用在构建（`Get-CimInstance` 扫 vite/tsc/playwright、`Get-NetTCPConnection` 看 5173-5175），一律串行。本轮 5173 / 5174 均被并发会话占用（且在验证期间两次重建挤哈希），本会话 preview 绑 **5175**；④ 验证：`verify-r31.js` 42 项断言 **Chromium 42/42 + WebKit 42/42、errors: []**；WebKit 坑（行点击间歇吞掉要 `openSheet` 重试 + fill 前 count 守卫、个人 meta 写入要 `waitForFunction` 轮询、kurrency 汇率源离线重试风暴要用 `page.route` fulfill 合法响应掐断、open 输出不能接 findstr 管道）→ `docs/agents/verification.md`。本轮收尾后按用户要求提交并 push，同时把 `release/next` 最新合回 feature 分支（见下条）；**仍未部署，Cloudflare 线上是旧版**。

**2026-11-15 r34 提交登记**（用户明确「拉取 next 最新代码解决冲突并 push」）：r34 / r34b 全部改动一次性提交到 `feat-currency-261115` 并 push origin；随后把 `origin/release/next` 最新（上述车辆能耗轮次 r31~r33 的提交 `adf872f` 与合入记录 `a9c13cc`）merge 回 feature 分支，冲突落在 AGENTS.md / `docs/agents/verification.md`（双方登记同日撞号 r31，货币侧改记 r34 / r34b 后取并集），zh-en 语言包双方各自新增语言键由 git 自动合并，车辆与货币组件代码零重叠；**随后按用户明确要求「push 并合并」把 feature 分支 `--no-ff` 合入 `release/next` 并 push（本登记更新先随 docs 提交进 feature 分支、再随合并进入 next）；未部署，Cloudflare 线上是旧版**。

**2026-11-15 22:45 合并登记**（登录分支同步 next 最新，worktree `feat-login-261115`）：把 `origin/release/next` 最新（`bc4ed99`，含车辆能耗 r31~r33 与币种抽屉搜索 r34）merge 进登录分支；唯一内容冲突落在 `docs/agents/verification.md`（双方都在文档尾部追加各自验证段），取并集保留两侧；AGENTS.md 与 zh/en 语言包由 git 自动合并（并集校验通过：`login-finish-setup` / `login-section-books` / `login-section-users` / `please-input-user-name` 与币种键俱在、JSON 合法）；车辆 / 货币组件与登录组件零文件重叠，仅全量 bundle 一起变更——合并后按口径重跑 lint、构建与登录双引擎回归。**本轮只做分支内合并提交，未 push、未改动 release/next**。

**2026-11-15 23:02 口径变更登记**（**选择账本页补返回按钮**，用户问「选择账本为什么没有返回按钮」，细节 → `docs/agents/ui-login.md`）：合并引导页（`book/form.tsx`）的左上角圆形返回**改为始终显示**——从个人页等入口进入（`onCancel` 有值）仍是关页返回；**登录后的首次引导返回 = 退出登录回登录页**（登录是流程的一环，要允许反悔换一种登录方式；不能只隐藏登录层，因为登录层仅在未登录时渲染），走新增的 `utils/logout.ts` `logoutWithConfirm`（与设置页 `toLogOut` 共用同一套：`logout-warning` prompt 确认，取消静默留在原地 → beforeLogout 快照 → 端点 logout → 清空本地存储 → afterLogout 恢复上次连接信息 → reload；WebDAV / S3 的连接信息由快照保留，重填成本低）。`verify-login.js` 补断言：返回 → 弹「退出登录」确认 → 确认后回到登录页。

**2026-11-15 23:10 提交与发布登记**（用户明确「push 并合到 next 然后发布」，worktree `feat-login-261115`）：把登录提交（b26e3b2）、next 同步合并（b78bbdc）与返回按钮修复（ecdb17a）push 到 `origin/feat-login-261115`，再 `--no-ff` 合入 `release/next`（cd1bb7c）并 push；随后按 `docs/agents/deployment.md` 口径用 wrangler 发布 Cloudflare Pages（`cent-test` / `--branch main`，本部署为用户本轮明确要求）——**已发布并核对**：线上主域 `cent-test.pages.dev` 的主 bundle 为 `index-De2v6Ox0.js`（与本轮构建一致）、`<title>胖记</title>`、zh 语言分片原始字节与本地一致且含「完成设置 / 多人协作家庭管理App」新文案。校验坑（已记 `deployment.md`）：PowerShell `Invoke-WebRequest` 的 `.Content` 解码会让语言分片哈希比对全错，须用 node fetch / curl 原始字节。登录工作自此进入 next 并上线。

## 1. 项目速览

- 名称：**胖记**（用户明确：没有英文名，界面与 PWA 清单里不出现 Cent / 日计；仓库名、包名、上游链接仍是 Cent，不要改）。纯前端 PWA 记账应用，数据存在用户自己的 GitHub / Gitee / WebDAV / S3 仓库或本地离线库中，没有业务后端。
- 本仓库：`E:\code\_cent_analysis`，是开源项目 `glink25/Cent` 的二次开发 fork（仓库目录、包名、上游链接保留 Cent 原名，只有**界面上的应用名**是胖记）。当前在做三件事：移动端暖色 UI 对齐参考应用「家小满」（规格见 `docs/homefull-style-spec.md`），新增随账本多人同步的生活模块（物品清单 /medical 医疗 /vehicle 车辆），以及品牌替换（橘猫图标 + 应用名胖记）。
- 技术栈：React 19、TypeScript 5.8、Vite 8、Tailwind CSS 4、React Router 7、Zustand 5、Radix UI、IndexedDB（idb / zustand-indexeddb）、Workbox。
- 包管理：pnpm 10.15.1（monorepo），Biome 2.2.2 负责格式化和 lint。
- 上游线上版本：https://cent.linkai.work
- 本 fork 的 Cloudflare Pages 测试环境：https://cent-test.pages.dev

## 2. 仓库与分支

| 项 | 值 |
| --- | --- |
| 本地路径 | `E:\code\_cent_analysis` |
| origin（自己的 fork） | https://github.com/wxtttt/Cent.git |
| upstream（上游） | https://github.com/glink25/Cent.git |
| 上游默认分支 | `main`（本地 `main` 跟踪 `upstream/main`） |
| fork 集成分支 | `release/next`（跟踪 `origin/release/next`） |
| 当前工作分支 | `feat-ui-261106` |

- 分支命名沿用 `feat-<描述>-<yymmdd>` / `fix-<描述>-<yymmdd>`，不使用多级命名。
- 拉取上游：`git fetch upstream`，需要同步时把 `upstream/main` 合入当前分支。
- 动手前先 `git status` / `git diff` 了解上下文；不要清理、回滚或覆盖别人的未提交改动，也不要把 `.playwright-cli/` 等自动化日志目录提交进仓库。
- 不要主动 commit、push、提 MR 或部署，除非用户明确要求。

## 3. 目录结构

```
_cent_analysis/
├─ apps/cent/                 主应用（Vite React SPA）
│  ├─ src/
│  │  ├─ main.tsx            入口：初始化 i18n、PWA、路由、agent-api
│  │  ├─ route.tsx           MemoryRouter 路由：4 个 dock 页签 + /search + 12 个二级路由页（r30 起，见 navigation.md）+ path="*" 兜底
│  │  ├─ pages/              home 首页、ledger 记账、stat 分析、search 搜索、inventory 物品、medical 医疗、vehicle 车辆（r30 起为 /vehicle 路由页）
│  │  ├─ layouts/            main-layout（全局 Provider）、popup-layout（二级页/底部抽屉壳）
│  │  ├─ components/         业务组件与 ui/ 基础组件；fork 新增：ticket-card 票券卡、segmented-tabs 分段控件、
│  │  │                      empty-state 吉祥物空态、form-rows 行卡片表单基元、wheel-date-picker 滚轮日期选择器、
│  │  │                      auto-rule 自动记账规则、loan-calculator 贷款计算、
│  │  │                      inventory/ medical/ vehicle/（表单 Provider）、app-chrome（含 dock 加号分派）
│  │  ├─ store/              Zustand：ledger、book、user、preference、currency、assistant 等
│  │  ├─ ledger/             账单/分类/标签/预算等领域模型与查询；loan.ts 贷款计算、auto-rules.ts 规则引擎
│  │  ├─ database/           IndexedDB、增量 patch、sha、stash、调度
│  │  ├─ api/                storage worker、同步端点（github/gitee/webdav/s3/offline）、endpoints/entries.ts 生活模块桶常量
│  │  ├─ hooks/              业务 hooks；use-entry-items.ts 生活模块 store 工厂、use-inventory/use-medical/use-vehicle
│  │  ├─ locale/             i18n，语言包在 locale/lang/{zh,en}.json
│  │  ├─ utils/              工具（pwa 更新、颜色、预测、快捷入口、URL 处理等）
│  │  ├─ sw.ts               Service Worker（injectManifest）
│  │  ├─ ai-chat/            AI 对话界面容器
│  │  ├─ assistant/          语音/文本记账解析
│  │  ├─ agent-api/          暴露给 AI/Agent 的工具协议层
│  │  ├─ inventory/ medical/ vehicle/  生活模块类型定义（随账本同步的 entry 数据）
│  │  ├─ assets/mascots/     家小满吉祥物立绘（webp，来自 APK 提取）
│  │  └─ index.css           设计令牌与全局样式（Tailwind v4 单一来源）
│  ├─ public/                静态资源：icon.png(512) / icon-192.png / apple-touch-icon.png / favicon.ico、
│  │                          category/ 分类插画、overview/ 首页概览图标
│  ├─ icons/apk/             APK 原始 SVG 图标集（本地 @iconify-json/apk 包，见 `docs/agents/ui-tokens.md`）
│  ├─ vite.config.ts         构建、PWA、dev 代理配置
│  └─ package.json           应用脚本
├─ packages/
│  ├─ chaty/                 AI 聊天组件（workspace 源码包）
│  ├─ toast/                 Toast 组件
│  └─ tailwind-config/       共享 Tailwind 预设
├─ docs/agents/              渐进式披露的功能级文档（索引见本文件第 0 节）
├─ docs/homefull-style-spec.md  家小满视觉规格（UI 对齐唯一依据，改 UI 前必读）
├─ docs/contributing/        上游贡献规范
├─ dist/                     构建产物（仓库根目录，gitignored）
└─ biome.json / package.json / pnpm-workspace.yaml
```

## 4. 环境要求与常用命令

- Node：`^20.19.0 || >=22.12.0`（Vite 8 要求；本机当前为 Node 20.20.0）。
- pnpm：10.15.1，由 `package.json#packageManager` 固定，建议 `corepack enable` 后使用。

在仓库根目录执行：

```bash
pnpm install          # 安装全部 workspace 依赖
pnpm dev              # 启动 apps/cent 开发服务器（vite --host，默认 http://localhost:5173）
pnpm lint             # 递归执行 tsc -b + biome check --diagnostic-level error
pnpm build            # 先 lint，再 vite build，产物输出到仓库根 dist/
pnpm preview          # 本地预览 dist（vite preview --host --port 5173）
pnpm analyze          # 构建并生成 bundle 分析
```

**每轮改动后必须部署到本地 5173**（用户明确要求「每次改动后都要部署到 5173」；仍不提交、不发布线上）。固定流程：① `pnpm lint` + `pnpm build`；② **先停掉在跑的 5173 预览进程**，再移走旧 `dist`（`mv dist apps/cent/node_modules/dist-stale-$(date +%s)`，直接删会被安全策略拦）后重新 `pnpm build` —— Windows 下 `dist/` 里的文件被预览进程占用时，`mv` 会失败、`vite build` 的 emptyOutDir 也会中途报错，现象是「构建失败但错误信息看不出原因」，别去改代码；若确实不能停进程 / 移走 `dist`，改跑 `pnpm exec vite build --no-emptyOutDir` 跳过清空（旧 assets 会留在 precache，属可接受代价）；③ 构建完再 `pnpm preview`（用后台任务），5173 返回非 200 就重启，**不能把服务留成停掉的状态**；④ `curl` 核对 html / js 都是 200，且 5173 返回的 `index-*.js` 与 `dist/index.html` 一致；⑤ 浏览器实测关键交互并截图，PWA 旧缓存需 `Ctrl+Shift+R` 或注销 SW + 清 caches。`pnpm preview` 起在 5173，`pnpm dev` 同样占 5173，两个不要同时开。**并发会话占 port**：5173 可能被别的会话（如 OpenCode）起的 `pnpm dev` 占用，本会话 preview 会退到 5174；停任何非本会话起的进程前先问用户。用户选择保留 dev 时，本轮双引擎验证改在 preview 的回落端口做，哈希核对口径同步改为「回落端口与 dist 一致」，并在汇报里说明 5173 仍是 dev。**dev 会自行退出**：并发会话结束后 5173 释放，本会话 preview 随即绑回 5173（vite 打印的 Local 端口为准），验证脚本的 BASE 要跟着改到 preview 实际端口，不要写死 5174。

仅在 `apps/cent` 目录执行时可用的命令：

```bash
pnpm dev              # vite --host
pnpm lint             # tsc -b && biome check --diagnostic-level error
pnpm check            # biome 自动修复格式与可修复问题
pnpm build            # 等价于 pnpm lint && vite build
```

补充说明：

- 项目没有单元测试、E2E 测试或测试脚本。验证方式为 `pnpm lint` + 浏览器实际操作（移动视口优先，页面按手机宽度设计）。
- UI 改动后至少检查 360–430px 宽、600–800px 高的视口，确认无横向溢出、底部安全区正常、滚动区域与固定键盘区不互相裁切。
- 环境变量（均可缺省，写在 `.env.local`，不要提交）：
  - `VITE_RATE_API_HOST`：汇率接口
  - `VITE_LOGIN_API_HOST`：GitHub/Gitee 快捷登录后端
  - `VITE_RELAYR_URL`：快捷入口中转
  - `VITE_GTAG_SCRIPT`：统计脚本
- 开发服务器把 `/google-api` 代理到 `https://generativelanguage.googleapis.com`（见 `apps/cent/vite.config.ts`）。

- 本地验证脚本清单、WebKit 双引擎验证口径与踩坑见 `docs/agents/verification.md`。

## 5. 构建与部署

构建链路、产物路径、Cloudflare Pages 部署命令、Git / SSH 通道与主机指纹细节见 `docs/agents/deployment.md`。

- **不要主动 commit、push、提 MR 或部署**，除非用户明确要求。

## 6. 运行时架构

入口链路：

`index.html` → `src/main.tsx`（`registerPWAUpdates()`、`initIntl()`、`LocaleProvider`、懒加载 `route`） → `src/route.tsx`（MemoryRouter） → `layouts/main-layout.tsx`（挂载所有业务 Provider） → `components/app-chrome`（顶部头像、标题、AI 入口、Tab） → 页面。

数据流：

```
页面 / 组件
  → Zustand store（src/store，主要是 useLedgerStore、useBookStore、useUserStore）
    → StorageAPI（src/api/storage，Comlink 包装 Web Worker）
      → endpoint（github / gitee / webdav / s3 / offline）
        → 远端仓库或本地 IndexedDB
```

- 同步方式由 `localStorage.SYNC_ENDPOINT` 决定，缺省 `github`。可选：`github`、`gitee`、`webdav`、`s3`、`offline`。
- 账本（Book）对应一个远端仓库；账单与 meta 以 JSON/增量 patch 形式存储，`src/database` 负责 patch、sha、stash、调度，修改这些目录必须保持向后兼容，避免破坏老客户端数据。
- `useLedgerStore` 首次只加载最近 200 条账单；需要全量数据时调用 `refreshBillList()` 或 `ensureFullBills()`（见 `hooks/use-full-bills.ts`）。
- **生活模块多 entry 数据桶**（见 `src/tidal/README.md`「多 entry 数据共存」）：`api/endpoints/entries.ts` 定义 `ENTRY_NAMES = ["inventory","medical","vehicle"]`；每个 entry 在远端是独立分片 `<entry>-0.json…`，本地是独立库 `book-<name>--<entry>`，与账单同一套 stash/patch（timestamp LWW）。SyncEndpoint 通用方法是 `batchEntry / getAllEntryItems / onEntryChange`。五个端点各建 entry 的 tidal 实例并挂进 Scheduler 串行链（ledger→entries，避免同一 git ref 并发提交）；新增生活模块数据桶时五端点 + `entries.ts` + 备份（`exportable.ts`/`preview-form.tsx`）都要同步。
- **上游的 zen 记录模块（`src/zen`、`packages/zen`、`use-zen.ts` 及 SyncEndpoint 的 batchZen 三件套）已被用户整体删除**：不要从 upstream 恢复、不要新增引用；若 tsc 报 zen 相关缺失，说明有残留引用，删除即可。
- 前端消费：`hooks/use-entry-items.ts` 的 `getEntryStore(entry)` 是 zustand store 工厂（模块加载时订阅 `onEntryChange` 并首拉），各模块 hook（`use-inventory`/`use-medical`/`use-vehicle`）包一层类型与 CRUD；变更操作尽量导出为模块级纯函数（如 `addMedicalProfile`），表单 onConfirm 里直接调。
- 生活模块照片/头像：把 `File` 直接嵌进 item value（如 `MedicalVisit.images`、`MedicalProfile.avatar`），tidal 的 `syncImmediate` 会对**所有 entry** 的 stash 递归执行 `transformAssets` 自动上传到 `assets/<shortId>-<name>` 并把 File 替换为 key，展示用 `SmartImage`（File→blob URL、key→getOnlineAsset 双通道）；远端 assets 无 GC（删除记录不删图）。
- **确认式表单的保存约定**：`createConfirmProvider` 生成的 `showXxx()` 只是收集表单值并 resolve，**落库由调用方负责**（如 `showMedicalProfile().then(v => v && addMedicalProfile(v))`、周期记账还要处理 `needBills` 补账）。在 dock 等新入口调用时漏掉 `.then` 会导致「确认了但没保存」。
- PWA：`vite-plugin-pwa` 使用 `injectManifest`，SW 源码在 `src/sw.ts`；`src/utils/pwa.ts` 负责注册、前台定时检查、新版本自动激活并刷新，并处理 chunk 加载失败后的重载。设置页「关于」里的「检查更新」调用 `checkForUpdate()`。

## 7. 领域模型（改动前必须了解）

见 `docs/agents/domain-model.md`（账单 / 分类 / 生活模块实体、兼容性与四个已踩过的坑）。

## 8. UI 规范

按功能域拆分，改哪块读哪块（完整索引见第 0 节）：

- 通用令牌 / 配色 / 字体 / 运行时坑：`docs/agents/ui-tokens.md`
- 首页 / 顶栏 / dock / 页签：`docs/agents/ui-home.md`
- 记一笔编辑器 / 分类 / 键盘：`docs/agents/ui-bill-editor.md`
- 记账页 / 账单卡 / 票券统计卡 / 筛选：`docs/agents/ui-ledger-stat.md`
- 生活模块与通用表单：`docs/agents/ui-forms.md`
- 登录页与登录方式：`docs/agents/ui-login.md`
- 浏览器验证：`docs/agents/verification.md`
- **弹层类交互默认约定**（用户明确「以后默认都这样」）：名称类字段不做行内输入框，点击弹改名抽屉（`components/name-dialog.tsx`）；多选类字段不在行内铺 chip，点击行弹选项抽屉（`components/option-sheet.tsx`）；破坏性删除必须二次确认（`components/delete-confirm.tsx`），编辑态底部左侧按钮直接改为「删除」。三个工厂按模块各建一个实例并挂载 Provider（重复挂载会渲染两份弹层）。**所有弹层操作按钮一律走 `components/button-styles.ts` 共享常量**：`BTN_BASE` 48px / 15px，操作栏统一 `SHEET_FOOTER`（`20px + safe-area`），可点 / 禁用双态成对出现。预算抽屉与「详细分配」抽屉的全部细节见 `docs/agents/budget.md`；通用按钮、颜色层级与运行时约定见 `docs/agents/ui-tokens.md`。

## 9. 本 fork 的定制现状

见 `docs/agents/fork-customizations.md`。

## 10. AI 助手工作清单

1. 先读本文件；改动某个模块前先读该模块及其直接依赖，不要凭文件名猜测。
2. 搜索范围限定在 `E:\code\_cent_analysis` 内，不要递归扫描其他磁盘或无关目录。
3. 修改 `src/api`、`src/database`、`src/tidal` 前先评估同步兼容性与多端并发，避免破坏性变更。
4. 改 UI 时优先复用现有组件与设计令牌；不要为单个页面引入新的颜色体系或组件库。
5. 完成后必须运行 `pnpm lint`；涉及 UI 的改动必须在浏览器里实际操作验证（打开抽屉、输入金额、保存、关闭），不能只看类型检查通过。UI 改动的验证口径是 **真 WebKit（iPhone 16 Pro，402×874）+ Chromium** 双引擎，见`docs/agents/verification.md`；只测 Chromium 会漏掉 iOS 的 `aspect-ratio` 与安全区问题。
6. 交付只给最终状态：代码、注释、提交信息中不写「已修改/改为」等过程说明；注释用中文解释「为什么」而不是「做了什么」。
7. 本地 5173 预览是**每轮必做**（第 4 节），不需要额外确认；线上部署（Cloudflare Pages）、commit、push、MR 只在用户明确要求时执行，commit 信息遵循 Conventional Commits（仓库有 commitlint 与 husky pre-commit）。
8. 不把任何密钥、Token、账号密码写入代码或文档；必要的凭据只放在本地 `.env.local` 或应用设置里。
9. 做 APK 对齐时两侧都要**现场操作截图 + 像素测量**（见 `docs/agents/homefull-reference.md`），不能只凭存档截图或肉眼判断；不要修改或临时清空 `PYTHONHOME` / `PYTHONPATH` 等全局环境变量。
10. 提交前先 `git status --short` 看清范围：默认只暂存已跟踪文件，新增的静态资源（如 `public/icon-192.png`）要按路径单独 `git add`；不要 `git add -A` 把 `.playwright-cli/` 日志、`dist-stale-*`、临时对比图带进仓库。
11. 本文件是约定来源：本轮确立的新规则（用户明确要求、踩过的坑、参数口径）要同步写回对应章节，而不是只留在对话里。
12. 每轮改动收尾**必须更新 `AGENTS.md`**（见文件开头的文档约定），且只更新它：设计文档、ADR、验收记录、`CONTEXT.md` 都不再同步。

## 11. 家小满参考资产与逆向环境

见 `docs/agents/homefull-reference.md`。
