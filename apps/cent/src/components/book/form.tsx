import { useEffect, useState } from "react";
import type { Book } from "@/api/endpoints/type";
import { loadStorageAPI } from "@/api/storage/dynamic";
import { BTN_PRIMARY } from "@/components/button-styles";
import { useIntl } from "@/locale";
import { measure } from "@/measurement";
import { useBookStore } from "@/store/book";
import { useIsLogin } from "@/store/user";
import { CUSTOM_CSS_STORAGE_KEY } from "@/utils/preset";
import Loading from "../loading";
import modal from "../modal";

const CONFIG_KEY_BY_TYPE: Record<string, string> = {
    webdav: "web-dav-config",
    s3: "s3-config",
};

/**
 * 共享账号身份选择只对 WebDAV / S3 有意义（同一套凭据多人使用，靠名字区分
 * 账单 creatorId）；config 里已写 customUserName 视为身份已定。
 */
export const hasUserIdentity = () => {
    const configKey =
        CONFIG_KEY_BY_TYPE[localStorage.getItem("SYNC_ENDPOINT") ?? "github"];
    if (!configKey) {
        return true;
    }
    try {
        return Boolean(
            JSON.parse(localStorage.getItem(configKey) ?? "{}")?.customUserName,
        );
    } catch {
        return true;
    }
};

/**
 * 身份必须先于账本切换同步落盘：switchToBook / setCurrentUser 都会触发
 * location.reload()，顺序错了身份写入会被 reload 打断。账本 id 直接写 store
 * （persist 随 set 同步落盘），别名登记交给 setCurrentUser / initBook 的既有链路。
 */
const writeUserIdentity = (name: string) => {
    const configKey =
        CONFIG_KEY_BY_TYPE[localStorage.getItem("SYNC_ENDPOINT") ?? "github"];
    if (!configKey) {
        return;
    }
    try {
        const config = JSON.parse(localStorage.getItem(configKey) ?? "{}");
        config.customUserName = name;
        localStorage.setItem(configKey, JSON.stringify(config));
    } catch {
        // 配置损坏时不阻断流程，reload 后按未选身份处理
    }
};

/**
 * 登录后引导页（选择账本 + 选择身份合并为一个页面，主流 iOS 分组列表设计）：
 * 56px 品牌图标 + 居中标题，账本 / 用户各一张白卡（灰组标签 + 细分隔线，选中行
 * 打品牌色勾，卡内「+ 新建」行弹 prompt），底部只留一颗 54px 确认按钮统一生效。
 * 点按只改本地选中态，确认时一次性落盘：改账本走 switchToBook（reload），
 * WebDAV / S3 还需先写身份再切换（见 writeUserIdentity）。从个人页等入口进入时
 * 提供左上角返回（onCancel），登录后的首次引导不给返回，必须完成选择。
 */
export function BookForm({ onCancel }: { onCancel?: () => void } = {}) {
    const t = useIntl();
    const isLogin = useIsLogin();
    const { books, currentBookId, loading, error } = useBookStore();

    const needIdentity = isLogin && !hasUserIdentity();
    // 点按只改本地选中态，统一由底部确认按钮生效
    const [selectedBookId, setSelectedBookId] = useState(currentBookId);
    const [selectedUser, setSelectedUser] = useState<string | undefined>(
        undefined,
    );
    const [choices, setChoices] = useState<string[] | undefined>(undefined);
    const [creating, setCreating] = useState(false);
    const [applying, setApplying] = useState(false);

    const [core, setCore] = useState<
        Awaited<ReturnType<typeof loadStorageAPI>> | undefined
    >(undefined);
    useEffect(() => {
        loadStorageAPI().then((v) => {
            setCore(v);
        });
    }, []);

    useEffect(() => {
        useBookStore.getState().updateBookList();
    }, []);

    // 身份候选 = 自己（账号名回退）+ 账本别名，只在需要选身份时拉取
    useEffect(() => {
        if (!needIdentity) {
            return;
        }
        let alive = true;
        (async () => {
            const { StorageAPI } = await loadStorageAPI();
            const list = await StorageAPI.getUserChoices?.();
            if (alive) {
                setChoices(list ?? []);
            }
        })();
        return () => {
            alive = false;
        };
    }, [needIdentity]);

    // 默认选中第一个候选（自己的账号名），减少一次点击
    useEffect(() => {
        if (needIdentity && selectedUser === undefined && choices?.length) {
            setSelectedUser(choices[0]);
        }
    }, [needIdentity, choices, selectedUser]);

    // 远端只有一本账本时直接预选，用户确认即可进入
    useEffect(() => {
        if (selectedBookId === undefined && books.length === 1) {
            setSelectedBookId(books[0].id);
        }
    }, [selectedBookId, books]);

    if (!isLogin) {
        return null;
    }

    const canConfirm =
        Boolean(selectedBookId) && (!needIdentity || Boolean(selectedUser));

    const toConfirm = async () => {
        if (!canConfirm || applying) {
            return;
        }
        setApplying(true);
        try {
            const identity = needIdentity ? selectedUser : undefined;
            if (selectedBookId !== currentBookId) {
                if (identity) {
                    // 先同步写身份 + 直接写 currentBookId（persist 随 set 落盘），
                    // 最后由 setCurrentUser 统一做别名登记并 reload，避免
                    // switchToBook 的 reload 抢在身份写入之前
                    writeUserIdentity(identity);
                    useBookStore.setState({
                        currentBookId: selectedBookId,
                    });
                    localStorage.removeItem(CUSTOM_CSS_STORAGE_KEY);
                    const { StorageAPI } = await loadStorageAPI();
                    if (!StorageAPI.setCurrentUser) {
                        location.reload();
                        return;
                    }
                    await StorageAPI.setCurrentUser(identity);
                    return;
                }
                await useBookStore.getState().switchToBook(selectedBookId);
                return;
            }
            if (identity) {
                const { StorageAPI } = await loadStorageAPI();
                if (!StorageAPI.setCurrentUser) {
                    location.reload();
                    return;
                }
                await StorageAPI.setCurrentUser(identity);
                return;
            }
            // 无实际变化（从个人页等入口进入）：直接关页返回
            onCancel?.();
        } finally {
            setApplying(false);
        }
    };

    const toInvite = async (book: Book) => {
        const { StorageAPI } = await loadStorageAPI();
        StorageAPI.inviteForBook?.(book.id);
        measure("feature_config_changed", {
            feature: "collaborator",
            action: "invite",
        });
    };

    const toDelete = async (book: Book) => {
        const { StorageAPI } = await loadStorageAPI();
        try {
            await StorageAPI.deleteBook(book.id);
            measure("feature_config_changed", {
                feature: "book",
                action: "delete",
            });
            // 只有删到当前账本才回引导态；删别的账本留在本页刷新列表
            if (book.id === currentBookId) {
                useBookStore.getState().switchToBook(undefined);
                return;
            }
            await useBookStore.getState().updateBookList();
            setSelectedBookId((id) => (id === book.id ? undefined : id));
        } catch (error) {
            console.log(error);
        }
    };

    const toCreate = async () => {
        const name = (await modal.prompt({
            title: t("please-input-book-name"),
            input: { type: "text" },
        })) as string;
        if (!name) {
            return;
        }
        setCreating(true);
        const { StorageAPI } = await loadStorageAPI();
        try {
            const store = await StorageAPI.createBook(name);
            measure("feature_config_changed", {
                feature: "book",
                action: "create",
            });
            await useBookStore.getState().updateBookList();
            // 新建后自动选中，交给底部确认按钮生效
            if (store?.id) {
                setSelectedBookId(store.id);
            }
        } finally {
            setCreating(false);
        }
    };

    const toCreateUser = async () => {
        const name = (await modal.prompt({
            title: t("please-input-user-name"),
            input: {
                type: "text",
                placeholder: t("custom-user-name-placeholder"),
            },
        })) as string;
        if (!name?.trim()) {
            return;
        }
        setSelectedUser(name.trim());
    };

    return (
        <div
            data-book-guide
            className="dp-drawer-surface fixed inset-0 z-[3] flex flex-col overflow-y-auto overscroll-contain bg-ground text-ink"
        >
            {onCancel && (
                <button
                    type="button"
                    aria-label={t("back")}
                    onClick={onCancel}
                    className="fixed left-4 top-[calc(var(--safe-area-inset-top)+12px)] z-10 flex size-10 items-center justify-center rounded-full bg-panel text-ink shadow-[0_1px_6px_rgba(92,62,30,0.10)]"
                >
                    <i className="icon-[lucide--chevron-left] size-5" />
                </button>
            )}
            <div className="mx-auto flex min-h-full w-full max-w-[420px] flex-col px-3 pt-[calc(var(--safe-area-inset-top)+64px)] pb-[calc(var(--safe-area-inset-bottom)+20px)]">
                <div className="my-auto flex flex-col">
                    <div className="flex flex-col items-center">
                        <img
                            src="/icon.png"
                            alt=""
                            className="size-14 flex-shrink-0 rounded-[18px] shadow-[0_4px_16px_rgba(92,62,30,0.12)]"
                        />
                        <div className="mt-2 text-[18px] font-semibold text-ink">
                            {needIdentity
                                ? t("login-finish-setup")
                                : t("select-a-book")}
                        </div>
                    </div>
                    {/* 账本：iOS 分组列表——灰组标签 + 白卡 + 细分隔线，选中行打勾 */}
                    <div className="mt-8">
                        <div className="px-1 text-[13px] text-ink-secondary">
                            {t("login-section-books")}
                        </div>
                        <div className="mt-2 divide-y divide-rule/60 overflow-hidden rounded-2xl border border-rule bg-panel">
                            {books.map((book) => {
                                const selected = book.id === selectedBookId;
                                return (
                                    <div
                                        key={book.id}
                                        className="flex min-h-[54px] items-center gap-2 px-4 py-2"
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedBookId(book.id)
                                            }
                                            className="flex min-w-0 flex-1 flex-col items-start text-left"
                                        >
                                            <span className="truncate text-[15px] font-medium text-ink">
                                                {book.name}
                                            </span>
                                            <span className="mt-0.5 truncate text-[11px] text-ink-secondary/70">
                                                {book.id}
                                            </span>
                                        </button>
                                        {core?.StorageAPI.inviteForBook && (
                                            <button
                                                type="button"
                                                onClick={() => toInvite(book)}
                                                className="flex-shrink-0 rounded-full bg-ground-muted px-2.5 py-1 text-[11px] text-ink-secondary transition-colors hover:text-brand"
                                            >
                                                {t("invite")}
                                            </button>
                                        )}
                                        {selectedBookId !== book.id && (
                                            <button
                                                type="button"
                                                onClick={() => toDelete(book)}
                                                className="flex-shrink-0 rounded-full bg-ground-muted px-2.5 py-1 text-[11px] text-ink-secondary transition-colors hover:text-[#ef4444]"
                                            >
                                                {t("delete")}
                                            </button>
                                        )}
                                        {selected && (
                                            <i className="icon-[lucide--check] size-5 flex-shrink-0 text-brand" />
                                        )}
                                    </div>
                                );
                            })}
                            {loading && (
                                <div className="px-4 py-3">
                                    <Loading>{t("loading-books")}</Loading>
                                </div>
                            )}
                            {!loading && error && (
                                /* 远端账本读不出来时不能再显示「还没有账本」：
                                   WebDAV 改密码 / token 过期 / 目录无权限都会走到这里，用户会以为账本丢了 */
                                <div className="flex flex-col items-center gap-2 px-4 py-4 text-center">
                                    <div className="text-sm text-ink">
                                        {t("books-load-failed")}
                                    </div>
                                    <div className="break-all text-[11px] leading-relaxed text-ink-secondary/70">
                                        {error}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            useBookStore
                                                .getState()
                                                .updateBookList();
                                        }}
                                        className="mt-1 rounded-full bg-ground-muted px-3 py-1.5 text-[13px] text-ink transition-colors hover:text-brand"
                                    >
                                        <i className="icon-[lucide--rotate-ccw] mr-1 inline-block size-3.5" />
                                        {t("retry")}
                                    </button>
                                </div>
                            )}
                            {!loading && !error && books.length === 0 && (
                                <div className="px-4 py-4 text-center text-[13px] text-ink-secondary">
                                    {t("no-books-go-create-one")}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={toCreate}
                                disabled={creating}
                                className="flex min-h-[50px] w-full items-center gap-2 px-4 text-[15px] text-brand transition-opacity disabled:opacity-60"
                            >
                                {creating ? (
                                    <i className="icon-[lucide--loader-circle] size-4 animate-spin" />
                                ) : (
                                    <i className="icon-[lucide--plus] size-4" />
                                )}
                                {t("create-new-book")}
                            </button>
                        </div>
                    </div>
                    {needIdentity && (
                        <div className="mt-6" data-select-user>
                            <div className="px-1 text-[13px] text-ink-secondary">
                                {t("login-section-users")}
                            </div>
                            <div className="mt-2 divide-y divide-rule/60 overflow-hidden rounded-2xl border border-rule bg-panel">
                                {selectedUser &&
                                    !choices?.includes(selectedUser) && (
                                        <div className="flex min-h-[54px] items-center justify-between gap-3 px-4 py-2">
                                            <span className="min-w-0 truncate text-[15px] text-ink">
                                                {selectedUser}
                                            </span>
                                            <i className="icon-[lucide--check] size-5 flex-shrink-0 text-brand" />
                                        </div>
                                    )}
                                {choices === undefined && (
                                    <div className="px-4 py-3">
                                        <Loading>{t("loading-books")}</Loading>
                                    </div>
                                )}
                                {choices?.map((choice) => (
                                    <button
                                        key={choice}
                                        type="button"
                                        onClick={() => setSelectedUser(choice)}
                                        className="flex min-h-[54px] w-full items-center justify-between gap-3 px-4 py-2 text-left"
                                    >
                                        <span className="min-w-0 truncate text-[15px] text-ink">
                                            {choice}
                                        </span>
                                        {selectedUser === choice && (
                                            <i className="icon-[lucide--check] size-5 flex-shrink-0 text-brand" />
                                        )}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={toCreateUser}
                                    className="flex min-h-[50px] w-full items-center gap-2 px-4 text-[15px] text-brand transition-colors hover:text-brand/80"
                                >
                                    <i className="icon-[lucide--plus] size-4" />
                                    {t("login-create-user")}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                {/* 确认统一生效：作为列的兄弟节点钉在页面最底部；内容超出一屏时随内容排在末尾 */}
                <div className="mt-8">
                    <button
                        type="button"
                        className={`h-[54px]! w-full ${BTN_PRIMARY}`}
                        disabled={!canConfirm || applying}
                        onClick={toConfirm}
                    >
                        {applying && <Loading />}
                        {t("confirm")}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function BookConfirmForm({
    onCancel,
}: {
    edit?: any;
    onCancel?: () => void;
    onConfirm?: (v: any) => void;
}) {
    // 从个人页等入口进入（showBookGuide）：提供返回，未做改动时确认即关页
    return <BookForm onCancel={onCancel} />;
}
