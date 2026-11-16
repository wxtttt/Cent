import { useEffect, useState } from "react";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { BTN_PRIMARY, SHEET_FOOTER } from "../button-styles";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
} from "../ui/dialog";
import { LOAN_PLAN_ICONS, planIconSrc } from "./icons";
import { deriveLoan, type LoanDraft } from "./model";
import { SHEET_ACTION, SHEET_SURFACE } from "./styles";

const fmtMoney = (v: number) =>
    v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
const fmtWan = (v: number) => `${Math.round(v * 100) / 100}`;

/** 保存方案 / 修改方案共用抽屉：预览摘要 + 名称 + 图标 */
export function SavePlanSheet({
    open,
    mode,
    draft,
    defaultName,
    defaultIcon,
    onConfirm,
    onClose,
}: {
    open: boolean;
    mode: "create" | "rename";
    draft: LoanDraft;
    defaultName: string;
    defaultIcon?: string;
    onConfirm: (name: string, icon?: string) => void;
    onClose: () => void;
}) {
    const t = useIntl();
    const [name, setName] = useState("");
    const [icon, setIcon] = useState<string | undefined>();
    useEffect(() => {
        if (!open) return;
        setName(defaultName);
        setIcon(defaultIcon);
    }, [open, defaultName, defaultIcon]);

    const derived = deriveLoan(draft);
    const typeName = t(
        draft.loanType === "commercial"
            ? "loan-type-commercial"
            : draft.loanType === "fund"
              ? "loan-type-fund"
              : "loan-type-combo",
    );
    const methodLabel =
        derived.method === "installment"
            ? t("loan-hero-monthly")
            : t("loan-hero-first");

    return (
        <Dialog open={open} onOpenChange={(v) => (v ? undefined : onClose())}>
            <DialogPortal>
                <DialogOverlay className="fixed inset-0 z-40 bg-black/50" />
                <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center">
                    <DialogContent
                        from="bottom"
                        data-loan-sheet={mode === "create" ? "save" : "rename"}
                        className={SHEET_SURFACE}
                    >
                        <DialogTitle className="sr-only">
                            {mode === "create"
                                ? t("loan-save-plan")
                                : t("loan-modify-plan")}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {mode === "create"
                                ? t("loan-save-plan")
                                : t("loan-modify-plan")}
                        </DialogDescription>
                        <div className="relative pb-1 pt-3 text-center">
                            <div className="absolute inset-x-0 top-1.5 mx-auto h-1 w-10 rounded-full bg-black/15" />
                            <div className="text-[17px] font-semibold">
                                {mode === "create"
                                    ? t("loan-save-plan")
                                    : t("loan-modify-plan")}
                            </div>
                        </div>
                        <div className="px-4 pt-2 text-center">
                            <div className="text-[15px] font-semibold text-ink tabular-nums">
                                {t("loan-plan-preview", {
                                    type: typeName,
                                    amount: fmtWan(derived.totalWan),
                                    years: draft.termYears,
                                })}
                            </div>
                            <div className="mt-1 text-xs text-ink-secondary tabular-nums">
                                {t(
                                    draft.method === "installment"
                                        ? "loan-method-installment"
                                        : "loan-method-principal",
                                )}{" "}
                                · {methodLabel} ¥
                                {fmtMoney(derived.firstPayment)}
                            </div>
                        </div>
                        <div className="mx-4 mt-4 rounded-2xl bg-panel px-4">
                            <div className="flex min-h-13 items-center gap-2 py-2">
                                <span className="flex-shrink-0 text-[15px] text-ink">
                                    {t("loan-plan-name")}
                                </span>
                                <input
                                    aria-label={t("loan-plan-name")}
                                    value={name}
                                    maxLength={30}
                                    onChange={(e) => setName(e.target.value)}
                                    className="min-w-0 flex-1 cursor-text bg-transparent text-right text-[15px] text-ink outline-none"
                                />
                            </div>
                        </div>
                        <div className="px-4 pt-3">
                            <div className="text-[15px] text-ink">
                                {t("loan-pick-icon")}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {LOAN_PLAN_ICONS.map((key) => (
                                    <button
                                        key={key}
                                        type="button"
                                        aria-label={key}
                                        className={cn(
                                            "size-11 cursor-pointer rounded-2xl border p-1.5 transition-colors",
                                            icon === key
                                                ? "border-brand bg-brand/10"
                                                : "border-transparent bg-panel",
                                        )}
                                        onClick={() =>
                                            setIcon((prev) =>
                                                prev === key ? undefined : key,
                                            )
                                        }
                                    >
                                        <img
                                            src={`/loan/${key}.webp`}
                                            alt=""
                                            aria-hidden
                                            className="size-full object-contain"
                                        />
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    aria-label={t("loan-icon-default")}
                                    className={cn(
                                        "size-11 cursor-pointer rounded-2xl border p-1.5 transition-colors",
                                        icon === undefined
                                            ? "border-brand bg-brand/10"
                                            : "border-transparent bg-panel",
                                    )}
                                    onClick={() => setIcon(undefined)}
                                >
                                    <img
                                        src={planIconSrc(
                                            undefined,
                                            draft.loanType,
                                        )}
                                        alt=""
                                        aria-hidden
                                        className="size-full object-contain"
                                    />
                                </button>
                            </div>
                        </div>
                        <div className={SHEET_FOOTER}>
                            <button
                                type="button"
                                className={cn(BTN_PRIMARY, SHEET_ACTION)}
                                disabled={!name.trim()}
                                onClick={() => {
                                    onConfirm(name.trim(), icon);
                                    onClose();
                                }}
                            >
                                {mode === "create"
                                    ? t("loan-save-plan")
                                    : t("confirm")}
                            </button>
                        </div>
                    </DialogContent>
                </div>
            </DialogPortal>
        </Dialog>
    );
}

/** 方案管理菜单（顶栏 ⋯ / chip 长按共用）：改名 + 删除 */
export function ManageMenu({
    open,
    planName,
    onRename,
    onDelete,
    onClose,
}: {
    open: boolean;
    planName: string;
    onRename: () => void;
    onDelete: () => void;
    onClose: () => void;
}) {
    const t = useIntl();
    return (
        <Dialog open={open} onOpenChange={(v) => (v ? undefined : onClose())}>
            <DialogPortal>
                <DialogOverlay className="fixed inset-0 z-40 bg-black/50" />
                <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center">
                    <DialogContent
                        from="bottom"
                        data-loan-sheet="manage"
                        className={cn(SHEET_SURFACE, "pb-safe")}
                    >
                        <DialogTitle className="sr-only">
                            {planName}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {planName}
                        </DialogDescription>
                        <div className="relative pb-2 pt-3 text-center">
                            <div className="absolute inset-x-0 top-1.5 mx-auto h-1 w-10 rounded-full bg-black/15" />
                            <div className="truncate px-10 text-[15px] font-semibold text-ink">
                                {planName}
                            </div>
                        </div>
                        <div className="px-4 pb-4">
                            <button
                                type="button"
                                data-loan-manage="rename"
                                className="flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-2xl bg-panel text-[15px] dp-text-medium text-ink shadow-[0_1px_5px_rgba(92,62,30,0.06)]"
                                onClick={() => {
                                    onClose();
                                    onRename();
                                }}
                            >
                                {t("loan-manage-rename")}
                            </button>
                            <button
                                type="button"
                                data-loan-manage="delete"
                                className="mt-2 flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-2xl bg-[#fcdada] text-[15px] dp-text-medium text-[#ef4444]"
                                onClick={() => {
                                    onClose();
                                    onDelete();
                                }}
                            >
                                {t("loan-manage-delete")}
                            </button>
                        </div>
                    </DialogContent>
                </div>
            </DialogPortal>
        </Dialog>
    );
}
