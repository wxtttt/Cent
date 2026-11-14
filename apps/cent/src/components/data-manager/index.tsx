import { toast } from "sonner";
import PopupLayout from "@/layouts/popup-layout";
import { useIntl } from "@/locale";
import { measure } from "@/measurement";
import { useBookStore } from "@/store/book";
import { useLedgerStore } from "@/store/ledger";
import { cn } from "@/utils";
import { download } from "@/utils/download";
import createConfirmProvider from "../confirm";
import { FORMAT_BACKUP, showFilePicker } from "../file-picker";
import modal from "../modal";
import { Button } from "../ui/button";
import { prepareExportFile, processImportFile } from "./exportable";
import { showOncentImport } from "./oncent";
import { importFromPreviewResult, showImportPreview } from "./preview-form";
import { createSampleData } from "./sample-data";
import { SmartImport } from "./smart-import";

const [SmartImportProvider, showSmartImport] = createConfirmProvider(
    SmartImport,
    {
        dialogTitle: "Smart Import",
        contentClassName:
            "h-full w-full max-h-full max-w-full rounded-none sm:rounded-md sm:max-h-[min(520px,calc(100vh-32px))] sm:w-[90vw] sm:max-w-[500px]",
    },
);

const betaClassName = `relative after:content-['beta'] after:rounded after:bg-yellow-400 after:px-[2px] after:text-[8px] after:block after:absolute after:top-0 after:right-0 after:translate-x-[calc(100%+4px)]`;

function Form({ onCancel }: { onCancel?: () => void }) {
    const t = useIntl();
    const toImport = async () => {
        const bookid = useBookStore.getState().currentBookId;
        if (!bookid) {
            return;
        }
        const [jsonFile] = await showFilePicker({ accept: FORMAT_BACKUP });
        const [stopLoading] = modal.loading();
        const data = await processImportFile(jsonFile).finally(() => {
            stopLoading();
        });
        const res = await showImportPreview({
            bills: data.items,
            meta: data.meta,
        });
        if (!res) {
            return;
        }
        await importFromPreviewResult(res);
        if (res.bills.length > 0) {
            measure("bill_created", {
                source: "import",
                item_count: res.bills.length,
            });
        }
    };

    const toExport = async () => {
        const bookId = useBookStore.getState().currentBookId;
        if (!bookId) {
            return;
        }
        const controller = new AbortController();
        const [stopLoading] = modal.loading({
            onCancel: () => controller.abort(),
        });
        try {
            const { blob, ext } = await prepareExportFile(
                bookId,
                controller.signal,
            );
            await download(
                blob,
                `cent-backup-${bookId.replace("/", "-")}-${new Date().toISOString()}.${ext}`,
            );
        } catch (e) {
            if (!controller.signal.aborted) {
                throw e;
            }
        } finally {
            stopLoading();
        }
    };

    const toImportFromOncent = async () => {
        const [jsonFile] = await showFilePicker({ accept: FORMAT_BACKUP });
        const jsonText = await jsonFile.text();
        const data = JSON.parse(jsonText);
        await showOncentImport(data);
    };

    const toShrinkData = async () => {
        await modal.prompt({ title: t("bill-compression-tip") });

        const isSynced = useLedgerStore.getState().sync === "success";
        if (!isSynced) {
            toast.warning(t("wait-synced-tip"));
            return;
        }
        const bills = await useLedgerStore.getState().refreshBillList();
        const meta = useLedgerStore.getState().infos?.meta;
        await importFromPreviewResult({
            bills,
            meta,
            strategy: "overlap",
        });
    };

    /** 一键把当前账本覆盖成一整套可测数据（危险操作，先二次确认） */
    const toLoadSampleData = async () => {
        try {
            await modal.prompt({
                title: (
                    <div className="flex flex-col gap-2">
                        <span className="text-[15px] text-ink">
                            {t("load-sample-data")}
                        </span>
                        <span className="text-[13px] leading-relaxed text-ink-secondary">
                            {t("sample-data-confirm")}
                        </span>
                    </div>
                ),
            });
        } catch {
            return;
        }
        const [stopLoading] = modal.loading({
            label: (
                <span className="text-[12px] text-ink-secondary">
                    {t("sample-data-loading")}
                </span>
            ),
        });
        try {
            const data = createSampleData();
            await importFromPreviewResult({
                bills: data.items,
                meta: data.meta,
                strategy: "overlap",
            });
            toast.success(t("sample-data-done"));
            stopLoading();
            setTimeout(() => window.location.reload(), 700);
        } catch {
            toast.error(t("sample-data-fail"));
            stopLoading();
        }
    };
    return (
        <PopupLayout
            title={<div className="">{t("data-manager")}</div>}
            onBack={onCancel}
            className="h-full overflow-hidden"
        >
            <div className="flex min-h-0 w-full flex-1 flex-col rounded">
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-6">
                    <div className="px-4 opacity-60 text-sm">{t("backup")}</div>
                    <div className="flex flex-col px-4 gap-2">
                        <Button
                            variant="outline"
                            className="py-4"
                            onClick={toImport}
                        >
                            {t("data-import")}
                        </Button>
                        <Button
                            variant="outline"
                            className="py-4"
                            onClick={toExport}
                        >
                            {t("data-export")}
                        </Button>
                    </div>
                    <div className="px-4 opacity-60 text-sm">{t("others")}</div>
                    <div className="flex flex-col px-4 gap-2">
                        <Button
                            variant="outline"
                            className="py-4"
                            onClick={toImportFromOncent}
                        >
                            {t("import-from-oncent-github-io")}
                        </Button>
                    </div>
                    <div className="flex flex-col px-4 gap-2">
                        <Button
                            variant="outline"
                            className={cn(
                                betaClassName,
                                "py-4 after:translate-x-[calc(50%-4px)] after:translate-y-[-4px]",
                            )}
                            onClick={showSmartImport}
                        >
                            {t("smart-import")}
                        </Button>
                    </div>
                    <div className="flex flex-col px-4 gap-2">
                        <Button
                            variant="outline"
                            className={cn(
                                betaClassName,
                                "py-4 after:translate-x-[calc(50%-4px)] after:translate-y-[-4px]",
                            )}
                            onClick={toShrinkData}
                        >
                            {t("bill-compression")}
                        </Button>
                    </div>
                    <div className="px-4 opacity-60 text-sm mt-2">
                        {t("sample-data")}
                    </div>
                    <div className="flex flex-col px-4 gap-2">
                        <Button
                            variant="outline"
                            className="py-4 border-brand/60 text-brand"
                            onClick={toLoadSampleData}
                        >
                            {t("load-sample-data")}
                        </Button>
                        <span className="text-[11px] leading-relaxed text-ink-secondary">
                            {t("sample-data-hint")}
                        </span>
                    </div>
                </div>
            </div>
            <SmartImportProvider />
        </PopupLayout>
    );
}

export const [DataManagerProvider, showDataManager] = createConfirmProvider(
    Form,
    {
        dialogTitle: "data-manager",
        dialogModalClose: true,
        contentClassName:
            "h-full w-full max-h-full max-w-full rounded-none sm:rounded-panel sm:max-h-[min(520px,calc(100vh-32px))] sm:w-[90vw] sm:max-w-[500px]",
    },
);
