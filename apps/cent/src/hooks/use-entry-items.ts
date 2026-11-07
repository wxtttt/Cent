// 生活模块数据桶的通用 zustand store 工厂：
// 模块加载时订阅 onEntryChange 并做首次拉取，数据变化自动刷新。

import type { StoreApi, UseBoundStore } from "zustand";
import { create } from "zustand";
import type { EntryItem } from "@/api/endpoints/entries";
import { loadStorageAPI } from "@/api/storage/dynamic";
import type { Full } from "@/database/stash";
import { useBookStore } from "@/store/book";

type EntryItemsState = {
    items: Full<EntryItem>[];
    refresh: () => Promise<void>;
    upsert: (item: EntryItem) => Promise<void>;
    remove: (id: string) => Promise<void>;
};

type EntryStore = UseBoundStore<StoreApi<EntryItemsState>>;

const stores = new Map<string, EntryStore>();

export function getEntryStore(entry: string): EntryStore {
    const existing = stores.get(entry);
    if (existing) {
        return existing;
    }
    const store: EntryStore = create<EntryItemsState>()((set, get) => {
        const refresh = async () => {
            const { StorageAPI } = await loadStorageAPI();
            const bookId = useBookStore.getState().currentBookId;
            if (!bookId) return;
            const items = await StorageAPI.getAllEntryItems(bookId, entry);
            set({ items: items ?? [] });
        };
        const upsert = async (item: EntryItem) => {
            const { StorageAPI } = await loadStorageAPI();
            const bookId = useBookStore.getState().currentBookId;
            if (!bookId) return;
            await StorageAPI.batchEntry(bookId, entry, [
                { type: "update", value: item },
            ]);
            await get().refresh();
        };
        const remove = async (id: string) => {
            const { StorageAPI } = await loadStorageAPI();
            const bookId = useBookStore.getState().currentBookId;
            if (!bookId) return;
            await StorageAPI.batchEntry(bookId, entry, [
                { type: "delete", value: id },
            ]);
            await get().refresh();
        };
        loadStorageAPI().then(({ StorageAPI }) => {
            StorageAPI.onEntryChange?.(entry, () => void get().refresh());
            void get().refresh();
        });
        return { items: [], refresh, upsert, remove };
    });
    stores.set(entry, store);
    return store;
}
