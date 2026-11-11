import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BillCategory } from "@/ledger/type";
import CategoryIcon from "./icon";

export type CategorySortData = {
    kind: "group" | "child";
    parentId?: string;
};

type Group = BillCategory & { children: BillCategory[] };

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
        style: {
            // 分组整块高度不同，不能用默认变换里的 scaleY，否则拖动时整块会被压扁
            transform: CSS.Translate.toString(transform),
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

/**
 * 一级分组与其二级分类是同一个可排序节点，拖动分组时整块一起移动。
 * 组内子项通过嵌套 SortableContext 保持可单独排序。
 */
export function CategoryGroupBlock({
    group,
    emptyText,
    onDelete,
    onEdit,
}: {
    group: Group;
    emptyText?: string;
    onDelete?: (category: BillCategory) => void;
    onEdit?: (category: BillCategory) => void;
}) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, style } =
        useRowSortable(group.id, { kind: "group" });
    return (
        <div
            ref={setNodeRef}
            style={style}
            className="overflow-hidden rounded-[18px] bg-panel"
        >
            <div className="flex h-8 items-center gap-1 border-b border-rule bg-[#ececee] px-3 dark:bg-ground-muted">
                <span className="mr-auto text-[12px] font-semibold tracking-wide text-ink-secondary">
                    {group.name}
                </span>
                <DragHandle
                    attributes={attributes}
                    listeners={listeners}
                    setActivatorNodeRef={setActivatorNodeRef}
                />
            </div>
            <div>
                <SortableContext
                    items={group.children.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {group.children.length === 0 ? (
                        <div className="py-3 text-center text-xs text-ink-secondary">
                            {emptyText}
                        </div>
                    ) : (
                        group.children.map((child) => (
                            <CategoryRow
                                key={child.id}
                                category={child}
                                onDelete={() => onDelete?.(child)}
                                onEdit={() => onEdit?.(child)}
                            />
                        ))
                    )}
                </SortableContext>
            </div>
        </div>
    );
}

function CategoryRow({
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
                <i className="icon-[lucide--square-pen] size-4" />
            </button>
            <DragHandle
                attributes={attributes}
                listeners={listeners}
                setActivatorNodeRef={setActivatorNodeRef}
            />
        </div>
    );
}
