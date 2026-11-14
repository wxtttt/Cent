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
