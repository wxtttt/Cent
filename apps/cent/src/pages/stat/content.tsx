import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useShallow } from "zustand/shallow";
import { StorageDeferredAPI } from "@/api/storage";
import AssistantButton from "@/components/assistant";
import { setEnv } from "@/components/assistant/tools/env";
import {
    BillFilterViewProvider,
    showBillFilterView,
} from "@/components/bill-filter";
import { showBillInfo } from "@/components/bill-info";
import { budgetRange, budgetTotal } from "@/components/budget/util";
import { showSortableList } from "@/components/sortable";
import { AnalysisCloud } from "@/components/stat/analysic-cloud";
import { AnalysisDashboard } from "@/components/stat/dashboard";
import { DateSliced, useDateSliced } from "@/components/stat/date-slice";
import {
    type FocusType,
    FocusTypeSelector,
} from "@/components/stat/focus-type";
import { Button } from "@/components/ui/button";
import { useBudget } from "@/hooks/use-budget";
import { useCurrency } from "@/hooks/use-currency";
import {
    DefaultFilterViewId,
    useCustomFilters,
} from "@/hooks/use-custom-filters";
import { useFullBills } from "@/hooks/use-full-bills";
import { amountToNumber } from "@/ledger/bill";
import type { BillFilter, BillFilterView } from "@/ledger/extra-type";
import type { Bill } from "@/ledger/type";
import { useIntl } from "@/locale";
import { useBookStore } from "@/store/book";
import { useLedgerStore } from "@/store/ledger";
import { useUserStore } from "@/store/user";
import { cn } from "@/utils";

export default function StatContent({
    edit,
    onCancel,
}: {
    /** 打开时选中的筛选视图 id */
    edit?: string;
    onCancel?: () => void;
}) {
    const t = useIntl();
    useFullBills();

    const { bills } = useLedgerStore();
    const endTime = useMemo(() => Date.now(), []); //bills[0]?.time ?? dayjs();
    const startTime = bills[bills.length - 1]?.time ?? dayjs();

    const customFilters = useLedgerStore(
        useShallow((state) => state.infos?.meta.customFilters),
    );

    const allFilterViews = useMemo(() => {
        if (customFilters?.some((f) => f.id === DefaultFilterViewId)) {
            return customFilters;
        }
        return [
            {
                id: DefaultFilterViewId,
                filter: {},
                name: t("default-filter-name"),
            } as BillFilterView,
            ...(customFilters ?? []),
        ];
    }, [t, customFilters]);

    const [filterViewId, setFilterViewId] = useState(
        edit ?? allFilterViews[0].id,
    );

    const selectedFilterView = allFilterViews.find(
        (v) => v.id === filterViewId,
    );
    const selectedFilter = selectedFilterView?.filter;

    const fullRange = [
        selectedFilter?.start ?? startTime,
        selectedFilter?.end ?? endTime,
    ] as [number, number];

    const {
        sliceRange,
        viewType,
        props: dateSlicedProps,
        setSliceId,
    } = useDateSliced({
        range: fullRange,
        selectCustomSliceWhenInitial: Boolean(edit),
    });
    const realRange = useMemo(
        () =>
            [
                sliceRange?.[0] ?? selectedFilter?.start ?? startTime,
                sliceRange?.[1] ?? selectedFilter?.end ?? endTime,
            ] as [number, number],
        [
            sliceRange,
            selectedFilter?.start,
            selectedFilter?.end,
            startTime,
            endTime,
        ],
    );

    const navigate = useNavigate();
    const seeDetails = useCallback(
        (append?: Partial<BillFilter>) => {
            // 分析页是右滑弹层，看明细要先收起再打开筛选页
            onCancel?.();
            navigate("/search", {
                state: {
                    filter: {
                        ...selectedFilter,
                        start: realRange[0],
                        end: realRange[1],
                        ...append,
                    },
                },
            });
        },
        [onCancel, navigate, selectedFilter, realRange],
    );

    const [filtered, setFiltered] = useState<Bill[]>([]);

    useEffect(() => {
        const book = useBookStore.getState().currentBookId;
        if (!book) {
            return;
        }
        if (!selectedFilter) {
            return;
        }
        StorageDeferredAPI.filter(book, {
            ...selectedFilter,
            start: realRange[0],
            end: realRange[1],
        }).then((result) => {
            setFiltered(result);
        });
    }, [selectedFilter, realRange[0], realRange[1]]);

    const [focusType, setFocusType] = useState<FocusType>("expense");
    const [dimension, setDimension] = useState<"category" | "user">("category");

    const focusBills = useMemo(
        () =>
            focusType === "balance"
                ? filtered
                : filtered.filter((bill) => bill.type === focusType),
        [filtered, focusType],
    );
    const showWordCloud = useMemo(() => {
        const modules = selectedFilterView?.modules;
        return modules === undefined || modules.includes("top-words");
    }, [selectedFilterView?.modules]);

    const { updateFilter, addFilter } = useCustomFilters();
    const toChangeFilter = async () => {
        if (!selectedFilterView) {
            return;
        }
        const id = selectedFilterView.id;
        const action = await showBillFilterView({
            ...selectedFilterView,
            // hideDelete: id === DefaultFilterViewId,
        });
        if (action === "delete") {
            await updateFilter(id);
            setFilterViewId(allFilterViews[0].id);
            return;
        }
        await updateFilter(id, {
            ...action,
            name: action.name ?? selectedFilterView.name,
        });
    };
    const toReOrder = async () => {
        if ((customFilters?.length ?? 0) === 0) {
            return;
        }
        const ordered = await showSortableList(customFilters);
        useLedgerStore.getState().updateGlobalMeta((prev) => {
            prev.customFilters = ordered
                .map((v) => prev.customFilters?.find((c) => c.id === v.id))
                .filter((v) => v !== undefined);
            return prev;
        });
    };
    const toAddFilter = async () => {
        const newFilter = await showBillFilterView({
            name: t("new-filter-name"),
            filter: {},
            hideDelete: true,
        });
        if (newFilter === "delete" || !newFilter.name) {
            return;
        }
        const id = await addFilter(newFilter.name, newFilter);
        if (!id) {
            return;
        }
        setSliceId(undefined);
        setFilterViewId(id);
    };

    const { allCurrencies, baseCurrency } = useCurrency();

    const { budgets } = useBudget();
    const userId = useUserStore((state) => state.id);
    const budget = useMemo(() => {
        if (focusType !== "expense") return undefined;
        const joined = budgets.filter(
            (item) =>
                item.joiners.length === 0 || item.joiners.includes(userId),
        );
        const active = joined.filter(
            (item) => budgetRange(item, realRange[1])[1] !== null,
        );
        if (active.length === 0) return undefined;
        const total = active.reduce((sum, item) => sum + budgetTotal(item), 0);
        if (total <= 0) return undefined;
        const used = filtered.reduce((sum, bill) => {
            if (bill.type !== "expense") return sum;
            return active.some(
                (item) =>
                    item.joiners.length === 0 ||
                    item.joiners.includes(bill.creatorId),
            )
                ? sum + amountToNumber(bill.amount)
                : sum;
        }, 0);
        const daysLeft = Math.max(
            0,
            dayjs(realRange[1])
                .endOf("day")
                .diff(dayjs().startOf("day"), "day"),
        );
        return { total, used, daysLeft };
    }, [focusType, budgets, userId, realRange, filtered]);

    const envArg = useMemo(
        () => ({
            filterView: selectedFilterView,
            focusType,
            viewType,
            range: realRange,
        }),
        [selectedFilterView, focusType, viewType, realRange],
    );

    setEnv(envArg);

    const sidePanelRef = useRef<HTMLDivElement>(null);

    return (
        <div className="flex h-full w-full overflow-hidden">
            <div className="flex h-full flex-1 flex-col overflow-hidden">
                <header className="flex-shrink-0 border-b border-rule/60 bg-ground/95 backdrop-blur">
                    <div className="mx-auto flex w-full max-w-[600px] items-center gap-2 px-2 py-2">
                        <button
                            type="button"
                            aria-label={t("back")}
                            className="flex size-9 cursor-pointer items-center justify-center rounded-full text-ink transition-colors hover:bg-ground-muted"
                            onClick={onCancel}
                        >
                            <i className="icon-[lucide--chevron-left] size-6"></i>
                        </button>
                        <div className="flex-1 text-center text-lg font-bold">
                            {t("stat-title")}
                        </div>
                        <div className="size-9 flex-shrink-0" />
                    </div>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    <div className="mx-auto flex w-full max-w-[600px] flex-col gap-4 px-4 pb-10 pt-3">
                        <div className="flex items-center gap-1.5">
                            <div className="flex flex-1 items-center gap-1.5 overflow-x-auto scrollbar-hidden">
                                {allFilterViews.map((filter) => {
                                    const displayCurrency =
                                        filter.displayCurrency ===
                                        baseCurrency.id
                                            ? undefined
                                            : allCurrencies.find(
                                                  (v) =>
                                                      v.id ===
                                                      filter.displayCurrency,
                                              );
                                    const active = filterViewId === filter.id;
                                    return (
                                        <button
                                            key={filter.id}
                                            type="button"
                                            className={cn(
                                                "shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors",
                                                active
                                                    ? "border-brand/30 bg-brand/10 font-semibold text-brand"
                                                    : "border-rule bg-panel text-ink-secondary hover:text-ink",
                                            )}
                                            onClick={() => {
                                                setSliceId(undefined);
                                                setFilterViewId(filter.id);
                                            }}
                                        >
                                            {displayCurrency?.symbol}
                                            {filter.name}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex shrink-0 items-center">
                                <button
                                    type="button"
                                    aria-label={t("add")}
                                    className="flex size-8 cursor-pointer items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-ground-muted"
                                    onClick={toAddFilter}
                                >
                                    <i className="icon-[lucide--plus] size-4"></i>
                                </button>
                                <button
                                    type="button"
                                    aria-label={t("sort")}
                                    className="flex size-8 cursor-pointer items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-ground-muted"
                                    onClick={toReOrder}
                                >
                                    <i className="icon-[lucide--menu] size-4"></i>
                                </button>
                                <AssistantButton sidePanelRef={sidePanelRef} />
                            </div>
                        </div>

                        <DateSliced
                            {...dateSlicedProps}
                            onClickSettings={toChangeFilter}
                        />

                        <FocusTypeSelector
                            value={focusType}
                            onValueChange={setFocusType}
                        />

                        <AnalysisDashboard
                            bills={filtered}
                            focusType={focusType}
                            dimension={dimension}
                            onDimensionChange={setDimension}
                            range={realRange}
                            viewType={viewType}
                            symbol={baseCurrency.symbol}
                            budget={budget}
                            onSeeRange={seeDetails}
                            onOpenBill={showBillInfo}
                        />

                        {showWordCloud && <AnalysisCloud bills={focusBills} />}

                        <div className="flex justify-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => seeDetails()}
                            >
                                {t("see-all-ledgers")}
                                <i className="icon-[lucide--arrow-up-right]"></i>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            <div
                ref={sidePanelRef}
                className="side-panel hidden md:flex w-[400px] empty:w-0 transition-all border-l"
            ></div>
            <BillFilterViewProvider />
        </div>
    );
}
