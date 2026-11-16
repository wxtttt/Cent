import { useEffect, useState } from "react";
import type { SavedLoanPlan } from "@/ledger/extra-type";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { BTN_PRIMARY, BTN_SECONDARY, SHEET_FOOTER } from "../button-styles";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
} from "../ui/dialog";
import { LOAN_PLAN_ICONS, planIconSrc } from "./icons";
import { deriveLoan, type LoanDraft, toDraft } from "./model";
import { fmtMoney, fmtMoneyInt } from "./results";
import { SHEET_SURFACE } from "./styles";

const fmtWan = (v: number) => `${Math.round(v * 100) / 100}`;
/**
 * 保存方案抽屉：照 APK 的形态——
 * 上方一张「方案摘要卡」，中间名称输入，下面图标横向滑动（右侧渐隐，不做进度条），
 * 底部一颗整宽主按钮。保存成功后直接关抽屉，不再弹一条「已保存」的 toast。
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
    const methodName = t(
        draft.method === "installment"
            ? "loan-method-installment"
            : "loan-method-principal",
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
                            "flex max-h-[88dvh] flex-col",
                        )}
                    >
                        <DialogTitle className="sr-only">
                            {mode === "create"
                                ? t("loan-save-plan")
                                : t("loan-manage-rename")}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {mode === "create"
                                ? t("loan-save-plan")
                                : t("loan-manage-rename")}
                        </DialogDescription>

                        <div className="relative pb-1 pt-3 text-center">
                            <div className="absolute inset-x-0 top-1.5 mx-auto h-1 w-10 rounded-full bg-black/15" />
                            <div className="text-[17px] font-semibold text-ink">
                                {mode === "create"
                                    ? t("loan-save-plan")
                                    : t("loan-manage-rename")}
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-2">
                            {/* 方案摘要：图标跟着所选图标走 */}
                            <div className="flex items-center gap-3 rounded-2xl bg-panel px-4 py-3">
                                <img
                                    src={planIconSrc(icon, draft.loanType)}
                                    alt=""
                                    aria-hidden
                                    className="size-10 flex-shrink-0 object-contain"
                                />
                                <div className="min-w-0">
                                    <div className="truncate text-[15px] dp-text-medium text-ink tabular-nums">
                                        {t("loan-plan-preview", {
                                            type: typeName,
                                            amount: fmtWan(derived.totalWan),
                                            years: draft.termYears,
                                        })}
                                    </div>
                                    <div className="mt-0.5 truncate text-[12px] text-ink-secondary tabular-nums">
                                        {methodName} · {t("loan-hero-monthly")}{" "}
                                        ¥{fmtMoney(derived.firstPayment)}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 text-[13px] text-ink-secondary">
                                {t("loan-plan-name")}
                            </div>
                            <input
                                aria-label={t("loan-plan-name")}
                                value={name}
                                maxLength={30}
                                placeholder={t("loan-plan-name-placeholder")}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-2 w-full rounded-2xl bg-panel px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-secondary/60"
                            />

                            <div className="mt-4 text-[13px] text-ink-secondary">
                                {t("loan-pick-icon")}
                            </div>
                            {/* 横向滑动 + 右侧渐隐即可，不加进度条 */}
                            <div className="-mx-5 mt-2">
                                <div className="scrollbar-hidden flex gap-2.5 overflow-x-auto px-5 pb-1 [mask-image:linear-gradient(to_right,black_84%,transparent)]">
                                    {[undefined, ...LOAN_PLAN_ICONS].map(
                                        (key) => (
                                            <button
                                                key={key ?? "default"}
                                                type="button"
                                                aria-label={
                                                    key ??
                                                    t("loan-icon-default")
                                                }
                                                className={cn(
                                                    "flex size-12 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border-2 bg-ground-muted p-2 transition-colors",
                                                    icon === key
                                                        ? "border-brand bg-brand/10"
                                                        : "border-transparent",
                                                )}
                                                onClick={() => setIcon(key)}
                                            >
                                                <img
                                                    src={planIconSrc(
                                                        key,
                                                        draft.loanType,
                                                    )}
                                                    alt=""
                                                    aria-hidden
                                                    className="size-full object-contain"
                                                />
                                            </button>
                                        ),
                                    )}
                                </div>
                            </div>
                            <div className="h-4" />
                        </div>

                        <div className="px-5 pb-[calc(20px+var(--safe-area-inset-bottom))] pt-2">
                            <button
                                type="button"
                                className={cn(BTN_PRIMARY, "w-full")}
                                disabled={!name.trim()}
                                onClick={() => {
                                    onConfirm(name.trim(), icon);
                                    onClose();
                                }}
                            >
                                {t("save")}
                            </button>
                        </div>
                    </DialogContent>
                </div>
            </DialogPortal>
        </Dialog>
    );
}

/** 方案选择抽屉：多笔贷款时点标题切换，底部可以再记一笔 */
export function PlanSwitcherSheet({
    open,
    plans,
    activeId,
    onPick,
    onCreate,
    onClose,
}: {
    open: boolean;
    plans: SavedLoanPlan[];
    activeId?: string;
    onPick: (plan: SavedLoanPlan) => void;
    onCreate: () => void;
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
                        data-loan-sheet="switch"
                        className={cn(
                            SHEET_SURFACE,
                            "flex max-h-[80dvh] flex-col",
                        )}
                    >
                        <DialogTitle className="sr-only">
                            {t("loan-plan-switch")}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {t("loan-plan-switch")}
                        </DialogDescription>
                        <div className="relative pb-1 pt-3 text-center">
                            <div className="absolute inset-x-0 top-1.5 mx-auto h-1 w-10 rounded-full bg-black/15" />
                            <div className="text-[17px] font-semibold text-ink">
                                {t("loan-plan-switch")}
                            </div>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-2">
                            <div className="divide-y divide-rule/60 rounded-2xl bg-panel px-4">
                                {plans.map((p) => {
                                    const d = deriveLoan(toDraft(p));
                                    const active = p.id === activeId;
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            data-loan-switch-item={p.id}
                                            className="flex w-full cursor-pointer items-center gap-3 py-3 text-left"
                                            onClick={() => {
                                                onPick(p);
                                                onClose();
                                            }}
                                        >
                                            <img
                                                src={planIconSrc(
                                                    p.icon,
                                                    p.loanType,
                                                )}
                                                alt=""
                                                aria-hidden
                                                className="size-9 flex-shrink-0 object-contain"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-[15px] text-ink">
                                                    {p.name}
                                                </div>
                                                <div className="mt-0.5 truncate text-[11px] text-ink-secondary tabular-nums">
                                                    {t("loan-hero-monthly")} ¥
                                                    {fmtMoney(
                                                        d.next?.payment ??
                                                            d.firstPayment,
                                                    )}{" "}
                                                    · {t("loan-col-remaining")}{" "}
                                                    ¥
                                                    {fmtMoneyInt(
                                                        d.remainingPrincipal,
                                                    )}
                                                </div>
                                            </div>
                                            {active ? (
                                                <i className="icon-[lucide--check] size-4 flex-shrink-0 text-brand" />
                                            ) : (
                                                <i className="icon-[lucide--chevron-right] size-4 flex-shrink-0 text-ink-secondary" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className={cn(SHEET_FOOTER, "border-t-0")}>
                            <button
                                type="button"
                                data-loan-plan-new
                                className={cn(BTN_SECONDARY, "w-full")}
                                onClick={() => {
                                    onCreate();
                                    onClose();
                                }}
                            >
                                {t("loan-plan-new")}
                            </button>
                        </div>
                    </DialogContent>
                </div>
            </DialogPortal>
        </Dialog>
    );
}

/** 标题右侧 ⋯ 的动作菜单：编辑贷款参数 / 删除贷款 */
export function LoanMenuSheet({
    open,
    planName,
    items,
    onClose,
}: {
    open: boolean;
    planName: string;
    items: {
        key: string;
        label: string;
        danger?: boolean;
        onClick: () => void;
    }[];
    onClose: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={(v) => (v ? undefined : onClose())}>
            <DialogPortal>
                <DialogOverlay className="fixed inset-0 z-40 bg-black/50" />
                <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center">
                    <DialogContent
                        from="bottom"
                        data-loan-sheet="menu"
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
                            {items.map((item, i) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    data-loan-menu={item.key}
                                    className={cn(
                                        "flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-2xl text-[15px] dp-text-medium shadow-[0_1px_5px_rgba(92,62,30,0.06)]",
                                        item.danger
                                            ? "bg-[#fcdada] text-[#ef4444]"
                                            : "bg-panel text-ink",
                                        i > 0 && "mt-2",
                                    )}
                                    onClick={() => {
                                        onClose();
                                        item.onClick();
                                    }}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </DialogContent>
                </div>
            </DialogPortal>
        </Dialog>
    );
}
