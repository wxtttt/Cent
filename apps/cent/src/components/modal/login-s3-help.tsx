import { useIntl } from "@/locale";
import createConfirmProvider from "../confirm";
import {
    HELP_SHEET_OPTIONS,
    HelpCode,
    HelpSection,
    HelpSheetLayout,
} from "./help-sheet";

// 浏览器端直接访问桶，跨域允许来源必须写应用的真实来源（与 WebDAV 代理说明同一口径）
const APP_ORIGIN = "https://cent.linkai.work";

/**
 * S3 登录页的「?」说明抽屉。
 * 以前这一页没有任何解释入口——Endpoint / Region / Bucket / AK / SK 全是裸字段，
 * 用户唯一能查的是外部文档，手机上要跳出应用。这里把「每格填什么、去哪拿、
 * 连不上怎么查」收进底部抽屉，顺序按实际填表顺序：Endpoint → Region/Bucket →
 * 密钥 → 跨域排查 → 高级选项。
 */
const S3HelpForm = ({ onCancel }: { onCancel?: () => void }) => {
    const t = useIntl();
    return (
        <HelpSheetLayout
            title={t("s3-help-title")}
            lead={t("s3-help-lead")}
            onClose={onCancel}
        >
            <HelpSection title={t("s3-help-endpoint-title")}>
                {t("s3-help-endpoint-desc")}
                <HelpCode>https://s3.amazonaws.com</HelpCode>
                <HelpCode>https://oss-cn-hangzhou.aliyuncs.com</HelpCode>
                <HelpCode>https://cos.ap-guangzhou.myqcloud.com</HelpCode>
            </HelpSection>
            <HelpSection title={t("s3-help-region-title")}>
                {t("s3-help-region-desc")}
            </HelpSection>
            <HelpSection title={t("s3-help-key-title")}>
                {t("s3-help-key-desc")}
            </HelpSection>
            <HelpSection title={t("s3-help-cors-title")}>
                {t("s3-help-cors-desc")}
                <HelpCode>{APP_ORIGIN}</HelpCode>
            </HelpSection>
            <HelpSection title={t("s3-help-advanced-title")}>
                {t("s3-help-advanced-desc")}
            </HelpSection>
        </HelpSheetLayout>
    );
};

export const [S3HelpProvider, showS3Help] = createConfirmProvider(S3HelpForm, {
    ...HELP_SHEET_OPTIONS,
    dialogTitle: "S3",
});
