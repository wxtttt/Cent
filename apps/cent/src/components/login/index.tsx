/** biome-ignore-all lint/a11y/noSvgWithoutTitle: <explanation> */
import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/shallow";
import {
    AppDownloadIcons,
    useLoginAppDownloadPlatforms,
} from "@/components/app-download";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/button-styles";
import { useIntl } from "@/locale";
import { isMeasurementEnabled, measure } from "@/measurement";
import { useIsLogin, useUserStore } from "@/store/user";
import { cn } from "@/utils";
import { popCanvasSurface, pushCanvasSurface } from "@/utils/viewport";
import { WelcomeHero } from "./welcome-hero";

const loaded = import("@/api/storage");

const loadStorageAPI = async () => {
    const lib = await loaded;
    return lib.StorageAPI;
};

const LOGIN_METHODS = ["github", "gitee", "webdav", "s3", "offline"] as const;
type LoginMethod = (typeof LOGIN_METHODS)[number];
let loginMethodMeasured = false;

function isLoginMethod(value: string): value is LoginMethod {
    return (LOGIN_METHODS as readonly string[]).includes(value);
}

/**
 * 登录页走典型登录页结构（2026-11-15 16:51，用户明确「要像个登录页」）：
 * - 无设置式顶栏；居中品牌欢迎区（80px 图标 + 应用名 + 标语）直接铺在底色上，
 *   尺寸对齐窄屏 360 的视觉比例（80/402 ≈ 72/360），行内图标 20px；
 * - 五颗 54px 大按钮一列堆叠：Gitee 橙色主按钮、GitHub 白色次按钮、离线模式、
 *   WebDAV、S3（用户口径「其他方式也改成上面的 GitHub 等的样式」，不再分组行卡）；
 *   「现有 Token」胶囊挂在按钮右缘，与行卡同一套非嵌套按钮做法；
 * - WebDAV / S3 点击进入各自的二级路由页表单（/login/webdav、/login/s3）；
 * - dp-drawer-surface 中性灰白体系（#f4f4f4 底 + 纯白卡 + 近黑字），深色模式自动回落全局暗色令牌。
 */

const GITHUB_ICON = (
    // lucide 的 github 是猫头轮廓，18px 下像竖拇指、认不出品牌；
    // 改用官方 Octocat 实心标，与 Gitee 行同款实心 SVG
    <svg
        fill="currentColor"
        viewBox="0 0 24 24"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M12 .297C5.373.297 0 5.67 0 12.297c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297 24 5.67 18.627.297 12 .297z" />
    </svg>
);

const GITEE_ICON = (
    <svg
        fill="currentColor"
        viewBox="0 0 24 24"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.63c0 .327.266.592.593.592h5.63c.982 0 1.778-.796 1.778-1.778v-.296a.593.593 0 0 0-.592-.593h-4.15a.592.592 0 0 1-.592-.592v-1.482a.593.593 0 0 1 .593-.592h6.815c.327 0 .593.265.593.592v3.408a4 4 0 0 1-4 4H5.926a.593.593 0 0 1-.593-.593V9.778a4.444 4.444 0 0 1 4.445-4.444h8.296z" />
    </svg>
);

/**
 * 54px 大按钮：主操作整颗按钮可点，「现有 Token」这类次级操作以胶囊叠在右缘，
 * 纯展示的右值（如离线模式的「无需账号」）与胶囊同位但不可交互。
 * 胶囊是主按钮的兄弟节点绝对定位，不构成 button 嵌套 button。
 */
function BigLoginButton({
    icon,
    label,
    variant,
    onClick,
    tokenLabel,
    onToken,
    value,
}: {
    icon: ReactNode;
    label: string;
    variant: "primary" | "secondary";
    onClick: () => void;
    tokenLabel?: string;
    onToken?: () => void;
    value?: string;
}) {
    return (
        <div className="relative">
            <button
                type="button"
                aria-label={label}
                onClick={onClick}
                className={cn(
                    // 登录页主 CTA 比例对齐窄屏：54/402 ≈ 48/360，比全局 BTN_BASE 48px 高一档；
                    // BTN_* 常量自带 h-12，同属性工具类顺序不可控，必须用 v4 的后缀 ! 强量级覆盖
                    "h-[54px]! w-full",
                    variant === "primary" ? BTN_PRIMARY : BTN_SECONDARY,
                )}
            >
                <span className="pointer-events-none flex items-center justify-center gap-2 [&>svg]:size-[20px]">
                    {icon}
                    {label}
                </span>
            </button>
            {value && (
                // 与「现有 Token」胶囊同几何（px-2.5 py-1 text-[11px] rounded-full），
                // 但用中性灰底表明这是展示值、不可点
                <span className="pointer-events-none absolute right-3 top-1/2 z-[1] flex-shrink-0 -translate-y-1/2 rounded-full bg-ground-muted px-2.5 py-1 text-[11px] text-ink-secondary">
                    {value}
                </span>
            )}
            {tokenLabel && onToken && (
                <button
                    type="button"
                    aria-label={tokenLabel}
                    onClick={onToken}
                    className={cn(
                        "absolute right-3 top-1/2 z-10 flex-shrink-0 -translate-y-1/2 rounded-full px-2.5 py-1 text-[11px] transition-[transform,background-color] duration-150 enabled:hover:brightness-95 enabled:active:scale-95",
                        variant === "primary"
                            ? "bg-white/90 text-brand"
                            : "bg-brand/10 text-brand",
                    )}
                >
                    {tokenLabel}
                </button>
            )}
        </div>
    );
}

function LoginFooter({
    platforms,
}: {
    platforms: ReturnType<typeof useLoginAppDownloadPlatforms>;
}) {
    const t = useIntl();
    return (
        <div className="flex flex-col items-center gap-3 pt-8">
            {/* 「添加到主屏幕」保持在下载 / 查看介绍这些按钮的上面（用户口径），页脚整体钉在页面最底部 */}
            <div className="flex items-center gap-1.5 text-[11px] text-ink-secondary">
                <i className="icon-[lucide--info] size-3.5 flex-shrink-0" />
                <span>{t("pwa-install-tip")}</span>
            </div>
            <div className="flex items-center gap-3">
                <AppDownloadIcons
                    variant="login"
                    platforms={platforms}
                    buttonClassName="inline-flex size-9 items-center justify-center rounded-full border border-rule bg-panel text-ink-secondary shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-colors hover:border-brand/60 hover:text-brand"
                />
                {platforms.length > 0 && (
                    <span className="size-1 rounded-full bg-rule" />
                )}
                <a
                    className="text-[12px] text-ink-secondary underline underline-offset-2 hover:text-brand"
                    target="_blank"
                    href="https://glink25.github.io/post/Cent---%E4%BD%A0%E5%8F%AF%E8%83%BD%E5%8F%AA%E9%9C%80%E8%A6%81%E4%B8%80%E4%B8%AA%E8%AE%B0%E8%B4%A6%E8%BD%AF%E4%BB%B6/"
                    rel="noopener noreferrer"
                >
                    {t("see-introduce")}
                </a>
            </div>
            {isMeasurementEnabled() && (
                <p className="px-2 text-center text-[11px] leading-relaxed text-ink-secondary">
                    {t("login-agreement-prefix")}{" "}
                    <a
                        className="text-brand hover:underline"
                        href="https://linkai.work/cent/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {t("terms-of-use")}
                    </a>{" "}
                    {t("login-agreement-conjunction")}{" "}
                    <a
                        className="text-brand hover:underline"
                        href="https://linkai.work/cent/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {t("privacy-policy")}
                    </a>
                    {t("login-agreement-suffix")}
                </p>
            )}
        </div>
    );
}

export default function Login() {
    const t = useIntl();
    const isLogin = useIsLogin();
    const [loading] = useUserStore(
        useShallow((state) => {
            return [state.loading];
        }),
    );
    const platforms = useLoginAppDownloadPlatforms();
    useEffect(() => {
        if (!isLogin || loginMethodMeasured) return;
        loginMethodMeasured = true;
        void loadStorageAPI()
            .then((StorageAPI) => {
                const method = StorageAPI.type;
                if (isLoginMethod(method)) {
                    measure("login_method_used", { method });
                }
            })
            .catch(() => {});
    }, [isLogin]);
    // iOS 26 PWA 底部 home 条区域露出的是 html 画布底色，登录页是灰面，
    // 打开期间把画布同步成抽屉灰，条带才不会在页面下露出一截暖米
    useEffect(() => {
        if (isLogin) return;
        pushCanvasSurface();
        return popCanvasSurface;
    }, [isLogin]);

    if (isLogin) {
        return null;
    }

    // 两个入口都要把 endpoint 的 promise return 出来，由 go() 统一接住取消时的 reject，
    // 否则「现有 Token」/ WebDAV / S3 表单取消会变成未处理拒绝
    const loginWith = async (method: LoginMethod) => {
        const StorageAPI = await loadStorageAPI();
        return StorageAPI.loginWith(method);
    };
    const loginManually = async (method: "github" | "gitee") => {
        const StorageAPI = await loadStorageAPI();
        return StorageAPI.loginManuallyWith(method);
    };
    // void 直接弃掷会让取消 prompt 的 reject 变成未处理拒绝，必须接住静默丢弃
    const go = (fn: () => Promise<void>) => () => void fn().catch(() => {});

    return createPortal(
        <div
            data-login-page
            className="dp-drawer-surface fixed inset-0 z-[1] overflow-y-auto overscroll-contain bg-ground text-ink"
        >
            <div className="mx-auto flex min-h-full w-full max-w-[420px] flex-col px-3 pt-[calc(var(--safe-area-inset-top)+40px)] pb-[calc(var(--safe-area-inset-bottom)+20px)]">
                {/* 只有核心内容块垂直居中，页脚钉在页面最底部（用户口径：添加到主屏幕等
                    页脚信息要在最下面）；my-auto 在溢出时自动归零，窄屏比例不变 */}
                <div className="my-auto flex flex-col">
                    <h1 className="sr-only">{t("login-page-title")}</h1>
                    <WelcomeHero />
                    {loading ? (
                        <div className="mt-8 flex h-[58px] items-center justify-center gap-2 rounded-2xl bg-panel text-[14px] text-ink-secondary shadow-[0_1px_6px_rgba(92,62,30,0.05)]">
                            <i className="icon-[lucide--loader-circle] size-4 animate-spin" />
                            {t("login")}
                        </div>
                    ) : (
                        <>
                            <div className="mt-8 flex flex-col gap-3">
                                <BigLoginButton
                                    variant="primary"
                                    icon={GITEE_ICON}
                                    label={t("login-to-gitee")}
                                    onClick={go(() => loginWith("gitee"))}
                                    tokenLabel={t("login-token")}
                                    onToken={go(() => loginManually("gitee"))}
                                />
                                <BigLoginButton
                                    variant="secondary"
                                    icon={GITHUB_ICON}
                                    label={t("login-to-github")}
                                    onClick={go(() => loginWith("github"))}
                                    tokenLabel={t("login-token")}
                                    onToken={go(() => loginManually("github"))}
                                />
                                <BigLoginButton
                                    variant="secondary"
                                    icon={
                                        <i className="icon-[lucide--cloud] size-[20px]" />
                                    }
                                    label={t("login-to-webdav")}
                                    onClick={go(() => loginWith("webdav"))}
                                />
                                <BigLoginButton
                                    variant="secondary"
                                    icon={
                                        <i className="icon-[lucide--database] size-[20px]" />
                                    }
                                    label={t("login-to-s3")}
                                    onClick={go(() => loginWith("s3"))}
                                />
                                {/* 离线模式压轴放最下（用户口径） */}
                                <BigLoginButton
                                    variant="secondary"
                                    icon={
                                        <i className="icon-[lucide--hard-drive] size-[20px]" />
                                    }
                                    label={t("offline-mode")}
                                    onClick={go(() => loginWith("offline"))}
                                    value={t("login-no-account")}
                                />
                            </div>
                        </>
                    )}
                </div>
                <LoginFooter platforms={platforms} />
            </div>
        </div>,
        document.body,
    );
}
