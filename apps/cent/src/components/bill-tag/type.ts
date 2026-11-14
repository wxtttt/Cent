import type { BillTag } from "@/ledger/type";

export type { BillTag };

export type EditTag = Omit<BillTag, "id"> & { id?: string };
