import { useIntl } from "@/locale";
import type { DerivedLoan, LoanDraft } from "./model";
import {
    AmountSection,
    GROUP_TITLE,
    TermsSection,
    TypePicker,
} from "./sections";

/** 编辑 / 新增：只放「参数」，计算结果在详情页看 */
export function LoanEdit({
    draft,
    derived,
    edit,
    onOpenSheet,
}: {
    draft: LoanDraft;
    derived: DerivedLoan;
    edit: (patch: Partial<LoanDraft>) => void;
    onOpenSheet: (kind: "term" | "rateCommercial" | "rateFund") => void;
}) {
    const t = useIntl();
    return (
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 [&>*]:shrink-0">
            <div className="flex flex-col gap-4">
                <div>
                    <div className={GROUP_TITLE}>{t("loan-type-title")}</div>
                    <TypePicker
                        value={draft.loanType}
                        onChange={(loanType) => edit({ loanType })}
                    />
                </div>

                <div>
                    <div className={GROUP_TITLE}>{t("loan-amount-title")}</div>
                    <AmountSection
                        draft={draft}
                        derived={derived}
                        edit={edit}
                    />
                </div>

                <div>
                    <div className={GROUP_TITLE}>{t("loan-term-title")}</div>
                    <TermsSection
                        draft={draft}
                        derived={derived}
                        edit={edit}
                        onOpenSheet={onOpenSheet}
                    />
                </div>

                {draft.termYears > 5 && (
                    <div className="rounded-2xl bg-panel/70 px-4 py-3 text-[12px] leading-relaxed text-ink-secondary">
                        {t("loan-rate-note-policy", {
                            date: "2026-09-20",
                            lpr: draft.lpr,
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
