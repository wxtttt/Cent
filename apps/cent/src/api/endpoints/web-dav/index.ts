import type { WebDAVEdit } from "@/components/modal/web-dav";
import { Scheduler } from "@/database/scheduler";
import { BillIndexedDBStorage } from "@/database/storage";
import type { Bill } from "@/ledger/type";
import { createTidal } from "@/tidal";
import { createWebDAVSyncer } from "@/tidal/web-dav";
import { ENTRY_NAMES, type EntryItem, type TidalRepo } from "../entries";
import type { SyncEndpointFactory } from "../type";
import {
    getCurrentBookId,
    getWebDAVAuth,
    webDAVConfigKey,
    webDAVLastAccountKey,
} from "./account";

const config = {
    repoPrefix: "cent-journal",
    entryName: "ledger",
    orderKeys: ["time"],
};
/** 退出登录清空 localStorage 期间的内存暂存 */
let logoutSnapshot: WebDAVEdit | undefined;

const getAuth = getWebDAVAuth;

type WebDAVPrivateMeta = {
    _webDAVUserAliases?: string[];
};

export const WebDAVEndpoint: SyncEndpointFactory = {
    type: "webdav",
    name: "webdav",
    login: async ({ modal }) => {
        // 路由页模式：连接表单自持「校验 → 保存 → 刷新」（见 components/modal/web-dav.tsx），
        // 这里只负责从登录页 / 重新登录入口进入 /login/webdav
        modal.webDavAuth();
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
            beforeLogout: () => {
                const current = getAuth();
                if (!current) {
                    return;
                }
                // 只保留识别账号所需的信息，密码不落盘
                logoutSnapshot = {
                    remote: current.remote,
                    username: current.username,
                    password: "",
                    proxy: current.proxy,
                    customUserName: current.customUserName,
                };
            },
            afterLogout: () => {
                if (!logoutSnapshot) {
                    return;
                }
                localStorage.setItem(
                    webDAVLastAccountKey,
                    JSON.stringify(logoutSnapshot),
                );
                logoutSnapshot = undefined;
            },
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
            // 「选择用户」页用：当前账本可选的身份 = 自己（账号名回退）+ 账本别名；
            // 别名读取失败（离线预览 / 网络故障）退化为只有自己，保证页面可用
            getUserChoices: async () => {
                const bookId = getCurrentBookId();
                let aliases: string[] = [];
                if (bookId) {
                    try {
                        aliases = await getUserAliases(bookId);
                    } catch {
                        aliases = [];
                    }
                }
                const fallback = auth.customUserName || auth.username;
                return [fallback, ...aliases.filter((a) => a !== fallback)];
            },
            // 写入所选身份并登记进账本别名（别名登记尽力而为，失败不阻断），刷新后 getUserInfo 即用新身份
            setCurrentUser: async (name) => {
                auth.customUserName = name;
                localStorage.setItem(webDAVConfigKey, JSON.stringify(auth));
                const bookId = getCurrentBookId();
                if (bookId) {
                    try {
                        const meta = await repo.getMeta(bookId);
                        if (!meta?._webDAVUserAliases?.includes(name)) {
                            const newMeta = meta ?? {};
                            newMeta._webDAVUserAliases = [
                                ...(meta?._webDAVUserAliases ?? []),
                                name,
                            ];
                            await repo.batch(bookId, [
                                { type: "meta", metaValue: newMeta },
                            ]);
                        }
                    } catch {
                        // 别名登记失败不影响本机身份生效，下次联网 initBook 会补写
                    }
                }
                location.reload();
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
