import type { HtmlHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils";

export function BaseButton({
    children,
    className,
    ...props
}: { children?: ReactNode } & HtmlHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            type="button"
            className={cn(
                "w-18 h-18 sm:w-14 sm:h-14 rounded-full bg-brand text-on-brand shadow-panel flex items-center justify-center m-1 cursor-pointer transform transition-transform duration-[var(--dp-motion-interaction)] ease-[var(--dp-motion-easing)] hover:scale-105 active:scale-100",
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );
}
