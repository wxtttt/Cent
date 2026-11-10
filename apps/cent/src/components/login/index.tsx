/** biome-ignore-all lint/a11y/noSvgWithoutTitle: <explanation> */
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/shallow";
import {
    AppDownloadIcons,
    useLoginAppDownloadPlatforms,
} from "@/components/app-download";
import { Button } from "@/components/ui/button";
import { useIntl } from "@/locale";
import { isMeasurementEnabled, measure } from "@/measurement";
import { useIsLogin, useUserStore } from "@/store/user";

const loaded = import("@/api/storage");

const loadStorageAPI = async () => {
    const lib = await loaded;
    return lib.StorageAPI;
};

const betaClassName = `relative after:content-['beta'] after:rounded-full after:border after:border-rule after:bg-ground-muted after:text-ink-secondary after:px-1 after:text-[10px] after:leading-4 after:block after:absolute after:-top-1 after:right-0 after:translate-x-[35%]`;

const LOGIN_METHODS = ["github", "gitee", "webdav", "s3", "offline"] as const;
type LoginMethod = (typeof LOGIN_METHODS)[number];
let loginMethodMeasured = false;

function isLoginMethod(value: string): value is LoginMethod {
    return (LOGIN_METHODS as readonly string[]).includes(value);
}

export default function Login() {
    const t = useIntl();
    const isLogin = useIsLogin();
    const [loading] = useUserStore(
        useShallow((state) => {
            return [state.loading];
        }),
    );
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
    return createPortal(
        <div className="fixed z-[1] top-0 right-0 w-screen h-screen overflow-hidden">
            <div className="absolute w-full h-full bg-[rgba(0,0,0,0.5)] z-[-1]"></div>
            <div className="w-full h-full flex justify-center items-center">
                <div className="bg-panel text-ink w-[350px] h-[560px] max-h-[calc(100%-40px)] flex flex-col gap-4 justify-center items-center rounded-panel border border-rule shadow-panel overflow-y-auto">
                    <Guide />
                    <div className="min-h-20 h-fit w-full flex flex-col gap-4 px-6">
                        {loading ? (
                            <div className="text-center">
                                <i className="icon-[lucide--loader-circle] animate-spin"></i>
                                {t("login")}
                            </div>
                        ) : (
                            <>
                                {/* Github */}
                                <div className="flex flex-col gap-1">
                                    <Button
                                        type="button"
                                        className="w-full"
                                        onClick={async () => {
                                            const StorageAPI =
                                                await loadStorageAPI();
                                            StorageAPI.loginWith("github");
                                        }}
                                    >
                                        <i className="icon-[lucide--github]"></i>
                                        <div className="flex-1">
                                            {t("login-to-github")}
                                        </div>
                                    </Button>
                                    <button
                                        type="button"
                                        className="underline text-xs cursor-pointer hover:text-ink-secondary"
                                        onClick={async () => {
                                            const StorageAPI =
                                                await loadStorageAPI();
                                            StorageAPI.loginManuallyWith(
                                                "github",
                                            );
                                        }}
                                    >
                                        {t("or-use-an-exist-token")}
                                    </button>
                                </div>
                                {/* Gitee */}
                                <div className="flex flex-col gap-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={async () => {
                                            const StorageAPI =
                                                await loadStorageAPI();
                                            StorageAPI.loginWith("gitee");
                                        }}
                                    >
                                        <svg
                                            fill="currentColor"
                                            width="32"
                                            height="32"
                                            viewBox="0 0 24 24"
                                            role="img"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.63c0 .327.266.592.593.592h5.63c.982 0 1.778-.796 1.778-1.778v-.296a.593.593 0 0 0-.592-.593h-4.15a.592.592 0 0 1-.592-.592v-1.482a.593.593 0 0 1 .593-.592h6.815c.327 0 .593.265.593.592v3.408a4 4 0 0 1-4 4H5.926a.593.593 0 0 1-.593-.593V9.778a4.444 4.444 0 0 1 4.445-4.444h8.296z" />
                                        </svg>
                                        <div className="flex-1">
                                            {t("login-to-gitee")}
                                        </div>
                                    </Button>
                                    <button
                                        type="button"
                                        className="underline text-xs cursor-pointer"
                                        onClick={async () => {
                                            const StorageAPI =
                                                await loadStorageAPI();
                                            StorageAPI.loginManuallyWith(
                                                "gitee",
                                            );
                                        }}
                                    >
                                        {t("or-use-an-exist-token")}
                                    </button>
                                </div>
                                {/* Web DAV */}
                                <div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className={`w-full ${betaClassName}`}
                                        onClick={async () => {
                                            const StorageAPI =
                                                await loadStorageAPI();
                                            StorageAPI.loginWith("webdav");
                                        }}
                                    >
                                        <i className="icon-[lucide--save]"></i>
                                        <div className="flex-1">Web DAV</div>
                                    </Button>
                                </div>
                                {/* S3 */}
                                <div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className={`w-full ${betaClassName}`}
                                        onClick={async () => {
                                            const StorageAPI =
                                                await loadStorageAPI();
                                            StorageAPI.loginWith("s3");
                                        }}
                                    >
                                        <i className="icon-[lucide--database]"></i>
                                        <div className="flex-1">S3</div>
                                    </Button>
                                </div>
                                {/* Offline */}
                                <div className="pb-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={async () => {
                                            const StorageAPI =
                                                await loadStorageAPI();
                                            StorageAPI.loginWith("offline");
                                        }}
                                    >
                                        <i className="icon-[lucide--map-pin]"></i>
                                        <div className="flex-1">
                                            {t("offline-mode")}
                                        </div>
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                    {isMeasurementEnabled() && (
                        <p className="px-6 pb-4 text-center text-[10px] leading-relaxed text-ink-secondary">
                            {t("login-agreement-prefix")}{" "}
                            <a
                                className="underline hover:text-ink"
                                href="https://linkai.work/cent/terms"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {t("terms-of-use")}
                            </a>{" "}
                            {t("login-agreement-conjunction")}{" "}
                            <a
                                className="underline hover:text-ink"
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
            </div>
        </div>,
        document.body,
    );
}

function Guide({ className }: { className?: string }) {
    const t = useIntl();
    const platforms = useLoginAppDownloadPlatforms();

    return (
        <div
            className={
                "w-full p-4 flex-1 border-b border-rule bg-field text-on-field flex flex-col items-center justify-center gap-3 relative"
            }
        >
            <h1 className="font-display text-3xl font-bold tracking-tight">
                {t("APP_NAME")}
            </h1>
            <p className="text-sm text-center text-on-field-secondary">
                {t("app-introduce")}
            </p>
            <div className="text-xs text-on-field-secondary">
                {t("pwa-install-tip")}
            </div>
            <div className="absolute bottom-4 left-4 flex justify-center">
                <AppDownloadIcons variant="login" platforms={platforms} />
            </div>
            <a
                className="absolute bottom-4 right-4 text-xs text-on-field-secondary underline hover:text-on-field"
                target="_blank"
                href="https://glink25.github.io/post/Cent---%E4%BD%A0%E5%8F%AF%E8%83%BD%E5%8F%AA%E9%9C%80%E8%A6%81%E4%B8%80%E4%B8%AA%E8%AE%B0%E8%B4%A6%E8%BD%AF%E4%BB%B6/"
                rel="noopener"
            >
                {t("see-introduce")}
            </a>
        </div>
    );
}
