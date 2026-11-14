# AGENTS.md

本文件面向在本仓库工作的 AI 编码助手。开始改代码前先读本文件；涉及具体模块时再读对应源码。

> **文档约定（用户明确要求，2026-11-13）**：文档按「渐进式披露」组织——本文件只留全局约定，功能级细节拆到 `docs/agents/*.md`，改到哪个模块再读哪个文档。每轮改动后**必更新 `AGENTS.md`**（全局规则 / 索引 / 口径变化），并同步更新命中的分模块文档；`docs/tag-and-budget-design.md`、`docs/adr/*`、`docs/design/*`、`CONTEXT.md` 及其它设计稿 / 验收记录是历史存档，**一律不更新**。

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
| `docs/agents/ui-forms.md` | 改物品 / 医疗 / 车辆等生活模块表单与通用表单抽屉 |
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
│  │  ├─ route.tsx           MemoryRouter 路由：/、/ledger、/stat/:id?、/search、/inventory、/medical、/vehicle
│  │  ├─ pages/              home 首页、ledger 记账、stat 分析、search 搜索、inventory 物品、medical 医疗、vehicle 车辆
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

**每轮改动后必须部署到本地 5173**（用户明确要求「每次改动后都要部署到 5173」；仍不提交、不发布线上）。固定流程：① `pnpm lint` + `pnpm build`；② **先停掉在跑的 5173 预览进程**，再移走旧 `dist`（`mv dist apps/cent/node_modules/dist-stale-$(date +%s)`，直接删会被安全策略拦）后重新 `pnpm build` —— Windows 下 `dist/` 里的文件被预览进程占用时，`mv` 会失败、`vite build` 的 emptyOutDir 也会中途报错，现象是「构建失败但错误信息看不出原因」，别去改代码；③ 构建完再 `pnpm preview`（用后台任务），5173 返回非 200 就重启，**不能把服务留成停掉的状态**；④ `curl` 核对 html / js 都是 200，且 5173 返回的 `index-*.js` 与 `dist/index.html` 一致；⑤ 浏览器实测关键交互并截图，PWA 旧缓存需 `Ctrl+Shift+R` 或注销 SW + 清 caches。`pnpm preview` 起在 5173，`pnpm dev` 同样占 5173，两个不要同时开。**并发会话占 port**：5173 可能被别的会话（如 OpenCode）起的 `pnpm dev` 占用，本会话 preview 会退到 5174；停任何非本会话起的进程前先问用户。用户选择保留 dev 时，本轮双引擎验证改在 preview 的回落端口做，哈希核对口径同步改为「回落端口与 dist 一致」，并在汇报里说明 5173 仍是 dev。**dev 会自行退出**：并发会话结束后 5173 释放，本会话 preview 随即绑回 5173（vite 打印的 Local 端口为准），验证脚本的 BASE 要跟着改到 preview 实际端口，不要写死 5174。

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
- 浏览器验证：`docs/agents/verification.md`
- **弹层类交互默认约定**（用户明确「以后默认都这样」）：名称类字段不做行内输入框，点击文字 / 行从底部弹改名抽屉（`components/name-dialog.tsx` 的 `createNameDialog()`）；多选类字段不在行内铺 chip，点击行从底部弹选项抽屉（`components/option-sheet.tsx` 的 `createOptionSheet()`）；破坏性删除必须二次确认（`components/delete-confirm.tsx` 的 `createDeleteConfirm()`），编辑态底部左侧按钮直接改为「删除」，不再额外挂红色删除链接。三个工厂按模块各建一个实例并挂载 Provider，同一 Provider 重复挂载会渲染两份弹层。预算抽屉所有设置项（含金额与详细分配）统一放进**同一张白卡 + 细分割线**（每行固定 52px），不要上半白卡、下半灰卡混搭；主卡两行文案固定「金额 / 详细分配」，月度与特殊预算共用；弹层按钮统一 40px 高，且一律走 `components/button-styles.ts` 的共享常量（主操作可点态实心/白底描边 + 按压反馈，表单级禁用态灰底灰字 + `cursor-not-allowed`；行内微调用 `BTN_TAP` 圆形图标钮，**黑色图标**、无禁用态，与分类名/金额同色同级）；数字金额输入不做成选项框，用无框「灰色 0 占位 + 后置 ¥ + 黑色数字」（不预填 0 + 聚焦全选 + 失焦千分位）；「详细分配」是独立抽屉（r18 口径）：标题居中且独占一行、**智能分配在分类卡片外面（卡片上方独立一行、右对齐）**、**无任何上限提示块**、汇总去橘底且状态栏文字全改主文字黑（只有 ¥金额 是品牌橙，零总额提示并入这一行且也用黑字）、抽屉内零禁用态（数据层 `capOf()` 封顶，到边界不加不减）、分类名固定 60px 成列 + 两段 `flex-1` 留白把**金额列托到行中线略左**、中间不画虚线、**按钮全部靠右且位置不动**且只留 `+` / `-` 图标（短按 ±50 / 长按 50→100→500 / `+N` 微反馈精确飘在金额正上方；气泡不能再加 `-translate-x-1/2`，否则与动画 `translate(-50%)` 叠加偏位）、分类名 / 金额 / 按钮符号 / 状态文字全部主文字黑（灰色只给未设置的 `0` 占位）、细滑动条（4px 轨道 / 12px 滑块 / `step=10`）+ 拖动与点击轨道都吸附到最近 100 倍数且点击空白处直接跳转 + **恒橙**（含刚展开的 ¥0）无气泡纯数字悬浮且端点中心严格对齐 + 轨道上 10 个覆盖 0%/100% 端点的空心圆刻度、展开区 padding 12px、两侧无 ±10；不写说明书式引导条，整行可点靠 chevron 即可。详见 `docs/agents/ui-tokens.md` 与 `docs/agents/budget.md`。

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
