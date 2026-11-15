# 登录页与登录方式选择

> 由根目录 `AGENTS.md` 拆分而来，属于功能级文档（渐进式披露）。先读 `AGENTS.md` 了解全局约定，改到本模块时再读本文；本模块有新口径 / 新规则时，同步更新 `AGENTS.md` 索引与本文。

## 定位与挂载

- `components/login/index.tsx` 在 `main.tsx` 里与 `Rooot`（路由）并列渲染，`createPortal` 挂到 `document.body`；`useIsLogin()` 为真时直接 `return null`。它是**全屏独立层**，不是路由页面，也不是 Radix 弹层，所以拿不到 `#root` 的 padding，安全区要自己带。
- 根节点带 `data-login-page` 探针，`fixed inset-0 z-[1]`，配 `overflow-y-auto overscroll-contain`；内层 `mx-auto max-w-[420px] min-h-full flex flex-col px-3`，上下 padding 用 `calc(var(--safe-area-inset-*)+…)`。
- 未登录时背景是**不透明**的，不要再叠 `rgba(0,0,0,0.5)` 遮罩露出底层首页。

## 版式（r27 定稿，对齐预算管理 / 分类管理）

参考页是 `components/budget/list.tsx`（`PopupLayout` + `dp-drawer-surface` + `GroupTitle` / `SettingCard` / `SettingRow`）与 `components/category/index.tsx`。**r26 只学了一半**（保留居中大品牌头、暖米底、单张卡），r27 按参考页的完整结构重做：

| 部位 | 口径 |
| --- | --- |
| 色彩体系 | 根节点挂 `dp-drawer-surface`，走预算管理同款中性灰白（亮色 `#f4f4f4` 底 / 纯白卡 / 近黑字 / 中性分隔线），**不用首页暖米 `bg-ground` 全局值**。该作用域只在 `html:not(.dark)` 生效，深色自动回落全局暗色令牌，不要为登录页单独写 `.dark` 覆盖 |
| 顶栏 | `relative flex h-11 items-center justify-center` + `text-[17px] font-semibold` 居中标题「登录」；左侧 36px 圆形 `icon.png` 沿用 `PopupLayout` 圆形返回按钮的位置与尺寸（登录页没有返回目标，用品牌图标占位） |
| 品牌区 | 从 r26 的 84px 居中大图标压成**一张一行式概览卡**：44px 圆角图标 + 16px 应用名 + 11px 介绍；卡内用 `border-t border-rule/70` 分出 11px 橘色 PWA 提示脚注 |
| 分组小标题 | 一律在白卡**外**，与预算 `GroupTitle` 同款 `mb-1.5 mt-3/4 px-1 text-[12px] text-ink-secondary`；共三组：`login-group-cloud` / `login-group-selfhost` / `login-group-local` |
| 连卡 | 一组一张 `divide-y divide-rule/70 overflow-hidden rounded-2xl bg-panel shadow-[0_1px_6px_rgba(92,62,30,0.05)]`，行数 2 / 2 / 1；组件内常量 `CARD` 复用 |
| 行 | `min-h-[58px] px-4 py-1.5`；左侧 32px `rounded-[10px] bg-brand/10 text-brand` 图标块，中间 `text-[15px] font-medium` 主标题 + 11px 灰色说明，右侧可选值（`text-[12px] text-ink-secondary`）/ Token 胶囊 + `chevron-right`。与 `SettingRow` 的字号层级一致 |
| 图标 | GitHub 用官方 Octocat 实心 SVG、Gitee 用品牌实心 SVG（统一 `viewBox 0 0 24 24`，外层 `[&>svg]:size-[18px]` 控制尺寸）；WebDAV / S3 / 离线用 Lucide 细线 `cloud` / `database` / `hard-drive`。**不要用 `icon-[lucide--github]`**——那是猫头轮廓，18px 下像竖拇指、认不出品牌 |
| 底部 | `flex-1` 撑开后放 App 下载圆钮 + 「查看介绍」，协议文案仅在 `isMeasurementEnabled()` 时显示 |

- `AppDownloadIcons` 的默认 `buttonClassName` 是**深色品牌区专用**（`bg-white/5 text-white/80`），浅底必须显式传浅色圆钮样式，否则图标看不清。
- 「无需账号」是离线模式行右侧的 `value`，用来呼应预算页「每月 1 日 / 全部」那种右值列；不要在 GitHub / Gitee 行也加右值，会与 Token 胶囊和 chevron 挤在一起。

## 交互与保留能力

- 五种方式各自 `StorageAPI.loginWith(method)`：`github` / `gitee` / `webdav` / `s3` / `offline`；GitHub / Gitee 另有一个 `loginManuallyWith(method)` 的 Token 入口，用 `bg-brand/10` 浅橙胶囊放在行内右侧。
- **整行可点但不能嵌套 button**：主按钮 `absolute inset-0 z-0` 铺满（复用 `PRESSABLE_ROW`），内容层 `relative z-[1] pointer-events-none`，Token 按钮 `relative z-10` 浮在上层。这与预算抽屉的可展开行是同一套做法。
- 保留：`login_method_used` 埋点（`StorageAPI.type` 落在 `LOGIN_METHODS` 才上报）、`loading` 态白卡 + spinner、PWA 安装提示、App 下载、`see-introduce` 外链、使用条款 / 隐私政策。
- r26 移除、r27 继续不恢复：黑色遮罩、深棕色 `bg-field` 品牌区、通用 `Button` 胶囊按钮、`beta` 角标、下划线「或者使用现有的token」链接、居中大品牌头。

## 语言键与窄屏

- zh/en 成对新增：`login-page-title`、`login-group-cloud`、`login-group-selfhost`、`login-group-local`、`login-no-account`；删掉 r26 的 `login-methods`（不再使用）。其余沿用 `login-github-hint` / `login-gitee-hint` / `login-webdav-hint` / `login-s3-hint` / `login-offline-hint` / `login-token` / `APP_NAME` / `app-introduce` / `pwa-install-tip` / `see-introduce` / 协议四键。
- 副标题必须短（11px + `truncate`）：360px 宽时「账单存放在自己的 GitHub 仓库」会被截成省略号，改成「账单存在 GitHub 仓库」后才完整。写新说明时先在 360×640 视口看一遍。
- 360×640 时内容高度约 695px，靠根节点滚动到底部；这是预期行为，不要为此压缩卡片或去掉 `flex-1`。

## 验证

见 `docs/agents/verification.md` 的 r27 段（双引擎 + 360/430 视口 + 深色模式 + `Load failed` 噪声过滤）。
