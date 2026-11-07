import { useCallback } from "react";
import { v4 } from "uuid";
import { useShallow } from "zustand/shallow";
import type { Full } from "@/database/stash";
import {
    type InventoryItem,
    normalizeInventoryStatus,
} from "@/inventory/types";
import { useLedgerStore } from "@/store/ledger";
import { useUserStore } from "@/store/user";
import { getEntryStore } from "./use-entry-items";

const useInventoryState = getEntryStore("inventory");

type NewInventoryItem = Omit<
    InventoryItem,
    "id" | "userId" | "time" | "status"
> & { status?: InventoryItem["status"] };

/** 物品清单：随账本多人同步的本地生活数据。 */
export function useInventory() {
    const userId = useUserStore((state) => state.id);
    const raw = useInventoryState(
        useShallow((state) => state.items),
    ) as unknown as Full<InventoryItem>[];
    // 旧数据是两态（active/archived），读取时归一成三态
    const items = raw.map((item) => ({
        ...item,
        status: normalizeInventoryStatus(item.status),
    }));

    const add = useCallback(
        async (item: NewInventoryItem) => {
            const id = v4();
            const full: InventoryItem = {
                ...item,
                kind: item.kind ?? "physical",
                status: item.status ?? "in_use",
                id,
                userId,
                time: Date.now(),
            };
            await useInventoryState.getState().upsert(full);
            return id;
        },
        [userId],
    );

    const update = useCallback(async (item: InventoryItem) => {
        await useInventoryState.getState().upsert(item);
    }, []);

    const remove = useCallback(async (id: string) => {
        await useInventoryState.getState().remove(id);
    }, []);

    return { items, add, update, remove };
}

/** 不依赖组件的快捷入库：顺带把新分类记入建议列表（dock 快捷菜单与页面共用）。 */
export async function quickAddInventory(
    item: NewInventoryItem,
): Promise<string> {
    if (item.category) {
        useLedgerStore.getState().updateGlobalMeta((prev) => {
            const list = prev.inventoryCategories ?? [];
            if (!list.includes(item.category as string)) {
                prev.inventoryCategories = [...list, item.category as string];
            }
            return prev;
        });
    }
    const id = v4();
    const userId = useUserStore.getState().id;
    const full: InventoryItem = {
        ...item,
        kind: item.kind ?? "physical",
        status: item.status ?? "in_use",
        id,
        userId,
        time: Date.now(),
    };
    await useInventoryState.getState().upsert(full);
    return id;
}
