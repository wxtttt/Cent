import { useCallback, useMemo } from "react";
import { useShallow } from "zustand/shallow";
import type { BillTag, BillTagGroup } from "@/ledger/type";
import { t } from "@/locale";
import { measure } from "@/measurement";
import { useLedgerStore } from "@/store/ledger";

export type BillTagGroupDetail = BillTagGroup & { tags: BillTag[] };

/**
 * 自定义分组已移除（ADR-0002）。这里保留分组形状只是为了让筛选器与记账选择器
 * 继续复用同一套渲染：固定「特殊 / 普通」两段，特殊段硬单选。
 */
export function useTag() {
    const tags = useLedgerStore(
        useShallow((state) => state.infos?.meta.tags ?? []),
    );

    const grouped = useMemo<BillTagGroupDetail[]>(() => {
        const special = tags.filter((v) => v.kind === "special");
        const normal = tags.filter((v) => v.kind !== "special");
        return [
            {
                id: "special",
                name: t("special-tags"),
                color: "orange",
                singleSelect: true,
                tagIds: special.map((v) => v.id),
                tags: special,
            },
            {
                id: "normal",
                name: t("normal-tags"),
                color: "gray",
                tagIds: normal.map((v) => v.id),
                tags: normal,
            },
        ];
    }, [tags]);

    const updateTag = useCallback(
        (
            id: string,
            newTag: (Omit<BillTag, "id"> & { id?: string }) | undefined,
        ) => {
            const exists = useLedgerStore
                .getState()
                .infos?.meta.tags?.some((tag) => tag.id === id);
            const result = useLedgerStore
                .getState()
                .updateGlobalMeta((prev) => {
                    if (newTag === undefined) {
                        return {
                            ...prev,
                            tags: prev.tags.filter((v) => v.id !== id),
                        };
                    }
                    const index =
                        prev.tags?.findIndex((v) => v.id === id) ?? -1;
                    if (index === -1) {
                        return {
                            ...prev,
                            tags: [...(prev.tags ?? []), { ...newTag, id }],
                        };
                    }
                    const next = [...prev.tags];
                    next[index] = { ...newTag, id };
                    return { ...prev, tags: next };
                });
            void result.then(
                () =>
                    measure("feature_config_changed", {
                        feature: "tag",
                        action:
                            newTag === undefined
                                ? "delete"
                                : exists
                                  ? "update"
                                  : "create",
                    }),
                () => undefined,
            );
            return result;
        },
        [],
    );

    return { tags, grouped, updateTag };
}
