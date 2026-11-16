import dayjs from "dayjs";
import { intl } from "@/locale";
import { cn } from "@/utils";
import { DatePicker } from "../date-picker";
import { RowChevron } from "../form-rows";

/** 年月文案：中文「2026年12月」，英文「Dec 2026」 */
export function ymText(v: { year: number; month: number }) {
    if (intl.locale === "zh") return `${v.year}年${v.month}月`;
    return dayjs(new Date(v.year, v.month - 1, 1)).format("MMM YYYY");
}

/**
 * 年月触发器的统一写法：走全站默认滚轮（选择预算周期 / 记账时间那套），
 * 不再用 `<input type="month">`——那个在 iOS 上是另一套系统弹窗，和产品割裂。
 */
export function MonthField({
    value,
    onChange,
    title,
    years,
    className,
    align = "right",
}: {
    value: { year: number; month: number };
    onChange: (v: { year: number; month: number }) => void;
    title: string;
    /** 年份可选区间：还款生涯跨二三十年，默认可选窗口不够用 */
    years?: [number, number];
    className?: string;
    /** 触发器在行内的对齐方式 */
    align?: "left" | "right";
}) {
    return (
        <div
            className={cn(
                "flex items-center",
                align === "right" && "ml-auto",
                className,
            )}
        >
            <DatePicker
                type="month"
                title={title}
                years={years}
                value={new Date(value.year, value.month - 1, 1).getTime()}
                displayFormatter={() => ""}
                onChange={(ts) => {
                    const d = dayjs(ts);
                    onChange({ year: d.year(), month: d.month() + 1 });
                }}
            >
                <span className="flex cursor-pointer items-center gap-1 text-[15px] dp-text-medium text-ink tabular-nums">
                    {ymText(value)}
                    <RowChevron />
                </span>
            </DatePicker>
        </div>
    );
}
