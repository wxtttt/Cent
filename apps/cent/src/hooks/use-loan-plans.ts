import { useCallback } from "react";
import { v4 } from "uuid";
import { useShallow } from "zustand/shallow";
import type { SavedLoanPlan } from "@/ledger/extra-type";
import { useBookStore } from "@/store/book";
import { useLedgerStore } from "@/store/ledger";
import { useUserStore } from "@/store/user";

/** 贷款计算器保存的方案，存个人配置随账本同步。 */
export function useLoanPlans() {
    const plans = useLedgerStore(
        useShallow((state) => {
            const userId = useUserStore.getState().id;
            return state.infos?.meta.personal?.[userId]?.loanPlans ?? [];
        }),
    );

    const add = useCallback(
        async (plan: Omit<SavedLoanPlan, "id" | "createdAt">) => {
            const book = useBookStore.getState().currentBookId;
            if (!book) return;
            const id = v4();
            await useLedgerStore.getState().updatePersonalMeta((prev) => {
                if (prev.loanPlans === undefined) {
                    prev.loanPlans = [];
                }
                prev.loanPlans.push({ ...plan, id, createdAt: Date.now() });
                return prev;
            });
            return id;
        },
        [],
    );

    const remove = useCallback(async (id: string) => {
        const book = useBookStore.getState().currentBookId;
        if (!book) return;
        await useLedgerStore.getState().updatePersonalMeta((prev) => {
            if (prev.loanPlans === undefined) return prev;
            prev.loanPlans = prev.loanPlans.filter((v) => v.id !== id);
            return prev;
        });
    }, []);

    return { plans, add, remove };
}
