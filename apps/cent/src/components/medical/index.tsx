import createConfirmProvider from "../confirm";
import MedicalProfileForm, {
    MedicalMedicineForm,
    MedicalVisitForm,
} from "./forms";

export const [MedicalProfileProvider, showMedicalProfile] =
    createConfirmProvider(MedicalProfileForm, {
        dialogTitle: "Medical Profile",
        from: "bottom",
        contentClassName:
            "h-[min(75dvh,540px)] w-full rounded-t-[28px] bg-ground! sm:h-[min(540px,calc(100vh-32px))] sm:w-[90vw] sm:max-w-[500px] sm:rounded-[28px]",
    });

export const [MedicalVisitProvider, showMedicalVisit] = createConfirmProvider(
    MedicalVisitForm,
    {
        dialogTitle: "Medical Visit",
        from: "bottom",
        contentClassName:
            "h-[min(85dvh,620px)] w-full rounded-t-[28px] bg-ground! sm:h-[min(620px,calc(100vh-32px))] sm:w-[90vw] sm:max-w-[500px] sm:rounded-[28px]",
    },
);

export const [MedicalMedicineProvider, showMedicalMedicine] =
    createConfirmProvider(MedicalMedicineForm, {
        dialogTitle: "Medical Medicine",
        from: "bottom",
        contentClassName:
            "h-[min(75dvh,560px)] w-full rounded-t-[28px] bg-ground! sm:h-[min(560px,calc(100vh-32px))] sm:w-[90vw] sm:max-w-[500px] sm:rounded-[28px]",
    });
