import { useIntl } from "@/locale";
import createConfirmProvider from "../confirm";

type DeleteValue = {
    name: string;
    onDelete: () => void;
};

const DeleteDialogContent = ({
    edit,
    onCancel,
    onConfirm,
}: {
    edit?: DeleteValue;
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
                {t("category-delete-title")}
            </div>
            <div className="mt-2 text-[14px] leading-5 text-[#78726e]">
                {t("category-delete-confirm", { name: edit.name })}
            </div>
            <div className="mt-5 flex gap-[9px]">
                <button
                    type="button"
                    onClick={onCancel}
                    className="h-[54px] flex-1 rounded-[14px] bg-[#f4f4f5] text-[16px] font-semibold text-[#18181b]"
                >
                    {t("cancel")}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        edit.onDelete();
                        onConfirm?.(true);
                    }}
                    className="h-[54px] flex-1 rounded-[14px] bg-[#fcdada] text-[16px] font-semibold text-[#ef4444]"
                >
                    {t("delete")}
                </button>
            </div>
        </div>
    );
};

export const [CategoryDeleteProvider, showCategoryDelete] =
    createConfirmProvider<DeleteValue, boolean>(DeleteDialogContent, {
        dialogTitle: "Delete Category",
        dialogModalClose: true,
        fade: true,
        contentClassName:
            "w-[320px] max-w-[calc(100vw-40px)] rounded-[22px]! border-0 bg-white p-0 shadow-none",
    });
