import dayjs, { type Dayjs } from "dayjs";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { useBudget } from "@/hooks/use-budget";
import useCategory from "@/hooks/use-category";
import { useMembers } from "@/hooks/use-member";
import { useTag } from "@/hooks/use-tag";
import PopupLayout from "@/layouts/popup-layout";
import { useIntl } from "@/locale";
import { useLedgerStore } from "@/store/ledger";
import { cn } from "@/utils";
import { PRESSABLE_ROW } from "../button-styles";
import {
    clampStartDay,
    periodContaining,
    periodFrom,
    periodLabel,
} from "./period";
import {
    BudgetAllocationProvider,
    BudgetDeleteProvider,
    type BudgetDraft,
    BudgetNameProvider,
    BudgetOptionProvider,
    BudgetSheetProvider,
    type BudgetSheetValue,
    type MonthlyBudgetValue,
    showBudgetSheet,
} from "./sheet";
import type { Budget } from "./type";
import { budgetEncountered, budgetTotal } from "./util";

const fmt = (n: number) => n.toLocaleString("zh-CN");
const pct = (n: number) => `${Math.round(n * 100)}%`;

/** 取消抽屉会 reject，这里统一吞掉，返回 undefined */
const openSheet = (value: BudgetSheetValue) =>
    showBudgetSheet(value).catch(() => undefined);

const isBudgetDraft = (v: unknown): v is BudgetDraft =>
    v !== null &&
    v !== undefined &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    "kind" in v;
const isMonthly = (v: unknown): v is MonthlyBudgetValue =>
    v !== null &&
    v !== undefined &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    "totalBudget" in v;

/**
 * 三级进度条配色：
 * - total    全部预算（brand 橙）
 * - budget   卡内各条普通/特殊预算（紫，明确区别于全部预算）
 * - category 分类明细（蓝）
 */
type BarVariant = "total" | "budget" | "category";
const BAR_FILL: Record<BarVariant, string> = {
    total: "bg-brand",
    budget: "bg-[#b18ad4]",
    category: "bg-[#6f9fd8]",
};

const Bar = ({
    ratio,
    over,
    thin,
    variant = "total",
}: {
    ratio: number;
    over: boolean;
    thin?: boolean;
    variant?: BarVariant;
}) => (
    <div
        className={cn(
            "w-full overflow-hidden rounded-full bg-ground-muted",
            thin ? "h-1.5" : "h-2",
        )}
    >
        <div
            className={cn(
                "h-full rounded-full transition-all",
                over ? "bg-red-600" : BAR_FILL[variant],
            )}
            style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }}
        />
    </div>
);

/** 分组连卡：组内行只有细分隔线、无间隙（APK 类别页 + 预算范围页同款） */
const SettingCard = ({ children }: { children: ReactNode }) => (
    <div className="divide-y divide-rule/70 overflow-hidden rounded-2xl bg-panel shadow-[0_1px_6px_rgba(92,62,30,0.05)]">
        {children}
    </div>
);

/** 历史周期只叠一层蒙层表达只读，不再逐行变淡、也不再配文字提示 */
const ReadOnlyMask = ({
    children,
    readOnly,
}: {
    children: ReactNode;
    readOnly: boolean;
}) => (
    <div className="relative">
        {children}
        {readOnly && (
            <div
                aria-hidden
                className="absolute inset-0 rounded-2xl bg-ground/55"
            />
        )}
    </div>
);

const SettingRow = ({
    title,
    subtitle,
    value,
    badge,
    onClick,
    disabled,
}: {
    title: string;
    subtitle?: string;
    value?: string;
    badge?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
}) => (
    <div className="flex items-center gap-2 px-4 py-1">
        <button
            type="button"
            disabled={disabled}
            onClick={disabled ? undefined : onClick}
            className="flex min-h-[58px] min-w-0 flex-1 items-center gap-3 py-2 text-left"
        >
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
            {value && (
                <span className="flex-shrink-0 text-[14px] text-ink">
                    {value}
                </span>
            )}
            {!disabled && (
                <i className="icon-[lucide--chevron-right] size-4 flex-shrink-0 text-ink-secondary/60" />
            )}
        </button>
    </div>
);

const GroupTitle = ({
    title,
    action,
    first,
}: {
    title: string;
    action?: ReactNode;
    first?: boolean;
}) => (
    <div
        className={cn(
            "mb-1.5 flex items-center justify-between gap-2 px-1 text-[12px] text-ink-secondary",
            first ? "mt-4" : "mt-3",
        )}
    >
        <span>{title}</span>
        {action}
    </div>
);

/**
 * 一条预算 / 一个分类都长成「名称 + 额度数值（+ 标签）在左，已支出 + 比例在右，下方进度条」。
 * 名称统一是灰色小字，比紧跟其右的金额略小，让金额成为视觉主体；
 * 特殊预算的标签直接跟在金额后面，不单独占一行。
 * unset 表示这一项没设额度：金额位置写「未设置」，不算 0%、不标红、进度条留空槽。
 */
const StatLine = ({
    label,
    used,
    total,
    variant = "budget",
    indent,
    tags,
    collapsed,
    onToggle,
    unset,
}: {
    label: string;
    used: number;
    total: number;
    variant?: "budget" | "category";
    indent?: boolean;
    tags?: string;
    collapsed?: boolean;
    onToggle?: () => void;
    unset?: boolean;
}) => {
    const t = useIntl();
    /** 额度为 0 表示这个周期没设预算：不算 0%、不标红，明确写「未设置预算」 */
    const noBudget = total <= 0;
    const ratio = noBudget ? 0 : used / total;
    const row = (
        <>
            <div className="flex items-baseline justify-between gap-2">
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                    {onToggle && (
                        <i
                            className={cn(
                                "icon-[lucide--chevron-down] size-3 flex-shrink-0 text-ink-secondary transition-transform",
                                collapsed && "-rotate-90",
                            )}
                        />
                    )}
                    <span className="min-w-0 truncate text-[12px] text-ink-secondary">
                        {label}
                    </span>
                    {unset ? (
                        <span className="flex-shrink-0 text-[12px] text-ink-tab">
                            {t("not-set")}
                        </span>
                    ) : (
                        <span
                            className={cn(
                                "flex-shrink-0 text-ink",
                                indent ? "text-[13px]" : "text-[15px]",
                            )}
                        >
                            ¥{fmt(total)}
                        </span>
                    )}
                    {tags && (
                        <span className="flex-shrink-0 text-[11px] text-[#9b7cc4]">
                            {tags}
                        </span>
                    )}
                </span>
                <span className="flex-shrink-0 whitespace-nowrap text-[11px] text-ink-secondary">
                    {t("expensed")} ¥{fmt(used)}
                    {!unset && (
                        <> · {noBudget ? t("budget-not-set") : pct(ratio)}</>
                    )}
                </span>
            </div>
            <div className="mt-1.5">
                <Bar
                    ratio={ratio}
                    over={!unset && !noBudget && used > total}
                    thin
                    variant={variant}
                />
            </div>
        </>
    );
    if (onToggle) {
        return (
            <button
                type="button"
                onClick={onToggle}
                className="w-full text-left"
            >
                {row}
            </button>
        );
    }
    return row;
};

type ViewState = {
    key: string;
    allOpen: boolean;
    collapsed: string[];
};

export default function BudgetListForm({
    onCancel,
}: {
    edit?: unknown;
    onCancel?: () => void;
    onConfirm?: (v: unknown) => void;
}) {
    const t = useIntl();
    const {
        budgets,
        startDay,
        periods,
        add,
        update,
        setStartDay,
        ensureCurrentBudgets,
    } = useBudget();
    const { members } = useMembers();
    const { tags } = useTag();
    const { categories } = useCategory();
    const { bills } = useLedgerStore();

    const day = clampStartDay(startDay);
    const currentStart = useMemo(
        () => periodContaining(dayjs(), day)[0].valueOf(),
        [day],
    );
    const [selectedPeriod, setSelectedPeriod] = useState<number>(currentStart);
    const activePeriod = periods.includes(selectedPeriod)
        ? selectedPeriod
        : (periods[0] ?? currentStart);
    const [monthOpen, setMonthOpen] = useState(false);

    const periodBudgets = budgets.filter((b) => b.periodStart === activePeriod);
    const normal = periodBudgets.find((b) => b.kind === "normal");
    const specials = periodBudgets.filter((b) => b.kind === "special");
    const periodEnd =
        normal?.periodEnd ??
        specials[0]?.periodEnd ??
        periodFrom(dayjs(activePeriod), day)[1].valueOf();
    const range: [Dayjs, Dayjs] = [
        dayjs(activePeriod).startOf("day"),
        dayjs(periodEnd).endOf("day"),
    ];

    /** 分类预算只能设置一级分类；预算只统计支出账单，收入类不列入 */
    const topCategories = useMemo(
        () => categories.filter((c) => !c.parent && c.type === "expense"),
        [categories],
    );
    const topCategoryIds = useMemo(
        () => topCategories.map((c) => c.id),
        [topCategories],
    );

    const stat = (b: Budget) => {
        const total = budgetTotal(b);
        const encountered = budgetEncountered(
            b,
            bills,
            range,
            categories,
            topCategoryIds,
        );
        return {
            total,
            used: encountered.totalUsed,
            encountered,
            ratio: total > 0 ? encountered.totalUsed / total : 0,
        };
    };

    const all = [normal, ...specials].filter((v): v is Budget => Boolean(v));
    const totalSum = all.reduce((sum, b) => sum + budgetTotal(b), 0);
    const usedSum = all.reduce((sum, b) => sum + stat(b).used, 0);
    const totalRatio = totalSum > 0 ? usedSum / totalSum : 0;

    const index = periods.indexOf(activePeriod);
    const prevPeriod = index >= 0 ? periods[index + 1] : undefined;
    const nextPeriod = index > 0 ? periods[index - 1] : undefined;

    /** 当前真实周期按「覆盖今天的普通预算记录」判断，避免改起始日后现算锚点漂移 */
    const nowMs = dayjs().valueOf();
    const runningRecord = budgets.find(
        (b) =>
            b.kind === "normal" &&
            nowMs >= b.periodStart &&
            nowMs <= b.periodEnd,
    );
    const isCurrent =
        activePeriod === (runningRecord?.periodStart ?? currentStart);

    /**
     * 展开状态按周期隔离：周期或预算构成变化时回到默认态，用户手动切换后保持。
     * 默认：历史周期全展开；当前周期有「多种预算」时展开多预算、折叠分类。
     */
    const [view, setView] = useState<ViewState>({
        key: "",
        allOpen: false,
        collapsed: [],
    });
    const viewKey = `${activePeriod}|${isCurrent ? 1 : 0}|${all
        .map((b) => b.id)
        .join(",")}`;
    const ui: ViewState =
        view.key === viewKey
            ? view
            : {
                  key: viewKey,
                  allOpen: !isCurrent || specials.length > 0,
                  collapsed:
                      isCurrent && specials.length > 0
                          ? all.map((b) => b.id)
                          : [],
              };
    const patchView = (
        patch: Partial<Pick<ViewState, "allOpen" | "collapsed">>,
    ) => setView({ ...ui, ...patch });
    const toggleCard = (id: string) =>
        patchView({
            collapsed: ui.collapsed.includes(id)
                ? ui.collapsed.filter((v) => v !== id)
                : [...ui.collapsed, id],
        });

    const specialTags = tags.filter((tag) => tag.kind === "special");
    const activeMembers = members.filter((m) => m.active);
    /** 普通预算记录由启动补齐生成；极端情况下缺失就补一条再改 */
    const patchNormal = async (patch: Partial<BudgetDraft>) => {
        const found = (
            useLedgerStore.getState().infos?.meta.budgets ?? []
        ).find((b) => b.kind === "normal" && b.periodStart === activePeriod);
        if (found) {
            const { id, ...rest } = found;
            await update(id, { ...rest, ...patch });
            return;
        }
        await add({
            kind: "normal",
            title: t("normal-budget"),
            periodStart: activePeriod,
            periodEnd,
            joiners: [],
            totalBudget: 0,
            ...patch,
        });
    };

    /** 月度预算抽屉同时设置总额与各一级分类额度，一次保存写回同一条记录 */
    const openMonthly = async () => {
        const res = await openSheet({
            type: "monthly",
            value: normal?.totalBudget ?? 0,
            categoriesBudget: normal?.categoriesBudget ?? [],
            categories: topCategories,
        });
        if (isMonthly(res)) {
            await patchNormal({
                totalBudget: res.totalBudget,
                categoriesBudget: res.categoriesBudget,
            });
        }
    };

    const openStartDay = async () => {
        const res = await openSheet({ type: "startDay", value: day });
        if (typeof res === "number" && res !== day) {
            await setStartDay(res);
            await ensureCurrentBudgets();
        }
    };

    const openMembers = async () => {
        const res = await openSheet({
            type: "members",
            value: normal?.joiners ?? [],
            members: activeMembers,
        });
        if (Array.isArray(res)) {
            await patchNormal({ joiners: res as (string | number)[] });
        }
    };

    const openSpecial = async (budget?: Budget) => {
        const { id: _id, ...rest } = budget ?? ({} as Budget);
        const draft: BudgetDraft = budget
            ? rest
            : {
                  kind: "special",
                  title: "",
                  periodStart: activePeriod,
                  periodEnd,
                  joiners: [],
                  totalBudget: 0,
                  tagIds: [],
                  repeatMonthly: false,
              };
        const res = await openSheet({
            type: "special",
            value: { ...draft, periodStart: activePeriod, periodEnd },
            specialTags,
            members: activeMembers,
            categories: topCategories,
            isEdit: Boolean(budget),
        });
        if (res === undefined) {
            return;
        }
        if (budget) {
            if (res === "delete") {
                await update(budget.id, undefined);
                return;
            }
            if (isBudgetDraft(res)) {
                await update(budget.id, res);
            }
            return;
        }
        if (isBudgetDraft(res)) {
            await add(res);
        }
    };

    const tagNames = (b: Budget) =>
        (b.tagIds ?? [])
            .map((id) => specialTags.find((tag) => tag.id === id)?.name)
            .filter(Boolean)
            .map((name) => `#${name}`)
            .join(" ");

    /**
     * 分类明细固定列出所有一级支出分类：设了额度的显示额度与进度，
     * 没设置的金额位置写「未设置」，让「哪些分类还没设」一眼可见。
     * 分类额度只是普通预算内的分项上限，不累加进总额（见 util.budgetTotal）。
     */
    const categoryLines = (b: Budget) => {
        const configured = new Map(
            (b.categoriesBudget ?? []).map((c) => [c.id, c.budget]),
        );
        const used = stat(b).encountered.categoriesUsed;
        return topCategories.map((c) => {
            const budget = configured.get(c.id) ?? 0;
            return (
                <div key={c.id} className="px-3 py-2">
                    <StatLine
                        label={c.name}
                        used={used?.find((v) => v.id === c.id)?.used ?? 0}
                        total={budget}
                        variant="category"
                        indent
                        unset={budget <= 0}
                    />
                </div>
            );
        });
    };

    /** 通用月份滚轮选择器：选中的月首映射到已有预算周期，没有则取时间最近的一条 */
    const onPickMonth = (v: number) => {
        const key = dayjs(v).format("YYYY-MM");
        const exact = periods.find((p) => dayjs(p).format("YYYY-MM") === key);
        if (exact !== undefined) {
            setSelectedPeriod(exact);
            return;
        }
        const nearest = periods.reduce<number | undefined>((best, p) => {
            if (best === undefined) {
                return p;
            }
            return Math.abs(p - v) < Math.abs(best - v) ? p : best;
        }, undefined);
        if (nearest !== undefined) {
            setSelectedPeriod(nearest);
        }
    };

    /** 预算范围里的起始日读该周期自己的首日，历史月不再显示全局配置 */
    const periodStartDay = dayjs(activePeriod).date();
    /** 有数据或有添加入口时才渲染「特殊预算」分组；历史周期没有特殊预算就整体缺省 */
    const showSpecialGroup = isCurrent || specials.length > 0;
    const showEmptyAddBox = isCurrent && specials.length === 0;
    const showAddAction = isCurrent && specials.length > 0;

    return (
        <PopupLayout
            onBack={onCancel}
            title={t("budget-manager")}
            backStyle="circle"
            className="dp-drawer-surface h-full bg-ground"
        >
            <div className="relative flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto bg-ground px-3 pt-1 pb-6">
                {/* 通用月选择器：受控唤起，触发器不占位 */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute h-0 w-0 overflow-hidden"
                >
                    <DatePicker
                        type="month"
                        title={t("select-budget-period")}
                        value={activePeriod}
                        displayFormatter={() => ""}
                        open={monthOpen}
                        onOpenChange={setMonthOpen}
                        onChange={onPickMonth}
                    />
                </div>

                {/* 「预算周期」与下方「预算范围」同为卡片外的分组小标题 */}
                <GroupTitle title={t("budget-period")} first />

                {/* 只有一张周期卡：周期选择 + 全部预算汇总 + 各预算/分类明细全部合并进来 */}
                <div className="rounded-2xl bg-panel px-4 py-3 shadow-[0_1px_6px_rgba(92,62,30,0.05)]">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1">
                            <button
                                type="button"
                                disabled={prevPeriod === undefined}
                                onClick={() =>
                                    prevPeriod !== undefined &&
                                    setSelectedPeriod(prevPeriod)
                                }
                                className={cn(
                                    "w-6 flex-shrink-0 text-center text-[20px] leading-tight transition-colors enabled:hover:text-brand enabled:active:scale-90 disabled:cursor-not-allowed",
                                    prevPeriod !== undefined
                                        ? "text-ink"
                                        : "text-ink-tab/40",
                                )}
                            >
                                ‹
                            </button>
                            <button
                                type="button"
                                onClick={() => setMonthOpen(true)}
                                className="whitespace-nowrap text-[15px] text-ink"
                            >
                                {dayjs(activePeriod).format("YYYY 年 M 月")}
                            </button>
                            <button
                                type="button"
                                disabled={nextPeriod === undefined}
                                onClick={() =>
                                    nextPeriod !== undefined &&
                                    setSelectedPeriod(nextPeriod)
                                }
                                className={cn(
                                    "w-6 flex-shrink-0 text-center text-[20px] leading-tight transition-colors enabled:hover:text-brand enabled:active:scale-90 disabled:cursor-not-allowed",
                                    nextPeriod !== undefined
                                        ? "text-ink"
                                        : "text-ink-tab/40",
                                )}
                            >
                                ›
                            </button>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1 pt-1 text-[11px] text-ink-secondary">
                            <button
                                type="button"
                                onClick={() => setMonthOpen(true)}
                            >
                                {periodLabel(range[0], range[1])}
                            </button>
                            {normal?.isTransition && (
                                <span className="rounded bg-brand/10 px-1 text-brand">
                                    {t("transition-period")}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 全部预算：标题行 + 构成标签，数值在下一行，已支出/比例同行最右 */}
                    <button
                        type="button"
                        onClick={() => patchView({ allOpen: !ui.allOpen })}
                        className="mt-3 w-full text-left"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[12px] text-ink-secondary">
                                {t("all-budgets")}
                            </span>
                            {specials.length > 0 && (
                                <span className="text-[11px] text-ink-secondary">
                                    {t("normal-plus-n-special", {
                                        n: specials.length,
                                    })}
                                </span>
                            )}
                        </div>
                        <div className="mt-0.5 flex items-baseline justify-between gap-2">
                            <span className="text-[20px] text-ink">
                                ¥{fmt(totalSum)}
                            </span>
                            <span className="flex flex-shrink-0 items-center gap-1 whitespace-nowrap text-[11px] text-ink-secondary">
                                {t("expensed")} ¥{fmt(usedSum)} ·{" "}
                                {totalSum > 0
                                    ? pct(totalRatio)
                                    : t("budget-not-set")}
                                <i
                                    className={cn(
                                        "icon-[lucide--chevron-down] size-3.5 transition-transform",
                                        ui.allOpen && "rotate-180",
                                    )}
                                />
                            </span>
                        </div>
                        <div className="mt-2">
                            <Bar
                                ratio={totalRatio}
                                over={totalSum > 0 && usedSum > totalSum}
                            />
                        </div>
                    </button>

                    {/*
                     * 展开区有两种样式：
                     * ① 只有普通预算 —— 点「全部预算」直接展开分类预算明细，
                     *    不出现「普通预算」这一行、也不用紫色嵌套容器；
                     * ② 有其它特殊预算 —— 展开「多种预算」（普通 + 各特殊），
                     *    浅紫底嵌套容器表达它们是全部预算的下级，点某条才展开它的分类。
                     */}
                    {ui.allOpen && specials.length === 0 && (
                        <div className="mt-3">
                            <div className="divide-y divide-rule/60 overflow-hidden rounded-xl bg-ground-muted/50">
                                {normal ? (
                                    categoryLines(normal)
                                ) : (
                                    <div className="px-3 py-3 text-[12px] text-ink-secondary">
                                        {t("no-budget")}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {ui.allOpen && specials.length > 0 && (
                        <div className="mt-3 pl-3">
                            <div className="divide-y divide-[#b18ad4]/10 overflow-hidden rounded-xl bg-[#b18ad4]/[0.07] ring-1 ring-inset ring-[#b18ad4]/10">
                                {all.map((b) => {
                                    const id = b.id;
                                    const isCollapsed =
                                        ui.collapsed.includes(id);
                                    const s = stat(b);
                                    return (
                                        <div key={id} className="px-3 py-2.5">
                                            <StatLine
                                                label={
                                                    b.kind === "normal"
                                                        ? t("normal-budget")
                                                        : b.title
                                                }
                                                used={s.used}
                                                total={s.total}
                                                tags={
                                                    b.kind === "special"
                                                        ? tagNames(b)
                                                        : undefined
                                                }
                                                collapsed={isCollapsed}
                                                onToggle={() => toggleCard(id)}
                                            />
                                            {!isCollapsed && (
                                                <div className="mt-2 divide-y divide-rule/60 overflow-hidden rounded-lg bg-panel/80">
                                                    {categoryLines(b)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* 设置项在大卡下方，按分组连卡；历史周期只读只用一层蒙层表达 */}
                <GroupTitle title={t("budget-range")} />
                <ReadOnlyMask readOnly={!isCurrent}>
                    <SettingCard>
                        <SettingRow
                            title={t("monthly-budget")}
                            subtitle={t("monthly-budget-hint")}
                            value={`¥${fmt(normal?.totalBudget ?? 0)}`}
                            onClick={() => void openMonthly()}
                            disabled={!isCurrent}
                        />
                        <SettingRow
                            title={t("budget-start-day")}
                            subtitle={t("budget-start-day-hint")}
                            value={t("day-n-of-month", { n: periodStartDay })}
                            onClick={() => void openStartDay()}
                            disabled={!isCurrent}
                        />
                        <SettingRow
                            title={t("included-members")}
                            subtitle={t("participants-hint")}
                            value={
                                (normal?.joiners.length ?? 0) === 0
                                    ? t("all-members")
                                    : t("n-members", {
                                          n: normal?.joiners.length ?? 0,
                                      })
                            }
                            onClick={() => void openMembers()}
                            disabled={!isCurrent}
                        />
                    </SettingCard>
                </ReadOnlyMask>

                {showSpecialGroup && (
                    <>
                        <GroupTitle
                            title={t("special-budget")}
                            action={
                                showAddAction ? (
                                    <button
                                        type="button"
                                        aria-label={t("add")}
                                        onClick={() => void openSpecial()}
                                        className={cn(
                                            "flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] text-brand",
                                            PRESSABLE_ROW,
                                            "enabled:hover:bg-brand/20",
                                        )}
                                    >
                                        <i className="icon-[lucide--circle-plus] size-3.5" />
                                        {t("add")}
                                    </button>
                                ) : undefined
                            }
                        />
                        {showEmptyAddBox && (
                            <button
                                type="button"
                                onClick={() => void openSpecial()}
                                className={cn(
                                    "flex h-[54px] w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-rule bg-panel/60 text-[13px] text-ink-secondary",
                                    PRESSABLE_ROW,
                                    "enabled:hover:border-brand/60 enabled:hover:text-brand",
                                )}
                            >
                                <i className="icon-[lucide--circle-plus] size-4 text-brand" />
                                {t("add-special-budget")}
                            </button>
                        )}
                        {specials.length > 0 && (
                            <ReadOnlyMask readOnly={!isCurrent}>
                                <SettingCard>
                                    {specials.map((b) => (
                                        <SettingRow
                                            key={b.id}
                                            badge={
                                                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand/10 text-[14px] text-brand">
                                                    {b.title.slice(0, 1)}
                                                </span>
                                            }
                                            title={b.title}
                                            subtitle={[
                                                tagNames(b),
                                                b.repeatMonthly
                                                    ? t("repeat-monthly")
                                                    : t("only-this-period"),
                                                b.joiners.length === 0
                                                    ? t("all-members")
                                                    : t("n-members", {
                                                          n: b.joiners.length,
                                                      }),
                                            ]
                                                .filter(Boolean)
                                                .join(" · ")}
                                            value={`¥${fmt(b.totalBudget)}`}
                                            onClick={() => void openSpecial(b)}
                                            disabled={!isCurrent}
                                        />
                                    ))}
                                </SettingCard>
                            </ReadOnlyMask>
                        )}
                    </>
                )}
            </div>
            <BudgetSheetProvider />
            <BudgetNameProvider />
            <BudgetOptionProvider />
            <BudgetDeleteProvider />
            <BudgetAllocationProvider />
        </PopupLayout>
    );
}
