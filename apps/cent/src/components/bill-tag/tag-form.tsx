import createConfirmProvider from "../confirm";
import { EditTagForm } from "./tag";

/** 标签新建 / 编辑统一从底部拉起抽屉 */
export const [EditTagProvider, showEditTag] = createConfirmProvider(
    EditTagForm,
    {
        dialogTitle: "Edit Tag",
        dialogModalClose: true,
        from: "bottom",
        initialFocus: "input",
        contentClassName:
            "w-full max-w-full rounded-t-[28px] border-0 bg-ground p-0 shadow-none sm:w-[90vw] sm:max-w-[500px] sm:rounded-md",
    },
);
