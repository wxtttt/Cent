import dayjs from "dayjs";
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
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
import { showCurrencyList } from "../currency";
import Deletable from "../deletable";
import { FORMAT_IMAGE_SUPPORTED, showFilePicker } from "../file-picker";
import SmartImage from "../image";
import Calculator from "../keyboard";
import {
    LocationPickerProvider,
    showLocationPicker,
} from "../map/location-picker";
import CurrentLocation from "../simple-location";
import { WheelDatePicker } from "../wheel-date-picker";
import {
    BillCategoryCell,
    type BillCategoryGroup,
    BillCategorySheetProvider,
    showBillCategorySheet,
} from "./category-sheet";
import {
    BillCurrencySheetProvider,
    showBillCurrencySheet,
} from "./currency-sheet";
import { RemarkSheetProvider, showRemarkSheet } from "./remark";
import TagGroupSelector from "./tag-group";

const defaultBill = {
    type: "expense" as Bill["type"],
    comment: "",
    amount: 0,
    categoryId: ExpenseBillCategories[0].id,
};

type CategoryTree = BillCategory & { children?: BillCategory[] };

/** 一级行里的虚拟分组：最近 10 天最常用的二级分类 */
const FREQUENT_GROUP_ID = "frequent";
const FREQUENT_WINDOW_MS = 10 * 24 * 60 * 60 * 1000;

/** 二级分类的 id 要反查它所属的一级大类，一级 id 本身也要能命中 */
const findGroupOfCategory = (groups: CategoryTree[], categoryId: string) =>
    groups.find(
        (group) =>
            group.id === categoryId ||
            group.children?.some((child) => child.id === categoryId),
    );

/** 最近 10 天、指定收支类型、按使用次数降序的常用二级分类。
 *  抽成纯函数让「初始默认值」和「切换收支类型」都能同步取到同一种口径。 */
const pickFrequentCategories = (
    bills: readonly Pick<Bill, "time" | "type" | "categoryId">[],
    groups: CategoryTree[],
    type: BillType,
): BillCategory[] => {
    const cutoff = Date.now() - FREQUENT_WINDOW_MS;
    const counts = new Map<string, number>();
    for (const bill of bills) {
        if (bill.time < cutoff || bill.type !== type) {
            continue;
        }
        counts.set(bill.categoryId, (counts.get(bill.categoryId) ?? 0) + 1);
    }
    const subs = new Map(
        groups
            .flatMap((group) => group.children ?? [])
            .map((child) => [child.id, child]),
    );
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([id]) => subs.get(id))
        .filter((child): child is BillCategory => Boolean(child))
        .slice(0, 10);
};

export default function EditorForm({
    edit,
    onConfirm,
}: {
    edit?: EditBill;
    onConfirm?: (v: Omit<Bill, "id" | "creatorId">) => void;
}) {
    const t = useIntl();

    const { baseCurrency, convert, allCurrencies } = useCurrency();

    const { incomes, expenses, categories: allCategories } = useCategory();
    const bills = useLedgerStore((state) => state.bills);

    // 账本首屏只加载 200 条，最近 10 天的常用统计需要全量账单
    const refreshedBillsRef = useRef(false);
    useEffect(() => {
        if (refreshedBillsRef.current) {
            return;
        }
        refreshedBillsRef.current = true;
        void useLedgerStore
            .getState()
            .refreshBillList()
            .catch(() => undefined);
    }, []);

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
        // 选中一级分组时默认落到它的第一个二级分类
        const defaultSub = category.children[0];
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

    const categories = billState.type === "expense" ? expenses : incomes;

    // 一级分组只有文字，用来切换；二级分类才有插画图标
    const categoryGroups = useMemo<BillCategoryGroup[]>(
        () =>
            categories.map((group) => ({
                id: group.id,
                name: group.name,
                children: group.children ?? [],
            })),
        [categories],
    );

    // 最近 10 天、同收支类型、按使用次数排序的 10 个二级分类
    const frequentCategories = useMemo(
        () => pickFrequentCategories(bills, categories, billState.type),
        [bills, categories, billState.type],
    );

    const [activeGroupId, setActiveGroupId] = useState(
        () =>
            findGroupOfCategory(categories, billState.categoryId)?.id ??
            categories[0]?.id ??
            "",
    );

    // 默认选中「常用」第一个 + 一级高亮同步，必须放在同一个 effect 里：
    // 两个 effect 会读到同一批次的旧 state，后者会把「常用」按所属大类覆盖掉。
    const defaultCategoryRef = useRef(billState.categoryId);
    const frequentDefaultAppliedRef = useRef(false);
    useEffect(() => {
        // 新建账单默认落在「常用」的第一个二级分类，而不是第一个一级大类的首个二级。
        // 常用依赖异步全量账单，数据就绪后应用一次；若用户此时已手动选过分类
        // （categoryId 不再是初始值），说明是明确选择，不再接管。
        const first = frequentCategories[0];
        if (
            isCreate &&
            !frequentDefaultAppliedRef.current &&
            billState.categoryId === defaultCategoryRef.current &&
            first
        ) {
            frequentDefaultAppliedRef.current = true;
            defaultCategoryRef.current = first.id;
            setActiveGroupId(FREQUENT_GROUP_ID);
            setBillState((v) => ({ ...v, categoryId: first.id }));
            // 本轮不要再按 categoryId 反查大类，否则刚设的「常用」会被覆盖
            return;
        }
        // 预测分类、自动规则建议、抽屉选择、编辑回填改了 categoryId 时，一级高亮
        // 跟着所属大类同步；「常用」是跨大类虚拟分组，停在这里时不跳走
        if (activeGroupId === FREQUENT_GROUP_ID) {
            return;
        }
        const owner = findGroupOfCategory(categories, billState.categoryId);
        if (owner) {
            setActiveGroupId(owner.id);
        }
    }, [
        isCreate,
        frequentCategories,
        categories,
        billState.categoryId,
        activeGroupId,
    ]);

    const isFrequentGroup = activeGroupId === FREQUENT_GROUP_ID;
    const activeGroup = categoryGroups.find(
        (group) => group.id === activeGroupId,
    );
    const groupSubCategories = isFrequentGroup
        ? frequentCategories
        : (activeGroup?.children ?? []);
    // 一级行横滑提示：还有内容可滑时才显示右缘淡出 + 箭头
    const [groupRowAtEnd, setGroupRowAtEnd] = useState(false);
    const syncGroupRowScroll = useCallback((el: HTMLDivElement) => {
        setGroupRowAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
    }, []);

    // 从抽屉选中靠后的大类后，把对应 chip 横向滚进可视区
    const groupRowRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const container = groupRowRef.current;
        if (!container) {
            return;
        }
        syncGroupRowScroll(container);
        const chip = container.querySelector<HTMLElement>(
            `[data-group="${activeGroupId}"]`,
        );
        if (!chip) {
            return;
        }
        const bounds = container.getBoundingClientRect();
        const target = chip.getBoundingClientRect();
        if (target.left < bounds.left || target.right > bounds.right) {
            container.scrollTo({
                left: container.scrollLeft + (target.left - bounds.left) - 12,
                behavior: "smooth",
            });
        }
    }, [activeGroupId, syncGroupRowScroll]);

    // 下划线是单个指示器：放在滚动内容里随横滑移动，切换大类时 translateX 滑到目标项中心
    const [groupIndicatorX, setGroupIndicatorX] = useState<number | null>(null);
    useLayoutEffect(() => {
        const chip = groupRowRef.current?.querySelector<HTMLElement>(
            `[data-group="${activeGroupId}"]`,
        );
        if (!chip) {
            return;
        }
        setGroupIndicatorX(chip.offsetLeft + chip.offsetWidth / 2 - 12);
    }, [activeGroupId]);

    // 二级分类整行左右划：切大类或从抽屉选中靠后的二级，都自动滚到可见位置
    const subRowRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const container = subRowRef.current;
        if (!container) {
            return;
        }
        const cell = container.querySelector<HTMLElement>(
            `[data-sub="${billState.categoryId}"]`,
        );
        if (!cell) {
            container.scrollTo({ left: 0 });
            return;
        }
        const bounds = container.getBoundingClientRect();
        const target = cell.getBoundingClientRect();
        if (target.left < bounds.left || target.right > bounds.right) {
            container.scrollTo({
                left: container.scrollLeft + (target.left - bounds.left) - 12,
                behavior: "smooth",
            });
        }
    }, [billState.categoryId]);

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
        if (billState.type === type) {
            return;
        }
        // 切换收支类型等于重新进入默认态，同样优先落到该类型的「常用」第一个
        const nextGroups = type === "expense" ? expenses : incomes;
        const first = pickFrequentCategories(bills, nextGroups, type)[0];
        const defaultId =
            first?.id ??
            (type === "expense"
                ? getMatchDefaultCategory(ExpenseBillCategories[0].id)
                : getMatchDefaultCategory(IncomeBillCategories[0].id));
        defaultCategoryRef.current = defaultId;
        frequentDefaultAppliedRef.current = true;
        setActiveGroupId(first ? FREQUENT_GROUP_ID : (nextGroups[0]?.id ?? ""));
        setBillState((v) => ({ ...v, type, categoryId: defaultId }));
    };

    const toConfirm = useCallback(() => {
        onConfirm?.({
            ...billState,
        });
    }, [onConfirm, billState]);

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

    // 点一级大类（含「常用」）：切换分组并自动选中该组第一个二级分类
    const chooseGroupById = (id: string) => {
        setActiveGroupId(id);
        const children =
            id === FREQUENT_GROUP_ID
                ? frequentCategories
                : (categoryGroups.find((group) => group.id === id)?.children ??
                  []);
        const first = children[0];
        if (first) {
            setBillState((v) => ({ ...v, categoryId: first.id }));
        }
    };

    // 点「更多」：从底部上滑分类抽屉，不显示浮层
    const openCategorySheet = async () => {
        const result = await showBillCategorySheet({
            groups: categoryGroups,
            selectedId: billState.categoryId,
            frequent: frequentCategories,
            type: billState.type,
        }).catch(() => undefined);
        if (!result) {
            return;
        }
        const { categoryId } = result;
        if (categoryId) {
            setBillState((v) => ({ ...v, categoryId }));
            // 抽屉里可以选任意大类的二级，一级高亮要跟着切过去
            const owner = findGroupOfCategory(categories, categoryId);
            if (owner) {
                setActiveGroupId(owner.id);
            }
        }
    };

    // 点金额前的货币符号：从底部上滑选择账单币种，复用原有汇率换算逻辑
    const openCurrencySheet = async () => {
        const result = await showBillCurrencySheet({
            selectedId: targetCurrency.id,
        }).catch(() => undefined);
        if (!result) {
            return;
        }
        if (result.manage) {
            showCurrencyList();
            return;
        }
        if (result.currencyId) {
            changeCurrency(result.currencyId);
        }
    };

    // 点备注：从底部上滑一层抽屉输入，推荐备注也收进抽屉里
    const openRemarkSheet = async () => {
        const value = await showRemarkSheet({
            value: billState.comment ?? "",
            recommends: predictComments,
        }).catch(() => undefined);
        if (value === undefined) {
            return;
        }
        setBillState((v) => ({ ...v, comment: value }));
    };

    const tagSelectorRef = useRef<HTMLDivElement>(null);
    useWheelScrollX(tagSelectorRef);

    const amountColor =
        billState.type === "expense"
            ? "text-semantic-expense"
            : "text-semantic-income";

    const dateLabel = dayjs(billState.time).format(
        intl.locale === "zh" ? "M月D日 HH:mm" : "MMM D, HH:mm",
    );

    // meta 行：宽度仍随内容，但高度、内边距统一，靠容器统一 gap 保证相邻间距一致
    const metaChipClass =
        "flex h-9 flex-shrink-0 items-center justify-center gap-1.5 rounded-full bg-panel px-3 text-sm";
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
                className="h-full scrollbar-hidden pb-0!"
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
                        {/* 吸收剩余高度，让金额框贴近键盘，不在两者之间留大块空白 */}
                        <div className="min-h-0 flex-1" aria-hidden />
                        {/* categories：一级大类横滑 + 二级分类左右划 + 右边缘小展开按钮 */}
                        <div
                            data-sheet-drag
                            className="mx-3 flex-shrink-0 overflow-hidden rounded-[22px] bg-panel"
                        >
                            {/* 一级行白底顶到卡片上沿与左右边缘：选中只靠橙字 + 下划线；
                                下划线单个指示器在滚动内容里滑动，右缘渐变暗示可以横滑 */}
                            <div className="relative">
                                <div
                                    ref={groupRowRef}
                                    onScroll={(event) =>
                                        syncGroupRowScroll(event.currentTarget)
                                    }
                                    className="h-10 overflow-x-auto bg-panel scrollbar-hidden"
                                >
                                    <div className="relative flex h-10 w-max min-w-full items-center">
                                        {[
                                            {
                                                id: FREQUENT_GROUP_ID,
                                                name: t("bill-frequent"),
                                            },
                                            ...categoryGroups.map((group) => ({
                                                id: group.id,
                                                name: group.name,
                                            })),
                                        ].map((group) => {
                                            const active =
                                                group.id === activeGroupId;
                                            return (
                                                <button
                                                    key={group.id}
                                                    type="button"
                                                    data-group={group.id}
                                                    onClick={() =>
                                                        chooseGroupById(
                                                            group.id,
                                                        )
                                                    }
                                                    className={cn(
                                                        "flex h-10 min-w-[50px] shrink-0 items-center justify-center px-1.5 text-[12px] transition-colors duration-[var(--dp-motion-interaction)] ease-[var(--dp-motion-easing)]",
                                                        active
                                                            ? "font-medium text-brand"
                                                            : "text-ink-secondary/80 hover:text-ink-secondary",
                                                    )}
                                                >
                                                    {group.name}
                                                </button>
                                            );
                                        })}
                                        <span
                                            aria-hidden
                                            className="absolute bottom-0 left-0 h-[3px] w-6 rounded-t-full bg-brand transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                                            style={{
                                                transform: `translateX(${groupIndicatorX ?? 0}px)`,
                                                opacity:
                                                    groupIndicatorX === null
                                                        ? 0
                                                        : 1,
                                            }}
                                        />
                                    </div>
                                </div>
                                {/* 右缘只用渐变淡出暗示还能横滑，不再放箭头；滑到底自动隐藏 */}
                                {!groupRowAtEnd && (
                                    <div
                                        className="pointer-events-none absolute inset-y-0 right-0 w-20"
                                        style={{
                                            background:
                                                "linear-gradient(to right, transparent 0%, var(--dp-color-panel) 100%)",
                                        }}
                                    />
                                )}
                            </div>

                            {/* 白色区域上下留白对称，让二级图标行垂直居中于白色区；
                                留白收至 10px：一级行与二级图标之间原本 14px 显得空 */}
                            <div className="flex items-center gap-1.5 px-3 py-2.5">
                                <div className="relative min-w-0 flex-1">
                                    {groupSubCategories.length === 0 ? (
                                        <div className="flex h-[72px] items-center justify-center text-[12px] text-ink-secondary">
                                            {isFrequentGroup
                                                ? t("bill-frequent-empty")
                                                : t("inventory-empty")}
                                        </div>
                                    ) : (
                                        <>
                                            <div
                                                ref={subRowRef}
                                                className="flex gap-3 overflow-x-auto scrollbar-hidden"
                                            >
                                                {groupSubCategories.map(
                                                    (item) => (
                                                        <div
                                                            key={item.id}
                                                            data-sub={item.id}
                                                            className="w-[calc((100%-48px)/5)] shrink-0"
                                                        >
                                                            <BillCategoryCell
                                                                category={item}
                                                                selected={
                                                                    billState.categoryId ===
                                                                    item.id
                                                                }
                                                                onClick={() =>
                                                                    setBillState(
                                                                        (
                                                                            v,
                                                                        ) => ({
                                                                            ...v,
                                                                            categoryId:
                                                                                item.id,
                                                                        }),
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                            {groupSubCategories.length > 5 && (
                                                <div
                                                    className="pointer-events-none absolute inset-y-0 right-0 w-12"
                                                    style={{
                                                        background:
                                                            "linear-gradient(to left, var(--dp-color-panel), transparent)",
                                                    }}
                                                />
                                            )}
                                        </>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    aria-label={t("more")}
                                    onClick={openCategorySheet}
                                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"
                                >
                                    <i className="icon-[lucide--layout-grid] size-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* meta chips */}
                        <div
                            ref={tagSelectorRef}
                            data-meta-row
                            className="mt-4 flex flex-shrink-0 items-center gap-3 overflow-x-auto px-3 scrollbar-hidden [&>*]:m-0 [&>*]:shrink-0"
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
                                <div className={metaChipClass}>
                                    <i className="icon-[lucide--calendar] size-4 text-ink-secondary" />
                                    <span className="whitespace-nowrap text-[15px] font-medium text-ink">
                                        {dateLabel}
                                    </span>
                                </div>
                            </WheelDatePicker>

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

                        {/* amount：iOS 底部安全区会吃掉内容区高度，顶部 spacer 压到 0 后
                            金额框仍可能溢出到键盘底下；粘在内容区底部保证金额始终完整可见 */}
                        <div
                            data-sheet-drag
                            className="sticky bottom-0 z-10 mx-3 mt-4 flex-shrink-0 rounded-[22px] bg-panel px-4 py-3"
                        >
                            {/* 金额清空时数字容器会塌 4px，固定行高避免白框在 60/64px 间跳动 */}
                            <div className="flex min-h-10 items-center gap-3">
                                <div className="flex min-w-0 flex-1 items-baseline">
                                    <button
                                        type="button"
                                        aria-label={t("bill-choose-currency")}
                                        data-currency-trigger
                                        onClick={openCurrencySheet}
                                        className={cn(
                                            "mr-0.5 flex shrink-0 items-baseline gap-0.5 text-2xl font-semibold",
                                            amountColor,
                                        )}
                                    >
                                        <span>{targetCurrency?.symbol}</span>
                                        <i className="icon-[lucide--chevron-down] size-3 self-center opacity-50" />
                                    </button>
                                    <Calculator.Value
                                        label={t("amount")}
                                        onConfirm={toConfirm}
                                        className={cn(
                                            "min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-[32px] font-semibold leading-tight scrollbar-hidden",
                                            amountColor,
                                        )}
                                    />
                                </div>
                                {/* 备选 B：折算/负数提示是金额行右下角的 10px 角标，不另起一行 */}
                                {(billState.currency ||
                                    billState.amount < 0) && (
                                    <span className="flex shrink-0 flex-col items-end gap-1 self-end pb-0.5 text-[10px] leading-none text-ink-secondary">
                                        {billState.currency && (
                                            <span className="whitespace-nowrap">
                                                ≈ {baseCurrency.symbol}{" "}
                                                {amountToNumber(
                                                    billState.amount,
                                                )}
                                            </span>
                                        )}
                                        {billState.amount < 0 && (
                                            <span className="whitespace-nowrap text-destructive">
                                                {t("bill-negative-tip")}
                                            </span>
                                        )}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={openRemarkSheet}
                                    className="flex h-9 w-24 flex-shrink-0 items-center justify-end"
                                >
                                    <span
                                        className={cn(
                                            "w-full truncate text-right text-sm",
                                            billState.comment
                                                ? "text-ink"
                                                : "text-ink-secondary/60",
                                        )}
                                    >
                                        {billState.comment ||
                                            t("click-to-add-comment")}
                                    </span>
                                </button>
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
                        </div>
                    </div>

                    {/* keypad：底部安全区由键盘区自己承担（取 max 不叠加），
                        避免弹层与键盘各留一份、把内容区挤到盖住金额框 */}
                    <div className="mt-3 flex flex-shrink-0 flex-col px-3 pb-[max(0.75rem,var(--safe-area-inset-bottom))]">
                        <Calculator.Keyboard
                            variant="sheet"
                            actionLabel={t("done")}
                            onAction={toConfirm}
                        />
                    </div>
                </div>
                <LocationPickerProvider />
                <BillCategorySheetProvider />
                <BillCurrencySheetProvider />
                <RemarkSheetProvider />
            </PopupLayout>
        </Calculator.Root>
    );
}
