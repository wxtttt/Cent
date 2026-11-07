import type { ReactNode } from "react";
import { cn } from "@/utils";

/** 家小满式行列表单基元：分组白卡 + 左标签右值，供生活模块表单复用 */

/** 分组标题，放在卡片外 */
export function FormSection({ title }: { title: string }) {
    return (
        <div className="px-1 pb-2 text-[15px] font-semibold text-ink">
            {title}
        </div>
    );
}

/** 白色圆角分组卡，行间细分割线 */
export function FormCard({ children }: { children: ReactNode }) {
    return (
        <div className="divide-y divide-rule/60 rounded-2xl bg-panel shadow-[0_1px_6px_rgba(92,62,30,0.05)]">
            {children}
        </div>
    );
}

/** 一行：左标签 + 右值。可点行把按钮作为 children 传入，避免 button 嵌套 */
export function FormRow({
    label,
    children,
    className,
}: {
    label: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "flex min-h-[52px] items-center justify-between gap-3 px-4 py-2",
                className,
            )}
        >
            <span className="flex-shrink-0 text-[15px] text-ink">{label}</span>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5 text-right">
                {children}
            </div>
        </div>
    );
}

/** 行内右对齐的透明输入框 */
export function RowInput({
    value,
    onChange,
    placeholder,
    inputMode,
    maxLength,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    inputMode?: "text" | "decimal";
    maxLength?: number;
}) {
    return (
        <input
            value={value}
            inputMode={inputMode}
            placeholder={placeholder}
            maxLength={maxLength}
            onChange={(e) => onChange(e.target.value)}
            className="w-full min-w-0 cursor-text bg-transparent text-right text-[15px] text-ink outline-none placeholder:text-ink-secondary/70"
        />
    );
}

/** 右对齐输入框 + 下方 n/max 字数计数（对齐家小满备注行样式） */
export function CountedRowInput({
    value,
    onChange,
    placeholder,
    maxLength = 255,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    maxLength?: number;
}) {
    return (
        <div className="flex flex-col items-end gap-1">
            <RowInput
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                maxLength={maxLength}
            />
            <span className="text-[11px] leading-none text-ink-secondary/70">
                {value.length}/{maxLength}
            </span>
        </div>
    );
}

/** 选择行的右箭头 */
export function RowChevron() {
    return (
        <i className="icon-[mdi--chevron-right] size-4 flex-shrink-0 text-ink-secondary/60" />
    );
}

/** 卡片内无边框的内容块（标签候选、图片等） */
export function FormBlock({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            {children}
        </div>
    );
}
