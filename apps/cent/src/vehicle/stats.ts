import dayjs from "dayjs";
import type { Vehicle, VehicleRecord } from "./types";
import { isEnergyRecord } from "./types";

export type VehicleStats = {
    /** 本月花费 */
    monthCost: number;
    /** 累计花费 */
    totalCost: number;
    /** 补能花费（不含保养维修） */
    energyCost: number;
    /** 平均能耗：L/100km 或 kWh/100km；不足两次加满记录时 undefined */
    avgConsumption?: number;
    /** 最近一次能耗 */
    lastConsumption?: number;
    /** 补能均价（元/L 或 元/kWh） */
    avgPrice?: number;
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
const avg = (values: number[]) =>
    values.length > 0 ? sum(values) / values.length : undefined;

/**
 * 加满法算平均能耗：两次「加满」之间加进去的油量 ÷ 这段里程 × 100。
 * 没加满的记录只累加油量、不做切点；旧数据没有 isFull 标记时一律视为加满。
 */
function consumptionOf(records: VehicleRecord[]): number[] {
    const energy = records
        .filter(
            (r) =>
                isEnergyRecord(r.type) &&
                r.odometer !== undefined &&
                r.volume !== undefined &&
                r.volume > 0,
        )
        .sort(
            (a, b) => a.time - b.time || (a.odometer ?? 0) - (b.odometer ?? 0),
        );
    const out: number[] = [];
    let pendingVolume = 0;
    let start: VehicleRecord | undefined;
    for (const r of energy) {
        const volume = (r.volume ?? 0) + pendingVolume;
        if (r.isFull === false) {
            pendingVolume = volume;
            continue;
        }
        pendingVolume = 0;
        if (start && r.odometer !== undefined && start.odometer !== undefined) {
            const distance = r.odometer - start.odometer;
            if (distance > 0 && volume > 0) {
                out.push((volume / distance) * 100);
            }
        }
        start = r;
    }
    return out;
}

/** 把补能记录按加油 / 充电分开算，混动车主卡油电双栏用 */
function splitConsumption(records: VehicleRecord[]) {
    const gas = consumptionOf(records.filter((r) => r.type === "fuel"));
    const electric = consumptionOf(records.filter((r) => r.type === "charge"));
    return {
        gas: avg(gas),
        electric: avg(electric),
        last: [...gas, ...electric].at(-1),
    };
}

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
    const totalVolume = sum(energyRecords.map((r) => r.volume ?? 0));

    const { gas, electric, last } = splitConsumption(scoped);

    // 有对应能源的车才显示对应能耗：没有油车不显示平均油耗，没有电车不显示平均电耗
    const hasGasVehicle =
        scopedVehicles.some((v) => v.energyType !== "electric") ||
        scoped.some((r) => r.type === "fuel");
    const hasElectricVehicle =
        scopedVehicles.some((v) => v.energyType !== "gas") ||
        scoped.some((r) => r.type === "charge");

    /**
     * 加满 / 充满是分段锚点：起点和终点油箱（电池）都是满的，剩余量互相抵消，
     * 所以「两次加满之间加进去的量」就等于这段里程真正消耗掉的量。
     * 未加满的记录只累加、不做切点（见 consumptionOf）。
     */
    const anchorOf = (typ: "fuel" | "charge") => {
        const full = scoped
            .filter(
                (r) =>
                    r.type === typ &&
                    r.isFull !== false &&
                    r.odometer !== undefined,
            )
            .sort((a, b) => b.time - a.time);
        // 最近一段的起点是倒数第二笔加满；只有一笔时它就是起点
        const anchor = full[1] ?? full[0];
        return anchor?.odometer === undefined
            ? undefined
            : { time: anchor.time, odometer: anchor.odometer };
    };

    const unit =
        scopedVehicles.length > 0 &&
        scopedVehicles.every((v) => v.energyType === "electric") &&
        gas === undefined
            ? "kWh"
            : "L";
    const avgConsumption = unit === "kWh" ? electric : (gas ?? electric);

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
        lastConsumption: last,
        avgPrice: totalVolume > 0 ? energyCost / totalVolume : undefined,
        gasConsumption: gas,
        electricConsumption: electric,
        hasGasVehicle,
        hasElectricVehicle,
        lastFuelAnchor: anchorOf("fuel"),
        lastChargeAnchor: anchorOf("charge"),
        costPerKm,
        currentOdometer,
        distance,
        unit,
        monthly,
        recordCount: scoped.length,
    };
}

export type TripInfo = {
    /** 上一条同车记录 */
    prev?: VehicleRecord;
    /** 与上一次的里程差，负数表示里程倒挂 */
    distance?: number;
    inverted: boolean;
};

/**
 * 找同车里「上一条」记录并算里程差。抽屉新增记录时 current 传草稿值，
 * 编辑 / 列表展示时传记录本身（用 id 排除自己）。
 */
export function tripInfo(
    records: VehicleRecord[],
    current: {
        id?: string;
        vehicleId: string;
        time: number;
        odometer?: number;
    },
): TripInfo {
    const prev = records
        .filter(
            (r) =>
                r.vehicleId === current.vehicleId &&
                r.id !== current.id &&
                r.odometer !== undefined &&
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
