import { useState } from "react";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import createConfirmProvider from "../confirm";

type NameValue = { value: string };

const NameForm = ({
    edit,
    onCancel,
    onConfirm,
}: {
    edit?: NameValue;
    onCancel?: () => void;
    onConfirm?: (v: string) => void;
}) => {
    const t = useIntl();
    const [value, setValue] = useState(edit?.value ?? "");
    const canConfirm = Boolean(value.trim());
    return (
        <div className="px-5 pb-6 pt-5">
            <div className="text-[16px] font-semibold text-ink">
                {t("category-name")}
            </div>
            <input
                type="text"
                value={value}
                maxLength={50}
                placeholder={t("category-name-placeholder")}
                onChange={(e) => setValue(e.target.value)}
                className="mt-3 h-12 w-full rounded-xl border border-rule bg-panel px-3.5 text-[15px] text-ink outline-none placeholder:text-ink-tab focus-visible:border-brand"
            />
            <div className="mt-4 flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="h-[48px] flex-1 rounded-xl bg-[#f0f0f2] text-[15px] text-ink"
                >
                    {t("cancel")}
                </button>
                <button
                    type="button"
                    disabled={!canConfirm}
                    onClick={() => onConfirm?.(value)}
                    className={cn(
                        "h-[48px] flex-1 rounded-xl text-[15px] font-medium transition-colors",
                        canConfirm
                            ? "bg-brand text-on-brand"
                            : "cursor-not-allowed bg-[#e4e4e8] text-[#a6a6ae]",
                    )}
                >
                    {t("confirm")}
                </button>
            </div>
        </div>
    );
};

/** 点名称旁的铅笔后，从底部再弹一层抽屉修改名称 */
export const [CategoryNameProvider, showCategoryName] = createConfirmProvider<
    NameValue,
    string
>(NameForm, {
    dialogTitle: "Category Name",
    dialogModalClose: true,
    from: "bottom",
    initialFocus: "input",
    contentClassName:
        "dp-category-surface w-full max-w-full rounded-t-[28px] border-0 bg-ground p-0 shadow-none sm:w-[90vw] sm:max-w-[500px] sm:rounded-md",
});
