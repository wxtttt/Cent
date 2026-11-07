import { create } from "zustand";

type UiStore = {
    /** 首页账本需要滚动到的日期（毫秒时间戳），由首页消费后清空 */
    pendingDate?: number;
    requestDate: (time: number) => void;
    consumeDate: () => void;
};

export const useUiStore = create<UiStore>()((set) => ({
    pendingDate: undefined,
    requestDate: (time) => set({ pendingDate: time }),
    consumeDate: () => set({ pendingDate: undefined }),
}));
