import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { goAddBill } from "@/components/bill-editor";
import { budgetRange, budgetTotal } from "@/components/budget/util";
import { isCancelError } from "@/components/confirm/state";
import EmptyState, { MascotPeek } from "@/components/empty-state";
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

function RatioBar({ label, value }: { label: string; value: number }) {
    const percent = Math.max(0, Math.round(value * 1000) / 10);
    return (
        <div className="min-w-0">
            {/* 家小满：标签与数值同行靠左 */}
            <div className="flex items-baseline gap-1.5">
                <span className="truncate text-xs text-ink-secondary">
                    {label}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                    {percent}%
                </span>
            </div>
            {/* 轨道中性灰（≈#f4f4f5）7px 高，与家小满实测一致 */}
            <div className="mt-2.5 h-[7px] overflow-hidden rounded-full bg-black/5">
                <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${Math.min(100, percent)}%` }}
                />
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
    const { budgets } = useBudget();

    // 快捷筛选（家小满筛选面板）：确认后在本页就地过滤列表与统计卡
    const [quickFilter, setQuickFilter] = useState<LedgerQuickFilter>();

    const ledgerRef = useRef<{
        scrollToIndex: (index: number) => void;
    }>(null);

    const month = useMemo(() => dayjs().startOf("month"), []);
    const monthStart = month.valueOf();
    const monthEnd = month.endOf("month").valueOf();

    const monthBills = useMemo(
        () =>
            bills.filter(
                (bill) => bill.time >= monthStart && bill.time <= monthEnd,
            ),
        [bills, monthStart, monthEnd],
    );

    const timeRange = useMemo(
        () => resolveQuickTimeRange(quickFilter),
        [quickFilter],
    );
    const cardMonth = timeRange?.month ?? month;

    // 统计卡跟随筛选的时间范围；没有时间筛选时回落到本月
    const cardBills = useMemo(() => {
        if (!timeRange) return monthBills;
        return bills.filter(
            (bill) =>
                (timeRange.start === undefined ||
                    bill.time >= timeRange.start) &&
                (timeRange.end === undefined || bill.time <= timeRange.end),
        );
    }, [bills, monthBills, timeRange]);

    // 卡片标题始终按月份展示（家小满实测：自定义日期也显示所在月份）
    const cardTitle = t("month-income-expense", {
        month: cardMonth.format("M"),
    });

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

    // 预算按月生效，跟随统计卡当前月份
    const activeBudgetTotal = useMemo(
        () =>
            budgets.reduce((total, budget) => {
                if (
                    !budget.joiners.includes(userId) ||
                    !budgetRange(budget, cardMonth)[1]
                ) {
                    return total;
                }
                return total + budgetTotal(budget);
            }, 0),
        [budgets, userId, cardMonth],
    );
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
        <div className="flex h-full flex-col overflow-hidden page-show">
            <div className="flex-shrink-0">
                <div className="mx-auto w-full max-w-[720px] px-4 pt-2">
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            className="flex cursor-pointer items-center gap-1 rounded-full border border-rule bg-panel px-3 py-1.5 text-sm text-ink shadow-panel transition-colors hover:bg-ground-muted"
                            onClick={() => {
                                showLedgerFilter(quickFilter)
                                    .then((v) => setQuickFilter(v))
                                    .catch((e) => {
                                        if (!isCancelError(e)) throw e;
                                    });
                            }}
                        >
                            {t("filter")}
                            <i className="icon-[mdi--chevron-down] size-4 text-ink-secondary"></i>
                        </button>
                        <button
                            type="button"
                            className="flex cursor-pointer items-center gap-1 rounded-full border border-rule bg-panel px-3 py-1.5 text-sm text-ink shadow-panel transition-colors hover:bg-ground-muted"
                            onClick={() => {
                                showStat();
                            }}
                        >
                            <i className="icon-[mdi--chart-box-outline] size-4 text-brand"></i>
                            {t("analysis")}
                        </button>
                    </div>

                    <TicketCard
                        className="mt-8"
                        mascot={
                            <MascotPeek
                                mascot="bookkeeping"
                                className="h-16 w-auto"
                            />
                        }
                        top={
                            <>
                                <div className="flex items-start justify-between gap-3">
                                    <h1 className="font-display text-2xl font-bold tracking-tight">
                                        {cardTitle}
                                    </h1>
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

                                <div className="mt-4 grid grid-cols-2">
                                    <div className="pr-4">
                                        <div className="text-xs text-ink-secondary">
                                            {t("this-month")}
                                            {t("income")}
                                        </div>
                                        <div className="mt-1 flex items-baseline gap-0.5 font-display text-2xl font-bold text-semantic-income tabular-nums">
                                            <span>{baseCurrency.symbol}</span>
                                            <span>{money(income)}</span>
                                        </div>
                                    </div>
                                    <div className="border-l border-dashed border-rule pl-4">
                                        <div className="text-xs text-ink-secondary">
                                            {t("this-month")}
                                            {t("expense")}
                                        </div>
                                        <div className="mt-1 flex items-baseline gap-0.5 font-display text-2xl font-bold text-semantic-expense tabular-nums">
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
                                />
                                <RatioBar
                                    label={t("income-ratio")}
                                    value={incomeRatio}
                                />
                            </div>
                        }
                    />

                    <div className="flex items-baseline justify-between px-1 pb-1 pt-5">
                        <h2 className="text-xl font-bold">{t("records")}</h2>
                        <span className="text-xs text-ink-secondary">
                            {t("total-records", { n: visibleBills.length })}
                        </span>
                    </div>
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
                            showAssets
                        />
                    ) : (
                        <div className="px-4 pt-6">
                            <EmptyState
                                mascot="bookkeeping"
                                text={t("nothing-here-add-one-bill")}
                                action={{
                                    label: t("add-bill"),
                                    onClick: () => goAddBill(),
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
