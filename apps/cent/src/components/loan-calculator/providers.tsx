import { createDeleteConfirm } from "../delete-confirm";

/** 贷款模块的删除二次确认实例（每模块一个，避免重复挂载） */
export const [LoanDeleteProvider, showLoanDelete] = createDeleteConfirm();
