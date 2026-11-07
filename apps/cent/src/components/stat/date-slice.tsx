import dayjs, { type Dayjs } from "dayjs";
import { type ReactNode, useMemo, useState } from "react";
import { DateInput } from "@/components/bill-filter/form";
import { useIntl, useLocale } from "@/locale";
import { cn } from "@/utils";

type DateSliceId = string; // weekly|YYYY

export type DateSlicedProps = {
    value?: DateSliceId;
    viewSlices: Record<ViewType, DateSlice[]>;
    onValueChange?: (value?: DateSliceId) => void;
    custom?: [number | undefined, number | undefined];
    onCustomValueChange?: (
        value: [number | undefined, number | undefined],
    ) => void;
    onClickSettings?: () => void;
    children?: ReactNode;
};

const StaticViews = [
    // { id: "daily", label: "stat-view-daily" },
    { id: "weekly", label: "stat-view-weekly" },
    { id: "monthly", label: "stat-view-monthly" },
    { id: "yearly", label: "stat-view-yearly" },
    { id: "custom", label: "stat-view-custom" },
] as const;

export type ViewType = (typeof StaticViews)[number]["id"];

type DateSlice = {
    end: Dayjs;
    start: Dayjs;
    label: string;
};
function calcDateSlice(
    range: [number, number],
    viewType: "weekly" | "monthly" | "yearly",
    t: ReturnType<typeof useIntl>,
) {
    const START = dayjs.unix(range[0] / 1000);
    const END = dayjs.unix(range[1] / 1000);

    const labels = (() => {
        if (viewType === "weekly") {
            return {
                unit: "week",
                labelThis: t("this-week"),
                labelLast: t("last-week"),
                format: "MM-DD",
                max: 4,
            } as const;
        }
        if (viewType === "monthly") {
            return {
                unit: "month",
                labelThis: t("this-month"),
                labelLast: t("last-month"),
                format: "YYYY-MM",
            } as const;
        }
        if (viewType === "yearly") {
            return {
                unit: "year",
                labelThis: t("this-year"),
                labelLast: t("last-year"),
                format: "YYYY",
            } as const;
        }
    })();
    if (labels === undefined) {
        return [];
    }
    const { unit, labelThis, labelLast, format, max } = labels;
    let end = END;
    let start = end.startOf(unit);
    const s: DateSlice[] = [];
    s.push({
        label: labelThis,
        end: end,
        start: start,
    });

    let i = 0;
    while (true && i < (max ?? Infinity)) {
        i += 1;
        end = start.subtract(1, "ms");
        start = end.startOf(unit);
        if (end.isAfter(START)) {
            s.push({
                end,
                start,
                label: i === 1 ? labelLast : start.format(format),
            });
        } else {
            break;
        }
    }
    return s;
}

const usePeriodLabel = () => {
    const { locale } = useLocale();
    const isZh = locale.toLowerCase().startsWith("zh");
    return (viewType: ViewType, slice?: DateSlice) => {
        if (viewType === "custom" || slice === undefined) return undefined;
        if (viewType === "weekly") {
            const fmt = new Intl.DateTimeFormat(locale, {
                month: "short",
                day: "numeric",
            });
            return `${fmt.format(slice.start.toDate())} - ${fmt.format(slice.end.toDate())}`;
        }
        if (viewType === "monthly") {
            return isZh
                ? `${slice.start.year()}年${slice.start.month() + 1}月`
                : new Intl.DateTimeFormat(locale, {
                      year: "numeric",
                      month: "long",
                  }).format(slice.start.toDate());
        }
        return isZh
            ? `${slice.start.year()}年`
            : new Intl.DateTimeFormat(locale, { year: "numeric" }).format(
                  slice.start.toDate(),
              );
    };
};

export function DateSliced({
    value,
    viewSlices,
    custom,
    onValueChange,
    onCustomValueChange,
    children,
    onClickSettings,
}: DateSlicedProps) {
    const t = useIntl();
    const periodLabel = usePeriodLabel();
    const selectedViewId =
        StaticViews.find((v) => value?.startsWith(v.id))?.id ?? "custom";

    const slices =
        selectedViewId === "custom" ? undefined : viewSlices[selectedViewId];

    const selectedSlice = value?.split("|")?.[1];
    const sliceIndex =
        slices?.findIndex((slice) => slice.label === selectedSlice) ?? -1;
    // 时间切片从新到旧排列，索引越大越早
    const current = sliceIndex >= 0 ? slices?.[sliceIndex] : undefined;
    const canPrev = slices !== undefined && sliceIndex < slices.length - 1;
    const canNext = slices !== undefined && sliceIndex > 0;

    const goTo = (index: number) => {
        const slice = slices?.[index];
        if (slice === undefined) return;
        onValueChange?.(`${selectedViewId}|${slice.label}`);
    };

    return (
        <div className="flex w-full flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1">
                    <button
                        type="button"
                        aria-label={t("previous-month")}
                        disabled={!canPrev}
                        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-ground-muted disabled:cursor-default disabled:opacity-30"
                        onClick={() => {
                            goTo(sliceIndex + 1);
                        }}
                    >
                        <i className="icon-[mdi--chevron-left] size-5"></i>
                    </button>
                    <div className="min-w-0 truncate text-base font-semibold">
                        {periodLabel(selectedViewId, current) ??
                            t("stat-view-custom")}
                    </div>
                    <button
                        type="button"
                        aria-label={t("next-month")}
                        disabled={!canNext}
                        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-ground-muted disabled:cursor-default disabled:opacity-30"
                        onClick={() => {
                            goTo(sliceIndex - 1);
                        }}
                    >
                        <i className="icon-[mdi--chevron-right] size-5"></i>
                    </button>
                </div>
                {onClickSettings && (
                    <button
                        type="button"
                        aria-label={t("settings")}
                        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-ground-muted"
                        onClick={onClickSettings}
                    >
                        <i className="icon-[mdi--tune-variant] size-4"></i>
                    </button>
                )}
            </div>

            <div className="flex w-full items-center gap-1 rounded-full bg-ground-muted p-1">
                {StaticViews.map((view) => (
                    <button
                        key={view.id}
                        type="button"
                        className={cn(
                            "flex-1 cursor-pointer rounded-full py-1.5 text-xs transition-colors duration-150",
                            selectedViewId === view.id
                                ? "bg-panel font-semibold text-ink shadow-panel"
                                : "text-ink-secondary hover:text-ink",
                        )}
                        onClick={() => {
                            if (view.id === "custom") {
                                onValueChange?.(undefined);
                                return;
                            }
                            onValueChange?.(
                                `${view.id}|${viewSlices[view.id][0].label}`,
                            );
                        }}
                    >
                        {t(view.label)}
                    </button>
                ))}
            </div>

            {selectedViewId === "custom" && (
                <div className="flex items-center gap-2 text-xs">
                    <DateInput
                        value={custom?.[0]}
                        type="start"
                        onChange={(v) => {
                            onCustomValueChange?.([v, custom?.[1]]);
                        }}
                    ></DateInput>
                    <div className="text-ink-secondary">-</div>
                    <DateInput
                        value={custom?.[1]}
                        type="end"
                        onChange={(v) => {
                            onCustomValueChange?.([custom?.[0], v]);
                        }}
                    ></DateInput>
                </div>
            )}

            {children}
        </div>
    );
}

export function useDateSliced({
    range,
    selectCustomSliceWhenInitial,
}: {
    range: [number, number];
    selectCustomSliceWhenInitial?: boolean;
}) {
    const t = useIntl();
    const viewSlices = useMemo(
        () =>
            Object.fromEntries(
                StaticViews.map(({ id: viewType }) => {
                    return viewType === "custom"
                        ? undefined
                        : [viewType, calcDateSlice(range, viewType, t)];
                }).filter((v) => v !== undefined),
            ) as Record<ViewType, DateSlice[]>,
        [range, t],
    );

    const [sliceId, setSliceId] = useState<string | undefined>(
        selectCustomSliceWhenInitial
            ? undefined
            : `monthly|${viewSlices.monthly[0].label}`,
    );

    const [customRange, setCustomRange] =
        useState<[number | undefined, number | undefined]>();

    const props: DateSlicedProps = {
        viewSlices,
        value: sliceId,
        onValueChange: setSliceId,
        custom: customRange,
        onCustomValueChange: setCustomRange,
    };

    const viewType = sliceId
        ? (StaticViews.find((v) => sliceId.startsWith(v.id))?.id ?? "custom")
        : "custom";

    const sliceRange = (() => {
        if (sliceId === undefined) {
            return customRange;
        }
        const slice = viewSlices[viewType].find((v) =>
            sliceId.endsWith(v.label),
        );
        if (slice === undefined) {
            return customRange;
        }
        return [slice.start.unix() * 1000, slice.end.unix() * 1000] as [
            number,
            number,
        ];
    })();
    return { sliceRange, viewType, props, setSliceId };
}
