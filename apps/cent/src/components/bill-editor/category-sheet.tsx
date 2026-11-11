import { useEffect, useMemo, useRef, useState } from "react";
import type { BillCategory, BillType } from "@/ledger/type";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { showCategoryList } from "../category";
import CategoryIcon from "../category/icon";
import createConfirmProvider from "../confirm";

/** 记一笔的一级分组：只带文字，图标属于二级分类 */
export type BillCategoryGroup = {
    id: string;
    name: string;
    children: BillCategory[];
};

type SheetValue = {
    groups: BillCategoryGroup[];
    selectedId: string;
    /** 最近 10 天最常用的二级分类，作为连续列表的第一段 */
    frequent?: BillCategory[];
    /** 齿轮打开分类管理页时沿用当前收支类型 */
    type: BillType;
};

/** 选中二级分类后回填主表单；分类管理页叠在本抽屉之上，不走返回值 */
export type BillCategorySheetResult = { categoryId: string };

const FREQUENT_GROUPS = "frequent";

/** 与分类编辑页的全量图标网格保持同一套：圆形白底、5 列、11px 名称、橙色选中态 */
export const BillCategoryCell = ({
    category,
    selected,
    onClick,
}: {
    category: BillCategory;
    selected: boolean;
    onClick: () => void;
}) => (
    <button
        type="button"
        aria-label={category.name}
        onClick={onClick}
        className="flex w-full min-w-0 flex-col items-center gap-1"
    >
        <span
            className={cn(
                "flex aspect-square w-full items-center justify-center rounded-full border p-1.5 transition-colors duration-[var(--dp-motion-interaction)] ease-[var(--dp-motion-easing)]",
                selected
                    ? "border-brand bg-[#f6e0d2]"
                    : "border-transparent bg-panel",
            )}
        >
            {category.icon ? (
                <CategoryIcon
                    icon={category.icon}
                    className="size-full object-contain"
                />
            ) : (
                <span className="text-sm text-ink-secondary">
                    {category.name.slice(0, 1)}
                </span>
            )}
        </span>
        <span
            className={cn(
                "w-full truncate text-center text-[11px] leading-tight",
                selected ? "text-brand" : "text-ink-secondary/80",
            )}
        >
            {category.name}
        </span>
    </button>
);

function CategorySheetForm({
    edit,
    onConfirm,
}: {
    edit?: SheetValue;
    onConfirm?: (v: BillCategorySheetResult) => void;
}) {
    const t = useIntl();
    const groups = edit?.groups ?? [];
    const gridRef = useRef<HTMLDivElement>(null);
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const lockScrollSync = useRef(false);
    const unlockTimer = useRef<number | undefined>(undefined);

    // 右侧是「常用 + 各一级大类」拼成的连续列表，左侧只是这些段落的锚点；
    // 没有「全部」筛选，滑到哪一段左侧就自动高亮哪一段
    const sections = useMemo(
        () => [
            {
                id: FREQUENT_GROUPS,
                name: t("bill-frequent"),
                children: edit?.frequent ?? [],
            },
            ...groups
                .filter((group) => group.children.length > 0)
                .map((group) => ({
                    id: group.id,
                    name: group.name,
                    children: group.children,
                })),
        ],
        [groups, edit?.frequent, t],
    );

    const [activeId, setActiveId] = useState(() => sections[0]?.id ?? "");
    const [query, setQuery] = useState("");
    const keyword = query.trim().toLowerCase();

    const searchResults = useMemo(() => {
        if (!keyword) return [];
        const seen = new Set<string>();
        return sections
            .flatMap((section) => section.children)
            .filter((category) => {
                if (seen.has(category.id)) return false;
                seen.add(category.id);
                return (
                    category.name.toLowerCase().includes(keyword) ||
                    category.id.toLowerCase().includes(keyword)
                );
            });
    }, [sections, keyword]);

    useEffect(() => () => window.clearTimeout(unlockTimer.current), []);

    const syncActiveByScroll = () => {
        if (lockScrollSync.current || keyword) return;
        const grid = gridRef.current;
        if (!grid) return;
        const anchor = grid.getBoundingClientRect().top + 16;
        let current = sections[0]?.id ?? "";
        for (const section of sections) {
            const el = sectionRefs.current[section.id];
            if (!el) continue;
            if (el.getBoundingClientRect().top <= anchor) {
                current = section.id;
            } else {
                break;
            }
        }
        // 末尾分组太短、永远滚不到判定线时，到底直接落在最后一段
        if (grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 2) {
            current = sections[sections.length - 1]?.id ?? current;
        }
        setActiveId((prev) => (prev === current ? prev : current));
    };

    // 点左侧锚点：平滑滚到对应段落，程序化滚动期间暂停反向联动避免来回跳
    const scrollToSection = (id: string) => {
        setActiveId(id);
        const grid = gridRef.current;
        const el = sectionRefs.current[id];
        if (!grid || !el) return;
        const top =
            el.getBoundingClientRect().top -
            grid.getBoundingClientRect().top +
            grid.scrollTop;
        lockScrollSync.current = true;
        window.clearTimeout(unlockTimer.current);
        grid.scrollTo({ top, behavior: "smooth" });
        unlockTimer.current = window.setTimeout(() => {
            lockScrollSync.current = false;
            syncActiveByScroll();
        }, 600);
    };

    const chooseGroup = (id: string) => {
        if (!keyword) {
            scrollToSection(id);
            return;
        }
        // 搜索态右栏没有分段 DOM，先退出搜索、等连续列表重绘后再定位
        setQuery("");
        window.setTimeout(() => scrollToSection(id), 0);
    };

    const renderCell = (category: BillCategory) => (
        <BillCategoryCell
            key={category.id}
            category={category}
            selected={edit?.selectedId === category.id}
            onClick={() => onConfirm?.({ categoryId: category.id })}
        />
    );

    return (
        <div className="flex h-full flex-col">
            <div className="flex shrink-0 justify-center pt-2.5">
                <span className="h-1 w-10 rounded-full bg-ink-secondary/30" />
            </div>

            <div className="relative flex shrink-0 items-center justify-between px-4 pb-3 pt-2">
                <button
                    type="button"
                    onClick={() => {
                        // 分类管理页叠在本抽屉之上，关闭后抽屉仍在原处
                        void showCategoryList(edit?.type ?? "expense").catch(
                            () => undefined,
                        );
                    }}
                    aria-label={t("category-management")}
                    title={t("category-management")}
                    className="flex size-8 items-center justify-center rounded-full bg-panel text-ink-secondary"
                >
                    <i className="icon-[lucide--settings] size-4" />
                </button>
                <span className="pointer-events-none absolute inset-x-0 text-center text-[17px] font-semibold text-ink">
                    {t("bill-choose-category")}
                </span>
                <div className="flex h-8 w-[116px] items-center gap-1.5 rounded-full bg-panel px-2.5 text-ink-secondary">
                    <i className="icon-[lucide--search] size-3.5 shrink-0" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t("search")}
                        aria-label={t("search")}
                        className="w-full min-w-0 bg-transparent text-[12px] text-ink outline-none placeholder:text-ink-secondary/70 [&::-webkit-search-cancel-button]:hidden"
                    />
                    {query && (
                        <button
                            type="button"
                            aria-label={t("clear")}
                            onClick={() => setQuery("")}
                            className="flex size-4 shrink-0 items-center justify-center"
                        >
                            <i className="icon-[lucide--x] size-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* 左右分区靠底色区分：灰带顶到屏幕最左边、一直铺到抽屉底边，
                选中块与右栏同色连成一整片；底部留白放在各栏内部，不能截断灰带 */}
            <div className="flex min-h-0 flex-1">
                <div
                    data-category-rail
                    className="flex w-16 shrink-0 flex-col overflow-y-auto bg-ground-muted pb-6 scrollbar-hidden"
                >
                    {sections.map((section) => {
                        const active = !keyword && section.id === activeId;
                        return (
                            <button
                                key={section.id}
                                type="button"
                                data-rail-item={section.id}
                                onClick={() => chooseGroup(section.id)}
                                className={cn(
                                    "relative flex h-[52px] w-full shrink-0 items-center justify-center text-[12px] transition-colors duration-[var(--dp-motion-interaction)] ease-[var(--dp-motion-easing)]",
                                    active
                                        ? "bg-ground font-medium text-brand"
                                        : "text-ink-secondary/80 hover:text-ink-secondary",
                                )}
                            >
                                {active && (
                                    <span
                                        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand"
                                        aria-hidden
                                    />
                                )}
                                {section.name}
                            </button>
                        );
                    })}
                </div>
                <div
                    ref={gridRef}
                    data-category-grid
                    onScroll={syncActiveByScroll}
                    className="min-w-0 flex-1 overflow-y-auto bg-ground px-3 pt-2 pb-6 scrollbar-hidden"
                >
                    {keyword ? (
                        searchResults.length ? (
                            <div className="grid grid-cols-5 gap-x-1 gap-y-3">
                                {searchResults.map(renderCell)}
                            </div>
                        ) : (
                            <div className="py-10 text-center text-[13px] text-ink-secondary/80">
                                {t("search-empty-results")}
                            </div>
                        )
                    ) : (
                        sections.map((section) => (
                            <div
                                key={section.id}
                                data-section-id={section.id}
                                ref={(el) => {
                                    sectionRefs.current[section.id] = el;
                                }}
                                className="mb-3.5 last:mb-0"
                            >
                                <div
                                    data-section-title
                                    className="mb-2 flex items-center gap-2 py-0.5"
                                >
                                    <span
                                        className="h-px flex-1 bg-ink-secondary/15"
                                        aria-hidden
                                    />
                                    <span className="shrink-0 text-center text-[12px] text-ink-secondary/80">
                                        {section.name}
                                    </span>
                                    <span
                                        className="h-px flex-1 bg-ink-secondary/15"
                                        aria-hidden
                                    />
                                </div>
                                {section.children.length === 0 ? (
                                    <div className="py-4 text-center text-[12px] text-ink-secondary/80">
                                        {section.id === FREQUENT_GROUPS
                                            ? t("bill-frequent-empty")
                                            : t("inventory-empty")}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-5 gap-x-1 gap-y-3">
                                        {section.children.map(renderCell)}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

/** 点「更多」后从底部上滑的分类抽屉 */
export const [BillCategorySheetProvider, showBillCategorySheet] =
    createConfirmProvider<SheetValue, BillCategorySheetResult>(
        CategorySheetForm,
        {
            dialogTitle: "Choose Category",
            dialogModalClose: true,
            from: "bottom",
            contentClassName:
                "w-full max-w-full h-[min(72vh,620px)] rounded-t-[28px] border-0 bg-ground p-0 shadow-none sm:w-[90vw] sm:max-w-[500px] sm:rounded-md",
        },
    );
