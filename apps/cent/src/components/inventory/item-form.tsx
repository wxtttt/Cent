import { useState } from "react";
import { useShallow } from "zustand/shallow";
import { DatePicker } from "@/components/date-picker";
import {
    FORMAT_IMAGE_SUPPORTED,
    showFilePicker,
} from "@/components/file-picker";
import {
    CountedRowInput,
    FormBlock,
    FormCard,
    FormRow,
    RowChevron,
    RowInput,
} from "@/components/form-rows";
import SmartImage from "@/components/image";
import { useCreators } from "@/hooks/use-creator";
import type { InventoryItem } from "@/inventory/types";
import PopupLayout from "@/layouts/popup-layout";
import { useIntl } from "@/locale";
import { useLedgerStore } from "@/store/ledger";
import { cn } from "@/utils";
import createConfirmProvider from "../confirm";
import Deletable from "../deletable";
import { Button } from "../ui/button";

export type InventoryItemValue = Omit<InventoryItem, "id" | "userId" | "time">;

const MAX_IMAGES = 3;

export default function InventoryItemForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit?: InventoryItem;
    onCancel?: () => void;
    onConfirm?: (v: InventoryItemValue) => void;
}) {
    const t = useIntl();
    const creators = useCreators();
    const categorySuggestions = useLedgerStore(
        useShallow((state) => state.infos?.meta.inventoryCategories ?? []),
    );

    const [name, setName] = useState(edit?.name ?? "");
    const [kind, setKind] = useState<InventoryItem["kind"]>(
        edit?.kind ?? "physical",
    );
    const [category, setCategory] = useState(edit?.category ?? "");
    const [quantityText, setQuantityText] = useState(
        String(edit?.quantity ?? 1),
    );
    const [unit, setUnit] = useState(edit?.unit ?? "");
    const [priceText, setPriceText] = useState(
        edit?.price === undefined ? "" : String(edit.price),
    );
    const [expiryDate, setExpiryDate] = useState<number | undefined>(
        edit?.expiryDate,
    );
    const [images, setImages] = useState<(File | string)[]>(edit?.images ?? []);
    const [memberIds, setMemberIds] = useState<(string | number)[]>(
        edit?.memberIds ?? [],
    );
    const [remark, setRemark] = useState(edit?.remark ?? "");

    const quantity = Math.max(0, Number(quantityText) || 0);
    const price = Number(priceText) || undefined;
    const valid = name.trim().length > 0;

    const chooseImage = async () => {
        if (images.length >= MAX_IMAGES) return;
        const [file] = await showFilePicker({ accept: FORMAT_IMAGE_SUPPORTED });
        if (file) {
            setImages((prev) => [...prev, file]);
        }
    };

    return (
        <PopupLayout
            title={edit ? t("inventory-edit") : t("inventory-add")}
            onBack={onCancel}
            handle
            right={
                <Button
                    size="sm"
                    disabled={!valid}
                    onClick={() =>
                        onConfirm?.({
                            name: name.trim(),
                            kind,
                            category: category.trim() || undefined,
                            quantity,
                            unit: unit.trim() || undefined,
                            price,
                            expiryDate,
                            images: images.length > 0 ? images : undefined,
                            memberIds:
                                memberIds.length > 0 ? memberIds : undefined,
                            remark: remark.trim() || undefined,
                            status: edit?.status ?? "in_use",
                        })
                    }
                >
                    {t("confirm")}
                </Button>
            }
        >
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-3 pb-6">
                <FormCard>
                    <FormRow label={t("inventory-name")}>
                        <RowInput
                            value={name}
                            placeholder={t("inventory-name-placeholder")}
                            onChange={setName}
                        />
                    </FormRow>
                    <FormRow label={t("inventory-kind")}>
                        <div className="flex items-center gap-1 rounded-full bg-ground-muted/70 p-0.5">
                            {(
                                [
                                    ["physical", "inventory-kind-physical"],
                                    ["virtual", "inventory-kind-virtual"],
                                ] as const
                            ).map(([value, key]) => (
                                <button
                                    key={value}
                                    type="button"
                                    className={cn(
                                        "cursor-pointer rounded-full px-3 py-1 text-xs transition-all",
                                        kind === value
                                            ? "bg-panel font-medium text-ink shadow-panel"
                                            : "text-ink-secondary",
                                    )}
                                    onClick={() => setKind(value)}
                                >
                                    {t(key)}
                                </button>
                            ))}
                        </div>
                    </FormRow>
                    <FormRow label={t("inventory-category")}>
                        <RowInput
                            value={category}
                            placeholder={t("inventory-category-placeholder")}
                            onChange={setCategory}
                        />
                    </FormRow>
                    {categorySuggestions.length > 0 && (
                        <FormBlock>
                            {categorySuggestions.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    className={cn(
                                        "cursor-pointer rounded-full px-2.5 py-1 text-xs transition-colors",
                                        category === suggestion
                                            ? "bg-brand/10 font-medium text-brand"
                                            : "bg-ground-muted text-ink-secondary",
                                    )}
                                    onClick={() => setCategory(suggestion)}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </FormBlock>
                    )}
                    <FormRow label={t("inventory-quantity")}>
                        <RowInput
                            value={quantityText}
                            inputMode="decimal"
                            onChange={setQuantityText}
                        />
                    </FormRow>
                    <FormRow label={t("inventory-unit")}>
                        <RowInput
                            value={unit}
                            placeholder={t("inventory-unit-placeholder")}
                            onChange={setUnit}
                        />
                    </FormRow>
                    {creators.length > 1 && (
                        <FormRow label={t("inventory-members")}>
                            <div className="flex flex-wrap justify-end gap-1.5">
                                {creators.map((creator) => {
                                    const selected = memberIds.includes(
                                        creator.id,
                                    );
                                    return (
                                        <button
                                            key={String(creator.id)}
                                            type="button"
                                            className={cn(
                                                "cursor-pointer rounded-full px-2.5 py-1 text-xs transition-colors",
                                                selected
                                                    ? "bg-brand/10 font-medium text-brand"
                                                    : "bg-ground-muted text-ink-secondary",
                                            )}
                                            onClick={() =>
                                                setMemberIds((prev) =>
                                                    selected
                                                        ? prev.filter(
                                                              (id) =>
                                                                  id !==
                                                                  creator.id,
                                                          )
                                                        : [...prev, creator.id],
                                                )
                                            }
                                        >
                                            {creator.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </FormRow>
                    )}
                </FormCard>

                <FormCard>
                    <FormRow label={t("inventory-price")}>
                        <RowInput
                            value={priceText}
                            inputMode="decimal"
                            placeholder="0"
                            onChange={setPriceText}
                        />
                    </FormRow>
                    <FormRow label={t("inventory-expiry")}>
                        <DatePicker
                            type="date"
                            value={expiryDate}
                            onChange={(v) => setExpiryDate(v)}
                            displayFormatter={(d) =>
                                d ? d.format("YYYY-MM-DD") : ""
                            }
                        >
                            <button
                                type="button"
                                className="flex cursor-pointer items-center gap-0.5 text-[15px]"
                            >
                                <span
                                    className={cn(
                                        expiryDate
                                            ? "text-ink"
                                            : "text-ink-secondary/70",
                                    )}
                                >
                                    {expiryDate
                                        ? new Date(
                                              expiryDate,
                                          ).toLocaleDateString()
                                        : t("inventory-expiry-none")}
                                </span>
                                <RowChevron />
                            </button>
                        </DatePicker>
                    </FormRow>
                    {images.length > 0 && (
                        <FormBlock>
                            {images.map((image, index) => (
                                <Deletable
                                    key={index}
                                    onDelete={() =>
                                        setImages((prev) =>
                                            prev.filter((_, i) => i !== index),
                                        )
                                    }
                                >
                                    <SmartImage
                                        source={image}
                                        className="size-14 rounded-2xl object-cover"
                                    />
                                </Deletable>
                            ))}
                        </FormBlock>
                    )}
                    {images.length < MAX_IMAGES && (
                        <FormBlock>
                            <button
                                type="button"
                                aria-label={t("add")}
                                className="flex size-14 cursor-pointer items-center justify-center rounded-2xl bg-ground-muted text-ink-secondary"
                                onClick={chooseImage}
                            >
                                <i className="icon-[lucide--camera] size-5" />
                            </button>
                        </FormBlock>
                    )}
                    <FormRow label={t("inventory-remark")}>
                        <CountedRowInput value={remark} onChange={setRemark} />
                    </FormRow>
                </FormCard>
            </div>
        </PopupLayout>
    );
}
