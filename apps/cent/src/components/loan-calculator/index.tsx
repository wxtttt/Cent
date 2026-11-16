import createConfirmProvider from "../confirm";
import LoanCalculatorForm from "./form";
import { LoanDeleteProvider } from "./sheets";

export const [LoanCalculatorProvider, showLoanCalculator] =
    createConfirmProvider(LoanCalculatorForm, {
        dialogTitle: "贷款管理",
        routePath: "/loan",
        dialogModalClose: true,
        contentClassName:
            "h-full w-full max-h-full max-w-full rounded-none sm:rounded-md sm:max-h-[min(680px,calc(100vh-32px))] sm:w-[90vw] sm:max-w-[500px]",
    });

/** 删除二次确认实例随页面一起挂载 */
export { LoanDeleteProvider };
