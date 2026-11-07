// 随账本云同步的生活模块数据桶：
// 每个 entry 在远端是独立分片（如 inventory-0.json），本地是独立 IndexedDB 库
// （book-<name>--<entry>），与账单共用同一套 stash/patch 机制实现多人同步。
import type { BaseItem } from "@/database/stash";
import type { createTidal } from "@/tidal";

export const ENTRY_NAMES = ["inventory", "medical", "vehicle"] as const;

export type EntryName = (typeof ENTRY_NAMES)[number];

/** 生活模块条目的最小结构：id 进 stash，time 命中本地 time 索引 */
export type EntryItem = BaseItem & {
    time: number;
    userId?: string | number;
};

export type TidalRepo = ReturnType<typeof createTidal>;
