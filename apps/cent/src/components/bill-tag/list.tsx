import { useState } from "react";
import { v4 } from "uuid";
import { useTag } from "@/hooks/use-tag";
import PopupLayout from "@/layouts/popup-layout";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { GroupTitle, ListCard, ListRow, PlaceholderCard } from "../sheet-kit";
import type { EditTag } from "./tag";
import { EditTagProvider, showEditTag } from "./tag-form";

const DOT_COLORS = [
    "#FF7A2F",
    "#3B82F6",
    "#9B7BF0",
    "#6FCF97",
    "#F2C94C",
    "#EB5757",
    "#56CCF2",
    "#BB6BD9",
];

/** 固定两段 + 连卡列表，编辑走底部抽屉；不再有自定义标签分组 */
export default function TagList({
    onCancel,
}: {
    edit?: unknown;
    onCancel?: () => void;
    onConfirm?: (v: unknown) => void;
}) {
    const t = useIntl();
    const { tags, updateTag } = useTag();
    const [tab, setTab] = useState<"special" | "normal">("special");

    const toUpdateTag = async (tag?: EditTag) => {
        const defaultKind = tag?.kind ?? tab;
        const newTag = await showEditTag(
            tag ?? ({ name: "", kind: defaultKind } as EditTag),
        ).catch(() => undefined);
        if (newTag === "delete") {
            if (tag?.id) {
                await updateTag(tag.id, undefined);
            }
            return;
        }
        if (!newTag?.name) {
            return;
        }
        await updateTag(tag?.id ?? v4(), {
            name: newTag.name,
            kind: newTag.kind,
        });
    };

    const section = (kind: "special" | "normal") => {
        const list = tags.filter((v) =>
            kind === "special" ? v.kind === "special" : v.kind !== "special",
        );
        return (
            <div>
                <GroupTitle
                    title={
                        kind === "special"
                            ? t("special-tags")
                            : t("normal-tags")
                    }
                    className="mt-4"
                />
                {list.length === 0 ? (
                    <PlaceholderCard>{t("none")}</PlaceholderCard>
                ) : (
                    <ListCard>
                        {list.map((tag, index) => (
                            <ListRow
                                key={tag.id}
                                badge={
                                    <span
                                        className="size-5 flex-shrink-0 rounded-md"
                                        style={{
                                            backgroundColor:
                                                DOT_COLORS[
                                                    index % DOT_COLORS.length
                                                ],
                                        }}
                                    />
                                }
                                title={`#${tag.name}`}
                                onClick={() =>
                                    void toUpdateTag({
                                        id: tag.id,
                                        name: tag.name,
                                        kind: tag.kind ?? "normal",
                                    })
                                }
                            />
                        ))}
                    </ListCard>
                )}
                <div className="mt-1.5 px-1 text-[11px] leading-relaxed text-ink-secondary">
                    {kind === "special"
                        ? t("special-tag-hint")
                        : t("normal-tag-hint")}
                </div>
            </div>
        );
    };

    return (
        <PopupLayout
            onBack={onCancel}
            backStyle="circle"
            className="dp-drawer-surface h-full overflow-hidden bg-ground"
            title={t("edit-tags")}
            right={
                <button
                    type="button"
                    data-tag-add
                    aria-label={t("add")}
                    onClick={() =>
                        void toUpdateTag({
                            name: "",
                            kind: tab === "special" ? "special" : "normal",
                        } as EditTag)
                    }
                    className="flex size-10 items-center justify-center rounded-full bg-panel text-ink shadow-[0_1px_6px_rgba(92,62,30,0.10)] transition-colors hover:text-brand active:bg-ground-muted"
                >
                    <i className="icon-[lucide--plus] size-5" />
                </button>
            }
        >
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pt-3 pb-6">
                <div className="mx-8 flex h-10 flex-shrink-0 rounded-full bg-panel p-1 shadow-sm">
                    {(["special", "normal"] as const).map((kind) => (
                        <button
                            key={kind}
                            type="button"
                            onClick={() => setTab(kind)}
                            className={cn(
                                "h-8 flex-1 rounded-full text-[14px] transition-colors",
                                tab === kind
                                    ? "bg-ground-muted font-semibold text-ink"
                                    : "text-ink-secondary",
                            )}
                        >
                            {kind === "special"
                                ? t("special-short")
                                : t("normal-short")}
                        </button>
                    ))}
                </div>
                {section("special")}
                {section("normal")}
            </div>
            <EditTagProvider />
        </PopupLayout>
    );
}
