import { useState } from "react";
import { type PrepayMode, simulatePrepay } from "@/ledger/loan";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import {
    compareMethods,
    type DerivedLoan,
    type LoanDraft,
    yearRangeLabel,
} from "./model";

const fmtMoney = (v: number) =>
    v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
const fmtWan = (v: number) =>
    v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

/** 两种还款方式对比卡：点卡片切换还款方式 + 洞察条（含交叉期视角） */
export function CompareCard({
    draft,
    onSelect,
}: {
    draft: LoanDraft;
    onSelect: (m: "installment" | "principal") => void;
}) {
    const t = useIntl();
    const cmp = compareMethods(draft);
    const insight =
        draft.method === "installment"
            ? t("loan-insight-to-principal", {
                  // 单位在拼文案时补：利息差用「万」、月供用「元」，
                  // 不在语言包里写死，避免英文界面也长出「万」
                  amount: `${fmtWan(cmp.interestDiff / 10000)} 万`,
                  monthly: `¥${fmtMoney(cmp.firstDiff)}`,
              })
            : t("loan-insight-to-installment", {
                  amount: `${fmtWan(cmp.interestDiff / 10000)} 万`,
                  monthly: `¥${fmtMoney(cmp.firstDiff)}`,
              });
    return (
        <div className="rounded-2xl bg-panel p-4 shadow-[0_1px_6px_rgba(92,62,30,0.05)]">
            <div className="flex items-center justify-between">
                <span className="text-[15px] font-semibold text-ink">
                    {t("loan-compare-title")}
                </span>
                <span className="text-xs text-ink-secondary">
                    {t("loan-compare-hint")}
                </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
                {(["installment", "principal"] as const).map((m) => {
                    const item =
                        m === "installment" ? cmp.installment : cmp.principal;
                    const active = draft.method === m;
                    return (
                        <button
                            key={m}
                            type="button"
                            data-loan-compare={m}
                            className={cn(
                                "cursor-pointer rounded-2xl border p-3 text-left transition-colors",
                                active
                                    ? "border-brand bg-brand/5 text-brand"
                                    : "border-rule bg-ground-muted/60 text-ink",
                            )}
                            onClick={() => onSelect(m)}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[15px] font-semibold">
                                    {t(
                                        m === "installment"
                                            ? "loan-method-installment"
                                            : "loan-method-principal",
                                    )}
                                </span>
                                {active && (
                                    <i className="icon-[lucide--circle-check-big] size-4" />
                                )}
                            </div>
                            <div className="mt-1.5 text-xs text-ink-secondary">
                                {m === "installment"
                                    ? t("loan-compare-monthly-label")
                                    : t("loan-compare-first-label")}
                            </div>
                            <div className="font-display text-xl font-bold tabular-nums">
                                {fmtMoney(item.firstPayment)}
                            </div>
                            <div className="mt-1 text-xs text-ink-secondary tabular-nums">
                                {t("loan-total-interest")}{" "}
                                {fmtWan(item.totalInterest / 10000)} 万
                            </div>
                            <div className="mt-0.5 text-xs text-ink-secondary tabular-nums">
                                {m === "installment"
                                    ? t("loan-installment-note")
                                    : t("loan-decrease-note", {
                                          amount: `¥${fmtMoney(
                                              cmp.principal.payments.length > 1
                                                  ? Math.round(
                                                        (cmp.principal
                                                            .payments[0] -
                                                            cmp.principal
                                                                .payments[1]) *
                                                            100,
                                                    ) / 100
                                                  : 0,
                                          )}`,
                                      })}
                            </div>
                        </button>
                    );
                })}
            </div>
            <div
                data-loan-insight
                className="mt-3 rounded-2xl bg-[#e8f3ea] px-4 py-2.5 text-[13px] leading-relaxed text-[#1a7f37]"
            >
                {insight}
                {draft.method === "installment" && cmp.crossover && (
                    <span className="mt-1 block text-xs text-[#1a7f37]/80">
                        {t("loan-crossover-note", { n: cmp.crossover })}
                    </span>
                )}
            </div>
        </div>
    );
}

/** 还款计划卡：本金/利息堆叠柱图 + 年度行（展开 12 期月度表） */
export function ScheduleCard({ derived }: { derived: DerivedLoan }) {
    const t = useIntl();
    const [expanded, setExpanded] = useState<number | undefined>();
    const [showAll, setShowAll] = useState(false);
    const maxTotal = Math.max(...derived.yearly.map((y) => y.total), 1);
    const visibleYears = showAll ? derived.yearly : derived.yearly.slice(0, 5);
    return (
        <div
            data-loan-schedule
            className="rounded-2xl bg-panel p-4 shadow-[0_1px_6px_rgba(92,62,30,0.05)]"
        >
            <div className="flex items-center justify-between">
                <span className="text-[15px] font-semibold text-ink">
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
            <div data-loan-chart className="mt-3 flex h-36 items-end gap-[3px]">
                {derived.yearly.map((row) => {
                    const h = (row.total / maxTotal) * 100;
                    const interestShare =
                        row.total > 0 ? row.interest / row.total : 0;
                    return (
                        <button
                            key={row.year}
                            type="button"
                            aria-label={t("loan-year-n", { n: row.year })}
                            className={cn(
                                "flex-1 cursor-pointer rounded-full transition-opacity",
                                expanded === row.year
                                    ? "opacity-100"
                                    : "opacity-90 hover:opacity-100",
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
                                className="block w-full rounded-full bg-brand/30"
                                style={{
                                    height: `${interestShare * 100}%`,
                                }}
                            />
                            <span
                                className="block w-full flex-1 rounded-full bg-brand"
                                style={{ minHeight: 0 }}
                            />
                        </button>
                    );
                })}
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-ink-secondary tabular-nums">
                <span>{t("loan-year-n", { n: 1 })}</span>
                <span>
                    {t("loan-year-n", {
                        n: Math.ceil(derived.months / 24),
                    })}
                </span>
                <span>
                    {t("loan-year-n", {
                        n: derived.yearly.length,
                    })}
                </span>
            </div>
            <div className="mt-2 divide-y divide-rule/60">
                {visibleYears.map((row) => {
                    const open = expanded === row.year;
                    const months = derived.monthlyRows.slice(
                        (row.year - 1) * 12,
                        Math.min(row.year * 12, derived.monthlyRows.length),
                    );
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
                                    <span className="text-xs text-ink-secondary tabular-nums">
                                        {yearRangeLabel(
                                            derived.firstPay,
                                            row.year,
                                            derived.months,
                                        )}
                                    </span>
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
                                        // 逐月月份标签由首期起偏移
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

function monthLabel(
    firstPay: { year: number; month: number },
    offset: number,
): string {
    const index = (firstPay.year - 1) * 12 + (firstPay.month - 1) + offset;
    const year = Math.floor(index / 12) + 1;
    const month = (index % 12) + 1;
    return `${year}.${`${month}`.padStart(2, "0")}`;
}

const PREPAY_MODES: { key: PrepayMode; label: string }[] = [
    { key: "shorten", label: "loan-prepay-mode-shorten" },
    { key: "reduceMonthly", label: "loan-prepay-mode-reduce" },
    { key: "payoff", label: "loan-prepay-mode-payoff" },
];

/** 提前还款模拟卡（组合贷款不显示） */
export function PrepayCard({
    draft,
    derived,
}: {
    draft: LoanDraft;
    derived: DerivedLoan;
}) {
    const t = useIntl();
    const [mode, setMode] = useState<PrepayMode>("shorten");
    const [startText, setStartText] = useState("12");
    const [amountText, setAmountText] = useState("20");
    const track =
        draft.loanType === "fund"
            ? (derived.fundInput ?? derived.commercialInput)
            : derived.commercialInput;
    const start = Math.max(
        1,
        Math.min(Math.round(Number(startText)) || 1, derived.months - 1),
    );
    const extra = Math.max(0, (Number(amountText) || 0) * 10000);
    const result = simulatePrepay(track, draft.method, {
        mode,
        extraAmount: extra,
        startMonth: start,
    });
    return (
        <div
            data-loan-prepay
            className="rounded-2xl bg-panel p-4 shadow-[0_1px_6px_rgba(92,62,30,0.05)]"
        >
            <div className="flex items-center justify-between">
                <span className="text-[15px] font-semibold text-ink">
                    {t("loan-prepay-title")}
                </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
                {PREPAY_MODES.map((m) => (
                    <button
                        key={m.key}
                        type="button"
                        data-loan-prepay-mode={m.key}
                        className={cn(
                            "cursor-pointer rounded-full py-1.5 text-xs font-medium transition-colors",
                            mode === m.key
                                ? "bg-brand/10 text-brand ring-1 ring-brand/40"
                                : "bg-ground-muted text-ink-secondary",
                        )}
                        onClick={() => setMode(m.key)}
                    >
                        {t(m.label)}
                    </button>
                ))}
            </div>
            <div className="mt-2 divide-y divide-rule/60">
                <div className="flex min-h-[46px] items-center justify-between gap-3 py-1.5">
                    <span className="flex-shrink-0 text-[15px] text-ink">
                        {t("loan-prepay-from-pre")}
                    </span>
                    <div className="flex min-w-0 flex-1 items-baseline justify-end gap-1">
                        <input
                            aria-label={t("loan-prepay-title")}
                            inputMode="numeric"
                            value={startText}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) => {
                                const raw = e.target.value.replace(/\D/g, "");
                                setStartText(raw);
                            }}
                            className="w-16 min-w-0 cursor-text bg-transparent text-right text-[15px] font-semibold text-ink outline-none"
                        />
                        <span className="flex-shrink-0 text-sm text-ink-secondary">
                            {t("loan-prepay-from-suf")}
                        </span>
                    </div>
                </div>
                {mode === "payoff" ? (
                    <div className="flex min-h-[46px] items-center justify-between gap-3 py-1.5">
                        <span className="flex-shrink-0 text-[15px] text-ink">
                            {t("loan-prepay-payoff-amount")}
                        </span>
                        <span className="text-[15px] font-semibold text-ink tabular-nums">
                            {fmtMoney(result.payoffAmount ?? 0)}
                        </span>
                    </div>
                ) : (
                    <div className="flex min-h-[46px] items-center justify-between gap-3 py-1.5">
                        <span className="flex-shrink-0 text-[15px] text-ink">
                            {t("loan-prepay-amount-label")}
                        </span>
                        <div className="flex min-w-0 flex-1 items-baseline justify-end gap-1">
                            <input
                                aria-label={t("loan-prepay-amount-label")}
                                inputMode="decimal"
                                value={amountText}
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(
                                        /[^\d.]/g,
                                        "",
                                    );
                                    setAmountText(raw);
                                }}
                                className="w-20 min-w-0 cursor-text bg-transparent text-right text-[15px] font-semibold text-ink outline-none"
                            />
                            <span className="flex-shrink-0 text-sm text-ink-secondary">
                                万
                            </span>
                        </div>
                    </div>
                )}
            </div>
            <div className="mt-2 rounded-2xl bg-[#e8f3ea] px-4 py-2.5 text-[13px] leading-relaxed text-[#1a7f37]">
                <span data-loan-prepay-result>
                    {t("loan-prepay-saved", {
                        amount: `¥${fmtMoney(result.savedInterest)}`,
                    })}
                    {result.payoff
                        ? `，${t("loan-prepay-payoff-at", { n: start })}`
                        : result.monthsShortened > 0
                          ? `，${t("loan-prepay-shortened", { n: result.monthsShortened })}`
                          : ""}
                </span>
                {mode === "reduceMonthly" &&
                    result.newMonthly !== undefined && (
                        <span className="mt-1 block">
                            {t("loan-prepay-new-monthly", {
                                amount: `¥${fmtMoney(result.newMonthly)}`,
                            })}
                        </span>
                    )}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-secondary">
                {t("loan-prepay-note")}
            </p>
        </div>
    );
}
