/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */

import { useVirtualizer } from "@tanstack/react-virtual";
import dayjs, { type Dayjs } from "dayjs";
import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
} from "react";
import type { OutputType } from "@/database/stash";
import { amountToNumber } from "@/ledger/bill";
import type { Bill } from "@/ledger/type";
import { useIntl, useLocale } from "@/locale";
import { cn } from "@/utils";
import { showBillInfo } from "../bill-info";
import { Checkbox } from "../ui/checkbox";
import BillItem from "./item";
import "./style.scss";

function DayHeader({
    date,
    totals,
    className,
    onClick,
}: {
    date: Dayjs;
    totals?: { expense: number; income: number };
    className?: string;
    onClick?: () => void;
}) {
    const t = useIntl();
    const { locale } = useLocale();
    const weekday = new Intl.DateTimeFormat(locale, {
        weekday: "short",
    }).format(date.toDate());
    // 家小满记账页日头：当天显示「今天」，其余统一显示「M月D日」，非同年才带年份
    const now = dayjs();
    const dateText = date.isSame(now, "days")
        ? t("Today")
        : locale === "zh"
          ? date.isSame(now, "year")
              ? `${date.format("M")}月${date.format("D")}日`
              : date.format("YYYY年M月D日")
          : date.isSame(now, "year")
            ? date.format("MM/DD")
            : date.format("YYYY/MM/DD");
    return (
        <div
            className={cn(
                "flex cursor-pointer items-center justify-between px-4 pb-2 pt-4",
                className,
            )}
            onClick={onClick}
        >
            <div className="flex items-baseline gap-2">
                <span className="text-[15px] font-bold">{dateText}</span>
                <span className="text-xs text-ink-secondary">{weekday}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-ink-secondary tabular-nums">
                <span>
                    {t("short-expense")} {totals?.expense.toFixed(2) ?? "0.00"}
                </span>
                <span>
                    {t("short-income")} {totals?.income.toFixed(2) ?? "0.00"}
                </span>
            </div>
        </div>
    );
}

type LedgerRef = {
    scrollToIndex: (index: number) => void;
};

type LedgerProps = {
    bills: OutputType<Bill>[];
    /** 如果传入的列表已按时间降序，则尝试按照日期分隔 */
    enableDivideAsOrdered?: boolean;
    className?: string;
    showTime?: boolean;
    timeOnly?: boolean;
    selectedIds?: string[];
    /** 是否显示列表首次出场动画 */
    presence?: boolean;
    onSelectChange?: (id: string) => void;
    afterEdit?: (bill: Bill) => void;
    onItemShow?: (index: number) => void;
    onVisibleDateChange?: (date: Dayjs) => void;
    onDateClick?: (date: Dayjs) => void;
    showAssets?: boolean;
};

const Ledger = forwardRef<LedgerRef, LedgerProps>(
    (
        {
            bills,
            enableDivideAsOrdered,
            className,
            showTime,
            timeOnly,
            selectedIds,
            presence,
            onSelectChange,
            afterEdit,
            onItemShow,
            onVisibleDateChange,
            onDateClick,
            showAssets,
        },
        ref,
    ) => {
        const parentRef = useRef<HTMLDivElement>(null);

        const dayTotals = useMemo(() => {
            const totals = new Map<
                string,
                { expense: number; income: number }
            >();
            for (const bill of bills) {
                const key = dayjs.unix(bill.time / 1000).format("YYYY-MM-DD");
                const current = totals.get(key) ?? { expense: 0, income: 0 };
                if (bill.type === "expense") {
                    current.expense += amountToNumber(bill.amount);
                } else {
                    current.income += amountToNumber(bill.amount);
                }
                totals.set(key, current);
            }
            return totals;
        }, [bills]);

        useImperativeHandle(ref, () => ({
            scrollToIndex: (index: number) => {
                rowVirtualizer.scrollToIndex(index);
            },
        }));

        const rowVirtualizer = useVirtualizer({
            count: bills.length,
            getScrollElement: () => parentRef.current,
            // 卡片和日头都带间距，预估高度比旧的单行布局大
            estimateSize: () => (enableDivideAsOrdered ? 150 : 120),
            overscan: 5,
            paddingEnd: 96,
        });

        const enableSelect = selectedIds !== undefined;

        useEffect(() => {
            const el = parentRef.current;
            if (!el) return;
            const handleScroll = () => {
                const scrollTop = el.scrollTop;
                const visibleItems = rowVirtualizer.getVirtualItems();
                // 找到第一个底部超过 scrollTop 的 item，即当前顶部可见的那个
                const firstVisible = visibleItems.find(
                    (item) => item.start + item.size > scrollTop,
                );
                if (firstVisible) {
                    const firstBill = bills[firstVisible.index];
                    const curDate = dayjs.unix(firstBill.time / 1000);
                    onVisibleDateChange?.(curDate);
                }
            };
            el.addEventListener("scroll", handleScroll, { passive: true });
            // 初始调用
            handleScroll();
            return () => el.removeEventListener("scroll", handleScroll);
        }, [bills, onVisibleDateChange, rowVirtualizer]);

        useEffect(() => {
            if (!presence) {
                return;
            }
            const listEl =
                parentRef.current?.querySelector<HTMLDivElement>(
                    "[data-main-ledger]",
                );
            if (!listEl) {
                return;
            }
            listEl.classList.add("animated-bill-list");
            setTimeout(() => {
                listEl.classList.remove("animated-bill-list");
            }, 1600);
        }, [presence]);

        return (
            <div
                ref={parentRef}
                className={cn("relative bill-list", className)}
                style={{
                    height: `100%`,
                    overflow: "auto",
                }}
            >
                <div
                    data-main-ledger
                    style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: "100%",
                        position: "relative",
                    }}
                >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const bill = bills[virtualRow.index];
                        const curDate = dayjs.unix(bill.time / 1000);
                        const prevBill = bills[virtualRow.index - 1];
                        const isGroupStart =
                            enableDivideAsOrdered &&
                            (!prevBill ||
                                !dayjs
                                    .unix(prevBill.time / 1000)
                                    .isSame(curDate, "day"));
                        const dayKey = curDate.format("YYYY-MM-DD");
                        onItemShow?.(virtualRow.index);
                        return (
                            <div
                                key={virtualRow.key}
                                data-index={virtualRow.index}
                                // 这一行非常关键：将 ref={rowVirtualizer.measureElement}
                                // 传递给每个虚拟行的 DOM 元素
                                ref={rowVirtualizer.measureElement}
                                style={{
                                    position: "absolute",
                                    top: `${virtualRow.start}px`,
                                    left: 0,
                                    width: "100%",
                                }}
                            >
                                {isGroupStart && (
                                    <DayHeader
                                        date={curDate}
                                        totals={dayTotals.get(dayKey)}
                                        onClick={() => onDateClick?.(curDate)}
                                    />
                                )}
                                <div
                                    className={cn(
                                        `ledger-item item-${virtualRow.index} flex w-full items-center gap-2 px-4 pb-2`,
                                    )}
                                    onClick={
                                        enableSelect
                                            ? () => {
                                                  onSelectChange?.(bill.id);
                                              }
                                            : undefined
                                    }
                                >
                                    {enableSelect && (
                                        <Checkbox
                                            checked={selectedIds.includes(
                                                bill.id,
                                            )}
                                        ></Checkbox>
                                    )}
                                    <BillItem
                                        bill={bill}
                                        className="min-w-0 flex-1"
                                        onClick={
                                            enableSelect
                                                ? undefined
                                                : async () => {
                                                      await showBillInfo(bill);
                                                      afterEdit?.(bill);
                                                  }
                                        }
                                        showTime={showTime}
                                        timeOnly={timeOnly}
                                        showAssets={showAssets}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    },
);

export default Ledger;
