import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import xiaozhiPeek from "@/assets/mascots/05-inventory-xiaozhi-peek.webp";
import SmartImage from "@/components/image";
import { showInventoryItem } from "@/components/inventory";
import type { InventoryItemValue } from "@/components/inventory/item-form";
import SegmentedTabs from "@/components/segmented-tabs";
import TicketCard from "@/components/ticket-card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
} from "@/components/ui/dialog";
import { useInventory } from "@/hooks/use-inventory";
import {
    INVENTORY_CATEGORY_GROUPS,
    INVENTORY_DEFAULT_CATEGORIES,
    type InventoryItem,
} from "@/inventory/types";
import { useIntl } from "@/locale";
import { useLedgerStore } from "@/store/ledger";
import { cn } from "@/utils";

const EXPIRING_DAYS = 7;

type ExpiryState = "expired" | "soon" | undefined;

function getExpiryState(
    expiryDate: number | undefined,
    today: number,
    soonEnd: number,
): ExpiryState {
    if (!expiryDate) return undefined;
    if (expiryDate < today) return "expired";
    if (expiryDate <= soonEnd) return "soon";
    return undefined;
}

type KindFilter = "all" | "physical" | "virtual";

const KIND_TABS = [
    { value: "all", label: "inventory-kind-all" },
    { value: "physical", label: "inventory-kind-physical" },
    { value: "virtual", label: "inventory-kind-virtual" },
] as const;

export default function InventoryPage() {
    const t = useIntl();
    const { items, add, update, remove } = useInventory();
    const categorySuggestions = useLedgerStore(
        useShallow((state) => state.infos?.meta.inventoryCategories ?? []),
    );
    const [kind, setKind] = useState<KindFilter>("all");
    const [filterCategory, setFilterCategory] = useState<string>("__all");

    const today = dayjs().startOf("day").valueOf();
    const soonEnd = dayjs().add(EXPIRING_DAYS, "day").endOf("day").valueOf();

    const withMeta = useMemo(
        () =>
            items.map((item) => ({
                item,
                expiry: getExpiryState(item.expiryDate, today, soonEnd),
            })),
        [items, today, soonEnd],
    );

    // 资产总览：在用物品的购入价合计与日均持有成本
    const overview = useMemo(() => {
        const inUse = items.filter((item) => item.status === "in_use");
        const total = inUse.reduce((sum, item) => sum + (item.price ?? 0), 0);
        const earliest = inUse.reduce(
            (min, item) => Math.min(min, item.time),
            Date.now(),
        );
        const days = Math.max(1, dayjs().diff(dayjs(earliest), "day") + 1);
        return {
            total,
            daily: total / days,
            inUse: inUse.length,
            idle: items.filter((item) => item.status === "idle").length,
            disposed: items.filter((item) => item.status === "disposed").length,
        };
    }, [items]);

    // 筛选保留家小满内置分类，再补上自定义分类与物品里出现的分类
    const categories = useMemo(() => {
        const set = new Set<string>(INVENTORY_DEFAULT_CATEGORIES);
        for (const category of categorySuggestions) set.add(category);
        for (const { item } of withMeta) {
            if (item.category) set.add(item.category);
        }
        return [...set];
    }, [categorySuggestions, withMeta]);

    const visible = useMemo(() => {
        return withMeta
            .filter((v) => kind === "all" || v.item.kind === kind)
            .filter((v) => v.item.status !== "disposed")
            .filter(
                (v) =>
                    filterCategory === "__all" ||
                    v.item.category === filterCategory,
            )
            .sort((a, b) => {
                // 过期的排最前，其次按过期日升序，没填过期日的按入库时间倒序
                const rank = (v: { expiry: ExpiryState }) =>
                    v.expiry === "expired" ? 0 : v.expiry === "soon" ? 1 : 2;
                if (rank(a) !== rank(b)) return rank(a) - rank(b);
                if (a.item.expiryDate && b.item.expiryDate) {
                    return a.item.expiryDate - b.item.expiryDate;
                }
                return b.item.time - a.item.time;
            });
    }, [withMeta, kind, filterCategory]);

    const money = (value: number) =>
        new Intl.NumberFormat("zh-CN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);

    const saveCategorySuggestion = (category?: string) => {
        if (!category || categories.includes(category)) return;
        useLedgerStore.getState().updateGlobalMeta((prev) => {
            prev.inventoryCategories = [
                ...(prev.inventoryCategories ?? []),
                category,
            ];
            return prev;
        });
    };

    const toSave = async (value: InventoryItemValue, edit?: InventoryItem) => {
        saveCategorySuggestion(value.category);
        if (edit) {
            await update({ ...edit, ...value });
        } else {
            await add(value);
        }
    };

    return (
        <div className="h-full overflow-y-auto">
            <div className="mx-auto flex w-full max-w-[720px] flex-col gap-2.5 px-4 pb-32 pt-3">
                <div className="flex items-center gap-3">
                    <CategoryFilterButton
                        categories={categories}
                        value={filterCategory}
                        onChange={setFilterCategory}
                    />
                    <SegmentedTabs
                        className="flex-shrink-0"
                        size="sm"
                        items={KIND_TABS.map(({ value, label }) => ({
                            value,
                            label: t(label),
                        }))}
                        value={kind}
                        onChange={(v) => setKind(v as KindFilter)}
                    />
                </div>

                {/* 猫靠卡片右侧，需给「分段控件 → 卡顶」留出猫可见高度，
                    否则猫头会顶进上方「虚拟」胶囊（APK 实测两者垂直错开） */}
                <TicketCard
                    className="mt-9"
                    variant="inventory"
                    mascot={
                        <img
                            src={xiaozhiPeek}
                            alt=""
                            draggable={false}
                            className="pointer-events-none h-full w-auto select-none"
                        />
                    }
                    top={
                        <>
                            <h1 className="dp-text-medium font-display text-xl tracking-tight">
                                {t("inventory-overview")}
                            </h1>
                            <div className="mt-2 grid grid-cols-2">
                                <div className="pr-4">
                                    <div className="text-xs text-ink-secondary">
                                        {t("inventory-total-assets")}
                                    </div>
                                    <div className="mt-1 font-display text-2xl font-bold text-brand tabular-nums">
                                        {money(overview.total)}
                                    </div>
                                </div>
                                <div className="border-l border-dashed border-rule pl-4">
                                    <div className="text-xs text-ink-secondary">
                                        {t("inventory-daily-cost")}
                                    </div>
                                    <div className="mt-1 font-display text-2xl font-bold text-ink/80 tabular-nums">
                                        {money(overview.daily)}
                                    </div>
                                </div>
                            </div>
                        </>
                    }
                    bottom={
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <StatusStat
                                label={t("inventory-status-in-use")}
                                value={overview.inUse}
                                tone="text-semantic-expense"
                            />
                            <StatusStat
                                label={t("inventory-status-idle")}
                                value={overview.idle}
                            />
                            <StatusStat
                                label={t("inventory-status-disposed")}
                                value={overview.disposed}
                            />
                        </div>
                    }
                />

                {visible.length === 0 ? (
                    // 家小满缺省态：纯文字居中，无插画与引导按钮
                    <p className="py-12 text-center text-[13px] text-ink-secondary">
                        {items.length === 0
                            ? t("inventory-empty")
                            : t("inventory-empty-filtered")}
                    </p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {visible.map(({ item, expiry }) => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                expiry={expiry}
                                expiryDaysLeft={
                                    expiry === "soon" && item.expiryDate
                                        ? dayjs(item.expiryDate).diff(
                                              dayjs(),
                                              "day",
                                          ) + 1
                                        : undefined
                                }
                                onEdit={() =>
                                    showInventoryItem(item).then(
                                        (v) => v && toSave(v, item),
                                    )
                                }
                                onCycleStatus={() => {
                                    const next =
                                        item.status === "in_use"
                                            ? "idle"
                                            : item.status === "idle"
                                              ? "disposed"
                                              : "in_use";
                                    void update({ ...item, status: next });
                                }}
                                onDelete={() => remove(item.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function CategoryFilterButton({
    categories,
    value,
    onChange,
}: {
    categories: string[];
    value: string;
    onChange: (v: string) => void;
}) {
    const t = useIntl();
    const [open, setOpen] = useState(false);
    const active = value !== "__all";
    // 家小满知物页样式：胶囊只写「筛选」，激活的分类名以橙色文字展示在胶囊右侧
    const current = active
        ? (categories.find((c) => c === value) ?? value)
        : undefined;
    // 家小满内置分类之外的自定义分类单独成组
    const customCategories = categories.filter(
        (category) => !INVENTORY_DEFAULT_CATEGORIES.includes(category),
    );
    const renderCategory = (id: string, label?: string) => {
        const selected = value === id;
        return (
            <button
                key={id}
                type="button"
                data-no-focus-ring
                className={cn(
                    "flex h-10 w-full min-w-0 cursor-pointer items-center justify-center rounded-xl border-[1.5px] px-2.5 text-[15px] transition-colors",
                    selected
                        ? "border-brand bg-[#ffefe6] font-medium text-brand"
                        : "border-transparent bg-white text-ink",
                )}
                onClick={() => {
                    onChange(id);
                    setOpen(false);
                }}
            >
                <span className="truncate">{label ?? id}</span>
            </button>
        );
    };
    return (
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <button
                type="button"
                className={cn(
                    "flex flex-shrink-0 cursor-pointer items-center gap-1 rounded-full border border-rule bg-panel px-3 py-1.5 text-sm shadow-panel transition-colors hover:bg-ground-muted",
                    active ? "font-medium text-brand" : "text-ink",
                )}
                onClick={() => setOpen(true)}
            >
                {t("filter")}
                <i
                    className={cn(
                        "icon-[lucide--chevron-down] size-4",
                        active ? "text-brand" : "text-ink-secondary",
                    )}
                />
            </button>
            {active && current && (
                <span className="min-w-0 truncate text-sm font-medium text-brand">
                    {current}
                </span>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogPortal>
                    <DialogOverlay className="fixed inset-0 z-40 bg-black/50" />
                    <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center">
                        <DialogContent
                            from="bottom"
                            className="pointer-events-auto flex max-h-[80dvh] w-full flex-col rounded-t-[28px] border-0 bg-[#f4f4f4] sm:w-[90vw] sm:max-w-[500px] sm:rounded-[28px]"
                        >
                            <div
                                data-sheet-drag
                                className="flex flex-shrink-0 flex-col items-center pt-3"
                            >
                                <div className="h-1 w-8 rounded-full bg-[#bdbbb7]" />
                                <DialogTitle className="mt-3.5 text-[17px] font-bold text-ink">
                                    {t("filter")}
                                </DialogTitle>
                                <DialogDescription className="sr-only">
                                    {t("filter")}
                                </DialogDescription>
                            </div>
                            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-[max(20px,var(--safe-area-inset-bottom))] pt-5">
                                <div className="grid flex-shrink-0 grid-cols-3 gap-2.5">
                                    {renderCategory(
                                        "__all",
                                        t("inventory-all"),
                                    )}
                                </div>
                                {INVENTORY_CATEGORY_GROUPS.map((group) => (
                                    <section key={group.key}>
                                        <div className="px-1 text-[13px] text-ink-secondary">
                                            {group.key === "physical"
                                                ? t("inventory-kind-physical")
                                                : t("inventory-kind-virtual")}
                                        </div>
                                        <div className="mt-2 grid grid-cols-3 gap-2.5">
                                            {group.categories.map((id) =>
                                                renderCategory(id),
                                            )}
                                        </div>
                                    </section>
                                ))}
                                {customCategories.length > 0 && (
                                    <section>
                                        <div className="px-1 text-[13px] text-ink-secondary">
                                            {t("inventory-custom-categories")}
                                        </div>
                                        <div className="mt-2 grid grid-cols-3 gap-2.5">
                                            {customCategories.map((id) =>
                                                renderCategory(id),
                                            )}
                                        </div>
                                    </section>
                                )}
                            </div>
                        </DialogContent>
                    </div>
                </DialogPortal>
            </Dialog>
        </div>
    );
}

function StatusStat({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone?: string;
}) {
    return (
        <div>
            <div className="text-xs text-ink-secondary">{label}</div>
            <div
                className={cn(
                    "mt-0.5 font-display text-lg font-bold tabular-nums",
                    tone ?? "text-ink",
                )}
            >
                {value}
            </div>
        </div>
    );
}

function ExpiryBadge({
    expiry,
    daysLeft,
}: {
    expiry: ExpiryState;
    daysLeft?: number;
}) {
    const t = useIntl();
    if (!expiry) return null;
    return (
        <span
            className={cn(
                "rounded-full px-2 py-0.5 text-[11px]",
                expiry === "expired"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-brand/10 text-brand",
            )}
        >
            {expiry === "expired"
                ? t("inventory-expired")
                : t("inventory-expiring-in", { n: daysLeft ?? 1 })}
        </span>
    );
}

const STATUS_LABEL_KEY: Record<InventoryItem["status"], string> = {
    in_use: "inventory-status-in-use",
    idle: "inventory-status-idle",
    disposed: "inventory-status-disposed",
};

function ItemCard({
    item,
    expiry,
    expiryDaysLeft,
    onEdit,
    onCycleStatus,
    onDelete,
}: {
    item: InventoryItem;
    expiry: ExpiryState;
    expiryDaysLeft?: number;
    onEdit: () => void;
    onCycleStatus: () => void;
    onDelete: () => void;
}) {
    const t = useIntl();
    return (
        <div
            className={cn(
                "flex gap-3 rounded-card border border-rule bg-panel p-3 shadow-panel",
                item.status !== "in_use" && "opacity-60",
            )}
        >
            <button
                type="button"
                className="flex min-w-0 flex-1 cursor-pointer gap-3 text-left"
                onClick={onEdit}
            >
                <div className="flex size-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-ground-muted">
                    {item.images?.[0] ? (
                        <SmartImage
                            source={item.images[0]}
                            className="size-full object-cover"
                        />
                    ) : (
                        <i className="icon-[lucide--package] size-6 text-ink-secondary" />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                            {item.name}
                        </span>
                        <span className="flex-shrink-0 text-xs tabular-nums text-ink-secondary">
                            ×{item.quantity}
                            {item.unit ?? ""}
                        </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {item.category && (
                            <span className="rounded-full bg-ground-muted px-2 py-0.5 text-[11px] text-ink-secondary">
                                {item.category}
                            </span>
                        )}
                        <ExpiryBadge
                            expiry={expiry}
                            daysLeft={expiryDaysLeft}
                        />
                        {item.status !== "in_use" && (
                            <span className="rounded-full bg-ground-muted px-2 py-0.5 text-[11px] text-ink-secondary">
                                {t(STATUS_LABEL_KEY[item.status])}
                            </span>
                        )}
                    </div>
                    {item.remark && (
                        <p className="mt-1 line-clamp-1 text-xs text-ink-secondary/70">
                            {item.remark}
                        </p>
                    )}
                </div>
            </button>
            <div className="flex flex-shrink-0 flex-col justify-center gap-1">
                <button
                    type="button"
                    aria-label={t("inventory-cycle-status")}
                    className="flex size-8 cursor-pointer items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-ground-muted"
                    onClick={onCycleStatus}
                >
                    <i className="icon-[lucide--bike] size-4" />
                </button>
                <button
                    type="button"
                    aria-label={t("delete")}
                    className="flex size-8 cursor-pointer items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-ground-muted"
                    onClick={onDelete}
                >
                    <i className="icon-[apk--trash] size-4" />
                </button>
            </div>
        </div>
    );
}
