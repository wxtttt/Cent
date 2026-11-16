import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { v4 } from "uuid";
import { useLoanPlans } from "@/hooks/use-loan-plans";
import PopupLayout from "@/layouts/popup-layout";
import type { SavedLoanPlan } from "@/ledger/extra-type";
import { useIntl } from "@/locale";
import { BTN_PRIMARY } from "../button-styles";
import { LoanDetail } from "./detail";
import { LoanEdit } from "./edit";
import { LoanEmptyState, LoanPlanCard } from "./list";
import {
    defaultDraft,
    deriveLoan,
    type LoanDraft,
    toDraft,
    toPlanInput,
} from "./model";
import {
    CommercialRateSheet,
    FundRateSheet,
    PrepaySheet,
    RateChangeSheet,
    TermSheet,
} from "./pickers";
import { LoanDeleteProvider, showLoanDelete } from "./providers";
import { ManageMenu, SavePlanSheet } from "./save-sheet";
import { PAGE_FOOTER } from "./styles";

type View = "list" | "detail" | "edit";
type SheetKind =
    | "term"
    | "rateCommercial"
    | "rateFund"
    | "prepay"
    | "rateChange"
    | null;

/**
 * 贷款页的三个视图：
 *   list   已存方案卡片（月供 / 进度 / 剩余本金都摊在卡面）
 *   detail 还款进度 + 还款计划 + 提前还款 + 利率轨迹（不再放设置项）
 *   edit   只改参数，保存后回详情
 */
export default function LoanCalculatorForm({
    onCancel,
}: {
    onCancel?: () => void;
}) {
    const t = useIntl();
    const { plans, add, remove, update } = useLoanPlans();

    const [view, setView] = useState<View>("list");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [draft, setDraft] = useState<LoanDraft>(() => defaultDraft());
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
    const locked = draft.prepays.length > 0;

    const edit = (patch: Partial<LoanDraft>) => {
        setDraft((prev) => ({ ...prev, ...patch }));
        setDirty(true);
    };

    const openPlan = (plan: SavedLoanPlan) => {
        setSelectedId(plan.id);
        setDraft(toDraft(plan));
        setDirty(false);
        setView("detail");
    };

    const startCreate = () => {
        setSelectedId(null);
        setDraft(defaultDraft());
        setDirty(false);
        setView("edit");
    };

    // 已选方案被外部（如另一端同步）删除时回列表
    useEffect(() => {
        if (
            view === "detail" &&
            selectedId &&
            !plans.some((p) => p.id === selectedId) &&
            !addedIdsRef.current.has(selectedId)
        ) {
            setView("list");
            setSelectedId(null);
        }
    }, [plans, selectedId, view]);

    /** 详情页上的即时改动（提前还款 / 利率调整）直接落库，重算进度 */
    const persist = async (next: LoanDraft) => {
        setDraft(next);
        if (selected) {
            await update(
                selected.id,
                toPlanInput(next, selected.name, selected.icon),
            );
        }
    };

    const typeName = t(
        draft.loanType === "commercial"
            ? "loan-type-commercial"
            : draft.loanType === "fund"
              ? "loan-type-fund"
              : "loan-type-combo",
    );
    const defaultName = t("loan-plan-default-name", {
        type: typeName,
        amount: `${Math.round(derived.totalWan * 100) / 100}`,
        years: draft.termYears,
    });

    const goBack = () => {
        if (view === "edit") {
            setView(selectedId ? "detail" : "list");
            return;
        }
        if (view === "detail") {
            setView("list");
            return;
        }
        onCancel?.();
    };

    const startEdit = () => {
        if (locked) {
            toast.info(t("loan-locked-toast"));
            return;
        }
        setView("edit");
    };

    const saveEdit = async () => {
        if (selected) {
            await update(
                selected.id,
                toPlanInput(draft, selected.name, selected.icon),
            );
            setDirty(false);
            setView("detail");
            toast.success(t("loan-toast-saved"));
            return;
        }
        setSaveSheet({ mode: "create" });
    };

    const cancelLongPress = () => {
        window.clearTimeout(longPressTimer.current);
    };

    const startLongPress = (plan: SavedLoanPlan) => {
        suppressClickRef.current = false;
        longPressTarget.current = plan;
        longPressTimer.current = window.setTimeout(() => {
            suppressClickRef.current = true;
            setSelectedId(plan.id);
            setDraft(toDraft(plan));
            setView("detail");
            setManageOpen(true);
        }, 550);
    };

    const title =
        view === "list"
            ? t("loan-calculator")
            : view === "edit"
              ? selected
                  ? t("loan-modify-plan")
                  : t("loan-plan-create")
              : (selected?.name ?? t("loan-calculator"));

    const right =
        view === "detail" && selected ? (
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    data-loan-edit
                    aria-label={t("loan-edit-settings")}
                    className="-mr-1 flex size-10 items-center justify-center rounded-full bg-panel text-ink shadow-[0_1px_6px_rgba(92,62,30,0.10)] transition-colors hover:text-brand active:bg-ground-muted"
                    onClick={startEdit}
                >
                    <i className="icon-[lucide--pencil] size-4.5" />
                </button>
                <button
                    type="button"
                    data-loan-more
                    aria-label={t("loan-manage-open")}
                    className="-mr-1 flex size-10 items-center justify-center rounded-full bg-panel text-ink shadow-[0_1px_6px_rgba(92,62,30,0.10)] transition-colors hover:text-brand active:bg-ground-muted"
                    onClick={() => setManageOpen(true)}
                >
                    <i className="icon-[lucide--ellipsis] size-5" />
                </button>
            </div>
        ) : undefined;

    return (
        <PopupLayout
            onBack={goBack}
            title={title}
            className="dp-drawer-surface h-full bg-ground"
            backStyle="circle"
            right={right}
        >
            {view === "list" && (
                <div className="flex h-full flex-col">
                    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pt-3 pb-4 [&>*]:shrink-0">
                        {plans.length === 0 ? (
                            <LoanEmptyState onCreate={startCreate} />
                        ) : (
                            plans.map((plan) => (
                                <LoanPlanCard
                                    key={plan.id}
                                    plan={plan}
                                    onOpen={() => {
                                        if (suppressClickRef.current) {
                                            suppressClickRef.current = false;
                                            return;
                                        }
                                        openPlan(plan);
                                    }}
                                    onManage={() => {
                                        setSelectedId(plan.id);
                                        setDraft(toDraft(plan));
                                        setManageOpen(true);
                                    }}
                                    onLongPressStart={() =>
                                        startLongPress(plan)
                                    }
                                    onLongPressEnd={cancelLongPress}
                                />
                            ))
                        )}
                    </div>
                    {plans.length > 0 && (
                        <div className={PAGE_FOOTER}>
                            <button
                                type="button"
                                data-loan-plan-new
                                className={`${BTN_PRIMARY} w-full`}
                                onClick={startCreate}
                            >
                                {t("loan-plan-new")}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {view === "detail" && (
                <LoanDetail
                    draft={draft}
                    derived={derived}
                    onAddPrepay={() => setSheet("prepay")}
                    onRemovePrepay={(id) => {
                        showLoanDelete({
                            title: t("loan-prepay-delete"),
                            description: t("loan-prepay-delete-desc"),
                            onDelete: () => {
                                void persist({
                                    ...draft,
                                    prepays: draft.prepays.filter(
                                        (p) => p.id !== id,
                                    ),
                                });
                            },
                        });
                    }}
                    onAddRate={() => setSheet("rateChange")}
                    onRemoveRate={(id) => {
                        showLoanDelete({
                            title: t("loan-rate-delete"),
                            description: t("loan-rate-delete-desc"),
                            onDelete: () => {
                                void persist({
                                    ...draft,
                                    rateChanges: draft.rateChanges.filter(
                                        (r) => r.id !== id,
                                    ),
                                });
                            },
                        });
                    }}
                />
            )}

            {view === "edit" && (
                <>
                    <LoanEdit
                        draft={draft}
                        derived={derived}
                        edit={edit}
                        onOpenSheet={(kind) => setSheet(kind)}
                    />
                    <div className={PAGE_FOOTER}>
                        <button
                            type="button"
                            data-loan-save
                            className={`${BTN_PRIMARY} w-full`}
                            onClick={() => void saveEdit()}
                        >
                            {selected && dirty
                                ? t("loan-save-modify")
                                : t("loan-save-plan")}
                        </button>
                    </div>
                </>
            )}

            <TermSheet
                open={sheet === "term"}
                onOpenChange={(v) => setSheet(v ? "term" : null)}
                value={draft.termYears}
                onConfirm={(years) => edit({ termYears: years })}
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
            <PrepaySheet
                open={sheet === "prepay"}
                onOpenChange={(v) => setSheet(v ? "prepay" : null)}
                draft={draft}
                onConfirm={(v) => {
                    void persist({
                        ...draft,
                        prepays: [
                            ...draft.prepays,
                            {
                                id: v4(),
                                year: v.year,
                                month: v.month,
                                amount: Math.round(v.amountWan * 10000),
                                mode: v.mode,
                            },
                        ],
                    });
                }}
            />
            <RateChangeSheet
                open={sheet === "rateChange"}
                onOpenChange={(v) => setSheet(v ? "rateChange" : null)}
                draft={draft}
                onConfirm={(v) => {
                    void persist({
                        ...draft,
                        rateChanges: [...draft.rateChanges, { id: v4(), ...v }],
                    });
                }}
            />
            <SavePlanSheet
                open={saveSheet !== null}
                mode={saveSheet?.mode ?? "create"}
                draft={draft}
                defaultName={
                    saveSheet?.mode === "rename"
                        ? (saveSheet?.plan?.name ?? defaultName)
                        : defaultName
                }
                defaultIcon={saveSheet?.plan?.icon}
                onClose={() => setSaveSheet(null)}
                onConfirm={async (name, icon) => {
                    if (saveSheet?.mode === "rename" && saveSheet.plan) {
                        await update(saveSheet.plan.id, { name, icon });
                        if (selectedId === saveSheet.plan.id) {
                            setDraft((prev) => ({ ...prev }));
                        }
                        toast.success(t("loan-toast-saved"));
                        return;
                    }
                    const id = await add(toPlanInput(draft, name, icon));
                    if (id) {
                        addedIdsRef.current.add(id);
                        setSelectedId(id);
                        setDirty(false);
                        setView("detail");
                    }
                    toast.success(t("loan-toast-saved"));
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
                                setView("list");
                                toast.success(t("loan-toast-deleted"));
                            });
                        },
                    });
                }}
                onClose={() => setManageOpen(false)}
            />
            <LoanDeleteProvider />
        </PopupLayout>
    );
}
