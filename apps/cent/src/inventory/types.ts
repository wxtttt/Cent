/** 物品清单条目，随账本云同步（entry: inventory） */
export type InventoryItem = {
    id: string;
    /** 记录归属人，语义与账单 creatorId 一致 */
    userId: string | number;
    /** 入库时间（毫秒） */
    time: number;
    name: string;
    /** 实物 / 虚拟（家小满知物页的两类资产） */
    kind: "physical" | "virtual";
    /** 物品分类，取自 GlobalMeta.inventoryCategories 建议列表，也允许自由填写 */
    category?: string;
    quantity: number;
    unit?: string;
    /** 购入价格（元），用于资产总览估算 */
    price?: number;
    /** 过期日期（按日）；无保质期则不填 */
    expiryDate?: number;
    images?: (File | string)[];
    /** 使用人（协作者 id） */
    memberIds?: (string | number)[];
    /** 三态：使用中 / 停用中 / 已处置 */
    status: "in_use" | "idle" | "disposed";
    remark?: string;
};

/** 兼容旧数据的两态取值 */
export type LegacyInventoryStatus = "active" | "archived";

/** 家小满知物内置分类，按实物/虚拟分组（筛选面板与分类选择共用） */
export const INVENTORY_CATEGORY_GROUPS = [
    {
        key: "physical",
        categories: [
            "数码电器",
            "家具家电",
            "美妆个护",
            "服饰鞋包",
            "运动户外",
            "母婴玩具",
            "食品酒水",
            "图书音像",
            "其他实物",
        ],
    },
    {
        key: "virtual",
        categories: [
            "影音娱乐",
            "学习教育",
            "云服务存储",
            "效率工具",
            "其他虚拟",
        ],
    },
] as const;

export const INVENTORY_DEFAULT_CATEGORIES: readonly string[] =
    INVENTORY_CATEGORY_GROUPS.flatMap((group) => group.categories);

export function normalizeInventoryStatus(
    status: string,
): InventoryItem["status"] {
    if (status === "active") return "in_use";
    if (status === "archived") return "idle";
    if (status === "in_use" || status === "idle" || status === "disposed") {
        return status;
    }
    return "in_use";
}
