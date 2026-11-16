import dayjs, { type Dayjs } from "dayjs";
import { type ReactNode, useMemo, useState } from "react";
import { useBudget } from "@/hooks/use-budget";
import type { BillCategory, BillTag, Member } from "@/ledger/type";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { BTN_PRIMARY, BTN_SECONDARY, SHEET_FOOTER } from "../button-styles";
import createConfirmProvider from "../confirm";
import { createDeleteConfirm } from "../delete-confirm";
import { createNameDialog } from "../name-dialog";
import { createOptionSheet } from "../option-sheet";
import {
    SheetCard,
    SheetHint,
    SheetHintDivider,
    SheetLinkValue,
    SheetRow,
    SheetShell,
} from "../sheet-kit";
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
    | BudgetDraft
    | "delete";

/** 名称修改、选项选择、删除确认各自独立实例，避免同一 Provider 被多处挂载渲染两份弹层 */
export const [BudgetNameProvider, showBudgetName] = createNameDialog();
export const [BudgetOptionProvider, showBudgetOptions] = createOptionSheet();
export const [BudgetDeleteProvider, showBudgetDelete] = createDeleteConfirm();
export const [BudgetAllocationProvider, showBudgetAllocation] =
    createAllocationSheet();

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
                <SheetLinkValue
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
            onConfirm={() =>
                onConfirm?.({
                    totalBudget: total,
                    categoriesBudget: categories.filter(
                        (v) => v.id && v.budget > 0,
                    ),
                })
            }
        >
            <SheetCard>
                <AmountRows
                    total={total}
                    onTotalChange={setTotal}
                    categories={edit.categories}
                    categoriesBudget={categories}
                    onCategoriesChange={setCategories}
                />
            </SheetCard>
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
    const { budgets } = useBudget();
    const [value, setValue] = useState(edit.value);
    const changed = value !== edit.value;

    /**
     * 用与 setStartDay 相同的锚点算法预演，保证提示与实际落库结果一致。
     * 「当前周期」优先取账本里覆盖今天的普通预算记录（冻结边界），没有记录
     * 才回落到按当前起始日现算；过渡期 = 当前周期起始 → 生效日前一天，
     * 归属月按新起始日反推 periodContaining(now, value) 的起始年月。
     */
    const preview = useMemo(() => {
        const now = dayjs();
        const nowTs = now.valueOf();
        const current = budgets.find(
            (b) =>
                b.kind === "normal" &&
                b.periodStart <= nowTs &&
                b.periodEnd >= nowTs,
        );
        const [fallbackStart, fallbackEnd] = periodContaining(now, edit.value);
        const curStart = current ? dayjs(current.periodStart) : fallbackStart;
        const curEnd = current ? dayjs(current.periodEnd) : fallbackEnd;

        const effective = firstAnchorAfter(now, value);
        const [newStart, newEnd] = periodFrom(effective, value);
        const gapEnd = effective.subtract(1, "day").endOf("day");
        const [prevStart] = periodContaining(now, value);
        const dateText = (d: Dayjs) =>
            t("start-day-date-cn", { m: d.month() + 1, d: d.date() });

        return {
            currentStart: dateText(curStart),
            currentEnd: dateText(curEnd),
            isTransitionNow: Boolean(current?.isTransition),
            effectiveDate: dateText(effective),
            newPeriod: periodLabel(newStart, newEnd),
            gapStart: dateText(curStart),
            gapEnd: dateText(gapEnd),
            hasGap: !gapEnd.isBefore(curStart, "day"),
            prevMonth: t("start-day-month-cn", { m: prevStart.month() + 1 }),
        };
    }, [budgets, edit.value, value, t]);

    return (
        <SheetShell
            title={t("budget-start-day")}
            onCancel={onCancel}
            onConfirm={() => onConfirm?.(value)}
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
            {/* 上下两段：生效周期 / 过渡期，中间一条极淡分隔线。
                选中日期在日历上高亮，生效日文字也用同色品牌橘呼应。
                这一块就是全局「抽屉橙色提醒」的基准样式。 */}
            <SheetHint className="mt-4 mb-3">
                <p className="text-[15px] font-semibold text-ink">
                    {changed
                        ? t("start-day-effective-title")
                        : t("start-day-current-title")}
                    {changed ? (
                        <span className="tabular-nums text-brand">
                            {preview.effectiveDate}
                        </span>
                    ) : (
                        <span className="tabular-nums">
                            <span className="text-brand">
                                {preview.currentStart}
                            </span>
                            {" - "}
                            {preview.currentEnd}
                        </span>
                    )}
                </p>
                <p className="mt-1 text-[11px] text-ink-secondary">
                    {changed
                        ? t("start-day-new-period-note", {
                              period: preview.newPeriod,
                          })
                        : t("start-day-current-note", { n: edit.value })}
                </p>

                <SheetHintDivider />

                <p className="text-[14px] font-semibold tabular-nums text-ink">
                    {changed && preview.hasGap ? (
                        <>
                            {t("start-day-transition-title")}
                            {preview.gapStart} - {preview.gapEnd}
                        </>
                    ) : preview.isTransitionNow ? (
                        t("start-day-transition-active")
                    ) : (
                        t("start-day-no-transition")
                    )}
                </p>
                <p className="mt-1 text-[11px] text-ink-secondary">
                    {changed && preview.hasGap
                        ? t("start-day-transition-note", {
                              month: preview.prevMonth,
                          })
                        : preview.isTransitionNow
                          ? t("start-day-transition-active-note")
                          : t("start-day-no-transition-note")}
                </p>
            </SheetHint>
        </SheetShell>
    );
}

/**
 * 内部约定：joiners 为空数组 = 全部成员（含以后新增的）。
 * UI 上不暴露这个逻辑，打开时把全部成员高亮；保存时若仍是全选，写回空数组。
 */
const allMemberIds = (members: Member[]) => members.map((m) => String(m.id));
export const normalizeJoiners = (selected: string[], members: Member[]) => {
    const all = allMemberIds(members);
    const allSelected =
        all.length > 0 && all.every((id) => selected.includes(id));
    return allSelected ? [] : selected;
};

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
            onConfirm={() =>
                onConfirm?.({
                    ...value,
                    categoriesBudget: (value.categoriesBudget ?? []).filter(
                        (v) => v.id && v.budget > 0,
                    ),
                })
            }
            confirmDisabled={!value.title.trim()}
        >
            {/* 全部设置项在同一张白卡里：金额与详细分配紧随名称排在第 2、3 位 */}
            <SheetCard>
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
                    <SheetLinkValue label={tagSummary} />
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
                    <SheetLinkValue label={memberSummary} />
                </SheetRow>
            </SheetCard>
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
