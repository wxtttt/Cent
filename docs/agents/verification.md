# 浏览器验证与本地验证脚本

> 由根目录 `AGENTS.md` 拆分而来，属于功能级文档（渐进式披露）。先读 `AGENTS.md` 了解全局约定，改到本模块时再读本文；本模块有新口径 / 新规则时，同步更新 `AGENTS.md` 索引与本文。

## 验证流程

**本地验证脚本**（`.playwright-cli/`，gitignored，属于工作资产不进仓库）。`open` 与 `run-code` 必须写在同一条命令里，且先清代理：

```bash
export HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy= ALL_PROXY= all_proxy= NO_PROXY=localhost,127.0.0.1
playwright-cli open "http://localhost:5173/" --browser webkit >/dev/null 2>&1
playwright-cli run-code --filename .playwright-cli/webkit-verify2.js
```

| 脚本 | 用途 |
| --- | --- |
| `webkit-verify2.js` | 记一笔主表单基线：分类圆 `w===h`、16/16/12 间距、金额框不被键盘裁切（402×874） |
| `verify-v8.js` / `verify-v8-persist.js` | 预算页回归（含载入示例数据后的持久化检查） |
| `verify-budget-r11.js` / `verify-r11-extra.js` / `verify-r11-viewports.js` | 起始日预演提示、特殊预算抽屉统一白卡、名称/标签/成员三层弹层、删除二次确认、分类改名回归、360/402/430 视口溢出；Chromium + 真 WebKit 双引擎 |
| `verify-budget-r12.js` | 量化验证统一行高（主卡 52px / 分类明细 44px）、控件尺寸（按钮 40px / 金额框 36px / 124·96px）、金额空值占位、聚焦全选覆盖、失焦千分位、360px 溢出；选择器用 `input[inputmode="decimal"]`，不再是 `input[type="number"]` |
| `verify-budget-r13.js` | 金额输入无框 / 灰 0 / `¥` 后置 / 黑色数字，分配预算独立抽屉的状态栏实时变化、±100、清零、滑动条 5 刻度与 ±10、拖到上限、智能分配合计等于总额、超额禁用确认、确认回写、360px 溢出；Chromium + 真 WebKit。注意 `getByRole` 的 `name` 默认子串匹配，「增加 10」会误命中「增加 100」，必须加 `exact: true` |
| `verify-budget-r14.js` | 量化验证「金额 / 详细分配」新文案、按钮可点/禁用双态（computedStyle 取 bg / shadow / cursor）、标题与智能分配的相对位置、状态栏居中、上限提示在标题下、`-100` 在金额右侧、整行点击展开、轨道 4px、气泡跟随与拖动高亮、5 刻度无文字、超额禁用确认、特殊预算同名标签、360px 溢出；Chromium + 真 WebKit 双引擎断言一致。两个坑：① `locator.evaluate(fn, arg)` 的回调首参是**元素本身**，参数要写 `(el, arg)`；② 金额输入点击后要等 150ms 再 `keyboard.type`，否则 `requestAnimationFrame` 里的 `select()` 会把已键入的数字全选覆盖掉 |
| `verify-budget-r15.js` | r15 轻量改版：特殊预算第 2、3 行顺序、月度新提示、标题居中 / 提示居左无框 / 无引导条、汇总无橘底只凸显剩余、抽屉内零 disabled、右侧只有 `+` / `-` 图标、短按 ±10 + 长按分段加速 + `+N` 微反馈、无气泡纯数字悬浮且端点中心对齐滑块、10 个空心圆刻度、`step=10` 与两侧无 ±10、360px 溢出；Chromium + 真 WebKit 各 31/31 断言。三个测量坑：① Tailwind `/80` 的 `computedStyle.color` 是 `oklab(...)`，亮度解析不能只认 `rgb()`；② Chromium 的 `getComputedStyle(range, "::-webkit-slider-thumb")` 会回落成宿主尺寸，伪元素尺寸改查 CSS 规则；③ 端点数字「越过轨道边界」不是失败，WebKit 的窄 `¥0` 本来就不越界，判定要看中心偏差与 `left` 是否用了 `clamp()` |
| `verify-budget-r16.js` | r16 收紧：零总额提示并入剩余额度行、上限提示块整块删除、状态栏标签与「已分配」同色且只有 ¥金额 为品牌橙、分类名与金额间距（8px）/ 虚线引导 / 按钮全在右、展开区 padding 与轨道两端留白、10 刻度覆盖 0%/100% 且 ¥0 正对最左刻度、端点数字与滑块中心偏差、`step=10`、零 disabled、短按 ±10 / 长按三段加速 / `+N` 微反馈、智能分配合计、特殊预算行顺序回归、360px 溢出；Chromium + 真 WebKit 各 33/33 断言、零 pageerror。新增测量坑：**同一设计令牌带 `/80` 时返回 `oklab(... / 0.8)`、不带透明度时返回 `rgb(...)`，字符串直接相等必然误判**——比较「同色」要先把两者折算到 Oklab L（sRGB 线性化 → LMS → cbrt）再忽略 alpha 比较 |
| `verify-budget-r17.js` | r17 吸附与黑色层级：拖动 / 点击轨道 / 键盘微调都吸附到 100 倍数（拖到 ¥2,165 → ¥2,100~2,200）、点击 12%/70%/37% 分别跳到 ¥500/¥3,500/¥1,800、短按 ±50 + `+50` 微反馈、长按 50→100→500 且松开不额外加一次、分类名与金额与按钮符号都是 `rgb(42,32,24)` 黑、状态文字仍灰、金额与行内无虚线、端点对齐、零 disabled、智能分配、特殊预算行顺序、360px 溢出；Chromium + 真 WebKit 各 27/27 断言、零 pageerror。两个坑：① Tailwind v4 preflight 给所有元素预置 `border-style:solid` + `border-width:0`，判断「有没有线」必须看 `borderBottomWidth`，只看 style 会把 `solid/0px` 误判成有线；② Chromium 长按 3 秒松开后仍会补派一次 `click`，pointerdown 侧的抑制窗口（700ms）早已过期，必须在 `pointerup` 也重新压一次，否则多出一个短按步进 |
| `verify-budget-r18.js` | r18 行布局与配色：`+50` 气泡水平中心与金额列中心偏差（需 0px）、气泡严格在金额上方且不被分类名遮挡；金额列中心相对行中线（CR 178/201、WK 176/199）与「名→金额」间距、两段留白比例、按钮组仍全在右半边且不越界；状态栏「已分配 / 剩余可分配 / 零总额提示」全部主文字黑、只有 ¥金额 橙；智能分配在 `data-card-head` 且是白卡第一个子元素、标题行只剩一个 `h2`；刚展开未拖动的 `¥0` 恒橙（`rgb(255,132,53)`）且 `data-dragging=false`；吸附整百 / 点击轨道跳转 / 短按 ±50 / 长按递增 / 端点对齐 / 零 disabled / 智能分配合计 / 特殊预算行顺序 / 360px 溢出回归；Chromium + 真 WebKit 各 **29/29** 断言、零 pageerror。两个坑：① **Tailwind v4 的 `-translate-x-1/2` 生成独立的 `translate` 属性，与 `@keyframes` 里的 `transform: translate(-50%, y)` 会叠加成 -100% 位移**，气泡飘到分类名上方——水平居中只能由动画单独负责；② 验证「刚展开 ¥0 是橙色」前必须先把金额清零，否则上一步短按 `+50` 会让悬浮数字显示 `¥50`，`valueText === "¥0"` 误判失败 |
| `verify-budget-r19.js` | r19 智能分配移出卡片：按钮不在 `data-allocation-card` 内、位于 `data-smart-row` 且是卡片的上一个相邻兄弟、`data-card-head` 已不存在；按钮底边不超过卡片顶、仍靠右，行背景透明而卡片背景为白；标题行仍只有一个居中 `h2`；其余回归项（吸附整百、点击轨道跳转、±50、长按加速、微反馈位置、恒橙 ¥0、状态栏黑字、端点对齐、零禁用态、智能分配合计、特殊预算行顺序、360px 溢出）全部通过；Chromium + 真 WebKit 各 **30/30** 断言、零 pageerror |
| `probe-r10-category.js` | 分类管理页可点击项探针（用于定位「编辑分类」入口） |
| `probe-home.js` / `probe-unknown2.js` | 首页 / 记账页文案与数据探针 |
| `mock-webdav.cjs` / `mock-webdav-401.cjs` | 本地假 WebDAV（8099 正常 / 8098 全 401），配合 `webdav-*.js` 复现账本列举、失败提示与登录回填 |

其余 `measure*`、`round*`、`verify-icon/rename` 等是各轮一次性验证脚本，只在 `.playwright-cli/` 本地留档，需要时按关键字在目录内检索，不再逐条登记。写新脚本沿用「`open` 与 `run-code` 同一条命令、末尾 `playwright-cli close`」的结构。

**记一笔日期滚轮的坑**（一次性脚本里最容易再踩的）：日期触发器是 `[data-meta-row] > div`（asChild div 非 button）；滚轮为 datetime-local **5 列**，日列是 `div.snap-y` 的 `nth(2)`（`.last()` 是分钟列），日标签带「日」后缀且补零；滚轮交互后物理键盘失焦，须点屏上数字键 + 「完成」保存。

## WebKit 引擎验证

- **不要依赖原生 range 的「点轨道跳转」**（r17）：不同引擎对 `input[type="range"]` 点击轨道的行为不一致，甚至同一次点击还会再派发一次 `onChange`。需要「点空白处直接跳到该位置」时在轨道容器自己按 `(clientX - left) / width` 算比例写值，再让 `onChange` 走同一套吸附 / 封顶逻辑；双引擎验证要分别点 12% / 70% / 37% 三个位置，确认落点都是整百且状态栏同步。
- **WebKit 启动后的空白过渡态**（r15 踩坑）：点「离线模式」后 WebKit 有一段 `document.body.innerText` 为空的重挂载窗口，此时立刻点侧栏会被吞掉，表现为 `getByText("预算管理").waitFor` 超时 20s。脚本必须先用 `waitBody()` 轮询等 body 真正渲染出来，把打开侧栏的重试放宽到 6 次、每次 1400ms；侧栏入口的无障碍名称可能是「个人中心」也可能是 `Profile`，两种都要兜底。另：离线模式下 Chromium 会抛 `TypeError: Failed to fetch`（登录提供方探测），属既有网络噪音，过滤后再统计 pageerror。
- **每轮 UI 改动都要在真 WebKit 引擎上按 iPhone 16 Pro 验一遍**（Chromium 测不出 iOS 的 `aspect-ratio`／安全区差异）：本机已装 `webkit-2386`（WebKit 27.2，176MB，在 `%LOCALAPPDATA%\ms-playwright\webkit-2386`）。安装走国内镜像，官方源常卡死（曾 4 分钟仅 0 字节、13 分钟未完成）：`PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright playwright-cli install-browser webkit`（镜像 3MB/s，23 秒完成）。**运行前必须清空代理变量**，否则 WebKit 走系统 `HTTP_PROXY=127.0.0.1:55185` 会让 `localhost:5173/assets/*.js` 全部 404、页面白屏：`export HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy= ALL_PROXY= all_proxy=` 后再 `playwright-cli open --browser webkit`。`open` 与 `run-code` 必须写在同一条命令里（分开执行会话已关闭）。口径：视口 402×874（iPhone 16 Pro CSS px），断言分类圆 `w===h`（ratio 1.000）、分类→meta→金额框 = 16/16、金额框不被键盘裁切、键盘完整到 874。脚本见 `.playwright-cli/webkit-verify2.js`。**验证结束必须立即关浏览器**：`run-code` 同一条命令末尾接 `playwright-cli close`；puppeteer 脚本主流程包 `try/finally` 里 `browser.close()`；机器卡顿先按 `Win32_Process` 扫残留（CommandLine 匹配 `playwright|cent-verify`、Name 匹配 `WebKit|Playwright`）再清理。用户机器曾因往轮残留的 WebKit/Chromium 卡死。

## r20 验证脚本（2026-11-14）

- `.playwright-cli/verify-r20.js`：七项总回归（首页根滚动 CSS + 滚轮后 `window.scrollY`、左侧抽屉日历弱化圈 `bg-brand/20` 计数、弹层按钮 48px/15px 与 `footerPaddingBottom` / `bottomGap`、详细分配超额禁用、起始日结构化日期 `whitespace-nowrap`、成员抽屉 `h2` 标题、分类明细 `[data-category-line]`）。
- `.playwright-cli/verify-r20b.js`：超额状态下点 `[data-step=plus]` 验证金额仍能改（¥7,300 → ¥7,350）、确认始终 `disabled`；滑轨读 `getComputedStyle(input).backgroundSize/Position` 与首末 `[data-tick]` 的 X 坐标，确认渐变只画在 `[6px, 宽-6px]`。
- `.playwright-cli/verify-r20c.js`：点 `‹` 逐月回看 `[data-category-line]` 数量（11 月 9 行 / 10 月 4 行 / 8 月 8 行），证明「没设额度且没支出」的分类确实被过滤。
- **踩坑**：页面 reload 会让已打开的 Radix 弹层 controller `cancel()`，控制台出现 `Unhandled Promise Rejection: Error: manually cancelled`，属正常关闭噪音，统计 `pageerror` 时要过滤。预算页当前月有特殊预算时 `ui.allOpen=true` 但 `collapsed` 默认含所有预算 id，`[data-category-line]` 为 0 是正常的；要先点「普通预算」行展开，或切到历史月（`collapsed: []`）再统计。`list.tsx` 已给分类行加 `data-category-line` 探针。
- **写文档别用 shell 内联 Python 传含反引号的文本**：`python -c "..."` 里的 Markdown 反引号会被 Bash 当命令替换执行，内容被吞掉还会在仓库根留下名为 `{` 的空文件。用 Edit / Write 工具或独立的 `.py` 脚本文件写文档。

## r21 验证脚本（2026-11-14）

- `.playwright-cli/verify-r21.js`：起始日提示精简回归。分别截取未改动态（`r21-startday-idle.png`）与选中 15 日后（`r21-startday.png`），用 `getComputedStyle` 断言橙框内日期/数值为深色 `rgb(42,32,24)` 且字重 ≥ 500、标签与说明为灰色 `rgb(139,129,120)`；同时断言 `body.innerText` 不含 `29–31`、橙框之后无兄弟元素（`after: []`，底部灰色说明段已删除）、确认/取消按钮仍为 48px。
- `.playwright-cli/make-r21-overview.py`：把两态截图并排拼成一张对照图（只含改动后截图）。

## r22 验证脚本（2026-11-14）

- `.playwright-cli/verify-r22.js`：起始日周期预览两态回归。默认态断言 `当前周期` / `无过渡期` 存在且不再有「选择其它日期」引导；选中 15 日后逐条断言「生效日 / 11月15日 / 新预算周期 / 11/15 - 12/14 / 过渡期 / 11月1日 - 11月14日 / 此期间花费将计入上期（10月）预算」全部命中。同时读 `getComputedStyle` 验证：主标题 `rgb(42,32,24)` 15px/14px、副标题 `rgb(139,129,120)` 11px、分隔线 `h-px` 且为 15% 透明度、生效日橘色 span 与日历 `button.bg-brand` 背景色一致（均 `rgb(255,132,53)`）。截图 `r22-startday-default.png` / `r22-startday-15.png`。
- **口径提醒**：过渡期范围从「今天 → 生效前一天」改为「当前周期起始 → 生效前一天」，写断言时不要用旧口径；`budgets` 为空账本时回落 `periodContaining(now, edit.value)`，11 月 1 号起始得到 11/1 - 11/30，与用户示例一致。

## r24 回归（2026-11-14，r23 回滚）

- 用户反馈 r23 的数字光学居中让「日历偏右」「原来的挺好的」，r23 已整体撤销。`verify-r23*.js` / `try-r23*.js` / `make-r23-overview.py` 及其截图**全部作废，不要再沿用其中的断言**（`display:flex`、`paddingBottom:2px`、`tabular-nums`、`span.relative.-top-px` 现在都不成立）。
- 起始日 / 左侧抽屉日历回归一律以 r22 的 `verify-r22.js` 与 r20 的 `verify-r20*.js` 为准。本轮 `.playwright-cli/verify-r24.js` 断言：起始日 31 格 `display:block` / `paddingBottom:0px` / `fontVariantNumeric:normal` / 无嵌套 span / 文字盒水平偏差 0，左侧 42 格无 `span.relative` 且 `numeric:normal`；同时回归 r22 默认态「当前周期 / 无过渡期」、选中 15 日五条文案、确认后回预算页。截图 `r24-startday-default.png` / `r24-startday-15.png` / `r24-profile.png`，整合图 `.playwright-cli/make-r24-overview.py` → `r24-rollback-overview.png`。

## r25 验证（2026-11-14，Widget 整体删除）

- `.playwright-cli/remove-widget.py`：一次性批量删除脚本，每处替换都断言 `old` 存在，漏改会直接报错。删 18 个文件（`components/widget/` 15 + `assistant/tools/widget-tool/` 2 + `hooks/use-widget.ts` 1）、14 个源文件共 74 处替换、zh/en 各 16 个语言键。
- 验收口径：① `grep -r widget apps/cent/src` 与 `grep -rli widget dist` 均 **No matches found**；② `pnpm lint` 通过（biome 检查文件数 380 → 365）；③ zh/en JSON 可解析；④ 完整重建后 `.playwright-cli/verify-r25.js` 在 WebKit 402×874 断言首页无「小组件」区且「本月支出」正常、左侧抽屉无「Widget设置」且日历仍 42 格、预算管理 / 起始日默认态 / 选中态 / 确认回页均正常，`errors: []`。预设导出弹层与统计筛选「自定义模块」只做代码删除 + `tsc` 类型校验，**未单独跑 UI 回归**。
- **验证脚本坑**：新会话会弹「登录方式 / 新建账本」引导层，必须先点「离线模式」+「新建账本」再做首页 / 抽屉断言，否则截图只有登录弹窗、日历格数取到 -1。引导层自动尝试 Github/Gitee token 登录会抛 5~7 次 `Unhandled Promise Rejection: token not found`（源码在 `api/endpoints/*/login.ts`），与业务无关，验证时要过滤，别误判成删除引入的报错。
- 不要复用任何 widget 相关断言；旧脚本里若含 `WidgetPreview` / `widget-settings` 之类的检查，一律作废。

## r26 验证（2026-11-14，登录页重构；版式断言已被 r27 取代）

> `verify-r26.js` 里「单张 5 行连卡 / 页面底 `rgb(251,247,239)` / 行高 62px / 分组标题是『选择登录方式』」这些断言现在**都不成立**，登录页回归一律用 r27 的脚本。脚本的清缓存初始化、`--filename`、`open` 与 `run-code` 同命令等工具坑仍然有效。

- `.playwright-cli/verify-r26.js`：**一个脚本跑双引擎**（用 `navigator.userAgent` 含不含 `Chrome/` 自动判定并写 `r26-login-{webkit,chromium}.png`）。清 `localStorage` + 注销 SW + 清 caches 后 reload 才会稳定停在登录页。断言：品牌 / 分组标题 / 五种方式 / 五条说明 / 底部入口都在，无 `beta` 与旧 token 链接、`现有 Token` 恰好 2 个；`[data-login-page]` 找连卡，量出 5 行、行高 62px、`rounded-2xl`=16px、卡片 `rgb(255,255,255)`、页面底 `rgb(251,247,239)`、整行按钮宽度 == 卡片宽度（370px）、图标 `naturalWidth>0`、无横向溢出；最后点「离线模式」确认登录层消失。
- `.playwright-cli/verify-r26-viewports.js`：360×640 / 430×932 两档，断言 `scrollWidth <= innerWidth`、Token 胶囊与 `.truncate` 文字矩形不相交、Token 入口仍 2 个。360×640 的 `scrollHeight 685 > clientHeight 640` 是预期（根节点可滚），不是裁切。
- `.playwright-cli/shot-r26-dark.js`：手动加 `html.dark` 截图并回读颜色，确认深色沿用全局令牌（页面 `rgb(23,19,15)` / 卡片 `rgb(31,25,19)` / 标题 `rgb(228,211,186)`）。
- `.playwright-cli/make-r26-overview.py`：四张改动后截图整合。**非 402×874 的截图必须等比缩放居中留白**，直接 `resize` 会把 360×640 纵向拉长，视觉上像字体变大，容易误判。
- **会话坑（重要）**：`playwright-cli open` 与 `run-code` 必须写在**同一条 Bash 命令**里；分开执行时 `open` 启动的浏览器会随命令结束被回收，下一次 `run-code` 报 `Browser 'default' is not open`。`run-code --filename <path>` 比 `$(cat …)` 更稳。
- 登录页的 `token not found` 未处理拒绝来自引导层自动尝试 Github/Gitee token 登录，与登录页重构无关，统计 `pageerror` 时要过滤。

## r27 验证（2026-11-14，登录页按预算 / 分类管理重新设计）

- `.playwright-cli/verify-r27.js`：仍是一个脚本跑双引擎（`r27-login-{webkit,chromium}.png`）。断言：顶栏标题「登录」、概览卡、三个分组标题、五种方式、五条说明、离线模式右值「无需账号」、底部入口全在；无 `beta` / `选择登录方式` / 旧 token 链接；`现有 Token` 恰好 2 个；`[data-login-page]` 内三张 `divide-y` 连卡行数必须是 `[2,2,1]`、总 5 行、行高 ≥58px、圆角 16px、卡片 `rgb(255,255,255)`、**页面底 `rgb(244,244,244)`**（`dp-drawer-surface` 生效）、整行按钮宽度 == 卡片宽度、图标 `naturalWidth>0`、无横向溢出、顶栏 17px；最后点「离线模式」确认 `[data-login-page]` 消失。双引擎 `errors: []`。
- `.playwright-cli/verify-r27-responsive.js`：360×640 / 430×932 两档，除横向溢出、Token 胶囊与文字重叠、Token 数量外，还检查所有 `.truncate` 的 `scrollWidth > clientWidth+1`（有省略号就报错）与三个分组标题都在；360×640 `scrollHeight 695 > clientHeight 640` 仍是预期滚动。同脚本末尾手动加 `html.dark` 截 `r27-login-dark.png` 并回读颜色，断言深色页底不是 `rgb(244,244,244)`（实测 `rgb(23,19,15)` / 卡片 `rgb(31,25,19)`）。
- `.playwright-cli/make-r27-overview.py`：四张改动后截图整合，非 402×874 一律等比缩放居中留白。
- **新增噪声**：r27 的 WebKit 会话除了 `token not found`，还会出现 4 次 `Unhandled Promise Rejection: TypeError: Load failed`。来源是 `store/user.ts` 自动用历史 token 登录时 fetch 在离线预览环境失败（`api/endpoints/{github,gitee}/login.ts`），**与登录页 UI 无关**；`verify-r27.js` 已把 `Load failed` 与 `token not found` 一起过滤，其余 `pageerror` 仍会报错。
- **图标坑**：Lucide 的 `github` 是猫头轮廓，18px 下放大看像竖拇指 / 倒拇指，品牌辨识度为零；登录页改用官方 Octocat 实心 SVG（与 Gitee 同款 `viewBox 0 0 24 24`），验证脚本只检查 `img` 是否加载，图标可读性要看 `r27-login-webkit.png` 的局部放大。

## r28 验证（2026-11-15，APK 实机造数据 + 车辆页回归）

- **APK 侧**：`E:\code\_apk_homefull\vehicle-test\adbhelper.py` + `03`~`31` 实机截图/XML；`uiautomator dump` 走 `adb exec-out "uiautomator dump /dev/tty"`、截图走 `exec-out screencap -p`（Git Bash 会篡改 `/sdcard/...` 路径）。中文输入不可用，造数据用 ASCII。整合图 `.playwright-cli/make-r28-apk-overview.py` → `r28-apk-vehicle-states.png` / `r28-apk-vehicle-interactions.png`。详细流程与点按坑 → `docs/agents/homefull-reference.md`。
- `.playwright-cli/verify-r28.js`：离线账本初始化（`SYNC_ENDPOINT=offline` + `book-store` + 清 SW/cache）→ 新建账本关引导 → 点头像开抽屉 → 点「车辆记录」宫格（按文字包围盒向上偏移 18px 取整格可点区，带两级兜底）→ 断言进入车辆页、无 `vehicle-*` 语言键泄漏、`pageerror` 过滤 `token not found` / `Load failed` 后为空。截图 `r28-vehicle-main.png`。
- `.playwright-cli/shot-r28-vehicle.js`：复用同一会话，点右侧遮罩关掉**遗留的左侧抽屉**（点菜单导航后抽屉不会自动关，改造前截图也是这样，是验证脚本特有现象，别误判成页面遮挡 bug），截 `r28-vehicle-clean.png` / `r28-vehicle-full.png`；再点「添加记录」截抽屉并查语言键泄漏，最后 Escape 收起。
- **示例数据异步**：离线空桶的自动载入有延时，进页面立刻断言可能是空态「还没有添加车辆」；`verify-r28.js` 等 3.5s，`shot-r28-vehicle.js` 再跑一次才稳定拿到 2 台车 / 15 笔记录。
- **语言键泄漏检查**（新增必做）：`document.body.innerText.match(/vehicle-[a-z0-9-]+/g)` 必须为空。r28 上轮被打断时漏写 29 个 `vehicle-*` 键，页面会直接显示 key 字符串；补键脚本 `.playwright-cli/add-r28-locale.py` 用独立 `.py` 追加并 `json.load` 校验，不要 shell 内联 Python。
- **会话坑复确认**：`playwright-cli open` 与后续所有 `run-code` 必须在**同一条 Bash 命令**里串起来，分开执行第二次会报 `Browser 'default' is not open`。

## r29 验证（2026-11-15，示例数据改到数据管理 + 车辆页弹层化）

- `.playwright-cli/verify-r29.js`：**一个脚本跑双引擎**（UA 含 `Chrome/` 判 Chromium），45 项断言。流程：注入离线账本 → 左侧抽屉「数据管理」→ 主动点「载入示例数据（覆盖当前账本）」+ 二次确认 → 等重挂载稳定 → 左侧抽屉「车辆记录」→ 断言 `[role="dialog"] [data-vehicle-page]` 弹层化与无 `/vehicle` 路由 → 顶部「全部 / 小白 / 小蓝 / 小闪」切换后记录数、累计花费、主卡单位都跟着变 → 打开「记一笔」抽屉核对日期 / 里程表度数 / 金额 / 选填 / 油号 / 加满开关 → 三种能源类型的段控过滤 → 语言键泄漏、横向溢出、pageerror。截图 `r29-vehicle-{all,gas,ev,hybrid}-{engine}.png`、`r29-record-{gas,ev}-{engine}.png`、`r29-data-manager-{engine}.png`。
- `.playwright-cli/probe-r29.js` / `probe-r29b.js`：左侧抽屉探针与「reload 撞上宫格点击」的时机诊断；`.playwright-cli/r29-summary.js` 把 `run-code` 的长 JSON 精简成 `pass/total/failed/errors`。
- 结果：`pnpm lint` 通过（367 files）、完整重建、5173 与 dist 同为 `index-UGexWI5p.js` 且 `/` 与 js 都 200；**Chromium 402×874 45/45、零 pageerror**。WebKit 首轮 40/44 的 4 项失败全是脚本层误报（见下方坑），脚本已逐条修正；备注去重后按用户「少占内存」的要求**未复跑 WebKit**。

**本轮新增踩坑（按重要性）**：

1. **示例数据写入慢且 reload 延迟**：`toLoadSampleData()` 写完账单 + meta + `entries.vehicle` 后才 `setTimeout(700ms) window.location.reload()`，WebKit 实测要 10~12s 才稳定。固定等 5s 会让 reload 恰好撞上「点车辆记录宫格」，表现为 `document.body.innerText` 为空、所有 `role="dialog"` 消失。必须轮询「首页已渲染（含「本月支出」）+ `document.querySelectorAll('[role="dialog"]').length === 0`」连续 4 次再继续。
2. **会话残留的「选择账本」引导层**：`page.evaluate` 里手工写 `localStorage` 可能被 zustand rehydrate 覆盖回去，reload 后 `books` 为空、叠出两个「选择账本」弹层，后续点击全被吞。改用 `page.addInitScript` 在应用任何脚本之前注入 `SYNC_ENDPOINT=offline` + `book-store`，并用 `sessionStorage` 一次性标记保证载入示例数据触发的 reload 不会再次清空。
3. **placeholder 不进 `innerText`**：「仪表盘总里程」「选填」这类占位只能读 `[role="dialog"] input` 的 `placeholder` 属性；用 `body.innerText` 断言必然误报。
4. **「全部」态默认车不是燃油车**：抽屉默认选 `vehicles[0]`（示例数据里首台是混动「小闪」），类型段控同时有加油 / 充电是正确行为。断言 `燃油车不出现充电` 之前必须先点「小白」。
5. **WebKit 上 Radix 抽屉按钮一直 "not stable"**：抽屉内车辆切换按钮截图实测可见可点，但 `locator.click()` 会超时在 `waiting for element to be visible, enabled and stable`。用 `dispatchEvent("click")` 兜底即可，不要据此改业务代码。
6. **reload 打断 module script**：WebKit 会出现两次 `Unhandled Promise Rejection: TypeError: Importing a module script failed.`，来自 `window.location.reload()` 中断仍在加载的模块，与页面 UI 无关。在写入稳定后清空 `pageErrors`，只统计车辆页交互阶段的错误；`token not found` / `Load failed` / `manually cancelled` 仍按旧口径过滤。
7. **构建产物被占用时的假失败**：`dist` 被 5173 预览进程占着时，`mv dist ...` 报 `Permission denied`（Bash 与 PowerShell `Move-Item` 都一样），`vite build` 的 emptyOutDir 调 `genie-trash/win32-x64.exe` 超时（`[safe-delete] … ETIMEDOUT`），vite 只吐一行 `ERROR ✗ Build failed` 把原因吞掉，**不要去改业务代码**。用 `pnpm exec vite build --no-emptyOutDir` 跳过清空即可构建成功（代价是旧 assets 留在 precache，本轮 197 entries）；要彻底清干净仍需先停 preview 再移走 `dist`。
8. 验证结束立即 `playwright-cli close`；本轮额外复核过没有遗留 `MiniBrowser` / `headless_shell` / `playwright-cli` 常驻进程。

## r30 验证（2026-11-15，全屏二级页路由化 + 车辆抽屉四组细节）

- `.playwright-cli/verify-r30.js`：**一个脚本串行跑双引擎**（用户明确「WebKit 也要验证」），46 项断言、UA 判引擎、结果用 `pass/total/failed/errors` 精简输出。流程：注入离线账本 → 数据管理主动载入示例数据 → 等写入稳定 → 左侧抽屉点「车辆记录」→ 断言 `[data-route-page][data-route-path="/vehicle"]` **是路由节点而不是 `[role="dialog"]`**、抽屉已收起 → 主卡油电双栏 / 无「添加爱车照片」/ 加满锚点 / 记录行「加满了」标记 → 「记一笔」抽屉默认类型与上次默认值 → 加油 tab 车列表 `[小闪, 小白]`、充电 tab `[小闪, 小蓝]`、点车不改类型 → 日期滚轮标题「日期」→ 「距上次」跟随类型且里程为灰 → 选项字号与行高 → 删除二次确认同款白卡 → 返回首页 → 预算管理同样为路由页 → 语言键泄漏、横向溢出、pageerror。截图 `r30-vehicle-{all,gas,ev}-chromium.png`、`r30-record-{default,fuel,charge}-chromium.png`、`r30-{date-sheet,delete-confirm,budget-route}-chromium.png`。
- 结果：`pnpm lint` 通过（368 files）、`--no-emptyOutDir` 重建 `index-B3T5R_5F.js`、5173 与 dist 对齐、HTTP 200；**WebKit 46/46 + Chromium 46/46、零 pageerror**。

**本轮新增踩坑（按重要性）**：

1. **5173 跑的是 `dist` 预览，不是 dev server**：入口是 `assets/index-*.js`。在构建之后补的两处「静默 catch」一直没进 bundle，导致双引擎连续报同一个 `Unhandled Promise Rejection`。判据：`curl http://localhost:5173/ | grep -o 'assets/index-*.js'`，且 `/src/components/confirm/state.ts` 拿不到源码。**改完源码必须重建再验证**。
2. **`playwright-cli open` 的输出不能接 `head`**：`npx playwright-cli open ... | head -3` 会让管道提前关闭，连带把刚启动的浏览器进程带走，后续 `run-code` 全失败且日志为空。一律 `>/dev/null 2>&1`。
3. **两个引擎不要在同一条 Bash 命令里紧邻跑**：`close` 后立刻 `open` 另一个引擎会出现 `Browser 'default' is not open`；拆成两条命令、每条自带 `close → open → run-code → close`。
4. **`waitForTimeout` 猜不到路由页挂载**：WebKit 点宫格到 `[data-route-page]` 出现可能超过固定 sleep。显式 `waitForSelector('[data-route-page][data-route-path="/vehicle"]')`；返回按钮用 `[data-route-page] button` 第一个（PopupLayout 圆形返回），比固定坐标可靠。
5. **收起左侧抽屉会 reject Promise**：`confirm/state.ts` 的 `open()` 与 `confirm/index.tsx` 的 `confirm()` 都必须在源头附着静默 catch，`ProfileAvatar` 的 `showProfile()` 调用点也要 `.catch(() => {})`；只改调用层不够。
6. **内存紧张下 WebKit 连续截图会拖崩浏览器**：当时可用物理内存约 1.6 GB，9 张 402×874 截图把 WebKit 打崩、日志只有半行。给 `shot()` 加 `if (tag === "webkit") return;` 跳过截图后 WebKit 46/46 全过；Chromium 保留截图供概览图使用。用户明确要求控制内存，**双引擎一律串行、跑完立即 close**。
7. **验证脚本的断言写法**：`placeholder` 不进 `innerText`；「全部」态默认车可能是混动，段控同时有加油 / 充电是正确行为；「距上次」要先显式切到目标类型再断言。
8. `.playwright-cli/make-r30-overview.py`：9 张改动后截图整合，纯 Pillow CPU 操作，不开浏览器、不跑构建，避免再吃内存。

## r31 验证（2026-11-15，段控 / 主卡 / 删除入口 / 记录行 / 统计算法）

- `.playwright-cli/verify-r31.js`：**一个脚本串行跑双引擎**，34 项断言。初始化与 r30 同（`__r31_boot` + 离线账本 + 主动载入示例数据 + 轮询写入稳定）；断言：全部态油电双栏且 `span.text-brand` 数值都在 `(0, 40)` 且无 `NaN/Infinity`（抓跨车混算 bug）、单车态右侧「最近一次 / 均价 / 本月」三行且 label 的 `x > 190`、燃油 `¥x/L` 与纯电 `¥x/kWh`、未加满的「本段已累计 15.0 L，下次补满后计入」、记录行 `/距上次.{0,8}?[\d,]+ km · \d+ 天/` 且含「距上次维修」、页面 `[aria-label="删除"]` 计数为 0、段控 5 项且**恰好 1 项** `bg-ground-muted`、按钮高 36px、容器含 `ring-1`、两个编辑抽屉里删除按钮的 `top >= 保存.bottom - 2`、删除确认白卡宽 320px、语言键泄漏、横向溢出、pageerror。截图 `r31-{vehicle-all,vehicle-gas,vehicle-ev,record-list,record-sheet,record-edit,delete-confirm,vehicle-edit}-chromium.png`。
- 结果：`pnpm lint` 通过（368 files）、`--no-emptyOutDir` 重建 `index-DWVHjFDc.js`、5173 与 dist 对齐、HTTP 200；**WebKit 34/34 + Chromium 34/34、零 pageerror**。能耗实测全部态 `5.81 L/100km` / `10.23 kWh/100km`（跨车混算时不可用）。`.playwright-cli/make-r31-overview.py` → `r31-vehicle-overview.png`（8 格，只含改动后）。

**本轮踩坑**：

1. **改完示例数据必须重新构建**：`sample-data.ts` 在第一次 `vite build` 之后才补了「未加满加油」与「第二笔维修」，若沿用旧 bundle，pending 提示与「距上次维修」断言必然失败。5173 是 `dist` 预览，判据仍是 `curl ... | grep -o 'assets/index-*.js'`。
2. **选中态断言不能靠字重**：r30 脚本用 `font-semibold` 找激活 tab，r31 段控改成记账同款后激活项是 `bg-ground-muted` + `font-medium`，要按 class 判断，否则 `activeType()` 永远返回空。
3. **示例数据要能演示边界场景**：原 19 笔补能全是 `isFull: true`，pending 分支没有任何数据能触发；补一笔 `isFull: false` 与一笔第二笔 `repair` 后，「下次补满后计入」和「距上次维修 X km · Y 天」才在 UI 里真实可见。`VehicleSeed` 增 `isFull?: boolean`，落库时用 `s.isFull ?? true`。
4. **抽屉内挂确认 Provider**：删除入口搬进抽屉后，`createDeleteConfirm()` 实例必须渲染在抽屉 JSX 里；页面级 Provider 已删除。按钮位置用 `getBoundingClientRect()` 比较 `保存.bottom` 与 `删除.top`，比文字顺序断言可靠。
5. **DOM 直接 click 绕开 WebKit stability**：车辆页胶囊、铅笔、记录行整行按钮在 WebKit 上偶尔被判 "not stable"，脚本统一用 `page.evaluate(() => btn.click())`；不要据此改业务代码。
6. **控内存**：两个引擎拆成两条独立 Bash 命令、各自 `open → run-code → close`；WebKit 由 `shot()` 跳过截图，Chromium 单独产出 8 张图。预览 precache 因连续 `--no-emptyOutDir` 累积到 331 entries（约 9.9 MB），部署前若要清干净需先停 5173 预览再移走 `dist`。

## r32 / r33 验证（2026-11-15，估算兜底 / 默认不勾加满）

- `.playwright-cli/verify-r32.js`（37 项）+ `make-r32-overview.py`：一次构建 `index-2f9dqOqO.js`，`pnpm lint` 368 files 通过，5173 与 dist 哈希一致、HTTP 200；**WebKit 37/37 + Chromium 37/37、零 pageerror**，双引擎串行、跑完即关。截图只在 Chromium 出，5 格概览图由纯 Pillow 拼成。实测：全部态 `5.81 L/100km` 精确 + `≈ 10.23 kWh/100km` 含估算；小蓝 `≈ 13.96 kWh/100km`；小白 `6.60 L/100km` 精确且 15.0 L 待结算可见；小闪双栏都精确。
- **r33 只改 `forms.tsx` 的 `isFull` 默认值与「记住上次」逻辑，用户明确「改动后不用验证了」，未跑 lint / 构建 / 浏览器验证**；因此 5173 的 dist 仍停留在 r32 的 bundle，下次要验 UI 必须先 `vite build`。
- 教训：把「一次构建 + 双引擎 + 拼图」塞进**一条** Bash 命令会超过单次执行上限（构建约 1 分 35 秒），在 WebKit 中途被掐断；构建别重来，把两个引擎拆成两条命令续跑即可。Chromium 偶发「`open` 成功但页面已被回收」，在同一条命令里加一次 `close → open → run-code` 自愈重试即可恢复。
