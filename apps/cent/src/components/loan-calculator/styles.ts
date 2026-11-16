/**
 * 贷款计算页的共用视觉常量。
 *
 * 页面底色走 `dp-drawer-surface`（中性灰白 #f4f4f4 底 + 纯白卡），
 * 与车辆记录 / 预算管理等二级页同一套；卡片、可选块、分段控件都从这里取，
 * 不要再在组件里各写一份（曾出现 hero 用暖色渐变、chip 三种选中态并存）。
 */

/** 一张白卡：圆角 16 + 纯白 + 车辆页同款轻投影（内边距由使用处自己给） */
export const LOAN_CARD =
    "rounded-2xl bg-panel shadow-[0_1px_6px_rgba(92,62,30,0.05)]";

/** 卡片外的分组标题：对齐车辆页 GroupTitle（12px 次级灰，不是 15px 粗黑） */
export const GROUP_TITLE = "px-1 pb-1.5 text-[12px] text-ink-secondary";

/** 设置行：52 高，左右 16，行间靠 divide-y 分隔 */
export const ROW =
    "flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-2";
export const ROW_LEFT = "flex-shrink-0 text-[15px] text-ink";
/** 行右侧的主值：数字用 600，中文标签一律不用（Windows 上会落 700 发黑） */
export const ROW_VALUE = "text-[15px] dp-text-medium text-ink tabular-nums";
export const ROW_MUTED = "text-xs text-ink-secondary tabular-nums";

/** 可选卡 / 胶囊的选中与未选中（描边 + 浅品牌底色，不用 ring 叠两层） */
export const PICK_ON = "border-brand bg-brand/10 text-brand";
export const PICK_OFF = "border-rule bg-panel text-ink";

/**
 * 分段控件：浅灰容器 + 白色凸起胶囊，与 `components/segmented-tabs` 同形，
 * 容器色取中性作用域里的 `ground-muted`。
 */
export const SEG_GROUP =
    "flex items-center gap-1 rounded-full bg-ground-muted p-1";
export const SEG_ITEM =
    "cursor-pointer rounded-full px-3 py-1.5 text-[13px] transition-colors";
export const SEG_ON = "dp-text-medium bg-panel text-ink shadow-panel";
export const SEG_OFF = "text-ink-secondary";

/** 抽屉壳：灰底 + 顶部 28 圆角，并挂 `dp-sheet-surface` 让内部 bg-ground / rule 取中性色 */
export const SHEET_SURFACE =
    "dp-sheet-surface pointer-events-auto w-full rounded-t-[28px] border border-b-0 border-rule bg-ground shadow-panel sm:w-[90vw] sm:max-w-[500px] sm:rounded-[28px] sm:border-b";

/** 抽屉里的确认按钮：BTN_PRIMARY 是 inline-flex，单独放时必须显式撑满 */
export const SHEET_ACTION = "w-full";

/**
 * 页面底栏（不是抽屉底栏）。
 * `PopupLayout` 已经给整页垫了 `--safe-area-inset-bottom`，这里不能再叠加一次，
 * 否则「保存」按钮会被顶出可视区、只露出半截（用户报的正是这个）。
 */
export const PAGE_FOOTER =
    "flex-shrink-0 border-t border-rule/70 bg-ground px-4 pt-3 pb-3";
