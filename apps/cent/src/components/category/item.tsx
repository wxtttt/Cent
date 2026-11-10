import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BillCategory } from "@/ledger/type";
import CategoryIcon from "./icon";

export type CategorySortData = {
    kind: "group" | "child";
    parentId?: string;
};

const iconButton =
    "flex size-7 shrink-0 items-center justify-center rounded-full text-[#71717a] transition-colors hover:bg-black/5 hover:text-ink dark:text-ink-secondary dark:hover:bg-white/10";

const dragHandle =
    "flex size-7 shrink-0 touch-none cursor-grab items-center justify-center rounded-full text-[#71717a] transition-colors hover:bg-black/5 hover:text-ink active:cursor-grabbing dark:text-ink-secondary dark:hover:bg-white/10";

function useRowSortable(id: string, data: CategorySortData) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, data });
    return {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        isDragging,
        style: {
            transform: CSS.Transform.toString(transform),
            transition,
            position: "relative" as const,
            zIndex: isDragging ? 20 : undefined,
        },
    };
}

type SortableHandleProps = Pick<
    ReturnType<typeof useSortable>,
    "attributes" | "listeners" | "setActivatorNodeRef"
>;

function DragHandle({
    attributes,
    listeners,
    setActivatorNodeRef,
}: SortableHandleProps) {
    return (
        <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label="drag"
            className={dragHandle}
            {...attributes}
            {...listeners}
        >
            <i className="icon-[lucide--menu] size-4" />
        </button>
    );
}

export function CategoryGroupHeader({
    id,
    name,
    onEdit,
    onAdd,
}: {
    id: string;
    name: string;
    onEdit?: () => void;
    onAdd?: () => void;
}) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, style } =
        useRowSortable(id, { kind: "group" });
    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex h-9 items-center gap-1 rounded-lg bg-ground-muted px-3"
        >
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
            <DragHandle
                attributes={attributes}
                listeners={listeners}
                setActivatorNodeRef={setActivatorNodeRef}
            />
        </div>
    );
}

export function CategoryRow({
    category,
    onDelete,
    onEdit,
}: {
    category: BillCategory;
    onDelete?: () => void;
    onEdit?: () => void;
}) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, style } =
        useRowSortable(category.id, {
            kind: "child",
            parentId: category.parent,
        });
    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex h-[54px] items-center gap-3 border-b border-rule bg-panel px-3 last:border-b-0"
        >
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
            <DragHandle
                attributes={attributes}
                listeners={listeners}
                setActivatorNodeRef={setActivatorNodeRef}
            />
        </div>
    );
}
