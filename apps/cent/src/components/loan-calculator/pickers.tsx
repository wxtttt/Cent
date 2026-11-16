import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { intl, useIntl } from "@/locale";
import { cn } from "@/utils";
import { BTN_PRIMARY, SHEET_FOOTER } from "../button-styles";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
} from "../ui/dialog";
import { FUND_SUITE_RATES, LATEST_LPR, type LoanDraft } from "./model";

// 家小满式滚轮：行高约等于选中胶囊高度，窗口露出 5 行，上下边缘渐隐
const ITEM_HEIGHT = 36;
const VISIBLE_ROWS = 5;
const WINDOW_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;

const TERM_YEARS = Array.from({ length: 30 }, (_, i) => i + 1);
const DOWN_RATIOS = Array.from({ length: 18 }, (_, i) => 0.05 + i * 0.05);
const FIRST_PAY_YEARS = Array.from(
    { length: 16 },
    (_, i) => new Date().getFullYear() + i,
);
const FIRST_PAY_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const IS_ZH = intl.locale === "zh";

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
                            ? "bg-white font-medium text-ink shadow-[0_1px_6px_rgba(92,62,30,0.10)]"
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

type WheelColumnSpec = {
    items: string[];
    index: number;
    onChange: (index: number) => void;
};

/** 通用滚轮底部抽屉（年限 / 首付 / 首次还款共用壳） */
function WheelSheet({
    open,
    onOpenChange,
    title,
    columns,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    columns: WheelColumnSpec[];
    onConfirm: () => void;
}) {
    const t = useIntl();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay className="fixed inset-0 z-40 bg-black/50" />
                <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center">
                    <DialogContent
                        from="bottom"
                        data-loan-sheet={title}
                        className="pointer-events-auto w-full rounded-t-[28px] border border-b-0 border-rule bg-[#f4f4f4] shadow-panel sm:w-[90vw] sm:max-w-[500px] sm:rounded-[28px] sm:border-b"
                    >
                        <DialogTitle className="sr-only">{title}</DialogTitle>
                        <DialogDescription className="sr-only">
                            {title}
                        </DialogDescription>
                        <div className="relative flex items-center justify-between px-4 pb-2 pt-3">
                            <div className="absolute inset-x-0 top-1.5 mx-auto h-1 w-10 rounded-full bg-black/15" />
                            <button
                                type="button"
                                data-no-focus-ring
                                aria-label={t("close")}
                                className="flex size-9 items-center justify-center rounded-full bg-white text-ink shadow-[0_2px_12px_rgba(0,0,0,0.12)] focus-visible:outline-none"
                                onClick={() => onOpenChange(false)}
                            >
                                <i className="icon-[apk--close] size-3.5" />
                            </button>
                            <span className="text-[17px] font-semibold">
                                {title}
                            </span>
                            <div className="size-9" />
                        </div>
                        <div
                            className={cn(
                                "flex items-stretch gap-2 px-4 py-2",
                                columns.length > 1 && "[&>*]:flex-1",
                            )}
                        >
                            {columns.map((col, i) => (
                                // biome-ignore lint/suspicious/noArrayIndexKey: 滚轮列按位置定位
                                <WheelColumn
                                    key={i}
                                    items={col.items}
                                    index={col.index}
                                    onIndexChange={col.onChange}
                                />
                            ))}
                        </div>
                        <div className={SHEET_FOOTER}>
                            <button
                                type="button"
                                className={BTN_PRIMARY}
                                onClick={() => {
                                    onConfirm();
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

const trimRate = (v: number) =>
    v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

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
        <WheelSheet
            open={open}
            onOpenChange={onOpenChange}
            title={t("loan-term")}
            columns={[
                {
                    items: TERM_YEARS.map((y) =>
                        t("loan-term-option", { years: y, months: y * 12 }),
                    ),
                    index,
                    onChange: setIndex,
                },
            ]}
            onConfirm={() => onConfirm(TERM_YEARS[index])}
        />
    );
}

export function DownPaymentSheet({
    open,
    onOpenChange,
    value,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** 0-1 */
    value: number;
    onConfirm: (ratio: number) => void;
}) {
    const t = useIntl();
    const [index, setIndex] = useState(0);
    useEffect(() => {
        if (!open) return;
        const i = DOWN_RATIOS.findIndex((r) => Math.abs(r - value) < 0.001);
        setIndex(Math.max(0, i));
    }, [open, value]);
    return (
        <WheelSheet
            open={open}
            onOpenChange={onOpenChange}
            title={t("loan-down-payment")}
            columns={[
                {
                    items: DOWN_RATIOS.map((r) => `${Math.round(r * 100)}%`),
                    index,
                    onChange: setIndex,
                },
            ]}
            onConfirm={() => onConfirm(DOWN_RATIOS[index])}
        />
    );
}

export function FirstPaySheet({
    open,
    onOpenChange,
    value,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    value: { year: number; month: number };
    onConfirm: (v: { year: number; month: number }) => void;
}) {
    const t = useIntl();
    const [yearIndex, setYearIndex] = useState(0);
    const [monthIndex, setMonthIndex] = useState(0);
    useEffect(() => {
        if (!open) return;
        setYearIndex(Math.max(0, FIRST_PAY_YEARS.indexOf(value.year)));
        setMonthIndex(Math.max(0, value.month - 1));
    }, [open, value]);
    return (
        <WheelSheet
            open={open}
            onOpenChange={onOpenChange}
            title={t("loan-first-pay")}
            columns={[
                {
                    items: FIRST_PAY_YEARS.map((y) =>
                        IS_ZH ? `${y}年` : `${y}`,
                    ),
                    index: yearIndex,
                    onChange: setYearIndex,
                },
                {
                    items: FIRST_PAY_MONTHS.map((m) =>
                        IS_ZH ? `${m}月` : `${m}`.padStart(2, "0"),
                    ),
                    index: monthIndex,
                    onChange: setMonthIndex,
                },
            ]}
            onConfirm={() =>
                onConfirm({
                    year: FIRST_PAY_YEARS[yearIndex],
                    month: monthIndex + 1,
                })
            }
        />
    );
}

const BP_PRESETS = [-50, -45, -30, 0, 30];

/** 商贷利率抽屉：LPR 可编辑 + 加减点步进 + BP 快捷片；脚注随自定义 LPR 切换口径 */
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
                        className="pointer-events-auto max-h-[85vh] w-full overflow-y-auto rounded-t-[28px] border border-b-0 border-rule bg-[#f4f4f4] shadow-panel sm:w-[90vw] sm:max-w-[500px] sm:rounded-[28px] sm:border-b"
                    >
                        <DialogTitle className="sr-only">
                            {t("loan-commercial-rate")}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {t("loan-commercial-rate")}
                        </DialogDescription>
                        <div className="relative pb-1 pt-3 text-center">
                            <div className="absolute inset-x-0 top-1.5 mx-auto h-1 w-10 rounded-full bg-black/15" />
                            <div className="text-[17px] font-semibold">
                                {t("loan-commercial-rate")}
                            </div>
                        </div>
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
                        <div className="mx-4 mt-4 rounded-2xl bg-white px-4">
                            <div className="flex min-h-13 items-center gap-2 border-b border-rule py-2">
                                <span className="text-[15px] font-medium">
                                    LPR
                                </span>
                                <span className="text-xs text-ink-secondary">
                                    {t("loan-lpr-tenor")}
                                </span>
                                <div className="ml-auto flex items-center gap-1">
                                    <Input
                                        inputMode="decimal"
                                        className="w-24 text-right"
                                        value={lprText}
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
                                <span className="text-[15px] font-medium">
                                    {t("loan-bp-label")}
                                </span>
                                <div className="ml-auto flex items-center gap-3">
                                    <button
                                        type="button"
                                        aria-label={t("loan-bp-minus")}
                                        className="size-8 rounded-full border border-brand/40 text-brand"
                                        onClick={() =>
                                            setBp((v) => Math.max(-200, v - 5))
                                        }
                                    >
                                        −
                                    </button>
                                    <span className="min-w-16 text-center text-[15px] font-semibold tabular-nums">
                                        {bp >= 0 ? "+" : "−"}
                                        {Math.abs(bp)} BP
                                    </span>
                                    <button
                                        type="button"
                                        aria-label={t("loan-bp-plus")}
                                        className="size-8 rounded-full border border-brand/40 text-brand"
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
                                        "flex-1 rounded-full py-2 text-xs font-medium tabular-nums",
                                        bp === p
                                            ? "border border-brand bg-brand/10 text-brand"
                                            : "bg-white text-ink-secondary",
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
                                className={BTN_PRIMARY}
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
                        className="pointer-events-auto w-full rounded-t-[28px] border border-b-0 border-rule bg-[#f4f4f4] shadow-panel sm:w-[90vw] sm:max-w-[500px] sm:rounded-[28px] sm:border-b"
                    >
                        <DialogTitle className="sr-only">
                            {t("loan-fund-rate")}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {t("loan-fund-rate")}
                        </DialogDescription>
                        <div className="relative pb-1 pt-3 text-center">
                            <div className="absolute inset-x-0 top-1.5 mx-auto h-1 w-10 rounded-full bg-black/15" />
                            <div className="text-[17px] font-semibold">
                                {t("loan-fund-rate")}
                            </div>
                        </div>
                        <div className="flex gap-2 px-4 pt-3">
                            {(["first", "second"] as const).map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    className={cn(
                                        "flex-1 rounded-2xl border py-3 text-center text-[15px] font-semibold tabular-nums",
                                        suite === s
                                            ? "border-brand bg-brand/10 text-brand"
                                            : "border-rule bg-white text-ink",
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
                        <div className="mx-4 mt-3 flex min-h-13 items-center rounded-2xl bg-white px-4">
                            <span className="text-[15px] font-medium">
                                {t("loan-fund-rate-input")}
                            </span>
                            <div className="ml-auto flex items-center gap-1">
                                <Input
                                    inputMode="decimal"
                                    className="w-24 text-right"
                                    value={rateText}
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
                                className={BTN_PRIMARY}
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
