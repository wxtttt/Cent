import createConfirmProvider from "../confirm";
import AutoRuleList from "./list";

export const [AutoRuleProvider, showAutoRules] = createConfirmProvider(
    AutoRuleList,
    {
        dialogTitle: "Auto Rules",
        dialogModalClose: true,
        contentClassName:
            "h-full w-full max-h-full max-w-full rounded-none sm:rounded-md sm:max-h-[min(520px,calc(100vh-32px))] sm:w-[90vw] sm:max-w-[500px]",
    },
);

export { AutoRuleEditProvider, showAutoRuleEdit } from "./form-provider";
