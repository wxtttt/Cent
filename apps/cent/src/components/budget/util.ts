import type { Dayjs } from "dayjs";
import { amountToNumber } from "@/ledger/bill";
import type { Bill, BillCategory } from "@/ledger/type";
import { isSameOrChildCategory } from "@/ledger/utils";
import { useLedgerStore } from "@/store/ledger";
import { filterOrderedBillListByTimeRange } from "@/utils/filter";
import { toDayjs } from "@/utils/time";
import type { EditBudget } from "./type";

/**
 * 普通预算总额就是 totalBudget 本身。
 * 分类额度只是普通预算内部的分项上限，不参与总额累加（v8 口径）：
 * 设置分类预算时普通预算不会被加上去，但记账时账单支出仍照常累加进普通预算的已支出。
 * 首页 / 统计 / 账本 / 卡片统一走这里，避免各处各自叠加导致金额不一致。
 */
export const budgetTotal = (budget: EditBudget) => budget.totalBudget;

/**
 * 保持旧签名以兼容首页 / 统计 / 卡片等调用点。
 * 周期不再由 start + repeat 现算，而是直接读记录自带的冻结边界（ADR-0006）。
 */
export const budgetRange = (
    budget: EditBudget,
    _now?: number | Dayjs,
): [[Dayjs, Dayjs][], [Dayjs, Dayjs] | null] => {
    const start = toDayjs(budget.periodStart).startOf("day");
    const end = toDayjs(budget.periodEnd).endOf("day");
    const now = toDayjs(_now ?? Date.now()).startOf("day");
    const currentRange: [Dayjs, Dayjs] | null =
        now.isBefore(start) || now.isAfter(end) ? null : [start, end];
    return [[[start, end]], currentRange];
};

/** 计算某个周期内预算的使用情况和分类使用情况 */
export const budgetEncountered = (
    budget: EditBudget,
    bills: Bill[],
    currentRange: [Dayjs, Dayjs],
    allCategories: BillCategory[],
    /** 预算卡片要展示全部一级分类（含未设置额度的），传入后按这些 id 归集支出 */
    trackedCategoryIds?: string[],
) => {
    // 互斥判定需要全局的标签类型与同周期特殊预算，见 ADR-0001
    const meta = useLedgerStore.getState().infos?.meta;
    const specialTagIds = new Set(
        (meta?.tags ?? [])
            .filter((tag) => tag.kind === "special")
            .map((tag) => tag.id),
    );
    const activeSpecialTagIds = new Set(
        (meta?.budgets ?? [])
            .filter(
                (item) =>
                    item.kind === "special" &&
                    item.periodStart === budget.periodStart,
            )
            .flatMap((item) => item.tagIds ?? []),
    );

    const filtered = filterOrderedBillListByTimeRange(
        bills,
        currentRange,
        true,
        // 空数组 = 不过滤，包含全部成员（含以后新增的）
        (v) =>
            budget.joiners.length === 0 || budget.joiners.includes(v.creatorId),
    );
    let totalUsed = 0;
    const trackedIds =
        trackedCategoryIds ?? budget.categoriesBudget?.map((c) => c.id) ?? [];
    const categoriesUsed = [...new Set(trackedIds)].map((id) => ({
        id,
        used: 0,
    }));
    filtered.forEach((bill) => {
        if (bill.type === "income") {
            return;
        }
        const billTags = bill.tagIds ?? [];
        if (budget.kind === "special") {
            // 特殊预算只统计带有关联特殊标签的账单
            if (!(budget.tagIds ?? []).some((id) => billTags.includes(id))) {
                return;
            }
        } else {
            // 普通预算排除「带特殊标签、且当月存在对应特殊预算」的账单；
            // 没有对应特殊预算时回落计入，避免这笔钱从所有预算里蒸发（ADR-0001）
            const covered = billTags.some(
                (id) => specialTagIds.has(id) && activeSpecialTagIds.has(id),
            );
            if (covered) {
                return;
            }
        }
        totalUsed += bill.amount;
        const found = categoriesUsed?.find((c) =>
            isSameOrChildCategory(c.id, bill.categoryId, allCategories),
        );
        if (found) {
            found.used += bill.amount;
        }
    }, []);
    return {
        totalUsed: amountToNumber(totalUsed),
        categoriesUsed: categoriesUsed?.map((v) => ({
            ...v,
            used: amountToNumber(v.used),
        })),
    };
};

/** 获取预算的达成情况 */
export const budgetReached = (
    budget: EditBudget,
    bills: Bill[],
    currentRange: [Dayjs, Dayjs],
    allCategories: BillCategory[],
) => {
    const encountered = budgetEncountered(
        budget,
        bills,
        currentRange,
        allCategories,
    );
    const total = budgetTotal(budget);
    return [
        ["total", encountered.totalUsed <= total],
        ...(encountered.categoriesUsed?.map(({ id, used }) => [
            id,
            used <=
                (budget.categoriesBudget?.find((c) => c.id === id)?.budget ??
                    0),
        ]) ?? []),
    ] as [string, boolean][];
};
