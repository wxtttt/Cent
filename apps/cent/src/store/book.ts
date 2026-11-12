import { produce } from "immer";
import type { StateCreator } from "zustand";
import { create } from "zustand";
import type { PersistOptions } from "zustand/middleware";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Book } from "@/api/endpoints/type";
import { CUSTOM_CSS_STORAGE_KEY } from "@/utils/preset";
import { loadStorageAPI } from "../api/storage/dynamic";

type BookStoreState = {
    currentBookId: string | undefined;
    books: Book[];
    visible: boolean;
    loading: boolean;
    /** 拉取远端账本失败的原因；WebDAV/S3 网络或鉴权异常时用于界面提示 */
    error?: string;
};

type BookStoreActions = {
    addBook: (name: string) => Promise<void>;
    deleteBook: (id: string) => Promise<void>;
    switchToBook: (id: string | undefined) => Promise<void>;
    updateBookList: () => Promise<Book[]>;
};

type BookStore = BookStoreState & BookStoreActions;

type Persist<S> = (
    config: StateCreator<S>,
    options: PersistOptions<S>,
) => StateCreator<S>;

export const useBookStore = create<BookStore>()(
    (persist as Persist<BookStore>)(
        (set) => {
            const visible = false;
            const loading = false;
            const updateBookList = async () => {
                await Promise.resolve();
                set(
                    produce((state) => {
                        state.loading = true;
                    }),
                );
                try {
                    const { StorageAPI } = await loadStorageAPI();
                    const res = await StorageAPI.fetchAllBooks();
                    const allBooks = res;
                    set(
                        produce((state: BookStore) => {
                            state.books = allBooks;
                            state.error = undefined;
                        }),
                    );
                    return allBooks;
                } catch (error) {
                    // 以前这里是静默失败：books 保持空数组，界面会显示「还没有账本」，
                    // 用户会误以为远端账本丢了（WebDAV 改密码 / token 过期 / 目录不可读都会走到这里）
                    set(
                        produce((state: BookStore) => {
                            state.error =
                                (error as Error)?.message ??
                                JSON.stringify(error);
                        }),
                    );
                    return [] as Book[];
                } finally {
                    set(
                        produce((state) => {
                            state.loading = false;
                        }),
                    );
                }
            };
            updateBookList();
            return {
                loading,
                visible,
                books: [],
                currentBookId: undefined,
                updateBookList,
                addBook: async (name) => {
                    const { StorageAPI } = await loadStorageAPI();
                    await StorageAPI.createBook(name);
                    await updateBookList();
                },
                deleteBook: async (id) => {
                    await updateBookList();
                },
                switchToBook: async (id) => {
                    set(
                        produce((state) => {
                            state.currentBookId = id;
                            state.visible = false;
                            localStorage.removeItem(CUSTOM_CSS_STORAGE_KEY);
                            Promise.resolve().then(() => {
                                location.reload();
                            });
                        }),
                    );
                },
            };
        },
        {
            name: "book-store",
            storage: createJSONStorage(() => localStorage),
            version: 0,
            partialize(state) {
                return {
                    books: state.books,
                    currentBookId: state.currentBookId,
                } as any;
            },
        },
    ),
);
