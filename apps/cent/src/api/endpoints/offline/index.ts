import { BillIndexedDBStorage } from "@/database/storage";
import { t } from "@/locale";
import { ENTRY_NAMES, type EntryItem } from "../entries";
import type { SyncEndpointFactory } from "../type";
import { OfflineStorage } from "./core";

const Me = {
    id: "me",
    name: "Me",
    avatar_url: "/icon.png",
    // "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
};

export const OfflineEndpoint: SyncEndpointFactory = {
    type: "offline",
    name: "offline",
    login: () => {
        localStorage.setItem("SYNC_ENDPOINT", "offline");
        location.reload();
    },
    manuallyLogin: undefined,
    init: ({ modal }) => {
        const repo = new OfflineStorage({
            storage: (name) => new BillIndexedDBStorage(`book-${name}`),
        });
        const entryRepos = Object.fromEntries(
            ENTRY_NAMES.map((entry) => [
                entry,
                new OfflineStorage<EntryItem>({
                    storage: (name) =>
                        new BillIndexedDBStorage(`book-${name}--${entry}`),
                }),
            ]),
        ) as Record<string, OfflineStorage<EntryItem>>;
        return {
            logout: async () => {
                // 暂时不清除本地数据
                return;
            },
            getUserInfo: async () => {
                return Me;
            },
            getCollaborators: async () => [Me],
            getOnlineAsset: undefined,

            fetchAllBooks: repo.fetchAllStore.bind(repo),
            createBook: repo.createStore.bind(repo),
            initBook: async (name) => {
                await Promise.all([
                    repo.initStore(name),
                    ...ENTRY_NAMES.map((entry) =>
                        entryRepos[entry].initStore(name),
                    ),
                ]);
            },
            deleteBook: async (name) => {
                await modal.prompt({ title: t("delete-book-offline-tip") });
                for (const entry of ENTRY_NAMES) {
                    await entryRepos[entry].deleteStore(name);
                }
                return repo.deleteStore(name);
            },
            inviteForBook: undefined,

            batch: repo.batch.bind(repo),
            getMeta: repo.getMeta.bind(repo),
            getAllItems: repo.getAllItems.bind(repo),
            onChange: repo.onChange.bind(repo),

            batchEntry: async (bookId, entry, actions, overlap) => {
                const entryRepo = entryRepos[entry];
                if (!entryRepo) {
                    throw new Error(`unknown entry: ${entry}`);
                }
                await entryRepo.batch(bookId, actions, overlap);
            },
            getAllEntryItems: async (bookId, entry) =>
                entryRepos[entry]?.getAllItems(bookId) ?? [],
            onEntryChange: (entry, listener) =>
                entryRepos[entry]?.onChange(listener) ?? (() => {}),

            getIsNeedSync: repo.getIsNeedSync.bind(repo),
            onSync: repo.onSync.bind(repo),
            toSync: repo.toSync.bind(repo),
        };
    },
};
