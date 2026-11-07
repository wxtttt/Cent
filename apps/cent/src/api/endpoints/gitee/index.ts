import type { Modal } from "@/components/modal";
import { Scheduler } from "@/database/scheduler";
import { BillIndexedDBStorage } from "@/database/storage";
import type { Bill } from "@/ledger/type";
import { t } from "@/locale";
import { createTidal } from "@/tidal";
import { createGiteeSyncer } from "@/tidal/gitee";
import { ENTRY_NAMES, type EntryItem, type TidalRepo } from "../entries";
import type { SyncEndpointFactory } from "../type";
import { createLoginAPI } from "./login";

const config = {
    repoPrefix: "cent-journal",
    entryName: "ledger",
    orderKeys: ["time"],
};

const LoginAPI = createLoginAPI();

const manuallyLogin = async ({ modal }: { modal: Modal }) => {
    const token = await modal.prompt({
        title: t("please-enter-your-gitee-token"),
        input: { type: "text" },
    });
    if (!token) {
        return;
    }
    LoginAPI.manuallySetToken(token as string);
    location.reload();
};

export const GiteeEndpoint: SyncEndpointFactory = {
    type: "gitee",
    name: "Gitee",
    login: LoginAPI.login,
    manuallyLogin,
    init: ({ modal }) => {
        LoginAPI.afterLogin();
        const repo = createTidal<Bill>({
            storageFactory: (name) => new BillIndexedDBStorage(`book-${name}`),
            entryName: config.entryName,
            syncerFactory: () =>
                createGiteeSyncer({
                    auth: LoginAPI.getToken,
                    entryName: config.entryName,
                    repoPrefix: config.repoPrefix,
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
                        createGiteeSyncer({
                            auth: LoginAPI.getToken,
                            entryName: entry,
                            repoPrefix: config.repoPrefix,
                        }),
                }),
            ]),
        ) as Record<string, TidalRepo>;

        const toBookName = (bookId: string) => {
            const [owner, repo] = bookId.split("/");
            return repo.replace(`${config.repoPrefix}-`, "");
        };

        const inviteForBook = async (bookId: string) => {
            await modal.prompt({ title: t("invite-tip") });
            window.open(`https://gitee.com/${bookId}/team`, "_blank");
        };

        const deleteBook = async (bookId: string) => {
            await modal.prompt({ title: t("delete-book-tip") });
            window.open(
                `https://gitee.com/${bookId}/settings#remove`,
                "_blank",
            );
            return Promise.reject();
        };

        // ledger 与各生活模块顺序同步：避免对同一 git ref 并发提交导致 non-fast-forward
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
                repo.detach();
                for (const entry of ENTRY_NAMES) {
                    entryRepos[entry].detach();
                }
            },
            getUserInfo: repo.getUserInfo,
            getCollaborators: repo.getCollaborators,
            getOnlineAsset: (src, store) => repo.getAsset(src, store),

            fetchAllBooks: async (...args) => {
                const res = await repo.fetchAllStore(...args);
                return res.map((v) => ({ id: v, name: toBookName(v) }));
            },
            createBook: repo.create,
            initBook: async (name) => {
                await Promise.all([
                    repo.init(name),
                    ...ENTRY_NAMES.map((entry) => entryRepos[entry].init(name)),
                ]);
            },
            deleteBook,
            inviteForBook,

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
