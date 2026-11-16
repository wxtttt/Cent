// 贷款计算：等额本息 / 等额本金、组合贷款双轨、首次还款月定位还款计划、
// 提前还款三模式模拟。金额单位为元，逐期按分（2 位小数）取整，末期自动补齐尾差。

export type LoanMethod = "installment" | "principal";

export type LoanInput = {
    /** 贷款本金（元） */
    principal: number;
    /** 年利率（百分数，如 3.6 表示 3.6%） */
    annualRate: number;
    /** 还款期数（月） */
    months: number;
};

export type LoanYearRow = {
    /** 第几年，从 1 开始 */
    year: number;
    /** 该年归还本金 */
    principal: number;
    /** 该年支付利息 */
    interest: number;
    /** 该年还款总额 */
    total: number;
    /** 年末剩余本金 */
    remaining: number;
};

export type LoanResult = {
    method: LoanMethod;
    /** 首期还款额 */
    firstPayment: number;
    /** 末期还款额（等额本息时与首期相同） */
    lastPayment: number;
    /** 还款总额 */
    totalPayment: number;
    /** 利息总额 */
    totalInterest: number;
    /** 每期还款额 */
    payments: number[];
    /** 按年聚合的还款拆分 */
    yearly: LoanYearRow[];
};

/** 首次还款所在年月，month 1-12 */
export type FirstPayYm = { year: number; month: number };

type MonthlyRow = { principal: number; interest: number; payment: number };

const round2 = (v: number) => Math.round(v * 100) / 100;

/** 生成逐期还款表，末期把剩余本金一次结清，避免浮点尾差。 */
function amortize(
    { principal, annualRate, months }: LoanInput,
    method: LoanMethod,
): MonthlyRow[] {
    const r = annualRate / 100 / 12;
    const rows: MonthlyRow[] = [];
    let remaining = principal;
    if (method === "installment") {
        const pay =
            r === 0
                ? principal / months
                : (principal * r * (1 + r) ** months) / ((1 + r) ** months - 1);
        for (let i = 1; i <= months; i++) {
            const interest = round2(remaining * r);
            const principalPart =
                i === months ? remaining : round2(pay - interest);
            rows.push({
                principal: principalPart,
                interest,
                payment: round2(principalPart + interest),
            });
            remaining = round2(remaining - principalPart);
        }
    } else {
        const monthlyPrincipal = principal / months;
        for (let i = 1; i <= months; i++) {
            const principalPart =
                i === months ? remaining : round2(monthlyPrincipal);
            const interest = round2(remaining * r);
            rows.push({
                principal: principalPart,
                interest,
                payment: round2(principalPart + interest),
            });
            remaining = round2(remaining - principalPart);
        }
    }
    return rows;
}

function aggregate(
    rows: MonthlyRow[],
    totalPrincipal: number,
    method: LoanMethod,
): LoanResult {
    const yearly: LoanYearRow[] = [];
    let principalPaid = 0;
    rows.forEach((row, index) => {
        const year = Math.floor(index / 12) + 1;
        const item = yearly[year - 1] ?? {
            year,
            principal: 0,
            interest: 0,
            total: 0,
            remaining: 0,
        };
        principalPaid = round2(principalPaid + row.principal);
        item.principal = round2(item.principal + row.principal);
        item.interest = round2(item.interest + row.interest);
        item.total = round2(item.total + row.payment);
        item.remaining = round2(totalPrincipal - principalPaid);
        yearly[year - 1] = item;
    });
    const totalPayment = round2(rows.reduce((sum, r) => sum + r.payment, 0));
    const totalInterest = round2(rows.reduce((sum, r) => sum + r.interest, 0));
    return {
        method,
        firstPayment: rows[0]?.payment ?? 0,
        lastPayment: rows[rows.length - 1]?.payment ?? 0,
        totalPayment,
        totalInterest,
        payments: rows.map((r) => r.payment),
        yearly,
    };
}

export function calcLoan(input: LoanInput, method: LoanMethod): LoanResult {
    return aggregate(amortize(input, method), input.principal, method);
}

/** 逐期拆分（本金 / 利息 / 月供），供组合贷款合并与月度表使用 */
export function amortizeRows(
    input: LoanInput,
    method: LoanMethod,
): { principal: number; interest: number; payment: number }[] {
    return amortize(input, method);
}

/** 按逐期拆分聚合年度行（组合贷款合并后重建年度表用） */
export function aggregateYearly(
    rows: { principal: number; interest: number; payment: number }[],
    totalPrincipal: number,
): LoanYearRow[] {
    const yearly: LoanYearRow[] = [];
    let principalPaid = 0;
    rows.forEach((row, index) => {
        const year = Math.floor(index / 12) + 1;
        const item = yearly[year - 1] ?? {
            year,
            principal: 0,
            interest: 0,
            total: 0,
            remaining: 0,
        };
        principalPaid = round2(principalPaid + row.principal);
        item.principal = round2(item.principal + row.principal);
        item.interest = round2(item.interest + row.interest);
        item.total = round2(item.total + row.payment);
        item.remaining = round2(totalPrincipal - principalPaid);
        yearly[year - 1] = item;
    });
    return yearly;
}

/** 两种还款方式一起算，附带利息差（等额本金通常更省）。 */
export function compareLoans(input: LoanInput) {
    const installment = calcLoan(input, "installment");
    const principal = calcLoan(input, "principal");
    return {
        installment,
        principal,
        interestDiff: round2(
            installment.totalInterest - principal.totalInterest,
        ),
    };
}

/**
 * 等额本金月供从第几个月起低于等额本息（1-based）。
 * 等额本息月供固定，等额本金月供线性下降，必然存在交叉；金额太小或利率为 0 时可能整期不交叉。
 */
export function crossoverMonth(input: LoanInput): number | undefined {
    const r = input.annualRate / 100 / 12;
    if (r <= 0) return undefined;
    const { payments: fixed } = calcLoan(input, "installment");
    const { payments: decreasing } = calcLoan(input, "principal");
    for (let i = 0; i < fixed.length; i++) {
        if (decreasing[i] < fixed[i]) return i + 1;
    }
    return undefined;
}

/** 末期还款落在的年月（首次还款月 + 期数 - 1）。 */
export function payoffYm(firstPay: FirstPayYm, months: number): FirstPayYm {
    const index = (firstPay.year - 1) * 12 + (firstPay.month - 1) + months - 1;
    return { year: Math.floor(index / 12) + 1, month: (index % 12) + 1 };
}

/** 第 k 期（1-based）开始的年月。 */
export function shiftYm(firstPay: FirstPayYm, offset: number): FirstPayYm {
    const index = (firstPay.year - 1) * 12 + (firstPay.month - 1) + offset;
    return { year: Math.floor(index / 12) + 1, month: (index % 12) + 1 };
}

/** 等额本金逐月递减额 = 每月本金 × 月利率。 */
export function monthlyDecrease(input: LoanInput): number {
    return round2(
        (input.principal / input.months) * (input.annualRate / 100 / 12),
    );
}

export type PrepayMode = "shorten" | "reduceMonthly" | "payoff";

export type PrepayInput = {
    mode: PrepayMode;
    /** 提前还款金额（元） */
    extraAmount: number;
    /** 从第几期起提前还款（1-based，在该期正常还款后追加） */
    startMonth: number;
};

export type PrepayResult = {
    /** 是否一次结清（第 startMonth 期后无剩余） */
    payoff: boolean;
    /** 原方案剩余利息（自 startMonth 之后） */
    originalRestInterest: number;
    /** 提前后剩余利息 */
    newRestInterest: number;
    /** 省下的利息 */
    savedInterest: number;
    /** 提前结清的期数（缩短期数；减月供为 0） */
    monthsShortened: number;
    /** 减月供后的新月供（仅 reduceMonthly） */
    newMonthly?: number;
    /** 缩年限后的新首期月供（仅 shorten，等额本金时随新期数变化） */
    newFirstMonthly?: number;
    /** 一次性结清所需金额（仅 payoff） */
    payoffAmount?: number;
    /** 提前还款后剩余期数 */
    restMonths: number;
};

/**
 * 提前还款模拟：第 startMonth 期正常还款后追加 extraAmount。
 * 缩年限 = 月供不变求新期数；减月供 = 剩余期数不变求新月供；一次性结清 = 直接结清剩余本金。
 */
export function simulatePrepay(
    input: LoanInput,
    method: LoanMethod,
    { mode, extraAmount, startMonth }: PrepayInput,
): PrepayResult {
    const rows = amortize(input, method);
    const k = Math.max(1, Math.min(startMonth, input.months));
    const paidBefore = rows.slice(0, k).reduce((s, r) => s + r.principal, 0);
    const balanceAfterK = round2(input.principal - paidBefore);
    const originalRestInterest = round2(
        rows.slice(k).reduce((s, r) => s + r.interest, 0),
    );
    const r = input.annualRate / 100 / 12;
    const payoff = mode === "payoff" || extraAmount >= balanceAfterK;
    if (payoff) {
        const amount = mode === "payoff" ? balanceAfterK : extraAmount;
        return {
            payoff: true,
            originalRestInterest,
            newRestInterest: 0,
            savedInterest: originalRestInterest,
            monthsShortened: input.months - k,
            payoffAmount: balanceAfterK,
            restMonths: 0,
        };
    }
    const balance = round2(balanceAfterK - extraAmount);
    const restMonths = input.months - k;
    if (balance <= 0 || restMonths <= 0) {
        return {
            payoff: true,
            originalRestInterest,
            newRestInterest: 0,
            savedInterest: originalRestInterest,
            monthsShortened: input.months - k,
            payoffAmount: balanceAfterK,
            restMonths: 0,
        };
    }
    if (mode === "reduceMonthly") {
        const next = calcLoan(
            {
                principal: balance,
                annualRate: input.annualRate,
                months: restMonths,
            },
            method,
        );
        const newRestInterest = next.totalInterest;
        return {
            payoff: false,
            originalRestInterest,
            newRestInterest,
            savedInterest: round2(originalRestInterest - newRestInterest),
            monthsShortened: 0,
            newMonthly:
                method === "principal" ? next.firstPayment : next.firstPayment,
            restMonths,
        };
    }
    // 缩年限：月供（首期月供）不变，从 1 期向上找最小的能覆盖余额的期数
    const anchor =
        method === "installment"
            ? (rows[k - 1]?.payment ?? 0)
            : (rows[k - 1]?.payment ?? 0);
    let months = restMonths;
    for (let n = 1; n <= 12 * 50; n++) {
        const candidate = calcLoan(
            { principal: balance, annualRate: input.annualRate, months: n },
            method,
        );
        if (candidate.firstPayment <= anchor * 1.001) {
            months = n;
            break;
        }
    }
    const next = calcLoan(
        { principal: balance, annualRate: input.annualRate, months },
        method,
    );
    const newRestInterest = next.totalInterest;
    return {
        payoff: false,
        originalRestInterest,
        newRestInterest,
        savedInterest: round2(originalRestInterest - newRestInterest),
        monthsShortened: Math.max(0, restMonths - months),
        newFirstMonthly: next.firstPayment,
        restMonths: months,
    };
}
