import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DefaultCurrencies } from "@/api/currency/currencies";
import { useCurrency } from "@/hooks/use-currency";
import PopupLayout from "@/layouts/popup-layout";
import type { CustomCurrency } from "@/ledger/type";
import { useIntl } from "@/locale";
import { useLedgerStore } from "@/store/ledger";
import { useUserStore } from "@/store/user";
import { cn } from "@/utils";
import { BTN_TAP } from "../button-styles";
import { GroupTitle, ListCard, ListRow, PlaceholderCard } from "../sheet-kit";
import { EditCurrencyProvider, showEditCurrency } from "./edit-form";
import { ManualRateProvider, showManualRateUpdate } from "./manual-rate-form";
import {
    CurrencyDeleteProvider,
    CurrencyOptionProvider,
    showCurrencyOptionSheet,
} from "./sheets";

/** 汇率显示统一 4 位有效数字，避免 toFixed(6) 的长尾 */
const formatRate = (value: number) =>
    new Intl.NumberFormat("en", { maximumSignificantDigits: 4 }).format(value);

export default function CurrencyListForm({
    edit,
    onCancel,
}: {
    edit?: any;
    onCancel?: () => void;
    onConfirm?: (v: any) => void;
}) {
    const t = useIntl();
    const {
        baseCurrency,
        setBaseCurrency,
        convert,
        setRate,
        refresh,

        customCurrencies,
        updateCustomCurrency,
        deleteCustomCurrency,

        allCurrencies,
        quickCurrencies,
        updateQuickCurrencies,
    } = useCurrency();

    // 手动设置的汇率只存个人 meta，用于在汇率行上标出「手动」
    const uid = useUserStore((s) => s.id);
    const manualRates = useLedgerStore(
        (s) => s.infos?.meta.personal?.[uid]?.rates,
    );

    const rates = useMemo(() => {
        return DefaultCurrencies.map((currency) => {
            return {
                ...convert(1, baseCurrency.id, currency.id),
                id: currency.id,
            };
        });
    }, [baseCurrency.id, convert]);

    const [loading, setLoading] = useState(false);
    const toRefresh = async () => {
        setLoading(true);
        try {
            await refresh();
            toast.success(t("rate-update-success"));
        } finally {
            setLoading(false);
        }
    };

    const toUpdateCurrency = async (currency?: CustomCurrency) => {
        const newCurrency = await showEditCurrency(currency);
        if (!newCurrency) {
            return;
        }
        if (typeof newCurrency === "string") {
            if (currency?.id) {
                deleteCustomCurrency(currency.id);
            }
            return;
        }
        updateCustomCurrency(newCurrency);
    };

    const toPickBaseCurrency = async () => {
        const result = await showCurrencyOptionSheet({
            title: t("base-currency"),
            hint: t("base-currency-switch-hint"),
            options: DefaultCurrencies.map((currency) => ({
                id: currency.id,
                label: t(currency.labelKey),
            })),
            selected: [baseCurrency.id],
            searchable: true,
        }).catch(() => undefined);
        if (!result) {
            return;
        }
        // 单选语义复用多选抽屉：结果里剔除当前本位币，取最后点选的那一个
        const next = result.filter((id) => id !== baseCurrency.id);
        if (next.length > 0) {
            void setBaseCurrency(next[next.length - 1]);
        }
    };

    const toPickQuickCurrencies = async () => {
        const selectedIds = quickCurrencies.map((c) => c.id);
        const result = await showCurrencyOptionSheet({
            title: t("bill-quick-currencies"),
            hint: t("quick-currencies-desc"),
            options: allCurrencies.map((c) => ({ id: c.id, label: c.label })),
            selected: selectedIds,
            searchable: true,
        }).catch(() => undefined);
        if (!result) {
            return;
        }
        // 保持既有顺序在前、新勾选的追加在后，避免快捷区顺序每次都重排
        const next = [
            ...selectedIds.filter((id) => result.includes(id)),
            ...result.filter((id) => !selectedIds.includes(id)),
        ];
        void updateQuickCurrencies(next);
    };

    const toManuallyUpdate = async (
        currency: (typeof DefaultCurrencies)[number],
    ) => {
        if (currency.id === baseCurrency.id) {
            return;
        }
        const rate = rates.find((r) => r.id === currency.id);
        if (!rate) {
            return;
        }
        try {
            const value = await showManualRateUpdate({
                baseCurrencyLabel: baseCurrency.label,
                targetCurrencyLabel: t(currency.labelKey),
                initialRate: rate.predict,
            });
            if (value === null) {
                setRate(currency.id, undefined);
                return;
            }
            setRate(currency.id, value);
        } catch {
            return;
        }
    };

    const rateCurrencies = DefaultCurrencies.filter(
        (currency) => currency.id !== baseCurrency.id,
    );

    return (
        <PopupLayout
            onBack={onCancel}
            title={
                <span className="text-[18px] font-semibold text-ink">
                    {t("currency-manager")}
                </span>
            }
            backStyle="circle"
            className="dp-drawer-surface h-full bg-ground"
            right={
                <button
                    type="button"
                    data-currency-add
                    onClick={() => void toUpdateCurrency()}
                    aria-label={t("add-new-currency")}
                    className="flex size-10 items-center justify-center rounded-full bg-panel text-ink shadow-[0_1px_6px_rgba(92,62,30,0.10)] transition-colors hover:text-brand active:bg-ground-muted"
                >
                    <i className="icon-[lucide--plus] size-5" />
                </button>
            }
        >
            <div
                data-currency-page
                className="scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-ground px-3 pt-1 pb-6"
            >
                <GroupTitle title={t("base-currency")} first />
                <ListCard>
                    <ListRow
                        title={t("base-currency")}
                        value={baseCurrency.label}
                        onClick={() => void toPickBaseCurrency()}
                        data-currency-base-row
                    />
                </ListCard>

                <GroupTitle title={t("bill-quick-currencies")} />
                <ListCard>
                    <ListRow
                        title={t("bill-quick-currencies")}
                        value={
                            quickCurrencies.length > 0
                                ? quickCurrencies.map((c) => c.label).join("、")
                                : t("not-set")
                        }
                        valueClassName={
                            quickCurrencies.length > 0
                                ? "min-w-0 shrink truncate"
                                : "min-w-0 shrink truncate text-ink-secondary/70"
                        }
                        onClick={() => void toPickQuickCurrencies()}
                        data-currency-quick-row
                    />
                </ListCard>

                <GroupTitle title={t("custom-currencies")} />
                {customCurrencies.length === 0 ? (
                    <PlaceholderCard>
                        {t("custom-currencies-empty")}
                    </PlaceholderCard>
                ) : (
                    <ListCard>
                        {customCurrencies.map((currency) => (
                            <ListRow
                                key={currency.id}
                                badge={
                                    <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-ground-muted text-[13px] font-medium text-ink">
                                        {currency.symbol}
                                    </span>
                                }
                                title={currency.name}
                                subtitle={currency.symbol}
                                value={formatRate(currency.rateToBase)}
                                onClick={() => void toUpdateCurrency(currency)}
                                data-currency-custom-row={currency.id}
                            />
                        ))}
                    </ListCard>
                )}

                <GroupTitle
                    title={t("exchange-rate")}
                    action={
                        <button
                            type="button"
                            onClick={() => void toRefresh()}
                            disabled={loading}
                            aria-label={t("exchange-rate")}
                            className={cn(
                                "flex size-7 items-center justify-center text-ink-secondary transition-colors",
                                "disabled:cursor-not-allowed disabled:opacity-40",
                                BTN_TAP,
                            )}
                        >
                            <i
                                className={cn(
                                    "icon-[lucide--refresh-cw] size-3.5",
                                    loading && "animate-spin",
                                )}
                            />
                        </button>
                    }
                />
                <ListCard>
                    {rateCurrencies.map((currency) => {
                        const rate = rates.find((r) => r.id === currency.id);
                        const manual = manualRates?.[currency.id] != null;
                        return (
                            <ListRow
                                key={currency.id}
                                badge={
                                    <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-ground-muted text-[17px]">
                                        {currency.icon}
                                    </span>
                                }
                                title={t(currency.labelKey)}
                                subtitle={`${currency.id} · ${currency.symbol}`}
                                trailing={
                                    manual ? (
                                        <span className="shrink-0 rounded-full bg-ground-muted px-1.5 py-0.5 text-[10px] text-ink-secondary">
                                            {t("manual-rate")}
                                        </span>
                                    ) : undefined
                                }
                                value={rate ? formatRate(rate.predict) : "—"}
                                onClick={() => void toManuallyUpdate(currency)}
                                data-currency-rate-row={currency.id}
                            />
                        );
                    })}
                </ListCard>

                <p className="mt-3 px-2 text-center text-[11px] leading-relaxed text-ink-secondary/80">
                    {t("exchange-rate-from", {
                        a: (
                            <a
                                className="underline"
                                href="https://ecb.europa.eu"
                                target="_blank"
                                rel="noopener"
                            >
                                ecb.europa.eu
                            </a>
                        ),
                    })}
                </p>
            </div>
            <CurrencyOptionProvider />
            <CurrencyDeleteProvider />
            <EditCurrencyProvider />
            <ManualRateProvider />
        </PopupLayout>
    );
}
