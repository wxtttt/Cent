import dayjs from "dayjs";
import { useCallback, useMemo } from "react";
import { v4 } from "uuid";
import { useShallow } from "zustand/shallow";
import {
    clampStartDay,
    DEFAULT_START_DAY,
    firstAnchorAfter,
    periodContaining,
    periodFrom,
} from "@/components/budget/period";
import type { Budget } from "@/ledger/type";
import { measure } from "@/measurement";
import { useBookStore } from "@/store/book";
import { useLedgerStore } from "@/store/ledger";

const specialKey = (budget: Budget) =>
    `${budget.title}::${(budget.tagIds ?? []).slice().sort().join(",")}`;

const cloneForPeriod = (
    source: Omit<Budget, "id">,
    start: dayjs.Dayjs,
    end: dayjs.Dayjs,
): Budget => ({
    ...source,
    id: v4(),
    periodStart: start.valueOf(),
    periodEnd: end.valueOf(),
    isTransition: undefined,
    categoriesBudget: source.categoriesBudget?.map((v) => ({ ...v })),
    joiners: [...source.joiners],
    tagIds: source.tagIds ? [...source.tagIds] : undefined,
});

/** 从「最后一条记录的结束日」往后逐月生成，直到覆盖当前周期；不回头重排已生成记录 */
const fillFrom = (
    budgets: Budget[],
    lastEnd: number,
    startDay: number,
    currentStart: dayjs.Dayjs,
    source: Omit<Budget, "id">,
    exists: (b: Budget, key: string) => boolean,
) => {
    const created: Budget[] = [];
    let cursorEnd = dayjs(lastEnd);
    for (let guard = 0; guard < 240; guard += 1) {
        const nextStart = firstAnchorAfter(cursorEnd, startDay);
        if (nextStart.isAfter(currentStart)) {
            break;
        }
        const [start, end] = periodFrom(nextStart, startDay);
        const key = dayjs(start).format("YYYY-MM-DD");
        if (!budgets.some((b) => exists(b, key))) {
            const item = cloneForPeriod(source, start, end);
            budgets.push(item);
            created.push(item);
        }
        cursorEnd = end;
    }
    return created;
};

export function useBudget() {
    const budgets = useLedgerStore(
        useShallow((state) => state.infos?.meta.budgets ?? []),
    );
    const startDay = useLedgerStore(
        (state) => state.infos?.meta.budgetStartDay ?? DEFAULT_START_DAY,
    );

    const add = useCallback(async (budget: Omit<Budget, "id">) => {
        const book = useBookStore.getState().currentBookId;
        if (!book) {
            return;
        }
        const id = v4();
        await useLedgerStore.getState().updateGlobalMeta((prev) => ({
            ...prev,
            budgets: [...(prev.budgets ?? []), { ...budget, id }],
        }));
        measure("feature_config_changed", {
            feature: "budget",
            action: "create",
        });
        return id;
    }, []);

    const update = useCallback(
        async (id: string, value?: Omit<Budget, "id">) => {
            const book = useBookStore.getState().currentBookId;
            if (!book) {
                return;
            }
            await useLedgerStore.getState().updateGlobalMeta((prev) => ({
                ...prev,
                budgets:
                    value === undefined
                        ? (prev.budgets ?? []).filter((v) => v.id !== id)
                        : (prev.budgets ?? []).map((v) =>
                              v.id === id ? { ...value, id } : v,
                          ),
            }));
            measure("feature_config_changed", {
                feature: "budget",
                action: value === undefined ? "delete" : "update",
            });
        },
        [],
    );

    const reorder = useCallback(async (ordered: { id: string }[]) => {
        await useLedgerStore.getState().updateGlobalMeta((prev) => ({
            ...prev,
            budgets: ordered
                .map((o) => prev.budgets?.find((b) => b.id === o.id))
                .filter((v) => v !== undefined),
        }));
    }, []);

    /** 应用初始化时调用：补齐所有缺席月份（ADR-0005 / 0006） */
    const ensureCurrentBudgets = useCallback(async () => {
        const book = useBookStore.getState().currentBookId;
        const meta = useLedgerStore.getState().infos?.meta;
        if (!book || !meta) {
            return;
        }
        const day = clampStartDay(meta.budgetStartDay ?? DEFAULT_START_DAY);
        const currentStart = periodContaining(dayjs(), day)[0];
        const list = [...(meta.budgets ?? [])];
        const created: Budget[] = [];

        const normals = list
            .filter((b) => b.kind === "normal")
            .sort((a, b) => a.periodStart - b.periodStart);
        let lastNormal = normals.at(-1);
        if (!lastNormal) {
            const [start, end] = periodContaining(dayjs(), day);
            lastNormal = {
                id: v4(),
                kind: "normal",
                title: "普通预算",
                periodStart: start.valueOf(),
                periodEnd: end.valueOf(),
                joiners: [],
                totalBudget: 0,
            };
            list.push(lastNormal);
            created.push(lastNormal);
        }
        created.push(
            ...fillFrom(
                list,
                lastNormal.periodEnd,
                day,
                currentStart,
                lastNormal,
                (b, key) =>
                    b.kind === "normal" &&
                    dayjs(b.periodStart).format("YYYY-MM-DD") === key,
            ),
        );

        // 特殊预算只在「每月重复」勾选时逐月复制
        const latestByKey = new Map<string, Budget>();
        for (const item of list) {
            if (item.kind !== "special" || !item.repeatMonthly) {
                continue;
            }
            const key = specialKey(item);
            const prev = latestByKey.get(key);
            if (!prev || item.periodStart > prev.periodStart) {
                latestByKey.set(key, item);
            }
        }
        for (const source of latestByKey.values()) {
            const key = specialKey(source);
            created.push(
                ...fillFrom(
                    list,
                    source.periodEnd,
                    day,
                    currentStart,
                    source,
                    (b, dateKey) =>
                        specialKey(b) === key &&
                        dayjs(b.periodStart).format("YYYY-MM-DD") === dateKey,
                ),
            );
        }

        if (created.length > 0) {
            await useLedgerStore.getState().updateGlobalMeta((prev) => ({
                ...prev,
                budgets: [...(prev.budgets ?? []), ...created],
            }));
        }
    }, []);

    /**
     * 修改账本级起始日：从「今天之后的第一个匹配日」起按新周期运行。
     * 例：10/1 把起始日改成 15 → 10/1–10/14 归到归属 9 月的过渡期
     * [9/15,10/14]，10/15 起是新的 10 月期 [10/15,11/14]。
     * 过渡期沿用当前生效预算的设置，历史记录裁剪到过渡期前一天避免重叠。
     */
    const setStartDay = useCallback(async (day: number) => {
        const nextDay = clampStartDay(day);
        const meta = useLedgerStore.getState().infos?.meta;
        if (!meta || nextDay === (meta.budgetStartDay ?? DEFAULT_START_DAY)) {
            return;
        }
        const now = dayjs();
        const nowTs = now.valueOf();
        const [tStart, tEnd] = periodContaining(now, nextDay);
        const t0 = tStart.valueOf();
        const t1 = tEnd.valueOf();
        const nextAnchor = firstAnchorAfter(now, nextDay);
        const [nStart, nEnd] = periodFrom(nextAnchor, nextDay);
        const list = meta.budgets ?? [];

        const covering = (b: Budget) =>
            b.periodStart <= nowTs && b.periodEnd >= nowTs;
        // 每类预算取一条作为过渡期的设置来源：优先覆盖今天的，否则取最新一条
        const sources = new Map<string, Budget>();
        for (const b of list) {
            if (b.kind === "special" && !b.repeatMonthly && !covering(b)) {
                continue;
            }
            const key = b.kind === "normal" ? "normal" : specialKey(b);
            const prev = sources.get(key);
            if (
                !prev ||
                (covering(b) && !covering(prev)) ||
                (!covering(prev) && b.periodStart > prev.periodStart)
            ) {
                sources.set(key, b);
            }
        }
        const sourceIds = new Set([...sources.values()].map((b) => b.id));
        const historyEnd = tStart.subtract(1, "day").endOf("day").valueOf();
        const history = list
            .filter((b) => b.periodStart < t0 && !sourceIds.has(b.id))
            .map((b) =>
                b.periodEnd >= t0 ? { ...b, periodEnd: historyEnd } : b,
            );

        const transition = [...sources.values()].map((source) => ({
            ...source,
            periodStart: t0,
            periodEnd: t1,
            isTransition: true,
            categoriesBudget: source.categoriesBudget?.map((v) => ({ ...v })),
            joiners: [...source.joiners],
            tagIds: source.tagIds ? [...source.tagIds] : undefined,
        }));
        // 下一个匹配日的新周期提前建好，预算页可切过去查看；一次性特殊预算不延续
        const following = [...sources.values()]
            .filter((b) => b.kind === "normal" || b.repeatMonthly)
            .map((source) => ({
                ...cloneForPeriod(source, nStart, nEnd),
                repeatMonthly: source.repeatMonthly,
            }));

        await useLedgerStore.getState().updateGlobalMeta((prev) => ({
            ...prev,
            budgetStartDay: nextDay,
            budgets: [...history, ...transition, ...following],
        }));
    }, []);

    const periods = useMemo(
        () =>
            Array.from(
                new Set(
                    budgets
                        .filter((b) => b.kind === "normal")
                        .map((b) => b.periodStart),
                ),
            ).sort((a, b) => b - a),
        [budgets],
    );

    return {
        budgets,
        startDay,
        periods,
        add,
        update,
        reorder,
        ensureCurrentBudgets,
        setStartDay,
    };
}
