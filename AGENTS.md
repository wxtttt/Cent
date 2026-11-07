# AGENTS.md

本文件面向在本仓库工作的 AI 编码助手。开始改代码前先读本文件；涉及具体模块时再读对应源码。

## 1. 项目速览

- 名称：Cent（中文名「日计」），纯前端 PWA 记账应用，数据存在用户自己的 GitHub / Gitee / WebDAV / S3 仓库或本地离线库中，没有业务后端。
- 本仓库：`E:\code\_cent_analysis`，是开源项目 `glink25/Cent` 的二次开发 fork，当前在做两件事：移动端暖色 UI 对齐参考应用「家小满」（规格见 `docs/homefull-style-spec.md`），以及新增随账本多人同步的生活模块（物品清单 /medical 医疗 /vehicle 车辆）。
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
| 已合并修复分支 | `fix-unknown-user-261106`（WebDAV 署名回落到 unknown-user） |

- 分支命名沿用 `feat-<描述>-<yymmdd>` / `fix-<描述>-<yymmdd>`，不使用多级命名。
- 拉取上游：`git fetch upstream`，需要同步时把 `upstream/main` 合入当前分支。
- 工作区当前存在大量未提交改动（截至 2026-11-07：暖色 UI 对齐 + 生活模块 + 上游 zen 模块删除，约 400 个文件改动/删除）。动手前先 `git status` / `git diff` 了解上下文；不要清理、回滚或覆盖别人的未提交改动。
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
├─ docs/homefull-style-spec.md  家小满视觉规格（UI 对齐唯一依据，改 UI 前必读）
│  ├─ vite.config.ts         构建、PWA、dev 代理配置
│  └─ package.json           应用脚本
├─ packages/
│  ├─ chaty/                 AI 聊天组件（workspace 源码包）
│  ├─ toast/                 Toast 组件
│  └─ tailwind-config/       共享 Tailwind 预设
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

## 5. 构建与部署

构建链路：

1. `pnpm build` → `apps/cent` 的 `build` 脚本 → `pnpm run lint`（tsc + biome）。
2. `vite build`，`outDir` 在 `apps/cent/vite.config.ts` 中被设为 `resolve("../../dist")`，即产物落在仓库根 `dist/`。
3. 产物包含 `index.html`、`assets/`、`sw.js`、`manifest.webmanifest`、`_headers` 等，可直接静态托管。

Cloudflare Pages（本 fork 的测试环境）：

- 项目名：`cent-test`，生产域名：https://cent-test.pages.dev
- 已使用的部署命令（在仓库根目录、构建完成后执行）：

```bash
npx --yes wrangler@3.114.17 pages deploy dist --project-name cent-test --branch main
```

- 需要先完成 Cloudflare 登录。如果本机代理环境变量拦截 wrangler，可在命令前清空代理：

```bash
HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy= npx --yes wrangler@3.114.17 pages deploy dist --project-name cent-test --branch main
```

- 部署会覆盖线上测试环境，只能在用户明确要求时执行。

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

账单类型（`src/ledger/type.ts`）：

| 字段 | 说明 |
| --- | --- |
| `id` / `creatorId` | 账单标识 / 创建者 |
| `type` | 只有 `"income"` 和 `"expense"`，没有转账类型 |
| `categoryId` | 单个分类，可以是父类或子类 |
| `amount` | 整数金额，比例为 10000:1；UI 用 `amountToNumber` / `numberToAmount`（`src/ledger/bill.ts`）转换 |
| `time` | 毫秒时间戳 |
| `comment` | 备注 |
| `tagIds` | 多个标签 |
| `images` | 图片附件 |
| `location` | 经纬度 |
| `currency` | 多币种：`{ base, target, amount }`，`amount` 是用户输入的币种金额 |
| `extra.scheduledId` | 周期记账关联 |

- 账单没有「账户 / 钱包」字段，也没有转账类型。做 UI 时不要擅自给账单增加字段；需要新增字段必须先确认数据兼容与同步方案。**已评估**：直接扩 `BillType` 为转账会让老客户端统计错乱、编辑即损坏（多处隐式 else 分支），用户已决定跳过转账；扩展字段优先走 `extra`（老客户端透传、仅编辑时可能丢失）。
- 分类是两级结构（`src/ledger/type.ts` 的 `BillCategory`）：父类没有 `parent`，子类通过 `parent` 指向父类；子类可设 `defaultSelect`。
- 默认分类在 `src/ledger/category.ts`，`name` 是 i18n key（显示时通过 `t(name)` 翻译）；用户新增分类放在 `GlobalMeta.categories`，且 `customName` 必须为 `true`，显示原始名称。默认分类被改名时也会标记 `customName`。
- 新增账单：`goAddBill(value?)`（`components/bill-editor/index.tsx`）打开底部编辑抽屉，确认后写入 store。取消时 Promise 以 `Error("manually cancelled")` reject，用 `isCancelError()`（`components/confirm/state.ts`）判断。
- 记账编辑器：`components/bill-editor/form.tsx`，计算器在 `components/keyboard.tsx`（`Calculator.Root` / `Calculator.Value` / `Calculator.Keyboard`，`variant="sheet"` 是 4×4 键盘）。弹窗高度固定为 `h-[min(92dvh,620px)]`，中部区域滚动、键盘区固定，改动布局时保证不裁切。
- 底部抽屉下拉关闭：`components/ui/dialog/index.tsx` 中监听 `from === "bottom"`，只有从带 `data-sheet-drag` 的区域按下才会接管手势；位移超过 6px 且纵向占优时开始拖动，超过高度 25% 或快速下滑即关闭。新增抽屉内容时可按需加 `data-sheet-drag`，输入框默认被排除。
- **生活模块实体**（新增数据前先看这里）：
  - 物品 `src/inventory/types.ts` `InventoryItem`：三态 `status: in_use|idle|disposed`（读端用 `normalizeInventoryStatus` 兼容旧两态）、`kind: physical|virtual`、`price`（资产总览估算）、`expiryDate` 过期；分类建议存 `GlobalMeta.inventoryCategories`。
  - 医疗 `src/medical/types.ts`：`MedicalProfile`（含 `avatar: string|File` 头像、`gender`、`medicalHistory`、`medications`）/ `MedicalVisit` / `MedicalMedicine`（药箱），靠 `entity` 字段判别（同一 entry 桶混存）。
  - 车辆 `src/vehicle/types.ts`：`Vehicle` + `VehicleRecord`（加油油耗=相邻记录里程差/升数）。
  - 其他新落库字段：`GlobalMeta.autoRules`（自动记账规则，数组顺序即优先级）、`Scheduled.endCount`（周期结束次数）、`PersonalMeta.loanPlans`（贷款方案）、`PersonalMeta.importHistory`（导入历史）。
  - 这些均为加法兼容：老客户端读入忽略未知字段，但**编辑整条记录会丢新字段**（update 是整对象替换），评估兼容时按此为准。

## 8. UI 规范

设计令牌定义在 `apps/cent/src/index.css`，通过 Tailwind v4 暴露为 `bg-ground`、`text-ink` 等工具类。不要硬编码颜色，优先用令牌或语义色。

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| `--dp-color-ground` | `#f6ecdc` | 页面底色（暖奶茶色，对齐家小满） |
| `--dp-color-ground-muted` | `#eee0c8` | 次级底色 / 浅色块 |
| `--dp-color-panel` | `#fffdf8` | 卡片、弹层、键盘按键 |
| `--dp-color-ink` | `#2a2018` | 主文字 |
| `--dp-color-ink-secondary` | `#8b8178` | 次要文字 |
| `--dp-color-rule` | `#e9dcc6` | 边框 / 分割线 |
| `--dp-color-accent` | `#f7853c` | 品牌色（`bg-brand`） |
| `--color-expense` | `#1f9d63` | 支出语义色（绿色，`text-semantic-expense`） |
| `--color-income` | `#e2544a` | 收入语义色（红色，`text-semantic-income`） |
| `--dp-radius-panel` | `12px` | 普通面板圆角 |
| `--dp-radius-card` | `28px` | 卡片 / 底部抽屉顶部圆角 |
| `--dp-motion-interaction` | `160ms` | 交互过渡时长 |
| `--dp-motion-easing` | `ease-out` | 交互缓动 |

- 注意语义色是反直觉的：支出为绿色、收入为红色，与现有账单卡片一致。
- 深色模式通过 `.dark` 下的同名令牌覆盖实现，新增颜色必须同时考虑两套值。
- 安全区统一用 `var(--safe-area-inset-*)` 或项目封装变量，不要在业务组件里直接写 `env(safe-area-inset-*)`。
- 页面是移动优先，主内容最大宽度约 960px；底部操作栏/键盘需处理 `--safe-area-inset-bottom`。
- 图标使用 Iconify 类名，例如 `icon-[mdi--food]`。分类图标（`components/category/icon.tsx`）按 icon 值分四种渲染：图片 URL（`/`、`http`、`data:` 开头，走 `<img>`）、SVG 字符串、**emoji 纯文本**（非 `icon-` 开头按字符渲染，家小满同款风格，65 个默认分类已 emoji 化）、其余按 Iconify 类名。
- **家小满对齐组件**（改 UI 优先复用，勿另造）：`components/ticket-card`（票券卡：打孔虚线+胶带贴纸+装饰角+吉祥物探头）、`components/segmented-tabs`（页面分段控件：浅容器+白色凸起激活胶囊）、`components/empty-state`（吉祥物空态，注意家小满的列表空态是纯文字，仅引导型空态才用插画）、`components/form-rows`（**行卡片表单基元**：FormSection 分组标题 / FormCard 白卡细分割线 / FormRow 左标签右值 / RowInput 行内透明输入 / CountedRowInput 带 n/255 计数，生活模块五个表单全部用它，勿再写 label+Input 堆叠式）、`components/wheel-date-picker`（**滚轮日期选择器**：底部二级抽屉 ✕/标题/橙✓ + 年月日时分五列 scroll-snap 滚轮，记账抽屉已换用；type="date" 为三列）。吉祥物立绘在 `src/assets/mascots/`（webp）。字体保持系统默认（用户已明确不用 Noto Sans SC webfont）。
- **底部 dock 加号按页签分派**（对齐家小满，`components/app-chrome/index.tsx`）：首页=「快捷新建」底部抽屉（纯文字按钮：记一笔/新增周期记账/添加物品/添加成员）；记账=dock 上方两卡（账单导入/记一笔，无遮罩）；归医=按子页签分派（健康档案→添加成员档案、药箱→添加药品、就诊记录→添加就诊，**无成员时 toast 拦截**，子页签经 `/medical?tab=` 传给 dock）；知物=直接添加物品（全部/实物/虚拟是筛选不分派）。
- 生活模块表单抽屉底色用 `bg-ground!`（provider 的 `contentClassName` 追加）+ 白色 FormCard，与家小满「灰底白卡」同构；记一笔的分段控件是**外层白胶囊、选中浅色凸起**（与直觉相反，勿改回）。
- 文案必须同时更新 `src/locale/lang/zh.json` 和 `en.json`；组件内用 `useIntl()` 的 `t()`，非组件代码用 `@/locale` 导出的 `t()`。两个语言包不参与 Biome 检查，手动保持格式一致（key 近似按字母序）。**语言包必须以 UTF-8 读写**：曾发生并发会话以 GBK 写入导致中文大面积损坏（423 处截断），恢复手段见第 11 节。
- 二级页面（`/stat`、`/search`、`/inventory`、`/medical`、`/vehicle`）使用自己的返回头部，全局 AppChrome 会隐藏；修改壳层时先读 `components/app-chrome/index.tsx`（底部 dock 含吉祥物切换与加号分派）。
- **四个已踩过的坑**：① `components/ui/dialog/index.tsx` 的 WAAPI 动画收尾必须用 `commitStylesSafe()`（快速关闭时元素已出 DOM，直接 `commitStyles()` 抛 InvalidStateError）；② `Intl.DateTimeFormat` 的 `dateStyle` 与 `weekday` 等分量选项互斥，同传会抛 `Invalid option` 白屏；③ `useLedgerStore` 的选择器若返回 `?? []` 之类的新引用，必须包 `useShallow` 或复用带 `useShallow` 的现成 hook（如 `useAutoRules()`）——裸选择器会让 React 判定快照永远在变，`getSnapshot should be cached` 警告 + `Maximum update depth exceeded` 崩溃（记一笔曾因此打不开）；④ 本应用是 MemoryRouter，`window.location` 不反映路由（hash/search 恒空），跨组件读路由状态一律用 `useLocation()` / `useSearchParams()`。

## 9. 本 fork 的定制现状

相对上游，本 fork 已重做：

- 全局壳层：顶部头像 + 「日计」标题 + AI 入口 + 首页/记账/归医/知物 Tab + 底部 dock（吉祥物随页签、加号按页签与子页签分派）（`components/app-chrome`）。
- 首页：hero 大字问候（滚动折叠吸顶）、票券式今日总结、近期提醒、概览卡（`pages/home`）。
- 记账页与分析页：票券式月度收支卡、筛选/分析胶囊、统计视图（`pages/ledger`、`pages/stat`、`components/stat`）。
- 个人中心抽屉（`components/profile`，含物品/医疗/车辆/贷款/自动规则入口）。
- 暖色设计令牌与深色模式（`index.css`）。
- 记账底部抽屉：emoji 分类快捷卡、日期/币种/标签胶囊、内联备注（含自动规则建议胶囊）、滚轮日期选择器、4×4 键盘、下拉关闭（`components/bill-editor`、`wheel-date-picker`、`components/keyboard.tsx`、`components/ui/dialog/index.tsx`）。
- 自动记账规则（`components/auto-rule` + `src/ledger/auto-rules.ts`，导入预览可开关套用）。
- 智能导入增强：支付宝/微信来源引导卡 + 导入历史（`components/data-manager`）。
- 周期记账：结束次数上限（`Scheduled.endCount`，启动补账按 cap 截断）。
- 贷款计算器（`components/loan-calculator` + `src/ledger/loan.ts`，方案存 `PersonalMeta.loanPlans`）。
- 生活模块：物品清单 `/inventory`、医疗 `/medical`（档案/药箱/就诊）、车辆 `/vehicle`（行车能耗），均随账本云同步；五个表单（成员/就诊/药品/物品/车辆×2）全部为行卡片式并支持头像/图片/备注计数（`components/form-rows`）。
- PWA 检查更新与前台自动更新（`utils/pwa.ts`、`components/settings/about.tsx`）。

「关于」页的版本对比查询的是上游 `glink25/cent` 的 `main` 分支 commit，fork 构建显示「落后于上游」属于正常现象，不代表本地构建失败。

## 10. AI 助手工作清单

1. 先读本文件；改动某个模块前先读该模块及其直接依赖，不要凭文件名猜测。
2. 搜索范围限定在 `E:\code\_cent_analysis` 内，不要递归扫描其他磁盘或无关目录。
3. 修改 `src/api`、`src/database`、`src/tidal` 前先评估同步兼容性与多端并发，避免破坏性变更。
4. 改 UI 时优先复用现有组件与设计令牌；不要为单个页面引入新的颜色体系或组件库。
5. 完成后必须运行 `pnpm lint`；涉及 UI 的改动必须在浏览器里实际操作验证（打开抽屉、输入金额、保存、关闭），不能只看类型检查通过。
6. 交付只给最终状态：代码、注释、提交信息中不写「已修改/改为」等过程说明；注释用中文解释「为什么」而不是「做了什么」。
7. 不主动 commit、push、创建 MR 或部署；这些操作只在用户明确要求时执行，commit 信息遵循 Conventional Commits（仓库有 commitlint 与 husky pre-commit）。
8. 不把任何密钥、Token、账号密码写入代码或文档；必要的凭据只放在本地 `.env.local` 或应用设置里。

## 11. 家小满参考资产与逆向环境

UI 对齐的参考对象是用户自有的 Flutter 应用「家小满」（`com.nightingales.homefull`，后端 homefull.cn）。相关产物都在仓库外，属于本地工作资产：

- `E:\code\_apk_homefull\`：APK 解包与分析产物。`家小满-APK分析报告.md`（功能/API/交互全景）、`ref-*.png`（模拟器实机参考截图，1080×2340）、`strings-arm64.txt`（Dart 快照 35k 条字符串）、`feature-paths.txt`（源码模块路径）、`tools/`（字符串提取、uiautomator 点按、裁图等脚本，另有 restore-locale/salvage-locale/refill-locale/add-locale-keys.mjs 等语言包恢复与批合并脚本）。
- `docs/homefull-style-spec.md`：从截图固化的视觉规格（令牌、票券卡/分段控件/dock、逐页布局、状态机），**改 UI 前必读**。
- **Flutter 限制**：Dart 代码被 AOT 编译进 `libapp.so`，无法还原源码；能拿到的是资源、字符串、模块路径与语义树。分类可爱图标是服务端下发的自绘插画，不在 APK 包内（不要试图从 APK 找）。
- **模拟器**：本机 `E:\Android\Sdk`（adb 在 `platform-tools`），已有 AVD `homefull`（Android 12 x86_64，家小满已安装并可登录）。驱动 Flutter UI 的方式：`adb shell uiautomator dump`（会激活 Flutter 语义树）+ `node E:\code\_apk_homefull\tools\ui-tap.mjs <ui.xml> <文本> --tap` 按语义节点点按；截图 `adb exec-out screencap -p`。注意语义坐标偶发漂移（窗口宽高比），点按失败时以截图实测为准。
- 登录需要短信验证码（发到用户手机），需要登录态的页面截图时请用户在模拟器窗口操作。
- **语言包损坏恢复**（2026-11-07 实战）：`zh/en.json` 被以 GBK 写坏后，完整内容可从 `dist/assets/{zh,en}-*.js`（编译后的 locale chunk，取 default 导出即整包对象）恢复；新增 key 可从 `.corrupted.bak` 里未损坏行抢救。前提是 dist 是较新的构建——所以改完语言包跑一次 `pnpm build` 也是给恢复留后路。注意语言包文件属仓库工作区，可能有**并发会话**同时改动，编辑前先确认最新内容，避免覆盖。
