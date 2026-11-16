import { useEffect, useRef, useState } from "react";
import { v4 } from "uuid";
import { useLoanPlans } from "@/hooks/use-loan-plans";
import PopupLayout from "@/layouts/popup-layout";
import type {
    SavedLoanPlan,
    SavedLoanPrepay,
    SavedLoanRateChange,
} from "@/ledger/extra-type";
import { useIntl } from "@/locale";
import { BTN_PRIMARY } from "../button-styles";
import { LoanDetail } from "./detail";
import { LoanEdit } from "./edit";
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
    FundRateSheet,
    PrepaySheet,
    RateChangeSheet,
    TermSheet,
} from "./pickers";
import { showLoanDelete } from "./providers";
import { LoanMenuSheet, PlanSwitcherSheet, SavePlanSheet } from "./save-sheet";
import { PAGE_FOOTER } from "./styles";

type View = "detail" | "edit";
type ParamSheet = "term" | "rateCommercial" | "rateFund" | "down" | null;

/**
 * 贷款管理页只有两个视图：
 *   detail 还到哪了 / 提前还款 / 利率轨迹 / 还款计划——进来默认落在第一笔
 *   edit   改参数，下半屏即时给还款分析与还款计划预览
 * 不再有列表页；多笔贷款在详情页点标题切换。
 */
export default function LoanCalculatorForm({
    onCancel,
}: {
    onCancel?: () => void;
}) {
    const t = useIntl();
    const { plans, add, remove, update } = useLoanPlans();
    const first = plans[0];

    const [selectedId, setSelectedId] = useState<string | null>(
        first?.id ?? null,
    );
    const [draft, setDraft] = useState<LoanDraft>(() =>
        first ? toDraft(first) : defaultDraft(),
    );
    const [view, setView] = useState<View>(first ? "detail" : "edit");
    // 主动「新增」时不能被自动选中逻辑拉回已有方案
    const [creating, setCreating] = useState(!first);
    const [dirty, setDirty] = useState(false);

    const [paramSheet, setParamSheet] = useState<ParamSheet>(null);
    const [prepaySheet, setPrepaySheet] = useState<{
        item?: SavedLoanPrepay;
    } | null>(null);
    const [rateSheet, setRateSheet] = useState<{
        item?: SavedLoanRateChange;
    } | null>(null);
    const [saveSheet, setSaveSheet] = useState<"create" | "rename" | null>(
        null,
    );
    const [switchOpen, setSwitchOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    // 刚保存的方案可能晚一拍才进 plans（updatePersonalMeta 异步落库），
    // 守卫 effect 在它到位前不能把它当成「已被外部删除」
    const addedIdsRef = useRef<Set<string>>(new Set());

    const derived = deriveLoan(draft);
    const selected = plans.find((p) => p.id === selectedId);

    const edit = (patch: Partial<LoanDraft>) => {
        setDraft((prev) => ({ ...prev, ...patch }));
        setDirty(true);
    };

    const openPlan = (plan: SavedLoanPlan) => {
        setCreating(false);
        setSelectedId(plan.id);
        setDraft(toDraft(plan));
        setDirty(false);
        setView("detail");
    };

    const startCreate = () => {
        setCreating(true);
        setSelectedId(null);
        setDraft(defaultDraft());
        setDirty(false);
        setView("edit");
    };

    const toEmpty = () => {
        setCreating(true);
        setSelectedId(null);
        setDraft(defaultDraft());
        setDirty(false);
        setView("edit");
    };

    // 别处（同步 / 另一台设备）删掉了当前方案：落到剩下第一笔，没有就回新建。
    // openPlan / toEmpty 每次渲染都是新函数，放进依赖会变成死循环。
    // biome-ignore lint/correctness/useExhaustiveDependencies: 只跟随 plans / selectedId
    useEffect(() => {
        if (selectedId && !plans.some((p) => p.id === selectedId)) {
            if (addedIdsRef.current.has(selectedId)) return;
            if (plans.length > 0) openPlan(plans[0]);
            else toEmpty();
            return;
        }
        if (!selectedId && !creating && plans.length > 0) openPlan(plans[0]);
    }, [plans, selectedId, creating]);

    /** 详情页上的即时改动（提前还款 / 利率调整）直接落库，重算进度与还款计划 */
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
            if (selected) {
                setDraft(toDraft(selected));
                setDirty(false);
                setView("detail");
                return;
            }
            if (plans.length > 0) {
                openPlan(plans[0]);
                return;
            }
        }
        onCancel?.();
    };

    const saveEdit = async () => {
        if (selected) {
            await update(
                selected.id,
                toPlanInput(draft, selected.name, selected.icon),
            );
            setDirty(false);
            setView("detail");
            return;
        }
        setSaveSheet("create");
    };

    const confirmDelete = (plan: SavedLoanPlan) => {
        showLoanDelete({
            title: t("loan-manage-delete"),
            description: t("loan-delete-confirm", { name: plan.name }),
            onDelete: () => {
                addedIdsRef.current.delete(plan.id);
                void remove(plan.id).then(() => {
                    const rest = plans.filter((p) => p.id !== plan.id);
                    if (rest.length > 0) openPlan(rest[0]);
                    else toEmpty();
                });
            },
        });
    };

    return (
        <PopupLayout
            onBack={goBack}
            title={t("loan-calculator")}
            className="dp-drawer-surface h-full bg-ground"
            backStyle="circle"
            right={
                view === "detail" && selected ? (
                    <button
                        type="button"
                        data-loan-more
                        aria-label={t("loan-manage-open")}
                        className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-panel text-ink shadow-[0_1px_6px_rgba(92,62,30,0.10)] transition-colors hover:text-brand active:bg-ground-muted"
                        onClick={() => setMenuOpen(true)}
                    >
                        <i className="icon-[lucide--ellipsis] size-5" />
                    </button>
                ) : undefined
            }
        >
            {view === "detail" && (
                <LoanDetail
                    plan={selected}
                    plans={plans}
                    draft={draft}
                    derived={derived}
                    onPickPlan={() => setSwitchOpen(true)}
                    onRename={() => setSaveSheet("rename")}
                    onAddPrepay={() => setPrepaySheet({})}
                    onEditPrepay={(item) => setPrepaySheet({ item })}
                    onAddRate={() => setRateSheet({})}
                    onEditRate={(item) => setRateSheet({ item })}
                />
            )}

            {view === "edit" && (
                <>
                    <LoanEdit
                        draft={draft}
                        derived={derived}
                        edit={edit}
                        onOpenSheet={(kind) => setParamSheet(kind)}
                        onOpenDown={() => setParamSheet("down")}
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
                open={paramSheet === "term"}
                onOpenChange={(v) => setParamSheet(v ? "term" : null)}
                value={draft.termYears}
                onConfirm={(years) => edit({ termYears: years })}
            />
            <CommercialRateSheet
                open={paramSheet === "rateCommercial"}
                onOpenChange={(v) => setParamSheet(v ? "rateCommercial" : null)}
                draft={draft}
                onConfirm={(patch) => edit(patch)}
            />
            <FundRateSheet
                open={paramSheet === "rateFund"}
                onOpenChange={(v) => setParamSheet(v ? "rateFund" : null)}
                draft={draft}
                onConfirm={(patch) => edit(patch)}
            />
            <DownPaymentSheet
                open={paramSheet === "down"}
                onOpenChange={(v) => setParamSheet(v ? "down" : null)}
                draft={draft}
                onConfirm={(patch) => edit(patch)}
            />

            <PrepaySheet
                open={prepaySheet !== null}
                onOpenChange={(v) =>
                    setPrepaySheet(v ? (prepaySheet ?? {}) : null)
                }
                draft={draft}
                initial={prepaySheet?.item}
                onConfirm={(v) => {
                    const item = prepaySheet?.item;
                    const next: SavedLoanPrepay = {
                        id: item?.id ?? v4(),
                        year: v.year,
                        month: v.month,
                        amount: Math.round(v.amountWan * 10000),
                        mode: v.mode,
                    };
                    void persist({
                        ...draft,
                        prepays: item
                            ? draft.prepays.map((p) =>
                                  p.id === item.id ? next : p,
                              )
                            : [...draft.prepays, next],
                    });
                }}
                onDelete={
                    prepaySheet?.item
                        ? () => {
                              const target = prepaySheet.item!;
                              // 先收抽屉再弹确认：两层 Radix 弹层叠在一起时，
                              // 下层遮罩会盖住确认弹层的按钮
                              setPrepaySheet(null);
                              showLoanDelete({
                                  title: t("loan-prepay-delete"),
                                  description: t("loan-prepay-delete-desc"),
                                  onDelete: () => {
                                      void persist({
                                          ...draft,
                                          prepays: draft.prepays.filter(
                                              (p) => p.id !== target.id,
                                          ),
                                      });
                                  },
                              });
                          }
                        : undefined
                }
            />
            <RateChangeSheet
                open={rateSheet !== null}
                onOpenChange={(v) => setRateSheet(v ? (rateSheet ?? {}) : null)}
                draft={draft}
                initial={rateSheet?.item}
                onConfirm={(v) => {
                    const item = rateSheet?.item;
                    const next: SavedLoanRateChange = {
                        id: item?.id ?? v4(),
                        ...v,
                    };
                    void persist({
                        ...draft,
                        rateChanges: item
                            ? draft.rateChanges.map((r) =>
                                  r.id === item.id ? next : r,
                              )
                            : [...draft.rateChanges, next],
                    });
                }}
                onDelete={
                    rateSheet?.item
                        ? () => {
                              const target = rateSheet.item!;
                              setRateSheet(null);
                              showLoanDelete({
                                  title: t("loan-rate-delete"),
                                  description: t("loan-rate-delete-desc"),
                                  onDelete: () => {
                                      void persist({
                                          ...draft,
                                          rateChanges: draft.rateChanges.filter(
                                              (r) => r.id !== target.id,
                                          ),
                                      });
                                  },
                              });
                          }
                        : undefined
                }
            />

            <SavePlanSheet
                open={saveSheet !== null}
                mode={saveSheet ?? "create"}
                draft={draft}
                defaultName={
                    saveSheet === "rename"
                        ? (selected?.name ?? defaultName)
                        : defaultName
                }
                defaultIcon={
                    saveSheet === "rename" ? selected?.icon : undefined
                }
                onClose={() => setSaveSheet(null)}
                onConfirm={async (name, icon) => {
                    if (saveSheet === "rename" && selected) {
                        await update(selected.id, { name, icon });
                        setDraft((prev) => ({ ...prev }));
                        return;
                    }
                    const id = await add(toPlanInput(draft, name, icon));
                    if (id) {
                        addedIdsRef.current.add(id);
                        setSelectedId(id);
                        setCreating(false);
                        setDirty(false);
                        setView("detail");
                    }
                }}
            />

            <PlanSwitcherSheet
                open={switchOpen}
                plans={plans}
                activeId={selectedId ?? undefined}
                onPick={openPlan}
                onCreate={startCreate}
                onClose={() => setSwitchOpen(false)}
            />

            <LoanMenuSheet
                open={menuOpen && selected !== undefined}
                planName={selected?.name ?? ""}
                items={[
                    {
                        key: "edit",
                        label: t("loan-edit-settings"),
                        onClick: () => setView("edit"),
                    },
                    {
                        key: "delete",
                        label: t("loan-manage-delete"),
                        danger: true,
                        onClick: () => selected && confirmDelete(selected),
                    },
                ]}
                onClose={() => setMenuOpen(false)}
            />
        </PopupLayout>
    );
}
