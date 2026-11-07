// 自动记账规则匹配：按数组顺序取第一条命中的规则。
// 匹配输入是"备注 + 收支方向"这两个导入/手记都有的信息。
import type { AutoRule } from "./extra-type";
import type { BillType } from "./type";

export type AutoRuleDraft = {
    comment?: string;
    type?: BillType;
    categoryId?: string;
};

/** 返回第一条命中的规则；无命中返回 undefined */
export function matchAutoRule(
    draft: AutoRuleDraft,
    rules: AutoRule[],
): AutoRule | undefined {
    const comment = draft.comment?.trim().toLowerCase();
    if (!comment) return undefined;
    return rules.find((rule) => {
        if (!rule.enabled) return false;
        const keyword = rule.keyword.trim().toLowerCase();
        if (!keyword) return false;
        if (rule.type && rule.type !== draft.type) return false;
        return comment.includes(keyword);
    });
}

/**
 * 对草稿应用自动规则。
 * onlyIfMissing（默认）只补缺失的分类，适合导入场景，不覆盖导入文件已识别的分类；
 * 传 false 时命中即覆盖。
 */
export function applyAutoRules<T extends AutoRuleDraft>(
    draft: T,
    rules: AutoRule[],
    onlyIfMissing = true,
): T {
    const rule = matchAutoRule(draft, rules);
    if (!rule?.categoryId) return draft;
    if (onlyIfMissing && draft.categoryId) return draft;
    return { ...draft, categoryId: rule.categoryId };
}
