import { useCallback } from "react";
import { v4 } from "uuid";
import { useShallow } from "zustand/shallow";
import type { Member } from "@/ledger/type";
import { useLedgerStore } from "@/store/ledger";
import { useUserStore } from "@/store/user";

export function useMembers() {
    const members = useLedgerStore(
        useShallow((state) => state.infos?.meta.members ?? []),
    );

    /** 首次导入：WebDAV 没有协作者接口，从账单里出现过的 creatorId 反推（ADR-0003） */
    const ensureMembers = useCallback(async () => {
        const state = useLedgerStore.getState();
        const meta = state.infos?.meta;
        if (!meta) {
            return;
        }
        const existing = new Set((meta.members ?? []).map((m) => String(m.id)));
        const ids = new Set<string>([String(useUserStore.getState().id)]);
        for (const bill of state.bills) {
            ids.add(String(bill.creatorId));
        }
        const creators = state.infos?.creators ?? [];
        const nameOf = (id: string) =>
            creators.find((c) => String(c.id) === id)?.name ?? id;
        const additions: Member[] = [...ids]
            .filter((id) => !existing.has(id))
            .map((id) => ({ id, name: nameOf(id), active: true }));
        if (additions.length === 0) {
            return;
        }
        await useLedgerStore.getState().updateGlobalMeta((prev) => ({
            ...prev,
            members: [...(prev.members ?? []), ...additions],
        }));
    }, []);

    const addMember = useCallback(async (name: string) => {
        const member: Member = { id: v4(), name, active: true };
        await useLedgerStore.getState().updateGlobalMeta((prev) => ({
            ...prev,
            members: [...(prev.members ?? []), member],
        }));
        return member.id;
    }, []);

    const updateMember = useCallback(
        async (id: string, patch: Partial<Omit<Member, "id">>) => {
            await useLedgerStore.getState().updateGlobalMeta((prev) => ({
                ...prev,
                members: (prev.members ?? []).map((m) =>
                    m.id === id ? { ...m, ...patch } : m,
                ),
            }));
        },
        [],
    );

    return { members, ensureMembers, addMember, updateMember };
}
