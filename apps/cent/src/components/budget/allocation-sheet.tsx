import { useEffect, useRef, useState } from "react";
import type { BillCategory } from "@/ledger/type";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import {
    BTN_COMPACT,
    BTN_PRIMARY,
    BTN_SECONDARY,
    BTN_TAP,
    PRESSABLE_ROW,
} from "../button-styles";
import createConfirmProvider from "../confirm";
import { AmountInput, formatAmount } from "./amount-input";

export type AllocationItem = { id: string; budget: number };
export type AllocationValue = {
    total: number;
    categories: BillCategory[];
    value: AllocationItem[];
};

/** 加减按钮的短按步进：直接从 50 开始 */
const TAP_STEP = 50;
/** 滑轨最小步长仍是 10，保证拖动有细粒度；落下时再吸附到整百 */
const SLIDER_STEP = 10;
/** 吸附粒度：拖动 / 点击轨道都落到最近的 100 倍数，不落在零碎金额上 */
const SNAP_STEP = 100;
/** 滑块直径，用来把悬浮数字精确对齐到滑块中心 */
const THUMB = 12;
/** 滑轨上的空心圆刻度：10 个，覆盖 0% 与 100% 两个端点，不写任何文字 */
const TICKS = Array.from({ length: 10 }, (_, i) => (i * 100) / 9);
/** 滑块中心相对轨道的位置：0% / 100% 正好落在两端刻度上，两侧不再空出一截 */
const centerOf = (pct: number) =>
    `calc(${pct}% + ${THUMB / 2 - (pct * THUMB) / 100}px)`;
/** 长按加速阶梯：短按 50，按住越久步进越大（50 → 100 → 500） */
const HOLD_RAMP = [
    { after: 3000, step: 500 },
    { after: 1500, step: 100 },
    { after: 0, step: TAP_STEP },
];
const HOLD_DELAY = 420;
const HOLD_INTERVAL = 90;

/** 常见生活开支比例，合计 100；未命中的分类用默认权重一起归一化 */
const SMART_WEIGHTS: { test: RegExp; weight: number }[] = [
    { test: /居住|房租|住房|水电|物业|rent|housing/i, weight: 25 },
    { test: /餐饮|吃饭|伙食|food|dining/i, weight: 24 },
    { test: /交通|出行|通勤|车费|transport|transit/i, weight: 10 },
    { test: /购物|日用|生活用品|shopping/i, weight: 12 },
    { test: /娱乐|休闲|旅行|旅游|entertainment/i, weight: 8 },
    { test: /医疗|健康|看病|medical|health/i, weight: 6 },
    { test: /教育|学习|书籍|education/i, weight: 6 },
    { test: /人情|社交|礼物|送礼|social|gift/i, weight: 5 },
    { test: /其他|其它|杂项|misc|other/i, weight: 4 },
];
const DEFAULT_WEIGHT = 5;
const ROUND_STEP = 100;

const AllocationForm = ({
    edit,
    onCancel,
    onConfirm,
}: {
    edit?: AllocationValue;
    onCancel?: () => void;
    onConfirm?: (v: AllocationItem[]) => void;
}) => {
    const t = useIntl();
    const total = Math.max(0, edit?.total ?? 0);
    const categories = edit?.categories ?? [];
    const [items, setItems] = useState<AllocationItem[]>(
        () => edit?.value ?? [],
    );
    /** 长按连发需要读最新值，避免 React 批处理期间基于旧值累加 */
    const itemsRef = useRef(items);
    const commit = (next: AllocationItem[]) => {
        itemsRef.current = next;
        setItems(next);
    };

    const [activeId, setActiveId] = useState<string | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    /** 点击微反馈：金额上方飘出的 +N / -N，key 递增强制重播动画 */
    const [flash, setFlash] = useState<{
        id: string;
        delta: number;
        key: number;
    } | null>(null);
    const flashKey = useRef(0);

    const dragTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hold = useRef<{
        delay?: ReturnType<typeof setTimeout>;
        tick?: ReturnType<typeof setInterval>;
        start: number;
    } | null>(null);
    /** 抑制 pointer 事件随后派发的 click：短按由 pointerdown 覆盖，长按由 pointerup 覆盖，
     *  否则 Chromium 在长按 3 秒松开后仍会补一次 click，多出一个短按步进 */
    const suppressClickUntil = useRef(0);
    const suppressClick = () => {
        suppressClickUntil.current = Date.now() + 700;
    };

    const stopHold = () => {
        const h = hold.current;
        if (h?.delay) clearTimeout(h.delay);
        if (h?.tick) clearInterval(h.tick);
        hold.current = null;
    };
    useEffect(
        () => () => {
            // 卸载时直接清理所有定时器，避免把每次渲染都重建的 stopHold 放进依赖
            const h = hold.current;
            if (h?.delay) clearTimeout(h.delay);
            if (h?.tick) clearInterval(h.tick);
            hold.current = null;
            if (dragTimer.current) clearTimeout(dragTimer.current);
            if (flashTimer.current) clearTimeout(flashTimer.current);
        },
        [],
    );

    const allocated = items.reduce(
        (sum, v) => sum + (v.budget > 0 ? v.budget : 0),
        0,
    );
    const over = Math.max(0, allocated - total);
    const remaining = Math.max(0, total - allocated);
    const amountOf = (id: string, list = itemsRef.current) =>
        list.find((v) => v.id === id)?.budget ?? 0;

    /**
     * 该项能取的最大值：其它分类已占用之外的剩余额度，且不超过总额。
     * 所有入口（输入 / 滑块 / ± / 长按）共用，合计永远不会超总额，
     * 到边界点击就是「不加不减」，因此按钮不需要任何禁用态。
     */
    const capOf = (id: string) => {
        const others = itemsRef.current.reduce(
            (s, v) => (v.id === id ? s : s + Math.max(0, v.budget)),
            0,
        );
        return Math.max(0, Math.min(total, total - others));
    };
    const setAmount = (id: string, raw: number) => {
        const next = Math.max(0, Math.min(Math.round(raw), capOf(id)));
        const rest = itemsRef.current.filter((v) => v.id !== id);
        commit(next > 0 ? [...rest, { id, budget: next }] : rest);
    };
    /** 吸附到最近的 100 倍数，再由 setAmount 按剩余额度封顶 */
    const snapTo = (v: number) => Math.round(v / SNAP_STEP) * SNAP_STEP;
    /** 拖动和点击轨道共用：先吸附再写入，状态栏实时重算 */
    const onSlide = (id: string, raw: number) => {
        markDragging(id);
        setAmount(id, snapTo(raw));
    };

    const showFlash = (id: string, delta: number) => {
        if (delta === 0) return;
        flashKey.current += 1;
        setFlash({ id, delta, key: flashKey.current });
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(null), 720);
    };

    /** 一次加减：返回实际增量，到边界不加不减也不飘提示 */
    const step = (id: string, dir: 1 | -1, amount: number) => {
        const cur = amountOf(id);
        const next = Math.max(0, Math.min(cur + dir * amount, capOf(id)));
        const delta = next - cur;
        if (delta === 0) return;
        const rest = itemsRef.current.filter((v) => v.id !== id);
        commit(next > 0 ? [...rest, { id, budget: next }] : rest);
        showFlash(id, delta);
    };

    const onStepDown = (id: string, dir: 1 | -1) => {
        stopHold();
        const start = Date.now();
        // 短按在按下瞬间就生效并飘出反馈；随后派发的 click 必须吞掉
        suppressClick();
        step(id, dir, TAP_STEP);
        const h: NonNullable<typeof hold.current> = { start };
        h.delay = setTimeout(() => {
            h.tick = setInterval(() => {
                const elapsed = Date.now() - h.start;
                const amount =
                    HOLD_RAMP.find((r) => elapsed >= r.after)?.step ?? TAP_STEP;
                step(id, dir, amount);
            }, HOLD_INTERVAL);
        }, HOLD_DELAY);
        hold.current = h;
    };
    /** 松开 / 取消 / 移出都停止连发，并重新压住紧随其后的 click（长按尤其需要） */
    const onStepUp = () => {
        stopHold();
        suppressClick();
    };
    /** 键盘激活 / 无 pointer 事件的环境走 click 兜底 */
    const onStepClick = (id: string, dir: 1 | -1) => {
        if (Date.now() < suppressClickUntil.current) return;
        stopHold();
        step(id, dir, TAP_STEP);
    };

    /** 拖动 / 键盘微调都会触发数值变化；WebKit 不一定给 range 派发 pointerdown，故以 onChange 为准 */
    const markDragging = (id: string) => {
        setDraggingId(id);
        if (dragTimer.current) clearTimeout(dragTimer.current);
        dragTimer.current = setTimeout(() => setDraggingId(null), 700);
    };

    /** 按权重分总额，先取整到 100，再把零头按小数部分大小回填，保证合计恰好等于总额 */
    const smartAllocate = () => {
        if (total <= 0 || categories.length === 0) return;
        const weights = categories.map(
            (c) =>
                SMART_WEIGHTS.find((w) => w.test.test(c.name))?.weight ??
                DEFAULT_WEIGHT,
        );
        const sum = weights.reduce((a, b) => a + b, 0);
        const raw = weights.map((w) => (total * w) / sum);
        const values = raw.map((v) => Math.floor(v / ROUND_STEP) * ROUND_STEP);
        let rest = total - values.reduce((a, b) => a + b, 0);
        const order = raw
            .map((v, i) => ({ i, frac: v - values[i] }))
            .sort((a, b) => b.frac - a.frac);
        for (const { i } of order) {
            if (rest <= 0) break;
            const add = Math.min(ROUND_STEP, rest);
            values[i] += add;
            rest -= add;
        }
        if (rest > 0 && order.length > 0) values[order[0].i] += rest;
        commit(
            categories
                .map((c, i) => ({ id: c.id, budget: values[i] }))
                .filter((v) => v.budget > 0),
        );
        setActiveId(null);
        setDraggingId(null);
    };

    return (
        <div data-allocation-sheet className="flex max-h-[80dvh] flex-col">
            {/* 标题 / 汇总常驻顶部，不随分类列表滚动 */}
            <div className="px-5 pt-3">
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink-secondary/40" />
                {/* 标题独立居中；智能分配在分类卡片外面，不占白卡内部空间 */}
                <div className="flex h-7 items-center justify-center">
                    <h2
                        data-allocation-title
                        className="text-center text-[17px] font-semibold text-ink"
                    >
                        {t("detailed-allocation")}
                    </h2>
                </div>

                {/* 汇总去背景框：主要文字用黑色，只让 ¥金额 是品牌橙；
                    总额未设置时，提示直接落在这一行，不再单独占一条说明 */}
                <div data-allocation-status className="mt-2.5 text-center">
                    <div className="text-[11px] text-ink">
                        {t("allocated-of-total", {
                            allocated: formatAmount(allocated),
                            total: formatAmount(total),
                        })}
                    </div>
                    <div
                        data-remaining
                        className="mt-0.5 text-[20px] font-semibold tabular-nums"
                    >
                        {total <= 0 ? (
                            <span
                                data-remaining-label
                                className="text-[13px] font-normal text-ink"
                            >
                                {t("set-total-first")}
                            </span>
                        ) : over > 0 ? (
                            <span className="text-[#ef4444]">
                                {t("over-amount", { n: formatAmount(over) })}
                            </span>
                        ) : (
                            <>
                                <span
                                    data-remaining-label
                                    className="text-[13px] font-normal text-ink"
                                >
                                    {t("remaining-allocatable-label")}
                                </span>{" "}
                                <span
                                    data-remaining-value
                                    className="text-brand"
                                >
                                    ¥{formatAmount(remaining)}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-2">
                {/* 智能分配放在卡片外面：卡片上方独立一行、右对齐、无背景框 */}
                <div
                    data-smart-row
                    className="mb-2 flex h-7 items-center justify-end pr-1"
                >
                    <button
                        data-smart-button
                        type="button"
                        onClick={smartAllocate}
                        className={BTN_COMPACT}
                    >
                        <i className="icon-[lucide--sparkles] size-3 text-brand" />
                        {t("smart-allocate")}
                    </button>
                </div>
                <div
                    data-allocation-card
                    className="divide-y divide-rule/60 rounded-2xl bg-panel shadow-[0_1px_6px_rgba(92,62,30,0.05)]"
                >
                    {categories.length === 0 && (
                        <div className="rounded-2xl px-4 py-5 text-center text-[13px] text-ink-secondary">
                            {t("no-categories-budget")}
                        </div>
                    )}
                    {categories.map((category, index) => {
                        const value = amountOf(category.id, items);
                        const active = activeId === category.id;
                        const pct =
                            total > 0
                                ? Math.min(
                                      100,
                                      Math.max(0, (value / total) * 100),
                                  )
                                : 0;
                        /** 滑块中心与刻度共用同一公式，两端数字也正对滑块、不被 clamp */
                        const thumbCenter = centerOf(pct);
                        return (
                            <div
                                key={category.id}
                                className={cn(
                                    index === 0 && "rounded-t-2xl",
                                    index === categories.length - 1 &&
                                        "rounded-b-2xl",
                                )}
                            >
                                <div
                                    data-allocation-row
                                    className={cn(
                                        "relative flex h-[52px] w-full items-center gap-1 px-3 text-left",
                                        active && "bg-brand/5",
                                        index === 0 && "rounded-t-2xl",
                                        index === categories.length - 1 &&
                                            !active &&
                                            "rounded-b-2xl",
                                    )}
                                >
                                    {/* 整行点击区：铺在底层的语义 button，控件浮在上层不会被拦截 */}
                                    <button
                                        type="button"
                                        aria-label={t("slider-label", {
                                            name: category.name,
                                        })}
                                        aria-expanded={active}
                                        onClick={() =>
                                            setActiveId(
                                                active ? null : category.id,
                                            )
                                        }
                                        className={cn(
                                            "absolute inset-0 z-0 rounded-[inherit]",
                                            PRESSABLE_ROW,
                                        )}
                                    />
                                    {/* 分类名固定成列，金额列右移到「中间线」略左侧，按钮组完全不动 */}
                                    <span className="pointer-events-none relative z-10 w-[60px] flex-shrink-0 truncate text-[13px] text-ink">
                                        {category.name}
                                    </span>
                                    <div
                                        data-row-leader
                                        className="pointer-events-none relative z-10 min-w-2 flex-1"
                                    />
                                    {/* 金额列：+N / -N 微反馈严格飘在金额正上方 */}
                                    <div
                                        data-amount-col
                                        className="pointer-events-auto relative z-10 flex-shrink-0"
                                    >
                                        <AmountInput
                                            size="sm"
                                            value={value}
                                            onChange={(v) =>
                                                setAmount(category.id, v)
                                            }
                                            onFocusRow={() =>
                                                setActiveId(category.id)
                                            }
                                            className="w-[58px]"
                                        />
                                        {flash?.id === category.id && (
                                            <span
                                                key={flash.key}
                                                data-step-flash
                                                style={{
                                                    animation:
                                                        "budget-step-float 720ms ease-out forwards",
                                                }}
                                                /* 水平居中只由动画的 translate(-50%) 负责；
                                                   再加 -translate-x-1/2 会与 Tailwind v4 的 translate 属性叠加，气泡偏到分类名上方 */
                                                className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-0.5 whitespace-nowrap rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-brand"
                                            >
                                                {flash.delta > 0 ? "+" : ""}
                                                {formatAmount(flash.delta)}
                                            </span>
                                        )}
                                    </div>
                                    <div
                                        data-row-tail
                                        className="pointer-events-none relative z-10 min-w-2 flex-1"
                                    />
                                    {/* 右侧操作组：加减 / 清零 / 展开箭头依旧全部靠右，只收紧间距 */}
                                    <div className="relative z-10 flex flex-shrink-0 items-center gap-0.5">
                                        <button
                                            data-step="minus"
                                            type="button"
                                            aria-label={t("decrease-amount")}
                                            onPointerDown={(e) => {
                                                e.preventDefault();
                                                onStepDown(category.id, -1);
                                            }}
                                            onPointerUp={onStepUp}
                                            onPointerCancel={onStepUp}
                                            onPointerLeave={onStepUp}
                                            onClick={() =>
                                                onStepClick(category.id, -1)
                                            }
                                            className={BTN_TAP}
                                        >
                                            <i className="icon-[lucide--minus] size-3.5" />
                                        </button>
                                        <button
                                            data-step="plus"
                                            type="button"
                                            aria-label={t("increase-amount")}
                                            onPointerDown={(e) => {
                                                e.preventDefault();
                                                onStepDown(category.id, 1);
                                            }}
                                            onPointerUp={onStepUp}
                                            onPointerCancel={onStepUp}
                                            onPointerLeave={onStepUp}
                                            onClick={() =>
                                                onStepClick(category.id, 1)
                                            }
                                            className={BTN_TAP}
                                        >
                                            <i className="icon-[lucide--plus] size-3.5" />
                                        </button>
                                        <button
                                            data-reset
                                            type="button"
                                            aria-label={t("reset-to-zero")}
                                            title={t("reset-to-zero")}
                                            onClick={() =>
                                                setAmount(category.id, 0)
                                            }
                                            className={BTN_TAP}
                                        >
                                            <i className="icon-[lucide--rotate-ccw] size-3" />
                                        </button>
                                        <i
                                            className={cn(
                                                "pointer-events-none ml-0.5 icon-[lucide--chevron-down] size-3.5 flex-shrink-0 transition-transform",
                                                active
                                                    ? "rotate-180 text-brand"
                                                    : "text-ink-secondary/60",
                                            )}
                                        />
                                    </div>
                                </div>

                                {active && (
                                    <div
                                        data-slider-area
                                        className="px-3 pt-9 pb-5"
                                    >
                                        {/* 轨道：range 自带渐变，上面叠 10 个空心圆刻度与悬浮数字。
                                            点空白处直接按落点算比例跳转（WebKit 不保证原生 range 点轨道就跳），
                                            拖动与点击都经 onSlide 吸附到最近的整百 */}
                                        <div
                                            data-slider-track
                                            className="relative h-1 cursor-pointer"
                                            onPointerDown={(e) => {
                                                const r =
                                                    e.currentTarget.getBoundingClientRect();
                                                const ratio = Math.min(
                                                    1,
                                                    Math.max(
                                                        0,
                                                        (e.clientX - r.left) /
                                                            r.width,
                                                    ),
                                                );
                                                onSlide(
                                                    category.id,
                                                    ratio * total,
                                                );
                                            }}
                                        >
                                            {/* 无气泡：纯数字悬浮在滑块正上方，中心严格对齐 */}
                                            <span
                                                data-slider-value
                                                data-dragging={
                                                    draggingId === category.id
                                                        ? "true"
                                                        : "false"
                                                }
                                                style={{ left: thumbCenter }}
                                                /* 刚展开时 ¥0 也必须是橙色：数值本身就是橙色信息 */
                                                className="pointer-events-none absolute bottom-[calc(100%+9px)] z-30 -translate-x-1/2 whitespace-nowrap text-[12px] font-semibold tabular-nums text-brand"
                                            >
                                                ¥{formatAmount(value)}
                                            </span>
                                            <input
                                                type="range"
                                                min={0}
                                                max={Math.max(total, 1)}
                                                step={SLIDER_STEP}
                                                value={Math.min(value, total)}
                                                aria-label={t("slider-label", {
                                                    name: category.name,
                                                })}
                                                onChange={(e) =>
                                                    onSlide(
                                                        category.id,
                                                        Number(e.target.value),
                                                    )
                                                }
                                                style={{
                                                    background: `linear-gradient(to right, var(--color-brand) ${pct}%, var(--dp-color-ground-muted) ${pct}%)`,
                                                }}
                                                className="absolute inset-0 z-10 block h-1 w-full cursor-pointer appearance-none rounded-full outline-none [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-brand [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-brand [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.25)] [&:focus-visible::-moz-range-thumb]:ring-2 [&:focus-visible::-moz-range-thumb]:ring-brand/40 [&:focus-visible::-webkit-slider-thumb]:ring-2 [&:focus-visible::-webkit-slider-thumb]:ring-brand/40"
                                            />
                                            <div
                                                data-slider-ticks
                                                className="pointer-events-none absolute inset-0 z-20"
                                            >
                                                {TICKS.map((p) => (
                                                    <i
                                                        key={p}
                                                        data-tick
                                                        style={{
                                                            left: centerOf(p),
                                                        }}
                                                        className={cn(
                                                            "absolute top-1/2 size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full border bg-transparent",
                                                            p <= pct
                                                                ? "border-white/90"
                                                                : "border-ink-secondary/40",
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="border-t border-rule/70 bg-ground px-5 pt-2.5 pb-5">
                <div className="flex gap-2.5">
                    <button
                        type="button"
                        onClick={onCancel}
                        className={cn(BTN_SECONDARY, "flex-1")}
                    >
                        {t("cancel")}
                    </button>
                    <button
                        type="button"
                        onClick={() => onConfirm?.(items)}
                        className={cn(BTN_PRIMARY, "flex-1")}
                    >
                        {t("confirm")}
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * 「详细分配」独立抽屉：点预算抽屉里的同名行再弹一层。
 * 每个模块各建一个实例，避免同一 Provider 被重复挂载渲染两份弹层。
 */
export const createAllocationSheet = () =>
    createConfirmProvider<AllocationValue, AllocationItem[]>(AllocationForm, {
        dialogTitle: "Allocation Sheet",
        dialogModalClose: true,
        from: "bottom",
        contentClassName:
            "w-full max-w-full rounded-t-[28px] border-0 bg-ground p-0 shadow-none sm:w-[90vw] sm:max-w-[500px] sm:rounded-md",
    });
