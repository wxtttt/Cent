import { useAutoRules } from "@/hooks/use-auto-rules";
import useCategory from "@/hooks/use-category";
import PopupLayout from "@/layouts/popup-layout";
import type { AutoRule } from "@/ledger/extra-type";
import { useIntl } from "@/locale";
import { showSortableList } from "../sortable";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { showAutoRuleEdit } from "./form-provider";

export default function AutoRuleList({ onCancel }: { onCancel?: () => void }) {
    const t = useIntl();
    const { rules, add, update, reorder } = useAutoRules();
    const { categories } = useCategory();

    const categoryLabel = (id?: string) => {
        if (!id) return "-";
        const category = categories.find((c) => c.id === id);
        if (!category) return id;
        return category.customName ? category.name : t(category.name);
    };

    const toAdd = async () => {
        const value = await showAutoRuleEdit();
        if (!value) return;
        await add({ ...value, enabled: true });
    };

    const toEdit = async (rule: AutoRule) => {
        const value = await showAutoRuleEdit(rule);
        if (!value) return;
        await update(rule.id, { ...value, enabled: rule.enabled });
    };

    return (
        <PopupLayout
            title={t("auto-rule-manager")}
            onBack={onCancel}
            right={
                rules.length > 1 ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                            const ordered = await showSortableList(
                                rules.map((r) => ({
                                    id: r.id,
                                    name: r.keyword,
                                })),
                            );
                            await reorder(ordered);
                        }}
                    >
                        <i className="icon-[lucide--grip]" />
                    </Button>
                ) : undefined
            }
        >
            <div className="flex h-full flex-col gap-2 overflow-y-auto p-3">
                <p className="px-1 text-xs text-ink-secondary">
                    {t("auto-rule-description")}
                </p>
                <Button variant="outline" onClick={toAdd}>
                    <i className="icon-[lucide--plus]" />
                    {t("auto-rule-add")}
                </Button>
                {rules.length === 0 ? (
                    <p className="mt-6 text-center text-sm text-ink-secondary">
                        {t("auto-rule-empty")}
                    </p>
                ) : (
                    rules.map((rule) => (
                        <div
                            key={rule.id}
                            className="flex items-center gap-3 rounded-card border border-rule bg-panel p-3 shadow-panel"
                        >
                            <Switch
                                checked={rule.enabled}
                                onCheckedChange={(enabled) =>
                                    update(rule.id, {
                                        keyword: rule.keyword,
                                        type: rule.type,
                                        categoryId: rule.categoryId,
                                        enabled,
                                    })
                                }
                            />
                            <button
                                type="button"
                                className="min-w-0 flex-1 cursor-pointer text-left"
                                onClick={() => toEdit(rule)}
                            >
                                <div className="truncate text-sm font-semibold">
                                    {rule.keyword}
                                </div>
                                <div className="mt-0.5 truncate text-xs text-ink-secondary">
                                    {rule.type
                                        ? t(
                                              rule.type === "expense"
                                                  ? "expense"
                                                  : "income",
                                          )
                                        : t("auto-rule-type-any")}
                                    {" → "}
                                    {categoryLabel(rule.categoryId)}
                                </div>
                            </button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive"
                                onClick={() => update(rule.id, undefined)}
                            >
                                <i className="icon-[apk--trash]" />
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </PopupLayout>
    );
}
