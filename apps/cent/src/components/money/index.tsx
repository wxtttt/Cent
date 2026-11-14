import { toThousand } from "@/utils/number";

interface MoneyProps {
    value: number;
    largeAmountThreshold?: number; // 超过多少金额后自动隐藏小数，默认10万
    className?: string; // 自定义外层样式
    accurate?: boolean; // 永远展示原始值
    pad?: boolean; // 小数不足两位补 0（APK 账单卡恒显 .00）
}

export default function Money({
    value,
    largeAmountThreshold = Infinity,
    className = "",
    accurate,
    pad,
}: MoneyProps) {
    const isTooLarge = Math.abs(value) >= largeAmountThreshold;

    const showDecimals = !isTooLarge;
    const maxDigits = showDecimals ? 2 : 0;

    // 2. 格式化金额
    const formattedString = accurate
        ? toThousand(value, pad ? 2 : 0)
        : toThousand(value, 0, maxDigits);

    // 3. 拆分整数和小数部分
    const [integerPart, decimalPart] = formattedString.split(".");

    return (
        <div
            className={`inline-flex items-baseline ${className}`}
            title={`${value}`}
        >
            {/* 整数部分 */}
            <div className="integer font-semibold">{integerPart}</div>

            {/* 小数部分 - 仅在存在时展示；APK 小数与整数同字号同色，不做淡化 */}
            {decimalPart && <div className="decimal">.{decimalPart}</div>}
        </div>
    );
}
