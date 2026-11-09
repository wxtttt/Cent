import createConfirmProvider from "../confirm";
import { VehicleForm, VehicleRecordForm } from "./forms";

export const [VehicleProvider, showVehicleForm] = createConfirmProvider(
    VehicleForm,
    {
        dialogTitle: "Vehicle",
        dialogModalClose: true,
        from: "bottom",
        contentClassName:
            "h-[min(50dvh,380px)] w-full rounded-t-[28px] bg-ground! sm:h-[min(380px,calc(100vh-32px))] sm:w-[90vw] sm:max-w-[500px] sm:rounded-[28px]",
    },
);

export const [VehicleRecordProvider, showVehicleRecord] = createConfirmProvider(
    VehicleRecordForm,
    {
        dialogTitle: "Vehicle Record",
        dialogModalClose: true,
        from: "bottom",
        contentClassName:
            "h-[min(80dvh,580px)] w-full rounded-t-[28px] bg-ground! sm:h-[min(580px,calc(100vh-32px))] sm:w-[90vw] sm:max-w-[500px] sm:rounded-[28px]",
    },
);
