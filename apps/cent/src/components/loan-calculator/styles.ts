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

/** 可选卡 / 胶囊的选中与未选中（描边 + 浅品牌底色，不用 ring 叠两层） */
export const PICK_ON = "border-brand bg-brand/10 text-brand";
export const PICK_OFF = "border-rule bg-panel text-ink";

/**
 * 分段控件（计算方式 / 提前还款模式）：浅灰容器 + 白色凸起胶囊，
 * 与 `components/segmented-tabs` 同形，只是容器色改取中性作用域里的 `ground-muted`。
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
