/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */

import { useState } from "react";
import { useIntl } from "@/locale";
import createConfirmProvider from "../confirm";

type RemarkValue = {
    value: string;
    recommends?: string[];
};

const RemarkForm = ({
    edit,
    onCancel,
    onConfirm,
}: {
    edit?: RemarkValue;
    onCancel?: () => void;
    onConfirm?: (v: string) => void;
}) => {
    const t = useIntl();
    const [value, setValue] = useState(edit?.value ?? "");
    const recommends = edit?.recommends ?? [];

    const appendRecommend = (comment: string) => {
        setValue((prev) => (prev ? `${prev} ${comment}` : comment));
    };

    return (
        <div className="px-5 pb-6 pt-2.5">
            <div className="flex justify-center pb-3">
                <span className="h-1 w-10 rounded-full bg-ink-secondary/30" />
            </div>
            <div className="text-[17px] font-semibold text-ink">
                {t("bill-remark")}
            </div>
            <input
                type="text"
                value={value}
                maxLength={200}
                placeholder={t("bill-remark-placeholder")}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        onConfirm?.(value);
                    }
                }}
                className="mt-3 h-12 w-full rounded-xl border border-rule bg-panel px-3.5 text-[15px] text-ink outline-none placeholder:text-ink-tab focus-visible:border-brand"
            />
            {recommends.length > 0 && (
                <div className="mt-4">
                    <div className="text-[12px] text-ink-secondary">
                        {t("recommend-comments")}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {recommends.map((comment, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => appendRecommend(comment)}
                                className="rounded-full border border-rule bg-panel px-3 py-1.5 text-[13px] text-ink-secondary active:bg-ground-muted"
                            >
                                {comment}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <div className="mt-5 flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="h-[48px] flex-1 rounded-xl bg-[#f0f0f2] text-[15px] text-ink"
                >
                    {t("cancel")}
                </button>
                <button
                    type="button"
                    onClick={() => onConfirm?.(value)}
                    className="h-[48px] flex-1 rounded-xl bg-brand text-[15px] font-medium text-on-brand"
                >
                    {t("confirm")}
                </button>
            </div>
        </div>
    );
};

/** 点金额右侧的备注区后，从底部上滑一层抽屉填写备注 */
export const [RemarkSheetProvider, showRemarkSheet] = createConfirmProvider<
    RemarkValue,
    string
>(RemarkForm, {
    dialogTitle: "Note",
    dialogModalClose: true,
    from: "bottom",
    initialFocus: "input",
    contentClassName:
        "w-full max-w-full rounded-t-[28px] border-0 bg-ground p-0 shadow-none sm:w-[90vw] sm:max-w-[500px] sm:rounded-md",
});
