import createConfirmProvider from "../confirm";
import AutoRuleEditForm from "./form";

export type { AutoRuleValue } from "./form";

export const [AutoRuleEditProvider, showAutoRuleEdit] = createConfirmProvider(
    AutoRuleEditForm,
    {
        dialogTitle: "Auto Rule Edit",
        contentClassName:
            "h-full w-full max-h-full max-w-full rounded-none sm:rounded-md sm:max-h-[min(520px,calc(100vh-32px))] sm:w-[90vw] sm:max-w-[500px]",
    },
);
