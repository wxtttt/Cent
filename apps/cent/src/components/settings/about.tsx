import { useState } from "react";
import { toast } from "sonner";
import { AppDownloadIcons } from "@/components/app-download";
import PopupLayout from "@/layouts/popup-layout";
import { useIntl } from "@/locale";
import { isMeasurementEnabled } from "@/measurement";
import { checkForUpdate } from "@/utils/pwa";

import createConfirmProvider from "../confirm";
import Version from "./version";

function Form({ onCancel }: { onCancel?: () => void }) {
    const t = useIntl();
    const [checkingUpdate, setCheckingUpdate] = useState(false);

    const handleCheckUpdate = async () => {
        if (checkingUpdate) {
            return;
        }
        setCheckingUpdate(true);
        try {
            const result = await checkForUpdate();
            if (result === "latest") {
                toast.success(t("update-latest"));
            } else if (result === "unsupported") {
                toast.warning(t("update-unsupported"));
            } else {
                toast.info(t("update-found"));
            }
        } catch {
            toast.error(t("update-failed"));
        } finally {
            setCheckingUpdate(false);
        }
    };

    return (
        <PopupLayout
            title={t("about-cent")}
            onBack={onCancel}
            className="h-full overflow-hidden"
        >
            <div className="divide-y divide-solid flex flex-col overflow-y-auto py-4 gap-2">
                <div className="w-full flex flex-col justify-between items-center px-4 gap-2 pb-4">
                    <img
                        src="/icon.png"
                        alt=""
                        width={80}
                        height={80}
                        className="rounded-lg shadow-md aspect-square"
                    />
                    <Version />
                </div>
                <button
                    type="button"
                    className="w-full min-h-10 pb-2 flex justify-between items-center px-4 text-left disabled:opacity-60"
                    disabled={checkingUpdate}
                    onClick={handleCheckUpdate}
                >
                    <div className="flex items-center gap-2">
                        <i className="icon-[mdi--update] size-5"></i>
                        <div className="text-sm">
                            {checkingUpdate
                                ? t("update-checking")
                                : t("check-update")}
                        </div>
                    </div>
                    {checkingUpdate ? (
                        <i className="icon-[mdi--loading] size-5 animate-spin"></i>
                    ) : (
                        <i className="icon-[mdi--chevron-right] size-5"></i>
                    )}
                </button>
                <a
                    className="w-full min-h-10 pb-2 flex justify-between items-center px-4"
                    target="_blank"
                    href="https://github.com/glink25/Cent/issues/new"
                    rel="noopener"
                >
                    <div className="flex items-center gap-2">
                        <i className="icon-[mdi--alternate-email] size-5"></i>
                        <div className="text-sm">{t("feedback")}</div>
                    </div>
                    <i className="icon-[mdi--arrow-top-right]"></i>
                </a>
                <a
                    className="w-full min-h-10 pb-2 flex justify-between items-center px-4"
                    target="_blank"
                    href="https://glink25.github.io/tag/Cent/"
                    rel="noopener"
                >
                    <div className="flex items-center gap-2">
                        <i className="icon-[mdi--rss-box] size-5"></i>
                        <div className="text-sm">{t("blog")}</div>
                    </div>
                    <i className="icon-[mdi--arrow-top-right]"></i>
                </a>
                <a
                    className="w-full min-h-10 pb-2 flex justify-between items-center px-4"
                    target="_blank"
                    href="https://github.com/glink25/Cent"
                    rel="noopener"
                >
                    <div className="flex items-center gap-2">
                        <i className="icon-[mdi--github] size-5"></i>
                        <div className="text-sm">Github</div>
                    </div>
                    <i className="icon-[mdi--arrow-top-right]"></i>
                </a>
                <div className="w-full flex flex-col items-center gap-3 px-4 pb-4">
                    <div className="text-sm text-foreground/80">
                        {t("download-app")}
                    </div>
                    <AppDownloadIcons variant="about" iconClassName="size-5" />
                </div>
                {isMeasurementEnabled() && (
                    <div className="flex items-center justify-center gap-3 px-4 pt-2 text-xs text-foreground/50">
                        <a
                            className="underline hover:text-foreground/80"
                            href="https://linkai.work/cent/terms"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {t("terms-of-use")}
                        </a>
                        <span aria-hidden="true">·</span>
                        <a
                            className="underline hover:text-foreground/80"
                            href="https://linkai.work/cent/privacy"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {t("privacy-policy")}
                        </a>
                    </div>
                )}
                {/* <div className="w-full min-h-10 pb-2 flex justify-between items-center px-4 opacity-60">
                    <div className="flex items-center gap-2">
                        <i className="icon-[mdi--github] size-5"></i>
                        <div className="text-sm">Github</div>
                    </div>
                    <div className="text-xs">{t("preparing")}</div>
                </div> */}
            </div>
        </PopupLayout>
    );
}

const [AboutSettingsProvider, showAboutSettings] = createConfirmProvider(Form, {
    dialogTitle: "experimental-functions",
    dialogModalClose: true,
    contentClassName:
        "h-full w-full max-h-full max-w-full rounded-none sm:rounded-md sm:max-h-[min(520px,calc(100vh-32px))] sm:w-[90vw] sm:max-w-[500px]",
});

export { AboutSettingsProvider, showAboutSettings };
