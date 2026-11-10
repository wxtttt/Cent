import { useCallback, useMemo } from "react";
import { v4 } from "uuid";
import { useShallow } from "zustand/shallow";
import { BillCategories } from "@/ledger/category";
import type { BillCategory } from "@/ledger/type";
import { intlCategory, treeCategories } from "@/ledger/utils";
import { useIntl } from "@/locale";
import { measure } from "@/measurement";
import { useBookStore } from "@/store/book";
import { useLedgerStore } from "@/store/ledger";

const UUID_ID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_IDS = new Set(BillCategories.map((c) => c.id));

/** 默认分类以当前定义为准，只保留用户自行新增的分类 */
const withDefaults = (saved?: BillCategory[]) => {
    if (!saved) {
        return [...BillCategories];
    }
    // 已包含当前默认项时说明用户改过这份列表，保留其增删改与排序
    if (saved.some((c) => DEFAULT_IDS.has(c.id))) {
        return [...saved];
    }
    const custom = saved.filter((c) => UUID_ID.test(c.id));
    return [...BillCategories, ...custom];
};

/** 确保收入和支持的分类至少有一个 */
const validateCategories = (categories: BillCategory[]) => {
    const isValid = categories.reduce(
        (prev, category) => {
            if (category.type === "income") {
                prev.income = true;
            } else {
                prev.expense = true;
            }
            return prev;
        },
        { expense: false, income: false },
    );
    if (isValid.income === false || isValid.expense === false) {
        return false;
    }
    return true;
};

export default function useCategory() {
    const t = useIntl();
    const savedCategories = useLedgerStore(
        useShallow((state) => state.infos?.meta.categories),
    );

    const categories = useMemo(
        () => withDefaults(savedCategories).map((v) => intlCategory(v, t)),
        [savedCategories, t],
    );

    const incomes = useMemo(
        () => treeCategories(categories.filter((v) => v.type === "income")),
        [categories],
    );
    const expenses = useMemo(
        () => treeCategories(categories.filter((v) => v.type === "expense")),
        [categories],
    );

    const add = useCallback(async (newData: Omit<BillCategory, "id">) => {
        const book = useBookStore.getState().currentBookId;
        if (!book) {
            return;
        }
        const { promise, resolve, reject } = Promise.withResolvers<string>();
        await useLedgerStore.getState().updateGlobalMeta((prev) => {
            prev.categories = withDefaults(prev.categories);
            const id = v4();
            prev.categories.push({ ...newData, customName: true, id });
            resolve(id);
            return prev;
        });
        measure("feature_config_changed", {
            feature: "category",
            action: "create",
        });
        return promise;
    }, []);

    const update = useCallback(
        async (id: string, value?: Partial<Omit<BillCategory, "id">>) => {
            const book = useBookStore.getState().currentBookId;
            if (!book) {
                return;
            }
            await useLedgerStore.getState().updateGlobalMeta((prev) => {
                prev.categories = withDefaults(prev.categories);
                if (value === undefined) {
                    prev.categories = prev.categories.filter(
                        (v) => v.id !== id,
                    );
                    const valid = validateCategories(prev.categories);
                    if (!valid) {
                        throw new Error(
                            "each bill-type must has one category as least",
                        );
                    }
                    return prev;
                }
                const index = prev.categories.findIndex((v) => v.id === id);
                if (index === -1) {
                    return prev;
                }
                // 如果是默认分类，并且名称与intl后的名称不同，customName设为true，否则为undefined
                // 如果是用户自建分类（不在 BillCategories 里），保留原有的 customName（true）
                const existingCategory = prev.categories[index];
                let customName: boolean | undefined =
                    existingCategory.customName;
                const defaultCategory = BillCategories.find((c) => c.id === id);
                if (defaultCategory) {
                    customName = t(defaultCategory.name) !== value.name;
                }
                prev.categories[index] = {
                    ...prev.categories[index],
                    ...value,
                    customName,
                    name:
                        customName === true
                            ? value.name!
                            : (defaultCategory?.name ?? value.name!),
                    id,
                };
                return prev;
            });
            measure("feature_config_changed", {
                feature: "category",
                action: value === undefined ? "delete" : "update",
            });
        },
        [t],
    );

    const reorder = useCallback(async (ordered: Pick<BillCategory, "id">[]) => {
        const book = useBookStore.getState().currentBookId;
        if (!book) {
            return;
        }
        const store = useLedgerStore.getState();
        const holder: { value?: BillCategory[] } = {};
        await store.updateGlobalMeta((prev) => {
            const current = withDefaults(prev.categories);
            const byId = new Map(current.map((c) => [c.id, c]));
            const next = ordered.map((o) => byId.get(o.id));
            if (next.some((v) => v === undefined)) {
                return prev;
            }
            // 只替换参与排序的槽位，其余分类（含其它分组的子项）位置不变，
            // 避免把分组整体挪到数组头部打乱层级归属
            const ids = new Set(ordered.map((o) => o.id));
            let cursor = 0;
            const result = current.map((c) =>
                ids.has(c.id) ? next[cursor++]! : c,
            );
            prev.categories = result;
            holder.value = result;
            return prev;
        });
        // 存储层的变更通知早于 meta 落盘，落盘后再主动刷新一次
        await store.refreshBillList();
        if (holder.value) {
            const saved = holder.value;
            // 保证界面立即生效，不依赖异步通知回来的旧快照
            useLedgerStore.setState((state) => {
                const meta = state.infos?.meta;
                if (!meta) {
                    return {};
                }
                return {
                    infos: {
                        ...state.infos,
                        meta: { ...meta, categories: saved },
                    },
                };
            });
        }
    }, []);

    const reset = useCallback(async () => {
        const allBills = await useLedgerStore.getState().refreshBillList();
        const saved = useLedgerStore.getState().infos?.meta.categories;
        const customIds = new Set(
            (saved ?? []).filter((c) => UUID_ID.test(c.id)).map((c) => c.id),
        );
        const safeToReset = allBills.every((b) => !customIds.has(b.categoryId));
        if (!safeToReset) {
            throw new Error("still has transactions with custom category");
        }
        await useLedgerStore.getState().updateGlobalMeta((prev) => {
            prev.categories = undefined;
            return prev;
        });
        measure("feature_config_changed", {
            feature: "category",
            action: "reset",
        });
    }, []);

    return {
        categories,
        incomes,
        expenses,

        update,
        add,
        reorder,
        reset,
    };
}
