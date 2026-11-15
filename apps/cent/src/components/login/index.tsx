/** biome-ignore-all lint/a11y/noSvgWithoutTitle: <explanation> */
import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/shallow";
import {
    AppDownloadIcons,
    useLoginAppDownloadPlatforms,
} from "@/components/app-download";
import { PRESSABLE_ROW } from "@/components/button-styles";
import { useIntl } from "@/locale";
import { isMeasurementEnabled, measure } from "@/measurement";
import { useIsLogin, useUserStore } from "@/store/user";
import { cn } from "@/utils";

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
 * 页面整体对齐预算管理 / 分类管理：
 * - PopupLayout 同款居中顶栏（圆形图标位 + 17px 标题）；
 * - dp-drawer-surface 中性灰白体系（#f4f4f4 底 + 纯白卡 + 近黑字），不用首页暖米；
 * - 分组小标题一律在白卡外，一组一张 rounded-2xl 连卡；
 * - 行沿用 SettingRow 的「15px 主标题 + 11px 灰说明 + 右侧值 + chevron」。
 * 深色模式下 dp-drawer-surface 不生效，自动回落到全局暗色令牌。
 */
const CARD =
    "divide-y divide-rule/70 overflow-hidden rounded-2xl bg-panel shadow-[0_1px_6px_rgba(92,62,30,0.05)]";

/** 与预算管理 GroupTitle 同款：卡片外的 12px 分组标题 */
function GroupTitle({
    children,
    first,
}: {
    children: ReactNode;
    first?: boolean;
}) {
    return (
        <div
            className={cn(
                "mb-1.5 flex items-center justify-between gap-2 px-1 text-[12px] text-ink-secondary",
                first ? "mt-4" : "mt-3",
            )}
        >
            <span>{children}</span>
        </div>
    );
}

/**
 * 一行一种登录方式：左侧 32px 品牌图标块、中间主标题 + 说明、右侧值 / Token + chevron。
 * 主按钮 absolute inset-0 铺满整行保证点击面积，Token 这类次级动作放在相对上层，
 * 避免 button 嵌套 button（与预算抽屉可展开行同一套做法）。
 */
function LoginRow({
    icon,
    title,
    hint,
    value,
    onClick,
    tokenLabel,
    onToken,
}: {
    icon: ReactNode;
    title: string;
    hint: string;
    value?: string;
    onClick: () => void;
    tokenLabel?: string;
    onToken?: () => void;
}) {
    return (
        <div className="relative flex min-h-[58px] items-center gap-3 px-4 py-1.5">
            <button
                type="button"
                aria-label={title}
                onClick={onClick}
                className={`absolute inset-0 z-0 ${PRESSABLE_ROW}`}
            />
            <span className="pointer-events-none relative z-[1] flex size-8 flex-shrink-0 items-center justify-center rounded-[10px] bg-brand/10 text-brand [&>svg]:size-[18px]">
                {icon}
            </span>
            <span className="pointer-events-none relative z-[1] min-w-0 flex-1 py-1">
                <span className="block truncate text-[15px] font-medium text-ink">
                    {title}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-ink-secondary">
                    {hint}
                </span>
            </span>
            {value && (
                <span className="pointer-events-none relative z-[1] flex-shrink-0 text-[12px] text-ink-secondary">
                    {value}
                </span>
            )}
            {tokenLabel && onToken && (
                <button
                    type="button"
                    onClick={onToken}
                    className="relative z-10 flex-shrink-0 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] text-brand transition-colors enabled:hover:bg-brand/20 enabled:active:scale-95"
                >
                    {tokenLabel}
                </button>
            )}
            <i className="pointer-events-none relative z-[1] icon-[lucide--chevron-right] size-4 flex-shrink-0 text-ink-secondary/60" />
        </div>
    );
}

/** 顶栏：与 PopupLayout 同高的居中标题，左侧圆形图标位沿用圆形返回按钮的位置与尺寸 */
function PageHeader() {
    const t = useIntl();
    return (
        <div className="relative flex h-11 flex-shrink-0 items-center justify-center px-1">
            <img
                src="/icon.png"
                alt=""
                className="absolute left-0 size-9 rounded-full shadow-[0_1px_6px_rgba(92,62,30,0.10)]"
            />
            <h1 className="text-[17px] font-semibold text-ink">
                {t("login-page-title")}
            </h1>
        </div>
    );
}

/** 概览卡：把原来居中的大品牌头压成一张一行式信息卡，PWA 提示作为卡内脚注 */
function BrandCard() {
    const t = useIntl();
    return (
        <div className="rounded-2xl bg-panel px-4 py-3 shadow-[0_1px_6px_rgba(92,62,30,0.05)]">
            <div className="flex items-center gap-3">
                <img
                    src="/icon.png"
                    alt=""
                    className="size-11 flex-shrink-0 rounded-[14px]"
                />
                <div className="min-w-0 flex-1">
                    <div className="truncate text-[16px] font-semibold text-ink">
                        {t("APP_NAME")}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-ink-secondary">
                        {t("app-introduce")}
                    </div>
                </div>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 border-t border-rule/70 pt-2.5 text-[11px] text-brand">
                <i className="icon-[lucide--info] size-3.5 flex-shrink-0" />
                <span className="min-w-0 flex-1">{t("pwa-install-tip")}</span>
            </div>
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

    if (isLogin) {
        return null;
    }

    const loginWith = async (method: LoginMethod) => {
        const StorageAPI = await loadStorageAPI();
        StorageAPI.loginWith(method);
    };
    const loginManually = async (method: "github" | "gitee") => {
        const StorageAPI = await loadStorageAPI();
        StorageAPI.loginManuallyWith(method);
    };
    const go = (fn: () => Promise<void>) => () => void fn();

    return createPortal(
        <div
            data-login-page
            className="dp-drawer-surface fixed inset-0 z-[1] overflow-y-auto overscroll-contain bg-ground text-ink"
        >
            <div className="mx-auto flex min-h-full w-full max-w-[420px] flex-col px-3 pt-[calc(var(--safe-area-inset-top)+12px)] pb-[calc(var(--safe-area-inset-bottom)+20px)]">
                <PageHeader />
                <div className="mt-2">
                    <BrandCard />
                </div>
                {loading ? (
                    <div className="mt-4 flex h-[58px] items-center justify-center gap-2 rounded-2xl bg-panel text-[14px] text-ink-secondary shadow-[0_1px_6px_rgba(92,62,30,0.05)]">
                        <i className="icon-[lucide--loader-circle] size-4 animate-spin" />
                        {t("login")}
                    </div>
                ) : (
                    <>
                        <GroupTitle first>{t("login-group-cloud")}</GroupTitle>
                        <div className={CARD}>
                            <LoginRow
                                icon={
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
                                }
                                title={t("login-to-github")}
                                hint={t("login-github-hint")}
                                onClick={go(() => loginWith("github"))}
                                tokenLabel={t("login-token")}
                                onToken={go(() => loginManually("github"))}
                            />
                            <LoginRow
                                icon={
                                    <svg
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                        role="img"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.63c0 .327.266.592.593.592h5.63c.982 0 1.778-.796 1.778-1.778v-.296a.593.593 0 0 0-.592-.593h-4.15a.592.592 0 0 1-.592-.592v-1.482a.593.593 0 0 1 .593-.592h6.815c.327 0 .593.265.593.592v3.408a4 4 0 0 1-4 4H5.926a.593.593 0 0 1-.593-.593V9.778a4.444 4.444 0 0 1 4.445-4.444h8.296z" />
                                    </svg>
                                }
                                title={t("login-to-gitee")}
                                hint={t("login-gitee-hint")}
                                onClick={go(() => loginWith("gitee"))}
                                tokenLabel={t("login-token")}
                                onToken={go(() => loginManually("gitee"))}
                            />
                        </div>

                        <GroupTitle>{t("login-group-selfhost")}</GroupTitle>
                        <div className={CARD}>
                            <LoginRow
                                icon={
                                    <i className="icon-[lucide--cloud] size-[18px]" />
                                }
                                title="Web DAV"
                                hint={t("login-webdav-hint")}
                                onClick={go(() => loginWith("webdav"))}
                            />
                            <LoginRow
                                icon={
                                    <i className="icon-[lucide--database] size-[18px]" />
                                }
                                title="S3"
                                hint={t("login-s3-hint")}
                                onClick={go(() => loginWith("s3"))}
                            />
                        </div>

                        <GroupTitle>{t("login-group-local")}</GroupTitle>
                        <div className={CARD}>
                            <LoginRow
                                icon={
                                    <i className="icon-[lucide--hard-drive] size-[18px]" />
                                }
                                title={t("offline-mode")}
                                hint={t("login-offline-hint")}
                                value={t("login-no-account")}
                                onClick={go(() => loginWith("offline"))}
                            />
                        </div>
                    </>
                )}
                <div className="flex-1" />
                <LoginFooter platforms={platforms} />
            </div>
        </div>,
        document.body,
    );
}
