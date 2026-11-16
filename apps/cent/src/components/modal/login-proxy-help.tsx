import { toast } from "sonner";
import { BTN_PRIMARY } from "@/components/button-styles";
import { useIntl } from "@/locale";
import createConfirmProvider from "../confirm";

// 免费代理只作为「临时试用」入口，默认不预填——预填会把账号密码送进公共代理，
// 与页面上「安全提醒」那段的劝退口径冲突。
const FREE_PROXY = "https://cent-backend.linkai.work/proxy?url=";

const Section = ({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) => (
    <section className="border-t border-rule/60 py-2.5 first:border-t-0 first:pt-0">
        <h3 className="text-[13px] font-medium text-ink">{title}</h3>
        <div className="mt-1 text-[12px] leading-[1.65] text-ink-secondary">
            {children}
        </div>
    </section>
);

const Code = ({ children }: { children: React.ReactNode }) => (
    <code className="mt-1 block break-all rounded-[6px] bg-ground px-2 py-1 font-mono text-[11px] text-ink">
        {children}
    </code>
);

/**
 * 代理地址说明抽屉（WebDAV 登录页字段右侧的「?」）。
 * 以前这个问号直接跳出应用去博客的「使用代理」小节，用户在手机上要来回切应用；
 * 这里把那段内容收成四段放进底部抽屉，顺序按用户真正会问的：什么时候需要 →
 * 怎么填 → 代理拦 PROPFIND 怎么办 → 安全提醒。口径与博客原文一致，
 * 尤其是「拼接式代理」「method= 兼容参数」「坚果云必须自建」三条不能改写。
 */
const ProxyHelpForm = ({ onCancel }: { onCancel?: () => void }) => {
    const t = useIntl();
    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(FREE_PROXY);
            toast.success(t("copied"));
        } catch {
            toast.error(t("copy-failed"));
        }
    };
    return (
        <div className="flex max-h-[86dvh] flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-3 pb-4">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-secondary/40" />
                <h2 className="text-center text-[17px] text-ink">
                    {t("proxy-help-title")}
                </h2>
                <p className="mt-1.5 text-center text-[12px] leading-relaxed text-ink-secondary">
                    {t("proxy-help-lead")}
                </p>
                <div className="mt-3">
                    <Section title={t("proxy-help-when-title")}>
                        {t("proxy-help-when-desc")}
                    </Section>
                    <Section title={t("proxy-help-how-title")}>
                        {t("proxy-help-how-desc")}
                        <Code>https://example.com/proxy?url=</Code>
                        <Code>
                            https://example.com/proxy?url=&lt;原始地址&gt;
                        </Code>
                    </Section>
                    <Section title={t("proxy-help-method-title")}>
                        {t("proxy-help-method-desc")}
                        <Code>https://example.com/proxy?method=&amp;url=</Code>
                    </Section>
                    <Section title={t("proxy-help-security-title")}>
                        {t("proxy-help-security-desc")}
                    </Section>
                    <Section title={t("proxy-help-free-title")}>
                        {t("proxy-help-free-desc")}{" "}
                        <a
                            href={t("web-dav-proxy-url")}
                            target="_blank"
                            rel="noopener"
                            className="text-brand"
                        >
                            {t("proxy-help-source")}
                        </a>
                        <div className="mt-1.5 flex items-center gap-2 rounded-[6px] bg-ground px-2 py-1">
                            <code className="min-w-0 flex-1 break-all font-mono text-[11px] text-ink">
                                {FREE_PROXY}
                            </code>
                            <button
                                type="button"
                                onClick={onCopy}
                                className="flex h-8 flex-shrink-0 items-center rounded-full bg-panel px-2.5 text-[11px] text-ink-secondary active:bg-ground-muted"
                            >
                                {t("copy-address")}
                            </button>
                        </div>
                    </Section>
                </div>
            </div>
            <div className="border-t border-rule/70 px-5 pt-3 pb-[calc(20px+var(--safe-area-inset-bottom))]">
                <button
                    type="button"
                    onClick={onCancel}
                    className={`h-12! w-full ${BTN_PRIMARY}`}
                >
                    {t("close")}
                </button>
            </div>
        </div>
    );
};

export const [ProxyHelpProvider, showProxyHelp] = createConfirmProvider(
    ProxyHelpForm,
    {
        dialogTitle: "Proxy",
        dialogModalClose: true,
        from: "bottom",
        contentClassName:
            "w-full max-w-full rounded-t-[28px] border-0 bg-panel p-0 shadow-none sm:w-[90vw] sm:max-w-[500px] sm:rounded-md",
    },
);
