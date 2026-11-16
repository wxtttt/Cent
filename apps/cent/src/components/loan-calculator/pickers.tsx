import { useEffect, useRef, useState } from "react";
import type { SavedLoanPrepay } from "@/ledger/extra-type";
import { simulatePrepay } from "@/ledger/loan";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { BTN_PRIMARY, BTN_TAP, SHEET_FOOTER } from "../button-styles";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
} from "../ui/dialog";
import {
    deriveLoan,
    FUND_SUITE_RATES,
    LATEST_LPR,
    type LoanDraft,
    periodOfYm,
    tracksOf,
} from "./model";
import { PICK_OFF, PICK_ON, SHEET_ACTION, SHEET_SURFACE } from "./styles";

// 家小满式滚轮：行高约等于选中胶囊高度，窗口露出 5 行，上下边缘渐隐
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
const pad = (n: number) => `${n}`.padStart(2, "0");
const monthValue = (v: { year: number; month: number }) =>
    `${v.year}-${pad(v.month)}`;

function SheetHead({ title }: { title: string }) {
    return (
        <div className="relative pb-1 pt-3 text-center">
            <div className="absolute inset-x-0 top-1.5 mx-auto h-1 w-10 rounded-full bg-black/15" />
            <div className="text-[17px] font-semibold">{title}</div>
        </div>
    );
}

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

/** 年限滚轮（唯一还需要滚轮的字段：30 个选项切 chip 太挤） */
export function TermSheet({
    open,
    onOpenChange,
    value,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    value: number;
    onConfirm: (years: number) => void;
}) {
    const t = useIntl();
    const [index, setIndex] = useState(0);
    useEffect(() => {
        if (open) setIndex(Math.max(0, TERM_YEARS.indexOf(value)));
    }, [open, value]);
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay className="fixed inset-0 z-40 bg-black/50" />
                <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center">
                    <DialogContent
                        from="bottom"
                        data-loan-sheet="term"
                        className={SHEET_SURFACE}
                    >
                        <DialogTitle className="sr-only">
                            {t("loan-term")}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {t("loan-term")}
                        </DialogDescription>
                        <div className="relative flex items-center justify-between px-4 pb-2 pt-3">
                            <div className="absolute inset-x-0 top-1.5 mx-auto h-1 w-10 rounded-full bg-black/15" />
                            <button
                                type="button"
                                data-no-focus-ring
                                aria-label={t("close")}
                                className="flex size-9 items-center justify-center rounded-full bg-panel text-ink shadow-[0_2px_12px_rgba(0,0,0,0.12)] focus-visible:outline-none"
                                onClick={() => onOpenChange(false)}
                            >
                                <i className="icon-[apk--close] size-3.5" />
                            </button>
                            <span className="text-[17px] font-semibold">
                                {t("loan-term")}
                            </span>
                            <div className="size-9" />
                        </div>
                        <div className="flex items-stretch gap-2 px-4 py-2 [&>*]:flex-1">
                            <WheelColumn
                                items={TERM_YEARS.map((y) =>
                                    t("loan-term-option", {
                                        years: y,
                                        months: y * 12,
                                    }),
                                )}
                                index={index}
                                onIndexChange={setIndex}
                            />
                        </div>
                        <div className={SHEET_FOOTER}>
                            <button
                                type="button"
                                className={cn(BTN_PRIMARY, SHEET_ACTION)}
                                onClick={() => {
                                    onConfirm(TERM_YEARS[index]);
                                    onOpenChange(false);
                                }}
                            >
                                {t("confirm")}
                            </button>
                        </div>
                    </DialogContent>
                </div>
            </DialogPortal>
        </Dialog>
    );
}

const BP_PRESETS = [-50, -45, -30, 0, 30];
const trimRate = fmt2;

/** 商贷利率抽屉：LPR 可编辑 + 加减点步进 + BP 快捷片 */
export function CommercialRateSheet({
    open,
    onOpenChange,
    draft,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    draft: LoanDraft;
    onConfirm: (patch: Pick<LoanDraft, "lpr" | "bp">) => void;
}) {
    const t = useIntl();
    const [lprText, setLprText] = useState("");
    const [bp, setBp] = useState(0);
    useEffect(() => {
        if (!open) return;
        setLprText(`${draft.lpr}`);
        setBp(draft.bp);
    }, [open, draft.lpr, draft.bp]);
    const lprNumber = Number(lprText);
    const lprValid =
        Number.isFinite(lprNumber) && lprNumber > 0 && lprNumber < 20;
    const isCustom = lprValid && Math.abs(lprNumber - LATEST_LPR.value) > 1e-9;
    const rate = lprValid ? lprNumber + bp / 100 : undefined;
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay className="fixed inset-0 z-40 bg-black/50" />
                <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center">
                    <DialogContent
                        from="bottom"
                        data-loan-sheet="rate-commercial"
                        className={cn(
                            SHEET_SURFACE,
                            "max-h-[85vh] overflow-y-auto",
                        )}
                    >
                        <DialogTitle className="sr-only">
                            {t("loan-commercial-rate")}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {t("loan-commercial-rate")}
                        </DialogDescription>
                        <SheetHead title={t("loan-commercial-rate")} />
                        <div className="px-4 pt-3 text-center">
                            <div className="font-display text-4xl font-bold text-brand tabular-nums">
                                {rate !== undefined
                                    ? `${trimRate(rate)}%`
                                    : "--"}
                            </div>
                            <div className="mt-1 text-xs text-ink-secondary tabular-nums">
                                LPR {trimRate(lprValid ? lprNumber : 0)}%{" "}
                                {bp >= 0 ? "+" : "−"}
                                {Math.abs(bp)} BP
                            </div>
                        </div>
                        <div className="mx-4 mt-4 rounded-2xl bg-panel px-4">
                            <div className="flex min-h-13 items-center gap-2 border-b border-rule py-2">
                                <span className="text-[15px] text-ink">
                                    LPR
                                </span>
                                <span className="text-xs text-ink-secondary">
                                    {t("loan-lpr-tenor")}
                                </span>
                                <div className="ml-auto flex items-center gap-1">
                                    <input
                                        aria-label="LPR"
                                        inputMode="decimal"
                                        className="w-20 cursor-text bg-transparent text-right text-[17px] dp-text-medium text-ink tabular-nums outline-none"
                                        value={lprText}
                                        onFocus={(e) =>
                                            e.currentTarget.select()
                                        }
                                        onChange={(e) =>
                                            setLprText(e.target.value)
                                        }
                                    />
                                    <span className="text-sm text-ink-secondary">
                                        %
                                    </span>
                                </div>
                            </div>
                            <div className="flex min-h-13 items-center py-2">
                                <span className="text-[15px] text-ink">
                                    {t("loan-bp-label")}
                                </span>
                                <div className="ml-auto flex items-center gap-3">
                                    <button
                                        type="button"
                                        aria-label={t("loan-bp-minus")}
                                        className={BTN_TAP}
                                        onClick={() =>
                                            setBp((v) => Math.max(-200, v - 5))
                                        }
                                    >
                                        −
                                    </button>
                                    <span className="min-w-16 text-center text-[15px] font-semibold text-ink tabular-nums">
                                        {bp >= 0 ? "+" : "−"}
                                        {Math.abs(bp)} BP
                                    </span>
                                    <button
                                        type="button"
                                        aria-label={t("loan-bp-plus")}
                                        className={BTN_TAP}
                                        onClick={() =>
                                            setBp((v) => Math.min(200, v + 5))
                                        }
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 px-4 pt-3">
                            {BP_PRESETS.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    className={cn(
                                        "flex-1 rounded-full border py-2 text-[13px] tabular-nums transition-colors",
                                        bp === p ? PICK_ON : PICK_OFF,
                                    )}
                                    onClick={() => setBp(p)}
                                >
                                    {p >= 0 ? "+" : "−"}
                                    {Math.abs(p)} BP
                                </button>
                            ))}
                        </div>
                        <p className="px-4 pt-3 text-xs leading-relaxed text-ink-secondary">
                            {isCustom
                                ? t("loan-rate-note-custom", {
                                      lpr: trimRate(lprNumber),
                                  })
                                : t("loan-rate-note-policy", {
                                      date: LATEST_LPR.date,
                                      lpr: trimRate(LATEST_LPR.value),
                                  })}
                        </p>
                        <div className={SHEET_FOOTER}>
                            <button
                                type="button"
                                className={cn(BTN_PRIMARY, SHEET_ACTION)}
                                disabled={!lprValid}
                                onClick={() => {
                                    onConfirm({ lpr: lprNumber, bp });
                                    onOpenChange(false);
                                }}
                            >
                                {t("confirm")}
                            </button>
                        </div>
                    </DialogContent>
                </div>
            </DialogPortal>
        </Dialog>
    );
}

/** 公积金利率抽屉：首套 / 二套政策卡 + 利率可微调 */
export function FundRateSheet({
    open,
    onOpenChange,
    draft,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    draft: LoanDraft;
    onConfirm: (patch: Pick<LoanDraft, "fundSuite" | "fundRate">) => void;
}) {
    const t = useIntl();
    const [suite, setSuite] = useState<"first" | "second">("first");
    const [rateText, setRateText] = useState("");
    useEffect(() => {
        if (!open) return;
        setSuite(draft.fundSuite);
        setRateText(`${draft.fundRate}`);
    }, [open, draft.fundSuite, draft.fundRate]);
    const rateNumber = Number(rateText);
    const rateValid =
        Number.isFinite(rateNumber) && rateNumber > 0 && rateNumber < 20;
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay className="fixed inset-0 z-40 bg-black/50" />
                <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center">
                    <DialogContent
                        from="bottom"
                        data-loan-sheet="rate-fund"
                        className={SHEET_SURFACE}
                    >
                        <DialogTitle className="sr-only">
                            {t("loan-fund-rate")}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {t("loan-fund-rate")}
                        </DialogDescription>
                        <SheetHead title={t("loan-fund-rate")} />
                        <div className="flex gap-2 px-4 pt-3">
                            {(["first", "second"] as const).map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    className={cn(
                                        "flex-1 rounded-2xl border py-3 text-center text-[15px] dp-text-medium tabular-nums transition-colors",
                                        suite === s ? PICK_ON : PICK_OFF,
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
                        <div className="mx-4 mt-3 flex min-h-13 items-center rounded-2xl bg-panel px-4">
                            <span className="text-[15px] text-ink">
                                {t("loan-fund-rate-input")}
                            </span>
                            <div className="ml-auto flex items-center gap-1">
                                <input
                                    aria-label={t("loan-fund-rate-input")}
                                    inputMode="decimal"
                                    className="w-20 cursor-text bg-transparent text-right text-[17px] dp-text-medium text-ink tabular-nums outline-none"
                                    value={rateText}
                                    onFocus={(e) => e.currentTarget.select()}
                                    onChange={(e) =>
                                        setRateText(e.target.value)
                                    }
                                />
                                <span className="text-sm text-ink-secondary">
                                    %
                                </span>
                            </div>
                        </div>
                        <p className="px-4 pt-3 text-xs leading-relaxed text-ink-secondary">
                            {t("loan-fund-rate-note")}
                        </p>
                        <div className={SHEET_FOOTER}>
                            <button
                                type="button"
                                className={cn(BTN_PRIMARY, SHEET_ACTION)}
                                disabled={!rateValid}
                                onClick={() => {
                                    onConfirm({
                                        fundSuite: suite,
                                        fundRate: rateNumber,
                                    });
                                    onOpenChange(false);
                                }}
                            >
                                {t("confirm")}
                            </button>
                        </div>
                    </DialogContent>
                </div>
            </DialogPortal>
        </Dialog>
    );
}

const PREPAY_MODES: { key: SavedLoanPrepay["mode"]; label: string }[] = [
    { key: "shorten", label: "loan-prepay-mode-shorten" },
    { key: "reduceMonthly", label: "loan-prepay-mode-reduce" },
    { key: "payoff", label: "loan-prepay-mode-payoff" },
];

/**
 * 提前还款抽屉：时间走系统 month 控件，金额与还款后方式在这里定，
 * 结果（省息 / 缩短期数 / 新月供）当场给一个估算。
 */
export function PrepaySheet({
    open,
    onOpenChange,
    draft,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    draft: LoanDraft;
    onConfirm: (v: {
        year: number;
        month: number;
        amountWan: number;
        mode: SavedLoanPrepay["mode"];
    }) => void;
}) {
    const t = useIntl();
    const next = draft.firstPay;
    const [ym, setYm] = useState(monthValue(next));
    const [amountText, setAmountText] = useState("20");
    const [mode, setMode] = useState<SavedLoanPrepay["mode"]>("shorten");

    const derived = deriveLoan(draft);
    // 默认落在「下一期」：本期已还完再追加才符合真实操作顺序。
    // 依赖必须用「年-月」字符串：derived 每次渲染都是新对象，直接依赖它会让
    // effect 在每次 setMode 后重跑，把用户刚点的「减月供」重置回「缩年限」。
    const defaultYmKey = `${(derived.next?.ym ?? draft.firstPay).year}-${
        (derived.next?.ym ?? draft.firstPay).month
    }`;

    useEffect(() => {
        if (!open) return;
        const [y, m] = defaultYmKey.split("-").map(Number);
        setYm(`${y}-${pad(m)}`);
        setAmountText("20");
        setMode("shorten");
    }, [open, defaultYmKey]);

    const [year, month] = ym.split("-").map(Number);
    const { commercialInput, fundInput } = tracksOf(draft);
    const track =
        draft.loanType === "fund"
            ? (fundInput ?? commercialInput)
            : commercialInput;
    const startPeriod = Math.max(
        1,
        Math.min(
            periodOfYm(draft.firstPay, { year, month }),
            Math.max(1, derived.months - 1),
        ),
    );
    const amountWan = Math.max(0, Number(amountText) || 0);
    const preview = simulatePrepay(track, draft.method, {
        mode,
        extraAmount: amountWan * 10000,
        startMonth: startPeriod,
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay className="fixed inset-0 z-40 bg-black/50" />
                <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center">
                    <DialogContent
                        from="bottom"
                        data-loan-sheet="prepay"
                        className={cn(
                            SHEET_SURFACE,
                            "max-h-[85dvh] overflow-y-auto",
                        )}
                    >
                        <DialogTitle className="sr-only">
                            {t("loan-prepay-add")}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {t("loan-prepay-add")}
                        </DialogDescription>
                        <SheetHead title={t("loan-prepay-add")} />
                        <div className="mx-4 mt-3 divide-y divide-rule/60 rounded-2xl bg-panel">
                            <div className="flex min-h-13 items-center gap-3 px-4 py-2">
                                <div className="flex-shrink-0">
                                    <div className="text-[15px] text-ink">
                                        {t("loan-prepay-date")}
                                    </div>
                                    <div className="mt-0.5 text-[11px] text-ink-secondary tabular-nums">
                                        {t("loan-prepay-period", {
                                            n: startPeriod,
                                        })}
                                    </div>
                                </div>
                                <input
                                    type="month"
                                    aria-label={t("loan-prepay-date")}
                                    value={ym}
                                    onChange={(e) => setYm(e.target.value)}
                                    className="ml-auto cursor-pointer bg-transparent text-right text-[15px] dp-text-medium text-ink tabular-nums outline-none"
                                />
                            </div>
                            <div className="flex min-h-13 items-center gap-3 px-4 py-2">
                                <span className="flex-shrink-0 text-[15px] text-ink">
                                    {mode === "payoff"
                                        ? t("loan-prepay-payoff-amount")
                                        : t("loan-prepay-amount-label")}
                                </span>
                                {mode === "payoff" ? (
                                    <span className="ml-auto text-[15px] dp-text-medium text-ink tabular-nums">
                                        ¥
                                        {fmtMoney(
                                            preview.payoffAmount ??
                                                derived.remainingPrincipal,
                                        )}
                                    </span>
                                ) : (
                                    <div className="ml-auto flex items-center gap-1">
                                        <input
                                            aria-label={t(
                                                "loan-prepay-amount-label",
                                            )}
                                            inputMode="decimal"
                                            value={amountText}
                                            onFocus={(e) =>
                                                e.currentTarget.select()
                                            }
                                            onChange={(e) =>
                                                setAmountText(
                                                    e.target.value.replace(
                                                        /[^\d.]/g,
                                                        "",
                                                    ),
                                                )
                                            }
                                            className="w-20 cursor-text bg-transparent text-right text-[17px] dp-text-medium text-ink tabular-nums outline-none"
                                        />
                                        <span className="text-sm text-ink-secondary">
                                            万
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-4 pt-4">
                            <div className="text-[13px] text-ink-secondary">
                                {t("loan-prepay-after")}
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                                {PREPAY_MODES.map((m) => (
                                    <button
                                        key={m.key}
                                        type="button"
                                        data-loan-prepay-mode={m.key}
                                        className={cn(
                                            "cursor-pointer rounded-full border py-2 text-center text-[13px] transition-colors",
                                            mode === m.key ? PICK_ON : PICK_OFF,
                                        )}
                                        onClick={() => setMode(m.key)}
                                    >
                                        {t(m.label)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div
                            data-loan-prepay-preview
                            className="mx-4 mt-4 rounded-2xl bg-[#e8f3ea] px-4 py-2.5 text-[13px] leading-relaxed text-[#1a7f37]"
                        >
                            {mode === "payoff"
                                ? t("loan-prepay-preview-payoff", {
                                      period: startPeriod,
                                      amount: `¥${fmtMoney(
                                          preview.payoffAmount ?? 0,
                                      )}`,
                                  })
                                : t("loan-prepay-preview-saved", {
                                      amount: `¥${fmtMoney(
                                          preview.savedInterest,
                                      )}`,
                                  })}
                            {mode === "shorten" &&
                                preview.monthsShortened > 0 &&
                                `，${t("loan-prepay-shortened", { n: preview.monthsShortened })}`}
                            {mode === "reduceMonthly" &&
                                preview.newMonthly !== undefined &&
                                `，${t("loan-prepay-new-monthly", {
                                    amount: `¥${fmt2(preview.newMonthly)}`,
                                })}`}
                        </div>
                        <p className="px-4 pt-2 text-[11px] leading-relaxed text-ink-secondary">
                            {t("loan-prepay-note")}
                        </p>

                        <div className={SHEET_FOOTER}>
                            <button
                                type="button"
                                className={cn(BTN_PRIMARY, SHEET_ACTION)}
                                disabled={mode !== "payoff" && amountWan <= 0}
                                onClick={() => {
                                    onConfirm({
                                        year,
                                        month,
                                        amountWan,
                                        mode,
                                    });
                                    onOpenChange(false);
                                }}
                            >
                                {t("confirm")}
                            </button>
                        </div>
                    </DialogContent>
                </div>
            </DialogPortal>
        </Dialog>
    );
}

/** 利率调整抽屉：从某年某月起按新利率继续还款（默认次年 1 月，对应常见的重定价日） */
export function RateChangeSheet({
    open,
    onOpenChange,
    draft,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    draft: LoanDraft;
    onConfirm: (v: {
        year: number;
        month: number;
        commercialRate: number;
        fundRate?: number;
    }) => void;
}) {
    const t = useIntl();
    const [ym, setYm] = useState(
        monthValue({ year: draft.firstPay.year + 1, month: 1 }),
    );
    const [rateText, setRateText] = useState(`${draft.lpr + draft.bp / 100}`);
    const [fundText, setFundText] = useState(`${draft.fundRate}`);

    useEffect(() => {
        if (!open) return;
        setYm(
            monthValue({
                year: Math.max(
                    draft.firstPay.year + 1,
                    new Date().getFullYear(),
                ),
                month: 1,
            }),
        );
        setRateText(`${Math.round((draft.lpr + draft.bp / 100) * 100) / 100}`);
        setFundText(`${draft.fundRate}`);
    }, [open, draft.firstPay.year, draft.lpr, draft.bp, draft.fundRate]);

    const [year, month] = ym.split("-").map(Number);
    const commercialRate = Number(rateText);
    const fundRate = Number(fundText);
    const valid =
        Number.isFinite(commercialRate) &&
        commercialRate > 0 &&
        commercialRate < 20 &&
        (draft.loanType === "commercial" ||
            (Number.isFinite(fundRate) && fundRate > 0 && fundRate < 20));

    const period = Math.max(1, periodOfYm(draft.firstPay, { year, month }));
    const previewDraft: LoanDraft = {
        ...draft,
        rateChanges: [
            ...draft.rateChanges,
            {
                id: "__preview",
                year,
                month,
                commercialRate,
                fundRate:
                    draft.loanType === "commercial" ? undefined : fundRate,
            },
        ],
    };
    const previewRow = valid
        ? deriveLoan(previewDraft).rows[period - 1]
        : undefined;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay className="fixed inset-0 z-40 bg-black/50" />
                <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center">
                    <DialogContent
                        from="bottom"
                        data-loan-sheet="rate-change"
                        className={SHEET_SURFACE}
                    >
                        <DialogTitle className="sr-only">
                            {t("loan-rate-add")}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {t("loan-rate-add")}
                        </DialogDescription>
                        <SheetHead title={t("loan-rate-add")} />
                        <div className="mx-4 mt-3 divide-y divide-rule/60 rounded-2xl bg-panel">
                            <div className="flex min-h-13 items-center gap-3 px-4 py-2">
                                <span className="flex-shrink-0 text-[15px] text-ink">
                                    {t("loan-rate-change-from")}
                                </span>
                                <input
                                    type="month"
                                    aria-label={t("loan-rate-change-from")}
                                    value={ym}
                                    onChange={(e) => setYm(e.target.value)}
                                    className="ml-auto cursor-pointer bg-transparent text-right text-[15px] dp-text-medium text-ink tabular-nums outline-none"
                                />
                            </div>
                            <div className="flex min-h-13 items-center gap-3 px-4 py-2">
                                <span className="flex-shrink-0 text-[15px] text-ink">
                                    {draft.loanType === "commercial"
                                        ? t("loan-commercial-rate")
                                        : t("loan-detail-rate-combo")}
                                </span>
                                <div className="ml-auto flex items-center gap-1">
                                    <input
                                        aria-label={t("loan-rate-change-new")}
                                        inputMode="decimal"
                                        value={rateText}
                                        onFocus={(e) =>
                                            e.currentTarget.select()
                                        }
                                        onChange={(e) =>
                                            setRateText(e.target.value)
                                        }
                                        className="w-20 cursor-text bg-transparent text-right text-[17px] dp-text-medium text-ink tabular-nums outline-none"
                                    />
                                    <span className="text-sm text-ink-secondary">
                                        %
                                    </span>
                                </div>
                            </div>
                            {draft.loanType !== "commercial" && (
                                <div className="flex min-h-13 items-center gap-3 px-4 py-2">
                                    <span className="flex-shrink-0 text-[15px] text-ink">
                                        {t("loan-fund-rate")}
                                    </span>
                                    <div className="ml-auto flex items-center gap-1">
                                        <input
                                            aria-label={t("loan-fund-rate")}
                                            inputMode="decimal"
                                            value={fundText}
                                            onFocus={(e) =>
                                                e.currentTarget.select()
                                            }
                                            onChange={(e) =>
                                                setFundText(e.target.value)
                                            }
                                            className="w-20 cursor-text bg-transparent text-right text-[17px] dp-text-medium text-ink tabular-nums outline-none"
                                        />
                                        <span className="text-sm text-ink-secondary">
                                            %
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mx-4 mt-3 rounded-2xl bg-[#e8f3ea] px-4 py-2.5 text-[13px] leading-relaxed text-[#1a7f37]">
                            {previewRow
                                ? t("loan-rate-change-preview", {
                                      period,
                                      amount: `¥${fmt2(previewRow.payment)}`,
                                  })
                                : t("loan-rate-change-invalid")}
                        </div>
                        <p className="px-4 pt-2 text-[11px] leading-relaxed text-ink-secondary">
                            {t("loan-rate-change-note")}
                        </p>
                        <div className={SHEET_FOOTER}>
                            <button
                                type="button"
                                className={cn(BTN_PRIMARY, SHEET_ACTION)}
                                disabled={!valid}
                                onClick={() => {
                                    onConfirm({
                                        year,
                                        month,
                                        commercialRate,
                                        fundRate:
                                            draft.loanType === "commercial"
                                                ? undefined
                                                : fundRate,
                                    });
                                    onOpenChange(false);
                                }}
                            >
                                {t("confirm")}
                            </button>
                        </div>
                    </DialogContent>
                </div>
            </DialogPortal>
        </Dialog>
    );
}
