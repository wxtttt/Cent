/** 车辆，随账本云同步（entry: vehicle） */
export type Vehicle = {
    id: string;
    userId: string | number;
    time: number;
    name: string;
    plate?: string;
};

/** 车辆记录类型 */
export type VehicleRecordType = "fuel" | "maintenance" | "repair" | "other";

/** 一条车辆记录（加油/保养/维修/其他），随账本云同步（entry: vehicle） */
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
    /** 加油量（升），加油记录才有 */
    volume?: number;
    remark?: string;
};
