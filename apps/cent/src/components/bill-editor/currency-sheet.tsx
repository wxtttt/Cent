import { useCurrency } from "@/hooks/use-currency";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import createConfirmProvider from "../confirm";

type CurrencyOption = {
    id: string;
    label: string;
    symbol: string;
};

type CurrencySheetValue = {
    /** 当前账单的目标币种；本位币账单为 baseCurrency.id */
    selectedId: string;
};

/** 选中币种，或点「汇率与货币」跳到设置页 */
export type BillCurrencySheetResult =
    | { currencyId: string; manage?: false }
    | { manage: true; currencyId?: undefined };

const CurrencyCell = ({
    currency,
    selected,
    isBase,
    onClick,
}: {
    currency: CurrencyOption;
    selected: boolean;
    isBase: boolean;
    onClick: () => void;
}) => {
    const t = useIntl();
    return (
        <button
            type="button"
            aria-label={currency.label}
            onClick={onClick}
            className={cn(
                "flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors duration-[var(--dp-motion-interaction)] ease-[var(--dp-motion-easing)]",
                selected
                    ? "border-brand bg-[#f6e0d2]"
                    : "border-transparent bg-panel",
            )}
        >
            <span
                className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-[15px] font-medium",
                    selected
                        ? "bg-panel text-brand"
                        : "bg-ground-muted text-ink",
                )}
            >
                {currency.symbol}
            </span>
            <span className="min-w-0 flex-1">
                <span
                    className={cn(
                        "block truncate text-[13px] font-medium",
                        selected ? "text-brand" : "text-ink",
                    )}
                >
                    {currency.label}
                </span>
                <span className="block truncate text-[11px] text-ink-secondary">
                    {currency.id}
                    {isBase ? ` · ${t("base-currency")}` : ""}
                </span>
            </span>
            {selected && (
                <i className="icon-[lucide--check] size-4 text-brand" />
            )}
        </button>
    );
};

function CurrencySheetForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit?: CurrencySheetValue;
    onCancel?: () => void;
    onConfirm?: (v: BillCurrencySheetResult) => void;
}) {
    const t = useIntl();
    const { baseCurrency, quickCurrencies, allCurrencies } = useCurrency();
    const selectedId = edit?.selectedId ?? baseCurrency.id;

    const toOption = (c: (typeof allCurrencies)[number]): CurrencyOption => ({
        id: c.id,
        label: c.label,
        symbol: c.symbol,
    });

    // 本位币固定在全部列表首位，选它即回到不换算的记账方式
    const all = [
        toOption(baseCurrency),
        ...allCurrencies.filter((c) => c.id !== baseCurrency.id).map(toOption),
    ];
    const quick = quickCurrencies.map(toOption);

    const pick = (currencyId: string) => onConfirm?.({ currencyId });

    return (
        <div className="px-5 pb-6 pt-2.5">
            <div className="flex justify-center pb-3">
                <span className="h-1 w-10 rounded-full bg-ink-secondary/30" />
            </div>
            <div className="flex items-center justify-between pb-3">
                <span className="text-[17px] font-semibold text-ink">
                    {t("bill-choose-currency")}
                </span>
                <button
                    type="button"
                    onClick={onCancel}
                    aria-label={t("cancel")}
                    className="flex size-8 items-center justify-center rounded-full bg-panel text-ink-secondary"
                >
                    <i className="icon-[lucide--x] size-4" />
                </button>
            </div>

            <div className="max-h-[52vh] space-y-4 overflow-y-auto scrollbar-hidden">
                <section>
                    <div className="pb-2 text-[12px] text-ink-secondary">
                        {t("bill-quick-currencies")}
                    </div>
                    {quick.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                            {quick.map((currency) => (
                                <CurrencyCell
                                    key={currency.id}
                                    currency={currency}
                                    selected={currency.id === selectedId}
                                    isBase={currency.id === baseCurrency.id}
                                    onClick={() => pick(currency.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl bg-panel px-3 py-3 text-[12px] leading-relaxed text-ink-secondary">
                            {t("bill-quick-currency-empty")}
                        </div>
                    )}
                </section>

                <section>
                    <div className="pb-2 text-[12px] text-ink-secondary">
                        {t("bill-all-currencies")}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {all.map((currency) => (
                            <CurrencyCell
                                key={currency.id}
                                currency={currency}
                                selected={currency.id === selectedId}
                                isBase={currency.id === baseCurrency.id}
                                onClick={() => pick(currency.id)}
                            />
                        ))}
                    </div>
                </section>
            </div>

            <button
                type="button"
                onClick={() => onConfirm?.({ manage: true })}
                className="mt-4 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-panel text-[13px] text-ink-secondary"
            >
                <i className="icon-[lucide--settings] size-4" />
                {t("currency-manager")}
            </button>
        </div>
    );
}

/** 点金额前的货币符号，从底部上滑选择账单币种（含汇率换算） */
export const [BillCurrencySheetProvider, showBillCurrencySheet] =
    createConfirmProvider<CurrencySheetValue, BillCurrencySheetResult>(
        CurrencySheetForm,
        {
            dialogTitle: "Currency",
            dialogModalClose: true,
            from: "bottom",
            contentClassName:
                "w-full max-w-full rounded-t-[28px] border-0 bg-ground p-0 shadow-none sm:w-[90vw] sm:max-w-[500px] sm:rounded-md",
        },
    );
