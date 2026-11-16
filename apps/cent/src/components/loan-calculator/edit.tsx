import { useIntl } from "@/locale";
import type { DerivedLoan, LoanDraft } from "./model";
import { CompareCard, ScheduleCard } from "./results";
import {
    AmountSection,
    GROUP_TITLE,
    TermsSection,
    TypePicker,
} from "./sections";

/** 编辑 / 新增：上半是参数，下半是即时预览（还款分析 + 还款计划） */
export function LoanEdit({
    draft,
    derived,
    edit,
    onOpenSheet,
    onOpenDown,
}: {
    draft: LoanDraft;
    derived: DerivedLoan;
    edit: (patch: Partial<LoanDraft>) => void;
    onOpenSheet: (kind: "term" | "rateCommercial" | "rateFund") => void;
    onOpenDown: () => void;
}) {
    const t = useIntl();
    return (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-4 [&>*]:shrink-0">
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
                        onOpenDown={onOpenDown}
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

                {/* 分析卡点哪张，上面的「还款方式」就切到哪种 */}
                <div>
                    <div className={GROUP_TITLE}>
                        {t("loan-analysis-title")}
                    </div>
                    <CompareCard
                        draft={draft}
                        onChange={(method) => edit({ method })}
                    />
                </div>

                <ScheduleCard derived={derived} />

                <p className="px-1 text-[11px] leading-relaxed text-ink-secondary">
                    {t("loan-page-disclaimer")}
                </p>
            </div>
        </div>
    );
}
