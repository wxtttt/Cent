import type { SavedLoanPlan } from "@/ledger/extra-type";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { planIconSrc } from "./icons";
import { deriveLoan, toDraft } from "./model";
import { fmtMoney, fmtMoneyInt } from "./results";
import { LOAN_CARD } from "./styles";

const fmtWan = (v: number) =>
    v.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });

function typeLabelKey(plan: SavedLoanPlan) {
    return plan.loanType === "fund"
        ? "loan-type-fund"
        : plan.loanType === "combo"
          ? "loan-type-combo"
          : "loan-type-commercial";
}

/** 一张已保存方案卡：把「月供 / 进度 / 剩余本金 / 利率 / 到期」都摊在正面 */
export function LoanPlanCard({
    plan,
    onOpen,
    onManage,
    onLongPressStart,
    onLongPressEnd,
}: {
    plan: SavedLoanPlan;
    onOpen: () => void;
    onManage: () => void;
    onLongPressStart: () => void;
    onLongPressEnd: () => void;
}) {
    const t = useIntl();
    const derived = deriveLoan(toDraft(plan));
    const paid = derived.progress.paid;
    const done = derived.months === 0 || paid >= derived.months;
    const ratio = Math.min(1, Math.max(0, derived.progress.ratio));

    return (
        <button
            type="button"
            data-loan-card={plan.id}
            className={cn(LOAN_CARD, "w-full cursor-pointer p-4 text-left")}
            onClick={onOpen}
            onPointerDown={onLongPressStart}
            onPointerUp={onLongPressEnd}
            onPointerLeave={onLongPressEnd}
            onContextMenu={(e) => {
                e.preventDefault();
                onManage();
            }}
        >
            <div className="flex items-start gap-3">
                <img
                    src={planIconSrc(plan.icon, plan.loanType)}
                    alt=""
                    aria-hidden
                    className="mt-0.5 size-10 flex-shrink-0 object-contain"
                />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="truncate text-[16px] dp-text-medium text-ink">
                            {plan.name}
                        </span>
                        <span className="flex-shrink-0 rounded-full bg-ground-muted px-1.5 py-0.5 text-[10px] leading-none text-ink-secondary">
                            {t(typeLabelKey(plan))}
                        </span>
                    </div>
                    <div className="mt-1 text-[12px] text-ink-secondary tabular-nums">
                        {t(
                            derived.method === "installment"
                                ? "loan-method-installment"
                                : "loan-method-principal",
                        )}
                        {" · "}
                        {fmtWan(derived.commercialRate)}%{" · "}
                        {t("loan-years-n", {
                            n: Math.round(plan.months / 12),
                        })}
                    </div>
                </div>
                <i className="icon-[lucide--chevron-right] mt-1 size-4 flex-shrink-0 text-ink-secondary" />
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-[11px] text-ink-secondary">
                        {done
                            ? t("loan-list-settled")
                            : derived.method === "installment"
                              ? t("loan-hero-monthly")
                              : t("loan-hero-first")}
                    </div>
                    <div className="font-display text-[26px] leading-tight font-bold text-brand tabular-nums">
                        {done ? (
                            t("loan-list-settled-value")
                        ) : (
                            <>
                                <span className="mr-0.5 text-base">¥</span>
                                {fmtMoney(
                                    derived.next?.payment ??
                                        derived.firstPayment,
                                )}
                            </>
                        )}
                    </div>
                </div>
                <div className="flex-shrink-0 text-right">
                    <div className="text-[11px] text-ink-secondary">
                        {t("loan-col-remaining")}
                    </div>
                    <div className="text-[15px] dp-text-medium text-ink tabular-nums">
                        ¥{fmtMoneyInt(derived.remainingPrincipal)}
                    </div>
                </div>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand/15">
                <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{
                        width: `${Math.max(ratio * 100, done ? 100 : 2)}%`,
                    }}
                />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-secondary tabular-nums">
                <span>
                    {t("loan-progress-paid", {
                        paid,
                        total: derived.months,
                    })}
                </span>
                <span>
                    {t("loan-list-payoff-at", {
                        ym: `${derived.payoff.year}.${`${derived.payoff.month}`.padStart(2, "0")}`,
                    })}
                </span>
            </div>
        </button>
    );
}

/** 列表空态：还没有任何方案 */
export function LoanEmptyState({ onCreate }: { onCreate: () => void }) {
    const t = useIntl();
    return (
        <div className="flex flex-col items-center px-6 pt-16 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-panel shadow-[0_1px_6px_rgba(92,62,30,0.05)]">
                <i className="icon-[lucide--landmark] size-9 text-brand/80" />
            </div>
            <div className="mt-5 text-[16px] dp-text-medium text-ink">
                {t("loan-list-empty-title")}
            </div>
            <p className="mt-2 max-w-64 text-[13px] leading-relaxed text-ink-secondary">
                {t("loan-list-empty-desc")}
            </p>
            <button
                type="button"
                className="mt-6 cursor-pointer rounded-full bg-brand px-5 py-2.5 text-[14px] dp-text-medium text-on-brand"
                onClick={onCreate}
            >
                {t("loan-list-empty-action")}
            </button>
        </div>
    );
}
