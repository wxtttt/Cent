import { useState } from "react";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import {
    BTN_PRIMARY,
    BTN_SECONDARY,
    PRESSABLE_ROW,
    SHEET_FOOTER,
} from "./button-styles";
import createConfirmProvider from "./confirm";

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
    return (
        <div className="flex max-h-[80dvh] flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-secondary/40" />
                <h2 className="text-center text-[17px] text-ink">
                    {edit?.title}
                </h2>
                {edit?.hint && (
                    <p className="mt-1.5 text-center text-[12px] leading-relaxed text-ink-secondary">
                        {edit.hint}
                    </p>
                )}
                {edit?.searchable && (
                    <div className="mt-3 flex h-9 items-center gap-2 rounded-full bg-panel px-3.5 text-ink-secondary shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
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
                <div className="mt-5 mb-2 divide-y divide-rule/60 overflow-hidden rounded-2xl bg-panel shadow-[0_1px_6px_rgba(92,62,30,0.05)]">
                    {keyword && visibleOptions.length === 0 ? (
                        <div className="px-4 py-5 text-center text-[13px] text-ink-secondary">
                            {t("search-empty-results")}
                        </div>
                    ) : !keyword && edit && edit.options.length === 0 ? (
                        <div className="px-4 py-5 text-center text-[13px] text-ink-secondary">
                            {edit.empty ?? t("no-options")}
                        </div>
                    ) : (
                        visibleOptions.map((option) => {
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
                                    <span className="min-w-0 truncate text-[14px] text-ink">
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
                        })
                    )}
                </div>
            </div>
            <div className={SHEET_FOOTER}>
                <div className="flex gap-2.5">
                    <button
                        type="button"
                        onClick={onCancel}
                        className={cn(BTN_SECONDARY, "flex-1")}
                    >
                        {t("cancel")}
                    </button>
                    <button
                        type="button"
                        onClick={() => onConfirm?.(selected)}
                        className={cn(BTN_PRIMARY, "flex-1")}
                    >
                        {t("confirm")}
                    </button>
                </div>
            </div>
        </div>
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
