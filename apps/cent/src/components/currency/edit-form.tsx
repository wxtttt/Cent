import createConfirmProvider from "../confirm";
import { EditCurrencyForm } from "./edit";

export const [EditCurrencyProvider, showEditCurrency] = createConfirmProvider(
    EditCurrencyForm,
    {
        dialogTitle: "Edit Currency",
        dialogModalClose: true,
        from: "bottom",
        contentClassName:
            "w-full max-w-full rounded-t-[28px] border-0 bg-ground p-0 shadow-none sm:w-[90vw] sm:max-w-[500px] sm:rounded-md",
    },
);
