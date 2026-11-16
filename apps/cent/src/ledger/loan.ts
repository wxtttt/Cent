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

// ---------------------------------------------------------------------------
// 还款生涯引擎：利率调整 + 提前还款都会改变后续每一期
// ---------------------------------------------------------------------------
//
// 旧实现只能「按一组固定参数摊还」，于是提前还款只能做成一次性的模拟卡片，
// 详情页的「已还 / 剩余」也只能靠猜。这里改成事件驱动的逐期摊还：
//   · 利率调整（第 n 期起换利率）→ 等额本息按「剩余期数不变」重算月供；
//   · 提前还款（第 n 期还款后）→ 缩年限保持月供、减月供保持期数；
//   · 两者可叠加，且顺序按时间自然发生。
// 逐期行是详情页进度、还款计划、利率轨迹的唯一数据源。

/** 第 period 期起生效的新利率（period 1-based） */
export type RateChangeInput = {
    fromPeriod: number;
    annualRate: number;
};

/** 第 atPeriod 期正常还款后追加的一笔提前还款 */
export type PrepayEventInput = {
    atPeriod: number;
    /** 追加金额（元）；mode=payoff 时忽略 */
    amount: number;
    mode: PrepayMode;
    /** 该笔之后的还款方式（缺省沿用） */
    methodAfter?: LoanMethod;
};

export type ScheduleRow = {
    /** 期号，1-based */
    period: number;
    principal: number;
    interest: number;
    payment: number;
    /** 本期还完后的剩余本金 */
    remaining: number;
    /** 本期适用年利率（%） */
    annualRate: number;
};

export type ScheduleInput = {
    principal: number;
    months: number;
    method: LoanMethod;
    annualRate: number;
    rateChanges?: RateChangeInput[];
    prepays?: PrepayEventInput[];
};

export type ScheduleResult = {
    rows: ScheduleRow[];
    /** 实际期数（提前结清会小于原始期数） */
    months: number;
    totalPayment: number;
    totalInterest: number;
    firstPayment: number;
    lastPayment: number;
    /** 提前结清时结清的期号 */
    closedAt?: number;
};

const MAX_PERIODS = 12 * 60;

/** 等额本息月供 */
function pmt(principal: number, annualRate: number, months: number): number {
    if (months <= 0) return principal;
    const r = annualRate / 100 / 12;
    if (r <= 0) return principal / months;
    const pow = (1 + r) ** months;
    return (principal * r * pow) / (pow - 1);
}

/** 固定月供下还要多少期（等额本息反解，向上取整） */
function periodsFor(
    principal: number,
    annualRate: number,
    payment: number,
): number {
    const r = annualRate / 100 / 12;
    if (r <= 0) return Math.max(1, Math.ceil(principal / payment));
    if (payment <= principal * r) return MAX_PERIODS;
    const n = Math.log(payment / (payment - principal * r)) / Math.log(1 + r);
    return Math.max(1, Math.ceil(n - 1e-9));
}

export function buildSchedule(input: ScheduleInput): ScheduleResult {
    const total = Math.max(1, Math.round(input.months));
    const rateChanges = [...(input.rateChanges ?? [])].sort(
        (a, b) => a.fromPeriod - b.fromPeriod,
    );
    const prepays = [...(input.prepays ?? [])].sort(
        (a, b) => a.atPeriod - b.atPeriod,
    );

    let method = input.method;
    let annualRate = input.annualRate;
    let remaining = input.principal;
    let endPeriod = total;
    let monthlyPayment = pmt(remaining, annualRate, endPeriod);
    let principalPerMonth = remaining / endPeriod;

    const rows: ScheduleRow[] = [];
    let closedAt: number | undefined;

    for (let i = 1; i <= endPeriod && i <= MAX_PERIODS; i++) {
        // 本期起生效的利率调整（同一期多条取最后一条）
        const change = rateChanges.find((c) => c.fromPeriod === i);
        if (change && Math.abs(change.annualRate - annualRate) > 1e-9) {
            annualRate = change.annualRate;
            if (method === "installment") {
                monthlyPayment = pmt(remaining, annualRate, endPeriod - i + 1);
            }
        }

        const restPeriods = Math.max(1, endPeriod - i + 1);
        const interest = round2((remaining * annualRate) / 100 / 12);
        let principalPart: number;
        if (method === "installment") {
            principalPart = round2(monthlyPayment - interest);
            // 利率骤升导致月供覆盖不了利息：退回按剩余期数均摊，避免负摊还
            if (principalPart <= 0) {
                principalPart = round2(remaining / restPeriods);
                monthlyPayment = round2(principalPart + interest);
            }
        } else {
            principalPart = round2(principalPerMonth);
        }
        if (i >= endPeriod || principalPart > remaining) {
            principalPart = remaining;
        }

        const payment = round2(principalPart + interest);
        remaining = round2(remaining - principalPart);
        rows.push({
            period: i,
            principal: principalPart,
            interest,
            payment,
            remaining: Math.max(0, remaining),
            annualRate,
        });

        // 本期还款后的提前还款事件（可能同一点有多笔）
        for (const event of prepays) {
            if (event.atPeriod !== i) continue;
            if (event.mode === "payoff") {
                remaining = 0;
            } else {
                remaining = round2(Math.max(0, remaining - event.amount));
            }
            if (rows.length > 0) {
                rows[rows.length - 1].remaining = Math.max(0, remaining);
            }
            if (event.methodAfter && event.methodAfter !== method) {
                method = event.methodAfter;
                if (method === "installment") {
                    monthlyPayment = pmt(
                        remaining,
                        annualRate,
                        Math.max(1, endPeriod - i),
                    );
                } else {
                    principalPerMonth = remaining / Math.max(1, endPeriod - i);
                }
            }
            if (remaining <= 0.005) {
                remaining = 0;
                closedAt = i;
                break;
            }
            if (event.mode === "shorten") {
                if (method === "installment") {
                    const n = periodsFor(remaining, annualRate, monthlyPayment);
                    endPeriod = i + Math.max(1, Math.min(n, MAX_PERIODS - i));
                } else {
                    const n = Math.ceil(remaining / principalPerMonth);
                    endPeriod = i + Math.max(1, n);
                }
            } else if (event.mode === "reduceMonthly") {
                const rest = Math.max(1, endPeriod - i);
                if (method === "installment") {
                    monthlyPayment = pmt(remaining, annualRate, rest);
                } else {
                    principalPerMonth = remaining / rest;
                }
            }
        }
        if (remaining <= 0.005) {
            remaining = 0;
            closedAt = closedAt ?? (i < total ? i : undefined);
            break;
        }
    }

    const totalPayment = round2(rows.reduce((s, r) => s + r.payment, 0));
    const totalInterest = round2(rows.reduce((s, r) => s + r.interest, 0));
    return {
        rows,
        months: rows.length,
        totalPayment,
        totalInterest,
        firstPayment: rows[0]?.payment ?? 0,
        lastPayment: rows[rows.length - 1]?.payment ?? 0,
        closedAt,
    };
}

/** 年月 → 连续月份索引（用于期号 ↔ 年月换算） */
export function ymIndex(ym: FirstPayYm): number {
    return (ym.year - 1) * 12 + (ym.month - 1);
}

export function ymFromIndex(index: number): FirstPayYm {
    return { year: Math.floor(index / 12) + 1, month: (index % 12) + 1 };
}

/** 首期还款月到「今天」已经过去的期数（不含当月，clamp 到 [0, months]） */
export function periodsElapsed(
    firstPay: FirstPayYm,
    months: number,
    now = new Date(),
): number {
    const nowIndex = (now.getFullYear() - 1) * 12 + now.getMonth();
    return Math.max(0, Math.min(months, nowIndex - ymIndex(firstPay)));
}
