import createConfirmProvider from "../confirm";
import CategoryEditForm from "./form";

export const [CategoryEditFormProvider, showCategoryEdit] =
    createConfirmProvider(CategoryEditForm, {
        dialogTitle: "Category Edit",
        dialogModalClose: true,
        from: "bottom",
        contentClassName:
            "dp-category-surface h-[84vh] w-full max-h-full max-w-full overflow-hidden rounded-t-[28px] sm:h-auto sm:max-h-[min(520px,calc(100vh-32px))] sm:w-[90vw] sm:max-w-[500px] sm:rounded-md",
    });
