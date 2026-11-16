import { toast } from "sonner";
import { useIntl } from "@/locale";
import createConfirmProvider from "../confirm";
import {
    HELP_SHEET_OPTIONS,
    HelpCode,
    HelpSection,
    HelpSheetLayout,
} from "./help-sheet";

// 免费代理只作为「临时试用」入口，默认不预填——预填会把账号密码送进公共代理，
// 与页面上「安全提醒」那段的劝退口径冲突。
const FREE_PROXY = "https://cent-backend.linkai.work/proxy?url=";

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
        <HelpSheetLayout
            title={t("proxy-help-title")}
            lead={t("proxy-help-lead")}
            onClose={onCancel}
        >
            <HelpSection title={t("proxy-help-when-title")}>
                {t("proxy-help-when-desc")}
            </HelpSection>
            <HelpSection title={t("proxy-help-how-title")}>
                {t("proxy-help-how-desc")}
                <HelpCode>https://example.com/proxy?url=</HelpCode>
                <HelpCode>
                    https://example.com/proxy?url=&lt;原始地址&gt;
                </HelpCode>
            </HelpSection>
            <HelpSection title={t("proxy-help-method-title")}>
                {t("proxy-help-method-desc")}
                <HelpCode>https://example.com/proxy?method=&amp;url=</HelpCode>
            </HelpSection>
            <HelpSection title={t("proxy-help-security-title")}>
                {t("proxy-help-security-desc")}
            </HelpSection>
            <HelpSection title={t("proxy-help-free-title")}>
                {t("proxy-help-free-desc")}
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
            </HelpSection>
        </HelpSheetLayout>
    );
};

export const [ProxyHelpProvider, showProxyHelp] = createConfirmProvider(
    ProxyHelpForm,
    {
        ...HELP_SHEET_OPTIONS,
        dialogTitle: "Proxy",
    },
);
