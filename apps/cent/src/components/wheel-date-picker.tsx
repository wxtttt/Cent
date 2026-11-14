import dayjs from "dayjs";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { intl, useIntl } from "@/locale";
import { cn } from "@/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
    DialogTrigger,
} from "./ui/dialog";

type Props = {
    value?: number;
    onChange?: (value: number) => void;
    children?: ReactNode;
    /** date 只滚年月日；month 只滚年月；datetime-local 滚年月日时分 */
    type?: "datetime-local" | "date" | "month";
    /** 兼容旧 API：date 模式始终保留原时分 */
    fixedTime?: boolean;
    displayFormatter?: string | ((d?: dayjs.Dayjs) => string);
    /** 抽屉标题，记账抽屉里传「记账」 */
    title?: string;
    onBlur?: () => void;
    /** 受控开合，筛选中「其他月份」需要直接唤起滚轮 */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};

// 家小满式滚轮：行高约等于选中胶囊高度，窗口露出 5 行，上下边缘渐隐
const ITEM_HEIGHT = 36;
const VISIBLE_ROWS = 5;
const WINDOW_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const NOW_YEAR = dayjs().year();
const YEARS = Array.from({ length: 13 }, (_, i) => NOW_YEAR - 10 + i);

function WheelColumn({
    items,
    index,
    onIndexChange,
}: {
    items: string[];
    index: number;
    onIndexChange: (index: number) => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const settleTimer = useRef<number | undefined>(undefined);

    // 外部状态联动（如月份切换后天数被钳制）时同步滚到目标行
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const target = index * ITEM_HEIGHT;
        if (Math.abs(el.scrollTop - target) > 1) {
            el.scrollTo({ top: target });
        }
    }, [index]);

    // 滚动停稳后按位置换算选中行；点击行则平滑滚过去
    const handleScroll = () => {
        const el = ref.current;
        if (!el) return;
        window.clearTimeout(settleTimer.current);
        settleTimer.current = window.setTimeout(() => {
            const next = Math.round(el.scrollTop / ITEM_HEIGHT);
            const clamped = Math.max(0, Math.min(items.length - 1, next));
            if (clamped !== index) {
                onIndexChange(clamped);
            }
        }, 120);
    };

    return (
        <div
            ref={ref}
            onScroll={handleScroll}
            className="scrollbar-hidden snap-y snap-mandatory overscroll-contain overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_36%,black_64%,transparent)]"
            style={{ height: WINDOW_HEIGHT }}
        >
            <div
                style={{ height: (WINDOW_HEIGHT - ITEM_HEIGHT) / 2 }}
                aria-hidden
            />
            {items.map((label, i) => (
                <button
                    // biome-ignore lint/suspicious/noArrayIndexKey: 滚轮行按位置定位
                    key={i}
                    type="button"
                    tabIndex={-1}
                    onClick={() =>
                        ref.current?.scrollTo({
                            top: i * ITEM_HEIGHT,
                            behavior: "smooth",
                        })
                    }
                    className={cn(
                        "flex w-full snap-center items-center justify-center text-[17px]",
                        i === index
                            ? "font-medium text-[#0a0a0a]"
                            : "text-[#8b8b8c]",
                    )}
                    style={{ height: ITEM_HEIGHT }}
                >
                    {label}
                </button>
            ))}
            <div
                style={{ height: (WINDOW_HEIGHT - ITEM_HEIGHT) / 2 }}
                aria-hidden
            />
        </div>
    );
}

export function WheelDatePicker({
    value,
    onChange,
    children,
    type = "datetime-local",
    displayFormatter,
    title,
    onBlur,
    open: controlledOpen,
    onOpenChange,
}: Props) {
    const t = useIntl();
    const isZh = intl.locale === "zh";
    const [innerOpen, setInnerOpen] = useState(false);
    const open = controlledOpen ?? innerOpen;

    const initial = dayjs(value ?? Date.now());
    const [year, setYear] = useState(initial.year());
    const [month, setMonth] = useState(initial.month());
    const [day, setDay] = useState(initial.date());
    const [hour, setHour] = useState(initial.hour());
    const [minute, setMinute] = useState(initial.minute());

    const daysInMonth = dayjs(`${year}-${month + 1}-01`).daysInMonth();
    // 切到天数更少的月份时钳制选中日，避免滚轮停在越界位置
    useEffect(() => {
        setDay((prev) => Math.min(prev, daysInMonth));
    }, [daysInMonth]);

    // 每次打开都回到当前值：组件常驻抽屉行，内部状态不能沿用上次未确认的滚动结果
    useEffect(() => {
        if (!open) return;
        const d = dayjs(value ?? Date.now());
        setYear(d.year());
        setMonth(d.month());
        setDay(d.date());
        setHour(d.hour());
        setMinute(d.minute());
    }, [open, value]);

    const pad = (n: number) => `${n}`.padStart(2, "0");
    const yearItems = YEARS.map((y) => (isZh ? `${y}年` : `${y}`));
    const monthItems = Array.from({ length: 12 }, (_, i) =>
        isZh ? `${i + 1}月` : pad(i + 1),
    );
    const dayItems = Array.from({ length: daysInMonth }, (_, i) =>
        isZh ? `${pad(i + 1)}日` : pad(i + 1),
    );
    const hourItems = Array.from({ length: 24 }, (_, i) => pad(i));
    const minuteItems = Array.from({ length: 60 }, (_, i) => pad(i));

    const display =
        typeof displayFormatter === "function"
            ? displayFormatter
            : (d?: dayjs.Dayjs) =>
                  d ? d.format((displayFormatter as string) ?? "L") : "";

    const current = value ? dayjs(value) : undefined;
    const displayText = display(current);

    const commit = () => {
        const base = dayjs(
            `${year}-${pad(month + 1)}-${pad(day)}`,
            "YYYY-MM-DD",
        );
        // month 只到月份粒度，落在这个月 1 号零点
        const ts = (
            type === "month"
                ? base.startOf("month")
                : type === "date"
                  ? base.startOf("day")
                  : base.hour(hour).minute(minute)
        ).valueOf();
        onChange?.(ts);
    };

    const close = (next: boolean) => {
        setInnerOpen(next);
        onOpenChange?.(next);
        if (!next) {
            onBlur?.();
        }
    };

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogTrigger asChild>
                <div className="relative flex cursor-pointer items-center justify-center">
                    {children}
                    {/* 空文本时不渲染这个 mx-2 容器，否则会在 chip 右侧留下 16px 假间距 */}
                    {displayText ? (
                        <div className="mx-2">{displayText}</div>
                    ) : null}
                </div>
            </DialogTrigger>
            <DialogPortal>
                <DialogOverlay className="fixed inset-0 z-40 bg-black/50" />
                <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center">
                    <DialogContent
                        from="bottom"
                        className="pointer-events-auto w-full rounded-t-[28px] border border-b-0 border-rule bg-[#f4f4f4] shadow-panel sm:w-[90vw] sm:max-w-[500px] sm:rounded-[28px] sm:border-b"
                    >
                        <DialogTitle className="sr-only">
                            {title ?? t("time")}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {title ?? t("time")}
                        </DialogDescription>
                        {/* 头部：关闭 / 标题 / 确认，标记 drag 区域支持下拉关闭 */}
                        <div
                            data-sheet-drag
                            className="relative flex items-center justify-between px-4 pb-2 pt-3"
                        >
                            <div className="absolute inset-x-0 top-1.5 mx-auto h-1 w-10 rounded-full bg-black/15" />
                            <button
                                type="button"
                                data-no-focus-ring
                                aria-label={t("close")}
                                className="flex size-9 items-center justify-center rounded-full bg-white text-[#0a0a0a] shadow-[0_2px_12px_rgba(0,0,0,0.12)] focus-visible:outline-none"
                                onClick={() => close(false)}
                            >
                                <i className="icon-[apk--close] size-3.5" />
                            </button>
                            <span className="pointer-events-none absolute inset-x-0 text-center text-[17px] font-semibold text-[#0a0a0a]">
                                {title ?? t("time")}
                            </span>
                            <button
                                type="button"
                                data-no-focus-ring
                                aria-label={t("confirm")}
                                className="flex size-9 items-center justify-center rounded-full bg-brand text-on-brand shadow-[0_2px_12px_rgba(247,133,60,0.4)] focus-visible:outline-none"
                                onClick={() => {
                                    commit();
                                    close(false);
                                }}
                            >
                                <i className="icon-[lucide--check] size-5" />
                            </button>
                        </div>
                        {/* 选中行高亮胶囊垫在滚轮文字下方 */}
                        <div className="pb-[max(20px,var(--safe-area-inset-bottom))]">
                            <div className="relative px-6">
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute inset-x-6 rounded-full bg-white shadow-[0_10px_24px_-8px_rgba(0,0,0,0.12)]"
                                    style={{
                                        height: ITEM_HEIGHT + 4,
                                        top:
                                            (WINDOW_HEIGHT - ITEM_HEIGHT - 4) /
                                            2,
                                    }}
                                />
                                <div
                                    className={cn(
                                        "relative grid gap-1",
                                        type === "month"
                                            ? "grid-cols-[1.35fr_1fr]"
                                            : type === "date"
                                              ? "grid-cols-3"
                                              : "grid-cols-[1.35fr_1fr_1fr_1fr_1fr]",
                                    )}
                                >
                                    <WheelColumn
                                        items={yearItems}
                                        index={Math.max(0, YEARS.indexOf(year))}
                                        onIndexChange={(i) => setYear(YEARS[i])}
                                    />
                                    <WheelColumn
                                        items={monthItems}
                                        index={month}
                                        onIndexChange={setMonth}
                                    />
                                    {type !== "month" && (
                                        <WheelColumn
                                            items={dayItems}
                                            index={day - 1}
                                            onIndexChange={(i) => setDay(i + 1)}
                                        />
                                    )}
                                    {type === "datetime-local" && (
                                        <>
                                            <WheelColumn
                                                items={hourItems}
                                                index={hour}
                                                onIndexChange={setHour}
                                            />
                                            <WheelColumn
                                                items={minuteItems}
                                                index={minute}
                                                onIndexChange={setMinute}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </div>
            </DialogPortal>
        </Dialog>
    );
}
