import { useEffect, useState } from "react";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { RowChevron } from "../form-rows";
import { LOAN_TYPE_ICONS } from "./icons";
import type { DerivedLoan, LoanDraft, LoanMode, LoanType } from "./model";
import {
    LOAN_CARD,
    PICK_OFF,
    PICK_ON,
    SEG_GROUP,
    SEG_ITEM,
    SEG_OFF,
    SEG_ON,
} from "./styles";

const fmtMoney = (v: number) =>
    `${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtWan = (v: number) =>
    v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

/** 万 → 元显示：数值带 2 位小数 */
function AmountCell({
    value,
    onCommit,
    ariaLabel,
}: {
    value: number;
    onCommit: (n: number) => void;
    ariaLabel: string;
}) {
    const [text, setText] = useState(() => String(value));
    // text 是输入缓冲：仅当外部值与缓冲解析不一致（切换方案 / 派生重算）时重置
    // biome-ignore lint/correctness/useExhaustiveDependencies: 只跟随外部 value 重同步
    useEffect(() => {
        const parsed = Number(text);
        if (!(Number.isFinite(parsed) && Math.abs(parsed - value) < 1e-9)) {
            setText(String(Math.round(value * 100) / 100));
        }
    }, [value]);
    return (
        <div className="flex min-w-0 flex-1 items-baseline justify-end gap-1">
            <input
                aria-label={ariaLabel}
                inputMode="decimal"
                value={text}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d.]/g, "");
                    setText(raw);
                    const parsed = Number(raw);
                    if (Number.isFinite(parsed) && parsed > 0) {
                        onCommit(Math.round(parsed * 100) / 100);
                    }
                }}
                className="min-w-0 max-w-40 flex-1 cursor-text bg-transparent text-right text-[17px] font-semibold text-ink outline-none"
            />
            <span className="flex-shrink-0 text-sm text-ink-secondary">万</span>
        </div>
    );
}

/** Hero 票券卡：实时计算的月供 / 首月 + 本金利息占比条 + 三统计 */
export function HeroTicket({
    draft,
    derived,
}: {
    draft: LoanDraft;
    derived: DerivedLoan;
}) {
    const t = useIntl();
    const isPrincipal = derived.method === "principal";
    const interestShare =
        derived.totalPayment > 0
            ? derived.totalInterest / derived.totalPayment
            : 0;
    const sub =
        derived.method === "installment"
            ? t("loan-hero-sub-installment", {
                  years: draft.termYears,
                  periods: derived.months,
                  payoff: `${derived.payoff.year}年${derived.payoff.month}月`,
              })
            : t("loan-hero-sub-decrease", {
                  amount: `¥${fmtMoney(derived.decrease)}`,
                  payoff: `${derived.payoff.year}年${derived.payoff.month}月`,
              });
    return (
        // 白卡（用户口径：暖色渐变票券卡「有点丑」，直接换白底）；
        // 原来的打孔缺口 + 虚线只在渐变票券里成立，换白卡后一并去掉
        <div data-loan-hero className={cn(LOAN_CARD, "relative p-4")}>
            <img
                src={LOAN_TYPE_ICONS[draft.loanType]}
                alt=""
                aria-hidden
                className="absolute top-4 right-4 size-11"
            />
            <div className="text-[13px] text-ink-secondary">
                {isPrincipal ? t("loan-hero-first") : t("loan-hero-monthly")}
            </div>
            <div className="mt-1 font-display text-4xl leading-tight font-bold text-brand tabular-nums">
                <span className="mr-1 text-xl">¥</span>
                {fmtMoney(derived.firstPayment)}
            </div>
            <div className="mt-1 pr-12 text-xs text-ink-secondary tabular-nums">
                {sub}
                {derived.splitFirst
                    ? ` · ${t("loan-hero-split", {
                          commercial: fmtMoney(derived.splitFirst.commercial),
                          fund: fmtMoney(derived.splitFirst.fund),
                      })}`
                    : ""}
            </div>
            <div className="mt-4 border-t border-rule pt-4">
                <div className="flex h-2 overflow-hidden rounded-full bg-brand/20">
                    <div
                        className="h-full rounded-full bg-brand transition-all"
                        style={{ width: `${(1 - interestShare) * 100}%` }}
                    />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                    <div>
                        <div className="flex items-center gap-1 text-[11px] text-ink-secondary">
                            <span className="size-1.5 rounded-full bg-brand" />
                            {t("loan-principal-label")}
                        </div>
                        <div className="mt-0.5 text-[15px] font-semibold text-ink tabular-nums">
                            {fmtWan(derived.principal / 10000)} 万
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-1 text-[11px] text-ink-secondary">
                            <span className="size-1.5 rounded-full bg-brand/30" />
                            {t("loan-total-interest")}
                        </div>
                        <div className="mt-0.5 text-[15px] font-semibold text-ink tabular-nums">
                            {fmtWan(derived.totalInterest / 10000)} 万
                        </div>
                    </div>
                    <div>
                        <div className="text-[11px] text-ink-secondary">
                            {t("loan-total-payment")}
                        </div>
                        <div className="mt-0.5 text-[15px] font-semibold text-ink tabular-nums">
                            {fmtWan(derived.totalPayment / 10000)} 万
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const TYPES: LoanType[] = ["commercial", "fund", "combo"];

/** 三大贷款类型卡 */
export function TypeCards({
    value,
    onChange,
}: {
    value: LoanType;
    onChange: (t: LoanType) => void;
}) {
    const t = useIntl();
    return (
        <div data-loan-type-row className="grid grid-cols-3 gap-3">
            {TYPES.map((type) => (
                <button
                    key={type}
                    type="button"
                    data-loan-type={type}
                    className={cn(
                        "flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 transition-colors",
                        value === type ? PICK_ON : PICK_OFF,
                    )}
                    onClick={() => onChange(type)}
                >
                    <img
                        src={LOAN_TYPE_ICONS[type]}
                        alt=""
                        aria-hidden
                        className="size-10"
                    />
                    <span className="text-[13px] font-medium">
                        {t(
                            type === "commercial"
                                ? "loan-type-commercial"
                                : type === "fund"
                                  ? "loan-type-fund"
                                  : "loan-type-combo",
                        )}
                    </span>
                </button>
            ))}
        </div>
    );
}

/** 计算方式 / 还款方式等二选一：全站分段控件同形（浅灰容器 + 白色凸起胶囊） */
function ModeChip({
    active,
    label,
    onClick,
    probe,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
    probe: LoanMode;
}) {
    return (
        <button
            type="button"
            data-loan-mode={probe}
            className={cn(SEG_ITEM, active ? SEG_ON : SEG_OFF)}
            onClick={onClick}
        >
            {label}
        </button>
    );
}

/** 贷款设置白卡：金额口径 / 金额输入 / 年限 / 双利率 / 首次还款 */
export function SettingsCard({
    draft,
    derived,
    edit,
    onOpenSheet,
}: {
    draft: LoanDraft;
    derived: DerivedLoan;
    edit: (patch: Partial<LoanDraft>) => void;
    onOpenSheet: (
        kind: "down" | "term" | "rateCommercial" | "rateFund" | "firstPay",
    ) => void;
}) {
    const t = useIntl();
    const isCombo = draft.loanType === "combo";
    const fundClamped = isCombo && draft.fundAmount > derived.totalWan + 1e-9;
    return (
        <div className={cn("divide-y divide-rule/60", LOAN_CARD)}>
            <div className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-2">
                <span className="flex-shrink-0 text-[15px] text-ink">
                    {t("loan-mode-label")}
                </span>
                <div className={SEG_GROUP}>
                    <ModeChip
                        probe="totalPrice"
                        active={draft.mode === "totalPrice"}
                        label={t("loan-mode-total-price")}
                        onClick={() => edit({ mode: "totalPrice" })}
                    />
                    <ModeChip
                        probe="amount"
                        active={draft.mode === "amount"}
                        label={t("loan-mode-by-amount")}
                        onClick={() => edit({ mode: "amount" })}
                    />
                </div>
            </div>
            {draft.mode === "totalPrice" ? (
                <div className="flex min-h-[52px] items-center gap-3 px-4 py-2">
                    <span className="flex-shrink-0 text-[15px] text-ink">
                        {t("loan-house-price")}
                    </span>
                    <AmountCell
                        ariaLabel={t("loan-house-price")}
                        value={draft.housePrice}
                        onCommit={(n) => edit({ housePrice: n })}
                    />
                </div>
            ) : (
                <div className="flex min-h-[52px] items-center gap-3 px-4 py-2">
                    <span className="flex-shrink-0 text-[15px] text-ink">
                        {t("loan-principal")}
                    </span>
                    <AmountCell
                        ariaLabel={t("loan-principal")}
                        value={draft.amount}
                        onCommit={(n) => edit({ amount: n })}
                    />
                </div>
            )}
            {draft.mode === "totalPrice" && (
                <button
                    type="button"
                    data-loan-row="down"
                    className="flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 px-4 py-2 text-left"
                    onClick={() => onOpenSheet("down")}
                >
                    <span className="flex-shrink-0 text-[15px] text-ink">
                        {t("loan-down-payment")}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                        <span className="text-xs text-ink-secondary tabular-nums">
                            {fmtWan(draft.housePrice * draft.downRatio)} 万
                        </span>
                        <span className="text-[15px] font-semibold text-ink tabular-nums">
                            {Math.round(draft.downRatio * 100)}%
                        </span>
                        <RowChevron />
                    </div>
                </button>
            )}
            {isCombo && (
                <>
                    <div className="flex min-h-[52px] items-center gap-3 px-4 py-2">
                        <span className="flex-shrink-0 text-[15px] text-ink">
                            {t("loan-type-fund")}
                        </span>
                        <AmountCell
                            ariaLabel={t("loan-type-fund")}
                            value={draft.fundAmount}
                            onCommit={(n) => edit({ fundAmount: n })}
                        />
                    </div>
                    <div className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-2">
                        <span className="flex-shrink-0 text-[15px] text-ink">
                            {t("loan-type-commercial")}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className="rounded-full bg-ground-muted px-2 py-0.5 text-[11px] text-ink-secondary">
                                {t("loan-commercial-auto")}
                            </span>
                            <span className="text-[15px] text-ink-secondary tabular-nums">
                                {fmtWan(derived.commercialWan)} 万
                            </span>
                        </div>
                    </div>
                    {fundClamped && (
                        <div className="px-4 py-1.5 text-[11px] text-[#ef4444]">
                            {t("loan-fund-cap-hint")}
                        </div>
                    )}
                </>
            )}
            <button
                type="button"
                data-loan-row="term"
                className="flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 px-4 py-2 text-left"
                onClick={() => onOpenSheet("term")}
            >
                <span className="flex-shrink-0 text-[15px] text-ink">
                    {t("loan-term")}
                </span>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                    <span className="text-xs text-ink-secondary tabular-nums">
                        {t("loan-period-n", { n: derived.months })}
                    </span>
                    <span className="text-[15px] font-semibold text-ink tabular-nums">
                        {t("loan-years-n", { n: draft.termYears })}
                    </span>
                    <RowChevron />
                </div>
            </button>
            {draft.loanType !== "fund" && (
                <button
                    type="button"
                    data-loan-row="commercial-rate"
                    className="flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 px-4 py-2 text-left"
                    onClick={() => onOpenSheet("rateCommercial")}
                >
                    <span className="flex-shrink-0 text-[15px] text-ink">
                        {t("loan-commercial-rate")}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                        <span className="text-xs text-ink-secondary tabular-nums">
                            LPR {draft.lpr}% {draft.bp >= 0 ? "+" : "−"}
                            {Math.abs(draft.bp)} BP
                        </span>
                        <span className="text-[15px] font-semibold text-ink tabular-nums">
                            {fmtWan(derived.commercialRate)}%
                        </span>
                        <RowChevron />
                    </div>
                </button>
            )}
            {draft.loanType !== "commercial" && (
                <button
                    type="button"
                    data-loan-row="fund-rate"
                    className="flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 px-4 py-2 text-left"
                    onClick={() => onOpenSheet("rateFund")}
                >
                    <span className="flex-shrink-0 text-[15px] text-ink">
                        {t("loan-fund-rate")}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                        <span className="text-xs text-ink-secondary">
                            {t(
                                draft.fundSuite === "first"
                                    ? "loan-suite-first"
                                    : "loan-suite-second",
                            )}
                        </span>
                        <span className="text-[15px] font-semibold text-ink tabular-nums">
                            {fmtWan(draft.fundRate)}%
                        </span>
                        <RowChevron />
                    </div>
                </button>
            )}
            <button
                type="button"
                data-loan-row="first-pay"
                className="flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 px-4 py-2 text-left"
                onClick={() => onOpenSheet("firstPay")}
            >
                <span className="flex-shrink-0 text-[15px] text-ink">
                    {t("loan-first-pay")}
                </span>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                    <span className="text-[15px] font-semibold text-ink tabular-nums">
                        {t("loan-ym", {
                            year: derived.firstPay.year,
                            month: derived.firstPay.month,
                        })}
                    </span>
                    <RowChevron />
                </div>
            </button>
        </div>
    );
}
