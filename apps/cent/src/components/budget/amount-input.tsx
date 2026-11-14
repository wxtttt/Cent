import { useState } from "react";
import { cn } from "@/utils";

export const formatAmount = (n: number) => n.toLocaleString("zh-CN");

/**
 * 金额输入：无边框，未设置时是一个灰色 0 占位，¥ 在数字右侧；填入后用主文字黑色。
 * 0 不预填进 value，聚焦自动全选可直接覆盖旧值，失焦按千分位显示。
 * 用 text + inputMode 而非 number，才能可靠全选、格式化和保留输入中的小数点。
 */
export const AmountInput = ({
    value,
    onChange,
    size = "lg",
    className,
    onFocusRow,
}: {
    value: number;
    onChange?: (v: number) => void;
    size?: "lg" | "sm";
    className?: string;
    /** 分配预算抽屉里，点击金额行时展开该行的滑动条 */
    onFocusRow?: () => void;
}) => {
    const [focused, setFocused] = useState(false);
    /** 聚焦期间保留用户原始键入（含末尾小数点），避免受控数值把 "1." 吃掉 */
    const [draft, setDraft] = useState<string | null>(null);
    const shown =
        draft ??
        (value <= 0 ? "" : focused ? String(value) : formatAmount(value));
    return (
        <div
            className={cn(
                "flex h-9 min-w-0 items-center justify-end gap-1",
                className,
            )}
        >
            <input
                type="text"
                inputMode="decimal"
                value={shown}
                placeholder="0"
                onFocus={(e) => {
                    setFocused(true);
                    setDraft(value > 0 ? String(value) : "");
                    const el = e.currentTarget;
                    requestAnimationFrame(() => el.select());
                    onFocusRow?.();
                }}
                onBlur={() => {
                    setFocused(false);
                    setDraft(null);
                }}
                onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d.]/g, "");
                    const [int, ...dec] = raw.split(".");
                    const clean =
                        dec.length > 0 ? `${int}.${dec.join("")}` : int;
                    setDraft(clean);
                    onChange?.(Number(clean) || 0);
                }}
                className={cn(
                    "min-w-0 flex-1 bg-transparent text-right text-ink outline-none placeholder:text-ink-secondary/70",
                    size === "lg" ? "text-[15px]" : "text-[13px]",
                )}
            />
            <span
                className={cn(
                    "flex-shrink-0 text-ink-secondary",
                    size === "lg" ? "text-[12px]" : "text-[11px]",
                )}
            >
                ¥
            </span>
        </div>
    );
};
