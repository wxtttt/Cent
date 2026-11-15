# 汇率与货币页 / 记一笔币种抽屉

> r31（2026-11-15）重构口径。改汇率与货币页、记一笔币种选择抽屉、手动汇率 / 自定义币种弹层时读本文。

## 汇率与货币页（`/currency` 路由页）

- `components/currency/list.tsx`（Provider 壳 `list-form.tsx`，`routePath: "/currency"`）：`backStyle="circle"` + `dp-drawer-surface h-full bg-ground`，与预算管理 / 车辆页同款中性灰白体系（亮色 `#f4f4f4` 底 / 纯白卡）。
- 整页四段「卡外小标题 + `FormCard` 白卡」：**本位币、快捷币种、自定义币种、汇率**（r31b 起自定义币种在汇率**上方**——汇率 30 行太长，放下面根本看不到；用户明确）。页脚 11px 小字 `exchange-rate-from` 链接 ecb.europa.eu（替代旧的 Popover 帮助气泡）。旧的 `Select` 下拉 / `Popover` / ghost 按钮体系已整体删除。
- **新增自定义币种按钮在页面右上角**（r31b）：PopupLayout 的 `right` 槽，`data-currency-add` 探针，圆形白底 `size-10 bg-panel` 与圆形返回钮同款；自定义币种段头不再放添加按钮。
- **本位币行 / 快捷币种行 = 多选选项抽屉复用**（`sheets.tsx` 里 `createOptionSheet()` 的模块级实例 `showCurrencyOptionSheet`，Provider 挂 list.tsx 根节点），**两处都传 `searchable: true`**（r31b，用户明确「抽屉要搜索功能，这么多根本看不过来」）：`OptionSheetValue.searchable` 是 `components/option-sheet.tsx` 新增的可选字段，开启后标题/提示下方出现全宽圆角搜索框（`h-9 bg-panel` + `input[type=search]`，清空按钮 `aria-label="清空"`），按 `label` / `id` lowercase includes 过滤**可见项**，`selected` 状态不受过滤影响、确认仍返回完整勾选结果；搜索无结果显示 `search-empty-results`；不传该字段的模块（预算成员 / 标签等）行为完全不变。
  - 本位币是**单选语义复用多选抽屉**：confirm 后取 `result.filter(id => id !== 当前本位币)` 的**最后一个**——直接点新币种时结果数组首位仍是旧本位币（初始 selected 注入），取首位会变成 no-op，这是踩过的坑。切换警告用纯文本键 `base-currency-switch-hint`（旧 `currency_change_warning` HTML Popover 已废弃，key 仍在语言包里没删）。
  - 快捷币种 confirm 后按「既有顺序在前、新勾选追加在后」写回 `updateQuickCurrencies`，避免每次确认重排快捷区。选项列表含自定义币种。
- **汇率行**：国旗 emoji 圆底（`bg-ground-muted`）+ 名称 + `id · symbol` 副标题，右侧汇率 4 位有效数字（`formatRate` = Intl `maximumSignificantDigits: 4`，替代 `toFixed(6)` 长尾）；手动汇率行加「手动」徽标（`manual-rate` 键，`bg-ground-muted` 灰胶囊）。点行弹底部抽屉手动汇率。本位币自身不在汇率列表里（rate 恒为 1，无意义）。
- **手动汇率语义（历史口径，勿改）**：行内显示 `convert(1, 本位币, 该币)` = 1 该币兑多少本位币；手动输入框方向是「1 本位币 = ? 该币」（`rate-input.tsx`，支持箭头按钮反向），存进 `meta.personal[uid].rates` 后换算路径会取倒数，两处显示一致。置空确认 = 清除手动汇率恢复自动。
- **自定义币种**：点行弹编辑抽屉（`edit.tsx`，react-hook-form + zod 校验不变），底部左「删除」（`BTN_DANGER`，仅编辑态）→ `createDeleteConfirm()` 模块实例 `showCurrencyDelete` 二次确认（r31 起不再用旧表单里的 inline destructive 按钮）；空态整行「还没有自定义币种」。
- 手动汇率 / 自定义币种两个弹层都是底部抽屉（`rounded-t-[28px]` + `SHEET_FOOTER` + `BTN_PRIMARY` / `BTN_SECONDARY` 成对），选项与删除 Provider 在 `sheets.tsx`（`CurrencyOptionProvider` / `CurrencyDeleteProvider`）+ `EditCurrencyProvider` / `ManualRateProvider` 全部挂 list.tsx 根节点；每模块一个实例，重复挂载会渲染两份弹层。
- data 探针：`[data-currency-page]`、`[data-currency-base-row]`、`[data-currency-quick-row]`、`[data-currency-rate-row="USD"]`、`[data-currency-custom-row]`，验证脚本直接用。

## 记一笔币种抽屉（`bill-editor/currency-sheet.tsx`）

- 标题右侧 `w-[116px]` 圆角搜索框（r31 新增，**替代了关闭 X**，关抽屉靠点遮罩 / 下拉），与分类抽屉（`category-sheet.tsx`）同款交互与样式。
- 搜索匹配 `label`（美元）/ `id`（USD）/ `symbol`（$）三个字段 lowercase includes；命中后隐藏「快捷币种 / 全部币种」两段、平铺 2 列结果格（选中态 / 本位币标记照常）；无结果显示 `search-empty-results`（没有找到匹配的记录）；清空按钮 `aria-label="清空"`。
- 「快捷币种」格子在搜索恢复后照常显示；底部「汇率与货币」按钮 → `showCurrencyList()` 不变。注意路由页 z-[3] 低于弹层 z-[4]：从记一笔抽屉里点它，/currency 会垫在抽屉后面（r30 起既有行为，勿当 bug 修）。
- 金额前的货币符号仍是 `[data-currency-trigger]`；选中币种返回 `{currencyId}` 走原 `changeCurrency()` 换算，`≈` 角标在金额行右下角。

## 验证（`verify-r31.js`，42 项断言，双引擎）

- BASE 指向**本会话 preview 实际端口**（本轮 5175；5173 / 5174 被并发会话占用，端口要以 `check-port.cjs` 或 preview 日志为准，别写死）。
- 覆盖：/currency 四段结构（**自定义币种段在汇率段之前**、右上角 `data-currency-add` 按钮 `top < 120`）、31 个默认币种 − 本位币 = 30 汇率行、本位币选项抽屉打开即关不改值、快捷币种抽屉搜索过滤（「美」只剩美元 / 清空恢复）、勾选回写摘要、手动汇率设置 → 「手动」徽标 → 清空恢复、右上角新增自定义币种 → 编辑 → 删除二次确认 → 空态、返回首页、记一笔币种抽屉搜索（命中 / 代码 / 空态 / 清空 / 结果直选切 `$/≈`）、横向溢出、pageerror 过滤。
- **WebKit 行点击间歇吞掉**（r31b 新坑）：点行后弹层没开是偶发（dispatchEvent 也可能不打进被覆盖的元素），所有「点行 → 开抽屉」统一走 `openSheet(loc, needle, key)` 辅助——点完确认弹层出现，没出现就再点（最多 3 次）；抽屉没开时输入框 fill 会干等 30s 直接把 run 打死，输入前必须 `count()` 守卫。
- **坑**：
  - WebKit 上 personal meta 的 IndexedDB 写入在汇率源重试风暴下可能慢于固定 sleep，手动汇率徽标断言必须用 `page.waitForFunction` 轮询（8s），固定 900ms 会误报 set 和 clear 两项。
  - 离线预览里 kurrency 对 `raw.githubusercontent.com` 的抓取会循环失败（WebKit 一次跑出 483 次 `Failed to fetch`，Chromium 只失败 2 次），属既有网络噪声；脚本加 `page.route("**/raw.githubusercontent.com/**", r => r.abort())` 掐断，别当 UI 缺陷修。
  - `playwright-cli open` 的输出**不能接 findstr / head 管道**（管道关闭带走浏览器进程，与 r30 的 head 坑同源）；重定向到文件或 NUL 都可以，但 WebKit 在 Chromium close 后紧接着 open 仍可能起不来（r30 既有坑），隔一条命令或整链重试。
  - 语言键：r31 新增 5 个（`base-currency-switch-hint` / `custom-currencies` / `custom-currencies-empty` / `manual-rate` / `rate-invert`），zh/en 同步、UTF-8 + LF、独立 `.py` 写入。
