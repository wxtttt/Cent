import { measure } from "@/measurement";
import { type EditBill, useLedgerStore } from "@/store/ledger";
import createConfirmProvider from "../confirm";
import EditorForm from "./form";

const confirms = createConfirmProvider(EditorForm, {
    dialogTitle: "Edit Bill",
    initialFocus: "[data-calculator-value]",
    dialogModalClose: true,
    from: "bottom",
    contentClassName:
        "bg-ground h-[min(92dvh,620px)] w-full max-w-full overflow-hidden rounded-t-[28px] sm:w-[90vw] sm:max-w-[600px]",
});

const [BillEditorProvider, showBillEditor] = confirms;

export { BillEditorProvider, showBillEditor };

export const goAddBill = async (value?: EditBill | undefined) => {
    const newBill = await showBillEditor(value);
    await useLedgerStore.getState().addBill(newBill);
    measure("bill_created", { source: "manual", item_count: 1 });
};
