import type { ReactNode } from "react";
import { useIntl } from "@/locale";
import { cn } from "@/utils";

export default function PopupLayout({
    title,
    children,
    onBack,
    className,
    hideBack,
    handle,
    right,
    backStyle = "text",
}: {
    title?: string | ReactNode;
    children?: ReactNode;
    onBack?: () => void;
    className?: string;
    hideBack?: boolean;
    handle?: boolean;
    right?: ReactNode;
    /** 圆形白底纯图标返回（APK 预算设置页同款），默认仍是「‹ 返回」文字按钮 */
    backStyle?: "text" | "circle";
}) {
    const t = useIntl();
    return (
        <div
            className={cn(
                "flex-1 flex flex-col overflow-hidden pb-[var(--safe-area-inset-bottom)]",
                handle ? "pt-0" : "pt-[var(--safe-area-inset-top)]",
                className,
            )}
        >
            {handle && (
                <div
                    data-sheet-drag
                    className="w-full flex flex-shrink-0 justify-center pt-2 sm:hidden"
                >
                    <div className="h-1 w-10 rounded-full bg-ink-secondary/40" />
                </div>
            )}
            <div
                data-sheet-drag={handle ? "" : undefined}
                className={cn(
                    "w-full flex justify-center items-center relative px-4 pb-2 flex-shrink-0",
                    handle ? "pt-2 sm:pt-4" : "pt-4",
                )}
            >
                {!hideBack && (
                    <button
                        type="button"
                        aria-label={
                            backStyle === "circle" ? t("back") : undefined
                        }
                        className={cn(
                            "absolute cursor-pointer",
                            backStyle === "circle"
                                ? "left-4 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-panel text-ink shadow-[0_1px_6px_rgba(92,62,30,0.10)]"
                                : "left-0 flex buttoned rounded-full py-1 pl-1 pr-3",
                        )}
                        onClick={(e) => {
                            onBack?.();
                            e.stopPropagation();
                        }}
                    >
                        <i className="icon-[lucide--chevron-left] size-5" />
                        {backStyle !== "circle" && t("back")}
                    </button>
                )}
                {right && <div className="absolute right-0 pr-1">{right}</div>}
                <div className="min-h-4 w-full flex justify-center items-center">
                    {title}
                </div>
            </div>
            {children}
        </div>
    );
}
