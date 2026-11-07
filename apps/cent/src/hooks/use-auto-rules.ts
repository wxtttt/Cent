import { useCallback } from "react";
import { v4 } from "uuid";
import { useShallow } from "zustand/shallow";
import type { AutoRule } from "@/ledger/extra-type";
import { useBookStore } from "@/store/book";
import { useLedgerStore } from "@/store/ledger";

/** 自动记账规则 CRUD，存 GlobalMeta 随账本同步；数组顺序即优先级。 */
export function useAutoRules() {
    const rules = useLedgerStore(
        useShallow((state) => state.infos?.meta.autoRules ?? []),
    );

    const add = useCallback(async (rule: Omit<AutoRule, "id">) => {
        const book = useBookStore.getState().currentBookId;
        if (!book) return;
        const id = v4();
        await useLedgerStore.getState().updateGlobalMeta((prev) => {
            if (prev.autoRules === undefined) {
                prev.autoRules = [];
            }
            prev.autoRules.push({ ...rule, id });
            return prev;
        });
        return id;
    }, []);

    const update = useCallback(
        async (id: string, value?: Omit<AutoRule, "id">) => {
            const book = useBookStore.getState().currentBookId;
            if (!book) return;
            await useLedgerStore.getState().updateGlobalMeta((prev) => {
                if (prev.autoRules === undefined) return prev;
                if (value === undefined) {
                    prev.autoRules = prev.autoRules.filter((v) => v.id !== id);
                    return prev;
                }
                const index = prev.autoRules.findIndex((v) => v.id === id);
                if (index === -1) return prev;
                prev.autoRules[index] = { id, ...value };
                return prev;
            });
        },
        [],
    );

    const reorder = useCallback(async (ordered: { id: string }[]) => {
        await useLedgerStore.getState().updateGlobalMeta((prev) => {
            if (prev.autoRules === undefined) return prev;
            prev.autoRules = ordered
                .map((o) => prev.autoRules?.find((r) => r.id === o.id))
                .filter((v) => v !== undefined);
            return prev;
        });
    }, []);

    return { rules, add, update, reorder };
}
