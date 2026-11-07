import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import xiaozhiPeek from "@/assets/mascots/05-inventory-xiaozhi-peek.webp";
import SmartImage from "@/components/image";
import { showInventoryItem } from "@/components/inventory";
import type { InventoryItemValue } from "@/components/inventory/item-form";
import SegmentedTabs from "@/components/segmented-tabs";
import TicketCard from "@/components/ticket-card";
import { useInventory } from "@/hooks/use-inventory";
import type { InventoryItem } from "@/inventory/types";
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

    const categories = useMemo(() => {
        const set = new Set(categorySuggestions);
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
            <div className="mx-auto flex w-full max-w-[720px] flex-col gap-3 px-4 pb-32 pt-3">
                <div className="flex items-center justify-between gap-3">
                    <CategoryFilterButton
                        categories={categories}
                        value={filterCategory}
                        onChange={setFilterCategory}
                    />
                    <SegmentedTabs
                        items={KIND_TABS.map(({ value, label }) => ({
                            value,
                            label: t(label),
                        }))}
                        value={kind}
                        onChange={(v) => setKind(v as KindFilter)}
                    />
                </div>

                <TicketCard
                    className="mt-8"
                    mascot={
                        <img
                            src={xiaozhiPeek}
                            alt=""
                            draggable={false}
                            className="pointer-events-none h-16 w-auto select-none"
                        />
                    }
                    top={
                        <>
                            <h1 className="font-display text-2xl font-bold tracking-tight">
                                {t("inventory-overview")}
                            </h1>
                            <div className="mt-3 grid grid-cols-2">
                                <div className="pr-4">
                                    <div className="text-xs text-ink-secondary">
                                        {t("inventory-total-assets")}
                                    </div>
                                    <div className="mt-1 font-display text-3xl font-bold text-brand tabular-nums">
                                        {money(overview.total)}
                                    </div>
                                </div>
                                <div className="border-l border-dashed border-rule pl-4">
                                    <div className="text-xs text-ink-secondary">
                                        {t("inventory-daily-cost")}
                                    </div>
                                    <div className="mt-1 font-display text-3xl font-bold text-ink/80 tabular-nums">
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
                    <p className="py-10 text-center text-sm text-ink-secondary">
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
    const current =
        value === "__all"
            ? t("inventory-all")
            : (categories.find((c) => c === value) ?? t("inventory-all"));
    if (categories.length === 0) {
        return <span />;
    }
    return (
        <div className="relative">
            <button
                type="button"
                className="flex cursor-pointer items-center gap-1 rounded-full border border-rule bg-panel px-3 py-1.5 text-sm text-ink shadow-panel"
                onClick={() => setOpen((v) => !v)}
            >
                {current}
                <i className="icon-[mdi--chevron-down] size-4 text-ink-secondary" />
            </button>
            {open && (
                <div className="absolute left-0 top-full z-20 mt-1 flex min-w-32 flex-col rounded-2xl border border-rule bg-panel p-1 shadow-card">
                    {[t("inventory-all"), ...categories].map((category) => {
                        const id =
                            category === t("inventory-all")
                                ? "__all"
                                : category;
                        return (
                            <button
                                key={id}
                                type="button"
                                className={cn(
                                    "cursor-pointer rounded-xl px-3 py-2 text-left text-sm",
                                    value === id
                                        ? "bg-brand/10 font-medium text-brand"
                                        : "text-ink",
                                )}
                                onClick={() => {
                                    onChange(id);
                                    setOpen(false);
                                }}
                            >
                                {category}
                            </button>
                        );
                    })}
                </div>
            )}
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
                    "mt-0.5 font-display text-xl font-bold tabular-nums",
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
                        <i className="icon-[mdi--package-variant-closed] size-6 text-ink-secondary" />
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
                    <i className="icon-[mdi--cycle] size-4" />
                </button>
                <button
                    type="button"
                    aria-label={t("delete")}
                    className="flex size-8 cursor-pointer items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-ground-muted"
                    onClick={onDelete}
                >
                    <i className="icon-[mdi--delete-outline] size-4" />
                </button>
            </div>
        </div>
    );
}
