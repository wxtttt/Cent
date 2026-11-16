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
    LoanSheetProvider,
    type LoanSheetResult,
    type LoanSheetValue,
    showLoanDelete,
    showLoanSheet,
} from "./sheets";
import { PAGE_FOOTER } from "./styles";

type View = "detail" | "edit";

/** 取消抽屉会 reject，这里统一吞掉，返回 undefined */
const openSheet = (
    value: LoanSheetValue,
): Promise<LoanSheetResult | undefined> =>
    showLoanSheet(value).catch(() => undefined);

/**
 * 贷款管理页只有两个视图：
 *   detail 还到哪了 / 提前还款 / 利率轨迹 / 还款计划——进来默认落在第一笔
 *   edit   改参数，下半屏即时给还款分析与还款计划预览
 * 不再有列表页；多笔贷款在详情页点标题切换。
 *
 * 所有编辑都走底部抽屉（统一壳 + 卡片 + 橙色提醒 + 底栏），
 * 页面本身只负责编排与落库。
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
        void openSave("create");
    };

    /** 保存 / 改名：摘要 + 名称 + 图标，一个抽屉搞完 */
    const openSave = async (mode: "create" | "rename") => {
        const res = await openSheet({
            type: "save",
            mode,
            draft,
            defaultName:
                mode === "rename"
                    ? (selected?.name ?? defaultName)
                    : defaultName,
            defaultIcon: mode === "rename" ? selected?.icon : undefined,
        });
        if (res?.kind !== "saved") return;
        if (mode === "rename" && selected) {
            await update(selected.id, { name: res.name, icon: res.icon });
            return;
        }
        const id = await add(toPlanInput(draft, res.name, res.icon));
        if (id) {
            addedIdsRef.current.add(id);
            setSelectedId(id);
            setCreating(false);
            setDirty(false);
            setView("detail");
        }
    };

    const confirmDelete = async (plan: SavedLoanPlan) => {
        const ok = await showLoanDelete({
            title: t("loan-manage-delete"),
            description: t("loan-delete-confirm", { name: plan.name }),
        }).catch(() => false);
        if (!ok) return;
        addedIdsRef.current.delete(plan.id);
        await remove(plan.id);
        const rest = plans.filter((p) => p.id !== plan.id);
        if (rest.length > 0) openPlan(rest[0]);
        else toEmpty();
    };

    const openMenu = async () => {
        if (!selected) return;
        const res = await openSheet({
            type: "menu",
            planName: selected.name,
        });
        if (res?.kind === "edit") setView("edit");
        if (res?.kind === "delete") await confirmDelete(selected);
    };

    const openSwitch = async () => {
        const res = await openSheet({
            type: "switch",
            plans,
            activeId: selectedId ?? undefined,
        });
        if (!res) return;
        if (res.kind === "plan") openPlan(res.plan);
        if (res.kind === "create") startCreate();
    };

    const openTerm = async () => {
        const res = await openSheet({ type: "term", years: draft.termYears });
        if (res?.kind === "term") edit({ termYears: res.years });
    };

    const openCommercialRate = async () => {
        const res = await openSheet({ type: "commercialRate", draft });
        if (res?.kind === "commercialRate") {
            edit({ lpr: res.lpr, bp: res.bp });
        }
    };

    const openFundRate = async () => {
        const res = await openSheet({ type: "fundRate", draft });
        if (res?.kind === "fundRate") {
            edit({ fundSuite: res.suite, fundRate: res.rate });
        }
    };

    const openDown = async () => {
        const res = await openSheet({ type: "down", draft });
        if (res?.kind === "down") {
            edit({
                downMode: res.mode,
                downRatio: res.ratio,
                downAmount: res.amount,
            });
        }
    };

    const openPrepay = async (item?: SavedLoanPrepay) => {
        const res = await openSheet({ type: "prepay", draft, initial: item });
        if (!res) return;
        if (res.kind === "delete" && item) {
            await persist({
                ...draft,
                prepays: draft.prepays.filter((p) => p.id !== item.id),
            });
            return;
        }
        if (res.kind !== "prepay") return;
        const next: SavedLoanPrepay = {
            id: item?.id ?? v4(),
            year: res.year,
            month: res.month,
            amount: Math.round(res.amountWan * 10000),
            mode: res.mode,
        };
        await persist({
            ...draft,
            prepays: item
                ? draft.prepays.map((p) => (p.id === item.id ? next : p))
                : [...draft.prepays, next],
        });
    };

    const openRateChange = async (item?: SavedLoanRateChange) => {
        const res = await openSheet({
            type: "rateChange",
            draft,
            initial: item,
        });
        if (!res) return;
        if (res.kind === "delete" && item) {
            await persist({
                ...draft,
                rateChanges: draft.rateChanges.filter((r) => r.id !== item.id),
            });
            return;
        }
        if (res.kind !== "rateChange") return;
        const next: SavedLoanRateChange = {
            id: item?.id ?? v4(),
            year: res.year,
            month: res.month,
            commercialRate: res.commercialRate,
            fundRate: res.fundRate,
        };
        await persist({
            ...draft,
            rateChanges: item
                ? draft.rateChanges.map((r) => (r.id === item.id ? next : r))
                : [...draft.rateChanges, next],
        });
    };

    return (
        <PopupLayout
            onBack={goBack}
            title={
                <span className="text-[18px] font-semibold text-ink">
                    {t("loan-calculator")}
                </span>
            }
            className="dp-drawer-surface h-full bg-ground"
            backStyle="circle"
            right={
                view === "detail" && selected ? (
                    <button
                        type="button"
                        data-loan-more
                        aria-label={t("loan-manage-open")}
                        className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-panel text-ink shadow-[0_1px_6px_rgba(92,62,30,0.10)] transition-colors hover:text-brand active:bg-ground-muted"
                        onClick={() => void openMenu()}
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
                    onPickPlan={() => void openSwitch()}
                    onRename={() => void openSave("rename")}
                    onAddPrepay={() => void openPrepay()}
                    onEditPrepay={(item) => void openPrepay(item)}
                    onAddRate={() => void openRateChange()}
                    onEditRate={(item) => void openRateChange(item)}
                />
            )}

            {view === "edit" && (
                <>
                    <LoanEdit
                        draft={draft}
                        derived={derived}
                        edit={edit}
                        onOpenSheet={(kind) => {
                            if (kind === "term") void openTerm();
                            else if (kind === "commercialRate")
                                void openCommercialRate();
                            else void openFundRate();
                        }}
                        onOpenDown={() => void openDown()}
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

            {/* 删除确认是全局挂载的实例（main-layout），这里只挂抽屉 */}
            <LoanSheetProvider />
        </PopupLayout>
    );
}
