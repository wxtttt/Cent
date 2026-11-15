/** 能源类型（APK 添加车辆抽屉：燃油 / 纯电 / 混动）；旧数据缺字段按燃油处理 */
export type VehicleEnergyType = "gas" | "electric" | "hybrid";

/** 车辆，随账本云同步（entry: vehicle） */
export type Vehicle = {
    id: string;
    userId: string | number;
    time: number;
    name: string;
    plate?: string;
    energyType?: VehicleEnergyType;
    /** 起始里程，用于只有一笔加油记录时也能算每公里成本 */
    initialOdometer?: number;
    /** 示例数据标记，便于一键清除 */
    sample?: boolean;
};

/** 车辆记录类型。charge 为纯电车充电；旧数据只有 fuel/maintenance/repair/other */
export type VehicleRecordType =
    | "fuel"
    | "charge"
    | "maintenance"
    | "repair"
    | "other";

/** 一条车辆记录（加油/充电/保养/维修/其他），随账本云同步（entry: vehicle） */
export type VehicleRecord = {
    id: string;
    userId: string | number;
    /** 记录日期（毫秒，按日） */
    time: number;
    vehicleId: string;
    type: VehicleRecordType;
    /** 里程表读数（km） */
    odometer?: number;
    /** 花费（元） */
    cost?: number;
    /** 加油量（L）或充电量（kWh），由记录类型决定 */
    volume?: number;
    /** 汽油标号，仅加油记录有效 */
    fuelGrade?: "92" | "95" | "98";
    /** 本次是否加满 / 充满，用于「两次加满之间」的油耗分段 */
    isFull?: boolean;
    remark?: string;
    /** 示例数据标记 */
    sample?: boolean;
};

/** 加油 / 充电这类「补能」记录才参与能耗计算 */
export type EnergyRecordType = "fuel" | "charge";

export const isEnergyRecord = (type: VehicleRecordType): boolean =>
    type === "fuel" || type === "charge";

export const energyUnit = (energyType?: VehicleEnergyType): "L" | "kWh" =>
    energyType === "electric" ? "kWh" : "L";
