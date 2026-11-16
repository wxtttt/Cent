import type { SavedLoanPlan, SavedLoanPrepay } from "@/ledger/extra-type";
import { simulatePrepay } from "@/ledger/loan";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { CARD, GroupTitle } from "../sheet-kit";
import { planIconSrc } from "./icons";
import {
    type DerivedLoan,
    type LoanDraft,
    periodOfYm,
    tracksOf,
} from "./model";
import { fmtMoney, fmtMoneyInt, ScheduleCard, ScheduleLegend } from "./results";
import { PAGE_FOOTER } from "./styles";

const fmtWan = (v: number) =>
    v.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
const ymLabel = (v: { year: number; month: number }) =>
    `${v.year}.${`${v.month}`.padStart(2, "0")}`;

function modeLabelKey(mode: SavedLoanPrepay["mode"]) {
    return mode === "payoff"
        ? "loan-prepay-mode-payoff"
        : mode === "reduceMonthly"
          ? "loan-prepay-mode-reduce"
          : "loan-prepay-mode-shorten";
}

/** 「添加」胶囊：分组标题右侧的次级动作 */
const AddChip = ({
    label,
    onClick,
    ...rest
}: {
    label: string;
    onClick: () => void;
} & Record<string, unknown>) => (
    <button
        type="button"
        {...rest}
        className="flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-[12px] text-brand transition-colors enabled:hover:bg-brand/20"
        onClick={onClick}
    >
        <i className="icon-[lucide--plus] size-3.5" />
        {label}
    </button>
);

/**
 * 详情页：只回答三个问题——还到哪了、接下来怎么还、提前还款/利率变过什么。
 * 版式与预算管理页同构：分组小标题 + 一张白卡，卡片之间不堆叠其他容器。
 */
export function LoanDetail({
    plan,
    plans,
    draft,
    derived,
    onPickPlan,
    onRename,
    onAddPrepay,
    onEditPrepay,
    onAddRate,
    onEditRate,
}: {
    plan?: SavedLoanPlan;
    plans: SavedLoanPlan[];
    draft: LoanDraft;
    derived: DerivedLoan;
    onPickPlan: () => void;
    onRename: () => void;
    onAddPrepay: () => void;
    onEditPrepay: (item: SavedLoanPrepay) => void;
    onAddRate: () => void;
    onEditRate: (item: {
        id: string;
        year: number;
        month: number;
        commercialRate: number;
        fundRate?: number;
    }) => void;
}) {
    const t = useIntl();
    const paidPrincipal = Math.max(
        0,
        derived.principal - derived.remainingPrincipal,
    );
    const settled = !derived.next;
    const rateChanges = [...draft.rateChanges].sort(
        (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month),
    );
    const prepays = [...draft.prepays].sort(
        (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month),
    );
    const currentCommercialRate =
        rateChanges.length > 0
            ? rateChanges[rateChanges.length - 1].commercialRate
            : derived.commercialRate;

    const prepayEffect = (p: SavedLoanPrepay) => {
        if (p.mode === "payoff") return t("loan-prepay-mode-payoff");
        const { commercialInput, fundInput } = tracksOf(draft);
        const track =
            draft.loanType === "fund"
                ? (fundInput ?? commercialInput)
                : commercialInput;
        const start = Math.max(
            1,
            Math.min(
                periodOfYm(draft.firstPay, p),
                Math.max(1, derived.months - 1),
            ),
        );
        const r = simulatePrepay(track, draft.method, {
            mode: p.mode,
            extraAmount: p.amount,
            startMonth: start,
        });
        return p.mode === "reduceMonthly"
            ? t("loan-prepay-new-monthly", {
                  amount: `¥${fmtMoney(r.newMonthly ?? 0)}`,
              })
            : t("loan-prepay-shortened", { n: r.monthsShortened });
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-4 [&>*]:shrink-0">
                {/* 方案名：靠左，点名字切方案，笔管图标与名称 */}
                <div
                    data-loan-plan-head
                    className="mb-1 flex items-center justify-between gap-2 px-1"
                >
                    {/* 只有一笔也允许点开：抽屉里还挂着「新增贷款方案」 */}
                    <button
                        type="button"
                        data-loan-plan-switch
                        className="flex min-w-0 cursor-pointer items-center gap-1.5 text-left"
                        onClick={onPickPlan}
                    >
                        <img
                            src={planIconSrc(plan?.icon, draft.loanType)}
                            alt=""
                            aria-hidden
                            className="size-8 flex-shrink-0 object-contain"
                        />
                        <span className="truncate text-[20px] font-semibold text-ink">
                            {plan?.name ?? t("loan-list-empty-title")}
                        </span>
                        <i className="icon-[lucide--chevron-down] size-4 flex-shrink-0 text-ink-secondary" />
                    </button>
                    <button
                        type="button"
                        data-loan-plan-rename
                        aria-label={t("loan-manage-rename")}
                        className="flex size-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-panel text-ink shadow-[0_1px_6px_rgba(92,62,30,0.10)] transition-colors hover:text-brand active:bg-ground-muted"
                        onClick={onRename}
                    >
                        <i className="icon-[lucide--pencil] size-4" />
                    </button>
                </div>

                {/* 进度 + 下次还款合在一张卡：都是「当前状态」，不必各占一张 */}
                <GroupTitle title={t("loan-progress-title")} first />
                <div data-loan-detail-hero className={CARD}>
                    <div className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] text-ink-secondary">
                                {t("loan-detail-remaining-label")}
                            </span>
                            <span className="rounded-full bg-ground-muted px-2 py-0.5 text-[11px] text-ink-secondary tabular-nums">
                                {t("loan-progress-paid", {
                                    paid: derived.progress.paid,
                                    total: derived.months,
                                })}
                            </span>
                        </div>
                        <div className="mt-1 font-display text-[32px] leading-tight font-bold text-ink tabular-nums">
                            <span className="mr-1 text-lg">¥</span>
                            {fmtMoneyInt(derived.remainingPrincipal)}
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand/15">
                            {(settled || derived.progress.ratio > 0) && (
                                <div
                                    className="h-full rounded-full bg-brand transition-all"
                                    style={{
                                        width: `${
                                            settled
                                                ? 100
                                                : Math.min(
                                                      100,
                                                      derived.progress.ratio *
                                                          100,
                                                  )
                                        }%`,
                                    }}
                                />
                            )}
                        </div>
                        <div className="mt-1.5 flex justify-between text-[11px] text-ink-secondary tabular-nums">
                            <span>
                                {t("loan-detail-progress-hint", {
                                    paid: derived.progress.paid,
                                    left: Math.max(
                                        0,
                                        derived.months - derived.progress.paid,
                                    ),
                                })}
                            </span>
                            <span>
                                {t("loan-detail-payoff", {
                                    ym: ymLabel(derived.payoff),
                                })}
                            </span>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-rule/60 pt-3">
                            <Stat
                                label={t("loan-detail-paid-principal")}
                                value={`¥${fmtMoneyInt(paidPrincipal)}`}
                            />
                            <Stat
                                label={t("loan-detail-paid-interest")}
                                value={`¥${fmtMoneyInt(derived.paidInterest)}`}
                            />
                            <Stat
                                label={t("loan-detail-rest-interest")}
                                value={`¥${fmtMoneyInt(derived.restInterest)}`}
                            />
                        </div>
                    </div>
                    <div
                        data-loan-next-pay
                        className="flex items-center justify-between gap-2 border-t border-rule/60 p-4"
                    >
                        <div className="min-w-0">
                            <div className="text-[12px] text-ink-secondary">
                                {settled
                                    ? t("loan-detail-settled-title")
                                    : t("loan-detail-next-title")}
                            </div>
                            <div className="mt-0.5 text-[13px] text-ink-secondary tabular-nums">
                                {settled
                                    ? t("loan-detail-settled-desc")
                                    : t("loan-detail-next-at", {
                                          ym: ymLabel(derived.next!.ym),
                                          period: derived.next!.period,
                                      })}
                            </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                            <div className="font-display text-[22px] font-bold text-brand tabular-nums">
                                {settled
                                    ? t("loan-list-settled-value")
                                    : `¥${fmtMoney(derived.next!.payment)}`}
                            </div>
                            {!settled && (
                                <div className="mt-0.5 text-[11px] text-ink-secondary tabular-nums">
                                    {t("loan-detail-next-split", {
                                        principal: fmtMoneyInt(
                                            derived.next!.principal,
                                        ),
                                        interest: fmtMoneyInt(
                                            derived.next!.interest,
                                        ),
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 提前还款 */}
                <GroupTitle
                    title={t("loan-prepay-title")}
                    action={
                        <AddChip
                            data-loan-prepay-add
                            label={t("loan-prepay-add-short")}
                            onClick={onAddPrepay}
                        />
                    }
                />
                <div data-loan-prepay className={CARD}>
                    {prepays.length === 0 ? (
                        <p className="px-4 py-3 text-[12px] leading-relaxed text-ink-secondary">
                            {t("loan-prepay-empty")}
                        </p>
                    ) : (
                        <>
                            <div className="px-4 pt-3">
                                <div className="rounded-2xl bg-brand/10 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink">
                                    {t("loan-prepay-saved-total", {
                                        amount: `¥${fmtMoneyInt(derived.prepaySaved)}`,
                                    })}
                                </div>
                            </div>
                            <div className="px-4 pt-1 pb-1">
                                <div className="divide-y divide-rule/60">
                                    {prepays.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            data-loan-prepay-item={p.id}
                                            className="flex w-full cursor-pointer items-center justify-between gap-2 py-2.5 text-left transition-colors enabled:hover:bg-brand/5"
                                            onClick={() => onEditPrepay(p)}
                                        >
                                            <div className="min-w-0">
                                                <div className="text-[14px] text-ink tabular-nums">
                                                    {ymLabel(p)}
                                                </div>
                                                <div className="mt-0.5 text-[11px] text-ink-secondary">
                                                    {t(modeLabelKey(p.mode))} ·{" "}
                                                    {t("loan-prepay-period", {
                                                        n: Math.max(
                                                            1,
                                                            periodOfYm(
                                                                draft.firstPay,
                                                                p,
                                                            ),
                                                        ),
                                                    })}
                                                </div>
                                            </div>
                                            <div className="flex flex-shrink-0 items-center gap-1.5">
                                                <div className="text-right">
                                                    <div className="text-[14px] dp-text-medium text-ink tabular-nums">
                                                        {fmtWan(
                                                            p.amount / 10000,
                                                        )}{" "}
                                                        {t("loan-wan")}
                                                    </div>
                                                    <div className="mt-0.5 text-[11px] text-ink-secondary tabular-nums">
                                                        {prepayEffect(p)}
                                                    </div>
                                                </div>
                                                <i className="icon-[lucide--chevron-right] size-4 text-ink-secondary" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* 利率轨迹 */}
                <GroupTitle
                    title={t("loan-rate-title")}
                    action={
                        <AddChip
                            data-loan-rate-add
                            label={t("loan-rate-add")}
                            onClick={onAddRate}
                        />
                    }
                />
                <div data-loan-rate className={CARD}>
                    <div className="flex items-baseline gap-2 px-4 pt-3">
                        <span className="font-display text-[24px] font-bold text-ink tabular-nums">
                            {fmtWan(currentCommercialRate)}%
                        </span>
                        <span className="text-[12px] text-ink-secondary">
                            {draft.loanType === "commercial"
                                ? t("loan-commercial-rate")
                                : t("loan-detail-rate-combo")}
                        </span>
                    </div>
                    {rateChanges.length === 0 ? (
                        <p className="px-4 pt-1 pb-3 text-[12px] leading-relaxed text-ink-secondary">
                            {t("loan-rate-empty")}
                        </p>
                    ) : (
                        <div className="mt-1 px-4 pb-1">
                            <div className="divide-y divide-rule/60">
                                {rateChanges.map((r) => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        data-loan-rate-item={r.id}
                                        className="flex w-full cursor-pointer items-center justify-between gap-2 py-2.5 text-left transition-colors enabled:hover:bg-brand/5"
                                        onClick={() => onEditRate(r)}
                                    >
                                        <div className="min-w-0">
                                            <div className="text-[14px] text-ink tabular-nums">
                                                {ymLabel(r)}
                                            </div>
                                            <div className="mt-0.5 text-[11px] text-ink-secondary tabular-nums">
                                                {t("loan-rate-item-period", {
                                                    n: Math.max(
                                                        1,
                                                        periodOfYm(
                                                            draft.firstPay,
                                                            r,
                                                        ),
                                                    ),
                                                })}
                                            </div>
                                        </div>
                                        <div className="flex flex-shrink-0 items-center gap-1.5">
                                            <div className="text-right">
                                                <div className="text-[14px] dp-text-medium text-ink tabular-nums">
                                                    {fmtWan(r.commercialRate)}%
                                                </div>
                                                {r.fundRate !== undefined &&
                                                    draft.loanType !==
                                                        "commercial" && (
                                                        <div className="mt-0.5 text-[11px] text-ink-secondary tabular-nums">
                                                            {t(
                                                                "loan-fund-rate",
                                                            )}{" "}
                                                            {fmtWan(r.fundRate)}
                                                            %
                                                        </div>
                                                    )}
                                            </div>
                                            <i className="icon-[lucide--chevron-right] size-4 text-ink-secondary" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <GroupTitle
                    title={t("loan-schedule-title")}
                    action={<ScheduleLegend />}
                />
                <ScheduleCard derived={derived} />

                <p className="px-1 pt-3 pb-2 text-[11px] leading-relaxed text-ink-secondary">
                    {t("loan-page-disclaimer")}
                </p>
            </div>

            <div className={PAGE_FOOTER}>
                <button
                    type="button"
                    data-loan-prepay-cta
                    className="flex h-12 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[12px] bg-brand text-[15px] font-semibold text-on-brand shadow-[0_2px_8px_rgba(255,132,53,0.28)]"
                    onClick={onAddPrepay}
                >
                    <i className="icon-[lucide--circle-dollar-sign] size-4" />
                    {t("loan-prepay-add")}
                </button>
            </div>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-[11px] text-ink-secondary">{label}</div>
            <div className="mt-0.5 text-[13px] dp-text-medium text-ink tabular-nums">
                {value}
            </div>
        </div>
    );
}
