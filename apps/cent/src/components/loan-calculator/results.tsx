import { useState } from "react";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import {
    compareMethods,
    type DerivedLoan,
    type LoanDraft,
    yearRangeLabel,
} from "./model";
import { LOAN_CARD, ROW_MUTED } from "./styles";

export const fmtMoney = (v: number) =>
    v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
export const fmtMoneyInt = (v: number) =>
    Math.round(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
export const fmtWan = (v: number) =>
    v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

/**
 * 还款分析：两种方式并排展示。
 * 这里**不可点选**——还款方式在「编辑贷款」里选，分析卡只负责对比；
 * 洞察与前缀说明合并成同一段绿字，不再拆成主行 + 次行。
 */
export function CompareCard({ draft }: { draft: LoanDraft }) {
    const t = useIntl();
    const cmp = compareMethods(draft);
    const isInstallment = draft.method === "installment";
    const insight = isInstallment
        ? t("loan-insight-to-principal", {
              // 单位在拼文案时补：利息差用「万」、月供用「元」
              amount: `${fmtWan(cmp.interestDiff / 10000)} 万`,
              monthly: `¥${fmtMoney(cmp.firstDiff)}`,
          })
        : t("loan-insight-to-installment", {
              amount: `${fmtWan(cmp.interestDiff / 10000)} 万`,
              monthly: `¥${fmtMoney(cmp.firstDiff)}`,
          });
    const crossover =
        isInstallment && cmp.crossover
            ? `，${t("loan-crossover-note", { n: cmp.crossover })}`
            : "";

    return (
        <div data-loan-compare-card className={cn(LOAN_CARD, "p-4")}>
            <div className="grid grid-cols-2 gap-3">
                {(["installment", "principal"] as const).map((m) => {
                    const item =
                        m === "installment" ? cmp.installment : cmp.principal;
                    const active = draft.method === m;
                    return (
                        <div
                            key={m}
                            data-loan-compare={m}
                            className={cn(
                                "rounded-2xl border p-3",
                                active
                                    ? "border-brand/50 bg-brand/5"
                                    : "border-rule/70 bg-ground-muted/40",
                            )}
                        >
                            <div className="flex items-center gap-1.5">
                                <span className="text-[13px] text-ink">
                                    {t(
                                        m === "installment"
                                            ? "loan-method-installment"
                                            : "loan-method-principal",
                                    )}
                                </span>
                                {active && (
                                    <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] leading-none text-on-brand">
                                        {t("loan-compare-current")}
                                    </span>
                                )}
                            </div>
                            <div className="mt-1.5 text-[11px] text-ink-secondary">
                                {m === "installment"
                                    ? t("loan-compare-monthly-label")
                                    : t("loan-compare-first-label")}
                            </div>
                            <div className="font-display text-[19px] font-bold text-ink tabular-nums">
                                {fmtMoney(item.firstPayment)}
                            </div>
                            <div className="mt-1.5 text-[11px] text-ink-secondary tabular-nums">
                                {t("loan-total-interest")}{" "}
                                <span className="text-ink">
                                    {fmtWan(item.totalInterest / 10000)} 万
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div
                data-loan-insight
                className="mt-3 rounded-2xl bg-[#e8f3ea] px-4 py-2.5 text-[13px] leading-relaxed text-[#1a7f37]"
            >
                {insight}
                {crossover}
            </div>
        </div>
    );
}

/** 还款计划卡：本金/利息堆叠柱图 + 年度行（展开 12 期月度表），已还年份压暗 */
export function ScheduleCard({ derived }: { derived: DerivedLoan }) {
    const t = useIntl();
    const [expanded, setExpanded] = useState<number | undefined>();
    const [showAll, setShowAll] = useState(false);
    const maxTotal = Math.max(...derived.yearly.map((y) => y.total), 1);
    const visibleYears = showAll ? derived.yearly : derived.yearly.slice(0, 5);
    const paid = derived.progress.paid;
    const currentYear = Math.max(1, Math.ceil(paid / 12));

    return (
        <div data-loan-schedule className={cn(LOAN_CARD, "p-4")}>
            <div className="flex items-center justify-between">
                <span className="text-[15px] dp-text-medium text-ink">
                    {t("loan-schedule-title")}
                </span>
                <span className="flex items-center gap-3 text-xs text-ink-secondary">
                    <span className="flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-brand" />
                        {t("loan-legend-principal")}
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-brand/30" />
                        {t("loan-legend-interest")}
                    </span>
                </span>
            </div>
            <div data-loan-chart className="mt-3 flex h-32 items-end gap-[2px]">
                {derived.yearly.map((row) => {
                    const h = (row.total / maxTotal) * 100;
                    const interestShare =
                        row.total > 0 ? row.interest / row.total : 0;
                    const done = row.year * 12 <= paid;
                    return (
                        <button
                            key={row.year}
                            type="button"
                            aria-label={t("loan-year-n", { n: row.year })}
                            className={cn(
                                "flex-1 cursor-pointer rounded-[2px] transition-opacity",
                                done && "opacity-35",
                                expanded === row.year
                                    ? "opacity-100"
                                    : "hover:opacity-100",
                            )}
                            style={{
                                height: `${h}%`,
                                background: "transparent",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "flex-end",
                                overflow: "hidden",
                            }}
                            onClick={() =>
                                setExpanded((prev) =>
                                    prev === row.year ? undefined : row.year,
                                )
                            }
                        >
                            <span
                                className="block w-full rounded-[2px] bg-brand/30"
                                style={{ height: `${interestShare * 100}%` }}
                            />
                            <span
                                className="block w-full flex-1 rounded-[2px] bg-brand"
                                style={{ minHeight: 0 }}
                            />
                        </button>
                    );
                })}
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-ink-secondary tabular-nums">
                <span>{t("loan-year-n", { n: 1 })}</span>
                <span>
                    {currentYear > 1 && currentYear < derived.yearly.length
                        ? t("loan-year-n", { n: currentYear })
                        : ""}
                </span>
                <span>{t("loan-year-n", { n: derived.yearly.length })}</span>
            </div>
            <div className="mt-2 divide-y divide-rule/60">
                {visibleYears.map((row) => {
                    const open = expanded === row.year;
                    const months = derived.monthlyRows.slice(
                        (row.year - 1) * 12,
                        Math.min(row.year * 12, derived.monthlyRows.length),
                    );
                    const done = row.year * 12 <= paid;
                    return (
                        <div key={row.year} className="py-1">
                            <button
                                type="button"
                                data-loan-year-row={row.year}
                                className="flex w-full cursor-pointer items-start justify-between gap-2 py-2 text-left"
                                onClick={() =>
                                    setExpanded((prev) =>
                                        prev === row.year
                                            ? undefined
                                            : row.year,
                                    )
                                }
                            >
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[17px] font-bold text-ink">
                                        {t("loan-year-n", { n: row.year })}
                                    </span>
                                    <span className={ROW_MUTED}>
                                        {yearRangeLabel(
                                            derived.firstPay,
                                            row.year,
                                            derived.months,
                                        )}
                                    </span>
                                    {done && (
                                        <span className="rounded-full bg-ground-muted px-1.5 py-0.5 text-[10px] leading-none text-ink-secondary">
                                            {t("loan-year-paid")}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[17px] font-bold text-ink tabular-nums">
                                        {fmtMoney(row.total)}
                                    </span>
                                    <i
                                        className={cn(
                                            "icon-[lucide--chevron-down] size-4 text-ink-secondary transition-transform",
                                            open && "rotate-180",
                                        )}
                                    />
                                </div>
                            </button>
                            <div className="flex items-center justify-between px-0.5 pb-1 text-xs text-ink-secondary tabular-nums">
                                <span>
                                    {t("loan-legend-principal")}{" "}
                                    {fmtWan(row.principal / 10000)} 万 ·{" "}
                                    {t("loan-legend-interest")}{" "}
                                    {fmtWan(row.interest / 10000)} 万
                                </span>
                                <span>
                                    {t("loan-col-remaining")}{" "}
                                    {fmtWan(row.remaining / 10000)} 万
                                </span>
                            </div>
                            {open && (
                                <div className="rounded-2xl bg-ground-muted/70 px-3 py-2">
                                    <div className="flex py-1 text-xs text-ink-secondary">
                                        <span className="flex-1">
                                            {t("loan-col-month")}
                                        </span>
                                        <span className="flex-1 text-right">
                                            {t("loan-col-payment")}
                                        </span>
                                        <span className="flex-1 text-right">
                                            {t("loan-legend-principal")}
                                        </span>
                                        <span className="flex-1 text-right">
                                            {t("loan-legend-interest")}
                                        </span>
                                    </div>
                                    {months.map((m, i) => {
                                        const label = monthLabel(
                                            derived.firstPay,
                                            (row.year - 1) * 12 + i,
                                        );
                                        return (
                                            <div
                                                key={`${row.year}-${i}`}
                                                className="flex items-baseline py-1 text-xs text-ink tabular-nums"
                                            >
                                                <span className="flex-1 text-ink-secondary">
                                                    {label}
                                                </span>
                                                <span className="flex-1 text-right">
                                                    {fmtMoney(m.payment)}
                                                </span>
                                                <span className="flex-1 text-right">
                                                    {fmtMoney(m.principal)}
                                                </span>
                                                <span className="flex-1 text-right">
                                                    {fmtMoney(m.interest)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {derived.yearly.length > 5 && (
                <button
                    type="button"
                    data-loan-view-all
                    className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1 py-2 text-[13px] font-medium text-brand"
                    onClick={() => setShowAll((v) => !v)}
                >
                    {t("loan-view-all", { n: derived.yearly.length })}
                    <i
                        className={cn(
                            "icon-[lucide--chevron-down] size-4 transition-transform",
                            showAll && "rotate-180",
                        )}
                    />
                </button>
            )}
        </div>
    );
}

export function monthLabel(
    firstPay: { year: number; month: number },
    offset: number,
): string {
    const index = (firstPay.year - 1) * 12 + (firstPay.month - 1) + offset;
    const year = Math.floor(index / 12) + 1;
    const month = (index % 12) + 1;
    return `${year}.${`${month}`.padStart(2, "0")}`;
}
