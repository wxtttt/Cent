import { useState } from "react";
import useCategory from "@/hooks/use-category";
import PopupLayout from "@/layouts/popup-layout";
import type { AutoRule } from "@/ledger/extra-type";
import type { BillType } from "@/ledger/type";
import { useIntl } from "@/locale";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";

export type AutoRuleValue = Omit<AutoRule, "id" | "enabled">;

export default function AutoRuleEditForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit?: AutoRule;
    onCancel?: () => void;
    onConfirm?: (v: AutoRuleValue) => void;
}) {
    const t = useIntl();
    const { categories } = useCategory();
    const [keyword, setKeyword] = useState(edit?.keyword ?? "");
    const [type, setType] = useState<BillType | "any">(edit?.type ?? "any");
    const [categoryId, setCategoryId] = useState(edit?.categoryId ?? "");

    const categoryLabel = (id: string) => {
        const category = categories.find((c) => c.id === id);
        if (!category) return id;
        const name = category.customName ? category.name : t(category.name);
        if (!category.parent) return name;
        const parent = categories.find((p) => p.id === category.parent);
        return parent
            ? `${parent.customName ? parent.name : t(parent.name)} / ${name}`
            : name;
    };

    const valid = keyword.trim().length > 0 && categoryId !== "";

    return (
        <PopupLayout
            title={edit ? t("auto-rule-edit") : t("auto-rule-add")}
            onBack={onCancel}
            right={
                <Button
                    size="sm"
                    disabled={!valid}
                    onClick={() =>
                        onConfirm?.({
                            keyword: keyword.trim(),
                            type: type === "any" ? undefined : type,
                            categoryId,
                        })
                    }
                >
                    {t("confirm")}
                </Button>
            }
        >
            <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-ink-secondary">
                        {t("auto-rule-keyword")}
                    </span>
                    <Input
                        value={keyword}
                        placeholder={t("auto-rule-keyword-placeholder")}
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                    <span className="text-xs text-ink-secondary/70">
                        {t("auto-rule-keyword-description")}
                    </span>
                </div>

                <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-ink-secondary">
                        {t("auto-rule-type")}
                    </span>
                    <RadioGroup
                        value={type}
                        className="flex gap-4"
                        onValueChange={(v) => setType(v as BillType | "any")}
                    >
                        <Label className="flex items-center gap-2">
                            <RadioGroupItem value="any" />
                            {t("auto-rule-type-any")}
                        </Label>
                        <Label className="flex items-center gap-2">
                            <RadioGroupItem value="expense" />
                            {t("expense")}
                        </Label>
                        <Label className="flex items-center gap-2">
                            <RadioGroupItem value="income" />
                            {t("income")}
                        </Label>
                    </RadioGroup>
                </div>

                <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-ink-secondary">
                        {t("auto-rule-category")}
                    </span>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger className="w-full">
                            <SelectValue
                                placeholder={t(
                                    "auto-rule-category-placeholder",
                                )}
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((category) => (
                                <SelectItem
                                    key={category.id}
                                    value={category.id}
                                >
                                    {categoryLabel(category.id)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </PopupLayout>
    );
}
