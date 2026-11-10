import { Toaster } from "@glink25/toast";
import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router";
import AppChrome from "@/components/app-chrome";
import { AutoRuleEditProvider, AutoRuleProvider } from "@/components/auto-rule";
import { BillEditorProvider } from "@/components/bill-editor";
import { BillInfoProvider } from "@/components/bill-info";
import { TagListProvider } from "@/components/bill-tag";
import BookGuide from "@/components/book";
import { BookConfirmProvider } from "@/components/book/util";
import { BudgetEditProvider, BudgetProvider } from "@/components/budget";
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

    const { pathname } = useLocation();
    // 家小满四个一级页签页：顶栏暖米底色向下柔和淡出到页面底（APK 实测约 150dp）
    const showTopFade = ["/", "/ledger", "/medical", "/inventory"].includes(
        pathname,
    );

    return (
        <ThemeProvider>
            <TooltipProvider>
                <div className="flex h-full w-full flex-col overflow-hidden bg-ground">
                    <AppChrome />
                    {/* 渐变作为容器背景实现，避免新增定位/层级元素盖住登录弹层 */}
                    <div
                        className={`min-h-0 flex-1 overflow-hidden ${showTopFade ? "page-top-fade" : ""}`}
                    >
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
                <BudgetEditProvider />
                <BudgetDetailProvider />
                <AutoRuleProvider />
                <AutoRuleEditProvider />
                <ScheduledProvider />
                <ScheduledEditProvider />
                <LedgerFilterProvider />
                <StatProvider />
                <TagListProvider />
                <CategoryListProvider />
                <ModalProvider />
                <Toaster />
            </TooltipProvider>
        </ThemeProvider>
    );
}
