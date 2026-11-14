# 领域模型（改动前必须了解）

> 由根目录 `AGENTS.md` 拆分而来，属于功能级文档（渐进式披露）。先读 `AGENTS.md` 了解全局约定，改到本模块时再读本文；本模块有新口径 / 新规则时，同步更新 `AGENTS.md` 索引与本文。

## 领域模型

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


## 分类图标与成员

- **分类图标只属于二级分类**（用户明确要求）：`ledger/category.ts` 的 12 个一级分组 `icon: ""`，**不要给一级补图标**；只有二级分类带 `/category/*.webp` 插画。`category/item.tsx` 的 `CategoryIcon` 加 `category.icon &&` 条件；`ledger/item.tsx` / `bill-info/form.tsx` / `category/form.tsx` 本来就有条件，保持。一级分组只用于归类、分组标题与拖拽排序，不参与任何图标渲染。

- **成员**：唯一候选来源是 `GlobalMeta.members`；`infos.creators` 是协作者体系，两者不保证同 ID。账单卡创建者名称先查 `creators`、再查 `members`，最后才回落到 `t("unknown-user")`——**不要写死字面量 `"unknown-user"`**（曾导致首页 / 记账页账单卡右下角一堆英文 key）。

- 预算 / 标签的领域规则（周期、记录链、互斥计账、分配额度）见 `docs/agents/budget.md`。
