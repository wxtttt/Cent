import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import useCategory from "@/hooks/use-category";
import PopupLayout from "@/layouts/popup-layout";
import type { BillCategory, BillType } from "@/ledger/type";
import { useIntl, useLocale } from "@/locale";
import { cn } from "@/utils";
import CategoryIcon from "./icon";
import {
    CATEGORY_ILLUSTRATIONS,
    ILLUSTRATION_GROUPS,
    ILLUSTRATION_NAMES,
} from "./illustrations";
import { CategoryNameProvider, showCategoryName } from "./name-dialog";
import { CategoryParentProvider, showCategoryParent } from "./parent-dialog";

/** 收入一级分组：把添加态的默认图标限制在当前收支类型内 */
const INCOME_GROUPS = new Set(["wage", "relationship-income", "other-income"]);

const firstIconFor = (type: BillType) =>
    CATEGORY_ILLUSTRATIONS.find((src) =>
        type === "income"
            ? INCOME_GROUPS.has(ILLUSTRATION_GROUPS[src])
            : !INCOME_GROUPS.has(ILLUSTRATION_GROUPS[src]),
    ) ?? CATEGORY_ILLUSTRATIONS[0];

/** 图标名与分类名称的相关度：0 同名、1 前缀、2 包含、3 图标名是名称子串、4 无关 */
const iconMatchScore = (src: string, query: string) => {
    if (!query) {
        return 4;
    }
    const name = ILLUSTRATION_NAMES[src];
    const slug = src.split("/").pop()?.replace(".webp", "") ?? "";
    const values = [name?.zh, name?.en, slug].flatMap((value) =>
        value ? [value.toLowerCase()] : [],
    );
    if (values.some((value) => value === query)) {
        return 0;
    }
    if (values.some((value) => value.startsWith(query))) {
        return 1;
    }
    if (values.some((value) => value.includes(query))) {
        return 2;
    }
    if (values.some((value) => value.length >= 2 && query.includes(value))) {
        return 3;
    }
    return 4;
};

/** 推荐项：点中后把图标、名称、大类一起替换成这里的组合 */
type Recommendation = {
    key: string;
    src: string;
    group: string;
    name: string;
    display: string;
};

/** Fisher-Yates 洗牌：兜底推荐每次重算换一批，避免总是同几张 */
function shuffle<T>(items: T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/** 单个图标格：推荐区与全量网格共用同一套圆形图标 + 名称 + 选中态 */
const IllustrationCell = ({
    src,
    label: customLabel,
    dataIcon,
    wrap = false,
    selected,
    onClick,
}: {
    src: string;
    label?: string;
    dataIcon?: string;
    wrap?: boolean;
    selected: boolean;
    onClick: () => void;
}) => {
    const { locale } = useLocale();
    const name = ILLUSTRATION_NAMES[src];
    const label = customLabel ?? (locale === "zh" ? name?.zh : name?.en);
    return (
        <div
            data-icon={dataIcon}
            className="flex min-w-0 flex-col items-center gap-1"
        >
            {/* 与记一笔分类格子同一套：padding-bottom:100% 保证 WebKit 下也是正圆 */}
            <button
                type="button"
                aria-label={label}
                onClick={onClick}
                className={cn(
                    "relative block w-full shrink-0 rounded-full",
                    selected
                        ? "bg-[#f6e0d2] ring-1 ring-inset ring-brand"
                        : "bg-panel",
                )}
                style={{ paddingBottom: "100%" }}
            >
                <span className="absolute inset-0 flex items-center justify-center p-1.5">
                    <img
                        src={src}
                        alt=""
                        className="size-full object-contain"
                    />
                </span>
            </button>
            <span
                className={cn(
                    "w-full text-center text-[11px] leading-tight",
                    wrap ? "line-clamp-2 min-h-[30px] break-all" : "truncate",
                    selected ? "text-brand" : "text-[#8a8a93]",
                )}
            >
                {label}
            </span>
        </div>
    );
};

const createFormSchema = (t: any) =>
    z.object({
        name: z.string().check(
            z.minLength(1, { message: t("category-name-placeholder") }),
            z.maxLength(50, {
                message: t("max-name-length-limit", { n: 50 }),
            }),
        ),
        parent: z.optional(z.string()),
    });

export default function CategoryEditForm({
    onCancel,
    onConfirm,
    edit,
}: {
    edit?: BillCategory | { id: undefined; parent?: string; type: BillType };
    onCancel?: () => void;
    onConfirm?: (v: any) => void;
}) {
    const t = useIntl();
    const namePlaceholder = t("category-name-placeholder");
    const [category, setCategory] = useState<Omit<BillCategory, "id">>(() => {
        if (edit === undefined || edit.id === undefined) {
            return {
                name: "",
                type: edit?.type ?? "expense",
                color: "#fff",
                icon: edit?.parent ? firstIconFor(edit?.type ?? "expense") : "",
                ...edit,
            };
        }
        return { ...edit };
    });

    const isGroup = category.parent === undefined;
    const isEdit = edit !== undefined && edit.id !== undefined;
    const title = isEdit
        ? t(isGroup ? "edit-group" : "edit-category")
        : t(
              category.type === "expense"
                  ? "add-expense-category"
                  : "add-income-category",
          );

    const formSchema = useMemo(() => createFormSchema(t), [t]);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: category.name,
            parent: category.parent,
        },
    });
    const { expenses, incomes, update, add } = useCategory();
    const parentOptions = (
        category.type === "expense" ? expenses : incomes
    ).filter((p) => p.id !== edit?.id);
    // 一级分组固定，不再允许把分类挂到顶层
    const resolveParent = (value?: string) =>
        value && parentOptions.some((p) => p.id === value)
            ? value
            : parentOptions[0]?.id;
    // 推荐算法在 useMemo 内读分组名，用 ref 保持引用稳定，避免每次 render 重新随机
    const parentOptionsRef = useRef(parentOptions);
    parentOptionsRef.current = parentOptions;

    // 名称是必填项，为空时直接禁用确认按钮
    const nameValue = form.watch("name");
    const parentValue = form.watch("parent");
    const canSubmit = Boolean(nameValue?.trim());

    const { locale } = useLocale();
    const [iconQuery, setIconQuery] = useState("");

    // 推荐区：只从当前支出/收入类型的一级分组里挑图标，避免跨类型推荐。
    const currentGroup = resolveParent(parentValue);
    const nameQuery = nameValue?.trim().toLowerCase() ?? "";
    const rawName = nameValue?.trim() ?? "";
    const groupKey = parentOptions.map((p) => p.id).join("|");
    const groupIds = useMemo(
        () => new Set(groupKey.split("|").filter(Boolean)),
        [groupKey],
    );

    // 点推荐项后才把全量网格滚到该图标，目标行落在可见区第二行
    const gridScrollRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState<{
        src: string;
        seq: number;
    } | null>(null);

    // 算法：文字命中项本身 → 挂到用户当前大类的同图标变体 → 用输入原文命名的变体
    // → 从当前大类随机抽几张兜底；同一组信号下结果保持稳定，不会每次 render 都跳
    const recommendations = useMemo<Recommendation[]>(() => {
        const groupLabel = (id: string) =>
            parentOptionsRef.current.find((p) => p.id === id)?.name ?? id;
        const iconLabel = (src: string) => {
            const name = ILLUSTRATION_NAMES[src];
            return (locale === "zh" ? name?.zh : name?.en) || name?.zh || "";
        };
        const make = (
            src: string,
            group: string,
            name: string,
            key: string,
        ): Recommendation => ({
            key,
            src,
            group,
            name,
            display: `${groupLabel(group)}-${name}`,
        });

        const candidates = CATEGORY_ILLUSTRATIONS.filter((src) =>
            groupIds.has(ILLUSTRATION_GROUPS[src]),
        );
        const inGroup = candidates.filter(
            (src) => ILLUSTRATION_GROUPS[src] === currentGroup,
        );
        const result: Recommendation[] = [];
        const used = new Set<string>();

        if (nameQuery) {
            const best = candidates
                .map((src, index) => ({
                    src,
                    index,
                    score: iconMatchScore(src, nameQuery),
                }))
                .sort((a, b) => a.score - b.score || a.index - b.index)[0];
            if (best && best.score < 4 && iconLabel(best.src)) {
                const { src } = best;
                const realGroup = ILLUSTRATION_GROUPS[src];
                const realLabel = iconLabel(src);
                used.add(src);
                result.push(make(src, realGroup, realLabel, `hit-${src}`));
                if (realGroup !== currentGroup) {
                    result.push(
                        make(src, currentGroup, realLabel, `group-${src}`),
                    );
                }
                if (
                    rawName &&
                    rawName.toLowerCase() !== realLabel.toLowerCase()
                ) {
                    result.push(make(src, realGroup, rawName, `text-${src}`));
                }
            }
        }

        const fill = (pool: string[]) => {
            for (const src of shuffle(pool)) {
                if (result.length >= 5) {
                    break;
                }
                if (used.has(src) || result.some((r) => r.src === src)) {
                    continue;
                }
                result.push(
                    make(
                        src,
                        ILLUSTRATION_GROUPS[src],
                        iconLabel(src),
                        `fill-${src}`,
                    ),
                );
            }
        };
        fill(inGroup);
        fill(candidates);
        return result.slice(0, 5);
    }, [groupIds, currentGroup, nameQuery, rawName, locale]);
    // 网格保持原始顺序，只按搜索框实时过滤；推荐区与网格相互独立
    // 中文名、英文名、slug 都能命中，不做拼音
    const visibleIcons = useMemo(() => {
        const query = iconQuery.trim().toLowerCase();
        if (!query) {
            return CATEGORY_ILLUSTRATIONS;
        }
        return CATEGORY_ILLUSTRATIONS.filter((src) => {
            const name = ILLUSTRATION_NAMES[src];
            const slug = src.split("/").pop()?.replace(".webp", "") ?? "";
            return [name?.zh, name?.en, slug].some((value) =>
                value?.toLowerCase().includes(query),
            );
        });
    }, [iconQuery]);

    // 只在点击推荐项时定位：目标图标所在行成为可见区第二行（上方留一行）
    useEffect(() => {
        const container = gridScrollRef.current;
        if (!container || !autoScroll) {
            return;
        }
        const cell = container.querySelector<HTMLElement>(
            `[data-icon="${autoScroll.src}"]`,
        );
        if (!cell) {
            return;
        }
        const cRect = container.getBoundingClientRect();
        const tRect = cell.getBoundingClientRect();
        const rowStride = tRect.height + 12;
        const top = container.scrollTop + (tRect.top - cRect.top) - rowStride;
        container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }, [autoScroll]);

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        const parent = isGroup ? undefined : resolveParent(data.parent);
        if (edit === undefined || edit.id === undefined) {
            const newId = await add({ ...category, ...data, parent });
            onConfirm?.(newId);
            return;
        }
        const formattedData = { ...data, parent, icon: category.icon };
        const unchanged =
            edit.icon === formattedData.icon &&
            edit.name === formattedData.name &&
            edit.parent === formattedData.parent;
        if (unchanged) {
            onCancel?.();
            return;
        }
        await update(edit.id, formattedData);
        onConfirm?.(edit.id);
    };

    // 上面已经有名称时选图标完全不动它，只有名称为空才补一个默认名
    const selectIcon = (icon: string) => {
        setCategory((v) => ({ ...v, icon }));
        if (form.getValues("name")?.trim()) {
            return;
        }
        const name = ILLUSTRATION_NAMES[icon];
        const label = (locale === "zh" ? name?.zh : name?.en) || name?.zh;
        if (!label) {
            return;
        }
        form.setValue("name", label, {
            shouldValidate: true,
            shouldDirty: true,
        });
    };

    // 推荐项是一键套用：图标、名称、大类一起替换；之后仍可分别点名称/大类修改
    const selectRecommended = (item: Recommendation) => {
        setCategory((v) => ({ ...v, icon: item.src }));
        form.setValue("name", item.name, {
            shouldValidate: true,
            shouldDirty: true,
        });
        if (groupIds.has(item.group)) {
            form.setValue("parent", item.group, {
                shouldValidate: true,
                shouldDirty: true,
            });
        }
        setAutoScroll((v) => ({ src: item.src, seq: (v?.seq ?? 0) + 1 }));
    };

    // 名称不常驻输入框：点文字或铅笔，从底部再弹一层抽屉修改
    const editName = async () => {
        const next = await showCategoryName({
            value: nameValue,
            title: t("category-name"),
            placeholder: namePlaceholder,
        }).catch(() => undefined);
        if (next === undefined) {
            return;
        }
        form.setValue("name", next, {
            shouldValidate: true,
            shouldDirty: true,
        });
    };

    // 一级分组不用下拉：点名称后从底部弹出选择列表
    const selectParent = async (
        value: string,
        onChange: (v: string) => void,
    ) => {
        const next = await showCategoryParent({
            value,
            options: parentOptions.map((p) => ({ id: p.id, name: p.name })),
        }).catch(() => undefined);
        if (next !== undefined) {
            onChange(next);
        }
    };

    return (
        <Form {...form}>
            <PopupLayout
                handle
                hideBack
                className="h-full overflow-hidden bg-ground"
                onBack={onCancel}
                title={
                    <span className="text-[18px] font-semibold text-ink">
                        {title}
                    </span>
                }
            >
                {/* 图标 + 大类 + 名称文字 + 铅笔同排，与 APK 一致，不加白底卡片 */}
                <div className="flex items-center gap-3 px-6 pb-3 pt-3">
                    {!isGroup && (
                        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-panel">
                            {category.icon && (
                                <CategoryIcon
                                    icon={category.icon}
                                    className="size-11"
                                />
                            )}
                        </span>
                    )}
                    {!isGroup && (
                        <FormField
                            control={form.control}
                            name="parent"
                            render={({ field }) => {
                                const value = resolveParent(field.value) ?? "";
                                const current = parentOptions.find(
                                    (p) => p.id === value,
                                );
                                return (
                                    <FormItem className="w-[64px] shrink-0 space-y-0">
                                        <FormControl>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    selectParent(
                                                        value,
                                                        field.onChange,
                                                    )
                                                }
                                                className="flex h-10 w-full items-center justify-start gap-1 rounded-lg px-1 text-[14px] font-normal text-ink focus-visible:ring-2 focus-visible:ring-brand/20"
                                            >
                                                <span className="truncate">
                                                    {current?.name}
                                                </span>
                                                <i className="icon-[lucide--chevron-down] size-3.5 shrink-0 opacity-60" />
                                            </button>
                                        </FormControl>
                                    </FormItem>
                                );
                            }}
                        />
                    )}
                    <button
                        type="button"
                        onClick={editName}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                        <span
                            className={cn(
                                "min-w-0 truncate text-[14px] font-normal",
                                nameValue ? "text-ink" : "text-[#b9b9be]",
                            )}
                        >
                            {nameValue || namePlaceholder}
                        </span>
                        <i className="icon-[lucide--pencil] size-3 shrink-0 text-[#c4c4c9]" />
                    </button>
                </div>

                {!isGroup && (
                    <>
                        <div className="px-6 pb-3">
                            <div className="mb-2 text-[13px] text-[#71717a]">
                                {t("category-recommend")}
                            </div>
                            <div className="grid grid-cols-5 gap-3">
                                {recommendations.map((item) => (
                                    <IllustrationCell
                                        key={item.key}
                                        src={item.src}
                                        label={item.display}
                                        wrap
                                        selected={
                                            category.icon === item.src &&
                                            nameValue === item.name &&
                                            resolveParent(parentValue) ===
                                                item.group
                                        }
                                        onClick={() => selectRecommended(item)}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 px-6 pb-3 pt-1">
                            <span className="shrink-0 text-[13px] text-[#71717a]">
                                {t("category-icon-label")}
                            </span>
                            <div className="ml-auto flex h-8 w-[164px] items-center gap-1.5 rounded-full bg-panel px-3">
                                <i className="icon-[lucide--search] size-3.5 shrink-0 text-[#b9b9be]" />
                                <input
                                    type="text"
                                    value={iconQuery}
                                    onChange={(event) =>
                                        setIconQuery(event.target.value)
                                    }
                                    placeholder={t("search-illustration")}
                                    className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-[#a1a1aa]"
                                />
                            </div>
                        </div>

                        <div
                            ref={gridScrollRef}
                            className="min-h-0 flex-1 overflow-y-auto scrollbar-hidden px-6"
                        >
                            <div className="grid grid-cols-5 gap-3 pb-4">
                                {visibleIcons.length === 0 ? (
                                    <div className="col-span-5 py-10 text-center text-[13px] text-[#a1a1aa]">
                                        {t("no-matching-illustration")}
                                    </div>
                                ) : (
                                    visibleIcons.map((src) => (
                                        <IllustrationCell
                                            key={src}
                                            src={src}
                                            dataIcon={src}
                                            selected={category.icon === src}
                                            onClick={() => selectIcon(src)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}

                {isGroup && <div className="min-h-0 flex-1" />}

                <div className="px-5 pb-5 pt-3">
                    <button
                        type="button"
                        disabled={!canSubmit}
                        onClick={() => form.handleSubmit(onSubmit)()}
                        className={cn(
                            "h-[52px] w-full rounded-xl text-[15px] font-medium transition-colors",
                            canSubmit
                                ? "bg-brand text-on-brand"
                                : "cursor-not-allowed bg-[#e4e4e8] text-[#a6a6ae]",
                        )}
                    >
                        {t("confirm")}
                    </button>
                </div>
            </PopupLayout>
            <CategoryNameProvider />
            <CategoryParentProvider />
        </Form>
    );
}
