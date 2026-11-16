import type { LoanType } from "./model";

/** 类型图标 key（APK raw assets 提取，public/loan/<key>.webp） */
const TYPE_ICON_KEYS: Record<LoanType, string> = {
    commercial: "bank",
    fund: "piggy",
    combo: "combo",
};

export const LOAN_TYPE_ICONS: Record<LoanType, string> = {
    commercial: "/loan/bank.webp",
    fund: "/loan/piggy.webp",
    combo: "/loan/combo.webp",
};

/** 方案可选装饰图标 */
export const LOAN_PLAN_ICONS = [
    "house",
    "building",
    "bed",
    "sofa",
    "star",
    "sun",
    "tree",
    "flower",
    "clock",
] as const;

export function planIconSrc(icon: string | undefined, type?: LoanType): string {
    const key = icon ?? TYPE_ICON_KEYS[type ?? "commercial"];
    return `/loan/${key}.webp`;
}
