import { useIntl } from "@/locale";
import { BTN_DANGER, BTN_SECONDARY } from "./button-styles";
import createConfirmProvider from "./confirm";

export type DeleteConfirmValue = {
    title: string;
    description: string;
    onDelete?: () => void;
};

const DeleteConfirmForm = ({
    edit,
    onCancel,
    onConfirm,
}: {
    edit?: DeleteConfirmValue;
    onCancel?: () => void;
    onConfirm?: (v: boolean) => void;
}) => {
    const t = useIntl();
    if (!edit) {
        return null;
    }
    return (
        <div className="px-[18px] pt-[28px] pb-[14px] text-center">
            <div className="text-[18px] font-bold leading-6 text-[#383230]">
                {edit.title}
            </div>
            <div className="mt-2 text-[14px] leading-5 text-[#78726e]">
                {edit.description}
            </div>
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
                    onClick={() => {
                        edit.onDelete?.();
                        onConfirm?.(true);
                    }}
                    className={`${BTN_DANGER} flex-1`}
                >
                    {t("delete")}
                </button>
            </div>
        </div>
    );
};

/** 破坏性操作的二次确认弹窗；每个模块各建一个实例，避免同一 Provider 被重复挂载 */
export const createDeleteConfirm = () =>
    createConfirmProvider<DeleteConfirmValue, boolean>(DeleteConfirmForm, {
        dialogTitle: "Delete",
        dialogModalClose: true,
        fade: true,
        contentClassName:
            "w-[320px] max-w-[calc(100vw-40px)] rounded-[22px]! border-0 bg-white p-0 shadow-none",
    });
