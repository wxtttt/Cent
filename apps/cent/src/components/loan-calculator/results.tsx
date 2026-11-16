import { useEffect, useRef, useState } from "react";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { CARD, SheetHint } from "../sheet-kit";
import {
    compareMethods,
    type DerivedLoan,
    type LoanDraft,
    yearRangeLabel,
} from "./model";
import { ROW_MUTED } from "./styles";

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
 * 还款分析：两种方式并排。
 * 传了 `onChange` 就可点选——编辑页点哪张卡，上面的「还款方式」跟着变，
 * 反过来改还款方式这张卡也会跟着高亮。洞察与前缀说明合并成同一段绿字。
 */
export function CompareCard({
    draft,
    onChange,
}: {
    draft: LoanDraft;
    onChange?: (method: LoanDraft["method"]) => void;
}) {
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
        <div data-loan-compare-card className={cn(CARD, "p-4")}>
            <div className="grid grid-cols-2 gap-3">
                {(["installment", "principal"] as const).map((m) => {
                    const item =
                        m === "installment" ? cmp.installment : cmp.principal;
                    const active = draft.method === m;
                    return (
                        <button
                            key={m}
                            type="button"
                            data-loan-compare={m}
                            disabled={!onChange}
                            onClick={onChange ? () => onChange(m) : undefined}
                            className={cn(
                                "rounded-2xl border p-3 text-left transition-colors",
                                onChange && "cursor-pointer",
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
                        </button>
                    );
                })}
            </div>
            <SheetHint className="mt-3" data-loan-insight>
                <p className="text-[13px] leading-relaxed text-ink">
                    {insight}
                    {crossover}
                </p>
            </SheetHint>
        </div>
    );
}

/** 本金 / 利息图例：放在「还款计划」分组标题右侧 */
export function ScheduleLegend() {
    const t = useIntl();
    return (
        <span className="flex items-center gap-3 text-[11px] text-ink-secondary">
            <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-brand" />
                {t("loan-legend-principal")}
            </span>
            <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-brand/30" />
                {t("loan-legend-interest")}
            </span>
        </span>
    );
}

/**
 * 还款计划卡：本金/利息堆叠柱图 + 可滚动的年度行。
 *
 * 图和表是同一份选中态：点某一列 → 下面滚到对应年并高亮；
 * 点某一年 → 那一列点亮、其他列变暗。默认选中当前年。
 */
export function ScheduleCard({ derived }: { derived: DerivedLoan }) {
    const t = useIntl();
    const paid = derived.progress.paid;
    const currentYear = Math.max(1, Math.ceil(paid / 12));
    const maxYear = Math.max(1, derived.yearly.length);
    const maxTotal = Math.max(...derived.yearly.map((y) => y.total), 1);

    const [activeYear, setActiveYear] = useState(
        Math.min(currentYear, maxYear),
    );
    const [expanded, setExpanded] = useState<number | undefined>();

    const listRef = useRef<HTMLDivElement>(null);
    const rowRefs = useRef(new Map<number, HTMLDivElement>());

    // 期限变了（改年限 / 提前结清）后原来选中的年份可能不存在了
    useEffect(() => {
        if (activeYear > maxYear) setActiveYear(Math.min(currentYear, maxYear));
    }, [activeYear, maxYear, currentYear]);

    // 选中哪一年，列表就滚到哪一年（点图表列、点年份行都会走到这里）
    useEffect(() => {
        const list = listRef.current;
        const row = rowRefs.current.get(activeYear);
        if (!list || !row) return;
        const top =
            row.offsetTop - list.clientHeight / 2 + row.clientHeight / 2;
        list.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }, [activeYear]);

    const midYear = Math.ceil(maxYear / 2);

    return (
        <div data-loan-schedule className={cn(CARD, "p-4")}>
            <div data-loan-chart className="flex h-32 items-end gap-[2px]">
                {derived.yearly.map((row) => {
                    const h = (row.total / maxTotal) * 100;
                    const interestShare =
                        row.total > 0 ? row.interest / row.total : 0;
                    const done = row.year * 12 <= paid;
                    const active = row.year === activeYear;
                    return (
                        <button
                            key={row.year}
                            type="button"
                            aria-label={t("loan-year-n", { n: row.year })}
                            className={cn(
                                "flex flex-1 cursor-pointer flex-col justify-end overflow-hidden rounded-[2px] transition-opacity",
                                active
                                    ? "opacity-100"
                                    : done
                                      ? "opacity-20"
                                      : "opacity-40",
                            )}
                            style={{ height: `${h}%` }}
                            onClick={() => setActiveYear(row.year)}
                        >
                            <span
                                className="block w-full rounded-[2px] bg-brand/30"
                                style={{ height: `${interestShare * 100}%` }}
                            />
                            <span className="block w-full flex-1 rounded-[2px] bg-brand" />
                        </button>
                    );
                })}
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-ink-secondary tabular-nums">
                <span>{t("loan-year-n", { n: 1 })}</span>
                {maxYear > 2 && <span>{t("loan-year-n", { n: midYear })}</span>}
                <span>{t("loan-year-n", { n: maxYear })}</span>
            </div>

            <div
                ref={listRef}
                data-loan-year-list
                className="relative mt-1 max-h-[286px] overflow-y-auto overscroll-contain"
            >
                {derived.yearly.map((row) => {
                    const open = expanded === row.year;
                    const months = derived.monthlyRows.slice(
                        (row.year - 1) * 12,
                        Math.min(row.year * 12, derived.monthlyRows.length),
                    );
                    const done = row.year * 12 <= paid;
                    const active = row.year === activeYear;
                    return (
                        <div
                            key={row.year}
                            ref={(el) => {
                                if (el) rowRefs.current.set(row.year, el);
                                else rowRefs.current.delete(row.year);
                            }}
                            data-loan-year-row={row.year}
                            className={cn(
                                "rounded-xl px-1 transition-colors",
                                active && "bg-brand/10",
                            )}
                        >
                            <div className="flex items-start gap-1">
                                <button
                                    type="button"
                                    className="flex flex-1 cursor-pointer items-start justify-between gap-2 py-2 text-left"
                                    onClick={() => setActiveYear(row.year)}
                                >
                                    <div className="flex items-baseline gap-2">
                                        <span
                                            className={cn(
                                                "text-[17px] font-bold tabular-nums",
                                                active
                                                    ? "text-brand"
                                                    : "text-ink",
                                            )}
                                        >
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
                                    <span className="text-[17px] font-bold text-ink tabular-nums">
                                        {fmtMoney(row.total)}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    aria-label={t("loan-col-month")}
                                    className="mt-1.5 flex size-6 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-secondary hover:bg-ground-muted"
                                    onClick={() =>
                                        setExpanded((prev) =>
                                            prev === row.year
                                                ? undefined
                                                : row.year,
                                        )
                                    }
                                >
                                    <i
                                        className={cn(
                                            "icon-[lucide--chevron-down] size-4 transition-transform",
                                            open && "rotate-180",
                                        )}
                                    />
                                </button>
                            </div>
                            <div className="flex items-center justify-between pb-1 text-xs text-ink-secondary tabular-nums">
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
                                <div className="mb-1 rounded-2xl bg-ground-muted/70 px-3 py-2">
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
