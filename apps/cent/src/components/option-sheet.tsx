import { useState } from "react";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { BTN_PRIMARY, BTN_SECONDARY, PRESSABLE_ROW } from "./button-styles";
import createConfirmProvider from "./confirm";

export type OptionItem = { id: string; label: string };
export type OptionSheetValue = {
    title: string;
    hint?: string;
    empty?: string;
    options: OptionItem[];
    selected: string[];
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
    const toggle = (id: string) =>
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
        );
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
                <div className="mt-5 mb-2 divide-y divide-rule/60 overflow-hidden rounded-2xl bg-panel shadow-[0_1px_6px_rgba(92,62,30,0.05)]">
                    {edit?.options.length === 0 && (
                        <div className="px-4 py-5 text-center text-[13px] text-ink-secondary">
                            {edit.empty ?? t("no-options")}
                        </div>
                    )}
                    {edit?.options.map((option) => {
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
                    })}
                </div>
            </div>
            <div className="border-t border-rule/70 bg-ground px-5 pt-2.5 pb-5">
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
