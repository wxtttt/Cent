# AGENTS.md

本文件面向在本仓库工作的 AI 编码助手。开始改代码前先读本文件；涉及具体模块时再读对应源码。

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
| 当前工作分支 | `feat-ui-261106`（本地领先 `origin/feat-ui-261106` 约 20 个提交，用户未要求 push） |
| 已合并修复分支 | `fix-unknown-user-261106`（WebDAV 署名回落到 unknown-user） |

- 分支命名沿用 `feat-<描述>-<yymmdd>` / `fix-<描述>-<yymmdd>`，不使用多级命名。
- 拉取上游：`git fetch upstream`，需要同步时把 `upstream/main` 合入当前分支。
- 截至 2026-11-12，暖色 UI 对齐、生活模块、品牌替换（图标 / 应用名）与 WebDAV 修复已分多批提交（最近三条 `d57325c` 图标、`8a65e8d` 图标居中、`9f818f8` 改名 `胖记`、`412b025` WebDAV）。动手前先 `git status` / `git diff` 了解上下文；不要清理、回滚或覆盖别人的未提交改动，也不要把 `.playwright-cli/` 等自动化日志目录提交进仓库。
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
│  ├─ icons/apk/             APK 原始 SVG 图标集（本地 @iconify-json/apk 包，见第 8 节）
│  ├─ vite.config.ts         构建、PWA、dev 代理配置
│  └─ package.json           应用脚本
├─ packages/
│  ├─ chaty/                 AI 聊天组件（workspace 源码包）
│  ├─ toast/                 Toast 组件
│  └─ tailwind-config/       共享 Tailwind 预设
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

**每轮改动后必须部署到本地 5173**（用户明确要求「每次改动后都要部署到 5173」；仍不提交、不发布线上）。固定流程：① `pnpm lint` + `pnpm build`；② **先停掉在跑的 5173 预览进程**，再移走旧 `dist`（`mv dist apps/cent/node_modules/dist-stale-$(date +%s)`，直接删会被安全策略拦）后重新 `pnpm build` —— Windows 下 `dist/` 里的文件被预览进程占用时，`mv` 会失败、`vite build` 的 emptyOutDir 也会中途报错，现象是「构建失败但错误信息看不出原因」，别去改代码；③ 构建完再 `pnpm preview`（用后台任务），5173 返回非 200 就重启，**不能把服务留成停掉的状态**；④ `curl` 核对 html / js 都是 200，且 5173 返回的 `index-*.js` 与 `dist/index.html` 一致；⑤ 浏览器实测关键交互并截图，PWA 旧缓存需 `Ctrl+Shift+R` 或注销 SW + 清 caches。`pnpm preview` 起在 5173，`pnpm dev` 同样占 5173，两个不要同时开。

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

**本地验证脚本**（`.playwright-cli/`，gitignored，属于工作资产不进仓库）。`open` 与 `run-code` 必须写在同一条命令里，且先清代理：

```bash
export HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy= ALL_PROXY= all_proxy= NO_PROXY=localhost,127.0.0.1
playwright-cli open "http://localhost:5173/" --browser webkit >/dev/null 2>&1
playwright-cli run-code --filename .playwright-cli/webkit-verify2.js
```

| 脚本 | 用途 |
| --- | --- |
| `webkit-verify2.js` | 记一笔主表单：分类圆 `w===h`、16/16/12 间距、金额框不被键盘裁切（402×874） |
| `verify-icon.js` | 首页头像 / 个人抽屉头像 / 关于页 80px logo |
| `verify-rename.js` | `document.title` 与顶部标题、AI 占位文案 |
| `mock-webdav.cjs` / `mock-webdav-401.cjs` | 本地假 WebDAV（8099 正常目录 / 8098 全 401），配合 `webdav-books.js`、`webdav-fix-verify.js`、`webdav-prefill-verify.js` 复现账本列举、失败提示与登录回填 |
| `measure*.js` / `probe-dock.js` | 卡片圆角、间距、dock 尺寸实测 |

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

- `npx wrangler@3.114.17 whoami` 可确认登录态（本机已通过 OAuth 登录）。发布前务必先 `pnpm build` 刷新根目录 `dist/`，部署后访问 https://cent-test.pages.dev 验证。前面的代理前缀只作用于该条命令，不写盘、不改全局环境变量。
- **必须带 `--branch main`**：不带时 wrangler 会按当前 git 分支发布，只生成 `<hash>.cent-test.pages.dev` / `feat-ui-261106.cent-test.pages.dev` 这类预览域名，`cent-test.pages.dev` 主域名仍是旧版（踩过：以为已发布，线上页面没变）。工作区有未提交改动时加 `--commit-dirty=true`，否则 wrangler 会拦。
- **部署后核对线上内容**：`curl` 取 `<title>` 与 `manifest.webmanifest` 的 `name` / `short_name` / `description`；**文案在语言分片里**（`assets/zh-*.js` / `assets/en-*.js`），不在 `index-*.js` 主 bundle，新加的中文文案要去对应语言分片里 grep，否则会误判「没发上去」；图片资源用 `md5sum` 与本地文件比对。
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
- 底部抽屉高度由 `hooks/use-visual-viewport.ts` 按 `visualViewport` 计算（`maxHeight` + 软键盘 `marginBottom`），内容区用 `min-h-0 flex-1 overflow-y-auto`，键盘弹起时抽屉不被顶出屏幕；确认式抽屉统一 `dialogModalClose`（点外部关闭），生活模块表单与记账筛选都按此结构。
- **生活模块实体**（新增数据前先看这里）：
  - 物品 `src/inventory/types.ts` `InventoryItem`：三态 `status: in_use|idle|disposed`（读端用 `normalizeInventoryStatus` 兼容旧两态）、`kind: physical|virtual`、`price`（资产总览估算）、`expiryDate` 过期；内置分类为 `INVENTORY_CATEGORY_GROUPS`（实物 9 + 虚拟 5，筛选与建品共用），自定义分类存 `GlobalMeta.inventoryCategories`。筛选面板的 chip 统一 40px 高、3 列等宽铺满整行，「全部」与分类同尺寸置顶。
  - 医疗 `src/medical/types.ts`：`MedicalProfile`（含 `avatar: string|File` 头像、`gender`、`medicalHistory`、`medications`）/ `MedicalVisit` / `MedicalMedicine`（药箱），靠 `entity` 字段判别（同一 entry 桶混存）。
  - 车辆 `src/vehicle/types.ts`：`Vehicle` + `VehicleRecord`（加油油耗=相邻记录里程差/升数）。
  - 其他新落库字段：`GlobalMeta.autoRules`（自动记账规则，数组顺序即优先级）、`Scheduled.endCount`（周期结束次数）、`PersonalMeta.loanPlans`（贷款方案）、`PersonalMeta.importHistory`（导入历史）。
  - 这些均为加法兼容：老客户端读入忽略未知字段，但**编辑整条记录会丢新字段**（update 是整对象替换），评估兼容时按此为准。

## 8. UI 规范

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
- **卡片色按作用域分层**：全局 `--dp-color-panel` 保持**纯白 `#ffffff`**（用户明确要求，APK 实测所有抽屉卡片都是纯白；曾短暂改回 `#fffdf8` 导致「记一笔 / 添加物品」整套观感发黄，已再次改回，不要再动）；`.dp-home-surface` 单独覆盖成 APK 实测的 `#fffdf6`，`.dp-drawer-surface` / `.dp-category-surface` 也是纯白。暖米主视觉只由 `--dp-color-ground`、页头渐变、统计卡渐变、胶带、hero 圆等令牌承载，**不要靠把 panel 调成米白来实现**。
- **底部抽屉统一中性灰白 `.dp-sheet-surface`**（APK 1080×2340 逐点取色）：抽屉底 `#f4f4f4`、卡片 `#ffffff`、胶囊与分类块 `#ececec`、分隔线 `#efeae5`。这些弹层经 Radix Portal 挂到 `body`，拿不到页面级作用域，所以在其容器上重定义 `--dp-color-ground` / `panel` / `ground-muted` / `rule` / `track`，**不动 ink 字色、不改全局 ground**（首页暖米主视觉不受影响）。落点：`components/confirm/index.tsx` 的 `DialogContent` 基础类（一次性覆盖所有 `createConfirmProvider` 弹层）+ `app-chrome` 快捷新建抽屉根节点 + `components/ui/popover.tsx` 的 `PopoverContent` 基础类（Radix Popover 同样 Portal 到 body，否则「分类管理」这类 `bg-ground-muted` 按钮会吃回全局暖米 `#eee0c8`）；`bill-editor` 等 `contentClassName: "bg-ground"` 会自动取到作用域内的 `#f4f4f4`。内部已有 `.dp-drawer-surface` / `.dp-category-surface` 的子元素变量就近优先，互不干扰。
- **首页折叠态问候带**（`pages/home/index.tsx`）：高 44px、`viewBox="0 0 393 44"`，左 `#e7e0cb` / 右 `#f2e2c3` 双色 + 从 `(180,0)` 向右下弯的斜楔（`M180 0 Q190 24 230 44`）；下缘是**中间上拱的浅弧**（`M0 0 H393 V39 C330 43 265 33 196 24 C130 17 60 26 0 37 Z`，相对带顶：左 37 / 中 24 / 右 40，按 APK 1080×2340 缩到 393 宽逐列实测，各列误差 ≤1px），**不是 S 形波浪**；右上黄圆、左下青绿弧只属于展开态 hero，折叠态不要画。曲线下方是恒定的 `--dp-color-ground`（`#fbf7ef`），所以 `MainLayout.showTopFade` 的暖米纵向淡出**只对 `/ledger` `/medical` `/inventory` 生效**，首页套用会让曲线下方明显发黄。顶部 tab 字号 16px（线上 15px，**字重必须保持线上原样**：激活 `font-bold` / 未激活 `dp-text-medium`，禁止为了追 APK 字高改粗细）、问候语 15px；nav 与橙条沿用线上 `pt-2 pb-3` / `bottom-1`。曾把 tab 拉到 18px，粗体笔画被放大后显粗、且下方问候带/卡片比例失调，已回退，不要再放大。首页卡片底色由 `html:not(.dark) .dp-home-surface` 局部覆盖成 APK 实测的 `#fffdf6`，全局 `--dp-color-panel` 保持纯白 `#ffffff`；`--dp-color-ground` 不参与此项调整。
- **首页概览卡与波浪描边**（`pages/home/index.tsx`，APK 1080×2340 逐点取色）：① 折叠态浅弧下缘压一条 1px `#fcf8f0` 高光描边（`--dp-color-greet-edge`，暗色 `#2f271f`），路径只画曲线段 `M0 37 C60 26 130 17 196 24 C265 33 330 43 393 39` 且用 `vectorEffect="non-scaling-stroke"`，纯 clipPath 硬切会让人觉得「问候带和下面之间少画了一条线」；不要描整个闭合矩形。② 概览卡外框实测 1px `#ede8dc`（顶部因抗锯齿呈 `#f1ece1`，`--dp-color-home-frame`，暗色 `#3b3128`）、卡内 `#fffdf6`、卡外 `#faf6ee`；用 `shadow-[inset_0_0_0_1px_var(--dp-color-home-frame)]` 而非 `border`，避免挤掉内容区 2px 打乱下方比例。APK 圆角实测约 21–24px，本地已从 12px 统一到 **24px**（与同页今日总结卡、记账票券卡一致，用户确认按 APK 对齐）。④ **卡片尺寸与间距按 APK 实测对齐**（APK 1080 宽，卡片左右留白 52 图像 px、首页两卡间距 82 图像 px，换算 18–19px / 27–30px）：页面容器 `px-[18px]`（原 `px-4`=16）、header（`app-chrome` 的 `max-w-[960px]` 行）与 dock 同步 `px-[18px]`，保证卡片左缘与头像/标题对齐；概览卡→今日总结卡 `mt-7`=28（原 `mt-5`=20）；概览卡内部 `px-4 pb-4 pt-4` + 两栏各 `mt-4`/`mt-3`，卡高 118px（APK 121，原 98 明显偏扁）；中线用 `inset-y-4`。记账/归医/知物页容器同步 `px-[18px]`。③ 「本月支出 / 今日待办」图标是 APK 原始暖色插画 `public/overview/expense.svg`（金币钱包）与 `todo.svg`（绿夹子剪贴板），来自 apktool 资源 `assets/material/overview/{expense,todo}-warm.svg`，20px；**不要换回 Lucide 线性图标**，同目录的 `expense.svg` / `todo.svg`（橙/蓝单色扁平 20 口径）是另一处用的，别混。这三项只在首页作用域生效，全局 `--dp-color-panel` 与其它页签渐变均不变。
- **分类图标只属于二级分类**（用户明确要求）：`ledger/category.ts` 的 12 个一级分组 `icon: ""`，**不要给一级补图标**；只有二级分类带 `/category/*.webp` 插画。`category/item.tsx` 的 `CategoryIcon` 加 `category.icon &&` 条件；`ledger/item.tsx` / `bill-info/form.tsx` / `category/form.tsx` 本来就有条件，保持。一级分组只用于归类、分组标题与拖拽排序，不参与任何图标渲染。
- **记一笔分类区**（`bill-editor/form.tsx` + `bill-editor/category-sheet.tsx`）：① 一级大类是**纯文字横滑灰带**（`h-10` 行 `bg-ground-muted` #ececec，每项 `h-10 min-w-[50px] px-1.5`、无 gap、无橙色描边胶囊；用户要求「一级分类的间距可以再小点」，从 `min-w-[60px] px-2` 收窄到 50px，10 项总宽 500px 仍可横滑）；**灰带必须顶到卡片上沿与左右边缘**：卡片去掉 `px-3 pt-2.5`、保留 `overflow-hidden rounded-[22px] bg-panel pb-3`，灰带自身不要 `rounded-xl`（用户要求「选中态要包含整个区域，不要上面旁边还留有一点」），实测 `rowTop===cardTop`、`rowLeft===cardLeft`、`rowRight===cardRight`、选中块上下 gap 都为 0；**删掉一级与二级之间的 `h-px bg-rule` 分隔线**，让选中白色块与下方白色内容区连成一片（和抽屉左栏选中块与右栏同色拼接同理）；选中态沿用分类抽屉左栏的整块变色：**整块 `bg-panel` 白色 + 橙字**，但横排时指示器是**分类名下方居中的横橙条**（`absolute bottom-0 left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-t-full bg-brand`，用户明确「不再是竖的橙条」），未选中 `text-ink-secondary/80`；**要体现一级可以横滑**：项宽 50px（第 6 项半露）+ 右缘 `w-20` 渐变淡出（`linear-gradient(to right, transparent 0%, var(--dp-color-ground-muted) 100%)`，全宽渐变；用户嫌 `w-10`+80% 的淡出「现在看不出来」，已加宽到 80px 且不再提前封顶，二级行的右缘淡出同步 `w-6`→`w-12`）；用户明确「右边有模糊就行了不用右箭头按钮」，**不要叠 `chevron-right` 等箭头**；用 `onScroll` + `syncGroupRowScroll` 维护 `groupRowAtEnd`，滑到底自动隐藏淡出；点大类自动落到该组首个二级，**一级行不放「更多」按钮**；**分类卡片紧凑且二级图标在白色区垂直居中**（用户明确「分类卡片没必要搞这么大」「二级图标要在白色区域的中间」）：现卡片 139px = 一级灰带 `h-10` 40 + 白色区 99（二级格子 71 + 二级行 `py-3.5` 上下各 14），卡片不加 `pb`、二级行不加 `mt`，上留白＝下留白严格对称，顶部 `flex-1` spacer 约 15px；**卡片间距按 APK 对比调整**：APK 侧边抽屉相邻卡片间距 44 图像 px ÷2.75 ≈ 16 CSS px、首页概览→总结卡 ≈ 22px，我们原来 12px 偏紧（用户要求「APK 也这样才不用管」），故分类→meta、meta→金额框改 `mt-4` 16px；**金额框→键盘仍是 `mt-3` 12px**（用户早前专门要求「白框和键盘间距改回去」，别动）；`BillCategoryCell` 内边距统一 `p-1.5`，不要给主表单单独放大图标（已废弃 `largeIcon`）；**不要把主表单改成抽屉那种左右分栏/竖栏**（用户已明确回退一次：「保持原来的横向滑动，选中 1 级分类的交互改成抽屉里面的交互」＝只改一级选中态，二级仍横滑且不跨大类）；② 二级分类是一屏 5 个、可左右划的横向行（`[data-sub]`，全量渲染不截断，超过 5 个时右边缘淡出提示；从抽屉选中的二级自动滚入视野），每格宽度 `w-[calc((100%-48px)/5)]`；③ 二级行右边缘固定一个 **24px 小展开按钮**（`bg-brand/10` + `lucide--layout-grid` 图标，常驻不参与滚动，不做成和图标一样大的格子），点它从底部上滑 `showBillCategorySheet` 抽屉：**锚点式左右分区**（用户明确「全部都不需要了，就是自然滑下去滑到某个分类，左边就自动选上」）——右侧是「常用 + 各一级大类」拼成的**一条连续分段列表**，每段 `[data-section-id]` + 5 列图标网格（`gap-x-1`，格子约 58px；用户明确「一行也要 5 个，可以稍微牺牲点大小」，但铺满后要适当放大），**没有「全部」筛选项，也不再按左侧点击把右栏替换成单个大类的网格**；左侧 `w-16` 竖栏只是这些段落的锚点（每项 `h-[52px]` + `gap-0`，选中块上下不留灰缝；用户嫌原来 36px + 6px 太密、又要求「整块区域变色」）；右栏 `onScroll` 以 `grid.top + 16` 为判定线按段顶反查 `activeId`，滚到底强制高亮最后一段，点左栏则 `scrollTo({ top, behavior: "smooth" })` 到对应段并用 `lockScrollSync` 锁 600ms 抑制反向联动（卸载时清 timer）；早期「不按大类分组平铺」「点左侧筛选单组」「切大类 `scrollTo(0)`」三种做法均已废弃：每段一个 `[data-section-title]` 标题（12px 常规 `text-ink-secondary/80` 浅灰组名 + 左右两条等分 `flex-1` 的 `bg-ink-secondary/15` 细线，组名严格居中）+ 该组 5 列图标网格，组间 `mb-3.5`，跳过空的一级大类分组、常用段为空仍保留并显示空态；标题**随内容滚动、不要 sticky**（吸顶会盖住上一组图标，只剩半截名称文字）；分类相关文字统一浅一档：左侧竖栏未选中项、分组标题、`BillCategoryCell` 图标下方名称都用 `text-ink-secondary/80`（原来是 `text-ink-secondary` / `#8a8a93` / 深色 `text-ink` 加粗），名称的 `text-center` 居中不变，共用 cell 会同步影响主表单二级分类名；「常用」是列表第一段（无数据时该段显示 `bill-frequent-empty` 空态，左栏仍保留锚点），每个分段都有组名标题；**不要竖分割线**：内容区去掉左侧 `px-4`、左栏灰带 `bg-ground-muted`(#ececec) **顶到屏幕最左边（`left=0`，不能留一条更浅的白边）**，比右栏 `bg-ground`(#f4f4f4) 略深一档形成低调分区；选中块是 `h-[52px]` 的**整块矩形**（不要左侧圆角、上下不留灰缝），`bg-ground` 与右栏**同色**、配 3px 品牌橙竖条 + 橙字（参考外卖 App 的分布与选中态，配色用项目自身中性灰 + 品牌橙，不抄其橙红/蓝灰）；未选中项不再有白底圆角块，避免密集；**内容区外层不要 `pb-6`**（会截断左栏灰带、底部缺一截），底部留白放到两栏内部：左栏 `pb-6`、右栏 `pt-2 pb-6`，保证灰带一直铺到抽屉底边（实测 `railBottom === drawerBottom`）；右栏只留 `px-3`，铺满后图标格子从约 52px 放大到 58px；「分类管理」从底部一整行改成**标题栏最左侧齿轮**（`aria-label="分类管理"`），「选择分类」标题用 `absolute inset-x-0 text-center` **居中于抽屉中心**；**右上角关闭 X 已换成 `w-[116px]` 圆角搜索框**（`input[type=search]` + 清空按钮，关抽屉靠点遮罩 / 下拉），抽屉底部不再有管理按钮；齿轮**不再返回 `manage`**，而是直接在抽屉之上叠开 `showCategoryList(edit.type)`（沿用项目已有的多层 Provider 叠放），点「返回」关闭分类管理页后**抽屉仍在原处、滚动与搜索状态都保留**；搜索只按二级分类名 / 英文 id 匹配（**不匹配大类名，用户明确「搜大类名不用管」**），结果在右栏平铺 5 列、左栏不高亮，清空恢复连续分段，搜索态点左栏会先退出搜索再滚到该段；④ 抽屉只返回 `{categoryId}`，一级高亮由 `findGroupOfCategory` 反查同步，`changeType` / `getMatchDefaultCategory` 仍把一级 id 落到二级；⑤ 表单已删除「再记」按钮。分类卡总高度保持两行，金额输入区必须完整可见。
- **记一笔分类区补充规范**（用户逐条确认）：① 一级 chips 选中态与二级分类**同款橙色描边框**（`border-brand bg-[#f6e0d2]`，未选中 `border-transparent`），抽屉筛选 chips 同步；② 一级行首位是「常用」虚拟分组（`FREQUENT_GROUP_ID = "frequent"`，带 `lucide--flame` 小图标）：统计**最近 10 天、同收支类型、按 `categoryId` 出现次数降序**的 top10 二级分类，抽屉左侧锚点首位也是「常用」（对应右侧连续列表的第一段），无数据用 `bill-frequent-empty` 空态；挂载时调一次 `refreshBillList()` 补齐账单（store 首屏只有 200 条且不保证按时间排序），用 ref 防止重复；停在「常用」时 effect 不按所属大类跳走，从抽屉选分类由 `openCategorySheet` 显式 `setActiveGroupId` 同步；③ 备注改成 `remark.tsx` 的 `showRemarkSheet` 底部抽屉（输入框 + 推荐备注 + 取消/确认），主表单只留点击触发按钮，**不要再嵌 `IOSUnscrolledInput` 或自动 Popover**；④ `keyboard.tsx` sheet 变体：公式含运算符时橙色主键从「完成」变「=」，点击先 `press("=")` 结算、再变回「完成」，`+` / `−` 与数字键共用基础样式、激活时用橙色描边框 + 浅橙底（ghost variant 的 `hover:bg-accent` 会盖掉底色，必须同时给 `hover:bg-[#f6e0d2] hover:text-brand`）；⑤ meta 行 `[data-meta-row]` **只统一相邻间距，不要改各选项宽度**（宽度随内容：日历约 170px / 图标 36px）——用户明确纠正过「不是选项一样宽，是选项之间的间距一样宽」，容器 `gap-3`(12px) + `[&>*]:m-0 [&>*]:shrink-0`，chip 统一 `h-9` / `px-3`；**meta 行不再放币种按钮**（见下条）；⑥ **新建账单默认落在「常用」的第一个二级分类**（用户明确「默认应该选中常用的第一个，而不是餐饮的第一个」）：`pickFrequentCategories(bills, groups, type)` 抽成纯函数供初始默认值与 `changeType` 共用，`defaultCategoryRef` + `frequentDefaultAppliedRef` 保证只应用一次、常用数据异步就绪后生效、用户已手动改过 `categoryId` 就不再接管；常用为空时回退到第一个一级大类的首个二级，切换收支类型等于重新进入默认态同样优先常用第一个。**默认应用与「一级高亮按 categoryId 反查同步」必须写在同一个 `useEffect` 里**：拆成两个 effect 会读到同一批次的旧 state，同步 effect 会把刚设的 `FREQUENT_GROUP_ID` 按所属大类覆盖回「餐饮 / 交通」，表现是一级高亮错误、二级行变成该大类的子项。
- **记一笔币种入口**（`bill-editor/currency-sheet.tsx`）：金额前的货币符号本身是 `[data-currency-trigger]` 按钮（符号 + 极淡 `lucide--chevron-down` 提示可点），点它从底部上滑 `showBillCurrencySheet` 抽屉：「快捷币种」（`quickCurrencies`，为空时给设置提示）、「全部币种」（本位币固定首位，2 列网格，选中态同款橙色描边 + 勾）、底部「汇率与货币」→ `showCurrencyList()` 设置页（本位币 / 快捷入口 / 自定义汇率 / 自定义币种）。选中返回 `{currencyId}` 交给表单原有 `changeCurrency()` 做汇率换算，原币金额不变、右下角显示 `≈ ¥ …`；选回本位币即清掉 `currency`。**不要再在 meta 行放 `Select` 或静态「人民币」chip**；`quickCurrencies` 由抽屉内部 `useCurrency()` 获取，表单不再解构。金额白框保持**恒定 64px 一行**、备注垂直居中；`≈ 折算` / 负数提示确定放在**白框内金额行右下角的 10px 角标**（`flex-col items-end self-end`，与备注同排、不另起行），不再放框外。两个已踩的坑：① 金额清空时 `Calculator.Value` 会从 40px 塌到 36px，白框在 60↔64px 跳动 → 金额行必须 `min-h-10`；② 内容区 `flex-1` 会在白框下方留 16px 剩余空白，加键盘 `mt-3` 后白框到键盘看起来有 28px → 内容区首个子元素加 `<div className="min-h-0 flex-1" aria-hidden />` 吸收剩余高度，让白框贴内容区底、间距回到 12px（键盘最后一行仍在屏内）。
- **meta 行日期间距的坑**：`wheel-date-picker.tsx` 的 `DialogTrigger` 里 `<div className="mx-2">{display(current)}</div>` 在 `displayFormatter={() => ""}` 时仍会渲染并白占 16px，导致日期 chip 与后面按钮的视觉间距变 28px（其余都是 12px）；已改成 `displayText` 非空才渲染。改完 `[data-meta-row]` 的可见间距应恒为 `[12,12,12]`。
- **快捷新建抽屉**（`app-chrome`，APK 折叠态）：5 项纯文字按钮「记一笔 / 新有期 / 添资产 / 添物品 / 新就诊」，2 列网格末行只有左侧 1 个；按钮 `h-12 rounded-2xl border border-rule bg-panel`，**靠 1px 细边而非暖阴影**，hover 只加深边框、不要变成灰底。文案独立 key `quick-*`；`添资产` 因项目暂无独立资产表单，落到知物（资产总览）页，`新就诊` 走 `showMedicalVisit` 且无成员时提示。
- **添加物品表单**（`inventory/item-form.tsx`）：APK 折叠态是居中加粗标题、**无返回 / 无右上确认**，底部一个全宽橙色「确定添加」按钮（名称为空时 disabled）；`PopupLayout` 用 `hideBack`、不传 `right`，提交逻辑抽成 `submit()`。抽屉 `dialogModalClose: true`，点遮罩即可取消。其它表单的标题栏不受影响。
- **中文字重**：Windows 中文字体只有 400/700 两档（400≡500、600≡700），`dp-text-medium` 只保留 `font-weight:500`；**禁用 `-webkit-text-stroke` 补中黑**（笔画边缘会叠出灰边/双线重影）。iOS PWA 命中 `PingFang SC` Medium，天然更接近 APK 的中黑；金额数字保持 `font-bold`。
- **DPR=1 的亚像素坑**：日历圆环必须整数环宽 31/27/23px（橙环、白环各 2px）；1.5px 环宽会被取整成「1px 实色 + 1px 半透明」，左上半圈发淡、白环断开。任何 <2px 的边框/环宽都要在实景截图里按圆周角度取色验证，不能只看 DOM 尺寸。
- **品牌图标 / 默认头像（用户明确：只换 App 图标和默认头像，首页吉祥物一律不动）**：`public/icon.png`（512，同时是「关于胖记」页 80px logo 与 `api/endpoints/{offline,s3,web-dav}` 里 `avatar_url` 的默认头像）、`public/icon-192.png`（manifest 192）、`public/apple-touch-icon.png`（180，iOS 主屏）、`public/favicon.ico`（16/32/48，单独收紧到猫头，否则 16px 下糊成一块）。素材为 AI 生成的橘猫图（1024），右下角「豆包AI生成」水印用「同一行左侧背景横向搬移 + 逐列色差线性校正 + 12px 羽化」消除（不要用高斯涂抹，会在平整奶油渐变上留下暗斑），母版在 `.playwright-cli/watermark/icon-no-watermark.png`（gitignored）。三张 png 统一 256 色量化（icon.png 512≈104KB、192≈20KB、180≈18KB），避免全量预缓存把体积顶上去。`index.html` 的 `apple-touch-icon(-precomposed)` 原本指向 `s3.bmp.ovh` 远端占位图，已改为本地 `/apple-touch-icon.png`；manifest `icons` 指向 `icon-192.png` / `icon.png`（512），声明尺寸与文件实际像素必须一致。**`src/assets/mascots/*`（家小满小暖/小吉/小雨/小智）与首页插画不要替换成猫头图标**。原图猫头**偏上**（上留白 121px / 下留白 196px，内容中心 y=474 而非 511.5），必须按**内容包围盒重新居中**后再出图：内容下移 38px、顶部空出的 38 行用「上邻 38 行垂直镜像」补齐（背景是近似纯色竖向渐变，镜接缝不可见），改完实测上留白 159 / 下留白 158、左右 98/97、内容中心 (512,512)；居中母版 `.playwright-cli/watermark/icon-centered.png`。**以后换图先跑一遍包围盒居中，不要直接沿用 AI 原图构图。**
- 注意语义色是反直觉的：支出为绿色、收入为红色，与现有账单卡片一致。
- 深色模式通过 `.dark` 下的同名令牌覆盖实现，新增颜色必须同时考虑两套值。
- 安全区统一用 `var(--safe-area-inset-*)` 或项目封装变量，不要在业务组件里直接写 `env(safe-area-inset-*)`。
- 页面是移动优先，主内容最大宽度约 960px；底部操作栏/键盘需处理 `--safe-area-inset-bottom`。
- **圆形分类图标格子不要用 `aspect-square`**（iOS WebKit 踩坑）：`aspect-ratio:1` 在 WebKit 上按内容盒算比例后再叠加 `padding` + `border`，真机（iPhone 16 Pro，402×874）实测 59.3px 宽的圆被拉成 59.3×73.3 竖椭圆（多出 14px 正好是 `p-1.5` 12px + 1px 边框 ×2），Chromium 下完全正常，所以只在真机暴露。`BillCategoryCell`（`bill-editor/category-sheet.tsx`，主表单与分类抽屉共用）与 `IllustrationCell`（`category/form.tsx`）统一用 `relative block w-full rounded-full` + 行内 `paddingBottom: "100%"`（百分比内边距始终相对宽度，与 `box-sizing` 无关），内边距与图片放进 `absolute inset-0` 内层，选中描边用 `ring-1 ring-inset ring-brand`（box-shadow 不占盒尺寸）；**外框不要再叠加 `aspect-ratio` 或 `padding`/`border`**，否则直接变 2:1 椭圆。
- **记一笔键盘区与底部安全区**（`bill-editor/form.tsx`）：`PopupLayout` 默认带 `pb-[var(--safe-area-inset-bottom)]`，键盘容器原本还有 `pb-3`，两份叠加会挤掉内容区约 34px，而顶部 spacer 只有 13px 可缩，导致金额白框下半截被键盘盖住（真机约 33px）。现给表单的 `PopupLayout` 传 `className="... pb-0!"`，由键盘容器用 `pb-[max(0.75rem,var(--safe-area-inset-bottom))]` 单独承担（取 max 不叠加）；金额白框另带 `sticky bottom-0 z-10` 兜底，保证任何视口下完整可见。无安全区时间距仍是 16/16/12、金额框↔键盘 12px。
- **每轮 UI 改动都要在真 WebKit 引擎上按 iPhone 16 Pro 验一遍**（Chromium 测不出 iOS 的 `aspect-ratio`／安全区差异）：本机已装 `webkit-2386`（WebKit 27.2，176MB，在 `%LOCALAPPDATA%\ms-playwright\webkit-2386`）。安装走国内镜像，官方源常卡死（曾 4 分钟仅 0 字节、13 分钟未完成）：`PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright playwright-cli install-browser webkit`（镜像 3MB/s，23 秒完成）。**运行前必须清空代理变量**，否则 WebKit 走系统 `HTTP_PROXY=127.0.0.1:55185` 会让 `localhost:5173/assets/*.js` 全部 404、页面白屏：`export HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy= ALL_PROXY= all_proxy=` 后再 `playwright-cli open --browser webkit`。`open` 与 `run-code` 必须写在同一条命令里（分开执行会话已关闭）。口径：视口 402×874（iPhone 16 Pro CSS px），断言分类圆 `w===h`（ratio 1.000）、分类→meta→金额框 = 16/16、金额框不被键盘裁切、键盘完整到 874。脚本见 `.playwright-cli/webkit-verify2.js`。
- 图标全站统一用 **Lucide 细线图标集**（`@iconify-json/lucide`），类名形如 `icon-[lucide--utensils]`，与家小满 APK 的单色细线按钮图标同源；**不要再新增 `mdi--*`**（旧 MDI 集仅保留作依赖兜底）。`src/utils/icon-map.ts` 是唯一的旧数据兼容层：258 个 `mdi--*` → `lucide--*` 映射以字面量列出（Tailwind 据此生成 mask 规则，勿改成动态拼接），`normalizeIconClass()` 在渲染时把账本/自定义分类里存下来的旧 className 归一化到新图标。分类图标（`components/category/icon.tsx`）按 icon 值分四种渲染：图片 URL（`/`、`http`、`data:` 开头，走 `<img>`）、SVG 字符串、**emoji 纯文本**（非 `icon-` 开头按字符渲染；自定义分类仍可用，默认分类已改为 WebP 插画）、其余按 Iconify 类名。**APK 原 SVG 图标集**：`apps/cent/icons/apk/` 是本地 `@iconify-json/apk` 包（`file:./icons/apk` 依赖），由 `E:\code\_apk_homefull\tools\build-apk-iconset.py` 把反编译导出的 64 个原 SVG 转成 `icons.json` + 插件必需的 `info.json`，类名形如 `icon-[apk--budget]`。单色图标把颜色归一为 `currentColor` 并补 `<g fill="none">`（原 `<svg fill="none">` 外壳属性会被 Iconify 丢掉，不补会渲染成实心剪影）；非正方形图标用 `left/top` 归一到正方形 viewBox 居中，避免 `size-*` 拉伸；彩色插画保留原色。抽屉宫格 / 快捷记账 / 底部输入条与全站通用操作共 19 个图标走这套，APK 无对应资源的入口继续用 Lucide。图标按需内联成 CSS data URI，不新增 HTTP 请求或 PWA precache 条目；改动图标集后要重跑生成脚本再 `pnpm build`。Biome 已排除 `apps/cent/icons/**` 与 `dist-apktest*`，避免把构建产物和单行 JSON 算进格式检查。
- **家小满对齐组件**（改 UI 优先复用，勿另造）：`components/ticket-card`（票券卡：打孔虚线+胶带贴纸+装饰角+吉祥物探头）、`components/segmented-tabs`（页面分段控件：浅容器+白色凸起激活胶囊）、`components/empty-state`（吉祥物空态，注意家小满的列表空态是纯文字，仅引导型空态才用插画）、`components/form-rows`（**行卡片表单基元**：FormSection 分组标题 / FormCard 白卡细分割线 / FormRow 左标签右值 / RowInput 行内透明输入 / CountedRowInput 带 n/255 计数，生活模块五个表单全部用它，勿再写 label+Input 堆叠式）、`components/wheel-date-picker`（**滚轮日期选择器**：底部二级抽屉 ✕/标题/橙✓ + scroll-snap 滚轮；datetime-local 五列、date 三列、month 两列只选年月；支持 open/onOpenChange 受控打开；中性样式为 #f4f4f4 底、白色胶囊、选中 #0a0a0a / 未选 #8b8b8c、17px semibold 标题；头部两个圆按钮 `size-9`(36px)，白圆内 `apk--close` 叉 14px、橙圆内 `lucide--check` 勾 20px——原为 44px 圆 + 20/24px 图标，用户嫌叉太大，左右必须同步缩小才能保持对称）。吉祥物立绘在 `src/assets/mascots/`（webp）。字体保持系统默认（用户已明确不用 Noto Sans SC webfont）。
- **底部 dock 加号按页签分派**（对齐家小满，`components/app-chrome/index.tsx`）：首页=「快捷新建」底部抽屉（纯文字按钮：记一笔/新增周期记账/添加物品/添加成员）；记账=dock 上方两卡（账单导入/记一笔，无遮罩）；归医=按子页签分派（健康档案→添加成员档案、药箱→添加药品、就诊记录→添加就诊，**无成员时 toast 拦截**，子页签经 `/medical?tab=` 传给 dock）；知物=直接添加物品（全部/实物/虚拟是筛选不分派）。
- 生活模块表单抽屉底色用 `bg-ground!`（provider 的 `contentClassName` 追加）+ 白色 FormCard，与家小满「灰底白卡」同构；记一笔的分段控件是**外层白胶囊、选中浅色凸起**（与直觉相反，勿改回）。
- 文案必须同时更新 `src/locale/lang/zh.json` 和 `en.json`；组件内用 `useIntl()` 的 `t()`，非组件代码用 `@/locale` 导出的 `t()`。两个语言包不参与 Biome 检查，手动保持格式一致（key 近似按字母序）。**语言包必须以 UTF-8 读写**：曾发生并发会话以 GBK 写入导致中文大面积损坏（423 处截断），恢复手段见第 11 节。
- 二级页面（`/stat`、`/search`、`/inventory`、`/medical`、`/vehicle`）使用自己的返回头部，全局 AppChrome 会隐藏；修改壳层时先读 `components/app-chrome/index.tsx`（底部 dock 含吉祥物切换与加号分派）。
- **四个已踩过的坑**：① `components/ui/dialog/index.tsx` 的 WAAPI 动画收尾必须用 `commitStylesSafe()`（快速关闭时元素已出 DOM，直接 `commitStyles()` 抛 InvalidStateError）；② `Intl.DateTimeFormat` 的 `dateStyle` 与 `weekday` 等分量选项互斥，同传会抛 `Invalid option` 白屏；③ `useLedgerStore` 的选择器若返回 `?? []` 之类的新引用，必须包 `useShallow` 或复用带 `useShallow` 的现成 hook（如 `useAutoRules()`）——裸选择器会让 React 判定快照永远在变，`getSnapshot should be cached` 警告 + `Maximum update depth exceeded` 崩溃（记一笔曾因此打不开）；④ 本应用是 MemoryRouter，`window.location` 不反映路由（hash/search 恒空），跨组件读路由状态一律用 `useLocation()` / `useSearchParams()`。

## 9. 本 fork 的定制现状

相对上游，本 fork 已重做：

- 全局壳层：顶部头像 + 「胖记」标题 + AI 入口 + 首页/记账/归医/知物 Tab + 底部 dock（吉祥物随页签、加号按页签与子页签分派）（`components/app-chrome`）。
- 首页：hero 大字问候（滚动折叠吸顶）、票券式今日总结、近期提醒、概览卡（`pages/home`）。
- 记账页与分析页：票券式月度收支卡、筛选/分析胶囊、统计视图（`pages/ledger`、`pages/stat`、`components/stat`）。
- 个人中心抽屉（`components/profile`，含物品/医疗/车辆/贷款/自动规则入口，关于胖记位于抽屉最底部；首页高级功能推广与 buy me coffee 已移除）。APK 现场实测规格：`w-[80%] max-w-[340px]`；用户行 42px 头像 + 16px 昵称 + 20px 箭头、净高 74px；日历 31px 日格 / 31-27-23px 圆环，橙内圈仅在当天有账单时出现、连续记录徽章仅在 `streak>0` 时出现；宫格 67px 行高 / 91px 列间距 / 20px 图标 / 12px 标签，卡片间距 16px。胖记保留 11 个功能项（APK 仅 7 项），第 7 位固定「贷款计算」以对齐前 3 行 3+3+1 结构。完整逐项实测与 22 条修订记录见 `docs/homefull-style-spec.md`。
- 四个一级页签页的列表缺省态统一为**纯文字**（不配插画、引导按钮或「共 N 笔」栏）；空态文案有专用 i18n key，勿复用其它页面的键。
- 暖色设计令牌与深色模式（`index.css`）。
- 记账底部抽屉：日期/币种/标签胶囊、内联备注（含自动规则建议胶囊）、滚轮日期选择器、4×4 键盘、下拉关闭（`components/bill-editor`、`wheel-date-picker`、`components/keyboard.tsx`、`components/ui/dialog/index.tsx`）。一级分类为无图标的纯文字分组块，二级分类用彩色插画。
- 账单分类（`ledger/category.ts`）：两级结构，一级 12 个分组无图标，二级 42 个分类（37 支出 + 5 收入）名称与插画取自家小满分类模板；`id` 与 WebP 文件名统一为英文语义 slug，存于 `public/category/`（默认 42 张 + 可选 61 张 = 103 个文件、约 352 KiB）。分类管理页（`components/category/list.tsx`）为「分类管理」：胶囊支出/收入 tab、白卡列表、白底分节标题行（仅拖拽手柄） + 红减号/插画/名称/方框铅笔/拖拽的子项行，无折叠。子项编辑笔用 `icon-[lucide--square-pen]`（圆角方框 + 斜笔），不是单支 `pencil`。`use-category.ts` 以当前默认表为准，仅叠加 UUID 形式的用户自建分类；旧分类 ID 与历史账单不做兼容。页面配色由 `index.css` 的 `.dp-category-surface` 局部作用域提供（#f4f4f4 底 / #ffffff 卡 / #18181b 文字 / #ef4444 减号 / #f0f0f0 分隔线），右上角不提供重置入口，子项行高 54px。**一级分组固定不可增删改**：标题行没有加号/铅笔，也不能通过表单新建（「大类」下拉不含「无父类」），新增统一走右上角「添加」。每个一级分组是一张独立白卡（`rounded-[18px]` + `overflow-hidden`），卡片之间留 12px 页面灰底间隔（`flex flex-col gap-3`），明显大于行间 1px 分隔线，避免不同组连成一片；标题是卡片顶部的**白底**分节带（`bg-panel` / 14px·600 / `text-ink-warm` #3f3f46 / h-8）：与整张白卡同色，只靠加深的标题文字和底部 1px `border-rule` 分隔线区分层级，不再用灰带，避免与 15px 黑字的子项行抢对比。
- 分类管理交互：排序用 `@dnd-kit` 在列表内**原地拖拽**，不跳二级页（`list.tsx` 的 `DndContext` + `SortableContext`，`item.tsx` 的 `useSortable` 手柄 `aria-label="drag"`）。`MouseSensor`（distance 6）负责桌面，`TouchSensor`（delay 160 / tolerance 6）负责触屏长按，避免 PointerSensor 抢掉页面滚动。一级分组与其全部二级分类包成同一个 `useSortable` 节点（`item.tsx` 的 `CategoryGroupBlock`），拖动时整块一起移动；组内子项用嵌套 `SortableContext` 保持可单独排序。`list.tsx` 的 `layeredCollision` 按层级过滤碰撞目标（分组只对分组、子项只对同组子项），保证两层排序策略都能拿到有效的 `overIndex`；变换只用 `CSS.Translate`（不带 `scaleY`），否则高分组拖到矮分组时整块会被压扁。子项只允许同组内换序。`use-category.ts` 的 `reorder()` 只替换参与排序的槽位、保留其它分类的绝对位置以维持层级，松手时先**同步**写一次内存（`align()`），dnd-kit 才能当帧按新顺序收尾，否则会先弹回旧位置、等异步落盘后再跳到新位置；随后持久化、刷新并在落盘后再次对齐。`offline/core.ts` 的 `batch()` 已把 `notifyChange` 移到 `metaStorage.setValue` 之后，避免监听方刷新时读到旧快照。先检查 `currentBookId`，未选账本时直接返回避免抛错。二级分类行的编辑笔与右上角「添加」共用同一个 `showCategoryEdit` 底部上滑抽屉（`edit.tsx` 的 `from: "bottom"`、`h-[84vh]`、`rounded-t-[28px]`），`form.tsx` 顶部还原 APK 布局：**不加白底卡片**，直接在抽屉灰底上把 64px 白色圆形图标预览、大类选择按钮、名称文字（空态显示占位）+ 单支 `pencil` 小铅笔放在**同一排**（`flex items-center gap-3`）。名称不是常驻输入框，点文字或铅笔调用 `name-dialog.tsx` 的 `showCategoryName()` 从底部再弹一层抽屉输入（白底圆角输入框 + 取消/确认，空值禁用确认），返回后 `form.setValue("name", ...)`；该 Provider 直接挂在 `form.tsx` 内，靠 `createConfirmProvider` 的全局 zIndex 叠在主抽屉之上。两级分类比 APK 多出的大类选择是同排 `w-[64px]` 的**透明无边框**按钮（只显示中文两字分组名 + `chevron-down`，不带「大类」标签也不带白底）；**不用下拉框**，点击调用 `parent-dialog.tsx` 的 `showCategoryParent()` 从屏幕底部**直接弹出选项列表**（`createConfirmProvider` / `from: "bottom"` / `dp-category-surface` 灰底 + 白卡圆角，无标题、无勾选图标，每行 52px 文字居中，当前项仅用橙字区分，点遮罩关闭），返回 id 后 `field.onChange(next)`；Provider 与 `CategoryNameProvider` 一起挂在 `form.tsx` 内，靠全局 zIndex 叠在主抽屉之上。名称占位文案为「请输入分类名称」，不标「（必填）」；必填由 `form.watch("name").trim()` 判断，空值或纯空格时确认按钮 `disabled` 且置灰（#e4e4e8 底 / #a6a6ae 字），有值才恢复 `bg-brand`。`FormItem` 自带 `space-y-2` 需 `space-y-0`。顶部预览条下方是独立**推荐区**（`category-recommend` 标题 + 5 列横排 5 格），位置在「分类图标」标题行**之上**，再往下才是 5 列 102 格全量网格 + 全宽确认。**同一行字号必须统一**：顶部大类按钮与名称文字同为 14px，「分类图标」标题与搜索框输入同为 13px，网格名称小字 11px；列表页一级分组标题 14px·600 贴近子项 15px，避免字号落差造成「不在同一行」的错觉。选中图标时**只有名称为空（trim 后）**才按当前语言把 `ILLUSTRATION_NAMES` 里的图标名写回 `form` 的 `name` 字段并校验、让确认按钮解禁；只要上面已有名称（无论自动填入还是用户手输），选图标都完全不改动名称，不做「换图标跟着改名」。全量网格保持原始顺序、只用搜索框实时过滤，不按名称重排、不加推荐描边（排序置顶方案已废弃）。推荐候选先用 `ILLUSTRATION_GROUPS[src]` 过滤出与当前 `type` 一致的一级分组图标（靠 `parentOptions` 的 id 集合，天然隔离支出/收入）。推荐项不是路径而是 `Recommendation`（`key/src/group/name/display`），显示文字统一为「大类名-名称」（如「医疗-牙齿」，推荐格用 `wrap` 允许两行）。算法顺序：① 用 `iconMatchScore()`（0 同名 / 1 前缀 / 2 包含 / 3 图标名是名称子串 / 4 无关）找出文字命中的最佳图标，按其**真实大类**生成第 1 项（医疗-牙齿）；② 若该大类与用户当前大类不同，生成第 2 项「当前大类-图标名」（餐饮-牙齿）；③ 若输入原文与图标名不完全一致，生成第 3 项「真实大类-输入原文」（医疗-牙）；④ 剩余位置用 `shuffle()` 从当前大类候选里**随机**抽几张兜底（当前大类不足再补同类），保证每次不同、不总是固定前 5 个。整套计算放在 `useMemo`（依赖 `groupIds/currentGroup/nameQuery/rawName/locale`），同一组信号下保持稳定；`parentOptions` 用 `parentOptionsRef` 读，避免引用变化导致每次 render 重新随机。点推荐项是**一键套用**：`selectRecommended(item)` 同时替换 `category.icon`、`form.name`（`item.name`，可能是输入原文）和 `form.parent`（`item.group`），之后仍可分别点名称/大类修改；全量网格点选仍是 `selectIcon()`，只换图标、绝不覆盖已有名称。推荐区与网格共用 `IllustrationCell`，选中态需 `icon + name + group` 三者都相同（多个派生项共用同一张图，不能只比图标）。**只有点推荐项后**才用 `autoScroll`（带递增 `seq`，连点同一项也能触发）驱动 `useEffect` 把全量网格滚到该图标：`scrollTop = 当前滚动量 + 目标相对容器偏移 - (格高 + 12px)`，让目标图标所在行落在可见区第二行；网格容器 `ref` + 每格 `data-icon` 定位，打开抽屉 / 填名称 / 切大类都不滚。添加态默认图标用 `firstIconFor(type)` 按收支类型挑第一张（`INCOME_GROUPS` 区分收入组），避免添加收入分类时预选到「餐饮」这类支出图标。`illustrations.ts` 除路径数组 `CATEGORY_ILLUSTRATIONS` 外还导出 `ILLUSTRATION_NAMES`（`Record<路径, {zh,en}>`，102 条零缺失；中文取自带中文名的源 PNG 文件名，英文来自生成脚本或 slug 转 Title Case，冗长名已润色如「重大工作办理中」→「办事」）与 `ILLUSTRATION_GROUPS`（`Record<路径, 一级分组 id>`，102 条零缺失：42 张默认图标直接取生成脚本 `CHILDREN` 的 `parent`，61 张扩展图标按中文名语义显式归类，收入类归 `wage`/`other-income`/`relationship-income`）。网格每格下方 11px 名称：中文界面显示 `zh`、英文界面显示 `en`（`useLocale().locale`），选中项名称转橙字；「分类图标」标题行右侧是 `w-[164px]` 白底圆角搜索框（`icon-[lucide--search]` + `search-illustration` 占位），过滤同时匹配 `zh`/`en`/slug、**不做拼音**，无结果显示 `no-matching-illustration`，搜索态保留选中橙框、清空恢复全量。表单只保留插画选择：无「插画/图标/自定义」选项卡、无网格首格加号、无自定义 SVG 输入，右上角也不放关闭叉（靠点外部 `dialogModalClose` 或下拉手势关闭）。`defaultSelect` 开关、对应 `BillCategory` 字段、表单 schema / defaultValues / 变更比较与 zh/en 文案已整体删除；记账页 `getMatchDefaultCategory()` 改为直接取 `children[0]`，即选中一级分组时默认落到第一个二级分类。选项显示中文分组名（默认分类的 `name` 是 i18n key，运行时经 `intlCategory()` 转中文，不是英文 slug）；`NO_PARENT` 与「无父类」选项也已删除，`resolveParent()` 兜底到第一个分组；一级分组编辑（`isGroup`）不渲染图标与大类控件，提交时 `parent` 固定 `undefined`，避免把分组误挂成二级。`components/category/icons.ts`（旧图标字面量清单）已无引用，但保留不要删，Tailwind 需要扫描其中的 `icon-[...]` 类名以兼容历史自定义分类数据。删除分类走**一次二次确认**（`components/category/delete-dialog.tsx` 的 `showCategoryDelete`，基于 `createConfirmProvider`）：居中 320×168 白卡、22px 圆角、标题「删除分类」18px 粗体 #383230、正文「确定删除分类「X」？」14px #78726e、两个 138×54 等宽按钮（取消 #f4f4f5 / #18181b、删除 #fcdada / #ef4444，14px 圆角、9px 间距），`fade: true` 缩放淡入，点遮罩或取消关闭；`contentClassName` 里的圆角必须写 `rounded-[22px]!` 提权，否则会被 provider 默认的 `rounded-panel`（12px）覆盖。分类下已有账单时不弹确认，仍走 `modal.prompt` 的「无法删除」提示。
- 记账筛选（`components/ledger/filter-sheet.tsx`）：时间分「本月/上个月/其他月份」与「自定义起止日」两组互斥状态，月份只选年月，起止日可选到日；筛选后统计卡按区间汇总、标题取区间结束月，下方标签保持「本月收入/本月支出」。
- 自动记账规则（`components/auto-rule` + `src/ledger/auto-rules.ts`，导入预览可开关套用）。
- 智能导入增强：支付宝/微信来源引导卡 + 导入历史（`components/data-manager`）。
- 周期记账：结束次数上限（`Scheduled.endCount`，启动补账按 cap 截断）。
- 贷款计算器（`components/loan-calculator` + `src/ledger/loan.ts`，方案存 `PersonalMeta.loanPlans`）。
- 生活模块：物品清单 `/inventory`、医疗 `/medical`（档案/药箱/就诊）、车辆 `/vehicle`（行车能耗），均随账本云同步；五个表单（成员/就诊/药品/物品/车辆×2）全部为行卡片式并支持头像/图片/备注计数（`components/form-rows`）。
- PWA 检查更新与前台自动更新（`utils/pwa.ts`、`components/settings/about.tsx`）。
- **WebDAV 的「记住账号 / 看到旧账本」**：① 登录弹窗（`components/modal/web-dav.tsx`）原先 `defaultValues` 只给了 `proxy`，`edit` 只用来取 `check`，等于每次都要重敲地址/账号/密码/昵称 → 现在按 `edit` 回填五个字段，并在顶部显示「已带出上次使用的账号信息」；② 「退出登录」会 `localStorage.clear()`，连 `web-dav-config` 一起删掉，所以退出后没东西可回填 → 端点新增 `beforeLogout` / `afterLogout`（`api/endpoints/type.ts` 可选钩子，`settings/form.tsx` 在 clear 前后调用），把 `{remote, username, customUserName, proxy}` **不含密码**存到 `web-dav-last-account`，重新登录时优先读 `web-dav-config`、退回读它；③ 账本列表 `store/book.ts` 的 `updateBookList` 以前 catch 都没有，401/403/405 会静默变成空数组、界面显示「还没有账本」让用户以为账本丢了 → 现在写入 `error`，`components/book/form.tsx` 显示「读取远端账本失败 + 原始错误 + 重试」。WebDAV 账本只认 `<远程根>/cent/cent-journal-*` 目录（`repoPrefix`），路径不对或账号不同都会读不到。
- **应用名统一为「胖记」**（用户明确：没有英文名，就叫胖记）：`zh.json` / `en.json` 的 `APP_NAME`、`cent-app-name`、`about-cent`、登录协议前缀、赞助文案、What's New 文案、`agent-api-webmcp-hint` 一律用「胖记」，中英两套都不保留 Cent / 日计；`index.html` 的 `<title>` 与 `apple-mobile-web-app-title`、`vite.config.ts` 的 manifest `name` / `short_name` / `description` 同步；顶部标题栏、登录页、关于页、底部 AI 占位「问问{name}」都读 `APP_NAME`，改 key 就够了，**不要再写死 Cent**。**外链一律不动**（`github.com/glink25/Cent`、`glink25.github.io/post/...Cent...`、`linkai.work/cent/terms`），域名与路径改了会 404；代码标识符 `CentAIConfig` / `CentAIProvider` / `CentMeasurementCollector`、`cent-accounting` 协议、包名同样保持原样。中文文案里「胖记」前后不留空格（模板 `问问 {name}` 已改为 `问问{name}`），英文文案保留空格。


「关于」页的版本对比查询的是上游 `glink25/cent` 的 `main` 分支 commit，fork 构建显示「落后于上游」属于正常现象，不代表本地构建失败。

## 10. AI 助手工作清单

1. 先读本文件；改动某个模块前先读该模块及其直接依赖，不要凭文件名猜测。
2. 搜索范围限定在 `E:\code\_cent_analysis` 内，不要递归扫描其他磁盘或无关目录。
3. 修改 `src/api`、`src/database`、`src/tidal` 前先评估同步兼容性与多端并发，避免破坏性变更。
4. 改 UI 时优先复用现有组件与设计令牌；不要为单个页面引入新的颜色体系或组件库。
5. 完成后必须运行 `pnpm lint`；涉及 UI 的改动必须在浏览器里实际操作验证（打开抽屉、输入金额、保存、关闭），不能只看类型检查通过。UI 改动的验证口径是 **真 WebKit（iPhone 16 Pro，402×874）+ Chromium** 双引擎，见第 8 节最后一条；只测 Chromium 会漏掉 iOS 的 `aspect-ratio` 与安全区问题。
6. 交付只给最终状态：代码、注释、提交信息中不写「已修改/改为」等过程说明；注释用中文解释「为什么」而不是「做了什么」。
7. 本地 5173 预览是**每轮必做**（第 4 节），不需要额外确认；线上部署（Cloudflare Pages）、commit、push、MR 只在用户明确要求时执行，commit 信息遵循 Conventional Commits（仓库有 commitlint 与 husky pre-commit）。
8. 不把任何密钥、Token、账号密码写入代码或文档；必要的凭据只放在本地 `.env.local` 或应用设置里。
9. 做 APK 对齐时两侧都要**现场操作截图 + 像素测量**（见第 11 节），不能只凭存档截图或肉眼判断；不要修改或临时清空 `PYTHONHOME` / `PYTHONPATH` 等全局环境变量。
10. 提交前先 `git status --short` 看清范围：默认只暂存已跟踪文件，新增的静态资源（如 `public/icon-192.png`）要按路径单独 `git add`；不要 `git add -A` 把 `.playwright-cli/` 日志、`dist-stale-*`、临时对比图带进仓库。
11. 本文件是约定来源：本轮确立的新规则（用户明确要求、踩过的坑、参数口径）要同步写回对应章节，而不是只留在对话里。

## 11. 家小满参考资产与逆向环境

UI 对齐的参考对象是用户自有的 Flutter 应用「家小满」（`com.nightingales.homefull`，后端 homefull.cn）。相关产物都在仓库外，属于本地工作资产：

- `E:\code\_apk_homefull\`：APK 解包与分析产物。`家小满-APK分析报告.md`（功能/API/交互全景）、`ref-*.png`（模拟器实机参考截图，1080×2340）、`strings-arm64.txt`（Dart 快照 35k 条字符串）、`feature-paths.txt`（源码模块路径）、`tools/`（字符串提取、uiautomator 点按、裁图等脚本，另有 restore-locale/salvage-locale/refill-locale/add-locale-keys.mjs 等语言包恢复与批合并脚本）。
- `docs/homefull-style-spec.md`：从截图固化的视觉规格（令牌、票券卡/分段控件/dock、逐页布局、状态机），**改 UI 前必读**。
- **Flutter 限制**：Dart 代码被 AOT 编译进 `libapp.so`，无法还原源码；能拿到的是资源、字符串、模块路径与语义树。分类可爱图标是服务端下发的自绘插画，不在 APK 包内（不要试图从 APK 找）。
- **模拟器**：本机 `E:\Android\Sdk`（adb 在 `platform-tools`），已有 AVD `homefull`（Android 12 x86_64，家小满已安装并可登录）。驱动 Flutter UI 的方式：`adb shell uiautomator dump`（会激活 Flutter 语义树）+ `node E:\code\_apk_homefull\tools\ui-tap.mjs <ui.xml> <文本> --tap` 按语义节点点按；截图 `adb exec-out screencap -p`。注意语义坐标偶发漂移（窗口宽高比），点按失败时以截图实测为准。
- 登录需要短信验证码（发到用户手机），需要登录态的页面截图时请用户在模拟器窗口操作。
- **语言包损坏恢复**（2026-11-07 实战）：`zh/en.json` 被以 GBK 写坏后，完整内容可从 `dist/assets/{zh,en}-*.js`（编译后的 locale chunk，取 default 导出即整包对象）恢复；新增 key 可从 `.corrupted.bak` 里未损坏行抢救。前提是 dist 是较新的构建——所以改完语言包跑一次 `pnpm build` 也是给恢复留后路。注意语言包文件属仓库工作区，可能有**并发会话**同时改动，编辑前先确认最新内容，避免覆盖。
- **APK ↔ 网页现场对照流程**（2026-11-10 实战，改 UI 必走）：存档 `ref-*.png` 只作交叉校验，不能代替现场取样。
  - APK 侧：`adb shell monkey -p com.nightingales.homefull 1` 启动 → `adb shell input tap 44 112` 点头像开抽屉 → `adb shell sleep 1` 等动画 → `adb exec-out screencap -p > live-apk-*.png`。不要只拿旧截图取色。
  - 网页侧：`@playwright/cli` 的会话状态**不跨命令保留**，初始化与操作要写在同一条 `run-code` 里：`open` 后 `setViewportSize(393,852)` → `goto` → 点「离线模式」→ 点「新建账本」→ 填名 → 确认 → 点该账本 → `mouse.click(36,35)` 点头像 → 截图。
  - 两侧都缩到 393×852（`Image.LANCZOS`）再逐点取色/量 bbox；APK 原图 1080×2340，缩放系数 0.364，且**含 24px 系统状态栏**，比较垂直位置前先裁掉，否则会误判元素偏下、进而错误压缩布局。
  - 验证组合：`pnpm lint` + 393×852 / 360×780 / 430×932 三视口无横向溢出与文字裁切 + 亮/暗主题变量未被污染。
- **分类插画资产**（2026-11-10）：家小满分类图标由 CDN `cdn.homefull.cn/material/ledger-category-template/{name}.png` 下发，已抓取 102 张 114×114 PNG 到 `E:\code\_apk_homefull\illustrations\network\category\`，`category-icons.json` 记录名称/类型/URL。生成脚本 `E:\code\_apk_homefull\tools\build-category-assets.py` 同时产出 `ledger/category.ts`、`components/category/illustrations.ts` 与 zh/en 分类名 key；重跑时 JSON 追加会跳过已有 key。分类名称、顺序与视觉以 APK「类别」页现场巡航截图（`cruise-all/pages/003.png`、`031.png`、`032.png`）为准：胶囊三段 tab、白色圆角卡内列表行（红色圆形减号 / 彩色插画 / 名称 / 编辑铅笔 / 拖拽手柄）。**已全量引入**（2026-11-10）：脚本 `all_assets()` 合并 42 个默认分类 + 56 个自定义 + 5 个转账向图标（按源文件名去重），转 WebP（quality=88）后 `public/category/` 共 103 个 ASCII 文件名文件、360300 B ≈ 352 KiB（其中 `cash-gift.webp` 与 `gift-income.webp` 同源），`illustrations.ts` 为 102 条不重复清单，加上预览共 103 个 `<img>` 格；PWA precache 192 条约 3494 KiB（比只放默认 42 张多 61 条、约 +195 KiB），JS/CSS 体积不变，运行时只在打开表单时加载。脚本不再清空输出目录，重跑不会删已有资产。
- **本机 Python**：全局 `PYTHONHOME` 指向 `D:\ShadowBot\shadowbot-6.3.39\python`（3.7 标准库），PATH 优先命中的 3.13 解释器与之混用会报 `_sre.MAGIC mismatch`。直接用带 Pillow / numpy 的完整路径 `/d/ShadowBot/shadowbot-6.3.39/python/python.exe` 即可；**不要清空或改动任何全局环境变量**，也不要给命令加 `PYTHONHOME= PYTHONPATH=` 这类前缀。
