import { cn } from "@/utils";

/**
 * 家小满式页面分段控件：浅色胶囊容器 + 激活项白色凸起胶囊。
 */
export default function SegmentedTabs({
    items,
    value,
    onChange,
    className,
}: {
    items: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "inline-flex items-center gap-1 rounded-full bg-ground-muted/70 p-1",
                className,
            )}
        >
            {items.map((item) => {
                const active = item.value === value;
                return (
                    <button
                        key={item.value}
                        type="button"
                        onClick={() => onChange(item.value)}
                        className={cn(
                            "cursor-pointer rounded-full px-5 py-2 text-sm transition-all duration-[var(--dp-motion-interaction)]",
                            active
                                ? "bg-panel font-semibold text-ink shadow-panel"
                                : "text-ink-secondary hover:text-ink",
                        )}
                    >
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
}
