import type { Bill, Budget, ExportedJSON, GlobalMeta } from "@/ledger/type";
import type { Vehicle, VehicleRecord } from "@/vehicle/types";

/**
 * 一键载入的完整测试账本。数据按「当前月往前 5 个月」动态生成，
 * 任何时候载入都能看到有账单、有预算、有标签成员以及车辆的当期数据。
 * 五个月分别覆盖：未设置预算 / 有总额无分类预算 / 只有普通预算且有分类预算 /
 * 有分类预算+1 条特殊预算 / 完整多预算（2 条特殊），用于回归预算页的各种边界态。
 * 分类额度刻意不等于普通预算总额，用来验证「分类额度不累加进普通预算，但账单支出照常计入」。
 * 车辆数据覆盖燃油 / 纯电 / 混动三种能源，随 entries.vehicle 一起覆盖写入。
 * 该文件不引入任何运行时依赖，可直接被 Node(strip-types) 执行导出 JSON 备份。
 */
const YUAN = 10000;

type Seed = {
    day: number;
    type: "expense" | "income";
    categoryId: string;
    amount: number;
    comment: string;
    creatorId?: string;
    tagIds?: string[];
};

const monthStart = (y: number, m: number) => new Date(y, m, 1).getTime();
const monthEnd = (y: number, m: number) => new Date(y, m + 1, 1).getTime() - 1;

/** 每月固定发生的一批账单，覆盖收入、一级/二级分类、多名成员与普通标签 */
const regularSeeds: Seed[] = [
    {
        day: 1,
        type: "income",
        categoryId: "salary",
        amount: 12800,
        comment: "工资",
    },
    {
        day: 2,
        type: "expense",
        categoryId: "housing-cost",
        amount: 2800,
        comment: "房租",
        tagIds: ["sample-tag-daily"],
    },
    {
        day: 3,
        type: "expense",
        categoryId: "dining",
        amount: 32,
        comment: "早餐",
    },
    {
        day: 3,
        type: "expense",
        categoryId: "dining",
        amount: 58,
        comment: "午餐",
        creatorId: "1",
    },
    {
        day: 4,
        type: "expense",
        categoryId: "transit",
        amount: 6,
        comment: "地铁",
    },
    {
        day: 5,
        type: "expense",
        categoryId: "fruit",
        amount: 45,
        comment: "水果",
    },
    {
        day: 6,
        type: "expense",
        categoryId: "coffee",
        amount: 28,
        comment: "咖啡",
    },
    {
        day: 7,
        type: "expense",
        categoryId: "daily-necessities",
        amount: 128,
        comment: "日用品",
    },
    {
        day: 8,
        type: "expense",
        categoryId: "snacks",
        amount: 36,
        comment: "零食",
    },
    {
        day: 9,
        type: "expense",
        categoryId: "communication",
        amount: 129,
        comment: "话费",
    },
    {
        day: 10,
        type: "expense",
        categoryId: "leisure",
        amount: 168,
        comment: "周末电影",
        creatorId: "1",
    },
    {
        day: 11,
        type: "expense",
        categoryId: "healthcare",
        amount: 260,
        comment: "体检",
        creatorId: "2",
    },
    {
        day: 12,
        type: "expense",
        categoryId: "reading",
        amount: 89,
        comment: "买书",
    },
    {
        day: 13,
        type: "expense",
        categoryId: "presents",
        amount: 320,
        comment: "随礼",
        tagIds: ["sample-tag-home"],
    },
    {
        day: 15,
        type: "expense",
        categoryId: "apparel",
        amount: 399,
        comment: "换季衣服",
    },
    {
        day: 17,
        type: "expense",
        categoryId: "fuel",
        amount: 300,
        comment: "加油",
    },
    {
        day: 19,
        type: "expense",
        categoryId: "vegetables",
        amount: 76,
        comment: "买菜",
        creatorId: "2",
    },
    {
        day: 21,
        type: "expense",
        categoryId: "sports",
        amount: 199,
        comment: "健身",
    },
    {
        day: 23,
        type: "income",
        categoryId: "parttime",
        amount: 1500,
        comment: "稿费",
        creatorId: "1",
    },
    {
        day: 25,
        type: "expense",
        categoryId: "express",
        amount: 18,
        comment: "快递",
    },
    {
        day: 27,
        type: "income",
        categoryId: "investment",
        amount: 236,
        comment: "基金分红",
    },
];

/** 当前月的两组特殊预算账单（互斥计入特殊预算，不进普通预算） */
const currentSpecialSeeds: Seed[] = [
    {
        day: 8,
        type: "expense",
        categoryId: "trips",
        amount: 980,
        comment: "高铁票",
        tagIds: ["sample-tag-travel"],
    },
    {
        day: 9,
        type: "expense",
        categoryId: "dining",
        amount: 268,
        comment: "旅行晚餐",
        tagIds: ["sample-tag-travel"],
    },
    {
        day: 10,
        type: "expense",
        categoryId: "housing-cost",
        amount: 560,
        comment: "民宿",
        tagIds: ["sample-tag-travel"],
    },
    {
        day: 11,
        type: "expense",
        categoryId: "purchases",
        amount: 320,
        comment: "伴手礼",
        tagIds: ["sample-tag-travel"],
    },
    {
        day: 6,
        type: "expense",
        categoryId: "home-goods",
        amount: 1890,
        comment: "灯具",
        tagIds: ["sample-tag-reno"],
    },
    {
        day: 12,
        type: "expense",
        categoryId: "repairs",
        amount: 1200,
        comment: "水电改造",
        tagIds: ["sample-tag-reno"],
    },
    {
        day: 13,
        type: "expense",
        categoryId: "digital",
        amount: 460,
        comment: "智能开关",
        tagIds: ["sample-tag-reno"],
    },
];

/** 上月的特殊预算账单，让切到历史周期时也有明细可看 */
const prevSpecialSeeds: Seed[] = [
    {
        day: 8,
        type: "expense",
        categoryId: "trips",
        amount: 760,
        comment: "车票",
        tagIds: ["sample-tag-travel"],
    },
    {
        day: 9,
        type: "expense",
        categoryId: "dining",
        amount: 320,
        comment: "当地小吃",
        tagIds: ["sample-tag-travel"],
    },
    {
        day: 10,
        type: "expense",
        categoryId: "housing-cost",
        amount: 480,
        comment: "住宿",
        tagIds: ["sample-tag-travel"],
    },
    {
        day: 11,
        type: "expense",
        categoryId: "purchases",
        amount: 210,
        comment: "纪念品",
        tagIds: ["sample-tag-travel"],
    },
];

const normalCategories = [
    { id: "food", budget: 2000 },
    { id: "transport", budget: 1000 },
    { id: "shopping", budget: 1200 },
    { id: "housing", budget: 2500 },
    { id: "entertainment", budget: 600 },
];

/**
 * 车辆示例数据：燃油 / 纯电 / 混动各一台，覆盖加油、充电、保养、维修，
 * 供「载入示例数据」与账本一起覆盖进 entry: vehicle 桶。
 * 固定 id + sample 标记，重复载入不会产生副本。
 */
type VehicleSeed = {
    vehicleId: string;
    monthsAgo: number;
    day: number;
    type: VehicleRecord["type"];
    odometer: number;
    cost: number;
    volume?: number;
    fuelGrade?: VehicleRecord["fuelGrade"];
    /** 不传视为加满；false 用来演示「油箱还剩很多、只补一点」的未结算分段 */
    isFull?: boolean;
    remark?: string;
};

const VEHICLE_SEEDS: VehicleSeed[] = [
    // 小白（燃油）：每月加满一次，中间穿插保养与维修
    {
        vehicleId: "sample-vehicle-gas",
        monthsAgo: 5,
        day: 8,
        type: "fuel",
        odometer: 31800,
        cost: 312,
        volume: 40.2,
        fuelGrade: "92",
        remark: "中石化",
    },
    {
        vehicleId: "sample-vehicle-gas",
        monthsAgo: 4,
        day: 9,
        type: "fuel",
        odometer: 32420,
        cost: 340,
        volume: 43.7,
        fuelGrade: "92",
    },
    {
        vehicleId: "sample-vehicle-gas",
        monthsAgo: 3,
        day: 7,
        type: "fuel",
        odometer: 33010,
        cost: 320,
        volume: 41.3,
        fuelGrade: "95",
    },
    {
        vehicleId: "sample-vehicle-gas",
        monthsAgo: 3,
        day: 20,
        type: "maintenance",
        odometer: 33120,
        cost: 680,
        remark: "更换机油机滤",
    },
    {
        vehicleId: "sample-vehicle-gas",
        monthsAgo: 2,
        day: 11,
        type: "fuel",
        odometer: 33670,
        cost: 300,
        volume: 38.5,
        fuelGrade: "92",
    },
    {
        vehicleId: "sample-vehicle-gas",
        monthsAgo: 1,
        day: 6,
        type: "fuel",
        odometer: 34240,
        cost: 310,
        volume: 39.9,
        fuelGrade: "92",
    },
    {
        vehicleId: "sample-vehicle-gas",
        monthsAgo: 1,
        day: 22,
        type: "repair",
        odometer: 34310,
        cost: 1280,
        remark: "更换刹车片",
    },
    {
        vehicleId: "sample-vehicle-gas",
        monthsAgo: 0,
        day: 8,
        type: "fuel",
        odometer: 34890,
        cost: 316,
        volume: 40.6,
        fuelGrade: "98",
        remark: "中石油",
    },
    {
        // 第二笔维修，让记录行能显示「距上次维修 X km · Y 天」
        vehicleId: "sample-vehicle-gas",
        monthsAgo: 0,
        day: 10,
        type: "repair",
        odometer: 35020,
        cost: 260,
        remark: "补胎",
    },
    {
        // 油箱还剩大半，只补了一点：这段油量要等下次加满才计入能耗
        vehicleId: "sample-vehicle-gas",
        monthsAgo: 0,
        day: 12,
        type: "fuel",
        odometer: 35120,
        cost: 120,
        volume: 15.0,
        fuelGrade: "92",
        isFull: false,
        remark: "没加满，只补了一点",
    },
    // 小蓝（纯电）：家充每次只补到 80%，从没「充满」——用来演示没有两次满电锚点时的累计量估算
    {
        vehicleId: "sample-vehicle-ev",
        monthsAgo: 5,
        day: 12,
        type: "charge",
        odometer: 10500,
        cost: 58,
        volume: 48.2,
        isFull: false,
        remark: "家充桩",
    },
    {
        vehicleId: "sample-vehicle-ev",
        monthsAgo: 4,
        day: 14,
        type: "charge",
        odometer: 10840,
        cost: 57,
        volume: 47.6,
        isFull: false,
    },
    {
        vehicleId: "sample-vehicle-ev",
        monthsAgo: 3,
        day: 10,
        type: "charge",
        odometer: 11190,
        cost: 59,
        volume: 49.0,
        isFull: false,
        remark: "商场快充",
    },
    {
        vehicleId: "sample-vehicle-ev",
        monthsAgo: 2,
        day: 13,
        type: "charge",
        odometer: 11540,
        cost: 58,
        volume: 48.3,
        isFull: false,
    },
    {
        vehicleId: "sample-vehicle-ev",
        monthsAgo: 2,
        day: 18,
        type: "maintenance",
        odometer: 11550,
        cost: 320,
        remark: "轮胎换位",
    },
    {
        vehicleId: "sample-vehicle-ev",
        monthsAgo: 1,
        day: 9,
        type: "charge",
        odometer: 11880,
        cost: 57,
        volume: 47.6,
        isFull: false,
    },
    {
        vehicleId: "sample-vehicle-ev",
        monthsAgo: 0,
        day: 6,
        type: "charge",
        odometer: 12220,
        cost: 57,
        volume: 47.6,
        isFull: false,
        remark: "家充桩",
    },
    // 小闪（混动）：加油与充电交替，覆盖抽屉里的「加油 / 充电」切换
    {
        vehicleId: "sample-vehicle-hybrid",
        monthsAgo: 2,
        day: 5,
        type: "fuel",
        odometer: 21000,
        cost: 280,
        volume: 36.0,
        fuelGrade: "95",
    },
    {
        vehicleId: "sample-vehicle-hybrid",
        monthsAgo: 1,
        day: 12,
        type: "charge",
        odometer: 21520,
        cost: 46,
        volume: 38.0,
    },
    {
        vehicleId: "sample-vehicle-hybrid",
        monthsAgo: 1,
        day: 25,
        type: "fuel",
        odometer: 22000,
        cost: 262,
        volume: 33.6,
        fuelGrade: "95",
    },
    {
        vehicleId: "sample-vehicle-hybrid",
        monthsAgo: 0,
        day: 5,
        type: "charge",
        odometer: 22460,
        cost: 40,
        volume: 32.0,
    },
];

const sampleTime = (anchor: Date, monthsAgo: number, day: number) => {
    const base = new Date(
        anchor.getFullYear(),
        anchor.getMonth() - monthsAgo,
        1,
    );
    const maxDay =
        monthsAgo === 0
            ? anchor.getDate()
            : new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    return new Date(
        base.getFullYear(),
        base.getMonth(),
        Math.min(day, maxDay),
        10,
        0,
        0,
    ).getTime();
};

const createVehicleSampleEntries = (anchor: Date) => {
    const now = anchor.getTime();
    const vehicles: (Vehicle & { __create_at: number; __update_at: number })[] =
        [
            {
                id: "sample-vehicle-gas",
                userId: "me",
                time: now,
                name: "小白",
                plate: "苏A·8F52",
                energyType: "gas",
                initialOdometer: 31200,
                sample: true,
                __create_at: now,
                __update_at: now,
            },
            {
                id: "sample-vehicle-ev",
                userId: "me",
                time: now,
                name: "小蓝",
                plate: "苏A·D7391",
                energyType: "electric",
                initialOdometer: 9800,
                sample: true,
                __create_at: now,
                __update_at: now,
            },
            {
                id: "sample-vehicle-hybrid",
                userId: "me",
                time: now,
                name: "小闪",
                plate: "苏A·C6666",
                energyType: "hybrid",
                initialOdometer: 20400,
                sample: true,
                __create_at: now,
                __update_at: now,
            },
        ];
    const records: (VehicleRecord & {
        __create_at: number;
        __update_at: number;
    })[] = VEHICLE_SEEDS.map((s, i) => {
        const time = sampleTime(anchor, s.monthsAgo, s.day);
        return {
            id: `sample-vehicle-record-${String(i + 1).padStart(2, "0")}`,
            userId: "me",
            time,
            vehicleId: s.vehicleId,
            type: s.type,
            odometer: s.odometer,
            cost: s.cost,
            volume: s.volume,
            fuelGrade: s.fuelGrade,
            isFull:
                s.type === "fuel" || s.type === "charge"
                    ? (s.isFull ?? true)
                    : undefined,
            remark: s.remark,
            sample: true,
            __create_at: time,
            __update_at: time,
        };
    });
    return [...vehicles, ...records];
};

export const createSampleData = (anchor: Date = new Date()): ExportedJSON => {
    const months = [4, 3, 2, 1, 0].map((back) => {
        const d = new Date(anchor.getFullYear(), anchor.getMonth() - back, 1);
        return { y: d.getFullYear(), m: d.getMonth() };
    });
    const today = anchor.getDate();

    const tags: GlobalMeta["tags"] = [
        { id: "sample-tag-daily", name: "日常", kind: "normal" },
        { id: "sample-tag-home", name: "老家", kind: "normal" },
        { id: "sample-tag-travel", name: "旅行", kind: "special" },
        { id: "sample-tag-reno", name: "装修", kind: "special" },
    ];

    /**
     * 五个月刻意做出五种预算形态，覆盖用户需要手动测试的边界：
     * ① 完全没设置预算（totalBudget=0 且无分类额度，但仍有账单）
     * ② 只设了月度总额、没设置任何分类预算
     * ③ 只有普通预算 + 有分类预算（无特殊预算）→ 卡片展开直接是分类预算
     * ④ 有分类预算 + 1 条特殊预算 → 卡片展开是多种预算
     * ⑤ 当前月：完整多预算 + 2 条特殊预算
     * 各月总额与分类额度刻意不同（例如 9 月总额 3,800 / 分类合计 4,200），
     * 用来验证分类额度不累加进普通预算；账单支出仍照常计入已支出。
     * 同时参与者不同，验证「预算范围」确实读所选周期的记录。
     */
    const monthlyPlan = [
        { total: 0, categoryCount: 0, joiners: [] },
        { total: 4200, categoryCount: 0, joiners: ["0", "1"] },
        { total: 3800, categoryCount: 3, joiners: [] },
        { total: 4500, categoryCount: 4, joiners: ["0"] },
        { total: 5000, categoryCount: 5, joiners: [] },
    ];
    const budgets: Budget[] = months.map(({ y, m }, i) => {
        const plan = monthlyPlan[i];
        return {
            id: `sample-normal-${i}`,
            kind: "normal",
            title: "普通预算",
            periodStart: monthStart(y, m),
            periodEnd: monthEnd(y, m),
            joiners: [...plan.joiners],
            totalBudget: plan.total,
            categoriesBudget: normalCategories
                .slice(0, plan.categoryCount)
                .map((c) => ({ ...c })),
        };
    });

    const cur = months[months.length - 1];
    const prev = months[months.length - 2];
    const curStart = monthStart(cur.y, cur.m);
    const curEnd = monthEnd(cur.y, cur.m);
    const prevStart = monthStart(prev.y, prev.m);
    const prevEnd = monthEnd(prev.y, prev.m);

    budgets.push({
        id: "sample-special-travel",
        kind: "special",
        title: "周末旅行",
        periodStart: curStart,
        periodEnd: curEnd,
        joiners: ["0", "1"],
        totalBudget: 3000,
        tagIds: ["sample-tag-travel"],
        repeatMonthly: false,
        categoriesBudget: [
            { id: "transport", budget: 1200 },
            { id: "food", budget: 600 },
            { id: "shopping", budget: 600 },
            { id: "housing", budget: 600 },
        ],
    });
    budgets.push({
        id: "sample-special-reno",
        kind: "special",
        title: "老家装修",
        periodStart: curStart,
        periodEnd: curEnd,
        joiners: [],
        totalBudget: 6000,
        tagIds: ["sample-tag-reno"],
        repeatMonthly: false,
        categoriesBudget: [
            { id: "housing", budget: 3000 },
            { id: "shopping", budget: 2000 },
        ],
    });
    budgets.push({
        id: "sample-special-autumn",
        kind: "special",
        title: "秋日出游",
        periodStart: prevStart,
        periodEnd: prevEnd,
        joiners: [],
        totalBudget: 2500,
        tagIds: ["sample-tag-travel"],
        repeatMonthly: false,
        categoriesBudget: [
            { id: "transport", budget: 1000 },
            { id: "food", budget: 800 },
            { id: "shopping", budget: 500 },
        ],
    });

    const items: ExportedJSON["items"] = [];
    let seq = 0;
    const push = (monthIndex: number, seed: Seed, tag: string) => {
        const { y, m } = months[monthIndex];
        // 当前月不生成未来账单：超出今天的一律压到今天
        const day =
            monthIndex === months.length - 1
                ? Math.max(1, Math.min(seed.day, today))
                : seed.day;
        const time = new Date(
            y,
            m,
            day,
            9 + (seq % 10),
            (seq * 7) % 60,
        ).getTime();
        const bill: Bill & { __create_at: number; __update_at: number } = {
            id: `sample-${tag}-${seq++}`,
            type: seed.type,
            categoryId: seed.categoryId,
            creatorId: seed.creatorId ?? "0",
            amount: Math.round(seed.amount * YUAN),
            time,
            comment: seed.comment,
            __create_at: time,
            __update_at: time,
        };
        if (seed.tagIds?.length) {
            bill.tagIds = seed.tagIds;
        }
        items.push(bill);
    };

    months.forEach((_, i) => {
        for (const seed of regularSeeds) push(i, seed, "regular");
    });
    for (const seed of currentSpecialSeeds) {
        push(months.length - 1, seed, "special");
    }
    for (const seed of prevSpecialSeeds) {
        push(months.length - 2, seed, "prev-special");
    }

    const meta: GlobalMeta = {
        tags,
        members: [
            { id: "0", name: "我", active: true },
            { id: "1", name: "小林", active: true },
            { id: "2", name: "妈妈", active: true },
            { id: "3", name: "已停用成员", active: false },
        ],
        budgets,
        budgetStartDay: 1,
        baseCurrency: "CNY",
    };

    return {
        items,
        meta,
        entries: { vehicle: createVehicleSampleEntries(anchor) },
    };
};
