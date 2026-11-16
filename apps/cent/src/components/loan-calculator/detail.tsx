import type { SavedLoanPrepay } from "@/ledger/extra-type";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import type { DerivedLoan, LoanDraft } from "./model";
import { CompareCard, fmtMoney, fmtMoneyInt, ScheduleCard } from "./results";
import { GROUP_TITLE, LOAN_CARD, PAGE_FOOTER } from "./styles";

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

/** 详情页：只回答三个问题——还到哪了、接下来怎么还、提前还款/利率变过什么 */
export function LoanDetail({
    draft,
    derived,
    onAddPrepay,
    onRemovePrepay,
    onAddRate,
    onRemoveRate,
}: {
    draft: LoanDraft;
    derived: DerivedLoan;
    onAddPrepay: () => void;
    onRemovePrepay: (id: string) => void;
    onAddRate: () => void;
    onRemoveRate: (id: string) => void;
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

    return (
        <div className="flex h-full flex-col">
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pt-3 pb-4 [&>*]:shrink-0">
                {/* 进度：剩余本金 + 已还比例 */}
                <div data-loan-detail-hero className={cn(LOAN_CARD, "p-4")}>
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
                                    width: `${settled ? 100 : Math.min(100, derived.progress.ratio * 100)}%`,
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

                {/* 下一期 */}
                <div
                    data-loan-next-pay
                    className={cn(
                        LOAN_CARD,
                        "flex items-center justify-between p-4",
                    )}
                >
                    <div>
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
                    <div className="text-right">
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

                <ScheduleCard derived={derived} />

                <div>
                    <div className={GROUP_TITLE}>
                        {t("loan-analysis-title")}
                    </div>
                    <CompareCard draft={draft} />
                </div>

                {/* 提前还款 */}
                <div data-loan-prepay className={cn(LOAN_CARD, "p-4")}>
                    <div className="flex items-center justify-between">
                        <span className="text-[15px] dp-text-medium text-ink">
                            {t("loan-prepay-title")}
                        </span>
                        <button
                            type="button"
                            data-loan-prepay-add
                            className="flex cursor-pointer items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-[12px] text-brand"
                            onClick={onAddPrepay}
                        >
                            <i className="icon-[lucide--plus] size-3.5" />
                            {t("loan-prepay-add-short")}
                        </button>
                    </div>
                    {prepays.length === 0 ? (
                        <p className="mt-2 text-[12px] leading-relaxed text-ink-secondary">
                            {t("loan-prepay-empty")}
                        </p>
                    ) : (
                        <>
                            <div className="mt-3 rounded-2xl bg-[#e8f3ea] px-4 py-2.5 text-[13px] leading-relaxed text-[#1a7f37]">
                                {t("loan-prepay-saved-total", {
                                    amount: `¥${fmtMoneyInt(derived.prepaySaved)}`,
                                })}
                            </div>
                            <div className="mt-2 divide-y divide-rule/60">
                                {prepays.map((p) => (
                                    <div
                                        key={p.id}
                                        data-loan-prepay-item={p.id}
                                        className="flex items-center justify-between gap-2 py-2.5"
                                    >
                                        <div className="min-w-0">
                                            <div className="text-[14px] text-ink tabular-nums">
                                                {t("loan-prepay-item", {
                                                    ym: ymLabel(p),
                                                    amount: `${fmtWan(p.amount / 10000)} 万`,
                                                })}
                                            </div>
                                            <div className="mt-0.5 text-[11px] text-ink-secondary">
                                                {t(modeLabelKey(p.mode))}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            aria-label={t("delete")}
                                            className="flex size-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-secondary hover:bg-ground-muted hover:text-[#ef4444]"
                                            onClick={() => onRemovePrepay(p.id)}
                                        >
                                            <i className="icon-[lucide--trash-2] size-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-2 text-[11px] leading-relaxed text-ink-secondary">
                                {t("loan-prepay-locked-hint")}
                            </p>
                        </>
                    )}
                </div>

                {/* 利率轨迹 */}
                <div data-loan-rate className={cn(LOAN_CARD, "p-4")}>
                    <div className="flex items-center justify-between">
                        <span className="text-[15px] dp-text-medium text-ink">
                            {t("loan-rate-title")}
                        </span>
                        <button
                            type="button"
                            data-loan-rate-add
                            className="flex cursor-pointer items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-[12px] text-brand"
                            onClick={onAddRate}
                        >
                            <i className="icon-[lucide--plus] size-3.5" />
                            {t("loan-rate-add")}
                        </button>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
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
                        <p className="mt-2 text-[12px] leading-relaxed text-ink-secondary">
                            {t("loan-rate-empty")}
                        </p>
                    ) : (
                        <div className="mt-2 divide-y divide-rule/60">
                            {rateChanges.map((r) => (
                                <div
                                    key={r.id}
                                    data-loan-rate-item={r.id}
                                    className="flex items-center justify-between gap-2 py-2.5"
                                >
                                    <div className="min-w-0">
                                        <div className="text-[14px] text-ink tabular-nums">
                                            {t("loan-rate-item", {
                                                ym: ymLabel(r),
                                                rate: fmtWan(r.commercialRate),
                                            })}
                                        </div>
                                        <div className="mt-0.5 text-[11px] text-ink-secondary tabular-nums">
                                            {t("loan-rate-item-period", {
                                                n:
                                                    (r.year -
                                                        draft.firstPay.year) *
                                                        12 +
                                                    (r.month -
                                                        draft.firstPay.month) +
                                                    1,
                                            })}
                                            {r.fundRate !== undefined &&
                                                draft.loanType !==
                                                    "commercial" &&
                                                ` · ${t("loan-fund-rate")} ${fmtWan(r.fundRate)}%`}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        aria-label={t("delete")}
                                        className="flex size-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-secondary hover:bg-ground-muted hover:text-[#ef4444]"
                                        onClick={() => onRemoveRate(r.id)}
                                    >
                                        <i className="icon-[lucide--trash-2] size-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <p className="px-1 pb-2 text-[11px] leading-relaxed text-ink-secondary">
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
