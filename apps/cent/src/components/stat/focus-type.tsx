import { useIntl } from "@/locale";
import { cn } from "@/utils";

export const FocusTypes = ["income", "expense", "balance"] as const;
export type FocusType = (typeof FocusTypes)[number];

const Labels: Record<FocusType, string> = {
    income: "income",
    expense: "expense",
    balance: "balance",
};

// 展示顺序与参考稿一致：支出在前，逻辑用的 FocusTypes 顺序保持不变
const DisplayTypes: FocusType[] = ["expense", "income", "balance"];

export function FocusTypeSelector({
    value,
    onValueChange,
}: {
    value: FocusType;
    onValueChange: (v: FocusType) => void;
}) {
    const t = useIntl();
    return (
        <div className="flex w-full items-center gap-1 rounded-full bg-ground-muted p-1">
            {DisplayTypes.map((type) => (
                <button
                    key={type}
                    type="button"
                    className={cn(
                        "flex-1 cursor-pointer rounded-full py-2 text-sm transition-colors duration-150",
                        value === type
                            ? "bg-panel font-semibold text-ink shadow-panel"
                            : "text-ink-secondary hover:text-ink",
                    )}
                    onClick={() => {
                        onValueChange(type);
                    }}
                >
                    {t(Labels[type])}
                </button>
            ))}
        </div>
    );
}
