import { cn } from "@/utils";
import createConfirmProvider from "../confirm";

export type ParentOption = { id: string; name: string };
type ParentValue = { options: ParentOption[]; value: string };

const ParentForm = ({
    edit,
    onConfirm,
}: {
    edit?: ParentValue;
    onConfirm?: (v: string) => void;
}) => (
    <div className="px-4 pb-6 pt-4">
        <div className="max-h-[64vh] overflow-y-auto scrollbar-hidden rounded-2xl bg-panel">
            {(edit?.options ?? []).map((option, index) => (
                <button
                    key={option.id}
                    type="button"
                    onClick={() => onConfirm?.(option.id)}
                    className={cn(
                        "flex h-[52px] w-full items-center justify-center text-center text-[15px]",
                        index > 0 && "border-t border-rule",
                        option.id === edit?.value
                            ? "font-medium text-brand"
                            : "text-ink",
                    )}
                >
                    {option.name}
                </button>
            ))}
        </div>
    </div>
);

/** 点顶部的一级分组名称后，从底部直接弹出选项列表 */
export const [CategoryParentProvider, showCategoryParent] =
    createConfirmProvider<ParentValue, string>(ParentForm, {
        dialogTitle: "Select Category Group",
        dialogModalClose: true,
        from: "bottom",
        contentClassName:
            "dp-category-surface w-full max-w-full rounded-t-[28px] border-0 bg-ground p-0 shadow-none sm:w-[90vw] sm:max-w-[500px] sm:rounded-md",
    });
