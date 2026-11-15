import type { ReactNode } from "react";
import { useIntl } from "@/locale";

/** 登录表单输入框样式：浅灰底 + 加深边框与页面底色拉开对比（用户口径），聚焦品牌色描边 */
export const loginInputClass =
    "flex h-11 w-full rounded-xl border border-ink-secondary/30 bg-ground-muted/60 px-3 text-[15px] text-ink shadow-sm transition-colors placeholder:text-ink-secondary/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/60 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * 登录表单的字段块：label 在上（必填带红星、选填标灰注明）、输入框在下、
 * 错误红字垫底——标准登录表单样式，一个输入框一条。
 */
export function LoginField({
    label,
    children,
    error,
    required,
    optional,
}: {
    label: string;
    children: ReactNode;
    error?: string;
    required?: boolean;
    optional?: boolean;
}) {
    const t = useIntl();
    return (
        <div className="flex flex-col gap-1.5">
            {/* 输入框是兄弟节点而非子元素，用 span 避免 label 未关联控件的 a11y 报错 */}
            <span className="text-[13px] text-ink-secondary">
                {label}
                {required && <span className="ml-0.5 text-[#ef4444]">*</span>}
                {optional && (
                    <span className="ml-1 text-ink-secondary/60">
                        （{t("login-optional")}）
                    </span>
                )}
            </span>
            {children}
            {error && (
                <p className="text-[11px] leading-none text-[#ef4444]">
                    {error}
                </p>
            )}
        </div>
    );
}
