import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { BTN_PRIMARY, BTN_SECONDARY, SHEET_FOOTER } from "../button-styles";
import createConfirmProvider from "../confirm";
import RateInput from "./rate-input";

export type ManualRateEdit = {
    baseCurrencyLabel: string;
    targetCurrencyLabel: string;
    initialRate: number;
};

function ManualRateForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit?: ManualRateEdit;
    onCancel?: () => void;
    onConfirm?: (v: number | null) => void;
}) {
    const t = useIntl();
    const [rate, setRate] = useState<number | undefined>(edit?.initialRate);

    useEffect(() => {
        setRate(edit?.initialRate);
    }, [edit?.initialRate]);

    if (!edit) {
        return null;
    }

    const handleConfirm = () => {
        if (rate === undefined) {
            onConfirm?.(null);
            return;
        }
        if (rate <= 0 || Number.isNaN(rate)) {
            toast.error(t("rate-must-positive"));
            return;
        }
        onConfirm?.(rate);
    };

    return (
        <div className="flex max-h-[80dvh] flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-secondary/40" />
                <h2 className="text-center text-[17px] font-semibold text-ink">
                    {t("manually-update-rate")}
                </h2>
                <p className="mt-1.5 text-center text-[12px] leading-relaxed text-ink-secondary">
                    {t("manually-update-rate-desc")}
                </p>
                <div className="mt-4 mb-2 rounded-2xl bg-panel px-4 py-3 shadow-[0_1px_6px_rgba(92,62,30,0.05)]">
                    <RateInput
                        baseCurrencyLabel={edit.baseCurrencyLabel}
                        targetCurrencyLabel={edit.targetCurrencyLabel}
                        value={rate}
                        onChange={setRate}
                    />
                </div>
            </div>
            <div className={SHEET_FOOTER}>
                <div className="flex gap-2.5">
                    <button
                        type="button"
                        onClick={onCancel}
                        className={cn(BTN_SECONDARY, "flex-1")}
                    >
                        {t("cancel")}
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className={cn(BTN_PRIMARY, "flex-1")}
                    >
                        {t("confirm")}
                    </button>
                </div>
            </div>
        </div>
    );
}

export const [ManualRateProvider, showManualRateUpdate] = createConfirmProvider<
    ManualRateEdit,
    number | null
>(ManualRateForm, {
    dialogTitle: "Manually update rate",
    dialogModalClose: true,
    from: "bottom",
    contentClassName:
        "w-full max-w-full rounded-t-[28px] border-0 bg-ground p-0 shadow-none sm:w-[90vw] sm:max-w-[500px] sm:rounded-md",
});
