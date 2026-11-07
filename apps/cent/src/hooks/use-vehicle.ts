import { useCallback } from "react";
import { v4 } from "uuid";
import { useShallow } from "zustand/shallow";
import type { Full } from "@/database/stash";
import { useUserStore } from "@/store/user";
import type { Vehicle, VehicleRecord } from "@/vehicle/types";
import { getEntryStore } from "./use-entry-items";

const useVehicleState = getEntryStore("vehicle");

/** 车辆数据（车辆 + 记录），随账本多人同步。 */
export function useVehicle() {
    const userId = useUserStore((state) => state.id);
    const all = useVehicleState(
        useShallow((state) => state.items),
    ) as unknown as Full<Vehicle | VehicleRecord>[];

    const vehicles = all.filter(
        (item): item is Full<Vehicle> => !("vehicleId" in item),
    );
    const records = all.filter(
        (item): item is Full<VehicleRecord> => "vehicleId" in item,
    );

    const addVehicle = useCallback(
        async (value: Omit<Vehicle, "id" | "userId" | "time">) => {
            const id = v4();
            await useVehicleState.getState().upsert({
                ...value,
                id,
                userId,
                time: Date.now(),
            });
            return id;
        },
        [userId],
    );

    const removeVehicle = useCallback(async (id: string) => {
        await useVehicleState.getState().remove(id);
    }, []);

    const addRecord = useCallback(
        async (value: Omit<VehicleRecord, "id" | "userId">) => {
            const id = v4();
            await useVehicleState.getState().upsert({
                ...value,
                id,
                userId,
            });
            return id;
        },
        [userId],
    );

    const updateRecord = useCallback(async (value: VehicleRecord) => {
        await useVehicleState.getState().upsert(value);
    }, []);

    const removeRecord = useCallback(async (id: string) => {
        await useVehicleState.getState().remove(id);
    }, []);

    return {
        vehicles,
        records,
        addVehicle,
        removeVehicle,
        addRecord,
        updateRecord,
        removeRecord,
    };
}
