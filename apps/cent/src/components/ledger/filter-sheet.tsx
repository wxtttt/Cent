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
    start?: number;
    end?: number;
    type?: BillType;
    creators?: (string | number)[];
    minAmountNumber?: number;
    maxAmountNumber?: number;
};

const monthRange = (d: dayjs.Dayjs) =>
    [d.startOf("month").valueOf(), d.endOf("month").valueOf()] as const;

/** 由起止时间反推所选快捷档位（本月/上个月/其他月份） */
function presetOf(start?: number, end?: number) {
    if (start === undefined || end === undefined) return undefined;
    const [ts, te] = monthRange(dayjs());
    if (start === ts && end === te) return "this" as const;
    const [ls, le] = monthRange(dayjs().subtract(1, "month"));
    if (start === ls && end === le) return "last" as const;
    return "other" as const;
}

function Chip({
    active,
    onClick,
    children,
}: {
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            className={cn(
                "h-11 cursor-pointer rounded-xl border-[1.5px] px-5 text-[15px] transition-colors",
                active
                    ? "border-brand bg-[#ffefe6] font-medium text-brand"
                    : "border-transparent bg-white text-[#8a8a8a]",
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
    onChange,
}: {
    value?: number;
    placeholder: string;
    onChange: (v: number | undefined) => void;
}) {
    return (
        <div className="flex h-11 flex-1 items-center justify-center rounded-xl bg-white text-[15px]">
            <DatePicker
                value={value}
                displayFormatter={(d) => d?.format("YYYY/MM/DD") ?? placeholder}
                onChange={(v) => onChange(v)}
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
            className="h-11 min-w-0 flex-1 rounded-xl bg-white text-center text-[15px] text-ink outline-none placeholder:text-ink-secondary/70"
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
    const preset = presetOf(draft.start, draft.end);

    const setTimeRange = (preset: "this" | "last" | "other") => {
        setDraft((prev) => {
            // 再点一次已选中的档位 = 清除时间筛选
            if (presetOf(prev.start, prev.end) === preset) {
                return { ...prev, start: undefined, end: undefined };
            }
            if (preset === "this") {
                const [s, e] = monthRange(dayjs());
                return { ...prev, start: s, end: e };
            }
            if (preset === "last") {
                const [s, e] = monthRange(dayjs().subtract(1, "month"));
                return { ...prev, start: s, end: e };
            }
            // 其他月份：清空起止时间，交给下面的日期输入
            return { ...prev, start: undefined, end: undefined };
        });
    };

    return (
        // 面板底色/圆角/档位规格均按家小满实测：#f4f4f4 底、44px 档位、橙色选中
        <div className="flex max-h-[90dvh] flex-col outline-none">
            <div
                data-sheet-drag
                className="flex flex-shrink-0 flex-col items-center pt-3"
            >
                <div className="h-1 w-8 rounded-full bg-[#bdbbb7]" />
                <div className="mt-3.5 text-[17px] font-bold text-ink">
                    {t("filter")}
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2 pt-7">
                <section>
                    <h3 className="text-[15px] font-bold text-ink">
                        {t("filter-time")}
                    </h3>
                    <div className="mt-3.5 flex flex-wrap gap-2.5">
                        <Chip
                            active={preset === "this"}
                            onClick={() => setTimeRange("this")}
                        >
                            {t("this-month")}
                        </Chip>
                        <Chip
                            active={preset === "last"}
                            onClick={() => setTimeRange("last")}
                        >
                            {t("filter-last-month")}
                        </Chip>
                        <Chip
                            active={preset === "other"}
                            onClick={() => setTimeRange("other")}
                        >
                            {t("filter-other-months")}
                        </Chip>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <DateField
                            value={draft.start}
                            placeholder={t("filter-start-time")}
                            onChange={(v) =>
                                setDraft((prev) => ({ ...prev, start: v }))
                            }
                        />
                        <span className="flex-shrink-0 text-ink-secondary">
                            -
                        </span>
                        <DateField
                            value={draft.end}
                            placeholder={t("filter-end-time")}
                            onChange={(v) =>
                                setDraft((prev) => ({ ...prev, end: v }))
                            }
                        />
                    </div>
                </section>

                <section className="mt-7">
                    <h3 className="text-[15px] font-bold text-ink">
                        {t("filter-type")}
                    </h3>
                    <div className="mt-3.5 flex flex-wrap gap-2.5">
                        <Chip
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
                    <h3 className="text-[15px] font-bold text-ink">
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
                    <h3 className="text-[15px] font-bold text-ink">
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
                        <span className="flex-shrink-0 text-ink-secondary">
                            -
                        </span>
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
                    className="h-[52px] w-[36%] cursor-pointer rounded-[26px] bg-white text-[16px] font-medium text-ink"
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
    dialogModalClose: false,
    from: "bottom",
    contentClassName:
        "w-full rounded-t-[28px] border-0! bg-[#f4f4f4]! sm:w-[90vw] sm:max-w-[500px] sm:rounded-[28px]",
});

export { LedgerFilterProvider };

/** 打开记账筛选面板，确认时带出所选条件；点遮罩/下拉关闭视为取消 */
export const showLedgerFilter = (initial?: LedgerQuickFilter) =>
    rawShowLedgerFilter(initial);
