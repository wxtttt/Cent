import { BTN_PRIMARY } from "@/components/button-styles";
import { useIntl } from "@/locale";

/**
 * 应用内说明抽屉的共用骨架。
 * 口径（2026-11-16）：登录流程里凡是「解释某个字段怎么填 / 为什么这样填」的内容，
 * 都收进底部抽屉，不再 `target="_blank"` 跳出应用去博客或文档——用户在手机上
 * 要来回切应用，且离开后回不到原表单。
 *
 * 结构固定为：抓手条 → 标题 → 一句引导 → 分段正文（可滚）→ 贴底的关闭按钮。
 * `max-h-[90dvh]` 是实测值：82dvh 时最后一段的地址卡会被切成半截，86dvh 时 S3
 * 说明的末段还差 22px 露不全会切字；90dvh 下两页都刚好一屏（见
 * docs/agents/verification.md 2026-11-16 12:0x）。
 */
export const HELP_SHEET_OPTIONS = {
    dialogTitle: "Help",
    dialogModalClose: true,
    from: "bottom" as const,
    contentClassName:
        "w-full max-w-full rounded-t-[28px] border-0 bg-panel p-0 shadow-none sm:w-[90vw] sm:max-w-[500px] sm:rounded-md",
};

export const HelpSection = ({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) => (
    <section className="border-t border-rule/60 py-2 first:border-t-0 first:pt-0">
        <h3 className="text-[13px] font-medium text-ink">{title}</h3>
        <div className="mt-1 text-[12px] leading-[1.65] text-ink-secondary">
            {children}
        </div>
    </section>
);

export const HelpCode = ({ children }: { children: React.ReactNode }) => (
    <code className="mt-1 block break-all rounded-[6px] bg-ground px-2 py-1 font-mono text-[11px] text-ink">
        {children}
    </code>
);

export const HelpSheetLayout = ({
    title,
    lead,
    onClose,
    children,
}: {
    title: string;
    lead?: string;
    onClose?: () => void;
    children: React.ReactNode;
}) => {
    const t = useIntl();
    return (
        <div className="flex max-h-[90dvh] flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-3 pb-4">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-secondary/40" />
                <h2 className="text-center text-[17px] text-ink">{title}</h2>
                {lead && (
                    <p className="mt-1.5 text-center text-[12px] leading-relaxed text-ink-secondary">
                        {lead}
                    </p>
                )}
                <div className="mt-3">{children}</div>
            </div>
            <div className="border-t border-rule/70 px-5 pt-3 pb-[calc(20px+var(--safe-area-inset-bottom))]">
                <button
                    type="button"
                    onClick={onClose}
                    className={`h-12! w-full ${BTN_PRIMARY}`}
                >
                    {t("close")}
                </button>
            </div>
        </div>
    );
};
