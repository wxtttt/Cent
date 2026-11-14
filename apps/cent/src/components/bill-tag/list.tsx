import { useState } from "react";
import { v4 } from "uuid";
import { useTag } from "@/hooks/use-tag";
import PopupLayout from "@/layouts/popup-layout";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
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
        const active = tab === kind;
        return (
            <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between px-1 text-[12px] text-ink-secondary">
                    <span className={cn(active && "text-brand")}>
                        {kind === "special"
                            ? t("special-tags")
                            : t("normal-tags")}
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            setTab(kind);
                            void toUpdateTag({
                                name: "",
                                kind,
                            } as EditTag);
                        }}
                        className="text-[12px] text-brand"
                    >
                        ⊕ {t("add")}
                    </button>
                </div>
                <div className="divide-y divide-rule/70 overflow-hidden rounded-2xl bg-panel shadow-[0_1px_6px_rgba(92,62,30,0.05)]">
                    {list.length === 0 && (
                        <div className="px-4 py-3 text-[12px] text-ink-secondary">
                            {t("none")}
                        </div>
                    )}
                    {list.map((tag, index) => (
                        <button
                            key={tag.id}
                            type="button"
                            onClick={() =>
                                void toUpdateTag({
                                    id: tag.id,
                                    name: tag.name,
                                    kind: tag.kind ?? "normal",
                                })
                            }
                            className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2 text-left"
                        >
                            <span
                                className="h-5 w-5 flex-shrink-0 rounded-md"
                                style={{
                                    backgroundColor:
                                        DOT_COLORS[index % DOT_COLORS.length],
                                }}
                            />
                            <span className="min-w-0 flex-1 truncate text-[15px] text-ink">
                                #{tag.name}
                            </span>
                            <i className="icon-[lucide--chevron-right] size-4 flex-shrink-0 text-ink-secondary/60" />
                        </button>
                    ))}
                </div>
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
            className="dp-drawer-surface h-full overflow-hidden bg-ground"
            title={t("edit-tags")}
        >
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-6">
                <div className="mx-8 mt-1 flex rounded-full bg-ground-muted p-1">
                    {(["special", "normal"] as const).map((kind) => (
                        <button
                            key={kind}
                            type="button"
                            onClick={() => setTab(kind)}
                            className={cn(
                                "h-9 flex-1 rounded-full text-[14px] transition-colors",
                                tab === kind
                                    ? "bg-panel text-ink shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
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
