import { useState } from "react";
import { useIntl } from "@/locale";
import { BTN_PRIMARY, BTN_SECONDARY } from "./button-styles";
import createConfirmProvider from "./confirm";

export type NameDialogValue = {
    value: string;
    title: string;
    placeholder: string;
};

const NameDialogForm = ({
    edit,
    onCancel,
    onConfirm,
}: {
    edit?: NameDialogValue;
    onCancel?: () => void;
    onConfirm?: (v: string) => void;
}) => {
    const t = useIntl();
    const [value, setValue] = useState(edit?.value ?? "");
    const canConfirm = Boolean(value.trim());
    return (
        <div className="px-5 pb-5 pt-5">
            <div className="text-[15px] font-semibold text-ink">
                {edit?.title}
            </div>
            <input
                type="text"
                value={value}
                maxLength={50}
                placeholder={edit?.placeholder}
                onChange={(e) => setValue(e.target.value)}
                className="mt-3 h-10 w-full rounded-[10px] border border-rule bg-panel px-3 text-[14px] text-ink outline-none placeholder:text-ink-tab focus-visible:border-brand"
            />
            <div className="mt-4 flex gap-2.5">
                <button
                    type="button"
                    onClick={onCancel}
                    className={`${BTN_SECONDARY} flex-1`}
                >
                    {t("cancel")}
                </button>
                <button
                    type="button"
                    disabled={!canConfirm}
                    onClick={() => onConfirm?.(value)}
                    className={`${BTN_PRIMARY} flex-1`}
                >
                    {t("confirm")}
                </button>
            </div>
        </div>
    );
};

/**
 * 名称类字段统一「点击文字 → 底部再弹一层改名抽屉」。
 * 每个模块各建一个实例：Provider 会读同一个 instanceId，重复挂载会渲染出两份弹层。
 */
export const createNameDialog = () =>
    createConfirmProvider<NameDialogValue, string>(NameDialogForm, {
        dialogTitle: "Name",
        dialogModalClose: true,
        from: "bottom",
        initialFocus: "input",
        contentClassName:
            "dp-category-surface w-full max-w-full rounded-t-[28px] border-0 bg-ground p-0 shadow-none sm:w-[90vw] sm:max-w-[500px] sm:rounded-md",
    });
