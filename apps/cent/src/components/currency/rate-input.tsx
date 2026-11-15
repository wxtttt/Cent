import { useEffect, useState } from "react";
import { useIntl } from "@/locale";
import { BTN_TAP } from "../button-styles";

interface RateInputProps {
    baseCurrencyLabel: string;
    targetCurrencyLabel: string;
    /** 本位币 → 目标币汇率；undefined 表示置空（恢复自动汇率） */
    value: number | undefined;
    onChange: (rate: number | undefined) => void;
    label?: string;
    /** 为 false 时清空输入不会把汇率设为 undefined（用于自定义币种表单） */
    allowClear?: boolean;
}

const RateInput = ({
    baseCurrencyLabel,
    targetCurrencyLabel,
    value,
    onChange,
    allowClear = true,
}: RateInputProps) => {
    const t = useIntl();
    const [isInverted, setIsInverted] = useState(false);
    const [displayValue, setDisplayValue] = useState<string>(
        value != null ? String(value) : "",
    );

    // 当外部 value 改变或切换反转模式时，同步显示数值
    useEffect(() => {
        if (value == null) {
            setDisplayValue("");
            return;
        }
        if (isInverted) {
            // 反转模式显示：1 目标币 = ? 本位币 (即 1/rate)
            const invRate = (1 / value).toFixed(6);
            setDisplayValue(invRate.replace(/\.?0+$/, "")); // 去除多余的0
        } else {
            setDisplayValue(String(value));
        }
    }, [isInverted, value]);

    const handleInputChange = (val: string) => {
        setDisplayValue(val);
        const trimmed = val.trim();
        if (trimmed === "") {
            if (allowClear) {
                onChange(undefined);
            } else if (value != null) {
                setDisplayValue(
                    isInverted
                        ? (1 / value).toFixed(6).replace(/\.?0+$/, "")
                        : String(value),
                );
            }
            return;
        }
        const num = parseFloat(val);
        if (Number.isNaN(num) || num <= 0) return;

        if (isInverted) {
            // 如果是反转模式，传回父组件的值应该是 1 / 输入值
            onChange(1 / num);
        } else {
            onChange(num);
        }
    };

    const toggleInvert = () => {
        setIsInverted(!isInverted);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 py-1">
                <span className="whitespace-nowrap text-[14px] text-ink-secondary">
                    1 {isInverted ? targetCurrencyLabel : baseCurrencyLabel} =
                </span>
                <input
                    type="text"
                    inputMode="decimal"
                    className="min-w-0 flex-1 bg-transparent text-right text-[15px] text-ink outline-none placeholder:text-ink-secondary/70"
                    value={displayValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="0.00"
                />
                <span className="whitespace-nowrap text-[14px] text-ink-secondary">
                    {isInverted ? baseCurrencyLabel : targetCurrencyLabel}
                </span>
                <button
                    type="button"
                    onClick={toggleInvert}
                    title={t("rate-invert")}
                    className={BTN_TAP}
                >
                    <i className="icon-[lucide--arrow-left-right] size-3.5" />
                </button>
            </div>

            <p className="text-[11px] text-ink-secondary">
                * {t("rate-hint")} 1 {baseCurrencyLabel} ={" "}
                {value != null ? value : "—"} {targetCurrencyLabel}
            </p>
        </div>
    );
};

export default RateInput;
