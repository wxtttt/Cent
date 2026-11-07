import dayjs from "dayjs";
import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { useShallow } from "zustand/shallow";
import { goAddBill } from "@/components/bill-editor";
import { budgetRange, budgetTotal } from "@/components/budget/util";
import EmptyState, { MascotPeek } from "@/components/empty-state";
import Ledger from "@/components/ledger";
import TicketCard from "@/components/ticket-card";
import { useBudget } from "@/hooks/use-budget";
import { useCurrency } from "@/hooks/use-currency";
import { useFullBills } from "@/hooks/use-full-bills";
import { amountToNumber } from "@/ledger/bill";
import { useIntl, useLocale } from "@/locale";
import { useLedgerStore } from "@/store/ledger";
import { useUiStore } from "@/store/ui";
import { useUserStore } from "@/store/user";
import { cn } from "@/utils";

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
    const navigate = useNavigate();
    useFullBills();

    const bills = useLedgerStore((state) => state.bills);
    const loading = useLedgerStore((state) => state.loading);
    const userId = useUserStore((state) => state.id);
    const { baseCurrency } = useCurrency();
    const { budgets } = useBudget();

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

    const { income, expense } = useMemo(() => {
        let incomeTotal = 0;
        let expenseTotal = 0;
        for (const bill of monthBills) {
            const value = amountToNumber(bill.amount);
            if (bill.type === "income") {
                incomeTotal += value;
            } else {
                expenseTotal += value;
            }
        }
        return { income: incomeTotal, expense: expenseTotal };
    }, [monthBills]);

    const balance = income - expense;
    const savingRate = income > 0 ? balance / income : 0;
    const incomeRatio = income + expense > 0 ? income / (income + expense) : 0;

    const activeBudgetTotal = useMemo(
        () =>
            budgets.reduce((total, budget) => {
                if (
                    !budget.joiners.includes(userId) ||
                    !budgetRange(budget, month)[1]
                ) {
                    return total;
                }
                return total + budgetTotal(budget);
            }, 0),
        [budgets, userId, month],
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

    return (
        <div className="flex h-full flex-col overflow-hidden page-show">
            <div className="flex-shrink-0">
                <div className="mx-auto w-full max-w-[720px] px-4 pt-2">
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            className="flex cursor-pointer items-center gap-1 rounded-full border border-rule bg-panel px-3 py-1.5 text-sm text-ink shadow-panel transition-colors hover:bg-ground-muted"
                            onClick={() => {
                                navigate("/search");
                            }}
                        >
                            {t("filter")}
                            <i className="icon-[mdi--chevron-down] size-4 text-ink-secondary"></i>
                        </button>
                        <button
                            type="button"
                            className="flex cursor-pointer items-center gap-1 rounded-full border border-rule bg-panel px-3 py-1.5 text-sm text-ink shadow-panel transition-colors hover:bg-ground-muted"
                            onClick={() => {
                                navigate("/stat");
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
                                        {t("month-income-expense", {
                                            month: month.format("M"),
                                        })}
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
                            {t("total-records", { n: bills.length })}
                        </span>
                    </div>
                </div>
            </div>

            <div className="min-h-0 flex-1">
                <div className="mx-auto h-full w-full max-w-[720px]">
                    {bills.length > 0 ? (
                        <Ledger
                            ref={ledgerRef}
                            bills={bills}
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
