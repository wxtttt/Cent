import type { WebDAVEdit } from "@/components/modal/web-dav";
import { Scheduler } from "@/database/scheduler";
import { BillIndexedDBStorage } from "@/database/storage";
import type { Bill } from "@/ledger/type";
import { createTidal } from "@/tidal";
import { checkWebDAVConfig, createWebDAVSyncer } from "@/tidal/web-dav";
import { ENTRY_NAMES, type EntryItem, type TidalRepo } from "../entries";
import type { SyncEndpointFactory } from "../type";

const config = {
    repoPrefix: "cent-journal",
    entryName: "ledger",
    orderKeys: ["time"],
};
const key = "web-dav-config";

const getAuth = () => {
    const data = localStorage.getItem(key);
    if (!data) {
        return;
    }
    const parsed = JSON.parse(data);
    return parsed as WebDAVEdit;
};

type WebDAVPrivateMeta = {
    _webDAVUserAliases?: string[];
};

export const WebDAVEndpoint: SyncEndpointFactory = {
    type: "webdav",
    name: "webdav",
    login: async ({ modal }) => {
        const auth = await modal.webDavAuth({
            check: async (data) => {
                const remote = data.remote.replace(/\/$/, "");
                await checkWebDAVConfig({
                    remoteUrl: remote,
                    username: data.username,
                    password: data.password,
                    proxy: data.proxy,
                }).catch((error) => {
                    modal.toast.error(
                        (error as Error)?.message ?? JSON.stringify(error),
                    );
                    return Promise.reject(error);
                });
            },
        });
        if (!auth) {
            return;
        }

        localStorage.setItem("SYNC_ENDPOINT", "webdav");
        localStorage.setItem("web-dav-config", JSON.stringify(auth));
        location.reload();
    },
    manuallyLogin: undefined,
    init: ({ modal }) => {
        const auth = getAuth();
        if (!auth) {
            throw new Error("web dav auth not found");
        }
        const remote = auth.remote.replace(/\/$/, "");
        const webDAVSyncerConfig = {
            username: auth.username,
            password: auth.password,
            remoteUrl: remote,
            proxy: auth.proxy,
        };
        const repo = createTidal<Bill>({
            storageFactory: (name) => new BillIndexedDBStorage(`book-${name}`),
            entryName: config.entryName,
            syncerFactory: () =>
                createWebDAVSyncer({
                    ...config,
                    ...webDAVSyncerConfig,
                }),
        });
        const entryRepos = Object.fromEntries(
            ENTRY_NAMES.map((entry) => [
                entry,
                createTidal<EntryItem>({
                    storageFactory: (name) =>
                        new BillIndexedDBStorage(`book-${name}--${entry}`),
                    entryName: entry,
                    syncerFactory: () =>
                        createWebDAVSyncer({
                            ...config,
                            ...webDAVSyncerConfig,
                            entryName: entry,
                        }),
                }),
            ]),
        ) as Record<string, TidalRepo>;
        const toBookName = (bookId: string) => {
            return bookId.replace(`${config.repoPrefix}-`, "");
        };

        const getUserAliases = async (storeName: string) => {
            const meta: WebDAVPrivateMeta | undefined =
                await repo.getMeta(storeName);
            if (!meta?._webDAVUserAliases) {
                return [];
            }
            return meta._webDAVUserAliases;
        };

        // ledger 与各生活模块顺序同步，保持单一上传通道
        const scheduler = new Scheduler(async (signal) => {
            const [ledgerFinished, cancelLedger] = repo.sync();
            signal.onabort = cancelLedger;
            await ledgerFinished;
            for (const entry of ENTRY_NAMES) {
                const [entryFinished, cancelEntry] = entryRepos[entry].sync();
                signal.onabort = cancelEntry;
                await entryFinished;
            }
        });

        return {
            logout: async () => {
                await repo.detach();
                for (const entry of ENTRY_NAMES) {
                    await entryRepos[entry].detach();
                }
            },
            getUserInfo: async () => {
                const Me = {
                    id: auth.customUserName || auth.username,
                    name: auth.customUserName || auth.username,
                    avatar_url: "/icon.png",
                };
                return Me;
            },
            getCollaborators: async (id) => {
                const aliases = await getUserAliases(id);
                // 必须与 getUserInfo 用同一套标识：账单上的 creatorId 是 getUserInfo 的 id，
                // 这里写成 auth.username 会让自己的账单匹配不上成员列表
                const name = auth.customUserName || auth.username;
                const Me = {
                    id: name,
                    name,
                    avatar_url: "/icon.png",
                };
                const users = [
                    Me,
                    ...aliases
                        .filter((a) => a !== Me.name)
                        .map((alias) => ({
                            id: alias,
                            name: alias,
                            avatar_url: "/icon.png",
                        })),
                ];
                return users;
            },
            getOnlineAsset: (src, store) => repo.getAsset(src, store),
            fetchAllBooks: async () => {
                const res = await repo.fetchAllStore();
                return res.map((v) => ({ id: v, name: toBookName(v) }));
            },
            createBook: repo.create,
            initBook: async (name) => {
                await Promise.all([
                    repo.init(name),
                    ...ENTRY_NAMES.map((entry) => entryRepos[entry].init(name)),
                ]);
                repo.getMeta(name).then((meta?: WebDAVPrivateMeta) => {
                    const customUserName = auth.customUserName;
                    if (!customUserName) {
                        return;
                    }
                    if (!meta?._webDAVUserAliases?.includes(customUserName)) {
                        const newMeta = meta ?? {};
                        newMeta._webDAVUserAliases = [
                            ...(meta?._webDAVUserAliases ?? []),
                            customUserName,
                        ];
                        repo.batch(name, [
                            {
                                type: "meta",
                                metaValue: newMeta,
                            },
                        ]);
                    }
                });
            },
            deleteBook: async () => {
                await modal.prompt({
                    title: "Please delete this folder on your Web DAV server/app manually",
                });
            },
            inviteForBook: undefined,

            batch: async (...args) => {
                await repo.batch(...args);
                scheduler.schedule();
            },
            getMeta: repo.getMeta,
            getAllItems: repo.getAllItems,
            onChange: repo.onChange,

            batchEntry: async (bookId, entry, actions, overlap) => {
                const entryRepo = entryRepos[entry];
                if (!entryRepo) {
                    throw new Error(`unknown entry: ${entry}`);
                }
                await entryRepo.batch(bookId, actions, overlap);
                scheduler.schedule();
            },
            getAllEntryItems: async (bookId, entry) =>
                entryRepos[entry]?.getAllItems(bookId) ?? [],
            onEntryChange: (entry, listener) =>
                entryRepos[entry]?.onChange(listener) ?? (() => {}),

            getIsNeedSync: async () => {
                const needSync = await Promise.all([
                    repo.hasStashes(),
                    ...ENTRY_NAMES.map((entry) =>
                        entryRepos[entry].hasStashes(),
                    ),
                ]);
                return needSync.some(Boolean);
            },
            onSync: scheduler.onProcess.bind(scheduler),
            toSync: scheduler.schedule.bind(scheduler),

            forceNeedSync: repo.forceNeedSync,
        };
    },
};
