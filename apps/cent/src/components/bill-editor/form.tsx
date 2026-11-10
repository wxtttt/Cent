import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAutoRules } from "@/hooks/use-auto-rules";
import useCategory from "@/hooks/use-category";
import { useCurrency } from "@/hooks/use-currency";
import { useWheelScrollX } from "@/hooks/use-wheel-scroll";
import PopupLayout from "@/layouts/popup-layout";
import { matchAutoRule } from "@/ledger/auto-rules";
import { amountToNumber, numberToAmount } from "@/ledger/bill";
import { ExpenseBillCategories, IncomeBillCategories } from "@/ledger/category";
import type { Bill, BillCategory, BillType } from "@/ledger/type";
import { intl, useIntl } from "@/locale";
import { type EditBill, useLedgerStore } from "@/store/ledger";
import { usePreferenceStore } from "@/store/preference";
import { cn } from "@/utils";
import { decodeApiKey } from "@/utils/api-key";
import { getPredictNow } from "@/utils/predict";
import { showTagList } from "../bill-tag";
import { showCategoryList } from "../category";
import CategoryIcon from "../category/icon";
import Deletable from "../deletable";
import { FORMAT_IMAGE_SUPPORTED, showFilePicker } from "../file-picker";
import SmartImage from "../image";
import IOSUnscrolledInput from "../input";
import Calculator from "../keyboard";
import {
    LocationPickerProvider,
    showLocationPicker,
} from "../map/location-picker";
import CurrentLocation from "../simple-location";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";
import { WheelDatePicker } from "../wheel-date-picker";
import { goAddBill } from ".";
import { RemarkHint } from "./remark";
import TagGroupSelector from "./tag-group";

const defaultBill = {
    type: "expense" as Bill["type"],
    comment: "",
    amount: 0,
    categoryId: ExpenseBillCategories[0].id,
};

function CategoryTile({
    category,
    selected,
    onClick,
    className,
}: {
    category: BillCategory;
    selected?: boolean;
    onClick?: () => void;
    className?: string;
}) {
    if (!category.icon) {
        return (
            <button
                type="button"
                onClick={onClick}
                className={cn("flex min-w-0 flex-col items-center", className)}
            >
                <div
                    className={cn(
                        "flex h-[66px] w-full items-center justify-center rounded-2xl px-1 text-center text-xs leading-tight transition-colors duration-[var(--dp-motion-interaction)] ease-[var(--dp-motion-easing)]",
                        selected
                            ? "bg-brand/10 font-medium text-brand ring-1 ring-brand/30"
                            : "bg-ground-muted text-ink",
                    )}
                >
                    <span>{category.name}</span>
                </div>
            </button>
        );
    }
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex min-w-0 flex-col items-center gap-1.5",
                className,
            )}
        >
            <div
                className={cn(
                    "flex size-11 items-center justify-center rounded-2xl transition-colors duration-[var(--dp-motion-interaction)] ease-[var(--dp-motion-easing)]",
                    selected
                        ? "bg-brand/10 text-brand ring-1 ring-brand/30"
                        : "bg-ground-muted text-ink",
                )}
            >
                <CategoryIcon icon={category.icon} className="size-6" />
            </div>
            <span
                className={cn(
                    "w-full truncate text-center text-xs",
                    selected ? "font-medium text-brand" : "text-ink-secondary",
                )}
            >
                {category.name}
            </span>
        </button>
    );
}

export default function EditorForm({
    edit,
    onConfirm,
}: {
    edit?: EditBill;
    onConfirm?: (v: Omit<Bill, "id" | "creatorId">) => void;
}) {
    const t = useIntl();

    const { baseCurrency, convert, quickCurrencies, allCurrencies } =
        useCurrency();

    const { incomes, expenses, categories: allCategories } = useCategory();

    const isCreate = edit === undefined;

    const predictCategory = useMemo(() => {
        // 只有新增账单时才展示预测
        if (!isCreate) {
            return;
        }
        const predict = getPredictNow();
        const pc = predict?.category?.[0];
        if (!pc) {
            return;
        }
        const category = allCategories.find((v) => v.id === pc);
        return category;
    }, [isCreate, allCategories]);

    const predictComments = useMemo(() => {
        // 只有新增账单时才展示预测
        if (!isCreate) {
            return;
        }
        const predict = getPredictNow();
        const pc = predict?.comment;
        return pc;
    }, [isCreate]);

    const getMatchDefaultCategory = (categoryId: string) => {
        const category = [...incomes, ...expenses].find(
            (c) => c.id === categoryId,
        );
        if (!category) {
            return categoryId;
        }
        const defaultSub = category.children.find((v) => v.defaultSelect);
        if (!defaultSub) {
            return categoryId;
        }
        return defaultSub.id;
    };
    const [billState, setBillState] = useState(() => {
        const init = {
            ...defaultBill,
            time: Date.now(),
            ...edit,
            categoryId:
                predictCategory?.id ??
                getMatchDefaultCategory(
                    edit?.categoryId ?? defaultBill.categoryId,
                ),
        };
        if (edit?.currency?.target === baseCurrency.id) {
            delete init.currency;
        }
        return init;
    });

    const handleParentCategoryClick = (parentCategoryId: string) => {
        // 点击父类时，如果此前选中的【是该父类的子类】，则直接选中该父类
        // 否则选中该父类的 MatchDefault 类别
        setBillState((prev) => {
            const parentCategory = [...incomes, ...expenses].find(
                (c) => c.id === parentCategoryId,
            );
            const isPrevParentsChild = parentCategory?.children.some(
                (c) => c.id === prev.categoryId,
            );
            if (isPrevParentsChild) {
                return {
                    ...prev,
                    categoryId: parentCategoryId,
                };
            }
            return {
                ...prev,
                categoryId: getMatchDefaultCategory(parentCategoryId),
            };
        });
    };

    const categories = billState.type === "expense" ? expenses : incomes;

    const subCategories = useMemo(() => {
        const selected = categories.find(
            (c) =>
                c.id === billState.categoryId ||
                c.children.some((s) => s.id === billState.categoryId),
        );
        if (selected?.children) {
            return selected.children;
        }
        return categories.find((c) => c.id === selected?.parent)?.children;
    }, [billState.categoryId, categories]);

    const selectedParent = categories.find(
        (c) =>
            c.id === billState.categoryId ||
            c.children.some((s) => s.id === billState.categoryId),
    );

    // 快速分类只保留 4 个位置，选中的分类若不在前四个则替换末位
    const quickCategories = useMemo(() => {
        const list = categories.slice(0, 4);
        if (selectedParent && !list.some((c) => c.id === selectedParent.id)) {
            if (list.length < 4) {
                list.push(selectedParent);
            } else {
                list[list.length - 1] = selectedParent;
            }
        }
        return list;
    }, [categories, selectedParent]);

    // 自动记账规则建议：备注命中规则且目标分类与当前不同时提示，由用户点击确认
    const { rules: autoRules } = useAutoRules();
    const ruleSuggestion = useMemo(() => {
        if (!isCreate) return undefined;
        const comment = billState.comment?.trim();
        if (!comment) return undefined;
        const rule = matchAutoRule(
            { comment, type: billState.type },
            autoRules,
        );
        if (!rule?.categoryId || rule.categoryId === billState.categoryId) {
            return undefined;
        }
        if (!allCategories.some((c) => c.id === rule.categoryId)) {
            return undefined;
        }
        return rule;
    }, [
        isCreate,
        billState.comment,
        billState.type,
        billState.categoryId,
        autoRules,
        allCategories,
    ]);
    const suggestedCategoryName = ruleSuggestion
        ? (allCategories.find((c) => c.id === ruleSuggestion.categoryId)
              ?.name ?? "")
        : "";

    const changeType = (type: BillType) => {
        setBillState((v) => {
            if (v.type === type) {
                return v;
            }
            return {
                ...v,
                type,
                categoryId:
                    type === "expense"
                        ? ExpenseBillCategories[0].id
                        : IncomeBillCategories[0].id,
            };
        });
    };

    const toConfirm = useCallback(() => {
        onConfirm?.({
            ...billState,
        });
    }, [onConfirm, billState]);

    const toAddAgain = () => {
        toConfirm();
        setTimeout(() => {
            goAddBill({
                ...defaultBill,
                time: billState.time,
            });
        }, 10);
    };

    const chooseImage = async () => {
        const [file] = await showFilePicker({ accept: FORMAT_IMAGE_SUPPORTED });
        setBillState((v) => {
            return { ...v, images: [...(v.images ?? []), file] };
        });
    };

    const mapConfig = useLedgerStore((state) => state.infos?.meta.map);
    const amapKey = useMemo(
        () =>
            mapConfig?.amapKey ? decodeApiKey(mapConfig.amapKey) : undefined,
        [mapConfig?.amapKey],
    );
    const amapSecurityCode = useMemo(
        () =>
            mapConfig?.amapSecurityCode
                ? decodeApiKey(mapConfig.amapSecurityCode)
                : undefined,
        [mapConfig?.amapSecurityCode],
    );
    const handlePickLocation = useCallback(async () => {
        if (!billState.location) return;
        if (!amapKey || !amapSecurityCode) {
            toast.warning(t("map-error-no-api-key"));
            return;
        }
        try {
            const location = await showLocationPicker({
                location: billState.location,
                amapKey,
                amapSecurityCode,
            });
            setBillState((prev) => ({ ...prev, location }));
        } catch {
            // Dialog cancellation should keep the original location untouched.
        }
    }, [amapKey, amapSecurityCode, billState.location, t]);

    const locationRef = useRef<HTMLButtonElement>(null);
    const isAdd = useRef(!edit);
    useEffect(() => {
        if (
            !isAdd.current ||
            !usePreferenceStore.getState().autoLocateWhenAddBill
        ) {
            return;
        }
        locationRef.current?.click?.();
    }, []);

    const targetCurrency =
        allCurrencies.find(
            (c) => c.id === (billState.currency?.target ?? baseCurrency.id),
        ) ?? baseCurrency;

    const changeCurrency = (newCurrencyId: string) =>
        setBillState((prev) => {
            if (newCurrencyId === baseCurrency.id) {
                return {
                    ...prev,
                    amount: prev.currency?.amount ?? prev.amount,
                    currency: undefined,
                };
            }
            const { predict } = convert(
                amountToNumber(prev.currency?.amount ?? prev.amount),
                newCurrencyId,
                baseCurrency.id,
                prev.time,
            );
            return {
                ...prev,
                amount: numberToAmount(predict),
                currency: {
                    base: baseCurrency.id,
                    target: newCurrencyId,
                    amount: prev.currency?.amount ?? prev.amount,
                },
            };
        });

    const calculatorInitialValue = billState?.currency
        ? amountToNumber(billState.currency.amount)
        : billState?.amount
          ? amountToNumber(billState?.amount)
          : 0;

    const [moreOpen, setMoreOpen] = useState(false);

    const tagSelectorRef = useRef<HTMLDivElement>(null);
    useWheelScrollX(tagSelectorRef);

    const amountColor =
        billState.type === "expense"
            ? "text-semantic-expense"
            : "text-semantic-income";

    const dateLabel = dayjs(billState.time).format(
        intl.locale === "zh" ? "M月D日 HH:mm" : "MMM D, HH:mm",
    );

    const iconChipClass =
        "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-panel text-ink-secondary";

    return (
        <Calculator.Root
            initialValue={calculatorInitialValue}
            onValueChange={(n) => {
                setBillState((v) => {
                    if (v.currency) {
                        const { predict } = convert(
                            n,
                            v.currency.target,
                            v.currency.base,
                            v.time,
                        );
                        return {
                            ...v,
                            amount: numberToAmount(predict),
                            currency: {
                                ...v.currency,
                                amount: numberToAmount(n),
                            },
                        };
                    }
                    return {
                        ...v,
                        amount: numberToAmount(n),
                    };
                });
            }}
        >
            <PopupLayout
                className="h-full scrollbar-hidden"
                hideBack
                handle
                title={
                    <div className="flex w-full justify-center pb-1">
                        <div className="flex items-center gap-1 rounded-full bg-panel p-1 shadow-[0_2px_10px_rgba(92,62,30,0.08)] ring-1 ring-rule/50">
                            {(["expense", "income"] as const).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    className={cn(
                                        "h-9 w-24 rounded-full text-sm font-medium transition-colors duration-[var(--dp-motion-interaction)] ease-[var(--dp-motion-easing)]",
                                        billState.type === type
                                            ? "bg-ground-muted text-ink"
                                            : "text-ink-secondary",
                                    )}
                                    onClick={() => changeType(type)}
                                >
                                    {t(type)}
                                </button>
                            ))}
                        </div>
                    </div>
                }
            >
                <div className="flex min-h-0 flex-1 flex-col">
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-hidden">
                        {/* categories */}
                        <div
                            data-sheet-drag
                            className="mx-3 flex-shrink-0 rounded-[22px] bg-panel px-2 pb-3 pt-2.5"
                        >
                            <div className="flex items-start gap-1">
                                {quickCategories.map((item) => (
                                    <CategoryTile
                                        key={item.id}
                                        category={item}
                                        selected={
                                            selectedParent?.id === item.id
                                        }
                                        className="flex-1"
                                        onClick={() =>
                                            handleParentCategoryClick(item.id)
                                        }
                                    />
                                ))}
                                <Popover
                                    open={moreOpen}
                                    onOpenChange={setMoreOpen}
                                >
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                                        >
                                            <div className="flex size-11 items-center justify-center rounded-2xl bg-ground-muted text-ink-secondary">
                                                <i className="icon-[lucide--ellipsis] size-6" />
                                            </div>
                                            <span className="text-xs text-ink-secondary">
                                                {t("more")}
                                            </span>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        align="end"
                                        side="top"
                                        sideOffset={10}
                                        className="w-[min(88vw,340px)] rounded-2xl p-3"
                                    >
                                        <div className="grid grid-cols-4 gap-x-1 gap-y-3">
                                            {categories.map((item) => (
                                                <CategoryTile
                                                    key={item.id}
                                                    category={item}
                                                    selected={
                                                        selectedParent?.id ===
                                                        item.id
                                                    }
                                                    className="w-full"
                                                    onClick={() => {
                                                        handleParentCategoryClick(
                                                            item.id,
                                                        );
                                                        setMoreOpen(false);
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-ground-muted text-xs text-ink-secondary"
                                            onClick={() => {
                                                setMoreOpen(false);
                                                showCategoryList(
                                                    billState.type,
                                                );
                                            }}
                                        >
                                            <i className="icon-[lucide--settings] size-4" />
                                            {t("category-management")}
                                        </button>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            {(subCategories?.length ?? 0) > 0 && (
                                <div className="mt-2.5 flex gap-1.5 overflow-x-auto scrollbar-hidden">
                                    {subCategories?.map((subCategory) => {
                                        const selected =
                                            billState.categoryId ===
                                            subCategory.id;
                                        return (
                                            <button
                                                key={subCategory.id}
                                                type="button"
                                                className={cn(
                                                    "h-7 flex-shrink-0 rounded-full px-3 text-xs transition-colors duration-[var(--dp-motion-interaction)] ease-[var(--dp-motion-easing)]",
                                                    selected
                                                        ? "bg-brand/10 font-medium text-brand"
                                                        : "bg-ground-muted text-ink-secondary",
                                                )}
                                                onClick={() =>
                                                    setBillState((v) => ({
                                                        ...v,
                                                        categoryId:
                                                            subCategory.id,
                                                    }))
                                                }
                                            >
                                                {subCategory.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* meta chips */}
                        <div
                            ref={tagSelectorRef}
                            className="mt-3 flex flex-shrink-0 items-center gap-2 overflow-x-auto px-3 scrollbar-hidden"
                        >
                            <WheelDatePicker
                                title={t("ledger")}
                                displayFormatter={() => ""}
                                value={billState.time}
                                onChange={(time) => {
                                    setBillState((prev) => {
                                        if (!prev.currency) {
                                            return {
                                                ...prev,
                                                time: time,
                                            };
                                        }
                                        const { predict } = convert(
                                            amountToNumber(
                                                prev.currency?.amount ??
                                                    prev.amount,
                                            ),
                                            prev.currency.target,
                                            baseCurrency.id,
                                            time,
                                        );
                                        return {
                                            ...prev,
                                            time: time,
                                            amount: numberToAmount(predict),
                                            currency: {
                                                base: baseCurrency.id,
                                                target: prev.currency.target,
                                                amount:
                                                    prev.currency?.amount ??
                                                    prev.amount,
                                            },
                                        };
                                    });
                                }}
                            >
                                <div className="flex h-9 items-center gap-1.5 rounded-full bg-panel px-3 text-sm">
                                    <i className="icon-[lucide--calendar] size-4 text-ink-secondary" />
                                    <span className="whitespace-nowrap text-[15px] font-medium text-ink">
                                        {dateLabel}
                                    </span>
                                </div>
                            </WheelDatePicker>

                            {quickCurrencies.length > 0 ? (
                                <Select
                                    value={targetCurrency?.id}
                                    onValueChange={changeCurrency}
                                >
                                    <SelectTrigger className="h-9 w-fit flex-shrink-0 gap-1.5 rounded-full border-0 bg-panel px-3 text-sm shadow-none [&>svg]:hidden">
                                        <div className="flex items-center gap-1.5">
                                            <i className="icon-[lucide--wallet] size-4 text-ink-secondary" />
                                            <span className="whitespace-nowrap text-[15px] font-medium text-ink">
                                                {targetCurrency?.label}
                                            </span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {quickCurrencies.map((currency) => (
                                            <SelectItem
                                                key={currency.id}
                                                value={currency.id}
                                            >
                                                {currency.label}
                                                {`(${currency.symbol})`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full bg-panel px-3 text-sm">
                                    <i className="icon-[lucide--wallet] size-4 text-ink-secondary" />
                                    <span className="whitespace-nowrap text-ink">
                                        {baseCurrency.label}
                                    </span>
                                </div>
                            )}

                            <TagGroupSelector
                                isCreate={isCreate}
                                selectedTags={billState.tagIds}
                                onSelectChange={(newTagIds, extra) => {
                                    setBillState((prev) => ({
                                        ...prev,
                                        tagIds: newTagIds,
                                    }));
                                    if (extra?.preferCurrency) {
                                        changeCurrency(extra.preferCurrency);
                                    }
                                }}
                            />

                            <button
                                type="button"
                                className={iconChipClass}
                                title={t("edit-tags")}
                                onClick={() => {
                                    showTagList();
                                }}
                            >
                                <i className="icon-[lucide--tag] size-5" />
                            </button>

                            {isCreate && (
                                <button
                                    type="button"
                                    className="flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full bg-panel px-3 text-sm text-ink-secondary"
                                    onClick={toAddAgain}
                                >
                                    <i className="icon-[lucide--rotate-ccw] size-4" />
                                    <span className="whitespace-nowrap">
                                        {t("add-again")}
                                    </span>
                                </button>
                            )}

                            {billState.images?.map((img, index) => (
                                <Deletable
                                    // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                                    key={index}
                                    onDelete={() => {
                                        setBillState((v) => ({
                                            ...v,
                                            images: v.images?.filter(
                                                (m) => m !== img,
                                            ),
                                        }));
                                    }}
                                >
                                    <SmartImage
                                        source={img}
                                        alt=""
                                        className="size-9 flex-shrink-0 rounded-full object-cover"
                                    />
                                </Deletable>
                            ))}
                            {(billState.images?.length ?? 0) < 3 && (
                                <button
                                    type="button"
                                    className={iconChipClass}
                                    onClick={chooseImage}
                                >
                                    <i className="icon-[lucide--image-plus] size-5" />
                                </button>
                            )}

                            {billState?.location ? (
                                <Deletable
                                    onDelete={() => {
                                        setBillState((prev) => ({
                                            ...prev,
                                            location: undefined,
                                        }));
                                    }}
                                >
                                    <button
                                        type="button"
                                        className={iconChipClass}
                                        onClick={handlePickLocation}
                                    >
                                        <i className="icon-[lucide--map-pin] size-5" />
                                    </button>
                                </Deletable>
                            ) : (
                                <CurrentLocation
                                    ref={locationRef}
                                    className={iconChipClass}
                                    onValueChange={(v) => {
                                        setBillState((prev) => ({
                                            ...prev,
                                            location: v,
                                        }));
                                    }}
                                >
                                    <i className="icon-[lucide--map-pin-plus] size-5" />
                                </CurrentLocation>
                            )}
                        </div>

                        {/* amount */}
                        <div
                            data-sheet-drag
                            className="mx-3 mt-3 flex-shrink-0 rounded-[22px] bg-panel px-4 py-3"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex min-w-0 flex-1 items-baseline">
                                    <span
                                        className={cn(
                                            "mr-0.5 text-2xl font-semibold",
                                            amountColor,
                                        )}
                                    >
                                        {targetCurrency?.symbol}
                                    </span>
                                    <Calculator.Value
                                        label={t("amount")}
                                        onConfirm={toConfirm}
                                        className={cn(
                                            "min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-[32px] font-semibold leading-tight scrollbar-hidden",
                                            amountColor,
                                        )}
                                    />
                                </div>
                                <RemarkHint
                                    recommends={predictComments}
                                    onSelect={(v) => {
                                        setBillState((prev) => ({
                                            ...prev,
                                            comment: `${prev.comment} ${v}`,
                                        }));
                                    }}
                                >
                                    <div className="flex h-9 w-24 flex-shrink-0 items-center">
                                        <IOSUnscrolledInput
                                            value={billState.comment}
                                            onChange={(e) => {
                                                setBillState((v) => ({
                                                    ...v,
                                                    comment: e.target.value,
                                                }));
                                            }}
                                            type="text"
                                            className="w-full bg-transparent text-right text-sm text-ink placeholder:text-ink-secondary/60 outline-none"
                                            placeholder={t(
                                                "click-to-add-comment",
                                            )}
                                            enterKeyHint="done"
                                        />
                                    </div>
                                </RemarkHint>
                            </div>
                            {ruleSuggestion && (
                                <button
                                    type="button"
                                    className="mt-1 flex w-fit cursor-pointer items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] text-brand transition-colors hover:bg-brand/15"
                                    onClick={() => {
                                        const { categoryId } = ruleSuggestion;
                                        if (!categoryId) return;
                                        setBillState((prev) => ({
                                            ...prev,
                                            categoryId,
                                        }));
                                    }}
                                >
                                    <i className="icon-[lucide--wand-sparkles] size-3" />
                                    {t("auto-rule-suggest", {
                                        category: suggestedCategoryName,
                                    })}
                                </button>
                            )}
                            {(billState.currency || billState.amount < 0) && (
                                <div className="mt-1 flex items-center justify-between text-[11px] text-ink-secondary">
                                    {billState.currency ? (
                                        <span>
                                            ≈ {baseCurrency.symbol}{" "}
                                            {amountToNumber(billState.amount)}{" "}
                                            {baseCurrency.label}
                                        </span>
                                    ) : (
                                        <span />
                                    )}
                                    {billState.amount < 0 && (
                                        <span className="text-destructive">
                                            {t("bill-negative-tip")}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* keypad */}
                    <div className="mt-3 flex flex-shrink-0 flex-col px-3 pb-3">
                        <Calculator.Keyboard
                            variant="sheet"
                            actionLabel={t("done")}
                            onAction={toConfirm}
                        />
                    </div>
                </div>
                <LocationPickerProvider />
            </PopupLayout>
        </Calculator.Root>
    );
}
