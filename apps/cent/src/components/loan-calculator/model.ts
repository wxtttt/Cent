import type { SavedLoanPlan } from "@/ledger/extra-type";
import {
    aggregateYearly,
    amortizeRows,
    calcLoan,
    type FirstPayYm,
    type LoanInput,
    type LoanMethod,
    type LoanYearRow,
    monthlyDecrease,
    payoffYm,
    shiftYm,
} from "@/ledger/loan";

export type LoanType = "commercial" | "fund" | "combo";
export type LoanMode = "totalPrice" | "amount";

export type LoanDraft = {
    loanType: LoanType;
    mode: LoanMode;
    /** 房屋总价（万） */
    housePrice: number;
    /** 首付比例 0-1 */
    downRatio: number;
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
        amount: 210,
        fundAmount: 60,
        lpr: LATEST_LPR.value,
        bp: -45,
        fundRate: FUND_SUITE_RATES.first,
        fundSuite: "first",
        method: "installment",
        termYears: 30,
        firstPay: nextMonthOf(now),
    };
}

export function toDraft(plan: SavedLoanPlan): LoanDraft {
    const principalWan = round2(plan.principal / 10000);
    const legacyRate = plan.annualRate;
    const lpr = plan.lpr ?? LATEST_LPR.value;
    return {
        loanType: plan.loanType ?? "commercial",
        mode: plan.mode ?? "amount",
        housePrice: plan.housePrice ?? 300,
        downRatio: plan.downRatio ?? 0.3,
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
    };
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
            : round2(draft.housePrice * (1 - draft.downRatio));
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

/** 同一草稿下两种还款方式的合并对比（对比卡用） */
export function compareMethods(draft: LoanDraft) {
    const { commercialInput, fundInput } = tracksOf(draft);
    const merge = (method: LoanMethod) => {
        const a = calcLoan(commercialInput, method);
        if (!fundInput) return a;
        const b = calcLoan(fundInput, method);
        return {
            firstPayment: round2(a.firstPayment + b.firstPayment),
            totalInterest: round2(a.totalInterest + b.totalInterest),
            payments: a.payments.map((p, i) => round2(p + b.payments[i])),
        };
    };
    const installment = merge("installment");
    const principal = merge("principal");
    let crossover: number | undefined;
    for (let i = 0; i < installment.payments.length; i++) {
        if (principal.payments[i] < installment.payments[i]) {
            crossover = i + 1;
            break;
        }
    }
    return {
        installment,
        principal,
        interestDiff: round2(
            installment.totalInterest - principal.totalInterest,
        ),
        firstDiff: round2(principal.firstPayment - installment.firstPayment),
        crossover,
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
    months: number;
    firstPay: FirstPayYm;
    payoff: FirstPayYm;
    method: LoanMethod;
    /** 合并后的逐期月供（元） */
    payments: number[];
    /** 合并后的逐期拆分（月度表用） */
    monthlyRows: { principal: number; interest: number; payment: number }[];
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
};

export function deriveLoan(draft: LoanDraft): DerivedLoan {
    const {
        commercialInput,
        fundInput,
        months,
        totalWan,
        fundWan,
        commercialWan,
        commercialRate,
    } = tracksOf(draft);
    const schedule = calcLoan(commercialInput, draft.method);
    const commercialRows = amortizeRows(commercialInput, draft.method);
    let payments = schedule.payments;
    let monthlyRows = commercialRows;
    let yearly = schedule.yearly;
    let firstPayment = schedule.firstPayment;
    let lastPayment = schedule.lastPayment;
    let totalPayment = schedule.totalPayment;
    let totalInterest = schedule.totalInterest;
    let splitFirst: { commercial: number; fund: number } | undefined;
    if (fundInput) {
        const fundSchedule = calcLoan(fundInput, draft.method);
        const fundRows = amortizeRows(fundInput, draft.method);
        payments = schedule.payments.map((p, i) =>
            round2(p + fundSchedule.payments[i]),
        );
        monthlyRows = commercialRows.map((row, i) => ({
            principal: round2(row.principal + fundRows[i].principal),
            interest: round2(row.interest + fundRows[i].interest),
            payment: round2(row.payment + fundRows[i].payment),
        }));
        yearly = aggregateYearly(
            monthlyRows,
            round2(commercialInput.principal + fundInput.principal),
        );
        firstPayment = payments[0];
        lastPayment = payments[payments.length - 1];
        totalPayment = round2(payments.reduce((s, p) => s + p, 0));
        totalInterest = round2(
            schedule.totalInterest + fundSchedule.totalInterest,
        );
        splitFirst = {
            commercial: schedule.firstPayment,
            fund: fundSchedule.firstPayment,
        };
    }
    const principal = round2(
        commercialInput.principal + (fundInput?.principal ?? 0),
    );
    const decrease = round2(
        fundInput
            ? monthlyDecrease(commercialInput) + monthlyDecrease(fundInput)
            : monthlyDecrease(commercialInput),
    );
    return {
        totalWan,
        fundWan,
        commercialWan,
        commercialRate,
        fundRate: draft.fundRate,
        months,
        firstPay: draft.firstPay,
        payoff: payoffYm(draft.firstPay, months),
        method: draft.method,
        payments,
        monthlyRows,
        yearly,
        firstPayment,
        lastPayment,
        totalPayment,
        totalInterest,
        splitFirst,
        decrease,
        principal,
        commercialInput,
        fundInput,
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
        months: derived.months,
        loanType: draft.loanType,
        mode: draft.mode,
        housePrice: draft.mode === "totalPrice" ? draft.housePrice : undefined,
        downRatio: draft.mode === "totalPrice" ? draft.downRatio : undefined,
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
