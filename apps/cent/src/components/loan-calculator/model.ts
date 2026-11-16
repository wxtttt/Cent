import type {
    SavedLoanPlan,
    SavedLoanPrepay,
    SavedLoanRateChange,
} from "@/ledger/extra-type";
import {
    aggregateYearly,
    buildSchedule,
    type FirstPayYm,
    type LoanInput,
    type LoanMethod,
    type LoanYearRow,
    periodsElapsed,
    shiftYm,
    ymFromIndex,
    ymIndex,
} from "@/ledger/loan";

export type LoanType = "commercial" | "fund" | "combo";
export type LoanMode = "totalPrice" | "amount";
/** 首付输入口径：按比例 / 按金额 */
export type DownMode = "ratio" | "amount";

/** 利率轨迹上的一个点（草稿态） */
export type DraftRateChange = SavedLoanRateChange;
/** 已记录的提前还款（草稿态） */
export type DraftPrepay = SavedLoanPrepay;

export type LoanDraft = {
    loanType: LoanType;
    mode: LoanMode;
    /** 房屋总价（万） */
    housePrice: number;
    /** 首付比例 0-1 */
    downRatio: number;
    /** 首付口径 */
    downMode: DownMode;
    /** 首付金额（万） */
    downAmount: number;
    /** 贷款金额（万，按贷款金额口径） */
    amount: number;
    /** 公积金额度（万，组合贷款） */
    fundAmount: number;
    /** 商贷 LPR（%） */
    lpr: number;
    /** LPR 加减点（BP） */
    bp: number;
    /** 公积金利率（%） */
    fundRate: number;
    fundSuite: "first" | "second";
    method: LoanMethod;
    /** 贷款年限（年） */
    termYears: number;
    firstPay: FirstPayYm;
    /** 还款生涯：利率调整 */
    rateChanges: DraftRateChange[];
    /** 还款生涯：提前还款 */
    prepays: DraftPrepay[];
};

/** 2026-09-20 公布的 5 年期以上 LPR；页脚脚注口径以它为基准 */
export const LATEST_LPR = { date: "2026-09-20", value: 3.5 };
/** 公积金利率政策（2025-05-08 起） */
export const FUND_SUITE_RATES = { first: 2.6, second: 3.075 };

const round2 = (v: number) => Math.round(v * 100) / 100;

function nextMonthOf(ts: number): FirstPayYm {
    const d = new Date(ts);
    // getMonth() 是 0-based：当前月索引 = (年-1)*12 + 月-1，下一月再 +1
    const index = (d.getFullYear() - 1) * 12 + d.getMonth() + 1;
    return { year: Math.floor(index / 12) + 1, month: (index % 12) + 1 };
}

export function defaultDraft(now = Date.now()): LoanDraft {
    return {
        loanType: "commercial",
        mode: "totalPrice",
        housePrice: 300,
        downRatio: 0.3,
        downMode: "ratio",
        downAmount: 90,
        amount: 210,
        fundAmount: 60,
        lpr: LATEST_LPR.value,
        bp: -45,
        fundRate: FUND_SUITE_RATES.first,
        fundSuite: "first",
        method: "installment",
        termYears: 30,
        firstPay: nextMonthOf(now),
        rateChanges: [],
        prepays: [],
    };
}

export function toDraft(plan: SavedLoanPlan): LoanDraft {
    const principalWan = round2(plan.principal / 10000);
    const legacyRate = plan.annualRate;
    const lpr = plan.lpr ?? LATEST_LPR.value;
    const housePrice = plan.housePrice ?? 300;
    const downRatio = plan.downRatio ?? 0.3;
    return {
        loanType: plan.loanType ?? "commercial",
        mode: plan.mode ?? "amount",
        housePrice,
        downRatio,
        downMode: plan.downMode ?? "ratio",
        downAmount: plan.downAmountWan ?? round2(housePrice * downRatio),
        amount: principalWan,
        fundAmount: plan.fundAmount ?? 0,
        lpr,
        bp: plan.bp ?? Math.round((legacyRate - lpr) * 100),
        fundRate: plan.fundRate ?? FUND_SUITE_RATES.first,
        fundSuite: plan.fundSuite ?? "first",
        method: plan.method ?? "installment",
        termYears: Math.round(plan.months / 12),
        firstPay:
            plan.firstPayYear && plan.firstPayMonth
                ? { year: plan.firstPayYear, month: plan.firstPayMonth }
                : nextMonthOf(plan.createdAt),
        rateChanges: plan.rateChanges ?? [],
        prepays: plan.prepays ?? [],
    };
}

/** 首付金额（万）：按比例就用总价算，按金额就用输入值 */
export function downWanOf(draft: LoanDraft): number {
    const raw =
        draft.downMode === "amount"
            ? draft.downAmount
            : draft.housePrice * draft.downRatio;
    return round2(Math.max(0, Math.min(raw, draft.housePrice)));
}

/** 首付比例（0-1），按金额口径时反推 */
export function downRatioOf(draft: LoanDraft): number {
    if (draft.downMode === "ratio") return draft.downRatio;
    if (draft.housePrice <= 0) return 0;
    return Math.min(1, Math.max(0, draft.downAmount / draft.housePrice));
}

/** 年月 → 期号（首期为 1）。早于首期的返回 <= 0 */
export function periodOfYm(firstPay: FirstPayYm, ym: FirstPayYm): number {
    return ymIndex(ym) - ymIndex(firstPay) + 1;
}

/** 期号 → 年月 */
export function ymOfPeriod(firstPay: FirstPayYm, period: number): FirstPayYm {
    return shiftYm(firstPay, period - 1);
}

/** 拆出两条贷款轨（组合 = 商贷 + 公积金，其余单轨） */
export function tracksOf(draft: LoanDraft): {
    commercialInput: LoanInput;
    fundInput?: LoanInput;
    months: number;
    totalWan: number;
    fundWan: number;
    commercialWan: number;
    commercialRate: number;
} {
    const totalWan =
        draft.mode === "amount"
            ? draft.amount
            : round2(Math.max(0, draft.housePrice - downWanOf(draft)));
    const fundWan =
        draft.loanType === "combo"
            ? Math.min(draft.fundAmount, totalWan)
            : draft.loanType === "fund"
              ? totalWan
              : 0;
    const commercialWan = round2(Math.max(0, totalWan - fundWan));
    const commercialRate = round2(draft.lpr + draft.bp / 100);
    const months = Math.max(1, Math.round(draft.termYears * 12));
    const commercialInput: LoanInput = {
        principal: round2(commercialWan * 10000),
        annualRate: commercialRate,
        months,
    };
    const fundInput: LoanInput | undefined =
        fundWan > 0
            ? {
                  principal: round2(fundWan * 10000),
                  annualRate: draft.fundRate,
                  months,
              }
            : undefined;
    return {
        commercialInput,
        fundInput,
        months,
        totalWan,
        fundWan,
        commercialWan,
        commercialRate,
    };
}

/** 把草稿里的「年月」事件换算成「期号」事件；越界事件直接丢弃 */
export function eventsOfDraft(draft: LoanDraft, months: number) {
    const rates = draft.rateChanges
        .map((r) => ({
            fromPeriod: periodOfYm(draft.firstPay, {
                year: r.year,
                month: r.month,
            }),
            commercialRate: r.commercialRate,
            fundRate: r.fundRate,
        }))
        .filter((r) => r.fromPeriod >= 2 && r.fromPeriod <= months)
        .sort((a, b) => a.fromPeriod - b.fromPeriod);
    const prepays = draft.prepays
        .map((p) => ({
            atPeriod: periodOfYm(draft.firstPay, {
                year: p.year,
                month: p.month,
            }),
            amount: p.amount,
            mode: p.mode,
        }))
        .filter((p) => p.atPeriod >= 1 && p.atPeriod <= months)
        .sort((a, b) => a.atPeriod - b.atPeriod);
    return { rates, prepays };
}

/** 单轨 schedule（含提前还款拆分） */
function scheduleTracks(
    draft: LoanDraft,
    method: LoanMethod,
    withEvents = true,
): {
    commercial: ReturnType<typeof buildSchedule>;
    fund?: ReturnType<typeof buildSchedule>;
    months: number;
} {
    const { commercialInput, fundInput, months } = tracksOf(draft);
    const { prepays: rawPrepays } = eventsOfDraft(draft, months);
    const prepays = withEvents ? rawPrepays : [];

    if (!fundInput) {
        const commercial = buildSchedule({
            principal: commercialInput.principal,
            months,
            method,
            annualRate: commercialInput.annualRate,
            rateChanges: eventsOfDraft(draft, months)
                .rates.map((r) => ({
                    fromPeriod: r.fromPeriod,
                    annualRate: r.commercialRate,
                }))
                .filter(() => withEvents),
            prepays: prepays.map((p) => ({
                atPeriod: p.atPeriod,
                amount: p.amount,
                mode: p.mode,
            })),
        });
        return { commercial, months: commercial.months };
    }

    // combo：先跑基线，按余额把每笔提前还款拆给两轨
    const baseCommercial = buildSchedule({
        principal: commercialInput.principal,
        months,
        method,
        annualRate: commercialInput.annualRate,
        rateChanges: withEvents
            ? eventsOfDraft(draft, months).rates.map((r) => ({
                  fromPeriod: r.fromPeriod,
                  annualRate: r.commercialRate,
              }))
            : [],
    });
    const baseFund = buildSchedule({
        principal: fundInput.principal,
        months,
        method,
        annualRate: fundInput.annualRate,
        rateChanges: withEvents
            ? eventsOfDraft(draft, months)
                  .rates.filter((r) => r.fundRate !== undefined)
                  .map((r) => ({
                      fromPeriod: r.fromPeriod,
                      annualRate: r.fundRate as number,
                  }))
            : [],
    });

    const split = {
        commercial: [] as typeof rawPrepays,
        fund: [] as typeof rawPrepays,
    };
    if (withEvents) {
        for (const p of prepays) {
            if (p.mode === "payoff") {
                split.commercial.push(p);
                continue;
            }
            const cBalance =
                baseCommercial.rows[p.atPeriod - 1]?.remaining ??
                (p.atPeriod <= 0 ? commercialInput.principal : 0);
            const fBalance =
                baseFund.rows[p.atPeriod - 1]?.remaining ??
                (p.atPeriod <= 0 ? fundInput.principal : 0);
            const toCommercial = Math.min(p.amount, cBalance);
            const toFund = Math.min(p.amount - toCommercial, fBalance);
            if (toCommercial > 0) {
                split.commercial.push({ ...p, amount: toCommercial });
            }
            if (toFund > 0) {
                split.fund.push({ ...p, amount: toFund });
            }
        }
    }

    const commercial = buildSchedule({
        principal: commercialInput.principal,
        months,
        method,
        annualRate: commercialInput.annualRate,
        rateChanges: eventsOfDraft(draft, months)
            .rates.map((r) => ({
                fromPeriod: r.fromPeriod,
                annualRate: r.commercialRate,
            }))
            .filter(() => withEvents),
        prepays: split.commercial.map((p) => ({
            atPeriod: p.atPeriod,
            amount: p.amount,
            mode: p.mode,
        })),
    });
    const fund = buildSchedule({
        principal: fundInput.principal,
        months,
        method,
        annualRate: fundInput.annualRate,
        rateChanges: eventsOfDraft(draft, months)
            .rates.filter((r) => r.fundRate !== undefined)
            .map((r) => ({
                fromPeriod: r.fromPeriod,
                annualRate: r.fundRate as number,
            }))
            .filter(() => withEvents),
        prepays: split.fund.map((p) => ({
            atPeriod: p.atPeriod,
            amount: p.amount,
            mode: p.mode,
        })),
    });
    return {
        commercial,
        fund,
        months: Math.max(commercial.months, fund.months),
    };
}

export type DerivedLoan = {
    /** 贷款总额（万） */
    totalWan: number;
    /** 公积金部分（万） */
    fundWan: number;
    /** 商贷部分（万） */
    commercialWan: number;
    /** 商贷年利率（%） */
    commercialRate: number;
    /** 公积金年利率（%） */
    fundRate: number;
    /** 剩余期数（含未还的，提前结清后为 0） */
    months: number;
    firstPay: FirstPayYm;
    payoff: FirstPayYm;
    method: LoanMethod;
    /** 合并后的逐期月供（元） */
    payments: number[];
    /** 合并后的逐期拆分 */
    monthlyRows: { principal: number; interest: number; payment: number }[];
    /** 合并后的逐期行（带期号 / 年月 / 剩余本金） */
    rows: {
        period: number;
        principal: number;
        interest: number;
        payment: number;
        remaining: number;
        annualRate: number;
    }[];
    /** 合并年度拆分 */
    yearly: LoanYearRow[];
    firstPayment: number;
    lastPayment: number;
    totalPayment: number;
    totalInterest: number;
    /** 组合贷分拆首期月供（非 combo 为 undefined） */
    splitFirst?: { commercial: number; fund: number };
    /** 等额本金逐月递减（合并） */
    decrease: number;
    /** 贷款本金（元） */
    principal: number;
    /** 商贷轨输入（预还款模拟用，非 combo 时即唯一轨） */
    commercialInput: LoanInput;
    /** 公积金轨输入 */
    fundInput?: LoanInput;
    /** 进度：已还期数 / 总期数 */
    progress: { paid: number; total: number; ratio: number };
    /** 剩余本金（元） */
    remainingPrincipal: number;
    /** 已付利息（元） */
    paidInterest: number;
    /** 剩余利息（元） */
    restInterest: number;
    /** 下一期还款（全部还完时为 undefined） */
    next?: {
        period: number;
        ym: FirstPayYm;
        payment: number;
        principal: number;
        interest: number;
    };
    /** 提前还款相比不做提前还款省下的利息（元） */
    prepaySaved: number;
    /** 已记录提前还款的期数（用于锁定设置） */
    prepayCount: number;
    /** 提前结清期号 */
    closedAt?: number;
};

export function deriveLoan(draft: LoanDraft, now = new Date()): DerivedLoan {
    const {
        commercialInput,
        fundInput,
        totalWan,
        fundWan,
        commercialWan,
        commercialRate,
    } = tracksOf(draft);
    const actual = scheduleTracks(draft, draft.method, true);
    const baseline = draft.prepays.length
        ? scheduleTracks(draft, draft.method, false)
        : undefined;

    const { commercial, fund } = actual;
    const months = actual.months;
    const principal = round2(
        commercialInput.principal + (fundInput?.principal ?? 0),
    );

    const rows: DerivedLoan["rows"] = [];
    for (let i = 0; i < months; i++) {
        const c = commercial.rows[i];
        const f = fund?.rows[i];
        rows.push({
            period: i + 1,
            principal: round2((c?.principal ?? 0) + (f?.principal ?? 0)),
            interest: round2((c?.interest ?? 0) + (f?.interest ?? 0)),
            payment: round2((c?.payment ?? 0) + (f?.payment ?? 0)),
            remaining: round2((c?.remaining ?? 0) + (f?.remaining ?? 0)),
            annualRate: c?.annualRate ?? commercialInput.annualRate,
        });
    }

    const yearly = aggregateYearly(rows, principal);
    const totalPayment = round2(rows.reduce((s, r) => s + r.payment, 0));
    const totalInterest = round2(rows.reduce((s, r) => s + r.interest, 0));
    const paid = periodsElapsed(draft.firstPay, rows.length, now);
    const paidInterest = round2(
        rows.slice(0, paid).reduce((s, r) => s + r.interest, 0),
    );
    const restInterest = round2(totalInterest - paidInterest);
    const remainingPrincipal =
        paid === 0 ? principal : (rows[paid - 1]?.remaining ?? 0);
    const nextRow = rows[paid];
    const baselineInterest = baseline
        ? round2(
              baseline.commercial.totalInterest +
                  (baseline.fund?.totalInterest ?? 0),
          )
        : totalInterest;

    return {
        totalWan,
        fundWan,
        commercialWan,
        commercialRate,
        fundRate: draft.fundRate,
        months,
        firstPay: draft.firstPay,
        payoff: ymFromIndex(
            ymIndex(draft.firstPay) + Math.max(0, rows.length - 1),
        ),
        method: draft.method,
        payments: rows.map((r) => r.payment),
        monthlyRows: rows.map((r) => ({
            principal: r.principal,
            interest: r.interest,
            payment: r.payment,
        })),
        rows,
        yearly,
        firstPayment: rows[0]?.payment ?? 0,
        lastPayment: rows[rows.length - 1]?.payment ?? 0,
        totalPayment,
        totalInterest,
        splitFirst: fund
            ? {
                  commercial: commercial.firstPayment,
                  fund: fund.firstPayment,
              }
            : undefined,
        decrease:
            rows.length > 1 ? round2(rows[0].payment - rows[1].payment) : 0,
        principal,
        commercialInput,
        fundInput,
        progress: {
            paid,
            total: rows.length,
            ratio: rows.length > 0 ? paid / rows.length : 0,
        },
        remainingPrincipal,
        paidInterest,
        restInterest,
        next: nextRow
            ? {
                  period: nextRow.period,
                  ym: ymOfPeriod(draft.firstPay, nextRow.period),
                  payment: nextRow.payment,
                  principal: nextRow.principal,
                  interest: nextRow.interest,
              }
            : undefined,
        prepaySaved: Math.max(0, round2(baselineInterest - totalInterest)),
        prepayCount: draft.prepays.length,
        closedAt: commercial.closedAt,
    };
}

/** 同一草稿下两种还款方式的合并对比（对比卡用） */
export function compareMethods(draft: LoanDraft) {
    const a = deriveLoan({ ...draft, method: "installment" });
    const b = deriveLoan({ ...draft, method: "principal" });
    let crossover: number | undefined;
    for (let i = 0; i < Math.min(a.payments.length, b.payments.length); i++) {
        if (b.payments[i] < a.payments[i]) {
            crossover = i + 1;
            break;
        }
    }
    return {
        installment: {
            firstPayment: a.firstPayment,
            totalInterest: a.totalInterest,
            payments: a.payments,
            months: a.months,
        },
        principal: {
            firstPayment: b.firstPayment,
            totalInterest: b.totalInterest,
            payments: b.payments,
            months: b.months,
        },
        interestDiff: round2(a.totalInterest - b.totalInterest),
        firstDiff: round2(b.firstPayment - a.firstPayment),
        crossover,
    };
}

export function toPlanInput(
    draft: LoanDraft,
    name: string,
    icon?: string,
): Omit<SavedLoanPlan, "id" | "createdAt"> {
    const derived = deriveLoan(draft);
    return {
        name,
        principal: derived.principal,
        annualRate:
            draft.loanType === "fund" ? draft.fundRate : derived.commercialRate,
        months: Math.round(draft.termYears * 12),
        loanType: draft.loanType,
        mode: draft.mode,
        housePrice: draft.mode === "totalPrice" ? draft.housePrice : undefined,
        downRatio: draft.mode === "totalPrice" ? downRatioOf(draft) : undefined,
        downMode: draft.mode === "totalPrice" ? draft.downMode : undefined,
        downAmountWan:
            draft.mode === "totalPrice" ? downWanOf(draft) : undefined,
        fundAmount: draft.loanType === "combo" ? draft.fundAmount : undefined,
        lpr: draft.lpr,
        bp: draft.bp,
        fundRate: draft.loanType === "commercial" ? undefined : draft.fundRate,
        fundSuite:
            draft.loanType === "commercial" ? undefined : draft.fundSuite,
        method: draft.method,
        firstPayYear: draft.firstPay.year,
        firstPayMonth: draft.firstPay.month,
        icon,
        rateChanges: draft.rateChanges,
        prepays: draft.prepays,
    };
}

/** 第 year 年的起止年月标签（如 2026.12 – 2027.11） */
export function yearRangeLabel(
    firstPay: FirstPayYm,
    year: number,
    months: number,
): string {
    const start = shiftYm(firstPay, (year - 1) * 12);
    const end = shiftYm(firstPay, Math.min(year * 12, months) - 1);
    const fmt = (m: FirstPayYm) => `${m.year}.${`${m.month}`.padStart(2, "0")}`;
    return `${fmt(start)} – ${fmt(end)}`;
}
