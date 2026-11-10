import dayjs from "dayjs";
import { useState } from "react";
import createConfirmProvider from "@/components/confirm";
import { DatePicker } from "@/components/date-picker";
import { useCreators } from "@/hooks/use-creator";
import type { BillType } from "@/ledger/type";
import { useIntl } from "@/locale";
import { cn } from "@/utils";

/** 记账页快捷筛选，维度与家小满筛选面板一致：时间/交易类型/记账人/金额 */
export type LedgerQuickFilter = {
    /** 时间筛选来源：月份档位与自定义日期各自保留，只有激活方参与过滤 */
    timeMode?: "month" | "custom";
    /** 月份档位：本月 / 上个月 / 具体月份（月首时间戳） */
    monthPreset?: "this" | "last" | number;
    /** 自定义起止日期（未激活时也保留在面板里） */
    customStart?: number;
    customEnd?: number;
    type?: BillType;
    creators?: (string | number)[];
    minAmountNumber?: number;
    maxAmountNumber?: number;
};

/** 解析筛选实际生效的时间范围与统计卡月份 */
export function resolveQuickTimeRange(filter?: LedgerQuickFilter) {
    if (!filter?.timeMode) return undefined;
    if (filter.timeMode === "month") {
        const month =
            filter.monthPreset === "this"
                ? dayjs()
                : filter.monthPreset === "last"
                  ? dayjs().subtract(1, "month")
                  : typeof filter.monthPreset === "number"
                    ? dayjs(filter.monthPreset)
                    : undefined;
        if (!month) return undefined;
        return {
            start: month.startOf("month").valueOf(),
            end: month.endOf("month").valueOf(),
            month,
        };
    }
    const { customStart, customEnd } = filter;
    if (customStart === undefined && customEnd === undefined) return undefined;
    return {
        start: customStart,
        end: customEnd,
        // 统计卡标题取区间结束月份（家小满实测：跨月区间显示末月）
        month: dayjs(customEnd ?? customStart),
    };
}

function Chip({
    active,
    onClick,
    children,
    className,
}: {
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <button
            type="button"
            className={cn(
                "h-11 cursor-pointer rounded-xl border-[1.5px] px-5 text-[15px] transition-colors",
                active
                    ? "border-[#ff7f32] bg-[#ffefe6] font-medium text-[#ff7f32]"
                    : "border-transparent bg-white text-[#78726e]",
                className,
            )}
            onClick={onClick}
        >
            {children}
        </button>
    );
}

function DateField({
    value,
    placeholder,
    active,
    onChange,
    open,
    onOpenChange,
    title,
}: {
    value?: number;
    placeholder: string;
    active?: boolean;
    open?: boolean;
    onOpenChange?: (v: boolean) => void;
    title?: string;
    onChange: (v: number) => void;
}) {
    return (
        <div
            className={cn(
                "flex h-11 flex-1 items-center justify-center rounded-xl border-[1.5px] text-[15px]",
                active
                    ? "border-[#ff7f32] bg-[#ffefe6] font-medium text-[#ff7f32]"
                    : "border-transparent bg-white text-[#78726e]",
            )}
        >
            <DatePicker
                type="date"
                title={title}
                value={value}
                displayFormatter={(d) => d?.format("YYYY/MM/DD") ?? placeholder}
                open={open}
                onOpenChange={onOpenChange}
                onChange={onChange}
            />
        </div>
    );
}

function AmountField({
    value,
    placeholder,
    onChange,
}: {
    value?: number;
    placeholder: string;
    onChange: (v: number | undefined) => void;
}) {
    return (
        <input
            type="number"
            inputMode="decimal"
            value={value ?? ""}
            placeholder={placeholder}
            onChange={(e) => {
                onChange(
                    e.target.value === "" ? undefined : Number(e.target.value),
                );
            }}
            className="h-11 min-w-0 flex-1 rounded-xl bg-white text-center text-[15px] text-[#272322] outline-none placeholder:text-[#78726e]"
        />
    );
}

function SheetForm({
    edit,
    onConfirm,
}: {
    edit?: LedgerQuickFilter;
    onCancel?: () => void;
    onConfirm?: (v: LedgerQuickFilter) => void;
}) {
    const t = useIntl();
    const allCreators = useCreators();
    const [draft, setDraft] = useState<LedgerQuickFilter>(edit ?? {});
    const [monthOpen, setMonthOpen] = useState(false);
    const [startOpen, setStartOpen] = useState(false);
    const [endOpen, setEndOpen] = useState(false);

    const isMonthMode = draft.timeMode === "month";
    const isCustomMode = draft.timeMode === "custom";

    // 档位与自定义日期是两套独立状态：切档位不改动下方日期，反之亦然
    const setChip = (next: "this" | "last" | "other") => {
        if (next === "other") {
            setMonthOpen(true);
            return;
        }
        if (isMonthMode && draft.monthPreset === next) {
            setDraft((prev) => ({
                ...prev,
                timeMode: undefined,
                monthPreset: undefined,
            }));
            return;
        }
        setDraft((prev) => ({
            ...prev,
            timeMode: "month",
            monthPreset: next,
        }));
    };

    const setMonthValue = (v: number) => {
        setDraft((prev) => ({
            ...prev,
            timeMode: "month",
            monthPreset: dayjs(v).startOf("month").valueOf(),
        }));
    };

    // 自定义日期按天生效：起始取当天零点，终止含当天整天
    const setCustom = (key: "customStart" | "customEnd", v: number) => {
        setDraft((prev) => ({
            ...prev,
            timeMode: "custom",
            [key]:
                key === "customEnd"
                    ? dayjs(v).endOf("day").valueOf()
                    : dayjs(v).startOf("day").valueOf(),
        }));
    };

    return (
        // 面板底色/圆角/档位规格均按家小满实测：#f4f4f4 底、44px 档位、橙色选中
        <div className="relative flex min-h-0 flex-1 flex-col outline-none">
            <div
                data-sheet-drag
                className="flex flex-shrink-0 flex-col items-center pt-3"
            >
                <div className="h-1 w-8 rounded-full bg-[#bdbbb7]" />
                <div className="mt-3.5 text-[17px] font-bold text-[#272322]">
                    {t("filter")}
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2 pt-7">
                <section>
                    <h3 className="text-[15px] font-bold text-[#272322]">
                        {t("filter-time")}
                    </h3>
                    <div className="mt-3.5 flex gap-2.5">
                        <Chip
                            className="flex-1 px-1"
                            active={isMonthMode && draft.monthPreset === "this"}
                            onClick={() => setChip("this")}
                        >
                            {t("this-month")}
                        </Chip>
                        <Chip
                            className="flex-1 px-1"
                            active={isMonthMode && draft.monthPreset === "last"}
                            onClick={() => setChip("last")}
                        >
                            {t("filter-last-month")}
                        </Chip>
                        <Chip
                            className="flex-1 px-1"
                            active={
                                isMonthMode &&
                                typeof draft.monthPreset === "number"
                            }
                            onClick={() => setChip("other")}
                        >
                            {isMonthMode &&
                            typeof draft.monthPreset === "number"
                                ? dayjs(draft.monthPreset).format("YYYY/MM")
                                : t("filter-other-months")}
                        </Chip>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <DateField
                            value={draft.customStart}
                            placeholder={t("filter-start-time")}
                            title={t("filter-start-time")}
                            active={isCustomMode}
                            open={startOpen}
                            onOpenChange={setStartOpen}
                            onChange={(v) => setCustom("customStart", v)}
                        />
                        <span className="flex-shrink-0 text-[#71717a]">-</span>
                        <DateField
                            value={draft.customEnd}
                            placeholder={t("filter-end-time")}
                            title={t("filter-end-time")}
                            active={isCustomMode}
                            open={endOpen}
                            onOpenChange={setEndOpen}
                            onChange={(v) => setCustom("customEnd", v)}
                        />
                    </div>
                    {/* 其他月份滚轮：由档位按钮唤起，触发器不占位 */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute h-0 w-0 overflow-hidden"
                    >
                        <DatePicker
                            type="month"
                            title={t("filter-other-months")}
                            value={
                                typeof draft.monthPreset === "number"
                                    ? draft.monthPreset
                                    : undefined
                            }
                            displayFormatter={() => ""}
                            open={monthOpen}
                            onOpenChange={setMonthOpen}
                            onChange={setMonthValue}
                        />
                    </div>
                </section>

                <section className="mt-7">
                    <h3 className="text-[15px] font-bold text-[#272322]">
                        {t("filter-type")}
                    </h3>
                    <div className="mt-3.5 flex gap-2.5">
                        <Chip
                            className="flex-1 px-1"
                            active={draft.type === undefined}
                            onClick={() =>
                                setDraft((prev) => ({
                                    ...prev,
                                    type: undefined,
                                }))
                            }
                        >
                            {t("all")}
                        </Chip>
                        <Chip
                            className="flex-1 px-1"
                            active={draft.type === "expense"}
                            onClick={() =>
                                setDraft((prev) => ({
                                    ...prev,
                                    type: "expense",
                                }))
                            }
                        >
                            {t("expense")}
                        </Chip>
                        <Chip
                            className="flex-1 px-1"
                            active={draft.type === "income"}
                            onClick={() =>
                                setDraft((prev) => ({
                                    ...prev,
                                    type: "income",
                                }))
                            }
                        >
                            {t("income")}
                        </Chip>
                    </div>
                </section>

                <section className="mt-7">
                    <h3 className="text-[15px] font-bold text-[#272322]">
                        {t("filter-members")}
                    </h3>
                    <div className="mt-3.5 flex flex-wrap gap-2.5">
                        <Chip
                            active={
                                draft.creators === undefined ||
                                draft.creators.length === 0
                            }
                            onClick={() =>
                                setDraft((prev) => ({
                                    ...prev,
                                    creators: undefined,
                                }))
                            }
                        >
                            {t("all")}
                        </Chip>
                        {allCreators.map((creator) => {
                            const active =
                                draft.creators?.includes(creator.id) ?? false;
                            return (
                                <Chip
                                    key={creator.id}
                                    active={active}
                                    onClick={() =>
                                        setDraft((prev) => {
                                            const set = new Set(prev.creators);
                                            if (set.has(creator.id)) {
                                                set.delete(creator.id);
                                            } else {
                                                set.add(creator.id);
                                            }
                                            return {
                                                ...prev,
                                                creators:
                                                    set.size === 0
                                                        ? undefined
                                                        : [...set],
                                            };
                                        })
                                    }
                                >
                                    {creator.name}
                                </Chip>
                            );
                        })}
                    </div>
                </section>

                <section className="mt-7">
                    <h3 className="text-[15px] font-bold text-[#272322]">
                        {t("filter-amount-range")}
                    </h3>
                    <div className="mt-3.5 flex items-center gap-2">
                        <AmountField
                            value={draft.minAmountNumber}
                            placeholder={t("filter-min-amount")}
                            onChange={(v) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    minAmountNumber: v,
                                }))
                            }
                        />
                        <span className="flex-shrink-0 text-[#71717a]">-</span>
                        <AmountField
                            value={draft.maxAmountNumber}
                            placeholder={t("filter-max-amount")}
                            onChange={(v) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    maxAmountNumber: v,
                                }))
                            }
                        />
                    </div>
                </section>
            </div>
            <div className="flex flex-shrink-0 items-center gap-5 px-5 pb-[max(20px,var(--safe-area-inset-bottom))] pt-4">
                <button
                    type="button"
                    className="h-[52px] w-[36%] cursor-pointer rounded-[26px] bg-white text-[16px] font-medium text-[#272322]"
                    onClick={() => setDraft({})}
                >
                    {t("filter-reset")}
                </button>
                <button
                    type="button"
                    className="h-[52px] flex-1 cursor-pointer rounded-[26px] bg-brand text-[16px] font-medium text-on-brand"
                    onClick={() => onConfirm?.(draft)}
                >
                    {t("filter-confirm")}
                </button>
            </div>
        </div>
    );
}

const [LedgerFilterProvider, rawShowLedgerFilter] = createConfirmProvider<
    LedgerQuickFilter | undefined,
    LedgerQuickFilter
>(SheetForm, {
    dialogTitle: "filter",
    dialogModalClose: true,
    from: "bottom",
    contentClassName:
        "w-full rounded-t-[28px] border-0! bg-[#f4f4f4]! sm:w-[90vw] sm:max-w-[500px] sm:rounded-[28px]",
});

export { LedgerFilterProvider };

/** 打开记账筛选面板，确认时带出所选条件；点遮罩/下拉关闭视为取消 */
export const showLedgerFilter = (initial?: LedgerQuickFilter) =>
    rawShowLedgerFilter(initial);
