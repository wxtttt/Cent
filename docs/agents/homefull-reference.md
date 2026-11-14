# 家小满参考资产与逆向环境

> 由根目录 `AGENTS.md` 拆分而来，属于功能级文档（渐进式披露）。先读 `AGENTS.md` 了解全局约定，改到本模块时再读本文；本模块有新口径 / 新规则时，同步更新 `AGENTS.md` 索引与本文。

## 参考资产

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
