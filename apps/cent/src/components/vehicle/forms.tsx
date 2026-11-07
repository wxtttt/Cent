import { useState } from "react";
import { DatePicker } from "@/components/date-picker";
import {
    CountedRowInput,
    FormCard,
    FormRow,
    RowChevron,
    RowInput,
} from "@/components/form-rows";
import PopupLayout from "@/layouts/popup-layout";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import type {
    Vehicle,
    VehicleRecord,
    VehicleRecordType,
} from "@/vehicle/types";
import createConfirmProvider from "../confirm";
import { Button } from "../ui/button";

export type VehicleValue = Omit<Vehicle, "id" | "userId" | "time">;

export function VehicleForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit?: Vehicle;
    onCancel?: () => void;
    onConfirm?: (v: VehicleValue) => void;
}) {
    const t = useIntl();
    const [name, setName] = useState(edit?.name ?? "");
    const [plate, setPlate] = useState(edit?.plate ?? "");

    const valid = name.trim().length > 0;

    return (
        <PopupLayout
            title={edit ? t("vehicle-edit") : t("vehicle-add")}
            onBack={onCancel}
            handle
            right={
                <Button
                    size="sm"
                    disabled={!valid}
                    onClick={() =>
                        onConfirm?.({
                            name: name.trim(),
                            plate: plate.trim() || undefined,
                        })
                    }
                >
                    {t("confirm")}
                </Button>
            }
        >
            <div className="flex flex-col gap-4 px-4 py-3 pb-6">
                <FormCard>
                    <FormRow label={t("vehicle-name")}>
                        <RowInput
                            value={name}
                            placeholder={t("vehicle-name-placeholder")}
                            onChange={setName}
                        />
                    </FormRow>
                    <FormRow label={t("vehicle-plate")}>
                        <RowInput
                            value={plate}
                            placeholder={t("vehicle-plate-placeholder")}
                            onChange={setPlate}
                        />
                    </FormRow>
                </FormCard>
            </div>
        </PopupLayout>
    );
}

export type VehicleRecordValue = Omit<VehicleRecord, "id" | "userId">;

const RECORD_TYPES = [
    { value: "fuel", label: "vehicle-type-fuel" },
    { value: "maintenance", label: "vehicle-type-maintenance" },
    { value: "repair", label: "vehicle-type-repair" },
    { value: "other", label: "vehicle-type-other" },
] as const;

export function VehicleRecordForm({
    edit,
    onCancel,
    onConfirm,
}: {
    /** vehicles 为车辆列表，record 为待编辑记录 */
    edit?: { vehicles: Vehicle[]; record?: VehicleRecord };
    onCancel?: () => void;
    onConfirm?: (v: VehicleRecordValue) => void;
}) {
    const t = useIntl();
    const record = edit?.record;
    const vehicles = edit?.vehicles ?? [];
    const [vehicleId, setVehicleId] = useState(
        record?.vehicleId ?? vehicles[0]?.id ?? "",
    );
    const [type, setType] = useState<VehicleRecordType>(record?.type ?? "fuel");
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
    const [remark, setRemark] = useState(record?.remark ?? "");

    const valid = vehicleId !== "" && vehicles.length > 0;
    const odometer = Number(odometerText) || undefined;
    const cost = Number(costText) || undefined;
    const volume = Number(volumeText) || undefined;

    return (
        <PopupLayout
            title={record ? t("vehicle-edit-record") : t("vehicle-add-record")}
            onBack={onCancel}
            handle
            right={
                <Button
                    size="sm"
                    disabled={!valid}
                    onClick={() =>
                        onConfirm?.({
                            vehicleId,
                            type,
                            time,
                            odometer,
                            cost,
                            volume: type === "fuel" ? volume : undefined,
                            remark: remark.trim() || undefined,
                        })
                    }
                >
                    {t("confirm")}
                </Button>
            }
        >
            <div className="flex flex-col gap-4 overflow-y-auto px-4 py-3 pb-6">
                <FormCard>
                    <FormRow label={t("vehicle-label")}>
                        <div className="flex flex-wrap justify-end gap-1.5">
                            {vehicles.map((vehicle) => (
                                <button
                                    key={vehicle.id}
                                    type="button"
                                    className={cn(
                                        "cursor-pointer rounded-full px-2.5 py-1 text-xs transition-colors",
                                        vehicleId === vehicle.id
                                            ? "bg-brand/10 font-medium text-brand"
                                            : "bg-ground-muted text-ink-secondary",
                                    )}
                                    onClick={() => setVehicleId(vehicle.id)}
                                >
                                    {vehicle.name}
                                </button>
                            ))}
                        </div>
                    </FormRow>
                    <FormRow label={t("vehicle-record-type")}>
                        <div className="flex items-center gap-1 rounded-full bg-ground-muted/70 p-0.5">
                            {RECORD_TYPES.map(({ value, label }) => (
                                <button
                                    key={value}
                                    type="button"
                                    className={cn(
                                        "cursor-pointer rounded-full px-2.5 py-1 text-xs transition-all",
                                        type === value
                                            ? "bg-panel font-medium text-ink shadow-panel"
                                            : "text-ink-secondary",
                                    )}
                                    onClick={() => setType(value)}
                                >
                                    {t(label)}
                                </button>
                            ))}
                        </div>
                    </FormRow>
                    <FormRow label={t("vehicle-record-date")}>
                        <DatePicker
                            type="date"
                            value={time}
                            onChange={(v) => setTime(v)}
                        >
                            <button
                                type="button"
                                className="flex cursor-pointer items-center gap-0.5 text-[15px] text-ink"
                            >
                                {new Date(time).toLocaleDateString()}
                                <RowChevron />
                            </button>
                        </DatePicker>
                    </FormRow>
                    <FormRow label={t("vehicle-odometer")}>
                        <RowInput
                            value={odometerText}
                            inputMode="decimal"
                            placeholder="0"
                            onChange={setOdometerText}
                        />
                    </FormRow>
                    <FormRow label={t("vehicle-cost")}>
                        <RowInput
                            value={costText}
                            inputMode="decimal"
                            placeholder="0"
                            onChange={setCostText}
                        />
                    </FormRow>
                    {type === "fuel" && (
                        <FormRow label={t("vehicle-volume")}>
                            <RowInput
                                value={volumeText}
                                inputMode="decimal"
                                placeholder="0"
                                onChange={setVolumeText}
                            />
                        </FormRow>
                    )}
                    <FormRow label={t("inventory-remark")}>
                        <CountedRowInput value={remark} onChange={setRemark} />
                    </FormRow>
                </FormCard>
            </div>
        </PopupLayout>
    );
}
