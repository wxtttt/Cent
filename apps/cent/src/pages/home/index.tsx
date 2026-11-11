import dayjs from "dayjs";
import { useCallback, useId, useMemo } from "react";
import { useNavigate } from "react-router";
import { useShallow } from "zustand/shallow";
import xiaonuan from "@/assets/mascots/01-home-xiaonuan.webp";
import { showBookGuide } from "@/components/book/util";
import {
    budgetEncountered,
    budgetRange,
    budgetTotal,
} from "@/components/budget/util";
import { showScheduled } from "@/components/scheduled";
import TicketCard from "@/components/ticket-card";
import WidgetPreview from "@/components/widget/preview";
import { useBudget } from "@/hooks/use-budget";
import useCategory from "@/hooks/use-category";
import { useCreators } from "@/hooks/use-creator";
import { useCurrency } from "@/hooks/use-currency";
import { useFullBills } from "@/hooks/use-full-bills";
import {
    calcNextDate,
    scheduledEndCap,
    useScheduled,
} from "@/hooks/use-scheduled";
import { useWidget } from "@/hooks/use-widget";
import { amountToNumber } from "@/ledger/bill";
import { useIntl, useLocale } from "@/locale";
import { showStat } from "@/pages/stat";
import { useLedgerStore } from "@/store/ledger";
import { useUserStore } from "@/store/user";
import { cn } from "@/utils";

const inRange = (time: number, start: number, end: number) =>
    time >= start && time <= end;

// 首页底部不再放吉祥物（家小满同款：仅 hero 与 dock 出现）

export default function Page() {
    // SVG 的 clipPath / gradient id 必须每次挂载唯一，且去掉 useId 里的冒号
    const svgId = useId().replace(/:/g, "");
    const t = useIntl();
    const { locale } = useLocale();
    const navigate = useNavigate();
    useFullBills();

    const bills = useLedgerStore((state) => state.bills);
    const {
        id: userId,
        name,
        avatar_url,
    } = useUserStore(
        useShallow((state) => ({
            id: state.id,
            name: state.name,
            avatar_url: state.avatar_url,
        })),
    );
    const { categories } = useCategory();
    const creators = useCreators();
    const { budgets } = useBudget();
    const { scheduleds } = useScheduled();
    const { homeWidgets } = useWidget();
    const { baseCurrency } = useCurrency();

    const now = useMemo(() => dayjs(), []);
    const monthStart = now.startOf("month").valueOf();
    const monthEnd = now.endOf("month").valueOf();
    const todayStart = now.startOf("day").valueOf();
    const todayEnd = now.endOf("day").valueOf();
    const yesterdayStart = now.subtract(1, "day").startOf("day").valueOf();
    const yesterdayEnd = now.subtract(1, "day").endOf("day").valueOf();

    const money = useCallback(
        (value: number) =>
            new Intl.NumberFormat(locale, {
                maximumFractionDigits: 2,
            }).format(value),
        [locale],
    );

    const monthBills = useMemo(
        () => bills.filter((bill) => inRange(bill.time, monthStart, monthEnd)),
        [bills, monthStart, monthEnd],
    );
    const todayBills = useMemo(
        () => bills.filter((bill) => inRange(bill.time, todayStart, todayEnd)),
        [bills, todayStart, todayEnd],
    );
    const yesterdayBills = useMemo(
        () =>
            bills.filter((bill) =>
                inRange(bill.time, yesterdayStart, yesterdayEnd),
            ),
        [bills, yesterdayStart, yesterdayEnd],
    );

    const sumExpense = (list: typeof bills) =>
        list.reduce(
            (total, bill) =>
                bill.type === "expense"
                    ? total + amountToNumber(bill.amount)
                    : total,
            0,
        );
    const monthExpense = sumExpense(monthBills);
    const todayExpense = sumExpense(todayBills);
    const yesterdayExpense = sumExpense(yesterdayBills);

    const activeBudgets = useMemo(
        () =>
            budgets.filter(
                (budget) =>
                    budget.joiners.includes(userId) &&
                    Boolean(budgetRange(budget, now)[1]),
            ),
        [budgets, userId, now],
    );
    const budgetTotalValue = activeBudgets.reduce(
        (total, budget) => total + budgetTotal(budget),
        0,
    );
    const budgetUsed = activeBudgets.reduce((total, budget) => {
        const range = budgetRange(budget, now)[1];
        if (!range) return total;
        return (
            total +
            (budgetEncountered(budget, bills, range, categories)?.totalUsed ??
                0)
        );
    }, 0);
    // 家小满缺省口径：没有设置预算时进度条保持空轨道，不按日期进度填橙色
    const budgetRatio =
        budgetTotalValue > 0 ? Math.min(1, budgetUsed / budgetTotalValue) : 0;

    const dueToday = useMemo(
        () =>
            scheduleds.filter((scheduled) => {
                if (!scheduled.enabled) return false;
                const to = [todayEnd, scheduledEndCap(scheduled)].filter(
                    (v): v is number => v !== undefined,
                );
                return (
                    calcNextDate(
                        scheduled.repeat.value,
                        scheduled.repeat.unit,
                        todayStart - 1,
                        scheduled.start,
                        to.length > 0 ? Math.min(...to) : undefined,
                    ) !== undefined
                );
            }),
        [scheduleds, todayStart, todayEnd],
    );
    const doneToday = todayBills.filter(
        (bill) =>
            bill.extra?.scheduledId &&
            dueToday.some(
                (scheduled) => scheduled.id === bill.extra?.scheduledId,
            ),
    ).length;
    const todoPercent =
        dueToday.length > 0
            ? Math.round((doneToday / dueToday.length) * 100)
            : 0;

    const topYesterdayCategory = useMemo(() => {
        const usage = new Map<string, number>();
        for (const bill of yesterdayBills) {
            if (bill.type !== "expense") continue;
            usage.set(
                bill.categoryId,
                (usage.get(bill.categoryId) ?? 0) + amountToNumber(bill.amount),
            );
        }
        let top: { name: string; value: number } | undefined;
        for (const [id, value] of usage) {
            if (!top || value > top.value) {
                top = {
                    name:
                        categories.find((category) => category.id === id)
                            ?.name ?? "",
                    value,
                };
            }
        }
        return top;
    }, [yesterdayBills, categories]);

    const daysLeft = Math.max(1, now.endOf("month").diff(now, "day") + 1);
    const summaryBullets = useMemo(() => {
        const bullets: { key: string; text: string; to: string }[] = [];
        if (budgetTotalValue > 0) {
            const remaining = Math.max(0, budgetTotalValue - budgetUsed);
            bullets.push({
                key: "budget",
                text: t("summary-budget", {
                    amount: `${baseCurrency.symbol}${money(remaining)}`,
                    days: daysLeft,
                    daily: `${baseCurrency.symbol}${money(
                        remaining / daysLeft,
                    )}`,
                }),
                to: "/stat",
            });
        } else {
            bullets.push({
                key: "month",
                text: t("summary-month", {
                    count: monthBills.length,
                    amount: `${baseCurrency.symbol}${money(monthExpense)}`,
                }),
                to: "/ledger",
            });
        }
        if (yesterdayBills.length > 0) {
            bullets.push({
                key: "yesterday",
                text: t("summary-yesterday", {
                    amount: `${baseCurrency.symbol}${money(yesterdayExpense)}`,
                    count: yesterdayBills.length,
                    category: topYesterdayCategory?.name ?? t("other"),
                    top: `${baseCurrency.symbol}${money(
                        topYesterdayCategory?.value ?? 0,
                    )}`,
                }),
                to: "/ledger",
            });
        } else if (todayBills.length > 0) {
            bullets.push({
                key: "today",
                text: t("summary-today", {
                    count: todayBills.length,
                    amount: `${baseCurrency.symbol}${money(todayExpense)}`,
                }),
                to: "/stat",
            });
        } else {
            bullets.push({
                key: "empty",
                text: t("summary-empty"),
                to: "/ledger",
            });
        }
        return bullets;
    }, [
        budgetTotalValue,
        budgetUsed,
        monthBills.length,
        monthExpense,
        yesterdayBills.length,
        yesterdayExpense,
        todayBills.length,
        todayExpense,
        topYesterdayCategory,
        daysLeft,
        baseCurrency.symbol,
        money,
        t,
    ]);

    const reminders = useMemo(
        () =>
            scheduleds
                .flatMap((scheduled) => {
                    if (!scheduled.enabled) return [];
                    const to = [
                        scheduled.end,
                        scheduledEndCap(scheduled),
                    ].filter((v): v is number => v !== undefined);
                    const next = calcNextDate(
                        scheduled.repeat.value,
                        scheduled.repeat.unit,
                        now.valueOf(),
                        scheduled.start,
                        to.length > 0 ? Math.min(...to) : undefined,
                    );
                    if (next === undefined) return [];
                    const date = dayjs(next);
                    if (date.isAfter(now.add(7, "day").endOf("day"))) {
                        return [];
                    }
                    const category = categories.find(
                        (item) => item.id === scheduled.template.categoryId,
                    );
                    return [
                        {
                            id: scheduled.id,
                            title: scheduled.title,
                            date,
                            category: category?.name ?? "",
                            type: scheduled.template.type,
                            amount: amountToNumber(scheduled.template.amount),
                        },
                    ];
                })
                .sort((a, b) => a.date.valueOf() - b.date.valueOf())
                .slice(0, 5),
        [scheduleds, categories, now],
    );

    const hour = now.hour();
    const greeting =
        hour < 11
            ? t("good-morning")
            : hour < 18
              ? t("good-afternoon")
              : t("good-evening");
    const avatars = creators.slice(0, 2);

    return (
        <div className="h-full overflow-y-auto page-show dp-home-surface">
            <div className="mx-auto w-full max-w-[720px] px-[18px] pb-32">
                {/* 家小满折叠态问候带：灰米 / 浅黄双色斜切 + 中间上拱的浅弧下缘。
                    1080×2340 实拍折到 393 宽后逐列量得：左端 37、中部 24、右端 40，
                    高度 44；展开态 hero 才有的右上黄圆、左下青绿弧不出现在这里。 */}
                <div className="relative -mx-[18px] select-none">
                    <svg
                        aria-hidden
                        role="presentation"
                        className="block h-[44px] w-full"
                        preserveAspectRatio="none"
                        viewBox="0 0 393 44"
                    >
                        <defs>
                            <clipPath id={`${svgId}-clip`}>
                                <path d="M0 0 H393 V39 C330 43 265 33 196 24 C130 17 60 26 0 37 Z" />
                            </clipPath>
                            {/* APK 实测两端色：左 #e7e0cb、右 #f2e2c3，中部只有很窄的过渡，
                                不是原先的「中奶油 + 右上黄圆 + 左下青绿弧」渐变 */}
                            <linearGradient
                                id={`${svgId}-greet`}
                                x1="0"
                                y1="0"
                                x2="1"
                                y2="0"
                            >
                                <stop
                                    offset="0%"
                                    stopColor="var(--dp-color-greet-left)"
                                />
                                <stop
                                    offset="44%"
                                    stopColor="var(--dp-color-greet-left)"
                                />
                                <stop
                                    offset="56%"
                                    stopColor="var(--dp-color-greet-right)"
                                />
                                <stop
                                    offset="100%"
                                    stopColor="var(--dp-color-greet-right)"
                                />
                            </linearGradient>
                        </defs>
                        <g clipPath={`url(#${svgId}-clip)`}>
                            <rect
                                width="393"
                                height="44"
                                fill={`url(#${svgId}-greet)`}
                            />
                            {/* 双色分界是从 (180,0) 向右下弯的斜楔，而非竖直硬边 */}
                            <path
                                d="M180 0 Q190 24 230 44 H393 V0 Z"
                                fill="var(--dp-color-greet-right)"
                            />
                        </g>
                        {/* APK 折叠态在浅弧下缘压了一条 1px #fcf8f0 高光描边，
                            纯 clipPath 硬切会让问候带和下方的界线看起来像「没画上」 */}
                        <path
                            d="M0 37 C60 26 130 17 196 24 C265 33 330 43 393 39"
                            fill="none"
                            stroke="var(--dp-color-greet-edge)"
                            strokeWidth="1"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center gap-2 px-[18px] pt-1">
                        <h1 className="dp-text-medium min-w-0 truncate text-[15px] text-ink-warm">
                            {greeting}，{name || t("me")}
                        </h1>
                        <div className="ml-auto flex flex-shrink-0 items-center gap-2">
                            <img
                                src={xiaonuan}
                                alt=""
                                draggable={false}
                                className="h-[46px] w-auto select-none"
                            />
                            <div className="relative flex items-center">
                                {avatars.length > 0 ? (
                                    avatars.map((creator, index) => (
                                        <div
                                            key={creator.id}
                                            className={cn(
                                                "size-7 overflow-hidden rounded-full border-2 border-ground bg-ground-muted",
                                                index > 0 && "-ml-2",
                                            )}
                                        >
                                            {creator.avatar_url && (
                                                <img
                                                    src={creator.avatar_url}
                                                    alt=""
                                                    className="size-full object-cover"
                                                />
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="size-7 overflow-hidden rounded-full border-2 border-ground bg-ground-muted">
                                        {avatar_url ? (
                                            <img
                                                src={avatar_url}
                                                alt=""
                                                className="size-full object-cover"
                                            />
                                        ) : (
                                            <i className="icon-[lucide--user] m-auto size-4 text-ink-secondary"></i>
                                        )}
                                    </div>
                                )}
                                {/* 换账本入口：家小满放在头像右下角的橙色徽章 */}
                                <button
                                    type="button"
                                    aria-label={t("books")}
                                    className="absolute -bottom-1 -right-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full bg-brand text-on-brand ring-2 ring-ground"
                                    onClick={() => {
                                        showBookGuide();
                                    }}
                                >
                                    <i className="icon-[lucide--arrow-left-right] size-3"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 高度 = APK 卡减去概览行；左右两列各自流式排列（家小满右列行距更紧、
                    不与左列钉底对齐）：左列行距 12px、右列 8px，进度条 5px 高 */}
                {/* APK 概览卡：奶白底 + 1px #ede8dc 暖灰外框（逐点取色）。
                    用 inset 阴影画框而非 border，避免挤掉内容区 2px 打乱下方比例；
                    圆角与同页今日总结卡、其它页票券卡统一 24px（APK 实测约 24px） */}
                <section className="relative mt-2 overflow-hidden rounded-[24px] bg-panel px-4 pb-4 pt-4 shadow-[inset_0_0_0_1px_var(--dp-color-home-frame)]">
                    <div className="absolute inset-y-4 left-1/2 w-px bg-rule" />
                    <div className="grid grid-cols-2">
                        <div className="flex min-w-0 flex-col pr-4">
                            <button
                                type="button"
                                className="flex w-full cursor-pointer items-center gap-1.5 text-xs leading-none text-ink-secondary"
                                onClick={() => {
                                    showStat();
                                }}
                            >
                                <img
                                    src="/overview/expense.svg"
                                    alt=""
                                    draggable={false}
                                    className="size-5 flex-shrink-0 select-none"
                                />
                                <span className="truncate">
                                    {t("this-month")}
                                    {t("expense")}
                                </span>
                                <i className="icon-[lucide--chevron-right] ml-auto size-4 flex-shrink-0 text-ink-secondary/60"></i>
                            </button>
                            <div className="mt-4 flex items-baseline gap-1 overflow-hidden font-display font-bold tracking-tight text-ink-warm">
                                <span className="flex-shrink-0 text-sm">
                                    {baseCurrency.symbol}
                                </span>
                                <span className="truncate text-2xl leading-none tabular-nums">
                                    {money(monthExpense)}
                                </span>
                            </div>
                            <div className="mt-4 h-[4px] overflow-hidden rounded-full bg-track">
                                <div
                                    className="h-full rounded-full bg-brand transition-[width] duration-500"
                                    style={{
                                        width: `${Math.min(100, budgetRatio * 100)}%`,
                                    }}
                                />
                            </div>
                        </div>
                        <div className="flex min-w-0 flex-col pl-4">
                            <button
                                type="button"
                                className="flex w-full cursor-pointer items-center gap-1.5 text-xs leading-none text-ink-secondary"
                                onClick={() => {
                                    showScheduled();
                                }}
                            >
                                <img
                                    src="/overview/todo.svg"
                                    alt=""
                                    draggable={false}
                                    className="size-5 flex-shrink-0 select-none"
                                />
                                <span className="truncate">
                                    {t("today-todo")}
                                </span>
                                <i className="icon-[lucide--chevron-right] ml-auto size-4 flex-shrink-0 text-ink-secondary/60"></i>
                            </button>
                            <div className="mt-3 font-display font-bold tracking-tight text-ink-warm">
                                <span className="text-2xl leading-none tabular-nums">
                                    {doneToday}
                                </span>
                                <span className="text-[13px] text-ink-secondary">
                                    {" "}
                                    / {dueToday.length}
                                </span>
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-xs leading-none text-ink-secondary">
                                <span className="size-3.5 flex-shrink-0 rounded-full border-2 border-rule"></span>
                                <span className="truncate">
                                    {t("today-done")} {todoPercent}%
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                <TicketCard
                    className="mt-7"
                    variant="home"
                    decorations={false}
                    mascot={
                        <img
                            src={xiaonuan}
                            alt=""
                            draggable={false}
                            className="pointer-events-none h-full w-auto select-none"
                        />
                    }
                    top={
                        <>
                            <div className="flex items-center gap-2">
                                <i className="icon-[lucide--sparkles] size-[18px] text-brand"></i>
                                <h2 className="dp-text-medium text-[15px] text-brand">
                                    {t("daily-summary")}
                                </h2>
                            </div>
                            <p className="mt-2.5 text-[13px] leading-5 text-ink-secondary">
                                {summaryBullets
                                    .map((item) => item.text)
                                    .join(" ")}
                            </p>
                        </>
                    }
                    bottom={
                        <div className="flex flex-col empty:hidden">
                            {summaryBullets.length > 1 &&
                                summaryBullets.map((item) => (
                                    <button
                                        key={item.key}
                                        type="button"
                                        className="flex cursor-pointer items-center justify-between gap-3 py-1 text-left text-xs text-ink-secondary"
                                        onClick={() => {
                                            navigate(item.to);
                                        }}
                                    >
                                        <span className="line-clamp-2">
                                            {item.text}
                                        </span>
                                        <i className="icon-[lucide--chevron-right] size-4 flex-shrink-0"></i>
                                    </button>
                                ))}
                        </div>
                    }
                />

                <section className="mt-5">
                    <h2 className="dp-text-medium text-[15px]">
                        {t("recent-reminders")}
                    </h2>
                    <div className="mt-2 flex flex-col gap-2">
                        {reminders.length > 0 ? (
                            reminders.map((reminder) => (
                                <button
                                    key={reminder.id}
                                    type="button"
                                    className="flex cursor-pointer items-center gap-3 rounded-card border border-rule bg-panel p-3 text-left shadow-panel transition-colors hover:bg-ground-muted"
                                    onClick={() => {
                                        showScheduled();
                                    }}
                                >
                                    <div className="flex size-12 flex-shrink-0 flex-col items-center justify-center rounded-2xl bg-brand/10 text-brand">
                                        <span className="text-[10px]">
                                            {reminder.date.format("MM/DD")}
                                        </span>
                                        <span className="text-xs font-medium">
                                            {reminder.date.format("HH:mm")}
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium">
                                            {reminder.title}
                                        </div>
                                        <div className="truncate text-xs text-ink-secondary">
                                            {reminder.category}
                                        </div>
                                    </div>
                                    <div
                                        className={cn(
                                            "flex-shrink-0 text-sm font-medium tabular-nums",
                                            reminder.type === "expense"
                                                ? "text-semantic-expense"
                                                : "text-semantic-income",
                                        )}
                                    >
                                        {reminder.type === "expense"
                                            ? "-"
                                            : "+"}
                                        {baseCurrency.symbol}
                                        {money(reminder.amount)}
                                    </div>
                                </button>
                            ))
                        ) : (
                            <p className="py-8 text-center text-xs text-ink-secondary">
                                {t("no-reminders")}
                            </p>
                        )}
                    </div>
                </section>

                {homeWidgets.length > 0 && (
                    <section className="mt-5">
                        <h2 className="dp-text-medium text-[15px]">
                            {t("widgets")}
                        </h2>
                        <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scrollbar-hidden">
                            {homeWidgets.map((widget) => (
                                <div
                                    key={widget.id}
                                    className="w-[85%] flex-shrink-0 snap-start overflow-hidden rounded-card border border-rule bg-panel shadow-card"
                                >
                                    <WidgetPreview widget={widget} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
