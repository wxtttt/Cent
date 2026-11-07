import dayjs, { type OpUnitType } from "dayjs";
import { useCallback, useMemo, useState } from "react";
import CategoryIcon from "@/components/category/icon";
import BillItem from "@/components/ledger/item";
import useCategory from "@/hooks/use-category";
import { useCreators } from "@/hooks/use-creator";
import { amountToNumber } from "@/ledger/bill";
import type { BillFilter } from "@/ledger/extra-type";
import type { Bill } from "@/ledger/type";
import { useIntl, useLocale } from "@/locale";
import { cn } from "@/utils";
import { categoryColors } from "@/utils/color";
import type { ViewType } from "./date-slice";
import type { FocusType } from "./focus-type";

type Bucket = {
    key: string;
    label: string;
    value: number;
    count: number;
    start: number;
    end: number;
};

type StructureItem = {
    id: string;
    name: string;
    value: number;
};

function useMoney() {
    const { locale } = useLocale();
    return useCallback(
        (value: number) =>
            new Intl.NumberFormat(locale, {
                maximumFractionDigits: 2,
            }).format(value),
        [locale],
    );
}

function focusLabel(t: ReturnType<typeof useIntl>, focusType: FocusType) {
    return t(focusType);
}

function sumBills(bills: Bill[], focusType: FocusType) {
    return bills.reduce((total, bill) => {
        const value = amountToNumber(bill.amount);
        if (focusType === "expense") {
            return bill.type === "expense" ? total + value : total;
        }
        if (focusType === "income") {
            return bill.type === "income" ? total + value : total;
        }
        return bill.type === "income" ? total + value : total - value;
    }, 0);
}

function useBuckets(
    bills: Bill[],
    focusType: FocusType,
    range: [number, number],
    viewType: ViewType,
) {
    const { locale } = useLocale();
    return useMemo(() => {
        const isZh = locale.startsWith("zh");
        const unit: OpUnitType =
            viewType === "yearly" ||
            range[1] - range[0] > 62 * 24 * 60 * 60 * 1000
                ? "month"
                : "day";
        const buckets = new Map<string, Bucket>();
        const last = dayjs(range[1]);
        let cursor = dayjs(range[0]).startOf(unit);
        for (let i = 0; i < 400 && !cursor.isAfter(last); i += 1) {
            buckets.set(cursor.format("YYYY-MM-DD"), {
                key: cursor.format("YYYY-MM-DD"),
                label:
                    unit === "month"
                        ? isZh
                            ? `${cursor.month() + 1}月`
                            : cursor.format("MMM")
                        : isZh
                          ? `${cursor.date()}日`
                          : `${cursor.date()}`,
                value: 0,
                count: 0,
                start: cursor.valueOf(),
                end: cursor.endOf(unit).valueOf(),
            });
            cursor = cursor.add(1, unit);
        }
        for (const bill of bills) {
            if (focusType !== "balance" && bill.type !== focusType) {
                continue;
            }
            const bucket = buckets.get(
                dayjs(bill.time).startOf(unit).format("YYYY-MM-DD"),
            );
            if (!bucket) {
                continue;
            }
            const value = amountToNumber(bill.amount);
            bucket.value +=
                focusType === "balance"
                    ? bill.type === "income"
                        ? value
                        : -value
                    : value;
            bucket.count += 1;
        }
        return Array.from(buckets.values());
    }, [bills, focusType, range, viewType, locale]);
}

function SummaryCard({
    bills,
    focusType,
    range,
    symbol,
    budget,
    onSeeRange,
}: {
    bills: Bill[];
    focusType: FocusType;
    range: [number, number];
    symbol: string;
    budget?: { total: number; used: number; daysLeft: number };
    onSeeRange: (append?: Partial<BillFilter>) => void;
}) {
    const t = useIntl();
    const money = useMoney();

    const focusBills = useMemo(
        () =>
            focusType === "balance"
                ? bills
                : bills.filter((bill) => bill.type === focusType),
        [bills, focusType],
    );
    const total = useMemo(
        () => sumBills(focusBills, focusType),
        [focusBills, focusType],
    );
    const maxBill = useMemo(
        () =>
            focusBills.reduce(
                (max, bill) => Math.max(max, amountToNumber(bill.amount)),
                0,
            ),
        [focusBills],
    );
    const days = Math.max(
        1,
        dayjs(range[1])
            .endOf("day")
            .diff(dayjs(range[0]).startOf("day"), "day") + 1,
    );

    return (
        <section className="rounded-card border border-rule bg-panel p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink-secondary">
                    {t(
                        focusType === "expense"
                            ? "stat-total-expense"
                            : focusType === "income"
                              ? "stat-total-income"
                              : "stat-total-balance",
                    )}
                </span>
                <span className="rounded-full bg-ground-muted px-2.5 py-1 text-[11px] text-ink-secondary">
                    {t("stat-period-chip")}
                </span>
            </div>
            <button
                type="button"
                className="mt-1 flex w-full cursor-pointer items-baseline gap-1 text-left font-display font-bold tracking-tight"
                onClick={() => {
                    onSeeRange({
                        type: focusType === "balance" ? undefined : focusType,
                    });
                }}
            >
                <span className="text-xl">{symbol}</span>
                <span className="truncate text-[40px] leading-none tabular-nums">
                    {money(total)}
                </span>
            </button>

            <div className="mt-4 grid grid-cols-3 divide-x divide-rule">
                <div className="pr-3">
                    <div className="text-xs text-ink-secondary">
                        {t("stat-count")}
                    </div>
                    <div className="mt-1 font-display text-lg font-bold tabular-nums">
                        {focusBills.length}
                        <span className="ml-0.5 text-xs font-normal text-ink-secondary">
                            {t("bill-unit")}
                        </span>
                    </div>
                </div>
                <div className="px-3">
                    <div className="text-xs text-ink-secondary">
                        {t("stat-daily-average")}
                    </div>
                    <div className="mt-1 truncate font-display text-lg font-bold tabular-nums">
                        {symbol}
                        {money(total / days)}
                    </div>
                </div>
                <div className="pl-3">
                    <div className="text-xs text-ink-secondary">
                        {t("stat-max-bill")}
                    </div>
                    <div className="mt-1 truncate font-display text-lg font-bold tabular-nums">
                        {symbol}
                        {money(maxBill)}
                    </div>
                </div>
            </div>

            {budget && focusType === "expense" && (
                <div className="mt-4 border-t border-rule pt-3">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-secondary">
                            {t("total-budget")} {symbol}
                            {money(budget.total)}
                        </span>
                        <span className="font-semibold tabular-nums">
                            {t("stat-budget-used", {
                                percent:
                                    budget.total > 0
                                        ? Math.round(
                                              (budget.used / budget.total) *
                                                  1000,
                                          ) / 10
                                        : 0,
                            })}
                        </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ground-muted">
                        <div
                            className="h-full rounded-full bg-brand"
                            style={{
                                width: `${Math.min(
                                    100,
                                    budget.total > 0
                                        ? (budget.used / budget.total) * 100
                                        : 0,
                                )}%`,
                            }}
                        />
                    </div>
                    <div className="mt-2 text-xs text-ink-secondary">
                        {t("stat-budget-remaining", {
                            amount: `${symbol}${money(
                                Math.max(0, budget.total - budget.used),
                            )}`,
                            days: budget.daysLeft,
                            daily: `${symbol}${money(
                                Math.max(0, budget.total - budget.used) /
                                    Math.max(1, budget.daysLeft),
                            )}`,
                        })}
                    </div>
                </div>
            )}
        </section>
    );
}

function TrendCard({
    bills,
    focusType,
    range,
    viewType,
    symbol,
    onSeeRange,
}: {
    bills: Bill[];
    focusType: FocusType;
    range: [number, number];
    viewType: ViewType;
    symbol: string;
    onSeeRange: (append?: Partial<BillFilter>) => void;
}) {
    const t = useIntl();
    const money = useMoney();
    const buckets = useBuckets(bills, focusType, range, viewType);
    const [picked, setPicked] = useState<string>();

    const todayKey = dayjs().format("YYYY-MM-DD");
    const selectedKey = useMemo(() => {
        if (picked && buckets.some((bucket) => bucket.key === picked)) {
            return picked;
        }
        if (buckets.some((bucket) => bucket.key === todayKey)) {
            return todayKey;
        }
        const lastWithValue = [...buckets]
            .reverse()
            .find((bucket) => bucket.value !== 0);
        return lastWithValue?.key ?? buckets[buckets.length - 1]?.key;
    }, [picked, buckets, todayKey]);
    const selected = buckets.find((bucket) => bucket.key === selectedKey);

    const max = Math.max(...buckets.map((bucket) => Math.abs(bucket.value)), 1);
    const diverging = focusType === "balance";
    const step = Math.ceil(buckets.length / 8);

    return (
        <section className="rounded-card border border-rule bg-panel p-5 shadow-card">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{t("stat-daily-trend")}</h2>
                <span className="text-[11px] text-ink-secondary">
                    {t("stat-trend-hint")}
                </span>
            </div>

            {buckets.length === 0 ? (
                <div className="py-10 text-center text-sm text-ink-secondary">
                    {t("stat-empty")}
                </div>
            ) : (
                <>
                    <div
                        className={cn(
                            "relative mt-4 flex gap-1.5",
                            diverging ? "h-32 items-stretch" : "h-32 items-end",
                        )}
                    >
                        {diverging && (
                            <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-rule" />
                        )}
                        {buckets.map((bucket) => {
                            const isSelected = bucket.key === selectedKey;
                            if (diverging) {
                                const height =
                                    (Math.abs(bucket.value) / max) * 50;
                                return (
                                    <button
                                        key={bucket.key}
                                        type="button"
                                        aria-label={bucket.label}
                                        className="relative flex-1 cursor-pointer"
                                        onClick={() => {
                                            setPicked(bucket.key);
                                        }}
                                    >
                                        <span
                                            className={cn(
                                                "absolute left-1/2 w-full max-w-[14px] -translate-x-1/2 rounded-full transition-colors",
                                                isSelected
                                                    ? "bg-brand"
                                                    : "bg-brand/25",
                                            )}
                                            style={
                                                bucket.value >= 0
                                                    ? {
                                                          bottom: "50%",
                                                          height: `${Math.max(2, height)}%`,
                                                      }
                                                    : {
                                                          top: "50%",
                                                          height: `${Math.max(2, height)}%`,
                                                      }
                                            }
                                        />
                                    </button>
                                );
                            }
                            return (
                                <button
                                    key={bucket.key}
                                    type="button"
                                    aria-label={bucket.label}
                                    className="flex h-full flex-1 cursor-pointer items-end justify-center"
                                    onClick={() => {
                                        setPicked(bucket.key);
                                    }}
                                >
                                    <span
                                        className={cn(
                                            "block w-full max-w-[14px] rounded-full transition-colors",
                                            isSelected
                                                ? "bg-brand"
                                                : "bg-brand/25",
                                        )}
                                        style={{
                                            height: `${Math.max(
                                                2,
                                                (Math.abs(bucket.value) / max) *
                                                    100,
                                            )}%`,
                                        }}
                                    />
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-1.5 flex gap-1.5">
                        {buckets.map((bucket, index) => (
                            <div
                                key={bucket.key}
                                className={cn(
                                    "flex-1 text-center text-[10px]",
                                    bucket.key === selectedKey
                                        ? "font-semibold text-brand"
                                        : "text-ink-secondary",
                                )}
                            >
                                {index % step === 0 ||
                                index === buckets.length - 1
                                    ? bucket.label
                                    : ""}
                            </div>
                        ))}
                    </div>
                    {selected && (
                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-rule pt-3">
                            <div className="min-w-0">
                                <div className="text-sm font-semibold">
                                    {dayjs(selected.key).format("M月D日")}
                                </div>
                                <div className="mt-0.5 truncate text-xs text-ink-secondary">
                                    {symbol}
                                    {money(selected.value)} · {selected.count}
                                    {t("bill-unit")}
                                </div>
                            </div>
                            <button
                                type="button"
                                className="flex flex-shrink-0 cursor-pointer items-center gap-0.5 rounded-full bg-ground-muted px-3 py-1.5 text-xs text-ink"
                                onClick={() => {
                                    onSeeRange({
                                        start: selected.start,
                                        end: selected.end,
                                        type:
                                            focusType === "balance"
                                                ? undefined
                                                : focusType,
                                    });
                                }}
                            >
                                {t("stat-view-details")}
                                <i className="icon-[mdi--chevron-right] size-4"></i>
                            </button>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

function StructureCard({
    bills,
    focusType,
    dimension,
    onDimensionChange,
    symbol,
    onSeeRange,
}: {
    bills: Bill[];
    focusType: FocusType;
    dimension: "category" | "user";
    onDimensionChange: (value: "category" | "user") => void;
    symbol: string;
    onSeeRange: (append?: Partial<BillFilter>) => void;
}) {
    const t = useIntl();
    const money = useMoney();
    const { categories } = useCategory();
    const creators = useCreators();

    const items = useMemo<StructureItem[]>(() => {
        if (focusType === "balance") {
            return [];
        }
        const map = new Map<string, StructureItem>();
        for (const bill of bills) {
            if (bill.type !== focusType) {
                continue;
            }
            let id: string;
            let name: string;
            if (dimension === "category") {
                const category = categories.find(
                    (item) => item.id === bill.categoryId,
                );
                const parentId = category?.parent ?? category?.id;
                const parent = categories.find((item) => item.id === parentId);
                id = parentId ?? bill.categoryId;
                name = parent?.name ?? category?.name ?? id;
            } else {
                id = String(bill.creatorId);
                name =
                    creators.find(
                        (item) => String(item.id) === String(bill.creatorId),
                    )?.name ?? id;
            }
            const existing = map.get(id);
            if (existing) {
                existing.value += amountToNumber(bill.amount);
            } else {
                map.set(id, {
                    id,
                    name,
                    value: amountToNumber(bill.amount),
                });
            }
        }
        return Array.from(map.values()).sort((a, b) => b.value - a.value);
    }, [bills, focusType, dimension, categories, creators]);

    const total = items.reduce((sum, item) => sum + item.value, 0);
    const gradient = useMemo(() => {
        if (total <= 0) {
            return "conic-gradient(var(--dp-color-ground-muted) 0% 100%)";
        }
        let cursor = 0;
        const stops: string[] = [];
        items.forEach((item) => {
            const share = (item.value / total) * 100;
            const end = cursor + share;
            const gap = Math.min(0.8, share / 4);
            const color = categoryColors(item.name);
            stops.push(
                `${color} ${cursor}% ${Math.max(cursor, end - gap)}%`,
                `var(--dp-color-panel) ${Math.max(cursor, end - gap)}% ${end}%`,
            );
            cursor = end;
        });
        return `conic-gradient(${stops.join(", ")})`;
    }, [items, total]);

    const typeName = focusLabel(t, focusType) || t("expense");

    return (
        <section className="rounded-card border border-rule bg-panel p-5 shadow-card">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold">
                    {t("stat-composition", { type: typeName })}
                </h2>
                <div className="flex items-center rounded-full bg-ground-muted p-0.5">
                    {(
                        [
                            { id: "category", label: t("stat-category") },
                            { id: "user", label: t("stat-member") },
                        ] as const
                    ).map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={cn(
                                "cursor-pointer rounded-full px-3 py-1 text-xs transition-colors",
                                dimension === item.id
                                    ? "bg-panel font-semibold text-ink shadow-panel"
                                    : "text-ink-secondary",
                            )}
                            onClick={() => {
                                onDimensionChange(item.id);
                            }}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {items.length === 0 ? (
                <div className="py-10 text-center text-sm text-ink-secondary">
                    {t("stat-empty")}
                </div>
            ) : (
                <>
                    <div className="mt-4 flex justify-center">
                        <div
                            className="relative flex size-[148px] items-center justify-center rounded-full"
                            style={{ background: gradient }}
                        >
                            <div className="flex size-[98px] flex-col items-center justify-center rounded-full bg-panel">
                                <div className="max-w-full truncate px-2 font-display text-xl font-bold tabular-nums">
                                    {symbol}
                                    {money(total)}
                                </div>
                                <div className="mt-0.5 text-[11px] text-ink-secondary">
                                    {t("stat-items", { n: items.length })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                        {items.slice(0, 6).map((item) => {
                            const percent =
                                total > 0
                                    ? Math.round((item.value / total) * 1000) /
                                      10
                                    : 0;
                            const category = categories.find(
                                (entry) => entry.id === item.id,
                            );
                            const creator = creators.find(
                                (entry) => String(entry.id) === item.id,
                            );
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    className="flex cursor-pointer items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-ground-muted/60"
                                    onClick={() => {
                                        onSeeRange(
                                            dimension === "category"
                                                ? { categories: [item.id] }
                                                : { creators: [item.id] },
                                        );
                                    }}
                                >
                                    <div className="flex size-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-ground-muted text-ink">
                                        {dimension === "category" ? (
                                            category?.icon ? (
                                                <CategoryIcon
                                                    icon={category.icon}
                                                />
                                            ) : (
                                                <i className="icon-[mdi--shape-outline] size-5"></i>
                                            )
                                        ) : creator?.avatar_url ? (
                                            <img
                                                src={creator.avatar_url}
                                                alt=""
                                                className="size-full object-cover"
                                            />
                                        ) : (
                                            <i className="icon-[mdi--account-outline] size-5"></i>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <span className="truncate text-sm font-semibold">
                                                {item.name}
                                            </span>
                                            <span className="flex-shrink-0 text-sm font-semibold tabular-nums">
                                                {symbol}
                                                {money(item.value)}
                                            </span>
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-2">
                                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ground-muted">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${percent}%`,
                                                        backgroundColor:
                                                            categoryColors(
                                                                item.name,
                                                            ),
                                                    }}
                                                />
                                            </div>
                                            <span className="w-10 flex-shrink-0 text-right text-[11px] text-ink-secondary tabular-nums">
                                                {percent}%
                                            </span>
                                        </div>
                                    </div>
                                    <i className="icon-[mdi--chevron-right] size-4 flex-shrink-0 text-ink-secondary"></i>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </section>
    );
}

function HabitCard({
    bills,
    focusType,
}: {
    bills: Bill[];
    focusType: FocusType;
}) {
    const t = useIntl();
    const { locale } = useLocale();

    const weekdays = useMemo(() => {
        const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
        return Array.from({ length: 7 }, (_, i) =>
            formatter.format(new Date(2024, 0, 1 + i)),
        );
    }, [locale]);

    const habit = useMemo(() => {
        const values = [0, 0, 0, 0, 0, 0, 0];
        for (const bill of bills) {
            if (focusType !== "balance" && bill.type !== focusType) {
                continue;
            }
            const value = amountToNumber(bill.amount);
            values[(dayjs(bill.time).day() + 6) % 7] +=
                focusType === "balance"
                    ? bill.type === "income"
                        ? value
                        : -value
                    : value;
        }
        const total = values.reduce((sum, value) => sum + value, 0);
        const weekend = values[5] + values[6];
        const top = values.indexOf(Math.max(...values));
        return {
            values,
            total,
            weekendShare: total > 0 ? weekend / total : 0,
            top,
        };
    }, [bills, focusType]);

    const max = Math.max(...habit.values.map((value) => Math.abs(value)), 1);
    const hasData = habit.total !== 0;

    return (
        <section className="rounded-card border border-rule bg-panel p-5 shadow-card">
            <h2 className="text-lg font-bold">{t("stat-habit")}</h2>
            {!hasData ? (
                <div className="py-10 text-center text-sm text-ink-secondary">
                    {t("stat-empty")}
                </div>
            ) : (
                <>
                    <div className="mt-4 flex h-28 items-end gap-2">
                        {habit.values.map((value, index) => (
                            <div
                                key={weekdays[index]}
                                className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                            >
                                <span
                                    className={cn(
                                        "block w-full max-w-[16px] rounded-full",
                                        index === habit.top
                                            ? "bg-brand"
                                            : "bg-brand/25",
                                    )}
                                    style={{
                                        height: `${Math.max(
                                            2,
                                            (Math.abs(value) / max) * 100,
                                        )}%`,
                                    }}
                                />
                                <span
                                    className={cn(
                                        "text-[10px]",
                                        index === habit.top
                                            ? "font-semibold text-brand"
                                            : "text-ink-secondary",
                                    )}
                                >
                                    {weekdays[index]}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 border-t border-rule pt-3 text-sm text-ink-secondary">
                        {t("stat-habit-summary", {
                            weekend: `${Math.round(habit.weekendShare * 100)}%`,
                            day: weekdays[habit.top],
                        })}
                    </div>
                </>
            )}
        </section>
    );
}

function TopBillsCard({
    bills,
    focusType,
    onOpenBill,
}: {
    bills: Bill[];
    focusType: FocusType;
    onOpenBill: (bill: Bill) => void;
}) {
    const t = useIntl();
    const topBills = useMemo(
        () =>
            bills
                .filter(
                    (bill) =>
                        focusType === "balance" || bill.type === focusType,
                )
                .sort(
                    (a, b) =>
                        amountToNumber(b.amount) - amountToNumber(a.amount),
                )
                .slice(0, 4),
        [bills, focusType],
    );

    return (
        <section className="rounded-card border border-rule bg-panel p-5 shadow-card">
            <h2 className="text-lg font-bold">{t("stat-largest")}</h2>
            {topBills.length === 0 ? (
                <div className="py-10 text-center text-sm text-ink-secondary">
                    {t("stat-empty")}
                </div>
            ) : (
                <div className="mt-3 flex flex-col gap-2">
                    {topBills.map((bill, index) => {
                        const previous = topBills[index - 1];
                        const showDay =
                            !previous ||
                            !dayjs(previous.time).isSame(bill.time, "day");
                        return (
                            <div key={bill.id} className="flex flex-col gap-2">
                                {showDay && (
                                    <div className="mt-1 text-xs text-ink-secondary">
                                        {dayjs(bill.time).format("M月D日")}
                                    </div>
                                )}
                                <BillItem
                                    bill={bill}
                                    showTime
                                    onClick={() => {
                                        onOpenBill(bill);
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export function AnalysisDashboard({
    bills,
    focusType,
    dimension,
    onDimensionChange,
    range,
    viewType,
    symbol,
    budget,
    onSeeRange,
    onOpenBill,
}: {
    bills: Bill[];
    focusType: FocusType;
    dimension: "category" | "user";
    onDimensionChange: (value: "category" | "user") => void;
    range: [number, number];
    viewType: ViewType;
    symbol: string;
    budget?: { total: number; used: number; daysLeft: number };
    onSeeRange: (append?: Partial<BillFilter>) => void;
    onOpenBill: (bill: Bill) => void;
}) {
    return (
        <>
            <SummaryCard
                bills={bills}
                focusType={focusType}
                range={range}
                symbol={symbol}
                budget={budget}
                onSeeRange={onSeeRange}
            />
            <TrendCard
                bills={bills}
                focusType={focusType}
                range={range}
                viewType={viewType}
                symbol={symbol}
                onSeeRange={onSeeRange}
            />
            {focusType !== "balance" && (
                <StructureCard
                    bills={bills}
                    focusType={focusType}
                    dimension={dimension}
                    onDimensionChange={onDimensionChange}
                    symbol={symbol}
                    onSeeRange={onSeeRange}
                />
            )}
            <HabitCard bills={bills} focusType={focusType} />
            <TopBillsCard
                bills={bills}
                focusType={focusType}
                onOpenBill={onOpenBill}
            />
        </>
    );
}
