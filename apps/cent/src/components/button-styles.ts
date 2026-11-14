/**
 * 弹层按钮统一视觉：可点态与不可点态必须成对出现。
 *
 * 之前用 `bg-ground-muted` 做「可点」按钮，和真正 disabled 的灰底几乎一样，
 * 用户反馈「淡淡的像不能点击」。现在：
 * - 可点态 = 实心品牌色 / 白底描边 + 轻投影 + 字重 600，且带 enabled:hover / enabled:active 按压反馈；
 * - 不可点态 = 灰底（`bg-ground-muted`）+ 次级灰字 + 无投影 + `cursor-not-allowed`，并去掉按压反馈。
 * 所有 hover/active 都加 `enabled:` 前缀，禁用按钮不会残留悬停变色。
 */
const pressable =
    "transition-[transform,background-color,border-color,box-shadow,filter] duration-150 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:shadow-none";

/** 40px 主操作行基础（宽度由调用方给 `flex-1`） */
export const BTN_BASE = `inline-flex h-10 items-center justify-center rounded-[10px] text-[14px] font-semibold ${pressable}`;

/** 确认 / 保存：品牌实心 */
export const BTN_PRIMARY = `${BTN_BASE} bg-brand text-on-brand shadow-[0_2px_8px_rgba(255,132,53,0.28)] enabled:hover:brightness-105 enabled:active:brightness-95 disabled:bg-ground-muted disabled:text-ink-secondary/80 disabled:brightness-100`;

/** 取消 / 返回：白底描边，深色文字，明显可点 */
export const BTN_SECONDARY = `${BTN_BASE} border border-rule bg-panel text-ink shadow-[0_1px_4px_rgba(0,0,0,0.05)] enabled:hover:border-brand/60 enabled:hover:text-brand enabled:active:bg-ground-muted disabled:border-transparent disabled:bg-ground-muted disabled:text-ink-secondary/80`;

/** 删除等破坏性操作：浅红底 + 红字 */
export const BTN_DANGER = `${BTN_BASE} border border-[#f6bcbc] bg-[#fcdada] text-[#ef4444] shadow-[0_1px_4px_rgba(239,68,68,0.12)] enabled:hover:brightness-105 enabled:active:brightness-95 disabled:border-transparent disabled:bg-ground-muted disabled:text-ink-secondary/80 disabled:brightness-100`;

/**
 * 行内微调按钮（±、清零）：用「圆形 + 细描边 + 浅底 + 轻投影 + 按压缩放」表达可点，
 * 图标一律用主文字黑（灰色会让人误以为是禁用态），与分类名 / 金额同级；
 * 不做禁用态，到边界点击就是不加不减，靠 hover / active 反馈说明它是按钮。
 * touch-none + select-none 保证长按不会触发滚动、选中或右键菜单。
 */
export const BTN_TAP = `flex size-7 flex-shrink-0 touch-none select-none items-center justify-center rounded-full border border-rule bg-panel text-ink shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-[transform,background-color,border-color,color] duration-150 hover:border-brand/60 hover:bg-brand/5 hover:text-brand active:scale-90 active:border-brand active:bg-brand/10`;

/** 标题右侧的次级功能按钮（智能分配等）：胶囊形状 + 小图标，文字同样用主文字黑 */
export const BTN_COMPACT = `inline-flex h-7 flex-shrink-0 items-center justify-center gap-1 rounded-full border border-rule bg-panel px-2.5 text-[12px] text-ink shadow-[0_1px_3px_rgba(0,0,0,0.05)] ${pressable} hover:border-brand/60 hover:text-brand enabled:active:bg-brand/10`;

/** 可点行 / chip / 日期格的按压反馈（本身不是按钮时也可复用） */
export const PRESSABLE_ROW =
    "transition-colors enabled:hover:bg-brand/5 enabled:active:bg-brand/10";
