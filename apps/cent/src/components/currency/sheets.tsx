import { createDeleteConfirm } from "../delete-confirm";
import { createOptionSheet } from "../option-sheet";

/**
 * 汇率与货币页的选项 / 删除弹层实例。
 * 按模块各建一个实例并挂载 Provider（重复挂载会渲染两份弹层）：
 * - 选项抽屉同时服务「本位币」单选与「快捷币种」多选
 * - 删除确认服务自定义币种的破坏性删除
 */
export const [CurrencyOptionProvider, showCurrencyOptionSheet] =
    createOptionSheet();

export const [CurrencyDeleteProvider, showCurrencyDelete] =
    createDeleteConfirm();
