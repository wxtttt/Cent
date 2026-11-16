# 登录页与登录方式选择

> 由根目录 `AGENTS.md` 拆分而来，属于功能级文档（渐进式披露）。先读 `AGENTS.md` 了解全局约定，改到本模块时再读本文；本模块有新口径 / 新规则时，同步更新 `AGENTS.md` 索引与本文。

## 定位与挂载

- `components/login/index.tsx` 在 `main.tsx` 里与 `Rooot`（路由）并列渲染，`createPortal` 挂到 `document.body`；`useIsLogin()` 为真时直接 `return null`。它是**全屏独立层**，不是路由页面，也不是 Radix 弹层，所以拿不到 `#root` 的 padding，安全区要自己带。
- 根节点带 `data-login-page` 探针，`fixed inset-0 z-[1]`，配 `overflow-y-auto overscroll-contain`；内层 `mx-auto max-w-[420px] min-h-full flex flex-col px-3`，上下 padding 用 `calc(var(--safe-area-inset-*)+…)`。
- **上下比例**：只有核心内容（欢迎区 → 按钮 → 组卡）包在 `my-auto flex flex-col` 的内容块里垂直居中，页脚（下载 / 介绍 / 协议 / PWA 提示）作为其兄弟节点**钉在页面最底部**（用户口径「只要核心内容在中间，添加到主屏幕要在最下面」）；内容溢出时 auto margin 归零、从顶部正常滚动，窄屏比例不变；不要再用 `flex-1` 撑底。
- 未登录时背景是**不透明**的，不要再叠 `rgba(0,0,0,0.5)` 遮罩露出底层首页。

## 版式（2026-11-15 16:51 定稿：典型登录页结构）

用户 2026-11-15 反馈 r27 的「预算/分类管理页」式版式「不像个登录页」，本轮重排为典型登录页结构（**同时解除 r26 对「居中大品牌头」的禁令**；r26 其余禁令继续有效）。表内口径以本轮为准：

| 部位 | 口径 |
| --- | --- |
| 色彩体系 | 根节点挂 `dp-drawer-surface`，中性灰白（亮色 `#f4f4f4` 底 / 纯白卡 / 近黑字 / 中性分隔线）。该作用域只在 `html:not(.dark)` 生效，深色自动回落全局暗色令牌，不要为登录页单独写 `.dark` 覆盖 |
| 顶栏 | **没有**设置式顶栏。语义标题用 sr-only `<h1>`（`login-page-title`），不渲染可见的标题栏 |
| 品牌欢迎区 | `WelcomeHero`：居中 80px `icon.png`（`rounded-[24px]` + 轻投影）+ 24px semibold 应用名 + 14px 灰标语（`app-introduce`＝「多人协作家庭管理App」），**不用卡片**、直接铺在底色上；顶部 padding 为 safe-area + 40px。**尺寸对齐窄屏视觉比例**（80/402 ≈ 72/360 ≈ 0.2，用户反馈 402 截图里元素比 360 截图「小气」后整体上调一档，行内图标同步 18→20px；只在登录页生效，不动全局令牌） |
| 主操作 | **五颗 54px 大按钮** `w-full` 一列堆叠（`BTN_*` 常量 + `h-[54px]!` 覆盖，用户口径「按钮比例按窄屏」：54/402 ≈ 48/360；同属性类顺序不可控必须加后缀 `!`）：**Gitee 橙色 `BTN_PRIMARY`、GitHub 白色 `BTN_SECONDARY`、离线模式白色、WebDAV 白色、S3 白色**（用户口径：国内访问 GitHub 不便 Gitee 优先；「其他方式也改成上面的登录按钮样式」——不再有「其他方式」分组与行卡，`login-more` / `GroupTitle` / `CARD` / `LoginRow` 已删除）。离线按钮右缘挂纯展示右值「无需账号」（`BigLoginButton` 的 `value` 槽位）——**与「现有 Token」胶囊同几何**（`px-2.5 py-1 text-[11px] rounded-full` 贴 `right-3` 垂直居中），但底色用中性 `bg-ground-muted text-ink-secondary` 表明不可点。复用 `button-styles.ts` 常量，不自写按钮样式 |
| Token 胶囊 | 「现有 Token」胶囊叠在 Gitee / GitHub 按钮内**右缘**（`absolute right-3 top-1/2 -translate-y-1/2 z-10`）：主按钮上 `bg-white/90 text-brand`，次按钮上 `bg-brand/10 text-brand`。胶囊是主按钮的**兄弟节点**绝对定位，不构成 button 嵌套 button |
| 登录方式页入口 | WebDAV / S3 大按钮点击 → `loginWith` → endpoint `login()` → **二级路由页**（`/login/webdav`、`/login/s3`，见「登录方式二级路由页」段） |
| 图标 | GitHub 用官方 Octocat 实心 SVG、Gitee 用品牌实心 SVG（统一 `viewBox 0 0 24 24`，`[&>svg]:size-[20px]` 控制尺寸，组件内常量 `GITHUB_ICON` / `GITEE_ICON`）；离线 / WebDAV / S3 用 Lucide 细线 `hard-drive` / `cloud` / `database`。**不要用 `icon-[lucide--github]`**——那是猫头轮廓，小尺寸下像竖拇指、认不出品牌 |
| 底部 | 页脚钉在页面最底部（核心内容居中，见「定位与挂载」），自上而下：**PWA 安装提示（info 图标 + 11px 灰字，保持在下载 / 查看介绍按钮的上面——用户明确纠正过顺序）**→ App 下载圆钮 + 「查看介绍」→ 协议文案（仅 `isMeasurementEnabled()` 时显示） |

- `AppDownloadIcons` 的默认 `buttonClassName` 是**深色品牌区专用**（`bg-white/5 text-white/80`），浅底必须显式传浅色圆钮样式，否则图标看不清。
- 「无需账号」是离线模式**大按钮**右缘的展示右值（`value` 槽位），用来呼应预算页右值列；不要给 Gitee / GitHub 按钮也加右值，会与 Token 胶囊挤在一起。

## 交互与保留能力

- 五种方式各自 `StorageAPI.loginWith(method)`：`github` / `gitee` / `webdav` / `s3` / `offline`；GitHub / Gitee 另有 `loginManuallyWith(method)` 的 Token 入口（弹 `modal.prompt`，端点层负责，落库后 `location.reload()`）。
- **整行/整钮可点但不能嵌套 button**：大按钮就是真按钮本体，Token 胶囊作兄弟节点 `z-10` 叠加；行卡沿用主按钮 `absolute inset-0 z-0` + 内容 `pointer-events-none` 的做法。
- **点进去的弹层 / 页面按应用规范重新设计**：共用 `modal.prompt`（现有 Token 入口，全应用 30+ 处共用）标题 16px semibold、输入框 `h-10 rounded-xl`、取消/确认 48px `BTN_SECONDARY`/`BTN_PRIMARY` 等宽成对；**WebDAV / S3 是二级路由页、顶部只放 56px 品牌图标**（用户多轮口径收敛：「点击跳转新页、不要用抽屉」→「二级路由也要像登录页」→「不用应用名称和简介，只要图标」→「背景要和登录页同一套、细线别顶满两边、主流 iOS 登录页观感、去掉取消只留确认」）：`routePath: "/login/webdav"` / `"/login/s3"`，页面 = **无标题栏** + 居中 56px 图标（`rounded-[18px]`，不是共享 WelcomeHero——那个 80px 带名称标语只给登录主页用）+ 方式说明一行（13px 居中）+ **行式下划线字段**（`components/login/field-row.tsx` 的 `FieldRow`：左标签 15px（必填红星 / 灰「选填」）+ 右输入 + 底部细线 `border-ink-secondary/15`，聚焦变品牌色，错误红字垫底）；**字段列收窄居中 `max-w-[300px] mx-auto`**（细线不顶满屏幕两边，主流 iOS 登录表单比例），常用服务商 chips 整组居中、白色描边胶囊（`border border-rule bg-panel`）；「测试连接」为品牌色 14px 文字链（只校验不落库，成功 / 失败都 toast）；**底部只留一颗 54px 确认（`BTN_PRIMARY` 橙）**，返回走左上角悬浮圆形圆钮（用户口径去掉取消按钮）；内容块 `my-auto` 居中、不足一屏时按钮钉底、超一屏随内容滚动。**路由页背景必须自带 `dp-drawer-surface` + `bg-ground text-ink` 的全幅包裹层**——外层路由包裹（`confirm/index.tsx`）只有裸 `bg-ground`，缺 `dp-drawer-surface` 时亮色会回落成应用暖米 `#fbf7ef`、与登录页的 `#f4f4f4` 不一致（用户踩过：「为什么背景色还变了」）。路由页拿不到 edit 注入，**表单自持完成链**——zod 校验、`checkWebDAVConfig`/`checkS3Config`（`@/tidal/*`，失败 sonner `toast.error` 留在本页）→ `saveWebDAVAccount`/`saveS3Account`（`api/endpoints/*/account.ts`，写库 + reload）。**S3 的所有字符串字段 defaultValues 必须给空串**——缺了是 undefined，zod 类型校验的默认文案 `Invalid input` 会抢在必填校验前出现且常驻（用户踩过）。不要在这几个表单里回退到抽屉、标题栏、行卡、取消按钮、`ui/button` 小按钮或居中小对话框。
- **二级路由页适配层 `confirm/route-modal.ts`**（用户四条建议的落地）：provider 只做渲染宿主，location 匹配与开/关编排收敛在 `useRoutePage(routePath, fallback)`；关闭流程 = `requestClose`（幂等）→ `.dp-route-to-right` 右滑出场 → `onAnimationEnd`（`e.target === e.currentTarget` 排除子元素）→ 回退；回退守卫 **`location.key !== "default"`**——**MemoryRouter 不写 window.history，后退守卫不能读 `window.history.state.idx`**；栈底用 `navigate(fallback, { replace: true })`。系统返回 / 边缘手势走 popstate 直接卸载、无出场动画（接受该差异）。

## 登录后引导页（选择账本 + 选择身份合并为一个页面）

登录后没有选中账本，或（WebDAV / S3 共享账号）尚未选定身份时，`BookGuide`（`components/book/index.tsx`）全屏出现**一个合并页**（`components/book/form.tsx` 的 `BookForm`，用户口径「选择账本和选择用户可以直接做成一个页面」，参考主流 iOS 分组列表设计；`components/book/select-user.tsx` 已删除）：

- **结构**：登录页同款骨架——`dp-drawer-surface` + `bg-ground` 全屏、`max-w-[420px]` 内容列、`my-auto` 居中、56px 图标 + 居中标题（需要选身份时 `login-finish-setup`＝「完成设置」，否则 `select-a-book`＝「选择账本」）；下方「账本」「用户」两个**灰组标签 + 白卡（`rounded-2xl border bg-panel` + `divide-y` 细分隔线）**分组，选中行右缘品牌色对勾（`icon-[lucide--check]`），卡内末尾「+ 新建账本 / + 新建用户」品牌色加行（弹 `modal.prompt` 输入名称——名称类字段走对话框的项目约定）；账本行保留邀请 / 删除小胶囊（非选中行才显示删除）。身份分组挂 `data-select-user` 探针，只在 WebDAV / S3 且 config 缺 `customUserName` 时出现（`hasUserIdentity()`），候选 = `getUserChoices()`（自己回退 + 账本别名，读取失败退化为只有自己）。
- **交互是「先选择、后确认」**：点按行只改本地选中态（账本单本时自动预选、身份默认选第一个候选），**底部一颗 54px `BTN_PRIMARY` 确认**统一生效；账本 / 身份未齐时禁用。确认路径：只改账本 → `switchToBook`（内部 reload）；WebDAV / S3 需要身份时**先 `writeUserIdentity()` 同步写 config 再直接 `useBookStore.setState` 写 currentBookId，最后 `setCurrentUser` 统一做别名登记 + reload**——`switchToBook` 和 `setCurrentUser` 都会 `location.reload()`，顺序错了身份写入会被 reload 打断（别名登记由 `initBook` 的既有补写链路兜底）。
- **入口差异与返回（2026-11-15 23:02 口径）**：左上角圆形返回**始终显示**——从个人页 / 首页 / ledger store 的 `showBookGuide()`（`book/util.ts`，Dialog 宿主）进入时（`onCancel` 有值）= 关页返回、无改动时确认直接关页；登录后的首次引导（无 `onCancel`）= **退出登录回登录页**（用户口径「选择账本为什么没有返回按钮」——登录是流程的一环，要允许反悔换登录方式），走 `utils/logout.ts` 的 `logoutWithConfirm`（与设置页共用：`logout-warning` prompt 确认 → beforeLogout 快照 → 端点 logout → 清 storage → afterLogout → reload，WebDAV / S3 连接信息由快照保留便于重填）。删除账本只删到当前账本才回引导态，删别的账本留在本页刷新列表。
- 保留：`login_method_used` 埋点（`StorageAPI.type` 落在 `LOGIN_METHODS` 才上报）、`loading` 态白卡 + spinner、PWA 安装提示、App 下载、`see-introduce` 外链、使用条款 / 隐私政策。
- r26 移除且**继续不恢复**：黑色遮罩、深棕色 `bg-field` 品牌区、通用 `Button` 胶囊按钮、`beta` 角标、下划线「或者使用现有的token」链接。~~居中大品牌头~~：**已解禁**（用户要求找回登录页观感），但规格按上表欢迎区执行，不要回到 r26 的 84px 大头 + 卡片堆叠样式。

## 登录方式二级页的白卡与说明抽屉（2026-11-16 11:57 口径）

- **「常用服务商」与字段组包在同一张白卡里**（用户口径「整组包裹起来，用白色底色，类似卡片」）：卡 `max-w-[340px] rounded-[20px] bg-panel px-4 pt-4`，字段细线不再顶到卡边。胶囊在卡内必须改浅灰底 `bg-ground`——原来是白底描边（`bg-panel border-rule`），放进白卡后与卡同色、看不出是按钮。文字 `text-ink` 黑色 + `text-[14px]` + `px-3.5 py-1.5`：用户两条口径叠加（「字号略小」→ 放大到 14px；「按钮不要调这么大」→ padding 不再跟着放大），实测 72×36。
- **S3 高级选项默认折叠**：`baseDir` / `sessionToken` / `forcePathStyle` 收进卡片底部的 44px 折叠行（`aria-expanded` + chevron 旋转），默认折叠；折叠态这三个字段不渲染（探针按 `input[placeholder="cent"]` 计数 0 → 1 判定），卡高 463 → 635。
- **代理地址的「?」改为应用内说明抽屉**：原来 `target="_blank"` 跳到博客的「使用代理」小节，手机上要来回切应用。现为 `components/modal/login-proxy-help.tsx` 的 `showProxyHelp()`，底部抽屉分五段——什么时候需要 / 怎么填 / 代理拦掉 PROPFIND 时 / 安全提醒 / 免费代理（含「复制地址」）。文案与博客原文口径一致，**正文提到产品名一律「胖记」，不出现 Cent**；`cent.linkai.work`（CORS 允许来源）与 `cent-backend.linkai.work`（免费代理）是真实地址，保留原样。抽屉上限见下方「说明抽屉统一骨架」条，实测高 731，最后一段的地址行与复制按钮在 402×874 首屏内完整可见——降到 82dvh 会把那张地址卡切成半截（实测过）。
- **点击热区 40×40**（用户口径「热区放大方便点击」）：眼睛与问号都是 `size-10` 圆钮、图标仍 16px，用 `-mr-2` 抵掉圆钮内边距，输入框可点宽度不变；眼睛按钮补 `aria-label`（显示密码 / 隐藏密码），供探针按状态定位。
- **说明抽屉统一骨架（2026-11-16 12:10 口径）**：用户口径「有什么说明的地方都改成抽屉」——登录流程里凡解释「这格怎么填 / 为什么这样填」的内容一律进应用内底部抽屉，**不再 `target="_blank"` 跳出应用**。骨架抽到 `components/modal/help-sheet.tsx`：`HelpSheetLayout`（抓手条 → 标题 → 一句引导 → 可滚正文 → 贴底关闭钮）、`HelpSection`、`HelpCode`、`HELP_SHEET_OPTIONS`（`from: "bottom"` + 圆角上 28 + sm 断点居中）。新加说明面板直接复用这四样，不要各页各写一套：`login-proxy-help.tsx` 已改用它（并**删掉了原抽屉里的「查看完整说明」外链**，那正是用户要消灭的跳转），`login-s3-help.tsx` 是本轮新建。
- **S3 页补「?」与眼睛**：`hint` 行右侧 `data-s3-help` 圆钮（40×40，图标 14px）打开 `showS3Help()`，五段——Endpoint 怎么填（三个示例域名）/ Region 与 Bucket / 密钥去哪拿 / 连不上时先查跨域（`https://cent.linkai.work` 作允许来源）/ 高级选项。Secret Access Key 补同款眼睛按钮，默认掩码。
- **抽屉高度 `max-h-[90dvh]`**：86dvh 时 S3 说明的末段还差 22px（`overflow: 22`，最后一行被切），90dvh 下两页都恰好一屏（S3 高 774 / overflow 0，代理面板仍 731 由内容撑开）。段间距用 `py-2`（不是 2.5），这是为了多段文案也能一屏放下。**调文案长度后要重新量 `scrollHeight - clientHeight`**，别只看截图。

## 语言键与窄屏

- **r27 声称新增的语言键实际未落盘**（页面一度显示 key 字符串），本轮补齐并按新结构定稿：`login-page-title`（sr-only 标题）、`login-token`（现有 Token）、`login-to-webdav` / `login-to-s3`（WebDAV / S3 大按钮文案）、`login-webdav-hint`、`login-s3-hint`、`login-no-account`、`login-test-connection`（测试连接）、`login-test-ok`（连接成功 toast）、`login-providers`（常用服务商）、`login-optional`（选填）、`login-create-user`（新建用户）。合并引导页新增：`login-finish-setup`（完成设置）、`login-section-books`（账本）、`login-section-users`（用户）、`please-input-user-name`（新建用户 prompt 标题）；随合并页删除的键：`custom-user-name`（昵称标签）、`custom-user-name-tooltip`（`custom-user-name-placeholder` 保留给 prompt）。`login-group-*` 三组标题与 `login-more`（其他方式）随分组移除**废弃不用**；`login-offline-hint` 随离线升大按钮**删除**。S3 可选字段标签不再自带「(可选)」后缀（`s3-base-dir` / `s3-session-token` 改纯名称，「选填」标注统一由 FieldRow 渲染，避免「(可选)（选填）」叠字）。`app-introduce`（全应用仅登录页使用）值改为「多人协作家庭管理App」/ "Collaborative Family Management App"（用户 2026-11-15 口径）。其余沿用 `APP_NAME` / `pwa-install-tip` / `see-introduce` / `login`（登录中）/ 协议四键。
- 行说明必须短（11px + `truncate`）：360px 宽时较长的说明会被截成省略号。写新说明先在 360×640 视口看一遍。
- 360×640 时内容高度超出视口，靠根节点滚动到底部；这是预期行为，不要为此压缩欢迎区或去掉 `flex-1`。

## 验证

见 `docs/agents/verification.md` 的「2026-11-15 16:51 登录页」与「2026-11-15 14:35 登录二级页对齐 + 引导页合并」段（双引擎 + 360/430 视口 + 深色模式 + `Load failed` / `token not found` 噪声过滤）。r27 段断言（三组 2/2/1 连卡、可见「登录」顶栏标题等）已随本轮作废。
