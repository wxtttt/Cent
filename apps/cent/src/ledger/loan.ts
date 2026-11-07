// 贷款计算：等额本息 / 等额本金两种还款方式的月供、利息与年度拆分。
// 金额单位为元，逐期按分（2 位小数）取整，末期自动补齐尾差。

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

export function calcLoan(input: LoanInput, method: LoanMethod): LoanResult {
    const rows = amortize(input, method);
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
        item.remaining = round2(input.principal - principalPaid);
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
