import { useCallback } from "react";
import { v4 } from "uuid";
import { useShallow } from "zustand/shallow";
import { loadStorageAPI } from "@/api/storage/dynamic";
import type { Action, Full } from "@/database/stash";
import { useBookStore } from "@/store/book";
import { useUserStore } from "@/store/user";
import type { Vehicle, VehicleRecord } from "@/vehicle/types";
import { getEntryStore } from "./use-entry-items";

const useVehicleState = getEntryStore("vehicle");

/** 一次批量写入 + 刷新，避免删车时逐条触发多次 IndexedDB 往返 */
async function batchWrite(actions: Action<any>[]) {
    if (actions.length === 0) return;
    const { StorageAPI } = await loadStorageAPI();
    const bookId = useBookStore.getState().currentBookId;
    if (!bookId) return;
    await StorageAPI.batchEntry(bookId, "vehicle", actions);
    await useVehicleState.getState().refresh();
}

/** 车辆数据（车辆 + 记录），随账本多人同步。示例数据由「数据管理 → 载入示例数据」统一写入。 */
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

    const updateVehicle = useCallback(async (value: Vehicle) => {
        await useVehicleState.getState().upsert(value);
    }, []);

    /** 删车时连它的记录一起删，避免留下孤儿记录 */
    const removeVehicle = useCallback(async (id: string) => {
        const items = useVehicleState.getState().items as unknown as Full<
            Vehicle | VehicleRecord
        >[];
        const ids = items
            .filter(
                (item) =>
                    item.id === id ||
                    ("vehicleId" in item && item.vehicleId === id),
            )
            .map((item) => item.id);
        await batchWrite(
            ids.map((value) => ({ type: "delete" as const, value })),
        );
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
        updateVehicle,
        removeVehicle,
        addRecord,
        updateRecord,
        removeRecord,
    };
}
