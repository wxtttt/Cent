import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLoanPlans } from "@/hooks/use-loan-plans";
import PopupLayout from "@/layouts/popup-layout";
import type { SavedLoanPlan } from "@/ledger/extra-type";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { BTN_PRIMARY, BTN_SECONDARY, SHEET_FOOTER } from "../button-styles";
import { planIconSrc } from "./icons";
import {
    defaultDraft,
    deriveLoan,
    type LoanDraft,
    toDraft,
    toPlanInput,
} from "./model";
import {
    CommercialRateSheet,
    DownPaymentSheet,
    FirstPaySheet,
    FundRateSheet,
    TermSheet,
} from "./pickers";
import { LoanDeleteProvider, showLoanDelete } from "./providers";
import { CompareCard, PrepayCard, ScheduleCard } from "./results";
import { ManageMenu, SavePlanSheet } from "./save-sheet";
import { HeroTicket, SettingsCard, TypeCards } from "./sections";

type SheetKind =
    | "down"
    | "term"
    | "rateCommercial"
    | "rateFund"
    | "firstPay"
    | null;

const fmtWan = (v: number) => `${Math.round(v * 100) / 100}`;

export default function LoanCalculatorForm({
    onCancel,
}: {
    onCancel?: () => void;
}) {
    const t = useIntl();
    const { plans, add, remove, update } = useLoanPlans();

    const [selectedId, setSelectedId] = useState<string | null>(
        plans[0]?.id ?? null,
    );
    const [draft, setDraft] = useState<LoanDraft>(() =>
        plans[0] ? toDraft(plans[0]) : defaultDraft(),
    );
    const [dirty, setDirty] = useState(false);

    const [sheet, setSheet] = useState<SheetKind>(null);
    const [saveSheet, setSaveSheet] = useState<{
        mode: "create" | "rename";
        plan?: SavedLoanPlan;
    } | null>(null);
    const [manageOpen, setManageOpen] = useState(false);
    const longPressTimer = useRef<number | undefined>(undefined);
    const longPressTarget = useRef<SavedLoanPlan | undefined>(undefined);
    const suppressClickRef = useRef(false);
    // 刚保存的方案可能晚一拍才进 plans（updatePersonalMeta 异步落库），
    // 守卫 effect 在 plans 到位前不能把它当成「已被外部删除」
    const addedIdsRef = useRef<Set<string>>(new Set());

    const derived = deriveLoan(draft);
    const selected = plans.find((p) => p.id === selectedId);

    const edit = useCallback((patch: Partial<LoanDraft>) => {
        setDraft((prev) => ({ ...prev, ...patch }));
        setDirty(true);
    }, []);

    const selectPlan = useCallback((plan: SavedLoanPlan) => {
        setSelectedId(plan.id);
        setDraft(toDraft(plan));
        setDirty(false);
    }, []);

    // 已选方案被外部（如另一端同步）删除时回退到草稿态
    useEffect(() => {
        if (
            selectedId &&
            !plans.some((p) => p.id === selectedId) &&
            !addedIdsRef.current.has(selectedId)
        ) {
            setSelectedId(null);
            setDirty(false);
        }
    }, [plans, selectedId]);

    const typeName = t(
        draft.loanType === "commercial"
            ? "loan-type-commercial"
            : draft.loanType === "fund"
              ? "loan-type-fund"
              : "loan-type-combo",
    );
    const defaultName = t("loan-plan-default-name", {
        type: typeName,
        amount: fmtWan(derived.totalWan),
        years: draft.termYears,
    });

    const afterSave = (id: string | undefined) => {
        if (id) {
            addedIdsRef.current.add(id);
            setSelectedId(id);
            setDirty(false);
        }
        toast.success(t("loan-toast-saved"));
    };

    const patchSelected = async () => {
        if (!selected) return;
        await update(
            selected.id,
            toPlanInput(draft, selected.name, selected.icon),
        );
        setDirty(false);
        toast.success(t("loan-toast-saved"));
    };

    const cancelLongPress = () => {
        window.clearTimeout(longPressTimer.current);
    };

    // chip 长按：先切到该方案再弹管理菜单（管理菜单始终作用于当前选中方案）
    const startLongPress = (plan: SavedLoanPlan) => {
        suppressClickRef.current = false;
        longPressTarget.current = plan;
        longPressTimer.current = window.setTimeout(() => {
            suppressClickRef.current = true;
            selectPlan(plan);
            setManageOpen(true);
        }, 550);
    };

    return (
        <PopupLayout
            onBack={onCancel}
            title={t("loan-calculator")}
            className="dp-drawer-surface h-full bg-ground"
            backStyle="circle"
            right={
                selected ? (
                    <button
                        type="button"
                        data-loan-more
                        aria-label={t("loan-manage-open")}
                        className="-mr-1 flex size-10 items-center justify-center rounded-full bg-panel text-ink shadow-[0_1px_6px_rgba(92,62,30,0.10)] transition-colors hover:text-brand active:bg-ground-muted"
                        onClick={() => setManageOpen(true)}
                    >
                        <i className="icon-[lucide--ellipsis] size-5" />
                    </button>
                ) : undefined
            }
        >
            <div className="flex h-full flex-col">
                {/* 子项必须 shrink-0：flex 纵向容器里内容高于视口时，
                    默认 shrink 会把 hero 票券卡压成 40px 高（实测 scrollHeight 222） */}
                <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pt-3 [&>*]:shrink-0">
                    {plans.length > 0 && (
                        <div
                            data-loan-plan-bar
                            className="flex items-center gap-2 overflow-x-auto scrollbar-hidden"
                        >
                            {plans.map((plan) => (
                                <button
                                    key={plan.id}
                                    type="button"
                                    data-loan-plan-chip={plan.id}
                                    className={cn(
                                        "flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-[13px] transition-colors",
                                        selectedId === plan.id
                                            ? "bg-brand text-on-brand dp-text-medium"
                                            : "bg-panel text-ink shadow-[0_1px_5px_rgba(92,62,30,0.08)]",
                                    )}
                                    onClick={() => {
                                        if (suppressClickRef.current) {
                                            suppressClickRef.current = false;
                                            return;
                                        }
                                        selectPlan(plan);
                                    }}
                                    onPointerDown={() => startLongPress(plan)}
                                    onPointerUp={cancelLongPress}
                                    onPointerLeave={cancelLongPress}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        selectPlan(plan);
                                        setManageOpen(true);
                                    }}
                                >
                                    <img
                                        src={planIconSrc(
                                            plan.icon,
                                            draft.loanType,
                                        )}
                                        alt=""
                                        aria-hidden
                                        className="size-5 object-contain"
                                    />
                                    {plan.name}
                                </button>
                            ))}
                            {selectedId === null && (
                                <span
                                    data-loan-draft-chip
                                    className="flex-shrink-0 rounded-full bg-brand px-3 py-2 text-[13px] dp-text-medium text-on-brand"
                                >
                                    {t("loan-plan-new")}
                                </span>
                            )}
                            <button
                                type="button"
                                data-loan-plan-new
                                className="flex flex-shrink-0 cursor-pointer items-center gap-1 rounded-full bg-panel px-3 py-2 text-[13px] text-ink shadow-[0_1px_5px_rgba(92,62,30,0.08)]"
                                onClick={() => {
                                    setSelectedId(null);
                                    setDirty(false);
                                }}
                            >
                                <i className="icon-[lucide--plus] size-3.5" />
                                {t("loan-plan-create")}
                            </button>
                        </div>
                    )}

                    <HeroTicket draft={draft} derived={derived} />

                    <div>
                        <div className="px-1 pb-1.5 text-[12px] text-ink-secondary">
                            {t("loan-settings")}
                        </div>
                        <TypeCards
                            value={draft.loanType}
                            onChange={(loanType) => edit({ loanType })}
                        />
                        <div className="mt-3">
                            <SettingsCard
                                draft={draft}
                                derived={derived}
                                edit={edit}
                                onOpenSheet={(kind) => setSheet(kind)}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="px-1 pb-1.5 text-[12px] text-ink-secondary">
                            {t("loan-analysis-title")}
                        </div>
                        <CompareCard
                            draft={draft}
                            onSelect={(method) => edit({ method })}
                        />
                    </div>

                    <ScheduleCard derived={derived} />

                    {draft.loanType !== "combo" && (
                        <PrepayCard draft={draft} derived={derived} />
                    )}

                    <p className="px-1 pb-2 text-[11px] leading-relaxed text-ink-secondary">
                        {t("loan-page-disclaimer")}
                    </p>
                </div>

                <div className={SHEET_FOOTER}>
                    {selected && dirty ? (
                        <div className="flex gap-2.5">
                            <button
                                type="button"
                                data-loan-save-as
                                className={`${BTN_SECONDARY} flex-1`}
                                onClick={() => setSaveSheet({ mode: "create" })}
                            >
                                {t("loan-save-as-new")}
                            </button>
                            <button
                                type="button"
                                data-loan-save-modify
                                className={`${BTN_PRIMARY} flex-1`}
                                onClick={() => void patchSelected()}
                            >
                                {t("loan-save-modify")}
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            data-loan-save
                            className={`${BTN_PRIMARY} w-full`}
                            onClick={() => setSaveSheet({ mode: "create" })}
                        >
                            {t("loan-save-plan")}
                        </button>
                    )}
                </div>
            </div>

            <TermSheet
                open={sheet === "term"}
                onOpenChange={(v) => setSheet(v ? "term" : null)}
                value={draft.termYears}
                onConfirm={(years) => edit({ termYears: years })}
            />
            <DownPaymentSheet
                open={sheet === "down"}
                onOpenChange={(v) => setSheet(v ? "down" : null)}
                value={draft.downRatio}
                onConfirm={(ratio) => edit({ downRatio: ratio })}
            />
            <FirstPaySheet
                open={sheet === "firstPay"}
                onOpenChange={(v) => setSheet(v ? "firstPay" : null)}
                value={draft.firstPay}
                onConfirm={(firstPay) => edit({ firstPay })}
            />
            <CommercialRateSheet
                open={sheet === "rateCommercial"}
                onOpenChange={(v) => setSheet(v ? "rateCommercial" : null)}
                draft={draft}
                onConfirm={(patch) => edit(patch)}
            />
            <FundRateSheet
                open={sheet === "rateFund"}
                onOpenChange={(v) => setSheet(v ? "rateFund" : null)}
                draft={draft}
                onConfirm={(patch) => edit(patch)}
            />
            <SavePlanSheet
                open={saveSheet !== null}
                mode={saveSheet?.mode ?? "create"}
                draft={draft}
                defaultName={
                    saveSheet?.mode === "rename"
                        ? (saveSheet.plan?.name ?? defaultName)
                        : defaultName
                }
                defaultIcon={saveSheet?.plan?.icon}
                onClose={() => setSaveSheet(null)}
                onConfirm={async (name, icon) => {
                    if (saveSheet?.mode === "rename" && saveSheet.plan) {
                        await update(saveSheet.plan.id, { name, icon });
                        afterSave(saveSheet.plan.id);
                        return;
                    }
                    const id = await add(toPlanInput(draft, name, icon));
                    afterSave(id);
                }}
            />
            <ManageMenu
                open={manageOpen && selected !== undefined}
                planName={selected?.name ?? ""}
                onRename={() =>
                    selected && setSaveSheet({ mode: "rename", plan: selected })
                }
                onDelete={() => {
                    if (!selected) return;
                    const target = selected;
                    showLoanDelete({
                        title: t("loan-manage-delete"),
                        description: t("loan-delete-confirm", {
                            name: target.name,
                        }),
                        onDelete: () => {
                            addedIdsRef.current.delete(target.id);
                            void remove(target.id).then(() => {
                                setSelectedId(null);
                                toast.success(t("loan-toast-deleted"));
                            });
                        },
                    });
                }}
                onClose={() => setManageOpen(false)}
            />
        </PopupLayout>
    );
}
