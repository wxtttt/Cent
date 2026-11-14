import dayjs from "dayjs";
import { type ReactNode, useMemo, useState } from "react";
import type { BillCategory, BillTag, Member } from "@/ledger/type";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import {
    BTN_DANGER,
    BTN_PRIMARY,
    BTN_SECONDARY,
    PRESSABLE_ROW,
} from "../button-styles";
import createConfirmProvider from "../confirm";
import { createDeleteConfirm } from "../delete-confirm";
import { createNameDialog } from "../name-dialog";
import { createOptionSheet } from "../option-sheet";
import { createAllocationSheet } from "./allocation-sheet";
import { AmountInput } from "./amount-input";
import {
    firstAnchorAfter,
    periodContaining,
    periodFrom,
    periodLabel,
} from "./period";
import type { EditBudget } from "./type";

export type BudgetDraft = Omit<EditBudget, "id">;
export type CategoryBudget = { id: string; budget: number };
/** 月度预算抽屉一次返回总额与逐类额度 */
export type MonthlyBudgetValue = {
    totalBudget: number;
    categoriesBudget: CategoryBudget[];
};

/** 所有预算输入统一走底部抽屉，不做行内输入、不跳独立编辑页 */
export type BudgetSheetValue =
    | {
          type: "monthly";
          value: number;
          categoriesBudget: CategoryBudget[];
          categories: BillCategory[];
      }
    | { type: "startDay"; value: number }
    | { type: "members"; value: (string | number)[]; members: Member[] }
    | {
          type: "special";
          value: BudgetDraft;
          specialTags: BillTag[];
          members: Member[];
          categories: BillCategory[];
          isEdit: boolean;
      };

export type BudgetSheetResult =
    | MonthlyBudgetValue
    | number
    | (string | number)[]
    | BudgetDraft
    | "delete";

/** 名称修改、选项选择、删除确认各自独立实例，避免同一 Provider 被多处挂载渲染两份弹层 */
export const [BudgetNameProvider, showBudgetName] = createNameDialog();
export const [BudgetOptionProvider, showBudgetOptions] = createOptionSheet();
export const [BudgetDeleteProvider, showBudgetDelete] = createDeleteConfirm();
export const [BudgetAllocationProvider, showBudgetAllocation] =
    createAllocationSheet();

function SheetShell({
    title,
    hint,
    children,
    onCancel,
    onSave,
    cancelLabel,
    cancelDanger,
    saveDisabled,
}: {
    title: string;
    hint?: string;
    children: ReactNode;
    onCancel?: () => void;
    onSave?: () => void;
    /** 编辑态把左侧按钮改成「删除」，点击进入二次确认 */
    cancelLabel?: string;
    cancelDanger?: boolean;
    saveDisabled?: boolean;
}) {
    const t = useIntl();
    return (
        <div className="flex max-h-[80dvh] flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-secondary/40" />
                <h2 className="text-center text-[17px] text-ink">{title}</h2>
                {hint && (
                    <p className="mt-1.5 text-center text-[12px] leading-relaxed text-ink-secondary">
                        {hint}
                    </p>
                )}
                <div className="mt-5 mb-2">{children}</div>
            </div>
            {/* 长表单滚动时，操作按钮常驻抽屉底部 */}
            <div className="border-t border-rule/70 bg-ground px-5 pt-2.5 pb-5">
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
                        disabled={saveDisabled}
                        onClick={onSave}
                        className={cn(BTN_PRIMARY, "flex-1")}
                    >
                        {t("confirm")}
                    </button>
                </div>
            </div>
        </div>
    );
}

/** 一行一卡的 chip 多选 */
const Chips = ({
    items,
    selected,
    onToggle,
    align = "left",
    empty,
}: {
    items: { id: string; label: string }[];
    selected: string[];
    onToggle: (id: string) => void;
    align?: "left" | "right";
    empty?: string;
}) => {
    const t = useIntl();
    return (
        <div
            className={cn(
                "flex w-full flex-wrap gap-2",
                align === "right" && "justify-end",
            )}
        >
            {items.length === 0 && (
                <span className="text-[12px] text-ink-secondary">
                    {empty ?? t("no-options")}
                </span>
            )}
            {items.map((item) => {
                const on = selected.includes(item.id);
                return (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onToggle(item.id)}
                        className={cn(
                            "rounded-full px-3 py-1.5 text-[13px] shadow-[0_1px_3px_rgba(0,0,0,0.05)]",
                            PRESSABLE_ROW,
                            "enabled:active:scale-95",
                            on
                                ? "bg-brand text-on-brand enabled:hover:brightness-105"
                                : "border border-rule bg-panel text-ink enabled:hover:border-brand/60",
                        )}
                    >
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
};

/** 抽屉内所有设置块统一「左标签 / 右内容」的行，不再出现有的带角标、有的不带 */
const SheetRow = ({
    label,
    children,
    onClick,
}: {
    label: string;
    children: ReactNode;
    onClick?: () => void;
}) => {
    const inner = (
        <>
            <span className="w-[92px] flex-shrink-0 text-[13px] leading-5 text-ink">
                {label}
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5">
                {children}
            </div>
        </>
    );
    /** 固定 52px：36px 输入框 + 上下各 8px，纯文字行也保持同一高度 */
    const cls = "flex h-[52px] w-full items-center gap-2 px-4 py-2 text-left";
    return onClick ? (
        <button
            type="button"
            onClick={onClick}
            className={cn(cls, PRESSABLE_ROW)}
        >
            {inner}
        </button>
    ) : (
        <div className={cls}>{inner}</div>
    );
};

/** 可点行进选项抽屉时，右侧统一显示「当前值 + 箭头」 */
const RowLinkValue = ({ label }: { label: string }) => (
    <>
        <span className="min-w-0 truncate text-[13px] text-ink-secondary">
            {label}
        </span>
        <i className="icon-[lucide--chevron-right] size-4 flex-shrink-0 text-ink-secondary/60" />
    </>
);

/**
 * 金额 + 详细分配：月度预算与特殊预算共用同一组行，插进各自那张白卡里。
 * 两处标签统一为「金额 / 详细分配」；详细分配不在卡内展开，点行再弹一层独立抽屉。
 */
function AmountRows({
    total,
    onTotalChange,
    categories,
    categoriesBudget,
    onCategoriesChange,
}: {
    total: number;
    onTotalChange: (v: number) => void;
    categories: BillCategory[];
    categoriesBudget: CategoryBudget[];
    onCategoriesChange: (v: CategoryBudget[]) => void;
}) {
    const t = useIntl();
    const configured = categoriesBudget.filter(
        (v) => v.id && v.budget > 0,
    ).length;

    const openAllocation = async () => {
        const next = await showBudgetAllocation({
            total,
            categories,
            value: categoriesBudget,
        }).catch(() => undefined);
        if (next !== undefined) {
            onCategoriesChange(next.filter((v) => v.id && v.budget > 0));
        }
    };

    return (
        <>
            <SheetRow label={t("budget-amount")}>
                <AmountInput
                    value={total}
                    onChange={onTotalChange}
                    className="w-[124px] flex-shrink-0"
                />
            </SheetRow>
            <SheetRow
                label={t("detailed-allocation")}
                onClick={() => void openAllocation()}
            >
                <RowLinkValue
                    label={
                        configured > 0
                            ? t("n-categories-set", { n: configured })
                            : t("not-set")
                    }
                />
            </SheetRow>
        </>
    );
}

/** 月度预算：普通预算总额 + 其内部各一级分类额度，一次保存写回同一条记录 */
function MonthlyForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit: Extract<BudgetSheetValue, { type: "monthly" }>;
    onCancel?: () => void;
    onConfirm?: (v: BudgetSheetResult) => void;
}) {
    const t = useIntl();
    const [total, setTotal] = useState(edit.value);
    const [categories, setCategories] = useState<CategoryBudget[]>(
        edit.categoriesBudget,
    );
    return (
        <SheetShell
            title={t("monthly-budget")}
            hint={t("monthly-budget-sheet-hint")}
            onCancel={onCancel}
            onSave={() =>
                onConfirm?.({
                    totalBudget: total,
                    categoriesBudget: categories.filter(
                        (v) => v.id && v.budget > 0,
                    ),
                })
            }
        >
            <div className="divide-y divide-rule/60 overflow-hidden rounded-2xl bg-panel shadow-[0_1px_6px_rgba(92,62,30,0.05)]">
                <AmountRows
                    total={total}
                    onTotalChange={setTotal}
                    categories={edit.categories}
                    categoriesBudget={categories}
                    onCategoriesChange={setCategories}
                />
            </div>
        </SheetShell>
    );
}

function StartDayForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit: Extract<BudgetSheetValue, { type: "startDay" }>;
    onCancel?: () => void;
    onConfirm?: (v: BudgetSheetResult) => void;
}) {
    const t = useIntl();
    const [value, setValue] = useState(edit.value);
    const changed = value !== edit.value;

    /** 用与 setStartDay 相同的锚点算法预演，保证提示与实际落库结果一致 */
    const preview = useMemo(() => {
        const now = dayjs();
        const effective = firstAnchorAfter(now, value);
        const [newStart, newEnd] = periodFrom(effective, value);
        const [tStart, tEnd] = periodContaining(now, value);
        const gapEnd = effective.subtract(1, "day").endOf("day");
        const month = t("budget-period-month", {
            y: tStart.year(),
            m: tStart.month() + 1,
        });
        return {
            effective: t("start-day-effective-hint", {
                n: value,
                m: effective.month() + 1,
                d: effective.date(),
                period: periodLabel(newStart, newEnd),
            }),
            transition: t("start-day-transition-hint", {
                range: periodLabel(now.startOf("day"), gapEnd),
                month,
                period: periodLabel(tStart, tEnd),
            }),
        };
    }, [value, t]);

    return (
        <SheetShell
            title={t("budget-start-day")}
            onCancel={onCancel}
            onSave={() => onConfirm?.(value)}
        >
            <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <button
                        key={d}
                        type="button"
                        onClick={() => setValue(d)}
                        className={cn(
                            "h-9 rounded-lg text-[13px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-colors enabled:hover:border-brand/60 enabled:active:scale-95",
                            d === value
                                ? "bg-brand text-on-brand enabled:hover:brightness-105"
                                : "border border-rule bg-panel text-ink",
                        )}
                    >
                        {d}
                    </button>
                ))}
            </div>
            <div className="mt-4 rounded-2xl bg-brand/10 px-3.5 py-3">
                {changed ? (
                    <div className="flex flex-col gap-2 text-[12px] leading-relaxed text-ink">
                        <p className="flex gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
                            <span>{preview.effective}</span>
                        </p>
                        <p className="flex gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
                            <span>{preview.transition}</span>
                        </p>
                    </div>
                ) : (
                    <p className="text-[12px] leading-relaxed text-ink-secondary">
                        {t("start-day-hint-idle")}
                    </p>
                )}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-secondary">
                {t("start-day-note")}
            </p>
        </SheetShell>
    );
}

/**
 * 内部约定：joiners 为空数组 = 全部成员（含以后新增的）。
 * UI 上不暴露这个逻辑，打开时把全部成员高亮；保存时若仍是全选，写回空数组。
 */
const allMemberIds = (members: Member[]) => members.map((m) => String(m.id));
const normalizeJoiners = (selected: string[], members: Member[]) => {
    const all = allMemberIds(members);
    const allSelected =
        all.length > 0 && all.every((id) => selected.includes(id));
    return allSelected ? [] : selected;
};

function MembersForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit: Extract<BudgetSheetValue, { type: "members" }>;
    onCancel?: () => void;
    onConfirm?: (v: BudgetSheetResult) => void;
}) {
    const t = useIntl();
    const [value, setValue] = useState<string[]>(() =>
        edit.value.length === 0
            ? allMemberIds(edit.members)
            : edit.value.map(String),
    );
    const toggle = (id: string) =>
        setValue((prev) =>
            prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
        );
    return (
        <SheetShell
            title={t("participants")}
            hint={t("participants-hint")}
            onCancel={onCancel}
            onSave={() => onConfirm?.(normalizeJoiners(value, edit.members))}
        >
            <Chips
                items={edit.members.map((m) => ({
                    id: String(m.id),
                    label: m.name,
                }))}
                selected={value}
                onToggle={toggle}
            />
        </SheetShell>
    );
}

function SpecialForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit: Extract<BudgetSheetValue, { type: "special" }>;
    onCancel?: () => void;
    onConfirm?: (v: BudgetSheetResult) => void;
}) {
    const t = useIntl();
    const [value, setValue] = useState<BudgetDraft>(edit.value);
    const patch = (p: Partial<BudgetDraft>) =>
        setValue((v) => ({ ...v, ...p }));

    const tagIds = (value.tagIds ?? []).map(String);
    const tagSummary =
        tagIds.length === 0
            ? t("not-set")
            : tagIds.length === 1
              ? `#${edit.specialTags.find((tag) => tag.id === tagIds[0])?.name ?? tagIds[0]}`
              : t("n-items-selected", { n: tagIds.length });
    const shownMembers =
        value.joiners.length === 0
            ? allMemberIds(edit.members)
            : value.joiners.map(String);
    const memberSummary =
        value.joiners.length === 0 ||
        (edit.members.length > 0 && shownMembers.length === edit.members.length)
            ? t("all-members")
            : shownMembers.length === 0
              ? t("not-set")
              : shownMembers.length === 1
                ? (edit.members.find((m) => String(m.id) === shownMembers[0])
                      ?.name ?? "")
                : t("n-items-selected", { n: shownMembers.length });

    /** 名称不常驻输入框：点这一行弹出与分类改名同款的底部抽屉 */
    const editName = async () => {
        const next = await showBudgetName({
            value: value.title,
            title: t("budget-title"),
            placeholder: t("please-enter-budget-title"),
        }).catch(() => undefined);
        if (next !== undefined) {
            patch({ title: next });
        }
    };

    /** 标签 / 成员都不在行内铺开，点行从底部弹出选项抽屉再确认 */
    const selectTags = async () => {
        const next = await showBudgetOptions({
            title: t("linked-special-tags"),
            hint: t("linked-special-tags-hint"),
            empty: t("no-special-tags"),
            options: edit.specialTags.map((tag) => ({
                id: tag.id,
                label: `#${tag.name}`,
            })),
            selected: tagIds,
        }).catch(() => undefined);
        if (next !== undefined) {
            patch({ tagIds: next });
        }
    };

    const selectMembers = async () => {
        const next = await showBudgetOptions({
            title: t("participants"),
            hint: t("participants-hint"),
            options: edit.members.map((m) => ({
                id: String(m.id),
                label: m.name,
            })),
            selected: shownMembers,
        }).catch(() => undefined);
        if (next !== undefined) {
            patch({ joiners: normalizeJoiners(next, edit.members) });
        }
    };

    const deleteBudget = async () => {
        const ok = await showBudgetDelete({
            title: t("budget-delete-title"),
            description: t("budget-delete-confirm", {
                name: value.title.trim() || t("special-budget"),
            }),
        }).catch(() => false);
        if (ok) {
            onConfirm?.("delete");
        }
    };

    return (
        <SheetShell
            title={
                edit.isEdit ? t("edit-special-budget") : t("add-special-budget")
            }
            onCancel={edit.isEdit ? () => void deleteBudget() : onCancel}
            cancelLabel={edit.isEdit ? t("delete") : undefined}
            cancelDanger={edit.isEdit}
            onSave={() =>
                onConfirm?.({
                    ...value,
                    categoriesBudget: (value.categoriesBudget ?? []).filter(
                        (v) => v.id && v.budget > 0,
                    ),
                })
            }
            saveDisabled={!value.title.trim()}
        >
            {/* 全部设置项在同一张白卡里：金额与详细分配紧随名称排在第 2、3 位 */}
            <div className="divide-y divide-rule/60 overflow-hidden rounded-2xl bg-panel shadow-[0_1px_6px_rgba(92,62,30,0.05)]">
                <SheetRow
                    label={t("budget-title")}
                    onClick={() => void editName()}
                >
                    <span
                        className={cn(
                            "min-w-0 truncate text-[14px]",
                            value.title ? "text-ink" : "text-ink-secondary/70",
                        )}
                    >
                        {value.title || t("please-enter-budget-title")}
                    </span>
                    <i className="icon-[lucide--pencil] size-3.5 flex-shrink-0 text-ink-secondary/60" />
                </SheetRow>
                <AmountRows
                    total={value.totalBudget}
                    onTotalChange={(v) => patch({ totalBudget: v })}
                    categories={edit.categories}
                    categoriesBudget={value.categoriesBudget ?? []}
                    onCategoriesChange={(v) => patch({ categoriesBudget: v })}
                />
                <SheetRow
                    label={t("linked-special-tags")}
                    onClick={() => void selectTags()}
                >
                    <RowLinkValue label={tagSummary} />
                </SheetRow>
                <SheetRow
                    label={t("repeat-monthly")}
                    onClick={() =>
                        patch({ repeatMonthly: !value.repeatMonthly })
                    }
                >
                    <span
                        className={cn(
                            "relative h-5 w-9 flex-shrink-0 rounded-full transition-colors",
                            value.repeatMonthly ? "bg-brand" : "bg-rule",
                        )}
                    >
                        <i
                            className={cn(
                                "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
                                value.repeatMonthly
                                    ? "left-[18px]"
                                    : "left-0.5",
                            )}
                        />
                    </span>
                </SheetRow>
                <SheetRow
                    label={t("participants")}
                    onClick={() => void selectMembers()}
                >
                    <RowLinkValue label={memberSummary} />
                </SheetRow>
            </div>
        </SheetShell>
    );
}

const SheetForm = ({
    edit,
    onCancel,
    onConfirm,
}: {
    edit?: BudgetSheetValue;
    onCancel?: () => void;
    onConfirm?: (v: BudgetSheetResult) => void;
}) => {
    if (!edit) {
        return null;
    }
    const props = { onCancel, onConfirm };
    switch (edit.type) {
        case "monthly":
            return <MonthlyForm edit={edit} {...props} />;
        case "startDay":
            return <StartDayForm edit={edit} {...props} />;
        case "members":
            return <MembersForm edit={edit} {...props} />;
        case "special":
            return <SpecialForm edit={edit} {...props} />;
        default:
            return null;
    }
};

export const [BudgetSheetProvider, showBudgetSheet] = createConfirmProvider<
    BudgetSheetValue,
    BudgetSheetResult
>(SheetForm, {
    dialogTitle: "Budget Sheet",
    dialogModalClose: true,
    from: "bottom",
    contentClassName:
        "w-full max-w-full rounded-t-[28px] border-0 bg-ground p-0 shadow-none sm:w-[90vw] sm:max-w-[500px] sm:rounded-md",
});
