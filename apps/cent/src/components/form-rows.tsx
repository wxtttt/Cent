import type { ReactNode } from "react";
import { cn } from "@/utils";
import { GroupTitle, ListCard, SheetRow } from "./sheet-kit";

/** 生活模块表单基元：全部委托给 `sheet-kit`，保证与预算 / 贷款 / 币种页同一套版式 */
/** @deprecated 二级页直接用 `GroupTitle`；这里保留旧名字给尚未迁移的表单用 */
export function FormSection({
    title,
    className,
}: {
    title: string;
    className?: string;
}) {
    return <GroupTitle title={title} className={cn("mt-0", className)} />;
}

/** 白色圆角分组卡，与 `ListCard` 完全同款（不要再写一份 class） */
export function FormCard({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return <ListCard className={className}>{children}</ListCard>;
}

/**
 * 一行「左标签 + 右内容」，委托 `SheetRow`（52px 固定行高）。
 * 标签默认 92px 成列，超长标签可自然撑开，不会挤掉右侧内容。
 */
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
        <SheetRow label={label} className={className}>
            {children}
        </SheetRow>
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

/** 右对齐输入框 + 下方 n/max 字数计数（对齐APK 备注行样式） */
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
        <i className="icon-[lucide--chevron-right] size-4 flex-shrink-0 text-ink-secondary/60" />
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
