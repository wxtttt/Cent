import dayjs from "dayjs";
import { useRef, useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { createDeleteConfirm } from "@/components/delete-confirm";
import {
    FormCard,
    FormRow,
    RowChevron,
    RowInput,
} from "@/components/form-rows";
import PopupLayout from "@/layouts/popup-layout";
import { intl, useIntl } from "@/locale";
import { cn } from "@/utils";
import { useScrollableX } from "@/utils/viewport";
import { tripInfo } from "@/vehicle/stats";
import type {
    Vehicle,
    VehicleEnergyType,
    VehicleRecord,
    VehicleRecordType,
} from "@/vehicle/types";
import { isEnergyRecord } from "@/vehicle/types";

export type VehicleValue = Omit<Vehicle, "id" | "userId" | "time" | "sample">;

const ENERGY_TYPES = [
    { value: "gas", label: "vehicle-energy-gas" },
    { value: "electric", label: "vehicle-energy-electric" },
    { value: "hybrid", label: "vehicle-energy-hybrid" },
] as const;

/**
 * APK「添加车辆」抽屉：拖拽条 + 居中标题、无返回 / 无右上确认，
 * 一张白卡四行（名称 / 车牌号 / 能源类型 / 起始里程），底部全宽橙色胶囊「保存」。
 */
export type VehicleFormEdit = {
    vehicle?: Vehicle;
    /** 由页面注入：确认后删除这台车及其记录 */
    onDelete?: () => void;
};

export function VehicleForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit?: VehicleFormEdit;
    onCancel?: () => void;
    onConfirm?: (v: VehicleValue) => void;
}) {
    const t = useIntl();
    const vehicle = edit?.vehicle;
    const [name, setName] = useState(vehicle?.name ?? "");
    const [plate, setPlate] = useState(vehicle?.plate ?? "");
    const [energyType, setEnergyType] = useState<VehicleEnergyType>(
        vehicle?.energyType ?? "gas",
    );
    const [initialText, setInitialText] = useState(
        vehicle?.initialOdometer === undefined
            ? ""
            : String(vehicle.initialOdometer),
    );

    const valid = name.trim().length > 0;
    const initialOdometer = Number(initialText) || undefined;

    const submit = () => {
        if (!valid) return;
        onConfirm?.({
            name: name.trim(),
            plate: plate.trim() || undefined,
            energyType,
            initialOdometer,
        });
    };

    const remove = async () => {
        const ok = await showVehicleFormDelete({
            title: t("vehicle-delete-title"),
            description: t("vehicle-delete-vehicle-confirm", {
                name: vehicle?.name ?? "",
            }),
            onDelete: edit?.onDelete,
        }).catch(() => false);
        if (ok) onCancel?.();
    };

    return (
        <PopupLayout
            title={
                <span className="text-[18px] font-semibold text-ink">
                    {vehicle ? t("vehicle-edit") : t("vehicle-add")}
                </span>
            }
            hideBack
            handle
        >
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-2 pt-1">
                <FormCard>
                    <FormRow label={t("vehicle-name-short")}>
                        <RowInput
                            value={name}
                            placeholder={t("vehicle-name-placeholder")}
                            onChange={setName}
                        />
                    </FormRow>
                    <FormRow label={t("vehicle-plate-short")}>
                        <RowInput
                            value={plate}
                            placeholder={t("vehicle-plate-placeholder")}
                            onChange={setPlate}
                        />
                    </FormRow>
                    <FormRow label={t("vehicle-energy-type")}>
                        <div className="flex items-center gap-0.5 rounded-full bg-ground-muted/70 p-0.5">
                            {ENERGY_TYPES.map(({ value, label }) => (
                                <button
                                    key={value}
                                    type="button"
                                    aria-label={t(label)}
                                    className={cn(
                                        "cursor-pointer rounded-full px-3 py-[3px] text-[13px] font-medium transition-all",
                                        energyType === value
                                            ? "bg-panel font-medium text-ink shadow-panel"
                                            : "text-ink/65",
                                    )}
                                    onClick={() => setEnergyType(value)}
                                >
                                    {t(label)}
                                </button>
                            ))}
                        </div>
                    </FormRow>
                    <FormRow label={t("vehicle-initial-odometer")}>
                        <RowInput
                            value={initialText}
                            inputMode="decimal"
                            placeholder={t("vehicle-optional")}
                            onChange={setInitialText}
                        />
                    </FormRow>
                </FormCard>
                <p className="px-1 text-[12px] leading-snug text-ink-secondary/80">
                    {t("vehicle-energy-hint")}
                </p>
            </div>
            <div className="flex-shrink-0 px-4 pb-[max(16px,var(--safe-area-inset-bottom))] pt-2">
                <button
                    type="button"
                    disabled={!valid}
                    onClick={submit}
                    className="h-12 w-full cursor-pointer rounded-full bg-brand text-[16px] font-medium text-on-brand shadow-[0_6px_16px_rgba(245,130,32,0.28)] transition-opacity disabled:cursor-not-allowed disabled:bg-ground-muted disabled:text-ink-secondary/70 disabled:shadow-none"
                >
                    {t("vehicle-save")}
                </button>
                {vehicle && edit?.onDelete && (
                    <button
                        type="button"
                        onClick={() => void remove()}
                        className="mt-2 h-10 w-full cursor-pointer text-[14px] font-medium text-red-500"
                    >
                        {t("vehicle-delete-vehicle")}
                    </button>
                )}
            </div>
            <VehicleFormDeleteProvider />
        </PopupLayout>
    );
}

export type VehicleRecordValue = Omit<
    VehicleRecord,
    "id" | "userId" | "sample"
>;

const ALL_TYPES: { value: VehicleRecordType; label: string }[] = [
    { value: "fuel", label: "vehicle-type-fuel" },
    { value: "charge", label: "vehicle-type-charge" },
    { value: "maintenance", label: "vehicle-type-maintenance" },
    { value: "repair", label: "vehicle-type-repair" },
    { value: "other", label: "vehicle-type-other" },
];

const FUEL_GRADES = ["92", "95", "98"] as const;

/** 两个编辑抽屉各自挂一份删除二次确认，与「删除特殊预算」同款白卡 */
const [VehicleFormDeleteProvider, showVehicleFormDelete] =
    createDeleteConfirm();
const [RecordFormDeleteProvider, showRecordFormDelete] = createDeleteConfirm();

/**
 * 顶部 tab 固定五项（加油 / 充电都在）。选中哪个 tab，车辆行就只列能加
 * 该能源的车：加油里是燃油 + 混动，充电里是纯电 + 混动；保养 / 维修 / 其他列全部车。
 */
const canFuel = (v: Vehicle) => v.energyType !== "electric";
const canCharge = (v: Vehicle) => v.energyType !== "gas";
const vehiclesFor = (type: VehicleRecordType, vehicles: Vehicle[]) =>
    type === "fuel"
        ? vehicles.filter(canFuel)
        : type === "charge"
          ? vehicles.filter(canCharge)
          : vehicles;

/** 完全没有历史补能记录时的兜底类型 */
const defaultType = (energyType?: VehicleEnergyType): VehicleRecordType =>
    energyType === "electric" ? "charge" : "fuel";

/** 右对齐数字输入 + 后置灰色单位 */
function Field({
    value,
    onChange,
    placeholder,
    unit,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    unit?: string;
}) {
    return (
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
            <input
                value={value}
                inputMode="decimal"
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                className="w-full min-w-0 cursor-text bg-transparent text-right text-[15px] tabular-nums text-ink outline-none placeholder:text-ink-secondary/60"
            />
            {unit && (
                <span className="flex-shrink-0 text-[13px] text-ink-secondary/70">
                    {unit}
                </span>
            )}
        </div>
    );
}

/** APK 绿色开关 */
function Toggle({
    value,
    onChange,
    label,
}: {
    value: boolean;
    onChange: (v: boolean) => void;
    label: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-label={label}
            aria-checked={value}
            onClick={() => onChange(!value)}
            className={cn(
                "relative h-[26px] w-[46px] flex-shrink-0 cursor-pointer rounded-full transition-colors",
                value ? "bg-[#34c759]" : "bg-rule",
            )}
        >
            <span
                className={cn(
                    "absolute top-[3px] size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-all",
                    value ? "left-[23px]" : "left-[3px]",
                )}
            />
        </button>
    );
}

/**
 * APK「记一笔」抽屉：居中标题 + 类型段控（按车能源类型过滤）+ 两张白卡。
 * 第一张：日期 / 里程表读数 / 本次行驶 / 金额 / 加注量 + 单价 / 油号 / 备注；
 * 第二张：加满了（充满了）。底部全宽橙色胶囊「保存」。
 */
export function VehicleRecordForm({
    edit,
    onCancel,
    onConfirm,
}: {
    /** vehicles 为车辆列表，records 用于算「本次行驶」，defaultVehicleId 为页面当前筛选的车 */
    edit?: {
        vehicles: Vehicle[];
        records?: VehicleRecord[];
        record?: VehicleRecord;
        defaultVehicleId?: string;
        /** 由页面注入：确认后删除这条记录 */
        onDelete?: () => void;
    };
    onCancel?: () => void;
    onConfirm?: (v: VehicleRecordValue) => void;
}) {
    const t = useIntl();
    const record = edit?.record;
    const vehicles = edit?.vehicles ?? [];
    const allRecords = edit?.records ?? [];
    /** 同类型上一次记录：带出油号 / 车辆这些每次都一样的「有价值的选项」；加满状态不继承 */
    const lastOf = (typ: VehicleRecordType) =>
        [...allRecords]
            .filter((r) => r.type === typ && r.id !== record?.id)
            .sort((a, b) => b.time - a.time)[0];
    const lastFuel = lastOf("fuel");
    const lastCharge = lastOf("charge");
    // 新增时默认沿用上一次记的是加油还是充电；保养 / 维修不参与默认
    const lastEnergy = !lastFuel
        ? lastCharge
        : !lastCharge
          ? lastFuel
          : lastFuel.time >= lastCharge.time
            ? lastFuel
            : lastCharge;
    const initialType: VehicleRecordType =
        record?.type ??
        lastEnergy?.type ??
        defaultType(vehicles[0]?.energyType);
    const initialVehicles = vehiclesFor(initialType, vehicles);
    const initialVehicleId =
        record?.vehicleId ??
        (lastEnergy &&
        initialVehicles.some((v) => v.id === lastEnergy.vehicleId)
            ? lastEnergy.vehicleId
            : undefined) ??
        edit?.defaultVehicleId ??
        initialVehicles[0]?.id ??
        vehicles[0]?.id ??
        "";
    const [vehicleId, setVehicleId] = useState(initialVehicleId);
    const [type, setType] = useState<VehicleRecordType>(initialType);
    // iOS 对 overflow-x-auto 容器内容不溢出也允许横向拖动回弹，段控行只在真实溢出才可滚
    const typeTabRef = useRef<HTMLDivElement>(null);
    const typeTabScrollable = useScrollableX(typeTabRef);
    const [time, setTime] = useState<number>(record?.time ?? Date.now());
    const [odometerText, setOdometerText] = useState(
        record?.odometer === undefined ? "" : String(record.odometer),
    );
    const [costText, setCostText] = useState(
        record?.cost === undefined ? "" : String(record.cost),
    );
    const [volumeText, setVolumeText] = useState(
        record?.volume === undefined ? "" : String(record.volume),
    );
    const [fuelGrade, setFuelGrade] = useState<VehicleRecord["fuelGrade"]>(
        record?.fuelGrade ??
            (initialType === "fuel" ? lastFuel?.fuelGrade : undefined),
    );
    /**
     * 新增时默认「没加满」：把没加满误标成加满会算出错误油耗，
     * 反过来只是结算延后（r32 起还有 ≈ 估算兜底），所以默认取保守的一侧。
     * 编辑已有记录时沿用记录本身的值；旧数据没有 isFull 字段也按未加满处理。
     */
    const [isFull, setIsFull] = useState(record?.isFull ?? false);
    const [remark, setRemark] = useState(record?.remark ?? "");

    const allowedVehicles = vehiclesFor(type, vehicles);
    const valid = allowedVehicles.some((v) => v.id === vehicleId);
    const odometer = Number(odometerText) || undefined;
    const cost = Number(costText) || undefined;
    const volume = Number(volumeText) || undefined;
    const showVolume = isEnergyRecord(type);
    const isFuel = type === "fuel";
    const volumeUnit = isFuel ? "L" : "kWh";
    const unitPrice =
        cost !== undefined && volume !== undefined && volume > 0
            ? (cost / volume).toFixed(2)
            : undefined;

    // 页面传入的全部记录用于算「本次行驶」；抽屉自身不挂 store，读 edit.records
    const trip = tripInfo(allRecords, {
        id: record?.id,
        vehicleId,
        time,
        odometer,
    });
    const tripDistance =
        trip.distance !== undefined && trip.distance >= 0
            ? Math.round(trip.distance).toLocaleString("zh-CN")
            : undefined;
    // 「距上次 X」跟着顶部选中的类型走，并找上一条同类型记录作为锚点
    const typeLabelKey =
        ALL_TYPES.find((x) => x.value === type)?.label ?? "vehicle-type-fuel";
    const typedTrip = tripInfo(
        allRecords,
        { id: record?.id, vehicleId, time, odometer },
        type,
    );

    const remove = async () => {
        const ok = await showRecordFormDelete({
            title: t("vehicle-delete-record-title"),
            description: t("vehicle-delete-record-confirm"),
            onDelete: edit?.onDelete,
        }).catch(() => false);
        if (ok) onCancel?.();
    };

    /** 切 tab：车辆行换成能加该能源的车，并带出该类型上一次的选项 */
    const onPickType = (next: VehicleRecordType) => {
        setType(next);
        const candidates = vehiclesFor(next, vehicles);
        if (!candidates.some((v) => v.id === vehicleId)) {
            setVehicleId(candidates[0]?.id ?? "");
        }
        if (next === "fuel" || next === "charge") {
            const last = next === "fuel" ? lastFuel : lastCharge;
            setFuelGrade(next === "fuel" ? last?.fuelGrade : undefined);
            setIsFull(false);
        }
    };

    const onPickVehicle = (id: string) => setVehicleId(id);

    const submit = () => {
        if (!valid) return;
        onConfirm?.({
            vehicleId,
            type,
            time,
            odometer,
            cost,
            volume: showVolume ? volume : undefined,
            fuelGrade: isFuel ? fuelGrade : undefined,
            isFull: showVolume ? isFull : undefined,
            remark: remark.trim() || undefined,
        });
    };

    const dateText =
        intl.locale === "zh"
            ? dayjs(time).format("M月D日")
            : dayjs(time).format("MMM D");

    return (
        <PopupLayout
            title={
                <span className="text-[18px] font-semibold text-ink">
                    {record
                        ? t("vehicle-edit-record")
                        : t("vehicle-add-record")}
                </span>
            }
            hideBack
            handle
        >
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-2 pt-1">
                {/* 类型 tab 与记账「记一笔」的支出/收入段控同款：白底胶囊容器，选中项浅灰底黑字 */}
                <div className="flex justify-center">
                    <div
                        ref={typeTabRef}
                        className={cn(
                            "flex max-w-full items-center gap-1 rounded-full bg-panel p-1 shadow-[0_2px_10px_rgba(92,62,30,0.08)] ring-1 ring-rule/50",
                            typeTabScrollable
                                ? "overflow-x-auto"
                                : "overflow-hidden",
                        )}
                    >
                        {ALL_TYPES.map(({ value, label }) => {
                            const noCar =
                                isEnergyRecord(value) &&
                                vehiclesFor(value, vehicles).length === 0;
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    aria-label={t(label)}
                                    disabled={noCar}
                                    className={cn(
                                        "h-9 min-w-[56px] flex-shrink-0 cursor-pointer whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors duration-[var(--dp-motion-interaction)] ease-[var(--dp-motion-easing)] disabled:cursor-not-allowed disabled:opacity-40",
                                        type === value
                                            ? "bg-ground-muted text-ink"
                                            : "text-ink-secondary",
                                    )}
                                    onClick={() => onPickType(value)}
                                >
                                    {t(label)}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <FormCard>
                    {/* 车辆行跟着 tab 走：加油里是加油的车，充电里是充电的车 */}
                    {vehicles.length > 1 && (
                        <FormRow label={t("vehicle-label")}>
                            {allowedVehicles.length === 0 ? (
                                <span className="text-[13px] text-ink-secondary">
                                    {t(
                                        type === "charge"
                                            ? "vehicle-no-charge-car"
                                            : "vehicle-no-fuel-car",
                                    )}
                                </span>
                            ) : (
                                <div className="flex flex-wrap justify-end gap-1.5 py-1">
                                    {allowedVehicles.map((vehicle) => (
                                        <button
                                            key={vehicle.id}
                                            type="button"
                                            className={cn(
                                                "cursor-pointer rounded-full px-3 py-[3px] text-[13px] font-medium transition-colors",
                                                vehicleId === vehicle.id
                                                    ? "bg-brand/15 font-semibold text-brand"
                                                    : "bg-ground-muted text-ink/70",
                                            )}
                                            onClick={() =>
                                                onPickVehicle(vehicle.id)
                                            }
                                        >
                                            {vehicle.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </FormRow>
                    )}
                    <FormRow label={t("vehicle-record-date")}>
                        <DatePicker
                            type="date"
                            value={time}
                            title={t("vehicle-record-date")}
                            displayFormatter={() => ""}
                            onChange={(v) => setTime(v)}
                        >
                            <button
                                type="button"
                                className="flex cursor-pointer items-center gap-0.5 text-[15px] tabular-nums text-ink"
                            >
                                {dateText}
                                <RowChevron />
                            </button>
                        </DatePicker>
                    </FormRow>
                    <FormRow label={t("vehicle-odometer")}>
                        <Field
                            value={odometerText}
                            onChange={setOdometerText}
                            placeholder={t("vehicle-odometer-placeholder")}
                            unit="km"
                        />
                    </FormRow>

                    {/* 本次行驶：APK 浅棕卡，自动算与上一条的里程差 */}
                    <div className="px-3 py-2">
                        <div className="rounded-xl bg-ground-muted/70 px-3 py-2.5">
                            <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 text-[13px] text-ink/70">
                                    <i className="icon-[lucide--route] size-3.5" />
                                    {t("vehicle-trip")}
                                </span>
                                <span className="text-[15px] font-semibold tabular-nums text-ink-secondary">
                                    {tripDistance ? `${tripDistance} km` : "—"}
                                </span>
                            </div>
                            <div className="mt-1 truncate text-[12px] leading-tight tabular-nums text-ink-secondary">
                                {trip.inverted
                                    ? t("vehicle-check-odometer")
                                    : typedTrip.prev && tripDistance
                                      ? t("vehicle-trip-since", {
                                            type: t(typeLabelKey),
                                            from: (
                                                typedTrip.prev.odometer ?? 0
                                            ).toLocaleString("zh-CN"),
                                            to: (odometer ?? 0).toLocaleString(
                                                "zh-CN",
                                            ),
                                        })
                                      : odometer === undefined
                                        ? t("vehicle-trip-empty-hint")
                                        : t("vehicle-trip-first")}
                            </div>
                        </div>
                    </div>

                    <FormRow label={t("vehicle-cost")}>
                        <Field
                            value={costText}
                            onChange={setCostText}
                            placeholder="0.00"
                            unit="¥"
                        />
                    </FormRow>
                    {showVolume && (
                        <FormRow
                            label={t(
                                isFuel
                                    ? "vehicle-volume"
                                    : "vehicle-volume-charge",
                            )}
                        >
                            <div className="flex min-w-0 flex-1 flex-col items-end gap-0.5">
                                <Field
                                    value={volumeText}
                                    onChange={setVolumeText}
                                    placeholder="0.00"
                                    unit={volumeUnit}
                                />
                                {unitPrice && (
                                    <span className="text-[12px] tabular-nums text-ink-secondary">
                                        {t("vehicle-unit-price", {
                                            price: unitPrice,
                                            unit: volumeUnit,
                                        })}
                                    </span>
                                )}
                            </div>
                        </FormRow>
                    )}
                    {isFuel && (
                        <FormRow label={t("vehicle-fuel-grade")}>
                            <div className="flex justify-end gap-1.5">
                                {FUEL_GRADES.map((grade) => (
                                    <button
                                        key={grade}
                                        type="button"
                                        className={cn(
                                            "cursor-pointer rounded-full px-3 py-[3px] text-[13px] font-medium tabular-nums transition-colors",
                                            fuelGrade === grade
                                                ? "bg-brand/15 font-semibold text-brand"
                                                : "bg-ground-muted text-ink/70",
                                        )}
                                        onClick={() =>
                                            setFuelGrade(
                                                fuelGrade === grade
                                                    ? undefined
                                                    : grade,
                                            )
                                        }
                                    >
                                        {grade}#
                                    </button>
                                ))}
                            </div>
                        </FormRow>
                    )}
                    <FormRow label={t("inventory-remark")}>
                        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                            <input
                                value={remark}
                                maxLength={255}
                                placeholder={t("vehicle-optional")}
                                onChange={(e) => setRemark(e.target.value)}
                                className="w-full min-w-0 cursor-text bg-transparent text-right text-[15px] text-ink outline-none placeholder:text-ink-secondary/60"
                            />
                        </div>
                    </FormRow>
                </FormCard>

                {showVolume && (
                    <FormCard>
                        <div className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-2.5">
                            <div className="min-w-0">
                                <div className="text-[15px] text-ink">
                                    {t(
                                        isFuel
                                            ? "vehicle-full"
                                            : "vehicle-full-charge",
                                    )}
                                </div>
                                <div className="mt-0.5 text-[12px] leading-snug text-ink-secondary">
                                    {t(
                                        isFuel
                                            ? "vehicle-full-hint"
                                            : "vehicle-full-hint-charge",
                                    )}
                                </div>
                            </div>
                            <Toggle
                                value={isFull}
                                onChange={setIsFull}
                                label={t(
                                    isFuel
                                        ? "vehicle-full"
                                        : "vehicle-full-charge",
                                )}
                            />
                        </div>
                    </FormCard>
                )}
            </div>
            <div className="flex-shrink-0 px-4 pb-[max(16px,var(--safe-area-inset-bottom))] pt-2">
                <button
                    type="button"
                    disabled={!valid}
                    onClick={submit}
                    className="h-12 w-full cursor-pointer rounded-full bg-brand text-[16px] font-medium text-on-brand shadow-[0_6px_16px_rgba(245,130,32,0.28)] transition-opacity disabled:cursor-not-allowed disabled:bg-brand/40 disabled:text-on-brand/80 disabled:shadow-none"
                >
                    {t("vehicle-save")}
                </button>
                {record && edit?.onDelete && (
                    <button
                        type="button"
                        onClick={() => void remove()}
                        className="mt-2 h-10 w-full cursor-pointer text-[14px] font-medium text-red-500"
                    >
                        {t("vehicle-delete-record")}
                    </button>
                )}
            </div>
            <RecordFormDeleteProvider />
        </PopupLayout>
    );
}
