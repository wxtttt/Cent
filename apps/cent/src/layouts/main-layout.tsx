import { Toaster } from "@glink25/toast";
import { useEffect, useRef } from "react";
import { Outlet } from "react-router";
import AppChrome from "@/components/app-chrome";
import { AutoRuleEditProvider, AutoRuleProvider } from "@/components/auto-rule";
import { BillEditorProvider } from "@/components/bill-editor";
import { BillInfoProvider } from "@/components/bill-info";
import { TagListProvider } from "@/components/bill-tag";
import BookGuide from "@/components/book";
import { BookConfirmProvider } from "@/components/book/util";
import { BudgetProvider } from "@/components/budget";
import { BudgetDetailProvider } from "@/components/budget/detail";
import { CategoryListProvider } from "@/components/category";
import { CurrencyListProvider } from "@/components/currency";
import { DataManagerProvider } from "@/components/data-manager";
import { ImportPreviewProvider } from "@/components/data-manager/preview-form";
import { InventoryItemProvider } from "@/components/inventory";
import { LedgerFilterProvider } from "@/components/ledger/filter-sheet";
import { LoanCalculatorProvider } from "@/components/loan-calculator";
import {
    MedicalMedicineProvider,
    MedicalProfileProvider,
    MedicalVisitProvider,
} from "@/components/medical";
import { MemberProvider } from "@/components/member";
import { ModalProvider } from "@/components/modal";
import { PresetProvider } from "@/components/preset";
import { ProfileProvider } from "@/components/profile";
import {
    ScheduledEditProvider,
    ScheduledProvider,
} from "@/components/scheduled";
import { Settings } from "@/components/settings";
import { SortableListProvider } from "@/components/sortable";
import { SortableListWithEnableProvider } from "@/components/sortable/enable";
import { SortableGroupProvider } from "@/components/sortable/group";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VehicleProvider, VehicleRecordProvider } from "@/components/vehicle";
import { WidgetEditProvider } from "@/components/widget/edit-form";
import { WidgetListProvider } from "@/components/widget/list-form";
import { useBudget } from "@/hooks/use-budget";
import { useMembers } from "@/hooks/use-member";
import { useInitPreset } from "@/hooks/use-preset";
import {
    useQuickEntryByClipboard,
    useQuickEntryByRelayr,
    useQuickGoAdd,
} from "@/hooks/use-quick-entry";
import { useScheduled } from "@/hooks/use-scheduled";
import { ThemeProvider } from "@/hooks/use-theme";
import { useUrlHandler } from "@/hooks/use-url-handler";
import { useMeasurementUsageSnapshot } from "@/measurement/usage-snapshot";
import { StatProvider } from "@/pages/stat";
import { useLedgerStore } from "@/store/ledger";
import { usePreferenceStore } from "@/store/preference";
import { startBackgroundPredict } from "@/utils/predict";

export default function MainLayout() {
    useMeasurementUsageSnapshot();
    useQuickGoAdd();
    useQuickEntryByClipboard();
    useQuickEntryByRelayr();
    useUrlHandler(); // 处理标准 URL 链接唤起

    useEffect(() => {
        // predict
        if (usePreferenceStore.getState().smartPredict) {
            startBackgroundPredict();
        }
    }, []);

    // 自动周期记账
    const { applyScheduled } = useScheduled();
    const applyScheduledRef = useRef(applyScheduled);
    applyScheduledRef.current = applyScheduled;
    useEffect(() => {
        applyScheduledRef.current();
    }, []);

    useInitPreset();

    // 账本配置加载完成后：先补成员名单，再补齐所有缺席月份的预算记录（ADR-0003 / 0005）
    const { ensureMembers } = useMembers();
    const { ensureCurrentBudgets } = useBudget();
    const metaReady = useLedgerStore((state) => Boolean(state.infos?.meta));
    const ledgerLoading = useLedgerStore((state) => state.loading);
    useEffect(() => {
        if (!metaReady || ledgerLoading) {
            return;
        }
        void ensureMembers().then(ensureCurrentBudgets);
    }, [metaReady, ledgerLoading, ensureMembers, ensureCurrentBudgets]);

    return (
        <ThemeProvider>
            <TooltipProvider>
                <div className="flex h-full w-full flex-col overflow-hidden bg-ground">
                    <AppChrome />
                    {/* 页头暖米淡出改由 TabPager 各页签滑片自带（首页无渐变），
                        横滑时两页背景才能一起移动 */}
                    <div className="min-h-0 flex-1 overflow-hidden">
                        <Outlet />
                    </div>
                </div>
                <ProfileProvider />
                <BillEditorProvider />
                <BillInfoProvider />
                <SortableListProvider />
                <SortableListWithEnableProvider />
                <SortableGroupProvider />
                <Settings />
                <PresetProvider />
                <WidgetListProvider />
                <DataManagerProvider />
                <ImportPreviewProvider />
                <InventoryItemProvider />
                <MedicalProfileProvider />
                <MedicalVisitProvider />
                <MedicalMedicineProvider />
                <VehicleProvider />
                <VehicleRecordProvider />
                <WidgetEditProvider />
                <CurrencyListProvider />
                <LoanCalculatorProvider />
                <BookGuide />
                <BookConfirmProvider />
                <BudgetProvider />
                <BudgetDetailProvider />
                <AutoRuleProvider />
                <AutoRuleEditProvider />
                <ScheduledProvider />
                <ScheduledEditProvider />
                <LedgerFilterProvider />
                <StatProvider />
                <TagListProvider />
                <MemberProvider />
                <CategoryListProvider />
                <ModalProvider />
                <Toaster />
            </TooltipProvider>
        </ThemeProvider>
    );
}
