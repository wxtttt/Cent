import createConfirmProvider from "../confirm";
import { VehicleForm, VehicleRecordForm } from "./forms";

/** APK 底部抽屉：灰底 + 顶部 28px 圆角 + 拖拽条 + 全宽橙色保存按钮 */
export const [VehicleProvider, showVehicleForm] = createConfirmProvider(
    VehicleForm,
    {
        dialogTitle: "车辆",
        dialogModalClose: true,
        from: "bottom",
        contentClassName:
            "h-[min(64dvh,470px)] w-full rounded-t-[28px] bg-ground! sm:h-[min(470px,calc(100vh-32px))] sm:w-[90vw] sm:max-w-[500px] sm:rounded-[28px]",
    },
);

export const [VehicleRecordProvider, showVehicleRecord] = createConfirmProvider(
    VehicleRecordForm,
    {
        dialogTitle: "车辆记录",
        dialogModalClose: true,
        from: "bottom",
        contentClassName:
            "h-[min(92dvh,760px)] w-full rounded-t-[28px] bg-ground! sm:h-[min(760px,calc(100vh-32px))] sm:w-[90vw] sm:max-w-[500px] sm:rounded-[28px]",
    },
);
