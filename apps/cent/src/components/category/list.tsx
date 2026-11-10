import { useState } from "react";
import { StorageDeferredAPI } from "@/api/storage";
import useCategory from "@/hooks/use-category";
import PopupLayout from "@/layouts/popup-layout";
import type { BillCategory, BillType } from "@/ledger/type";
import { treeCategories } from "@/ledger/utils";
import { useIntl } from "@/locale";
import { useBookStore } from "@/store/book";
import modal from "../modal";
import { showSortableList } from "../sortable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { CategoryEditFormProvider, showCategoryEdit } from "./edit";
import { CategoryGroupHeader, CategoryRow } from "./item";

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

    const sort = async (value: BillCategory[]) => {
        const ordered = await showSortableList(value);
        reorder(ordered);
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
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            className="flex items-center gap-1 text-[13px] text-ink-secondary"
                            onClick={() =>
                                openForm({
                                    id: undefined,
                                    type: tab as BillType,
                                })
                            }
                        >
                            <i className="icon-[lucide--plus] size-4" />
                            {t("add")}
                        </button>
                        <button
                            type="button"
                            aria-label="sort"
                            className="text-ink-secondary"
                            onClick={() => {
                                const current = tabs.find(
                                    (v) => v.label === tab,
                                );
                                if (current) {
                                    void sort(current.value);
                                }
                            }}
                        >
                            <i className="icon-[lucide--menu] size-4" />
                        </button>
                    </div>
                </div>
                {tabs.map((item) => (
                    <TabsContent
                        key={item.label}
                        value={item.label}
                        className="mt-0 min-h-0 flex-1 overflow-y-auto scrollbar-hidden"
                    >
                        <div className="rounded-[18px] bg-panel px-1 py-1">
                            {item.value.map((group) => (
                                <div key={group.id}>
                                    <CategoryGroupHeader
                                        name={group.name}
                                        onAdd={() =>
                                            openForm({
                                                id: undefined,
                                                parent: group.id,
                                                type: item.label,
                                            })
                                        }
                                        onEdit={() => openForm(group)}
                                        onSort={() => void sort(group.children)}
                                    />
                                    <div className="border-t border-rule">
                                        {group.children.length === 0 ? (
                                            <div className="py-3 text-center text-xs text-ink-secondary">
                                                {t("inventory-empty")}
                                            </div>
                                        ) : (
                                            group.children.map((child) => (
                                                <CategoryRow
                                                    key={child.id}
                                                    category={child}
                                                    onDelete={() =>
                                                        void remove(child)
                                                    }
                                                    onEdit={() =>
                                                        openForm(child)
                                                    }
                                                    onSort={() =>
                                                        void sort(
                                                            group.children,
                                                        )
                                                    }
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
            <CategoryEditFormProvider />
        </PopupLayout>
    );
}
