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
}: {
    title?: string | ReactNode;
    children?: ReactNode;
    onBack?: () => void;
    className?: string;
    hideBack?: boolean;
    handle?: boolean;
    right?: ReactNode;
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
                        className="absolute left-0 flex buttoned rounded-full py-1 pl-1 pr-3 cursor-pointer"
                        onClick={(e) => {
                            onBack?.();
                            e.stopPropagation();
                        }}
                    >
                        <div className="flex items-center justify-center">
                            <i className="icon-[lucide--chevron-left] size-5"></i>
                        </div>
                        {t("back")}
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
