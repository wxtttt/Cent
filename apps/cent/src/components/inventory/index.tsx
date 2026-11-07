import createConfirmProvider from "../confirm";
import InventoryItemForm from "./item-form";

export const [InventoryItemProvider, showInventoryItem] = createConfirmProvider(
    InventoryItemForm,
    {
        dialogTitle: "Inventory Item",
        from: "bottom",
        contentClassName:
            "h-[min(85dvh,600px)] w-full rounded-t-[28px] bg-ground! sm:h-[min(600px,calc(100vh-32px))] sm:w-[90vw] sm:max-w-[500px] sm:rounded-[28px]",
    },
);
