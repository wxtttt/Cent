import { useEffect, useState } from "react";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { RowChevron } from "../form-rows";
import type { LoanDraft, LoanMode, LoanType } from "./model";
import {
    GROUP_TITLE,
    LOAN_CARD,
    PICK_OFF,
    PICK_ON,
    ROW,
    ROW_LEFT,
    ROW_MUTED,
    ROW_VALUE,
    SEG_GROUP,
    SEG_ITEM,
    SEG_OFF,
    SEG_ON,
} from "./styles";

const fmtWan = (v: number) =>
    v.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });

/** 输入缓冲：外部值变化（切方案 / 联动换算）时重同步 */
function useNumberText(value: number) {
    const [text, setText] = useState(() =>
        String(Math.round(value * 100) / 100),
    );
    // biome-ignore lint/correctness/useExhaustiveDependencies: 只跟随 value 重同步
    useEffect(() => {
        const parsed = Number(text);
        if (!(Number.isFinite(parsed) && Math.abs(parsed - value) < 1e-9)) {
            setText(String(Math.round(value * 100) / 100));
        }
    }, [value]);
    return [text, setText] as const;
}

/** 行内数字输入（无边框、右对齐、聚焦全选），单位由外面补 */
export function NumberCell({
    value,
    onCommit,
    ariaLabel,
    suffix,
    className,
    max,
    min = 0,
}: {
    value: number;
    onCommit: (n: number) => void;
    ariaLabel: string;
    suffix?: string;
    className?: string;
    max?: number;
    min?: number;
}) {
    const [text, setText] = useNumberText(value);
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
                    if (Number.isFinite(parsed) && parsed >= 0) {
                        let next = parsed;
                        if (max !== undefined) next = Math.min(next, max);
                        if (next < min) next = min;
                        onCommit(Math.round(next * 100) / 100);
                    }
                }}
                className={cn(
                    "min-w-0 max-w-40 flex-1 cursor-text bg-transparent text-right text-[17px] font-semibold text-ink tabular-nums outline-none",
                    className,
                )}
            />
            {suffix && (
                <span className="flex-shrink-0 text-sm text-ink-secondary">
                    {suffix}
                </span>
            )}
        </div>
    );
}

const TYPES: LoanType[] = ["commercial", "fund", "combo"];

/** 贷款类型：纯文字三选一。图标与「商业贷款 / 公积金」没有语义关系，已去掉 */
export function TypePicker({
    value,
    onChange,
}: {
    value: LoanType;
    onChange: (t: LoanType) => void;
}) {
    const t = useIntl();
    return (
        <div data-loan-type-row className="grid grid-cols-3 gap-2">
            {TYPES.map((type) => (
                <button
                    key={type}
                    type="button"
                    data-loan-type={type}
                    className={cn(
                        "cursor-pointer rounded-full border py-2.5 text-center text-[14px] transition-colors",
                        value === type ? PICK_ON : PICK_OFF,
                    )}
                    onClick={() => onChange(type)}
                >
                    {t(
                        type === "commercial"
                            ? "loan-type-commercial"
                            : type === "fund"
                              ? "loan-type-fund"
                              : "loan-type-combo",
                    )}
                </button>
            ))}
        </div>
    );
}

/** 计算方式 / 还款方式 / 首付口径：全站分段控件同形 */
export function Segmented<T extends string>({
    value,
    options,
    onChange,
    className,
}: {
    value: T;
    options: { value: T; label: string }[];
    onChange: (v: T) => void;
    className?: string;
}) {
    return (
        <div className={cn(SEG_GROUP, className)}>
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    data-loan-seg={o.value}
                    className={cn(
                        SEG_ITEM,
                        value === o.value ? SEG_ON : SEG_OFF,
                    )}
                    onClick={() => onChange(o.value)}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

/** 计算方式 + 金额 + 首付 + 公积金额度 */
export function AmountSection({
    draft,
    derived,
    edit,
}: {
    draft: LoanDraft;
    derived: { commercialWan: number; totalWan: number };
    edit: (patch: Partial<LoanDraft>) => void;
}) {
    const t = useIntl();
    const isCombo = draft.loanType === "combo";
    const fundClamped = isCombo && draft.fundAmount > derived.totalWan + 1e-9;
    const downWan =
        draft.downMode === "amount"
            ? draft.downAmount
            : Math.round(draft.housePrice * draft.downRatio * 100) / 100;
    const downRatio =
        draft.downMode === "ratio"
            ? draft.downRatio
            : draft.housePrice > 0
              ? draft.downAmount / draft.housePrice
              : 0;

    return (
        <div className={cn("divide-y divide-rule/60", LOAN_CARD)}>
            <div className={ROW}>
                <span className={ROW_LEFT}>{t("loan-mode-label")}</span>
                <Segmented<LoanMode>
                    value={draft.mode}
                    options={[
                        {
                            value: "totalPrice",
                            label: t("loan-mode-total-price"),
                        },
                        { value: "amount", label: t("loan-mode-by-amount") },
                    ]}
                    onChange={(mode) => edit({ mode })}
                />
            </div>
            {draft.mode === "totalPrice" ? (
                <>
                    <div className={ROW}>
                        <span className={ROW_LEFT}>
                            {t("loan-house-price")}
                        </span>
                        <NumberCell
                            ariaLabel={t("loan-house-price")}
                            value={draft.housePrice}
                            onCommit={(housePrice) => edit({ housePrice })}
                            suffix="万"
                        />
                    </div>
                    {/* 首付：口径切换独占一行，数值与换算值在下面对齐，
                        避免「比例 / 金额」胶囊把 6 位数字挤到行尾 */}
                    <div className="px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                            <span className={ROW_LEFT}>
                                {t("loan-down-payment")}
                            </span>
                            <Segmented
                                className="flex-shrink-0"
                                value={draft.downMode}
                                options={[
                                    {
                                        value: "ratio" as const,
                                        label: t("loan-down-by-ratio"),
                                    },
                                    {
                                        value: "amount" as const,
                                        label: t("loan-down-by-amount"),
                                    },
                                ]}
                                onChange={(downMode) => {
                                    // 切换口径时把当前值换成另一口径的等价数值，
                                    // 避免「比例 30%」切到金额后仍显示 30 万
                                    if (downMode === "ratio") {
                                        edit({
                                            downMode,
                                            downRatio:
                                                draft.housePrice > 0
                                                    ? Math.round(
                                                          (draft.downAmount /
                                                              draft.housePrice) *
                                                              10000,
                                                      ) / 10000
                                                    : 0,
                                        });
                                    } else {
                                        edit({
                                            downMode,
                                            downAmount:
                                                Math.round(downWan * 100) / 100,
                                        });
                                    }
                                }}
                            />
                        </div>
                        <div className="mt-2 flex items-baseline justify-end gap-2">
                            <NumberCell
                                ariaLabel={t("loan-down-payment")}
                                className="max-w-28"
                                value={
                                    draft.downMode === "ratio"
                                        ? Math.round(downRatio * 10000) / 100
                                        : downWan
                                }
                                max={
                                    draft.downMode === "ratio" ? 100 : undefined
                                }
                                onCommit={(n) => {
                                    if (draft.downMode === "ratio") {
                                        const ratio = n / 100;
                                        edit({
                                            downRatio: ratio,
                                            downAmount:
                                                Math.round(
                                                    draft.housePrice *
                                                        ratio *
                                                        100,
                                                ) / 100,
                                        });
                                    } else {
                                        edit({
                                            downAmount: n,
                                            downRatio:
                                                draft.housePrice > 0
                                                    ? n / draft.housePrice
                                                    : 0,
                                        });
                                    }
                                }}
                                suffix={draft.downMode === "ratio" ? "%" : "万"}
                            />
                            <span className={cn(ROW_MUTED, "w-16 text-right")}>
                                {draft.downMode === "ratio"
                                    ? `${fmtWan(downWan)} 万`
                                    : `${Math.round(downRatio * 10000) / 100}%`}
                            </span>
                        </div>
                    </div>
                </>
            ) : (
                <div className={ROW}>
                    <span className={ROW_LEFT}>{t("loan-principal")}</span>
                    <NumberCell
                        ariaLabel={t("loan-principal")}
                        value={draft.amount}
                        onCommit={(amount) => edit({ amount })}
                        suffix="万"
                    />
                </div>
            )}
            {isCombo && (
                <>
                    <div className={ROW}>
                        <span className={ROW_LEFT}>{t("loan-type-fund")}</span>
                        <NumberCell
                            ariaLabel={t("loan-type-fund")}
                            value={draft.fundAmount}
                            onCommit={(fundAmount) => edit({ fundAmount })}
                            suffix="万"
                        />
                    </div>
                    <div className={ROW}>
                        <span className={ROW_LEFT}>
                            {t("loan-type-commercial")}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className="rounded-full bg-ground-muted px-2 py-0.5 text-[11px] text-ink-secondary">
                                {t("loan-commercial-auto")}
                            </span>
                            <span className={ROW_VALUE}>
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
        </div>
    );
}

/** 年限 / 利率 / 首期还款 / 还款方式 */
export function TermsSection({
    draft,
    derived,
    edit,
    onOpenSheet,
}: {
    draft: LoanDraft;
    derived: { months: number; commercialRate: number };
    edit: (patch: Partial<LoanDraft>) => void;
    onOpenSheet: (kind: "term" | "rateCommercial" | "rateFund") => void;
}) {
    const t = useIntl();
    const monthValue = `${draft.firstPay.year}-${`${draft.firstPay.month}`.padStart(2, "0")}`;
    return (
        <div className={cn("divide-y divide-rule/60", LOAN_CARD)}>
            <button
                type="button"
                data-loan-row="term"
                className={cn(ROW, "cursor-pointer text-left")}
                onClick={() => onOpenSheet("term")}
            >
                <span className={ROW_LEFT}>{t("loan-term")}</span>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                    <span className={ROW_MUTED}>
                        {t("loan-period-n", { n: derived.months })}
                    </span>
                    <span className={ROW_VALUE}>
                        {t("loan-years-n", { n: draft.termYears })}
                    </span>
                    <RowChevron />
                </div>
            </button>
            {draft.loanType !== "fund" && (
                <button
                    type="button"
                    data-loan-row="commercial-rate"
                    className={cn(ROW, "cursor-pointer text-left")}
                    onClick={() => onOpenSheet("rateCommercial")}
                >
                    <div className="min-w-0">
                        <div className={ROW_LEFT}>
                            {t("loan-commercial-rate")}
                        </div>
                        <div className="mt-0.5 text-[11px] text-ink-secondary tabular-nums">
                            LPR {draft.lpr}% {draft.bp >= 0 ? "+" : "−"}
                            {Math.abs(draft.bp)} BP
                        </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                        <span className={ROW_VALUE}>
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
                    className={cn(ROW, "cursor-pointer text-left")}
                    onClick={() => onOpenSheet("rateFund")}
                >
                    <div className="min-w-0">
                        <div className={ROW_LEFT}>{t("loan-fund-rate")}</div>
                        <div className="mt-0.5 text-[11px] text-ink-secondary">
                            {t(
                                draft.fundSuite === "first"
                                    ? "loan-suite-first"
                                    : "loan-suite-second",
                            )}
                        </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                        <span className={ROW_VALUE}>
                            {fmtWan(draft.fundRate)}%
                        </span>
                        <RowChevron />
                    </div>
                </button>
            )}
            <div className={ROW}>
                <span className={ROW_LEFT}>{t("loan-first-pay")}</span>
                {/* 首期还款只要年月，系统 month 控件在 iOS / Android 都是原生滚轮；
                    隐藏 webkit 日历图标，整行仍可点开 */}
                <input
                    type="month"
                    aria-label={t("loan-first-pay")}
                    value={monthValue}
                    onChange={(e) => {
                        const [year, month] = e.target.value
                            .split("-")
                            .map(Number);
                        if (year && month) {
                            edit({ firstPay: { year, month } });
                        }
                    }}
                    className="min-w-0 cursor-pointer bg-transparent text-right text-[15px] dp-text-medium text-ink tabular-nums outline-none [color-scheme:light] [&::-webkit-calendar-picker-indicator]:hidden"
                />
            </div>
            <div className={ROW}>
                <span className={ROW_LEFT}>{t("loan-method-label")}</span>
                <Segmented
                    value={draft.method}
                    options={[
                        {
                            value: "installment" as const,
                            label: t("loan-method-installment"),
                        },
                        {
                            value: "principal" as const,
                            label: t("loan-method-principal"),
                        },
                    ]}
                    onChange={(method) => edit({ method })}
                />
            </div>
        </div>
    );
}

export { GROUP_TITLE };
