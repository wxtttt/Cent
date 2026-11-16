import { useIntl } from "@/locale";
import { GroupTitle } from "../sheet-kit";
import type { DerivedLoan, LoanDraft } from "./model";
import { CompareCard, ScheduleCard, ScheduleLegend } from "./results";
import { AmountSection, TermsSection, TypePicker } from "./sections";

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
    onOpenSheet: (kind: "term" | "commercialRate" | "fundRate") => void;
    onOpenDown: () => void;
}) {
    const t = useIntl();
    return (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4 [&>*]:shrink-0">
            <GroupTitle title={t("loan-type-title")} first />
            <TypePicker
                value={draft.loanType}
                onChange={(loanType) => edit({ loanType })}
            />

            <GroupTitle title={t("loan-amount-title")} />
            <AmountSection
                draft={draft}
                derived={derived}
                edit={edit}
                onOpenDown={onOpenDown}
            />

            <GroupTitle title={t("loan-term-title")} />
            <TermsSection
                draft={draft}
                derived={derived}
                edit={edit}
                onOpenSheet={onOpenSheet}
            />

            {/* 分析卡点哪张，上面的「还款方式」就切到哪种 */}
            <GroupTitle title={t("loan-analysis-title")} />
            <CompareCard
                draft={draft}
                onChange={(method) => edit({ method })}
            />

            <GroupTitle
                title={t("loan-schedule-title")}
                action={<ScheduleLegend />}
            />
            <ScheduleCard derived={derived} />

            <p className="px-1 pt-3 text-[11px] leading-relaxed text-ink-secondary">
                {t("loan-page-disclaimer")}
            </p>
        </div>
    );
}
