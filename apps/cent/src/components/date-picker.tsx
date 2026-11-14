import type { ComponentProps } from "react";
import { WheelDatePicker } from "./wheel-date-picker";

/** 全应用统一使用家小满式滚轮选择器，保留旧 DatePicker 调用点 */
export function DatePicker(props: ComponentProps<typeof WheelDatePicker>) {
    return <WheelDatePicker {...props} />;
}
