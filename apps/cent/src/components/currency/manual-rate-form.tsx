import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useIntl } from "@/locale";
import createConfirmProvider from "../confirm";
import { SheetCard, SheetShell } from "../sheet-kit";
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
        <SheetShell
            title={t("manually-update-rate")}
            hint={t("manually-update-rate-desc")}
            onCancel={onCancel}
            onConfirm={handleConfirm}
        >
            <SheetCard>
                <div className="px-4 py-3">
                    <RateInput
                        baseCurrencyLabel={edit.baseCurrencyLabel}
                        targetCurrencyLabel={edit.targetCurrencyLabel}
                        value={rate}
                        onChange={setRate}
                    />
                </div>
            </SheetCard>
        </SheetShell>
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
