import type { Budget } from "@/ledger/type";

export type { Budget };

export type EditBudget = Omit<Budget, "id"> & { id?: string };
