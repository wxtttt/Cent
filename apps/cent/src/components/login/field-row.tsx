/**
 * 行式下划线字段（主流 iOS 登录表单样式）：左标签 + 右输入 + 底部细线，
 * 聚焦时细线变品牌色；必填红星 / 选填灰标注。
 * 列宽由调用方约束居中（细线不顶满屏幕两边），WebDAV / S3 登录路由页共用。
 */
export function FieldRow({
    label,
    required,
    optional,
    optionalLabel,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    optional?: boolean;
    optionalLabel?: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col">
            <div
                className={`flex items-center gap-3 border-b pb-3 pt-2 transition-colors ${
                    error
                        ? "border-[#ef4444]/60"
                        : "border-ink-secondary/15 focus-within:border-brand"
                }`}
            >
                <span className="flex-shrink-0 text-[15px] text-ink">
                    {label}
                    {required && (
                        <span className="ml-0.5 text-[#ef4444]">*</span>
                    )}
                    {optional && (
                        <span className="ml-1 text-[13px] text-ink-secondary/60">
                            （{optionalLabel}）
                        </span>
                    )}
                </span>
                {children}
            </div>
            {error && (
                <p className="mt-1 text-[11px] leading-none text-[#ef4444]">
                    {error}
                </p>
            )}
        </div>
    );
}
