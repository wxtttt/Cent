import { useEffect, useState } from "react";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { BTN_PRIMARY, BTN_SECONDARY } from "../button-styles";
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
import { SHEET_SURFACE } from "./styles";

const fmtMoney = (v: number) =>
    v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
const fmtWan = (v: number) => `${Math.round(v * 100) / 100}`;

/**
 * 保存方案抽屉：与全站底部抽屉同构——
 * 顶部拖拽条 + 居中标题 + 可滚动内容 + 「取消 / 保存」双按钮底栏。
 * 之前只有单个按钮、内容贴边、没有滚动上限，和预算抽屉完全是两套观感。
 */
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

    return (
        <Dialog open={open} onOpenChange={(v) => (v ? undefined : onClose())}>
            <DialogPortal>
                <DialogOverlay className="fixed inset-0 z-40 bg-black/50" />
                <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center">
                    <DialogContent
                        from="bottom"
                        data-loan-sheet={mode === "create" ? "save" : "rename"}
                        className={cn(
                            SHEET_SURFACE,
                            "flex max-h-[80dvh] flex-col",
                        )}
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

                        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3">
                            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-secondary/40" />
                            <h2 className="text-center text-[17px] text-ink">
                                {mode === "create"
                                    ? t("loan-save-plan")
                                    : t("loan-modify-plan")}
                            </h2>
                            <p className="mt-1.5 text-center text-[12px] leading-relaxed text-ink-secondary tabular-nums">
                                {t("loan-plan-preview", {
                                    type: typeName,
                                    amount: fmtWan(derived.totalWan),
                                    years: draft.termYears,
                                })}
                                {" · "}
                                {t("loan-hero-monthly")} ¥
                                {fmtMoney(derived.firstPayment)}
                            </p>

                            <div className="mt-5 rounded-2xl bg-panel px-4">
                                <div className="flex min-h-13 items-center gap-2 py-2">
                                    <span className="flex-shrink-0 text-[15px] text-ink">
                                        {t("loan-plan-name")}
                                    </span>
                                    <input
                                        aria-label={t("loan-plan-name")}
                                        value={name}
                                        maxLength={30}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                        className="min-w-0 flex-1 cursor-text bg-transparent text-right text-[15px] text-ink outline-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <div className="text-[13px] text-ink-secondary">
                                    {t("loan-pick-icon")}
                                </div>
                                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                                    {LOAN_PLAN_ICONS.map((key) => (
                                        <button
                                            key={key}
                                            type="button"
                                            aria-label={key}
                                            className={cn(
                                                "size-11 flex-shrink-0 cursor-pointer rounded-2xl border p-1.5 transition-colors",
                                                icon === key
                                                    ? "border-brand bg-brand/10"
                                                    : "border-transparent bg-panel",
                                            )}
                                            onClick={() =>
                                                setIcon((prev) =>
                                                    prev === key
                                                        ? undefined
                                                        : key,
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
                                            "size-11 flex-shrink-0 cursor-pointer rounded-2xl border p-1.5 transition-colors",
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
                            <div className="h-4" />
                        </div>

                        <div className="border-t border-rule/70 bg-ground px-5 pt-3 pb-[calc(20px+var(--safe-area-inset-bottom))]">
                            <div className="flex gap-2.5">
                                <button
                                    type="button"
                                    className={cn(BTN_SECONDARY, "flex-1")}
                                    onClick={onClose}
                                >
                                    {t("cancel")}
                                </button>
                                <button
                                    type="button"
                                    className={cn(BTN_PRIMARY, "flex-1")}
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
                        </div>
                    </DialogContent>
                </div>
            </DialogPortal>
        </Dialog>
    );
}

/** 方案管理菜单（详情页 ⋯ / 卡片长按共用）：改名 + 删除 */
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
                            <div className="truncate px-10 text-[15px] dp-text-medium text-ink">
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
