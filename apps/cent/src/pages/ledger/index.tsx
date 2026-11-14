import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import {
    clampStartDay,
    periodContaining,
    periodLabel,
    periodMonthKey,
} from "@/components/budget/period";
import { budgetTotal } from "@/components/budget/util";
import { isCancelError } from "@/components/confirm/state";
import { MascotPeek } from "@/components/empty-state";
import Ledger from "@/components/ledger";
import {
    type LedgerQuickFilter,
    resolveQuickTimeRange,
    showLedgerFilter,
} from "@/components/ledger/filter-sheet";
import TicketCard from "@/components/ticket-card";
import { useBudget } from "@/hooks/use-budget";
import { useCurrency } from "@/hooks/use-currency";
import { useFullBills } from "@/hooks/use-full-bills";
import { amountToNumber } from "@/ledger/bill";
import { useIntl, useLocale } from "@/locale";
import { showStat } from "@/pages/stat";
import { useLedgerStore } from "@/store/ledger";
import { useUiStore } from "@/store/ui";
import { useUserStore } from "@/store/user";

function RatioBar({
    label,
    value,
    text,
}: {
    label: string;
    value: number;
    /** 家小满缺省口径：预算未设置时显示「未设置」且轨道保持空 */
    text?: string;
}) {
    const percent = Math.max(0, Math.round(value * 1000) / 10);
    const unset = text !== undefined;
    return (
        <div className="min-w-0">
            {/* 家小满：标签与数值同行靠左 */}
            <div className="flex items-baseline gap-1.5">
                <span className="truncate text-xs text-ink-secondary">
                    {label}
                </span>
                <span
                    className={`tabular-nums ${unset ? "text-[11px] font-normal leading-none text-ink-secondary" : "text-[13px] font-medium"}`}
                >
                    {text ?? `${percent}%`}
                </span>
            </div>
            {/* 轨道中性灰（≈#f4f4f5）7px 高，与家小满实测一致 */}
            <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-black/5">
                {!unset && (
                    <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${Math.min(100, percent)}%` }}
                    />
                )}
            </div>
        </div>
    );
}

export default function Page() {
    const t = useIntl();
    const { locale } = useLocale();
    useFullBills();

    const bills = useLedgerStore((state) => state.bills);
    const loading = useLedgerStore((state) => state.loading);
    const userId = useUserStore((state) => state.id);
    const { baseCurrency } = useCurrency();
    const { budgets, startDay } = useBudget();
    const now = useMemo(() => dayjs(), []);
    const day = clampStartDay(startDay);

    // 快捷筛选（家小满筛选面板）：确认后在本页就地过滤列表与统计卡
    const [quickFilter, setQuickFilter] = useState<LedgerQuickFilter>();

    const ledgerRef = useRef<{
        scrollToIndex: (index: number) => void;
    }>(null);

    // 无筛选时统计「当前日所在记账周期」：优先读当前普通预算记录的冻结边界，
    // 与首页口径一致；没有记录才按起始日现算
    const defaultRange = useMemo(() => {
        const ts = now.valueOf();
        const current = budgets.find(
            (b) =>
                b.kind === "normal" && ts >= b.periodStart && ts <= b.periodEnd,
        );
        if (current) {
            const start = dayjs(current.periodStart).startOf("day");
            return {
                start: start.valueOf(),
                end: dayjs(current.periodEnd).endOf("day").valueOf(),
                month: start,
                fullPeriod: true,
                isTransition: current.isTransition,
            };
        }
        const [start, end] = periodContaining(now, day);
        return {
            start: start.valueOf(),
            end: end.valueOf(),
            month: start,
            fullPeriod: true,
            isTransition: undefined,
        };
    }, [now, budgets, day]);

    const timeRange = useMemo(
        () => resolveQuickTimeRange(quickFilter, day, budgets),
        [quickFilter, day, budgets],
    );
    const activeRange = timeRange ?? defaultRange;
    const cardMonth = activeRange.month;

    const cardBills = useMemo(
        () =>
            bills.filter(
                (bill) =>
                    (activeRange.start === undefined ||
                        bill.time >= activeRange.start) &&
                    (activeRange.end === undefined ||
                        bill.time <= activeRange.end),
            ),
        [bills, activeRange],
    );

    // 卡片标题按周期的归属月展示；自定义日期沿用区间结束月
    const cardTitle = t("month-income-expense", {
        month: cardMonth.format("M"),
    });
    const periodText =
        activeRange.fullPeriod &&
        activeRange.start !== undefined &&
        activeRange.end !== undefined
            ? periodLabel(dayjs(activeRange.start), dayjs(activeRange.end))
            : undefined;

    const { income, expense } = useMemo(() => {
        let incomeTotal = 0;
        let expenseTotal = 0;
        for (const bill of cardBills) {
            const value = amountToNumber(bill.amount);
            if (bill.type === "income") {
                incomeTotal += value;
            } else {
                expenseTotal += value;
            }
        }
        return { income: incomeTotal, expense: expenseTotal };
    }, [cardBills]);

    const balance = income - expense;
    const savingRate = income > 0 ? balance / income : 0;
    const incomeRatio = income + expense > 0 ? income / (income + expense) : 0;

    // 预算按周期归属月匹配；自定义时间不是完整周期，不计算预算率
    const activeBudgetTotal = useMemo(() => {
        if (!activeRange.fullPeriod || activeRange.start === undefined) {
            return 0;
        }
        const key = periodMonthKey(activeRange.start);
        return budgets.reduce((total, budget) => {
            if (
                !(
                    budget.joiners.length === 0 ||
                    budget.joiners.includes(userId)
                ) ||
                periodMonthKey(budget.periodStart) !== key
            ) {
                return total;
            }
            return total + budgetTotal(budget);
        }, 0);
    }, [budgets, userId, activeRange]);
    const budgetRate = activeBudgetTotal > 0 ? expense / activeBudgetTotal : 0;

    const money = (value: number) =>
        new Intl.NumberFormat(locale, {
            maximumFractionDigits: 2,
        }).format(value);

    const pendingDate = useUiStore((state) => state.pendingDate);
    useEffect(() => {
        if (pendingDate === undefined || loading) return;
        const target = dayjs(pendingDate);
        const index = bills.findIndex((bill) =>
            dayjs.unix(bill.time / 1000).isSame(target, "day"),
        );
        if (index >= 0) {
            requestAnimationFrame(() => {
                ledgerRef.current?.scrollToIndex(index);
            });
        }
        useUiStore.getState().consumeDate();
    }, [pendingDate, loading, bills]);

    // 快捷筛选（家小满筛选面板）：确认后在本页就地过滤列表
    const visibleBills = useMemo(() => {
        if (!quickFilter) return bills;
        const { start, end } = timeRange ?? {};
        const { type, creators, minAmountNumber, maxAmountNumber } =
            quickFilter;
        return bills.filter((bill) => {
            if (start !== undefined && bill.time < start) return false;
            if (end !== undefined && bill.time > end) return false;
            if (type !== undefined && bill.type !== type) return false;
            if (
                creators &&
                creators.length > 0 &&
                !creators.includes(bill.creatorId)
            ) {
                return false;
            }
            const amount = amountToNumber(bill.amount);
            if (minAmountNumber !== undefined && amount < minAmountNumber) {
                return false;
            }
            if (maxAmountNumber !== undefined && amount > maxAmountNumber) {
                return false;
            }
            return true;
        });
    }, [bills, quickFilter, timeRange]);

    return (
        <div className="dp-home-surface flex h-full flex-col overflow-hidden page-show">
            <div className="flex-shrink-0">
                <div className="mx-auto w-full max-w-[720px] px-[18px] pt-2">
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            className="flex cursor-pointer items-center gap-1 rounded-full bg-panel px-3 py-1 text-[13px] text-ink transition-colors hover:bg-ground-muted"
                            onClick={() => {
                                showLedgerFilter(quickFilter)
                                    .then((v) => setQuickFilter(v))
                                    .catch((e) => {
                                        if (!isCancelError(e)) throw e;
                                    });
                            }}
                        >
                            {t("filter")}
                            <i className="icon-[lucide--chevron-down] size-4 text-ink-secondary"></i>
                        </button>
                        <button
                            type="button"
                            className="flex cursor-pointer items-center gap-1 rounded-full bg-panel px-3 py-1 text-[13px] text-ink transition-colors hover:bg-ground-muted"
                            onClick={() => {
                                showStat();
                            }}
                        >
                            <i className="icon-[lucide--chart-column] size-4 text-ink-secondary"></i>
                            {t("analysis")}
                        </button>
                    </div>

                    <TicketCard
                        className="mt-5"
                        variant="ledger"
                        mascot={
                            <MascotPeek
                                mascot="bookkeeping"
                                className="h-full w-auto"
                            />
                        }
                        top={
                            <>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                            <h1 className="dp-text-medium font-display text-xl tracking-tight">
                                                {cardTitle}
                                            </h1>
                                            {periodText && (
                                                <span className="whitespace-nowrap text-[11px] text-ink-secondary">
                                                    {periodText}
                                                </span>
                                            )}
                                            {activeRange.isTransition && (
                                                <span className="whitespace-nowrap rounded bg-brand/10 px-1.5 py-0.5 text-[10px] text-brand">
                                                    {t("transition-tag")}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                        <div className="text-xs text-ink-secondary">
                                            {t("balance")}
                                        </div>
                                        <div className="font-display text-base font-bold tabular-nums">
                                            {baseCurrency.symbol}
                                            {money(balance)}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 grid grid-cols-2">
                                    <div className="pr-4">
                                        <div className="text-xs text-ink-secondary">
                                            {t("this-month")}
                                            {t("income")}
                                        </div>
                                        <div className="mt-1 flex items-baseline gap-0.5 font-display text-xl font-bold text-semantic-income tabular-nums">
                                            <span>{baseCurrency.symbol}</span>
                                            <span>{money(income)}</span>
                                        </div>
                                    </div>
                                    <div className="border-l border-dashed border-rule pl-4">
                                        <div className="text-xs text-ink-secondary">
                                            {t("this-month")}
                                            {t("expense")}
                                        </div>
                                        <div className="mt-1 flex items-baseline gap-0.5 font-display text-xl font-bold text-semantic-expense tabular-nums">
                                            <span>{baseCurrency.symbol}</span>
                                            <span>{money(expense)}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        }
                        bottom={
                            <div className="grid grid-cols-3 gap-[18px]">
                                <RatioBar
                                    label={t("saving-rate")}
                                    value={savingRate}
                                />
                                <RatioBar
                                    label={t("budget-rate")}
                                    value={budgetRate}
                                    text={
                                        !activeRange.fullPeriod
                                            ? t("partial-period")
                                            : activeBudgetTotal === 0
                                              ? t("not-set")
                                              : undefined
                                    }
                                />
                                <RatioBar
                                    label={t("income-ratio")}
                                    value={incomeRatio}
                                />
                            </div>
                        }
                    />

                    {/* 家小满：有记录时票券卡下方显示「明细记录」小标题；空态不显示 */}
                    {visibleBills.length > 0 && (
                        <h2 className="mt-4 text-base font-bold text-ink">
                            {t("records")}
                        </h2>
                    )}
                </div>
            </div>

            <div className="min-h-0 flex-1">
                <div className="mx-auto h-full w-full max-w-[720px]">
                    {visibleBills.length > 0 ? (
                        <Ledger
                            ref={ledgerRef}
                            bills={visibleBills}
                            enableDivideAsOrdered
                            showTime
                            timeOnly
                            showAssets
                        />
                    ) : (
                        // 家小满缺省态：左对齐纯文字，无插画、无引导按钮
                        <p className="px-4 pt-3 text-[13px] text-ink-secondary">
                            {t("no-bill-records")}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
