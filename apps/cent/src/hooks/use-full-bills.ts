import { useEffect, useState } from "react";
import { useBookStore } from "@/store/book";
import { useLedgerStore } from "@/store/ledger";

let fullBillsPromise: Promise<unknown> | undefined;

/** 首页/记账页需要完整历史；同一次会话只拉一次，失败后允许重试 */
export const ensureFullBills = () => {
    if (!useBookStore.getState().currentBookId) {
        return Promise.resolve();
    }
    if (!fullBillsPromise) {
        fullBillsPromise = useLedgerStore
            .getState()
            .refreshBillList()
            .catch((error) => {
                fullBillsPromise = undefined;
                throw error;
            });
    }
    return fullBillsPromise;
};

export function useFullBills() {
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let alive = true;
        ensureFullBills()
            .catch(() => {})
            .finally(() => {
                if (alive) setLoading(false);
            });
        return () => {
            alive = false;
        };
    }, []);
    return loading;
}
