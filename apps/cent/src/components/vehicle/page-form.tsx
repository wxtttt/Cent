import VehiclePage from "@/pages/vehicle";
import createConfirmProvider from "../confirm";

/** 与预算管理 showBudget() 同款全屏弹层，从个人页宫格唤起 */
export const [VehiclePageProvider, showVehicle] = createConfirmProvider(
    VehiclePage,
    {
        dialogTitle: "车辆记录",
        routePath: "/vehicle",
        dialogModalClose: true,
        contentClassName:
            "h-full w-full max-h-full max-w-full rounded-none bg-ground sm:rounded-md sm:max-h-[min(520px,calc(100vh-32px))] sm:w-[90vw] sm:max-w-[500px]",
    },
);
