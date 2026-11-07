import { useCallback } from "react";
import { v4 } from "uuid";
import { useShallow } from "zustand/shallow";
import type { Full } from "@/database/stash";
import type {
    MedicalEntity,
    MedicalMedicine,
    MedicalProfile,
    MedicalVisit,
} from "@/medical/types";
import { useUserStore } from "@/store/user";
import { getEntryStore } from "./use-entry-items";

const useMedicalState = getEntryStore("medical");

const me = () => useUserStore.getState().id;

/** 家庭医疗数据（成员档案 + 药箱 + 就诊记录）的响应式列表。 */
export function useMedical() {
    const all = useMedicalState(
        useShallow((state) => state.items),
    ) as unknown as Full<MedicalEntity>[];

    const profiles = all.filter(
        (item): item is Full<MedicalProfile> => item.entity === "profile",
    );
    const medicines = all.filter(
        (item): item is Full<MedicalMedicine> => item.entity === "medicine",
    );
    const visits = all.filter(
        (item): item is Full<MedicalVisit> => item.entity === "visit",
    );

    return { profiles, medicines, visits };
}

// —— 变更操作：不依赖组件上下文，页面与回调里直接调用 ——

export async function addMedicalProfile(
    value: Omit<MedicalProfile, "id" | "userId" | "time" | "entity">,
) {
    const id = v4();
    await useMedicalState.getState().upsert({
        ...value,
        entity: "profile",
        id,
        userId: me(),
        time: Date.now(),
    });
    return id;
}

export async function updateMedicalProfile(value: MedicalProfile) {
    await useMedicalState.getState().upsert(value);
}

export async function removeMedicalProfile(id: string) {
    await useMedicalState.getState().remove(id);
}

export async function addMedicalMedicine(
    value: Omit<MedicalMedicine, "id" | "userId" | "time" | "entity">,
) {
    const id = v4();
    await useMedicalState.getState().upsert({
        ...value,
        entity: "medicine",
        id,
        userId: me(),
        time: Date.now(),
    });
    return id;
}

export async function updateMedicalMedicine(value: MedicalMedicine) {
    await useMedicalState.getState().upsert(value);
}

export async function removeMedicalMedicine(id: string) {
    await useMedicalState.getState().remove(id);
}

export async function addMedicalVisit(
    value: Omit<MedicalVisit, "id" | "userId" | "entity">,
) {
    const id = v4();
    await useMedicalState.getState().upsert({
        ...value,
        entity: "visit",
        id,
        userId: me(),
    });
    return id;
}

export async function updateMedicalVisit(value: MedicalVisit) {
    await useMedicalState.getState().upsert(value);
}

export async function removeMedicalVisit(id: string) {
    await useMedicalState.getState().remove(id);
}

// 兼容旧引用（部分页面仍以 hook 形式取 add/update）
export function useMedicalActions() {
    const addProfile = useCallback(addMedicalProfile, []);
    const removeProfile = useCallback(removeMedicalProfile, []);
    return { addProfile, removeProfile };
}
