import { useEffect, useRef, useState } from "react";
import type {
    SavedLoanPlan,
    SavedLoanPrepay,
    SavedLoanRateChange,
} from "@/ledger/extra-type";
import { simulatePrepay } from "@/ledger/loan";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import {
    BTN_PRIMARY,
    BTN_SECONDARY,
    BTN_TAP,
    SHEET_FOOTER,
} from "../button-styles";
import createConfirmProvider from "../confirm";
import { createDeleteConfirm } from "../delete-confirm";
import { RowChevron } from "../form-rows";
import { SheetCard, SheetHint, SheetRow, SheetShell } from "../sheet-kit";
import { LOAN_PLAN_ICONS, planIconSrc } from "./icons";
import {
    type DownMode,
    deriveLoan,
    downRatioOf,
    downWanOf,
    FUND_SUITE_RATES,
    LATEST_LPR,
    type LoanDraft,
    periodOfYm,
    toDraft,
    tracksOf,
} from "./model";
import { MonthField } from "./month-field";
import { Segmented } from "./sections";

// APK 式滚轮：行高约等于选中胶囊高度，窗口露出 5 行，上下边缘渐隐
const ITEM_HEIGHT = 36;
const VISIBLE_ROWS = 5;
const WINDOW_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;

const TERM_YEARS = Array.from({ length: 30 }, (_, i) => i + 1);

const fmtMoney = (v: number) =>
    v.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
const fmt2 = (v: number) =>
    v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
const round2 = (v: number) => Math.round(v * 100) / 100;
const fmtWan = (v: number) =>
    v.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });

/** 删除二次确认：本模块独立实例，避免和预算 / 分类的确认叠在一起 */
export const [LoanDeleteProvider, showLoanDelete] = createDeleteConfirm();

/** 抽屉入参 */
export type LoanSheetValue =
    | { type: "term"; years: number }
    | { type: "commercialRate"; draft: LoanDraft }
    | { type: "fundRate"; draft: LoanDraft }
    | { type: "down"; draft: LoanDraft }
    | { type: "prepay"; draft: LoanDraft; initial?: SavedLoanPrepay }
    | { type: "rateChange"; draft: LoanDraft; initial?: SavedLoanRateChange }
    | {
          type: "save";
          mode: "create" | "rename";
          draft: LoanDraft;
          defaultName: string;
          defaultIcon?: string;
      }
    | { type: "switch"; plans: SavedLoanPlan[]; activeId?: string }
    | { type: "menu"; planName: string };

/**
 * 抽屉返回值：统一带 `kind` 判别，调用方 switch 一次即可。
 * 删除不在这里做二次确认的话会穿两层弹层，所以确认在抽屉内部完成，
 * 这里只返回 `delete`。
 */
export type LoanSheetResult =
    | { kind: "term"; years: number }
    | { kind: "commercialRate"; lpr: number; bp: number }
    | { kind: "fundRate"; suite: "first" | "second"; rate: number }
    | { kind: "down"; mode: DownMode; ratio: number; amount: number }
    | {
          kind: "prepay";
          year: number;
          month: number;
          amountWan: number;
          mode: SavedLoanPrepay["mode"];
      }
    | {
          kind: "rateChange";
          year: number;
          month: number;
          commercialRate: number;
          fundRate?: number;
      }
    | { kind: "saved"; name: string; icon?: string }
    | { kind: "plan"; plan: SavedLoanPlan }
    | { kind: "create" }
    | { kind: "edit" }
    | { kind: "delete" };

function WheelColumn({
    items,
    index,
    onIndexChange,
}: {
    items: string[];
    index: number;
    onIndexChange: (index: number) => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const settleTimer = useRef<number | undefined>(undefined);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const target = index * ITEM_HEIGHT;
        if (Math.abs(el.scrollTop - target) > 1) {
            el.scrollTo({ top: target });
        }
    }, [index]);

    const handleScroll = () => {
        const el = ref.current;
        if (!el) return;
        window.clearTimeout(settleTimer.current);
        settleTimer.current = window.setTimeout(() => {
            const next = Math.round(el.scrollTop / ITEM_HEIGHT);
            const clamped = Math.max(0, Math.min(items.length - 1, next));
            if (clamped !== index) {
                onIndexChange(clamped);
            }
        }, 120);
    };

    return (
        <div
            ref={ref}
            onScroll={handleScroll}
            className="scrollbar-hidden snap-y snap-mandatory overscroll-contain overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_36%,black_64%,transparent)]"
            style={{ height: WINDOW_HEIGHT }}
        >
            <div
                style={{ height: (WINDOW_HEIGHT - ITEM_HEIGHT) / 2 }}
                aria-hidden
            />
            {items.map((label, i) => (
                <button
                    // biome-ignore lint/suspicious/noArrayIndexKey: 滚轮行按位置定位
                    key={i}
                    type="button"
                    tabIndex={-1}
                    onClick={() =>
                        ref.current?.scrollTo({
                            top: i * ITEM_HEIGHT,
                            behavior: "smooth",
                        })
                    }
                    className={cn(
                        "flex w-full snap-center items-center justify-center rounded-full text-[17px]",
                        i === index
                            ? "bg-panel dp-text-medium text-ink shadow-[0_1px_6px_rgba(92,62,30,0.10)]"
                            : "text-ink-secondary",
                    )}
                    style={{ height: ITEM_HEIGHT }}
                >
                    {label}
                </button>
            ))}
            <div
                style={{ height: (WINDOW_HEIGHT - ITEM_HEIGHT) / 2 }}
                aria-hidden
            />
        </div>
    );
}

/** 年限滚轮（30 个选项切 chip 太挤，这里保留滚轮） */
function TermForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit: Extract<LoanSheetValue, { type: "term" }>;
    onCancel?: () => void;
    onConfirm?: (v: LoanSheetResult) => void;
}) {
    const t = useIntl();
    const [index, setIndex] = useState(() =>
        Math.max(0, TERM_YEARS.indexOf(edit.years)),
    );
    return (
        <SheetShell
            title={t("loan-term")}
            onCancel={onCancel}
            onConfirm={() =>
                onConfirm?.({ kind: "term", years: TERM_YEARS[index] })
            }
        >
            <div className="flex items-stretch px-1 [&>*]:flex-1">
                <WheelColumn
                    items={TERM_YEARS.map((y) =>
                        t("loan-term-option", { years: y, months: y * 12 }),
                    )}
                    index={index}
                    onIndexChange={setIndex}
                />
            </div>
        </SheetShell>
    );
}

const BP_PRESETS = [-50, -45, -30, 0, 30];

/** 商贷利率抽屉：LPR 可编辑 + 加减点步进 + BP 快捷片 */
function CommercialRateForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit: Extract<LoanSheetValue, { type: "commercialRate" }>;
    onCancel?: () => void;
    onConfirm?: (v: LoanSheetResult) => void;
}) {
    const t = useIntl();
    const [lprText, setLprText] = useState(`${edit.draft.lpr}`);
    const [bp, setBp] = useState(edit.draft.bp);
    const lprNumber = Number(lprText);
    const lprValid =
        Number.isFinite(lprNumber) && lprNumber > 0 && lprNumber < 20;
    const isCustom = lprValid && Math.abs(lprNumber - LATEST_LPR.value) > 1e-9;
    const rate = lprValid ? lprNumber + bp / 100 : undefined;
    return (
        <SheetShell
            title={t("loan-commercial-rate")}
            onCancel={onCancel}
            confirmDisabled={!lprValid}
            onConfirm={() =>
                onConfirm?.({ kind: "commercialRate", lpr: lprNumber, bp })
            }
        >
            <div className="mb-4 text-center">
                <div className="font-display text-4xl font-bold text-brand tabular-nums">
                    {rate !== undefined ? `${fmt2(rate)}%` : "--"}
                </div>
                <div className="mt-1 text-xs text-ink-secondary tabular-nums">
                    LPR {fmt2(lprValid ? lprNumber : 0)}% {bp >= 0 ? "+" : "−"}
                    {Math.abs(bp)} BP
                </div>
            </div>
            <SheetCard>
                <SheetRow label="LPR">
                    <input
                        aria-label="LPR"
                        inputMode="decimal"
                        className="w-20 cursor-text bg-transparent text-right text-[17px] dp-text-medium text-ink tabular-nums outline-none"
                        value={lprText}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) => setLprText(e.target.value)}
                    />
                    <span className="text-sm text-ink-secondary">%</span>
                    <span className="text-[11px] text-ink-secondary">
                        {t("loan-lpr-tenor")}
                    </span>
                </SheetRow>
                <SheetRow label={t("loan-bp-label")}>
                    <button
                        type="button"
                        aria-label={t("loan-bp-minus")}
                        className={BTN_TAP}
                        onClick={() => setBp((v) => Math.max(-200, v - 5))}
                    >
                        −
                    </button>
                    <span className="min-w-16 text-center text-[15px] dp-text-medium text-ink tabular-nums">
                        {bp >= 0 ? "+" : "−"}
                        {Math.abs(bp)} BP
                    </span>
                    <button
                        type="button"
                        aria-label={t("loan-bp-plus")}
                        className={BTN_TAP}
                        onClick={() => setBp((v) => Math.min(200, v + 5))}
                    >
                        +
                    </button>
                </SheetRow>
            </SheetCard>
            <div className="mt-3 grid grid-cols-5 gap-2">
                {BP_PRESETS.map((p) => (
                    <button
                        key={p}
                        type="button"
                        className={cn(
                            "rounded-full border py-2 text-[13px] tabular-nums transition-colors",
                            bp === p
                                ? "border-brand bg-brand/10 text-brand"
                                : "border-rule bg-panel text-ink",
                        )}
                        onClick={() => setBp(p)}
                    >
                        {p >= 0 ? "+" : "−"}
                        {Math.abs(p)}
                    </button>
                ))}
            </div>
            <SheetHint className="mt-3">
                <p className="text-[12px] leading-relaxed text-ink-secondary">
                    {isCustom
                        ? t("loan-rate-note-custom", {
                              lpr: fmt2(lprNumber),
                          })
                        : t("loan-rate-note-policy", {
                              date: LATEST_LPR.date,
                              lpr: fmt2(LATEST_LPR.value),
                          })}
                </p>
            </SheetHint>
        </SheetShell>
    );
}

/** 公积金利率抽屉：首套 / 二套政策卡 + 利率可微调 */
function FundRateForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit: Extract<LoanSheetValue, { type: "fundRate" }>;
    onCancel?: () => void;
    onConfirm?: (v: LoanSheetResult) => void;
}) {
    const t = useIntl();
    const [suite, setSuite] = useState<"first" | "second">(
        edit.draft.fundSuite,
    );
    const [rateText, setRateText] = useState(`${edit.draft.fundRate}`);
    const rateNumber = Number(rateText);
    const rateValid =
        Number.isFinite(rateNumber) && rateNumber > 0 && rateNumber < 20;
    return (
        <SheetShell
            title={t("loan-fund-rate")}
            onCancel={onCancel}
            confirmDisabled={!rateValid}
            onConfirm={() =>
                onConfirm?.({ kind: "fundRate", suite, rate: rateNumber })
            }
        >
            <div className="grid grid-cols-2 gap-2">
                {(["first", "second"] as const).map((s) => (
                    <button
                        key={s}
                        type="button"
                        className={cn(
                            "rounded-2xl border py-3 text-center text-[15px] dp-text-medium tabular-nums transition-colors",
                            suite === s
                                ? "border-brand bg-brand/10 text-brand"
                                : "border-rule bg-panel text-ink",
                        )}
                        onClick={() => {
                            setSuite(s);
                            setRateText(`${FUND_SUITE_RATES[s]}`);
                        }}
                    >
                        {t(
                            s === "first"
                                ? "loan-suite-first-card"
                                : "loan-suite-second-card",
                        )}{" "}
                        {FUND_SUITE_RATES[s]}%
                    </button>
                ))}
            </div>
            <SheetCard className="mt-3">
                <SheetRow label={t("loan-fund-rate-input")}>
                    <input
                        aria-label={t("loan-fund-rate-input")}
                        inputMode="decimal"
                        className="w-20 cursor-text bg-transparent text-right text-[17px] dp-text-medium text-ink tabular-nums outline-none"
                        value={rateText}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) => setRateText(e.target.value)}
                    />
                    <span className="text-sm text-ink-secondary">%</span>
                </SheetRow>
            </SheetCard>
            <SheetHint className="mt-3">
                <p className="text-[12px] leading-relaxed text-ink-secondary">
                    {t("loan-fund-rate-note")}
                </p>
            </SheetHint>
        </SheetShell>
    );
}

/**
 * 首付抽屉：比例 / 金额两种口径在这里切，编辑页只显示结果。
 * 切换口径时把当前值换成等价数值，避免「30%」切到金额后仍是 30 万。
 */
function DownPaymentForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit: Extract<LoanSheetValue, { type: "down" }>;
    onCancel?: () => void;
    onConfirm?: (v: LoanSheetResult) => void;
}) {
    const t = useIntl();
    const draft = edit.draft;
    const [mode, setMode] = useState<DownMode>(draft.downMode);
    const [text, setText] = useState(
        `${draft.downMode === "ratio" ? round2(downRatioOf(draft) * 100) : downWanOf(draft)}`,
    );

    const n = Math.max(0, Number(text) || 0);
    const ratio =
        mode === "ratio"
            ? Math.min(1, Math.max(0, n / 100))
            : draft.housePrice > 0
              ? Math.min(1, n / draft.housePrice)
              : 0;
    const amount = round2(
        mode === "ratio"
            ? draft.housePrice * ratio
            : Math.min(n, draft.housePrice),
    );

    const switchMode = (next: DownMode) => {
        if (next === mode) return;
        setMode(next);
        setText(`${next === "ratio" ? round2(ratio * 100) : round2(amount)}`);
    };

    return (
        <SheetShell
            title={t("loan-down-payment")}
            onCancel={onCancel}
            confirmDisabled={n <= 0}
            onConfirm={() => onConfirm?.({ kind: "down", mode, ratio, amount })}
        >
            <SheetCard>
                <SheetRow label={t("loan-down-mode-label")}>
                    <Segmented<DownMode>
                        value={mode}
                        options={[
                            {
                                value: "ratio",
                                label: t("loan-down-by-ratio"),
                            },
                            {
                                value: "amount",
                                label: t("loan-down-by-amount"),
                            },
                        ]}
                        onChange={switchMode}
                    />
                </SheetRow>
                <SheetRow
                    label={
                        mode === "ratio"
                            ? t("loan-down-by-ratio")
                            : t("loan-down-by-amount")
                    }
                >
                    <input
                        aria-label={
                            mode === "ratio"
                                ? t("loan-down-by-ratio")
                                : t("loan-down-by-amount")
                        }
                        inputMode="decimal"
                        value={text}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) =>
                            setText(e.target.value.replace(/[^\d.]/g, ""))
                        }
                        className="w-28 cursor-text bg-transparent text-right text-[20px] font-semibold text-ink tabular-nums outline-none"
                    />
                    <span className="text-sm text-ink-secondary">
                        {mode === "ratio" ? "%" : t("loan-wan")}
                    </span>
                </SheetRow>
            </SheetCard>
            <SheetHint className="mt-3">
                <p className="text-[13px] text-ink tabular-nums">
                    {mode === "ratio"
                        ? t("loan-down-equiv-amount", {
                              amount: `${round2(amount)}`,
                          })
                        : t("loan-down-equiv-ratio", {
                              ratio: `${round2(ratio * 100)}`,
                          })}
                </p>
            </SheetHint>
        </SheetShell>
    );
}

const PREPAY_MODES: { key: SavedLoanPrepay["mode"]; label: string }[] = [
    { key: "shorten", label: "loan-prepay-mode-shorten" },
    { key: "reduceMonthly", label: "loan-prepay-mode-reduce" },
    { key: "payoff", label: "loan-prepay-mode-payoff" },
];

/**
 * 提前还款抽屉：时间 / 金额 / 还款后方式同在一张卡里，
 * 时间走全站滚轮；已有记录时底栏左侧直接是「删除」。
 */
function PrepayForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit: Extract<LoanSheetValue, { type: "prepay" }>;
    onCancel?: () => void;
    onConfirm?: (v: LoanSheetResult) => void;
}) {
    const t = useIntl();
    const { draft, initial } = edit;

    const derived = deriveLoan(draft);
    const defaultYm = derived.next?.ym ?? draft.firstPay;
    const [ym, setYm] = useState(
        initial ? { year: initial.year, month: initial.month } : defaultYm,
    );
    const [amountText, setAmountText] = useState(
        initial ? `${round2(initial.amount / 10000)}` : "20",
    );
    const [mode, setMode] = useState<SavedLoanPrepay["mode"]>(
        initial?.mode ?? "shorten",
    );

    const { commercialInput, fundInput } = tracksOf(draft);
    const track =
        draft.loanType === "fund"
            ? (fundInput ?? commercialInput)
            : commercialInput;
    const startPeriod = Math.max(
        1,
        Math.min(
            periodOfYm(draft.firstPay, ym),
            Math.max(1, derived.months - 1),
        ),
    );
    const amountWan = Math.max(0, Number(amountText) || 0);
    const preview = simulatePrepay(track, draft.method, {
        mode,
        extraAmount: amountWan * 10000,
        startMonth: startPeriod,
    });

    const remove = async () => {
        const ok = await showLoanDelete({
            title: t("loan-prepay-delete"),
            description: t("loan-prepay-delete-desc"),
        }).catch(() => false);
        if (ok) onConfirm?.({ kind: "delete" });
    };

    return (
        <SheetShell
            title={initial ? t("loan-prepay-title") : t("loan-prepay-add")}
            onCancel={initial ? () => void remove() : onCancel}
            cancelLabel={initial ? t("delete") : undefined}
            cancelDanger={Boolean(initial)}
            confirmDisabled={mode !== "payoff" && amountWan <= 0}
            onConfirm={() =>
                onConfirm?.({
                    kind: "prepay",
                    year: ym.year,
                    month: ym.month,
                    amountWan,
                    mode,
                })
            }
        >
            <SheetCard>
                <SheetRow label={t("loan-prepay-date")}>
                    <span className="text-[12px] text-ink-secondary tabular-nums">
                        {t("loan-prepay-period", { n: startPeriod })}
                    </span>
                    <MonthField
                        value={ym}
                        onChange={setYm}
                        title={t("loan-prepay-date")}
                        years={[
                            draft.firstPay.year - 1,
                            draft.firstPay.year + draft.termYears,
                        ]}
                    />
                </SheetRow>
                <SheetRow
                    label={
                        mode === "payoff"
                            ? t("loan-prepay-payoff-amount")
                            : t("loan-prepay-amount-label")
                    }
                >
                    {mode === "payoff" ? (
                        <span className="text-[15px] dp-text-medium text-ink tabular-nums">
                            ¥
                            {fmtMoney(
                                preview.payoffAmount ??
                                    derived.remainingPrincipal,
                            )}
                        </span>
                    ) : (
                        <>
                            <input
                                aria-label={t("loan-prepay-amount-label")}
                                inputMode="decimal"
                                value={amountText}
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) =>
                                    setAmountText(
                                        e.target.value.replace(/[^\d.]/g, ""),
                                    )
                                }
                                className="w-20 cursor-text bg-transparent text-right text-[17px] dp-text-medium text-ink tabular-nums outline-none"
                            />
                            <span className="text-sm text-ink-secondary">
                                {t("loan-wan")}
                            </span>
                        </>
                    )}
                </SheetRow>
                <SheetRow label={t("loan-prepay-after")}>
                    <div className="flex gap-1.5">
                        {PREPAY_MODES.map((m) => (
                            <button
                                key={m.key}
                                type="button"
                                data-loan-prepay-mode={m.key}
                                className={cn(
                                    "cursor-pointer rounded-full border px-2.5 py-1 text-[12px] transition-colors",
                                    mode === m.key
                                        ? "border-brand bg-brand/10 text-brand"
                                        : "border-rule bg-panel text-ink",
                                )}
                                onClick={() => setMode(m.key)}
                            >
                                {t(m.label)}
                            </button>
                        ))}
                    </div>
                </SheetRow>
            </SheetCard>

            <SheetHint className="mt-3" data-loan-prepay-preview>
                <p className="text-[13px] leading-relaxed text-ink">
                    {mode === "payoff"
                        ? t("loan-prepay-preview-payoff", {
                              period: startPeriod,
                              amount: `¥${fmtMoney(preview.payoffAmount ?? 0)}`,
                          })
                        : t("loan-prepay-preview-saved", {
                              amount: `¥${fmtMoney(preview.savedInterest)}`,
                          })}
                    {mode === "shorten" &&
                        preview.monthsShortened > 0 &&
                        `，${t("loan-prepay-shortened", { n: preview.monthsShortened })}`}
                    {mode === "reduceMonthly" &&
                        preview.newMonthly !== undefined &&
                        `，${t("loan-prepay-new-monthly", {
                            amount: `¥${fmt2(preview.newMonthly)}`,
                        })}`}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">
                    {t("loan-prepay-note")}
                </p>
            </SheetHint>
        </SheetShell>
    );
}

/** 利率调整抽屉：从某年某月起按新利率继续还款（默认次年 1 月，对应常见的重定价日） */
function RateChangeForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit: Extract<LoanSheetValue, { type: "rateChange" }>;
    onCancel?: () => void;
    onConfirm?: (v: LoanSheetResult) => void;
}) {
    const t = useIntl();
    const { draft, initial } = edit;
    const [ym, setYm] = useState(
        initial
            ? { year: initial.year, month: initial.month }
            : {
                  year: Math.max(
                      draft.firstPay.year + 1,
                      new Date().getFullYear(),
                  ),
                  month: 1,
              },
    );
    const [rateText, setRateText] = useState(
        `${
            initial?.commercialRate ??
            Math.round((draft.lpr + draft.bp / 100) * 100) / 100
        }`,
    );
    const [fundText, setFundText] = useState(
        `${initial?.fundRate ?? draft.fundRate}`,
    );

    const commercialRate = Number(rateText);
    const fundRate = Number(fundText);
    const valid =
        Number.isFinite(commercialRate) &&
        commercialRate > 0 &&
        commercialRate < 20 &&
        (draft.loanType === "commercial" ||
            (Number.isFinite(fundRate) && fundRate > 0 && fundRate < 20));

    const period = Math.max(1, periodOfYm(draft.firstPay, ym));
    const previewRow = valid
        ? deriveLoan({
              ...draft,
              rateChanges: [
                  ...draft.rateChanges,
                  {
                      id: "__preview",
                      year: ym.year,
                      month: ym.month,
                      commercialRate,
                      fundRate:
                          draft.loanType === "commercial"
                              ? undefined
                              : fundRate,
                  },
              ],
          }).rows[period - 1]
        : undefined;

    const remove = async () => {
        const ok = await showLoanDelete({
            title: t("loan-rate-delete"),
            description: t("loan-rate-delete-desc"),
        }).catch(() => false);
        if (ok) onConfirm?.({ kind: "delete" });
    };

    return (
        <SheetShell
            title={initial ? t("loan-rate-edit") : t("loan-rate-add")}
            onCancel={initial ? () => void remove() : onCancel}
            cancelLabel={initial ? t("delete") : undefined}
            cancelDanger={Boolean(initial)}
            confirmDisabled={!valid}
            onConfirm={() =>
                onConfirm?.({
                    kind: "rateChange",
                    year: ym.year,
                    month: ym.month,
                    commercialRate,
                    fundRate:
                        draft.loanType === "commercial" ? undefined : fundRate,
                })
            }
        >
            <SheetCard>
                <SheetRow label={t("loan-rate-change-from")}>
                    <span className="text-[12px] text-ink-secondary tabular-nums">
                        {t("loan-rate-item-period", { n: period })}
                    </span>
                    <MonthField
                        value={ym}
                        onChange={setYm}
                        title={t("loan-rate-change-from")}
                        years={[
                            draft.firstPay.year - 1,
                            draft.firstPay.year + draft.termYears,
                        ]}
                    />
                </SheetRow>
                <SheetRow
                    label={
                        draft.loanType === "commercial"
                            ? t("loan-commercial-rate")
                            : t("loan-detail-rate-combo")
                    }
                >
                    <input
                        aria-label={t("loan-rate-change-new")}
                        inputMode="decimal"
                        value={rateText}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) => setRateText(e.target.value)}
                        className="w-20 cursor-text bg-transparent text-right text-[17px] dp-text-medium text-ink tabular-nums outline-none"
                    />
                    <span className="text-sm text-ink-secondary">%</span>
                </SheetRow>
                {draft.loanType !== "commercial" && (
                    <SheetRow label={t("loan-fund-rate")}>
                        <input
                            aria-label={t("loan-fund-rate")}
                            inputMode="decimal"
                            value={fundText}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) => setFundText(e.target.value)}
                            className="w-20 cursor-text bg-transparent text-right text-[17px] dp-text-medium text-ink tabular-nums outline-none"
                        />
                        <span className="text-sm text-ink-secondary">%</span>
                    </SheetRow>
                )}
            </SheetCard>
            <SheetHint className="mt-3">
                <p className="text-[13px] leading-relaxed text-ink">
                    {previewRow
                        ? t("loan-rate-change-preview", {
                              period,
                              amount: `¥${fmt2(previewRow.payment)}`,
                          })
                        : t("loan-rate-change-invalid")}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">
                    {t("loan-rate-change-note")}
                </p>
            </SheetHint>
        </SheetShell>
    );
}

/**
 * 保存 / 改名方案：摘要卡 + 名称 + 图标横向滑动（右缘渐隐，无进度条）
 * + 单颗整宽按钮。保存成功只关抽屉，不弹「已保存」toast。
 */
function SavePlanForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit: Extract<LoanSheetValue, { type: "save" }>;
    onCancel?: () => void;
    onConfirm?: (v: LoanSheetResult) => void;
}) {
    const t = useIntl();
    const [name, setName] = useState(edit.defaultName);
    const [icon, setIcon] = useState<string | undefined>(edit.defaultIcon);

    const draft = edit.draft;
    const derived = deriveLoan(draft);
    const typeName = t(
        draft.loanType === "commercial"
            ? "loan-type-commercial"
            : draft.loanType === "fund"
              ? "loan-type-fund"
              : "loan-type-combo",
    );
    const methodName = t(
        draft.method === "installment"
            ? "loan-method-installment"
            : "loan-method-principal",
    );

    return (
        <SheetShell
            title={
                edit.mode === "create"
                    ? t("loan-save-plan")
                    : t("loan-manage-rename")
            }
            onCancel={onCancel}
            confirmLabel={t("save")}
            confirmDisabled={!name.trim()}
            onConfirm={() =>
                onConfirm?.({ kind: "saved", name: name.trim(), icon })
            }
            footer={
                <button
                    type="button"
                    className={cn(BTN_PRIMARY, "w-full")}
                    disabled={!name.trim()}
                    onClick={() =>
                        onConfirm?.({
                            kind: "saved",
                            name: name.trim(),
                            icon,
                        })
                    }
                >
                    {t("save")}
                </button>
            }
        >
            <div className="flex items-center gap-3 rounded-2xl bg-panel px-4 py-3 shadow-[0_1px_6px_rgba(92,62,30,0.05)]">
                <img
                    src={planIconSrc(icon, draft.loanType)}
                    alt=""
                    aria-hidden
                    className="size-10 flex-shrink-0 object-contain"
                />
                <div className="min-w-0">
                    <div className="truncate text-[15px] dp-text-medium text-ink tabular-nums">
                        {t("loan-plan-preview", {
                            type: typeName,
                            amount: `${round2(derived.totalWan)}`,
                            years: draft.termYears,
                        })}
                    </div>
                    <div className="mt-0.5 truncate text-[12px] text-ink-secondary tabular-nums">
                        {methodName} · {t("loan-hero-monthly")} ¥
                        {fmt2(derived.firstPayment)}
                    </div>
                </div>
            </div>

            <div className="mt-4 text-[12px] text-ink-secondary">
                {t("loan-plan-name")}
            </div>
            <input
                aria-label={t("loan-plan-name")}
                value={name}
                maxLength={30}
                placeholder={t("loan-plan-name-placeholder")}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 h-12 w-full rounded-[12px] border border-rule bg-panel px-4 text-[15px] text-ink outline-none placeholder:text-ink-secondary/60 focus-visible:border-brand"
            />

            <div className="mt-4 text-[12px] text-ink-secondary">
                {t("loan-pick-icon")}
            </div>
            {/* 横向滑动 + 右侧渐隐即可，不加进度条 */}
            <div className="-mx-5 mt-2">
                <div className="scrollbar-hidden flex gap-2.5 overflow-x-auto px-5 pb-1 [mask-image:linear-gradient(to_right,black_84%,transparent)]">
                    {[undefined, ...LOAN_PLAN_ICONS].map((key) => (
                        <button
                            key={key ?? "default"}
                            type="button"
                            aria-label={key ?? t("loan-icon-default")}
                            className={cn(
                                "flex size-12 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border-2 bg-ground-muted p-2 transition-colors",
                                icon === key
                                    ? "border-brand bg-brand/10"
                                    : "border-transparent",
                            )}
                            onClick={() => setIcon(key)}
                        >
                            <img
                                src={planIconSrc(key, draft.loanType)}
                                alt=""
                                aria-hidden
                                className="size-full object-contain"
                            />
                        </button>
                    ))}
                </div>
            </div>
            <div className="h-2" />
        </SheetShell>
    );
}

/** 方案选择抽屉：点标题切换，底部可以再记一笔 */
function PlanSwitcherForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit: Extract<LoanSheetValue, { type: "switch" }>;
    onCancel?: () => void;
    onConfirm?: (v: LoanSheetResult) => void;
}) {
    const t = useIntl();
    return (
        <SheetShell
            title={t("loan-plan-switch")}
            onCancel={onCancel}
            footer={
                <button
                    type="button"
                    data-loan-plan-new
                    className={cn(BTN_SECONDARY, "w-full")}
                    onClick={() => onConfirm?.({ kind: "create" })}
                >
                    {t("loan-plan-new")}
                </button>
            }
        >
            <SheetCard>
                {edit.plans.map((p) => {
                    const d = deriveLoan(toDraft(p));
                    const active = p.id === edit.activeId;
                    return (
                        <button
                            key={p.id}
                            type="button"
                            data-loan-switch-item={p.id}
                            className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors enabled:hover:bg-brand/5 enabled:active:bg-brand/10"
                            onClick={() =>
                                onConfirm?.({ kind: "plan", plan: p })
                            }
                        >
                            <img
                                src={planIconSrc(p.icon, p.loanType)}
                                alt=""
                                aria-hidden
                                className="size-9 flex-shrink-0 object-contain"
                            />
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-[15px] text-ink">
                                    {p.name}
                                </div>
                                <div className="mt-0.5 truncate text-[11px] text-ink-secondary tabular-nums">
                                    {t("loan-hero-monthly")} ¥
                                    {fmt2(d.next?.payment ?? d.firstPayment)} ·{" "}
                                    {t("loan-col-remaining")} ¥
                                    {fmtMoney(d.remainingPrincipal)}
                                </div>
                            </div>
                            {active ? (
                                <i className="icon-[lucide--check] size-4 flex-shrink-0 text-brand" />
                            ) : (
                                <i className="icon-[lucide--chevron-right] size-4 flex-shrink-0 text-ink-secondary" />
                            )}
                        </button>
                    );
                })}
            </SheetCard>
        </SheetShell>
    );
}

/** 标题右侧 ⋯ 的动作菜单：编辑贷款参数 / 删除方案 */
function LoanMenuForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit: Extract<LoanSheetValue, { type: "menu" }>;
    onCancel?: () => void;
    onConfirm?: (v: LoanSheetResult) => void;
}) {
    const t = useIntl();
    return (
        <SheetShell
            title={edit.planName}
            onCancel={onCancel}
            footer={
                <button
                    type="button"
                    className={cn(BTN_SECONDARY, "w-full")}
                    onClick={onCancel}
                >
                    {t("cancel")}
                </button>
            }
        >
            <SheetCard>
                <button
                    type="button"
                    data-loan-menu="edit"
                    className="flex min-h-[58px] w-full cursor-pointer items-center gap-3 px-4 py-2 text-left transition-colors enabled:hover:bg-brand/5 enabled:active:bg-brand/10"
                    onClick={() => onConfirm?.({ kind: "edit" })}
                >
                    <i className="icon-[lucide--pencil] size-4 text-ink" />
                    <span className="flex-1 text-[15px] text-ink">
                        {t("loan-edit-settings")}
                    </span>
                    <i className="icon-[lucide--chevron-right] size-4 text-ink-secondary/60" />
                </button>
                <button
                    type="button"
                    data-loan-menu="delete"
                    className="flex min-h-[58px] w-full cursor-pointer items-center gap-3 px-4 py-2 text-left transition-colors enabled:hover:bg-brand/5 enabled:active:bg-brand/10"
                    onClick={() => onConfirm?.({ kind: "delete" })}
                >
                    <i className="icon-[lucide--trash-2] size-4 text-[#ef4444]" />
                    <span className="flex-1 text-[15px] text-[#ef4444]">
                        {t("loan-manage-delete")}
                    </span>
                    <i className="icon-[lucide--chevron-right] size-4 text-ink-secondary/60" />
                </button>
            </SheetCard>
        </SheetShell>
    );
}

const SheetForm = ({
    edit,
    onCancel,
    onConfirm,
}: {
    edit?: LoanSheetValue;
    onCancel?: () => void;
    onConfirm?: (v: LoanSheetResult) => void;
}) => {
    if (!edit) {
        return null;
    }
    switch (edit.type) {
        case "term":
            return (
                <TermForm
                    edit={edit}
                    onCancel={onCancel}
                    onConfirm={onConfirm}
                />
            );
        case "commercialRate":
            return (
                <CommercialRateForm
                    edit={edit}
                    onCancel={onCancel}
                    onConfirm={onConfirm}
                />
            );
        case "fundRate":
            return (
                <FundRateForm
                    edit={edit}
                    onCancel={onCancel}
                    onConfirm={onConfirm}
                />
            );
        case "down":
            return (
                <DownPaymentForm
                    edit={edit}
                    onCancel={onCancel}
                    onConfirm={onConfirm}
                />
            );
        case "prepay":
            return (
                <PrepayForm
                    edit={edit}
                    onCancel={onCancel}
                    onConfirm={onConfirm}
                />
            );
        case "rateChange":
            return (
                <RateChangeForm
                    edit={edit}
                    onCancel={onCancel}
                    onConfirm={onConfirm}
                />
            );
        case "save":
            return (
                <SavePlanForm
                    edit={edit}
                    onCancel={onCancel}
                    onConfirm={onConfirm}
                />
            );
        case "switch":
            return (
                <PlanSwitcherForm
                    edit={edit}
                    onCancel={onCancel}
                    onConfirm={onConfirm}
                />
            );
        case "menu":
            return (
                <LoanMenuForm
                    edit={edit}
                    onCancel={onCancel}
                    onConfirm={onConfirm}
                />
            );
        default:
            return null;
    }
};

/**
 * 贷款页所有抽屉共用一个实例：标题 / 卡片 / 行 / 橙色提醒 / 底栏
 * 全部来自 `components/sheet-kit`，与预算管理页同一套。
 */
export const [LoanSheetProvider, showLoanSheet] = createConfirmProvider<
    LoanSheetValue,
    LoanSheetResult
>(SheetForm, {
    dialogTitle: "Loan Sheet",
    dialogModalClose: true,
    from: "bottom",
    contentClassName:
        "w-full max-w-full rounded-t-[28px] border-0 bg-ground p-0 shadow-none sm:w-[90vw] sm:max-w-[500px] sm:rounded-md",
});
