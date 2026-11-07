import { Collapsible } from "radix-ui";
import { useMemo, useState } from "react";
import modal from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/hooks/use-currency";
import { useLoanPlans } from "@/hooks/use-loan-plans";
import PopupLayout from "@/layouts/popup-layout";
import { compareLoans, type LoanResult } from "@/ledger/loan";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { toThousand } from "@/utils/number";

const YEAR_PRESETS = [10, 20, 30];

function parsePositive(text: string) {
    const value = Number(text.replace(/,/g, ""));
    return Number.isFinite(value) && value > 0 ? value : undefined;
}

function ResultCard({
    title,
    subtitle,
    main,
    rows,
    highlight,
}: {
    title: string;
    subtitle: string;
    main: React.ReactNode;
    rows: { label: string; value: string }[];
    highlight?: boolean;
}) {
    return (
        <div
            className={cn(
                "rounded-card border p-4",
                highlight
                    ? "border-brand/40 bg-brand/5"
                    : "border-rule bg-panel",
            )}
        >
            <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">{title}</span>
                <span className="text-xs text-ink-secondary">{subtitle}</span>
            </div>
            <div className="mt-2 font-display text-2xl font-bold tabular-nums">
                {main}
            </div>
            <div className="mt-2 flex flex-col gap-1">
                {rows.map((row) => (
                    <div
                        key={row.label}
                        className="flex items-baseline justify-between text-xs"
                    >
                        <span className="text-ink-secondary">{row.label}</span>
                        <span className="font-semibold tabular-nums">
                            {row.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function LoanCalculatorForm({
    onCancel,
}: {
    onCancel?: () => void;
}) {
    const t = useIntl();
    const { baseCurrency } = useCurrency();
    const { plans, add, remove } = useLoanPlans();

    const [principalText, setPrincipalText] = useState("");
    const [rateText, setRateText] = useState("");
    const [yearsText, setYearsText] = useState("");

    const principal = parsePositive(principalText);
    const annualRate = rateText === "" ? undefined : Number(rateText) || 0;
    const years = parsePositive(yearsText);
    const input = useMemo(() => {
        if (!principal || annualRate === undefined || !years) {
            return undefined;
        }
        const months = Math.round(years * 12);
        if (months < 1) {
            return undefined;
        }
        return { principal, annualRate, months };
    }, [principal, annualRate, years]);

    const result = useMemo(
        () => (input ? compareLoans(input) : undefined),
        [input],
    );

    const fmt = (value: number) => toThousand(value, 0, 2);
    const money = (value: number) => `${baseCurrency.symbol}${fmt(value)}`;

    const toSave = async () => {
        if (!input) return;
        const defaultName = `${fmt(input.principal)} / ${years}年`;
        try {
            const name = await modal.prompt({
                title: t("loan-save-plan"),
                input: { defaultValue: defaultName },
            });
            await add({
                name: String(name ?? defaultName) || defaultName,
                principal: input.principal,
                annualRate: input.annualRate,
                months: input.months,
            });
        } catch {
            // 用户取消
        }
    };

    const loadPlan = (plan: {
        principal: number;
        annualRate: number;
        months: number;
    }) => {
        setPrincipalText(String(plan.principal));
        setRateText(String(plan.annualRate));
        setYearsText(String(plan.months / 12));
    };

    return (
        <PopupLayout
            onBack={onCancel}
            title={t("loan-calculator")}
            className="h-full overflow-hidden"
        >
            <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
                {plans.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-ink-secondary">
                            {t("loan-saved-plans")}
                        </span>
                        {plans.map((plan) => (
                            <span
                                key={plan.id}
                                className="inline-flex items-center gap-1 rounded-full border border-rule bg-panel py-1 pr-1 pl-3 text-xs shadow-panel"
                            >
                                <button
                                    type="button"
                                    className="cursor-pointer font-medium"
                                    onClick={() => loadPlan(plan)}
                                >
                                    {plan.name}
                                </button>
                                <button
                                    type="button"
                                    aria-label={t("delete")}
                                    className="flex size-5 cursor-pointer items-center justify-center rounded-full text-ink-secondary hover:bg-ground-muted"
                                    onClick={() => remove(plan.id)}
                                >
                                    <i className="icon-[mdi--close] size-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                <div className="flex flex-col gap-3 rounded-card border border-rule bg-panel p-4 shadow-panel">
                    <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-ink-secondary">
                            {t("loan-principal")}
                        </span>
                        <Input
                            inputMode="decimal"
                            placeholder="1000000"
                            value={principalText}
                            onChange={(e) => setPrincipalText(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-ink-secondary">
                            {t("loan-annual-rate")}
                        </span>
                        <Input
                            inputMode="decimal"
                            placeholder="3.6"
                            value={rateText}
                            onChange={(e) => setRateText(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-ink-secondary">
                            {t("loan-term-years")}
                        </span>
                        <div className="flex items-center gap-2">
                            <Input
                                inputMode="decimal"
                                placeholder="30"
                                className="flex-1"
                                value={yearsText}
                                onChange={(e) => setYearsText(e.target.value)}
                            />
                            {YEAR_PRESETS.map((preset) => (
                                <Button
                                    key={preset}
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "flex-shrink-0",
                                        years === preset &&
                                            "border-brand/50 bg-brand/10",
                                    )}
                                    onClick={() => setYearsText(String(preset))}
                                >
                                    {preset}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={!input}
                        onClick={toSave}
                    >
                        <i className="icon-[mdi--content-save-outline]" />
                        {t("loan-save-plan")}
                    </Button>
                </div>

                {result && (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <ResultCard
                                title={t("loan-method-installment")}
                                subtitle={t("loan-installment-fixed")}
                                main={money(result.installment.firstPayment)}
                                rows={[
                                    {
                                        label: t("loan-total-interest"),
                                        value: money(
                                            result.installment.totalInterest,
                                        ),
                                    },
                                    {
                                        label: t("loan-total-payment"),
                                        value: money(
                                            result.installment.totalPayment,
                                        ),
                                    },
                                ]}
                            />
                            <ResultCard
                                title={t("loan-method-principal")}
                                subtitle={t("loan-principal-decreasing")}
                                highlight={result.interestDiff > 0}
                                main={money(result.principal.firstPayment)}
                                rows={[
                                    {
                                        label: t("loan-last-month"),
                                        value: money(
                                            result.principal.lastPayment,
                                        ),
                                    },
                                    {
                                        label: t("loan-total-interest"),
                                        value: money(
                                            result.principal.totalInterest,
                                        ),
                                    },
                                    {
                                        label: t("loan-total-payment"),
                                        value: money(
                                            result.principal.totalPayment,
                                        ),
                                    },
                                ]}
                            />
                        </div>
                        {result.interestDiff > 0 && (
                            <div className="rounded-card border border-brand/30 bg-brand/5 px-4 py-2.5 text-xs text-brand">
                                {t("loan-interest-diff-note", {
                                    amount: money(result.interestDiff),
                                })}
                            </div>
                        )}
                        <YearlyDetail
                            result={result.installment}
                            money={money}
                        />
                    </>
                )}
            </div>
        </PopupLayout>
    );
}

function YearlyDetail({
    result,
    money,
}: {
    result: LoanResult;
    money: (value: number) => string;
}) {
    const t = useIntl();
    const [open, setOpen] = useState(false);
    return (
        <Collapsible.Root
            open={open}
            onOpenChange={setOpen}
            className="rounded-card border border-rule bg-panel shadow-panel"
        >
            <Collapsible.Trigger asChild>
                <button
                    type="button"
                    className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold"
                >
                    {t("loan-yearly-detail")}
                    <i
                        className={cn(
                            "icon-[mdi--chevron-down] size-4 text-ink-secondary transition-transform",
                            open && "rotate-180",
                        )}
                    />
                </button>
            </Collapsible.Trigger>
            <Collapsible.Content className="data-[state=open]:animate-collapse-open data-[state=closed]:animate-collapse-close data-[state=closed]:overflow-hidden">
                <div className="border-t border-rule px-4 py-2">
                    <div className="flex items-baseline py-1.5 text-xs text-ink-secondary">
                        <span className="flex-1">{t("loan-col-year")}</span>
                        <span className="flex-1 text-right">
                            {t("loan-col-payment")}
                        </span>
                        <span className="flex-1 text-right">
                            {t("loan-col-interest")}
                        </span>
                        <span className="flex-1 text-right">
                            {t("loan-col-remaining")}
                        </span>
                    </div>
                    {result.yearly.map((row) => (
                        <div
                            key={row.year}
                            className="flex items-baseline border-t border-rule/60 py-1.5 text-xs tabular-nums"
                        >
                            <span className="flex-1">
                                {t("loan-year-n", { n: row.year })}
                            </span>
                            <span className="flex-1 text-right">
                                {money(row.total)}
                            </span>
                            <span className="flex-1 text-right">
                                {money(row.interest)}
                            </span>
                            <span className="flex-1 text-right">
                                {money(row.remaining)}
                            </span>
                        </div>
                    ))}
                </div>
            </Collapsible.Content>
        </Collapsible.Root>
    );
}
