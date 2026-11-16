import { useState } from "react";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { PRESSABLE_ROW } from "./button-styles";
import createConfirmProvider from "./confirm";
import { PlaceholderCard, SheetCard, SheetShell } from "./sheet-kit";

export type OptionItem = { id: string; label: string };
export type OptionSheetValue = {
    title: string;
    hint?: string;
    empty?: string;
    options: OptionItem[];
    selected: string[];
    /** 选项很多时显示搜索框（本位币 / 快捷币种这类 30+ 选项的抽屉用） */
    searchable?: boolean;
};

const OptionSheetForm = ({
    edit,
    onCancel,
    onConfirm,
}: {
    edit?: OptionSheetValue;
    onCancel?: () => void;
    onConfirm?: (v: string[]) => void;
}) => {
    const t = useIntl();
    const [selected, setSelected] = useState<string[]>(edit?.selected ?? []);
    const [query, setQuery] = useState("");
    const keyword = query.trim().toLowerCase();
    const toggle = (id: string) =>
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
        );
    // 搜索只过滤可见项，selected 不受影响，确认仍返回完整勾选结果
    const visibleOptions =
        edit && keyword
            ? edit.options.filter(
                  (o) =>
                      o.label.toLowerCase().includes(keyword) ||
                      o.id.toLowerCase().includes(keyword),
              )
            : (edit?.options ?? []);
    const emptyText = keyword
        ? t("search-empty-results")
        : (edit?.empty ?? t("no-options"));

    return (
        <SheetShell
            title={edit?.title ?? ""}
            hint={edit?.hint}
            onCancel={onCancel}
            onConfirm={() => onConfirm?.(selected)}
        >
            {edit?.searchable && (
                <div className="mb-3 flex h-9 items-center gap-2 rounded-full bg-panel px-3.5 text-ink-secondary shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                    <i className="icon-[lucide--search] size-4 shrink-0" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t("search")}
                        aria-label={t("search")}
                        className="w-full min-w-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-secondary/70 [&::-webkit-search-cancel-button]:hidden"
                    />
                    {query && (
                        <button
                            type="button"
                            aria-label={t("clear")}
                            onClick={() => setQuery("")}
                            className="flex size-4 shrink-0 items-center justify-center"
                        >
                            <i className="icon-[lucide--x] size-3" />
                        </button>
                    )}
                </div>
            )}
            {visibleOptions.length === 0 ? (
                <PlaceholderCard>{emptyText}</PlaceholderCard>
            ) : (
                <SheetCard>
                    {visibleOptions.map((option) => {
                        const on = selected.includes(option.id);
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => toggle(option.id)}
                                className={cn(
                                    "flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-2 text-left",
                                    PRESSABLE_ROW,
                                )}
                            >
                                <span className="min-w-0 truncate text-[15px] text-ink">
                                    {option.label}
                                </span>
                                <span
                                    className={cn(
                                        "flex size-[18px] flex-shrink-0 items-center justify-center rounded-full border",
                                        on
                                            ? "border-brand bg-brand text-on-brand"
                                            : "border-rule bg-panel",
                                    )}
                                >
                                    {on && (
                                        <i className="icon-[lucide--check] size-3.5" />
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </SheetCard>
            )}
        </SheetShell>
    );
};

/**
 * 多选类字段统一「点击一行 → 底部弹出选项抽屉」。
 * 每个模块各建一个实例，避免同一 Provider 被重复挂载渲染两份弹层。
 */
export const createOptionSheet = () =>
    createConfirmProvider<OptionSheetValue, string[]>(OptionSheetForm, {
        dialogTitle: "Select Options",
        dialogModalClose: true,
        from: "bottom",
        contentClassName:
            "w-full max-w-full rounded-t-[28px] border-0 bg-ground p-0 shadow-none sm:w-[90vw] sm:max-w-[500px] sm:rounded-md",
    });
