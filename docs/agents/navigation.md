# 二级页导航 / FromRight 右滑

> 由根目录 `AGENTS.md` 索引。改二级页出场方式、路由表、弹层与页面的边界时读本文。

## 口径（用户 2026-11-15 r30 明确）

**全屏二级页必须是独立路由页，从右侧滑入**（等价 UWP `SlideNavigationTransitionEffect.FromRight` 的 Web 实现），是真实导航层级而不是全屏 Dialog；**底部抽屉 / 小弹层保持原弹层，不改**。用户原话：「都要改，但有一些是抽屉的不用改，二级页面的话就得改」。

`SlideNavigationTransitionEffect.FromRight` 是 WinUI API，本项目是 React + Vite PWA，用 CSS keyframes + MemoryRouter 路径驱动做等价效果。

## 实现

- `components/confirm/index.tsx`：`createConfirmProvider` 增加 `routePath?: string` 选项。
  - **没配**：完全走原逻辑（Radix `Dialog` + 全局 confirm store）。
  - **配了**：`Confirm` 由 `useLocation()` 驱动，路径相等时渲染一个 `fixed inset-0` 的 `.dp-route-from-right` 容器，内部直接 `<Form onCancel={() => navigate(-1)} />`；无遮罩、无圆角、不进 confirm store。
  - `confirm()` / `withController()` 在该分支只调 `goPage(routePath)`，返回立即 resolve 的 Promise，调用点不用改。
- `components/confirm/navigation.ts`：`setAppNavigator` / `goPage` / `goBack` 导航桥，类型用 `react-router` 的 `NavigateFunction`（自定义 `number | string` 联合类型与它不兼容）。`route.tsx` 的 `RootRoute` 在 `useEffect` 里注册 `navigate`。
- `index.css`：`@keyframes dp-route-from-right`（`translateX(100%) → 0`，260ms），`prefers-reduced-motion` 下关闭。
- `route.tsx`：末尾 `<Route path="*" element={<TabPager />} />` 兜底。二级路径不在 `Routes` 里时仍保留 `TabPager` 实例，返回首页不会重新挂载；`tabIndexFor()` 对未知路径回落 0（首页），安全。
- `components/profile/index.tsx`：宫格 `moreActions` 的 11 个 `onClick` 先 `onCancel?.()` 收起左侧抽屉，再 `showXxx()`。不收起的话抽屉（confirm 弹层 z≥4）会盖在路由页（z=3）上面。
- `app-chrome` 的 `show` 判断本来就只认 4 个 dock 页签，二级路径自动不渲染全局壳层，无需额外特判。

## 已接入的二级路由

| 路径 | Provider 文件 |
| --- | --- |
| `/vehicle` | `components/vehicle/page-form.tsx` |
| `/budget` | `components/budget/list-form.tsx` |
| `/category` | `components/category/list-form.tsx` |
| `/tags` | `components/bill-tag/index.tsx` |
| `/members` | `components/member/index.tsx` |
| `/loan` | `components/loan-calculator/index.tsx` |
| `/currency` | `components/currency/list-form.tsx` |
| `/data` | `components/data-manager/index.tsx` |
| `/preset` | `components/preset/index.tsx` |
| `/settings` | `components/settings/index.tsx` |
| `/auto-rules` | `components/auto-rule/index.tsx` |
| `/scheduled` | `components/scheduled/list-form.tsx` |

**保持弹层（不要接 routePath）**：所有 `rounded-t-[28px]` / 有限高度的底部抽屉（记一笔、添加车辆、筛选、选项、改名、确认框）、`book/util.ts` 的选账本小弹层、返回值参与业务的表单（`sortable/*`、`category/edit.tsx`、`bill-editor/*`）。

**仍是弹层的嵌套子页**（页面内再往下一层，本轮未改）：设置子项（about / assistant / agent-api / lab / map-settings / quick-entry / user / voice）、数据管理子页（smart-import / preview / oncent）、`pages/stat` 分析页（带参数）、auto-rule 编辑表单、赞助 / 助手入口。改这些前先确认，别自作主张。

## 踩坑

- **MemoryRouter 不改 `window.location`**：不能用 `location.pathname` 判断当前二级页，验证脚本用 `[data-route-page][data-route-path]` 属性。
- **z-index**：路由页 `z-[3]` 必须低于所有 confirm 弹层（`CONFIRM_DIALOG_BASE_Z = 4`），否则从二级页里打开的抽屉会被盖住。代价是进入二级页前必须主动收起左侧抽屉。
- **取消 Promise**：收起抽屉会 `reject(new Error("manually cancelled"))`。`confirm/state.ts` 的 `open()` 与 `confirm/index.tsx` 的 `confirm()` 都在源头附着了静默 catch；`ProfileAvatar` 的 `showProfile()` 调用点也补了 `.catch(() => {})`。否则浏览器报 `Unhandled Promise Rejection`。
- **首次挂载慢**：WebKit 里点宫格到路由页出现可能超过固定 sleep 的时长，验证脚本用 `waitForSelector('[data-route-page][data-route-path="/vehicle"]')` 显式等，不要用 `waitForTimeout` 猜。
- **返回按钮**：用 `[data-route-page] button` 的第一个（PopupLayout 的圆形返回），比固定坐标可靠。
