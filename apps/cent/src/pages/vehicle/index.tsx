import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import SegmentedTabs from "@/components/segmented-tabs";
import { Button } from "@/components/ui/button";
import { showVehicleForm, showVehicleRecord } from "@/components/vehicle";
import { useVehicle } from "@/hooks/use-vehicle";
import PopupLayout from "@/layouts/popup-layout";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import type { VehicleRecord, VehicleRecordType } from "@/vehicle/types";

const TYPE_LABEL_KEY: Record<VehicleRecordType, string> = {
    fuel: "vehicle-type-fuel",
    maintenance: "vehicle-type-maintenance",
    repair: "vehicle-type-repair",
    other: "vehicle-type-other",
};

export default function VehiclePage() {
    const t = useIntl();
    const navigate = useNavigate();
    const {
        vehicles,
        records,
        addVehicle,
        removeVehicle,
        addRecord,
        updateRecord,
        removeRecord,
    } = useVehicle();
    const [vehicleFilter, setVehicleFilter] = useState("__all");

    // 按车辆过滤后按时间倒序
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

    // 统计：本月花费 / 累计花费 / 平均油耗（相邻加油记录按里程差/升数）
    const stats = useMemo(() => {
        const scoped =
            vehicleFilter === "__all"
                ? records
                : records.filter((r) => r.vehicleId === vehicleFilter);
        const monthStart = dayjs().startOf("month").valueOf();
        const monthCost = scoped
            .filter((r) => r.time >= monthStart)
            .reduce((sum, r) => sum + (r.cost ?? 0), 0);
        const totalCost = scoped.reduce((sum, r) => sum + (r.cost ?? 0), 0);

        // 每辆车独立计算：加油记录按时间正序，油耗 = 里程差 / 加油量
        const byVehicle = new Map<string, VehicleRecord[]>();
        for (const r of scoped) {
            if (r.type !== "fuel" || !r.odometer || !r.volume) continue;
            const list = byVehicle.get(r.vehicleId) ?? [];
            list.push(r);
            byVehicle.set(r.vehicleId, list);
        }
        const consumptions: number[] = [];
        for (const list of byVehicle.values()) {
            const sorted = [...list].sort((a, b) => a.time - b.time);
            for (let i = 1; i < sorted.length; i++) {
                const distance =
                    (sorted[i].odometer ?? 0) - (sorted[i - 1].odometer ?? 0);
                if (distance > 0 && (sorted[i].volume ?? 0) > 0) {
                    consumptions.push(distance / (sorted[i].volume ?? 1));
                }
            }
        }
        const avgConsumption =
            consumptions.length > 0
                ? consumptions.reduce((s, v) => s + v, 0) / consumptions.length
                : undefined;
        return { monthCost, totalCost, avgConsumption };
    }, [records, vehicleFilter]);

    // 白底二级页：与家小满行车能耗页一致
    return (
        <div className="flex h-full flex-col overflow-hidden bg-panel page-show">
            <div className="flex flex-shrink-0 items-center px-4 pb-2 pt-[calc(var(--safe-area-inset-top)+12px)]">
                <button
                    type="button"
                    aria-label={t("back")}
                    className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-ground-muted/60"
                    onClick={() => navigate(-1)}
                >
                    <i className="icon-[lucide--chevron-left] size-6 text-ink" />
                </button>
                <h1 className="min-w-0 flex-1 text-center font-display text-xl font-bold">
                    {t("vehicle-title")}
                </h1>
                <span className="size-11 flex-shrink-0" />
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-8">
                {vehicles.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
                        <i className="icon-[lucide--car] size-16 text-ink-secondary/40" />
                        <h2 className="font-display text-xl font-bold">
                            {t("vehicle-empty-title")}
                        </h2>
                        <p className="max-w-80 text-sm text-ink-secondary">
                            {t("vehicle-empty-description")}
                        </p>
                        <Button
                            className="mt-3 h-12 w-56 rounded-full text-base font-semibold"
                            onClick={() =>
                                showVehicleForm().then(
                                    (v) => v && addVehicle(v),
                                )
                            }
                        >
                            {t("vehicle-add")}
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-3 gap-2">
                            <StatBlock
                                label={t("vehicle-stat-month")}
                                value={`¥${Math.round(stats.monthCost)}`}
                            />
                            <StatBlock
                                label={t("vehicle-stat-total")}
                                value={`¥${Math.round(stats.totalCost)}`}
                            />
                            <StatBlock
                                label={t("vehicle-stat-consumption")}
                                value={
                                    stats.avgConsumption === undefined
                                        ? "--"
                                        : `${stats.avgConsumption.toFixed(1)}`
                                }
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <FilterChip
                                active={vehicleFilter === "__all"}
                                label={t("vehicle-all")}
                                onClick={() => setVehicleFilter("__all")}
                            />
                            {vehicles.map((vehicle) => (
                                <FilterChip
                                    key={vehicle.id}
                                    active={vehicleFilter === vehicle.id}
                                    label={vehicle.name}
                                    onClick={() => setVehicleFilter(vehicle.id)}
                                />
                            ))}
                        </div>

                        {visibleRecords.length === 0 ? (
                            <p className="py-10 text-center text-sm text-ink-secondary">
                                {t("vehicle-empty-records")}
                            </p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {visibleRecords.map((record) => (
                                    <RecordCard
                                        key={record.id}
                                        record={record}
                                        vehicleName={
                                            vehicles.find(
                                                (v) =>
                                                    v.id === record.vehicleId,
                                            )?.name ?? ""
                                        }
                                        onEdit={() =>
                                            showVehicleRecord({
                                                vehicles,
                                                record,
                                            }).then(
                                                (v) =>
                                                    v &&
                                                    updateRecord({
                                                        ...record,
                                                        ...v,
                                                    }),
                                            )
                                        }
                                        onDelete={() => removeRecord(record.id)}
                                    />
                                ))}
                            </div>
                        )}

                        <Button
                            variant="outline"
                            className="mt-1"
                            onClick={() =>
                                showVehicleRecord({ vehicles }).then(
                                    (v) => v && addRecord(v),
                                )
                            }
                        >
                            <i className="icon-[lucide--plus]" />
                            {t("vehicle-add-record")}
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}

function StatBlock({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-card border border-rule bg-ground px-3 py-2.5">
            <div className="truncate text-xs text-ink-secondary">{label}</div>
            <div className="mt-0.5 font-display text-lg font-bold tabular-nums">
                {value}
            </div>
        </div>
    );
}

function FilterChip({
    active,
    label,
    onClick,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            className={cn(
                "cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors",
                active
                    ? "border-brand/30 bg-brand/10 text-brand"
                    : "border-rule bg-panel text-ink-secondary",
            )}
            onClick={onClick}
        >
            {label}
        </button>
    );
}

function RecordCard({
    record,
    vehicleName,
    onEdit,
    onDelete,
}: {
    record: VehicleRecord;
    vehicleName: string;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const t = useIntl();
    return (
        <div className="flex items-center gap-3 rounded-card border border-rule bg-ground p-3">
            <button
                type="button"
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                onClick={onEdit}
            >
                <div className="flex size-11 flex-shrink-0 items-center justify-center rounded-2xl bg-panel text-brand shadow-panel">
                    <i
                        className={cn(
                            "size-5",
                            record.type === "fuel" && "icon-[lucide--fuel]",
                            record.type === "maintenance" &&
                                "icon-[lucide--wrench]",
                            record.type === "repair" && "icon-[lucide--wrench]",
                            record.type === "other" &&
                                "icon-[lucide--ellipsis]",
                        )}
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold">
                            {t(TYPE_LABEL_KEY[record.type])}
                        </span>
                        <span className="truncate text-xs text-ink-secondary">
                            {vehicleName}
                        </span>
                    </div>
                    <div className="mt-0.5 flex gap-2 text-xs text-ink-secondary">
                        <span>{dayjs(record.time).format("MM-DD")}</span>
                        {record.odometer !== undefined && (
                            <span className="tabular-nums">
                                {t("vehicle-odometer-value", {
                                    n: record.odometer,
                                })}
                            </span>
                        )}
                        {record.volume !== undefined && (
                            <span className="tabular-nums">
                                {t("vehicle-volume-value", {
                                    n: record.volume,
                                })}
                            </span>
                        )}
                    </div>
                </div>
                {record.cost !== undefined && (
                    <span className="flex-shrink-0 text-sm font-semibold tabular-nums">
                        ¥{record.cost}
                    </span>
                )}
            </button>
            <button
                type="button"
                aria-label={t("delete")}
                className="flex size-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-ground-muted"
                onClick={onDelete}
            >
                <i className="icon-[lucide--trash-2] size-4" />
            </button>
        </div>
    );
}
