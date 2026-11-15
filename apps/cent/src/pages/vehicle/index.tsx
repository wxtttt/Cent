import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { createDeleteConfirm } from "@/components/delete-confirm";
import { showVehicleForm, showVehicleRecord } from "@/components/vehicle";
import { useVehicle } from "@/hooks/use-vehicle";
import PopupLayout from "@/layouts/popup-layout";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import {
    computeVehicleStats,
    groupRecordsByMonth,
    tripInfo,
} from "@/vehicle/stats";
import type {
    Vehicle,
    VehicleEnergyType,
    VehicleRecord,
    VehicleRecordType,
} from "@/vehicle/types";
import { isEnergyRecord } from "@/vehicle/types";

const TYPE_LABEL_KEY: Record<VehicleRecordType, string> = {
    fuel: "vehicle-type-fuel",
    charge: "vehicle-type-charge",
    maintenance: "vehicle-type-maintenance",
    repair: "vehicle-type-repair",
    other: "vehicle-type-other",
};

const TYPE_ICON: Record<VehicleRecordType, string> = {
    fuel: "icon-[lucide--fuel]",
    charge: "icon-[lucide--plug-zap]",
    maintenance: "icon-[lucide--wrench]",
    repair: "icon-[lucide--wrench]",
    other: "icon-[lucide--ellipsis]",
};

const ENERGY_LABEL_KEY: Record<VehicleEnergyType, string> = {
    gas: "vehicle-energy-gas",
    electric: "vehicle-energy-electric",
    hybrid: "vehicle-energy-hybrid",
};

const CARD =
    "divide-y divide-rule/70 overflow-hidden rounded-2xl bg-panel shadow-[0_1px_6px_rgba(92,62,30,0.05)]";

/** 与「删除特殊预算」同款二次确认；车辆页内独立实例 */
const [VehicleDeleteProvider, showVehicleDelete] = createDeleteConfirm();

const money = (n: number) => `¥${Math.round(n).toLocaleString("zh-CN")}`;
const km = (n: number) => `${Math.round(n).toLocaleString("zh-CN")} km`;
const fixed = (n: number | undefined, digits = 2) =>
    n === undefined ? "--" : n.toFixed(digits);

/** 卡片外的 12px 分组小标题（预算管理 / 分类管理同款） */
function GroupTitle({
    children,
    action,
    first,
}: {
    children: React.ReactNode;
    action?: React.ReactNode;
    first?: boolean;
}) {
    return (
        <div
            className={cn(
                "mb-1.5 flex items-center justify-between gap-2 px-1 text-[12px] text-ink-secondary",
                first ? "mt-4" : "mt-3",
            )}
        >
            <span>{children}</span>
            {action}
        </div>
    );
}

/** APK 顶部车辆切换胶囊：选中橙底白字，未选中白底灰字 */
function VehiclePill({
    active,
    label,
    onClick,
    add,
}: {
    active?: boolean;
    label: string;
    onClick: () => void;
    add?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex h-8 flex-shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full px-3 text-[12px] transition-colors",
                active
                    ? "bg-brand font-medium text-on-brand"
                    : "bg-panel text-ink-secondary shadow-[0_1px_5px_rgba(92,62,30,0.08)]",
            )}
        >
            {add && <i className="icon-[lucide--plus] size-3.5" />}
            {label}
        </button>
    );
}

/** 页面由 showVehicle() 以全屏弹层唤起，和预算管理同一个出场方式 */
export default function VehiclePage({ onCancel }: { onCancel?: () => void }) {
    const t = useIntl();
    const {
        vehicles,
        records,
        addVehicle,
        updateVehicle,
        removeVehicle,
        addRecord,
        updateRecord,
        removeRecord,
    } = useVehicle();
    const [vehicleFilter, setVehicleFilter] = useState("__all");

    const activeVehicle = vehicles.find((v) => v.id === vehicleFilter);
    const visibleRecords = useMemo(
        () =>
            records
                .filter(
                    (r) =>
                        vehicleFilter === "__all" ||
                        r.vehicleId === vehicleFilter,
                )
                .sort((a, b) => b.time - a.time),
        [records, vehicleFilter],
    );
    const stats = useMemo(
        () => computeVehicleStats(vehicles, records, vehicleFilter),
        [vehicles, records, vehicleFilter],
    );
    const groups = useMemo(
        () => groupRecordsByMonth(visibleRecords),
        [visibleRecords],
    );

    const openVehicleForm = async (edit?: Vehicle) => {
        const v = await showVehicleForm(edit).catch(() => undefined);
        if (!v) return;
        if (edit) await updateVehicle({ ...edit, ...v });
        else await addVehicle(v);
    };

    const openRecordForm = async (record?: VehicleRecord) => {
        const v = await showVehicleRecord({
            vehicles,
            records,
            record,
            defaultVehicleId:
                vehicleFilter === "__all" ? undefined : vehicleFilter,
        }).catch(() => undefined);
        if (!v) return;
        if (record) await updateRecord({ ...record, ...v });
        else await addRecord(v);
    };

    const confirmDeleteVehicle = async (vehicle: Vehicle) => {
        const ok = await showVehicleDelete({
            title: t("vehicle-delete-title"),
            description: t("vehicle-delete-vehicle-confirm", {
                name: vehicle.name,
            }),
        }).catch(() => false);
        if (!ok) return;
        await removeVehicle(vehicle.id);
        if (vehicleFilter === vehicle.id) setVehicleFilter("__all");
    };

    const confirmDeleteRecord = async (record: VehicleRecord) => {
        const ok = await showVehicleDelete({
            title: t("vehicle-delete-record-title"),
            description: t("vehicle-delete-record-confirm"),
        }).catch(() => false);
        if (!ok) return;
        await removeRecord(record.id);
    };

    return (
        <div
            data-vehicle-page
            className="dp-drawer-surface flex h-full flex-col overflow-hidden bg-ground text-ink"
        >
            <PopupLayout
                onBack={onCancel}
                title={t("vehicle-title")}
                backStyle="circle"
                className="dp-drawer-surface h-full bg-ground"
                right={
                    activeVehicle ? (
                        <button
                            type="button"
                            aria-label={t("vehicle-edit")}
                            className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-panel text-ink shadow-[0_1px_6px_rgba(92,62,30,0.10)]"
                            onClick={() => void openVehicleForm(activeVehicle)}
                        >
                            <i className="icon-[lucide--pencil] size-4" />
                        </button>
                    ) : undefined
                }
            >
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-4">
                    {vehicles.length === 0 ? (
                        <EmptyState onAdd={() => void openVehicleForm()} />
                    ) : (
                        <>
                            {/* 车辆切换胶囊在最上面，与 APK 一致；「全部」是第一个选项 */}
                            <div className="-mx-3 flex flex-shrink-0 gap-2 overflow-x-auto px-3 pb-1 pt-1">
                                <VehiclePill
                                    active={vehicleFilter === "__all"}
                                    label={t("vehicle-all")}
                                    onClick={() => setVehicleFilter("__all")}
                                />
                                {vehicles.map((v) => (
                                    <VehiclePill
                                        key={v.id}
                                        active={vehicleFilter === v.id}
                                        label={v.name}
                                        onClick={() => setVehicleFilter(v.id)}
                                    />
                                ))}
                                <VehiclePill
                                    add
                                    label={t("vehicle-add")}
                                    onClick={() => void openVehicleForm()}
                                />
                            </div>

                            {/* 我的车辆 + 能耗概览合并成一张 APK 式主卡 */}
                            <OverviewCard
                                vehicle={activeVehicle}
                                vehicleCount={vehicles.length}
                                stats={stats}
                                onEdit={
                                    activeVehicle
                                        ? () =>
                                              void openVehicleForm(
                                                  activeVehicle,
                                              )
                                        : undefined
                                }
                                onDelete={
                                    activeVehicle
                                        ? () =>
                                              void confirmDeleteVehicle(
                                                  activeVehicle,
                                              )
                                        : undefined
                                }
                            />

                            <GroupTitle>
                                {t("vehicle-section-monthly")}
                            </GroupTitle>
                            <MonthlyBars
                                monthly={stats.monthly}
                                emptyLabel={t("vehicle-monthly-empty")}
                            />

                            <GroupTitle
                                action={
                                    <span className="tabular-nums">
                                        {t("vehicle-record-count", {
                                            n: stats.recordCount,
                                        })}
                                    </span>
                                }
                            >
                                {t("vehicle-section-records")}
                            </GroupTitle>

                            {groups.length === 0 ? (
                                <div className="rounded-2xl bg-panel px-4 py-10 text-center text-[13px] text-ink-secondary shadow-[0_1px_6px_rgba(92,62,30,0.05)]">
                                    {t("vehicle-empty-records")}
                                </div>
                            ) : (
                                groups.map((group) => (
                                    <div key={group.key} className="mb-3">
                                        <div className="mb-1.5 px-1 text-[12px] font-medium text-ink-secondary">
                                            {group.label}
                                        </div>
                                        <div className={CARD}>
                                            {group.records.map((record) => (
                                                <RecordRow
                                                    key={record.id}
                                                    record={record}
                                                    trip={tripInfo(
                                                        records,
                                                        record,
                                                    )}
                                                    vehicleName={
                                                        vehicles.find(
                                                            (v) =>
                                                                v.id ===
                                                                record.vehicleId,
                                                        )?.name ?? ""
                                                    }
                                                    onEdit={() =>
                                                        void openRecordForm(
                                                            record,
                                                        )
                                                    }
                                                    onDelete={() =>
                                                        void confirmDeleteRecord(
                                                            record,
                                                        )
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </>
                    )}
                </div>

                {vehicles.length > 0 && (
                    <div className="flex-shrink-0 px-4 pb-4 pt-2">
                        <button
                            type="button"
                            className="flex h-12 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-brand text-[16px] font-medium text-on-brand shadow-[0_6px_16px_rgba(245,130,32,0.28)] transition-opacity enabled:active:opacity-90"
                            onClick={() => void openRecordForm()}
                        >
                            <i className="icon-[lucide--plus] size-4" />
                            {t("vehicle-add-record")}
                        </button>
                    </div>
                )}
            </PopupLayout>
            <VehicleDeleteProvider />
        </div>
    );
}

/** APK 空态：淡灰车图标 + 加粗标题 + 两行说明 + 橙色胶囊主按钮 */
function EmptyState({ onAdd }: { onAdd: () => void }) {
    const t = useIntl();
    return (
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
            <i className="icon-[lucide--car] size-14 text-ink-secondary/35" />
            <h2 className="mt-6 text-[17px] font-semibold text-ink">
                {t("vehicle-empty-title")}
            </h2>
            <p className="mt-2 max-w-[290px] text-[13px] leading-relaxed text-ink-secondary">
                {t("vehicle-empty-description")}
            </p>
            <button
                type="button"
                className="mt-7 h-12 w-[154px] cursor-pointer rounded-full bg-brand text-[15px] font-medium text-on-brand shadow-[0_6px_16px_rgba(245,130,32,0.28)] transition-opacity enabled:active:opacity-90"
                onClick={onAdd}
            >
                {t("vehicle-add")}
            </button>
        </div>
    );
}

type Stats = ReturnType<typeof computeVehicleStats>;

function ConsumptionBlock({
    label,
    value,
    unitLabel,
}: {
    label: string;
    value?: number;
    unitLabel: string;
}) {
    return (
        <div className="min-w-0">
            <div className="text-[11px] text-ink-secondary">{label}</div>
            <div className="mt-1 flex items-baseline gap-1">
                <span className="text-[26px] font-semibold leading-none tabular-nums text-brand">
                    {value === undefined ? "—" : fixed(value)}
                </span>
                <span className="text-[10px] text-ink-secondary">
                    {unitLabel}
                </span>
            </div>
        </div>
    );
}

/** 一张卡同时承载车辆信息与能耗概览；混动车显示油 / 电双栏 */
function OverviewCard({
    vehicle,
    vehicleCount,
    stats,
    onEdit,
    onDelete,
}: {
    vehicle?: Vehicle;
    vehicleCount: number;
    stats: Stats;
    onEdit?: () => void;
    onDelete?: () => void;
}) {
    const t = useIntl();
    // 只看筛选范围内实际有哪些车：没有油车不显示油耗，没有电车不显示电耗
    const showGas = stats.hasGasVehicle;
    const showElectric = stats.hasElectricVehicle;
    const both = showGas && showElectric;
    const gasOnly = showGas && !showElectric;
    const shownValue = showGas
        ? stats.gasConsumption
        : stats.electricConsumption;
    const hasValue = shownValue !== undefined;
    const priceUnit = showGas ? "L" : "kWh";
    const anchor = gasOnly
        ? stats.lastFuelAnchor
        : showGas
          ? (stats.lastFuelAnchor ?? stats.lastChargeAnchor)
          : stats.lastChargeAnchor;
    const anchorIsCharge = !!anchor && !stats.lastFuelAnchor;

    return (
        <div className="mt-3 rounded-2xl bg-panel px-4 py-3 shadow-[0_1px_6px_rgba(92,62,30,0.05)]">
            {/* 车辆信息行 */}
            <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <i className="icon-[lucide--car] size-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <span className="truncate text-[15px] font-semibold text-ink">
                            {vehicle?.name ?? t("vehicle-all")}
                        </span>
                        {vehicle && (
                            <span className="flex-shrink-0 rounded-full bg-ground-muted px-1.5 py-0.5 text-[10px] text-ink-secondary">
                                {t(
                                    ENERGY_LABEL_KEY[
                                        vehicle.energyType ?? "gas"
                                    ],
                                )}
                            </span>
                        )}
                    </div>
                    <div className="truncate text-[11px] tabular-nums text-ink-secondary">
                        {vehicle
                            ? vehicle.plate || t("vehicle-no-plate")
                            : t("vehicle-all-count", { n: vehicleCount })}
                    </div>
                </div>
                {vehicle && (
                    <div className="flex flex-shrink-0 items-center gap-1">
                        <button
                            type="button"
                            aria-label={t("vehicle-edit")}
                            className="flex size-7 cursor-pointer items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-ground-muted hover:text-brand"
                            onClick={onEdit}
                        >
                            <i className="icon-[lucide--pencil] size-3.5" />
                        </button>
                        <button
                            type="button"
                            aria-label={t("delete")}
                            className="flex size-7 cursor-pointer items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-ground-muted hover:text-red-500"
                            onClick={onDelete}
                        >
                            <i className="icon-[lucide--trash-2] size-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* 有油车显示油耗、有电车显示电耗；两者都有时左右双栏 */}
            <div className="mt-3">
                {both ? (
                    <div className="grid grid-cols-2 gap-3">
                        <ConsumptionBlock
                            label={t("vehicle-stat-consumption-gas")}
                            value={stats.gasConsumption}
                            unitLabel="L/100km"
                        />
                        <ConsumptionBlock
                            label={t("vehicle-stat-consumption-electric")}
                            value={stats.electricConsumption}
                            unitLabel="kWh/100km"
                        />
                    </div>
                ) : showGas ? (
                    <ConsumptionBlock
                        label={t("vehicle-stat-consumption-gas")}
                        value={stats.gasConsumption}
                        unitLabel="L/100km"
                    />
                ) : showElectric ? (
                    <ConsumptionBlock
                        label={t("vehicle-stat-consumption-electric")}
                        value={stats.electricConsumption}
                        unitLabel="kWh/100km"
                    />
                ) : null}
                <div className="mt-1.5 truncate text-[11px] tabular-nums text-ink-secondary">
                    {hasValue
                        ? t("vehicle-last-avg", {
                              last: fixed(shownValue),
                              price: fixed(stats.avgPrice),
                              unit: priceUnit,
                          })
                        : t(
                              gasOnly
                                  ? "vehicle-need-two-full"
                                  : "vehicle-need-two-charge",
                          )}
                </div>
                {hasValue && anchor && (
                    <div className="mt-0.5 truncate text-[11px] tabular-nums text-ink-secondary">
                        {t(
                            anchorIsCharge
                                ? "vehicle-full-anchor-charge"
                                : "vehicle-full-anchor",
                            {
                                date: dayjs(anchor.time).format("M月D日"),
                                km: Math.round(anchor.odometer).toLocaleString(
                                    "zh-CN",
                                ),
                            },
                        )}
                    </div>
                )}
            </div>

            <div className="mt-3 grid grid-cols-3 divide-x divide-rule/70 border-t border-rule/70 pt-3">
                <Metric
                    label={t("vehicle-stat-cost-per-km")}
                    value={
                        stats.costPerKm === undefined
                            ? "--"
                            : `¥${stats.costPerKm.toFixed(2)}`
                    }
                />
                <Metric
                    label={t("vehicle-stat-distance")}
                    value={
                        stats.distance === undefined ? "--" : km(stats.distance)
                    }
                />
                <Metric
                    label={t("vehicle-stat-total")}
                    value={money(stats.totalCost)}
                />
            </div>
        </div>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0 px-2 text-center first:pl-0 last:pr-0">
            <div className="truncate text-[10px] text-ink-secondary">
                {label}
            </div>
            <div className="mt-1 truncate text-[14px] font-semibold tabular-nums text-ink">
                {value}
            </div>
        </div>
    );
}

function MonthlyBars({
    monthly,
    emptyLabel,
}: {
    monthly: { key: string; label: string; cost: number }[];
    emptyLabel: string;
}) {
    const max = Math.max(1, ...monthly.map((m) => m.cost));
    const hasAny = monthly.some((m) => m.cost > 0);
    return (
        <div className="rounded-2xl bg-panel px-3 py-3 shadow-[0_1px_6px_rgba(92,62,30,0.05)]">
            {!hasAny && (
                <div className="pb-2 text-center text-[11px] text-ink-secondary">
                    {emptyLabel}
                </div>
            )}
            <div className="flex h-[96px] items-end gap-2">
                {monthly.map((m, i) => (
                    <div
                        key={m.key}
                        className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                    >
                        <span className="text-[9px] tabular-nums text-ink-secondary">
                            {m.cost > 0 ? Math.round(m.cost) : ""}
                        </span>
                        <div
                            className={cn(
                                "w-full max-w-[26px] rounded-t-[6px] transition-all",
                                i === monthly.length - 1
                                    ? "bg-brand"
                                    : "bg-brand/30",
                            )}
                            style={{
                                height: `${Math.max(3, (m.cost / max) * 60)}px`,
                            }}
                        />
                    </div>
                ))}
            </div>
            <div className="mt-1 flex gap-2 border-t border-rule/70 pt-2">
                {monthly.map((m) => (
                    <span
                        key={m.key}
                        className="min-w-0 flex-1 text-center text-[10px] text-ink-secondary"
                    >
                        {m.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

/** APK 记录卡三行式：主行「加油 40 L」+金额，次行日期·里程，第三行「距上次加油 N km」 */
function RecordRow({
    record,
    trip,
    vehicleName,
    onEdit,
    onDelete,
}: {
    record: VehicleRecord;
    trip: ReturnType<typeof tripInfo>;
    vehicleName: string;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const t = useIntl();
    const typeLabel = t(TYPE_LABEL_KEY[record.type]);
    const volume =
        record.volume !== undefined
            ? `${record.volume} ${record.type === "charge" ? "kWh" : "L"}`
            : undefined;
    const since = (() => {
        if (!trip.prev) return t("vehicle-first-record");
        if (trip.inverted) return t("vehicle-check-odometer");
        if (trip.distance === undefined) return t("vehicle-first-record");
        return t("vehicle-since-last", {
            type: typeLabel,
            n: Math.round(trip.distance).toLocaleString("zh-CN"),
        });
    })();
    const sinceTone = trip.prev && !trip.inverted;

    return (
        <div className="relative flex min-h-[76px] items-center gap-3 px-4 py-2.5">
            <button
                type="button"
                aria-label={typeLabel}
                onClick={onEdit}
                className="absolute inset-0 z-0 transition-colors enabled:hover:bg-brand/5"
            />
            <span className="pointer-events-none relative z-[1] flex size-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <i className={cn("size-[18px]", TYPE_ICON[record.type])} />
            </span>
            <span className="pointer-events-none relative z-[1] min-w-0 flex-1 py-0.5">
                <span className="block truncate text-[15px] font-medium text-ink">
                    {typeLabel}
                    {volume && (
                        <span className="ml-1.5 text-[13px] tabular-nums text-ink-secondary">
                            {volume}
                        </span>
                    )}
                    {record.fuelGrade && ` · ${record.fuelGrade}#`}
                    {record.isFull && isEnergyRecord(record.type) && (
                        <span className="ml-1.5 text-[10px] font-normal text-ink-secondary">
                            {t(
                                record.type === "charge"
                                    ? "vehicle-full-charge"
                                    : "vehicle-full",
                            )}
                        </span>
                    )}
                </span>
                <span className="mt-0.5 block truncate text-[11px] tabular-nums text-ink-secondary">
                    {[
                        dayjs(record.time).format("M月D日"),
                        vehicleName,
                        record.odometer !== undefined
                            ? `${record.odometer.toLocaleString("zh-CN")} km`
                            : undefined,
                    ]
                        .filter(Boolean)
                        .join(" · ")}
                </span>
                <span
                    className={cn(
                        "mt-0.5 block truncate text-[11px] tabular-nums",
                        sinceTone ? "text-brand" : "text-ink-secondary",
                    )}
                >
                    {since}
                </span>
            </span>
            <span className="pointer-events-none relative z-[1] flex-shrink-0 text-[14px] font-semibold tabular-nums text-ink">
                {record.cost === undefined ? "--" : money(record.cost)}
            </span>
            <button
                type="button"
                aria-label={t("delete")}
                className="relative z-10 flex size-7 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-secondary/70 transition-colors hover:bg-ground-muted hover:text-red-500"
                onClick={onDelete}
            >
                <i className="icon-[lucide--trash-2] size-3.5" />
            </button>
        </div>
    );
}
