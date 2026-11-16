/**
 * 二级页与底部抽屉的共享版式（预算管理页与贷款管理页共用）。
 *
 * 这一层只放「结构 + 视觉常量」，不放业务：卡片、分组小标题、设置行、
 * 抽屉壳与底栏、抽屉内的行、橙色提醒。
 *
 * 之所以要抽出来：贷款页此前把抽屉壳、行、按钮各写了一份，导致
 * 确认按钮比卡片窄、底色和预算页对不上、行高忽高忽低。以后新增二级页
 * 一律从这里取，不再手写 Dialog / 卡片 / 底栏。
 */
import type { ComponentProps, ReactNode } from "react";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import {
    BTN_DANGER,
    BTN_PRIMARY,
    BTN_SECONDARY,
    PRESSABLE_ROW,
    SHEET_FOOTER,
} from "./button-styles";

/** 白卡：二级页列表与抽屉内容共用（圆角 16 + 纯白 + 轻投影） */
export const CARD =
    "rounded-2xl bg-panel shadow-[0_1px_6px_rgba(92,62,30,0.05)]";

/** 卡片外的分组小标题：12px 次级灰，永远紧贴卡片上方，不在卡内 */
export function GroupTitle({
    title,
    action,
    first,
    className,
}: {
    title: string;
    action?: ReactNode;
    /** 页面第一个分组用 mt-4，其余 mt-3 */
    first?: boolean;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "mb-1.5 flex shrink-0 items-center justify-between gap-2 px-1 text-[12px] text-ink-secondary",
                first ? "mt-4" : "mt-3",
                className,
            )}
        >
            <span className="truncate">{title}</span>
            {action}
        </div>
    );
}

/** 分组连卡：组内行只有细分隔线、行之间没有间隙 */
export function ListCard({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "divide-y divide-rule/70 overflow-hidden shrink-0",
                CARD,
                className,
            )}
        >
            {children}
        </div>
    );
}

/**
 * 设置行：58px 高，15px 主文案 + 11px 副文案，右侧主值 14px + 箭头。
 * 主文案用 `text-ink`（黑），副文案用 `text-ink-secondary`（灰）——
 * 「重要的字黑、不重要的字灰」是这一层的固定口径。
 */
export function ListRow({
    title,
    subtitle,
    value,
    valueClassName,
    badge,
    trailing,
    onClick,
    disabled,
    className,
    ...rest
}: {
    title: string;
    subtitle?: string;
    value?: string;
    /** 值过长时传 `min-w-0 shrink truncate`，否则值不换行、不截断 */
    valueClassName?: string;
    badge?: ReactNode;
    /** 右侧追加内容（放在主值之前） */
    trailing?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
} & Omit<
    ComponentProps<"button">,
    "title" | "value" | "onClick" | "className" | "children"
>) {
    const content = (
        <>
            {badge}
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] text-ink">
                    {title}
                </span>
                {subtitle && (
                    <span className="mt-0.5 block truncate text-[11px] text-ink-secondary">
                        {subtitle}
                    </span>
                )}
            </span>
            {trailing}
            {value && (
                <span
                    className={cn(
                        "flex-shrink-0 text-[14px] text-ink tabular-nums",
                        valueClassName,
                    )}
                >
                    {value}
                </span>
            )}
            {!disabled && (
                <i className="icon-[lucide--chevron-right] size-4 flex-shrink-0 text-ink-secondary/60" />
            )}
        </>
    );
    const cls = cn(
        "flex min-h-[58px] w-full items-center gap-3 px-4 py-2 text-left",
        !disabled && PRESSABLE_ROW,
        className,
    );
    if (!onClick) {
        return <div className={cls}>{content}</div>;
    }
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={disabled ? undefined : onClick}
            className={cls}
            {...rest}
        >
            {content}
        </button>
    );
}

/**
 * 缺省卡片：分组里一条记录都没有时占位的一张白卡，卡内只有一行 12px 灰字。
 * 与贷款页「提前还款 / 利率调整」的空态同款：白底卡、灰色说明，不用虚线框、
 * 也不在卡里放按钮 —— 添加动作统一由页头 ＋ 承担，空卡只负责说明这里有功能。
 *
 * 高度与一条 `ListRow` 对齐（58px 起，文案折行才自然变高），
 * 这样空态卡和有记录时的卡片在同一个分组里高度节奏一致。
 */
export function PlaceholderCard({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                CARD,
                "flex min-h-[58px] shrink-0 items-center px-4 py-3",
                className,
            )}
        >
            <p className="text-[12px] leading-relaxed text-ink-secondary">
                {children}
            </p>
        </div>
    );
}

/**
 * 抽屉底栏：分隔线 + 两颗等宽按钮（左「取消 / 删除」，右「确认 / 保存」）。
 * 所有底部抽屉共用这一个 —— 用 `PopupLayout` 自绘内容的表单（车辆、物品、医疗、
 * 分类、筛选）与 `SheetShell` 抽屉都取它，避免有的通栏大按钮、有的右上角小「保存」。
 */
export function SheetFooter({
    onCancel,
    cancelLabel,
    cancelDanger,
    onConfirm,
    confirmLabel,
    confirmDisabled,
    children,
}: {
    onCancel?: () => void;
    /** 编辑态把左侧按钮换成「删除」 */
    cancelLabel?: string;
    cancelDanger?: boolean;
    onConfirm?: () => void;
    confirmLabel?: string;
    confirmDisabled?: boolean;
    /** 需要三颗按钮等自定义排列时整行接管 */
    children?: ReactNode;
}) {
    const t = useIntl();
    return (
        <div className={cn(SHEET_FOOTER, "flex-shrink-0")}>
            {children ?? (
                <div className="flex gap-2.5">
                    <button
                        type="button"
                        onClick={onCancel}
                        className={cn(
                            cancelDanger ? BTN_DANGER : BTN_SECONDARY,
                            "flex-1",
                        )}
                    >
                        {cancelLabel ?? t("cancel")}
                    </button>
                    <button
                        type="button"
                        disabled={confirmDisabled}
                        onClick={onConfirm}
                        className={cn(BTN_PRIMARY, "flex-1")}
                    >
                        {confirmLabel ?? t("confirm")}
                    </button>
                </div>
            )}
        </div>
    );
}

/**
 * 抽屉壳：拖拽条 + 居中标题 + 可选说明 + 内容 + 常驻底栏。
 * 底栏固定「左侧 删除或取消 / 右侧 确认」两颗等宽按钮，
 * 删除态用 `BTN_DANGER`（浅红底红字），与编辑特殊预算完全一致。
 */
export function SheetShell({
    title,
    hint,
    children,
    onCancel,
    onConfirm,
    cancelLabel,
    cancelDanger,
    confirmLabel,
    confirmDisabled,
    footer,
    className,
}: {
    title: string;
    hint?: string;
    children: ReactNode;
    onCancel?: () => void;
    onConfirm?: () => void;
    /** 编辑态把左侧按钮换成「删除」 */
    cancelLabel?: string;
    cancelDanger?: boolean;
    confirmLabel?: string;
    confirmDisabled?: boolean;
    /** 底栏换成一整行自定义内容（如「新增方案」） */
    footer?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex max-h-[85dvh] flex-col", className)}>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-secondary/40" />
                <h2 className="text-center text-[17px] font-semibold text-ink">
                    {title}
                </h2>
                {hint && (
                    <p className="mt-1.5 text-center text-[12px] leading-relaxed text-ink-secondary">
                        {hint}
                    </p>
                )}
                <div className="mt-5 mb-2">{children}</div>
            </div>
            <SheetFooter
                onCancel={onCancel}
                cancelLabel={cancelLabel}
                cancelDanger={cancelDanger}
                onConfirm={onConfirm}
                confirmLabel={confirmLabel}
                confirmDisabled={confirmDisabled}
            >
                {footer}
            </SheetFooter>
        </div>
    );
}

/** 抽屉内的一张白卡：行之间用细分割线分隔，圆角包住首尾行 */
export function SheetCard({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "divide-y divide-rule/60 overflow-hidden shrink-0",
                CARD,
                className,
            )}
        >
            {children}
        </div>
    );
}

/**
 * 抽屉内的设置行：左 92px 标签（黑）/ 右内容（右对齐）。
 * 固定 52px，行内控件再高也不会把行撑得参差。
 */
export function SheetRow({
    label,
    children,
    onClick,
    disabled,
    className,
}: {
    label: string;
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
}) {
    const inner = (
        <>
            <span className="min-w-[92px] max-w-[45%] flex-shrink-0 text-[15px] leading-5 text-ink">
                {label}
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5">
                {children}
            </div>
        </>
    );
    const cls = cn(
        "flex min-h-[52px] w-full items-center gap-2 px-4 py-2 text-left",
        !disabled && onClick && PRESSABLE_ROW,
        className,
    );
    return onClick ? (
        <button
            type="button"
            disabled={disabled}
            onClick={disabled ? undefined : onClick}
            className={cls}
        >
            {inner}
        </button>
    ) : (
        <div className={cls}>{inner}</div>
    );
}

/** 可点行进下一层抽屉时，右侧统一「当前值（灰）+ 箭头」 */
export function SheetLinkValue({ label }: { label: string }) {
    return (
        <>
            <span className="min-w-0 truncate text-[14px] text-ink-secondary">
                {label}
            </span>
            <i className="icon-[lucide--chevron-right] size-4 flex-shrink-0 text-ink-secondary/60" />
        </>
    );
}

/**
 * 橙色提醒块（预算起始日同款）：浅品牌底 + 主文案黑 15px 加粗 +
 * 副文案灰 11px。抽屉里的「会发生什么」类提示一律用它，
 * 不再用绿色 / 黄色等第二种提示色。
 */
export function SheetHint({
    title,
    desc,
    children,
    className,
}: {
    title?: ReactNode;
    desc?: ReactNode;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("rounded-2xl bg-brand/10 px-3.5 py-3", className)}>
            {title && (
                <p className="text-[15px] font-semibold leading-5 text-ink">
                    {title}
                </p>
            )}
            {desc && (
                <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">
                    {desc}
                </p>
            )}
            {children}
        </div>
    );
}

/** 提醒块内的极淡分隔线（上下两段提示之间） */
export function SheetHintDivider() {
    return <div className="my-2.5 h-px bg-ink-secondary/15" />;
}
