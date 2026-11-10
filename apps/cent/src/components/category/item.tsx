import type { BillCategory } from "@/ledger/type";
import CategoryIcon from "./icon";

const iconButton =
    "flex size-7 shrink-0 items-center justify-center rounded-full text-[#71717a] transition-colors hover:bg-black/5 hover:text-ink dark:text-ink-secondary dark:hover:bg-white/10";

export function CategoryGroupHeader({
    name,
    onEdit,
    onAdd,
    onSort,
}: {
    name: string;
    onEdit?: () => void;
    onAdd?: () => void;
    onSort?: () => void;
}) {
    return (
        <div className="flex h-9 items-center gap-1 rounded-lg bg-ground-muted px-3">
            <span className="mr-auto text-[13px] font-semibold text-ink">
                {name}
            </span>
            <button
                type="button"
                aria-label="add"
                className={iconButton}
                onClick={onAdd}
            >
                <i className="icon-[lucide--plus] size-4" />
            </button>
            <button
                type="button"
                aria-label="edit"
                className={iconButton}
                onClick={onEdit}
            >
                <i className="icon-[lucide--pencil] size-4" />
            </button>
            <button
                type="button"
                aria-label="sort"
                className={iconButton}
                onClick={onSort}
            >
                <i className="icon-[lucide--menu] size-4" />
            </button>
        </div>
    );
}

export function CategoryRow({
    category,
    onDelete,
    onEdit,
    onSort,
}: {
    category: BillCategory;
    onDelete?: () => void;
    onEdit?: () => void;
    onSort?: () => void;
}) {
    return (
        <div className="flex h-[54px] items-center gap-3 border-b border-rule px-3 last:border-b-0">
            <button
                type="button"
                aria-label="delete"
                onClick={onDelete}
                className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[#ef4444] text-white"
            >
                <i className="icon-[lucide--minus] size-3" />
            </button>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ground-muted">
                <CategoryIcon icon={category.icon} className="size-7" />
            </span>
            <button
                type="button"
                onClick={onEdit}
                className="min-w-0 flex-1 truncate text-left text-[15px] text-ink"
            >
                {category.name}
            </button>
            <button
                type="button"
                aria-label="edit"
                className={iconButton}
                onClick={onEdit}
            >
                <i className="icon-[lucide--pencil] size-4" />
            </button>
            <button
                type="button"
                aria-label="sort"
                className={iconButton}
                onClick={onSort}
            >
                <i className="icon-[lucide--menu] size-4" />
            </button>
        </div>
    );
}
