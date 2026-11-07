import type { ButtonHTMLAttributes, DetailedHTMLProps, ReactNode } from "react";
import { cn } from "@/utils";

export default function Tag({
    checked,
    children,
    onCheckedChange,
    className,
    ...props
}: {
    checked?: boolean;
    children: ReactNode;
    className?: string;
    onCheckedChange?: (v: boolean) => void;
} & DetailedHTMLProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
>) {
    return (
        <button
            type="button"
            {...props}
            data-state={checked ? "checked" : "uncheck"}
            className={cn(
                `rounded-md border py-1 px-2 flex items-center justify-center whitespace-nowrap cursor-pointer transition-colors duration-[var(--dp-motion-interaction)] ease-[var(--dp-motion-easing)]`,
                "data-[state=checked]:bg-brand data-[state=checked]:text-on-brand data-[state=checked]:border-brand bg-ground-muted text-ink border-rule hover:bg-rule/60",
                className,
            )}
            onMouseDown={() => {
                onCheckedChange?.(!checked);
            }}
        >
            {children}
        </button>
    );
}
