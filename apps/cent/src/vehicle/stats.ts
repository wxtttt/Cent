import dayjs from "dayjs";
import type { Vehicle, VehicleRecord, VehicleRecordType } from "./types";
import { isEnergyRecord } from "./types";

export type VehicleStats = {
    /** 本月花费 */
    monthCost: number;
    /** 累计花费 */
    totalCost: number;
    /** 补能花费（不含保养维修） */
    energyCost: number;
    /** 平均能耗：L/100km 或 kWh/100km；凑不齐两次加满时退回累计量估算 */
    avgConsumption?: number;
    /** 最近一次能耗（只取精确分段，估算段是长期平均，不算单次） */
    lastConsumption?: number;
    /** 按能耗单位选的补能均价（元/L 或 元/kWh） */
    avgPrice?: number;
    /** 燃油均价（元/L），油电分开算，不能把 L 与 kWh 相加 */
    avgPriceGas?: number;
    /** 充电均价（元/kWh） */
    avgPriceElectric?: number;
    /** 混动车 / 全部：燃油段平均油耗 */
    gasConsumption?: number;
    /** 混动车 / 全部：纯电段平均电耗 */
    electricConsumption?: number;
    /** 筛选范围内有能加油的车（燃油 / 混动）或加油记录 */
    hasGasVehicle: boolean;
    /** 筛选范围内有能充电的车（纯电 / 混动）或充电记录 */
    hasElectricVehicle: boolean;
    /** 当前加油分段的起点：最近一次「加满」记录 */
    lastFuelAnchor?: { time: number; odometer: number };
    /** 当前充电分段的起点：最近一次「充满」记录 */
    lastChargeAnchor?: { time: number; odometer: number };
    /** 还没等到终点加满、也没进估算段的油量 / 电量，下次加满后才会计入能耗 */
    pendingGasVolume: number;
    pendingElectricVolume: number;
    /** 平均油耗 / 电耗里含「累计加注量 ÷ 累计里程」的估算段 */
    gasEstimated: boolean;
    electricEstimated: boolean;
    /** 每公里花费（元/km） */
    costPerKm?: number;
    /** 当前里程 */
    currentOdometer?: number;
    /** 统计区间里程差 */
    distance?: number;
    /** 能耗单位 */
    unit: "L" | "kWh";
    /** 近 6 个月花费 */
    monthly: { key: string; label: string; cost: number }[];
    recordCount: number;
};

const sum = (list: number[]) => list.reduce((s, n) => s + n, 0);

type Segment = {
    vehicleId: string;
    type: "fuel" | "charge";
    /** 这一段加进去的总量（含中途未加满的累加） */
    volume: number;
    /** 这段对应的里程 */
    distance: number;
    /** 分段终点时间 */
    time: number;
    /** 分段起点（上一次加满，或估算段的首条记录） */
    startTime: number;
    startOdometer: number;
    /** 没有两次加满锚点时，用「累计加注量 ÷ 累计里程」估出来的段 */
    estimated?: boolean;
};

/**
 * 加满法：两次「加满」之间加进去的量 ÷ 这段里程 × 100。
 * 起点和终点油箱（电池）都是满的，剩余量互相抵消，所以剩余油量多少本身不影响结果。
 *
 * 必须按车分别切段：不同车的里程表不连续，混在一起会把 A 车的里程算到 B 车的油量上。
 * 未加满的记录只累加、不做切点；若一直没等到下一次加满，这部分量进入 pending。
 *
 * 估算兜底：某台车**一次精确段都没凑出来**（从没连续两次加满）但有 ≥2 条记录时，
 * 用「第 2 条起累计加注量 ÷ 首末里程差」造一个估算段。第一条的量要排除——它补的是
 * 首条里程之前消耗的量，没有对应起点。起止液位差在长期平均里会被摊薄，短期会有偏差，
 * 所以段上打 `estimated` 标记，UI 用 ≈ 区分；估算已包含 pending 的量，不再重复挂起。
 */
function consumptionSegments(
    records: VehicleRecord[],
    typ: "fuel" | "charge",
): { segments: Segment[]; pending: number; estimated: boolean } {
    const byVehicle = new Map<string, VehicleRecord[]>();
    for (const r of records) {
        if (
            r.type !== typ ||
            r.odometer === undefined ||
            r.volume === undefined ||
            r.volume <= 0
        ) {
            continue;
        }
        const list = byVehicle.get(r.vehicleId) ?? [];
        list.push(r);
        byVehicle.set(r.vehicleId, list);
    }

    const segments: Segment[] = [];
    let pending = 0;
    let estimated = false;
    for (const [vehicleId, list] of byVehicle) {
        list.sort(
            (a, b) => a.time - b.time || (a.odometer ?? 0) - (b.odometer ?? 0),
        );
        let start: VehicleRecord | undefined;
        let acc = 0;
        const carSegments: Segment[] = [];
        for (const r of list) {
            acc += r.volume ?? 0;
            // 没加满：油量留到下一段，但里程不从这里重新起算
            if (r.isFull === false) continue;
            if (
                start &&
                r.odometer !== undefined &&
                start.odometer !== undefined
            ) {
                const distance = r.odometer - start.odometer;
                if (distance > 0) {
                    carSegments.push({
                        vehicleId,
                        type: typ,
                        volume: acc,
                        distance,
                        time: r.time,
                        startTime: start.time,
                        startOdometer: start.odometer,
                    });
                }
            }
            start = r;
            acc = 0;
        }

        if (carSegments.length === 0 && list.length >= 2) {
            const first = list[0];
            const last = list[list.length - 1];
            const distance = (last.odometer ?? 0) - (first.odometer ?? 0);
            const volume = sum(list.slice(1).map((r) => r.volume ?? 0));
            if (distance > 0 && volume > 0) {
                carSegments.push({
                    vehicleId,
                    type: typ,
                    volume,
                    distance,
                    time: last.time,
                    startTime: first.time,
                    startOdometer: first.odometer ?? 0,
                    estimated: true,
                });
                estimated = true;
            }
        }

        // 估算段已吃掉 acc，不能再挂到 pending，否则同一笔量会被提示成「还没计入」
        if (!carSegments.some((s) => s.estimated)) pending += acc;
        segments.push(...carSegments);
    }
    return { segments, pending, estimated };
}

/** 用总量 / 总里程算加权平均，短里程段不会被赋予过高权重 */
const weighted = (segments: Segment[]) =>
    segments.length > 0
        ? (sum(segments.map((s) => s.volume)) /
              sum(segments.map((s) => s.distance))) *
          100
        : undefined;

/** 页面统计：按当前筛选（全部 / 某辆车）聚合 */
export function computeVehicleStats(
    vehicles: Vehicle[],
    records: VehicleRecord[],
    vehicleFilter: string,
    now = Date.now(),
): VehicleStats {
    const scoped =
        vehicleFilter === "__all"
            ? records
            : records.filter((r) => r.vehicleId === vehicleFilter);
    const scopedVehicles =
        vehicleFilter === "__all"
            ? vehicles
            : vehicles.filter((v) => v.id === vehicleFilter);

    const monthStart = dayjs(now).startOf("month").valueOf();
    const monthCost = sum(
        scoped.filter((r) => r.time >= monthStart).map((r) => r.cost ?? 0),
    );
    const totalCost = sum(scoped.map((r) => r.cost ?? 0));
    const energyRecords = scoped.filter((r) => isEnergyRecord(r.type));
    const energyCost = sum(energyRecords.map((r) => r.cost ?? 0));

    const gas = consumptionSegments(scoped, "fuel");
    const electric = consumptionSegments(scoped, "charge");
    const gasConsumption = weighted(gas.segments);
    const electricConsumption = weighted(electric.segments);
    // unit 只看「精确」油耗：估算出来的 fuel 段不该把纯电车切回 L
    const exactGas = weighted(gas.segments.filter((s) => !s.estimated));
    const unit =
        scopedVehicles.length > 0 &&
        scopedVehicles.every((v) => v.energyType === "electric") &&
        exactGas === undefined
            ? "kWh"
            : "L";

    // 「最近一次」只取与主卡同单位的精确段；全是估算时留空，
    // 否则会拿上一次加满的旧值冒充新记录的结果
    const primarySegments =
        unit === "kWh"
            ? electric.segments
            : gas.segments.length > 0
              ? gas.segments
              : electric.segments;
    const newest = primarySegments
        .filter((s) => !s.estimated)
        .sort((a, b) => a.time - b.time)
        .at(-1);
    const lastConsumption = newest
        ? (newest.volume / newest.distance) * 100
        : undefined;

    // 有对应能源的车才显示对应能耗：没有油车不显示平均油耗，没有电车不显示平均电耗
    const hasGasVehicle =
        scopedVehicles.some((v) => v.energyType !== "electric") ||
        scoped.some((r) => r.type === "fuel");
    const hasElectricVehicle =
        scopedVehicles.some((v) => v.energyType !== "gas") ||
        scoped.some((r) => r.type === "charge");

    /** 最近一段的起点就是「上次加满 / 充满」锚点；估算段没有加满锚点 */
    const anchorOf = (segments: Segment[]) => {
        const latest = segments
            .filter((s) => !s.estimated)
            .sort((a, b) => b.time - a.time)[0];
        return latest
            ? { time: latest.startTime, odometer: latest.startOdometer }
            : undefined;
    };

    const avgConsumption =
        unit === "kWh"
            ? electricConsumption
            : (gasConsumption ?? electricConsumption);

    // 油 / 电单价必须分开：L 和 kWh 不是同一个单位，混加会得出无意义的均价
    const priceOf = (typ: "fuel" | "charge") => {
        const list = energyRecords.filter((r) => r.type === typ);
        const volume = sum(list.map((r) => r.volume ?? 0));
        return volume > 0
            ? sum(list.map((r) => r.cost ?? 0)) / volume
            : undefined;
    };
    const avgPriceGas = priceOf("fuel");
    const avgPriceElectric = priceOf("charge");
    const avgPrice =
        unit === "kWh" ? avgPriceElectric : (avgPriceGas ?? avgPriceElectric);

    const odometers = scoped
        .map((r) => r.odometer)
        .filter((n): n is number => typeof n === "number" && n > 0);
    const currentOdometer =
        odometers.length > 0 ? Math.max(...odometers) : undefined;
    const initialMin = Math.min(
        ...scopedVehicles.map((v) => v.initialOdometer ?? Infinity),
    );
    const minOdometer =
        odometers.length > 0 ? Math.min(...odometers, initialMin) : undefined;
    const distance =
        currentOdometer !== undefined &&
        minOdometer !== undefined &&
        Number.isFinite(minOdometer)
            ? Math.max(0, currentOdometer - minOdometer)
            : undefined;
    const costPerKm =
        distance && distance > 0 ? totalCost / distance : undefined;

    const monthly = Array.from({ length: 6 }, (_, i) => {
        const m = dayjs(now).subtract(5 - i, "month");
        const start = m.startOf("month").valueOf();
        const end = m.endOf("month").valueOf();
        return {
            key: m.format("YYYY-MM"),
            label: `${m.month() + 1}月`,
            cost: sum(
                scoped
                    .filter((r) => r.time >= start && r.time <= end)
                    .map((r) => r.cost ?? 0),
            ),
        };
    });

    return {
        monthCost,
        totalCost,
        energyCost,
        avgConsumption,
        lastConsumption,
        avgPrice,
        avgPriceGas,
        avgPriceElectric,
        gasConsumption,
        electricConsumption,
        hasGasVehicle,
        hasElectricVehicle,
        lastFuelAnchor: anchorOf(gas.segments),
        lastChargeAnchor: anchorOf(electric.segments),
        pendingGasVolume: gas.pending,
        pendingElectricVolume: electric.pending,
        gasEstimated: gas.estimated,
        electricEstimated: electric.estimated,
        costPerKm,
        currentOdometer,
        distance,
        unit,
        monthly,
        recordCount: scoped.length,
    };
}

export type TripInfo = {
    /** 上一条（可用 type 限定为同类型）记录 */
    prev?: VehicleRecord;
    /** 与上一次的里程差，负数表示里程倒挂 */
    distance?: number;
    /** 与上一次相隔的天数 */
    days?: number;
    inverted: boolean;
};

/**
 * 找同车里「上一条」记录并算里程差 / 天数。
 * 传 type 时只找同类型（记录列表的「距上次维修 X km，Y 天」用这个）。
 * 抽屉新增记录时 current 传草稿值，编辑 / 列表展示时传记录本身（用 id 排除自己）。
 */
export function tripInfo(
    records: VehicleRecord[],
    current: {
        id?: string;
        vehicleId: string;
        time: number;
        odometer?: number;
    },
    type?: VehicleRecordType,
): TripInfo {
    const prev = records
        .filter(
            (r) =>
                r.vehicleId === current.vehicleId &&
                r.id !== current.id &&
                r.odometer !== undefined &&
                (type === undefined || r.type === type) &&
                (r.time < current.time ||
                    (r.time === current.time &&
                        (r.odometer ?? 0) < (current.odometer ?? 0))),
        )
        .sort(
            (a, b) => b.time - a.time || (b.odometer ?? 0) - (a.odometer ?? 0),
        )[0];
    if (!prev) return { inverted: false };
    const distance =
        current.odometer === undefined
            ? undefined
            : current.odometer - (prev.odometer ?? 0);
    return {
        prev,
        distance,
        days: Math.max(0, Math.floor((current.time - prev.time) / 86400000)),
        inverted: distance !== undefined && distance < 0,
    };
}

/** 记录列表按月份倒序分组 */
export function groupRecordsByMonth(
    records: VehicleRecord[],
): { key: string; label: string; records: VehicleRecord[] }[] {
    const map = new Map<
        string,
        { key: string; label: string; records: VehicleRecord[] }
    >();
    for (const r of [...records].sort((a, b) => b.time - a.time)) {
        const d = dayjs(r.time);
        const key = d.format("YYYY-MM");
        const group = map.get(key) ?? {
            key,
            label: `${d.year()}年${d.month() + 1}月`,
            records: [],
        };
        group.records.push(r);
        map.set(key, group);
    }
    return [...map.values()];
}
