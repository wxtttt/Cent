import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import { StorageDeferredAPI } from "@/api/storage";
import useCategory from "@/hooks/use-category";
import PopupLayout from "@/layouts/popup-layout";
import type { BillCategory, BillType } from "@/ledger/type";
import { treeCategories } from "@/ledger/utils";
import { useIntl } from "@/locale";
import { useBookStore } from "@/store/book";
import modal from "../modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { CategoryEditFormProvider, showCategoryEdit } from "./edit";
import {
    CategoryGroupHeader,
    CategoryRow,
    type CategorySortData,
} from "./item";

type Group = ReturnType<typeof treeCategories>[number];

export default function CategoryList({
    edit,
    onCancel,
}: {
    edit?: BillType;
    onCancel?: () => void;
    onConfirm?: (v: any) => void;
}) {
    const t = useIntl();
    const { categories, reorder, update } = useCategory();
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: { distance: 6 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 160, tolerance: 6 },
        }),
    );

    const expenses = treeCategories(
        categories.filter((v) => v.type === "expense"),
    );
    const incomes = treeCategories(
        categories.filter((v) => v.type === "income"),
    );
    const tabs: { label: BillType; value: Group[] }[] = [
        { label: "expense", value: expenses },
        { label: "income", value: incomes },
    ];
    const [tab, setTab] = useState<string>(edit ?? "expense");

    const openForm = (
        value:
            | BillCategory
            | { id: undefined; parent?: string; type: BillType },
    ) => {
        void showCategoryEdit(value);
    };

    const remove = async (cate: BillCategory) => {
        const book = useBookStore.getState().currentBookId;
        if (!book) {
            return;
        }
        const ids = categories
            .filter((c) => c.id === cate.id || c.parent === cate.id)
            .map((c) => c.id);
        const exist = await StorageDeferredAPI.filter(book, {
            categories: ids,
        });
        if (exist.length > 0) {
            modal.prompt({
                title: t("category-delete-alert", { n: exist.length }),
                cancellable: false,
            });
            return;
        }
        await update(cate.id, undefined);
    };

    const handleDragEnd = (event: DragEndEvent, groups: Group[]) => {
        const { active, over } = event;
        if (!over || active.id === over.id) {
            return;
        }
        const from = active.data.current as CategorySortData | undefined;
        const to = over.data.current as CategorySortData | undefined;
        if (!from || !to) {
            return;
        }
        if (from.kind === "group") {
            // 落点是子项时折算到它所属的分组，避免拖到标题之间的空白区无响应
            const targetId =
                to.kind === "group" ? String(over.id) : to.parentId;
            const ids = groups.map((g) => g.id);
            const oldIndex = ids.indexOf(String(active.id));
            const newIndex = targetId ? ids.indexOf(targetId) : -1;
            if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
                return;
            }
            void reorder(arrayMove(groups, oldIndex, newIndex));
            return;
        }
        const group = groups.find((g) => g.id === from.parentId);
        if (!group) {
            return;
        }
        // 子项只允许在同一分组内换序，拖到本组标题上视为移到首位
        let newIndex = -1;
        if (to.kind === "group") {
            if (String(over.id) === from.parentId) {
                newIndex = 0;
            }
        } else if (from.parentId === to.parentId) {
            newIndex = group.children.findIndex((c) => c.id === over.id);
        }
        const oldIndex = group.children.findIndex((c) => c.id === active.id);
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
            return;
        }
        void reorder(arrayMove(group.children, oldIndex, newIndex));
    };

    return (
        <PopupLayout
            className="h-full overflow-hidden bg-ground"
            onBack={onCancel}
            title={
                <span className="text-[18px] font-semibold text-ink">
                    {t("category-management")}
                </span>
            }
        >
            <Tabs
                value={tab}
                onValueChange={setTab}
                className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 pb-4"
            >
                <div className="flex justify-center">
                    <TabsList className="h-10 rounded-full bg-panel p-1 shadow-sm">
                        {tabs.map((item) => (
                            <TabsTrigger
                                key={item.label}
                                value={item.label}
                                className="h-8 rounded-full px-8 text-[14px] data-[state=active]:bg-ground-muted data-[state=active]:font-semibold data-[state=active]:text-ink"
                            >
                                {t(item.label)}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
                <div className="flex items-center justify-between px-1">
                    <span className="text-[16px] font-semibold text-ink">
                        {t("category-labels")}
                    </span>
                    <button
                        type="button"
                        className="flex items-center gap-1 text-[13px] text-ink-secondary"
                        onClick={() =>
                            openForm({
                                id: undefined,
                                parent: tabs.find((v) => v.label === tab)
                                    ?.value[0]?.id,
                                type: tab as BillType,
                            })
                        }
                    >
                        <i className="icon-[lucide--circle-plus] size-4" />
                        {t("add-label")}
                    </button>
                </div>
                {tabs.map((item) => {
                    const sortableIds = item.value.flatMap((group) => [
                        group.id,
                        ...group.children.map((child) => child.id),
                    ]);
                    return (
                        <TabsContent
                            key={item.label}
                            value={item.label}
                            className="mt-0 min-h-0 flex-1 overflow-y-auto scrollbar-hidden"
                        >
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={(event) =>
                                    handleDragEnd(event, item.value)
                                }
                                modifiers={[restrictToVerticalAxis]}
                            >
                                <SortableContext
                                    items={sortableIds}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="rounded-[18px] bg-panel px-1 py-1">
                                        {item.value.map((group) => (
                                            <div key={group.id}>
                                                <CategoryGroupHeader
                                                    id={group.id}
                                                    name={group.name}
                                                    onAdd={() =>
                                                        openForm({
                                                            id: undefined,
                                                            parent: group.id,
                                                            type: item.label,
                                                        })
                                                    }
                                                    onEdit={() =>
                                                        openForm(group)
                                                    }
                                                />
                                                <div className="border-t border-rule">
                                                    {group.children.length ===
                                                    0 ? (
                                                        <div className="py-3 text-center text-xs text-ink-secondary">
                                                            {t(
                                                                "inventory-empty",
                                                            )}
                                                        </div>
                                                    ) : (
                                                        group.children.map(
                                                            (child) => (
                                                                <CategoryRow
                                                                    key={
                                                                        child.id
                                                                    }
                                                                    category={
                                                                        child
                                                                    }
                                                                    onDelete={() =>
                                                                        void remove(
                                                                            child,
                                                                        )
                                                                    }
                                                                    onEdit={() =>
                                                                        openForm(
                                                                            child,
                                                                        )
                                                                    }
                                                                />
                                                            ),
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </TabsContent>
                    );
                })}
            </Tabs>
            <CategoryEditFormProvider />
        </PopupLayout>
    );
}
