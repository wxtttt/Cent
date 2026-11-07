import dayjs, { type Dayjs } from "dayjs";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useShallow } from "zustand/shallow";
import { StorageAPI } from "@/api/storage";
import { showAutoRules } from "@/components/auto-rule";
import { useFullBills } from "@/hooks/use-full-bills";
import { useIntl, useLocale } from "@/locale";
import { useLedgerStore } from "@/store/ledger";
import { useUiStore } from "@/store/ui";
import { useUserStore } from "@/store/user";
import { cn } from "@/utils";
import { showTagList } from "../bill-tag";
import { showBookGuide } from "../book/util";
import { showBudget } from "../budget";
import { showCategoryList } from "../category";
import createConfirmProvider from "../confirm";
import { showCurrencyList } from "../currency";
import { showDataManager } from "../data-manager";
import { showLoanCalculator } from "../loan-calculator";
import { showPreset } from "../preset";
import { showScheduled } from "../scheduled";
import { showSettings } from "../settings";
import { showWidgetList } from "../widget";

function GridAction({
    icon,
    label,
    onClick,
}: {
    icon: string;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl px-1 transition-colors duration-150 hover:bg-ground-muted active:bg-rule/60"
        >
            <i className={cn(icon, "size-6 text-ink")}></i>
            <span className="max-w-full text-center text-[13px] leading-tight text-ink">
                {label}
            </span>
        </button>
    );
}

function Metric({
    label,
    value,
    unit,
    accent,
}: {
    label: string;
    value: string | number;
    unit?: string;
    accent?: boolean;
}) {
    return (
        <div className="flex flex-col items-center gap-1">
            <div className="flex items-baseline gap-0.5">
                <span
                    className={cn(
                        "font-display text-xl font-bold leading-none tabular-nums",
                        accent && "text-brand",
                    )}
                >
                    {value}
                </span>
                {unit && (
                    <span className="text-xs text-ink-secondary">{unit}</span>
                )}
            </div>
            <div className="text-xs text-ink-secondary">{label}</div>
        </div>
    );
}

function ProfileForm({ onCancel }: { onCancel?: () => void }) {
    const t = useIntl();
    const { locale } = useLocale();
    const navigate = useNavigate();
    const loadingBills = useFullBills();

    const { avatar_url, name, expired } = useUserStore(
        useShallow((state) => ({
            avatar_url: state.avatar_url,
            name: state.name,
            expired: state.expired,
        })),
    );
    const bills = useLedgerStore((state) => state.bills);

    const [cursor, setCursor] = useState(() => dayjs().startOf("month"));
    const swipeX = useRef<number | null>(null);

    const stats = useMemo(() => {
        const days = new Set<string>();
        const monthDays = new Set<string>();
        let monthCount = 0;
        for (const bill of bills) {
            const date = dayjs.unix(bill.time / 1000);
            const key = date.format("YYYY-MM-DD");
            days.add(key);
            if (date.isSame(cursor, "month")) {
                monthDays.add(key);
                monthCount += 1;
            }
        }

        // 今天还没记时从昨天起算，避免早上打开时连续天数被清零
        let streak = 0;
        let probe = dayjs().startOf("day");
        if (!days.has(probe.format("YYYY-MM-DD"))) {
            probe = probe.subtract(1, "day");
        }
        while (days.has(probe.format("YYYY-MM-DD"))) {
            streak += 1;
            probe = probe.subtract(1, "day");
        }
        return { days, monthDays, monthCount, streak };
    }, [bills, cursor]);

    const weekdays = useMemo(() => {
        // narrow 单字头（一二三四五六日），与家小满日历一致
        const formatter = new Intl.DateTimeFormat(locale, {
            weekday: "narrow",
        });
        // 2024-01-01 是周一，固定从周一开始排
        return Array.from({ length: 7 }, (_, i) =>
            formatter.format(new Date(2024, 0, 1 + i)),
        );
    }, [locale]);

    const monthLabel = useMemo(
        () =>
            new Intl.DateTimeFormat(locale, {
                year: "numeric",
                month: "long",
            }).format(cursor.toDate()),
        [locale, cursor],
    );

    const calendarDays = useMemo(() => {
        const start = cursor.startOf("month");
        const offset = (start.day() + 6) % 7;
        const gridStart = start.subtract(offset, "day");
        return Array.from({ length: 42 }, (_, i) => gridStart.add(i, "day"));
    }, [cursor]);

    const today = dayjs();

    const pickDay = (day: Dayjs) => {
        useUiStore.getState().requestDate(day.startOf("day").valueOf());
        onCancel?.();
        navigate("/ledger");
    };

    // 宫格顺序对齐家小满个人页：预算/分类/首页设置/家庭/行车/贷款，其余功能跟在后面
    const moreActions = [
        {
            key: "budget",
            label: t("budget-manager"),
            icon: "icon-[mdi--wallet-outline]",
            onClick: () => {
                showBudget();
            },
        },
        {
            key: "category",
            label: t("edit-categories"),
            icon: "icon-[mdi--view-grid-outline]",
            onClick: () => {
                showCategoryList();
            },
        },
        {
            key: "widget",
            label: t("widget-settings"),
            icon: "icon-[mdi--view-dashboard-outline]",
            onClick: () => {
                showWidgetList();
            },
        },
        {
            key: "books",
            label: t("books"),
            icon: "icon-[mdi--book-open-page-variant-outline]",
            onClick: showBookGuide,
        },
        {
            key: "vehicle",
            label: t("vehicle-title"),
            icon: "icon-[mdi--car-outline]",
            onClick: () => {
                navigate("/vehicle");
            },
        },
        {
            key: "loan",
            label: t("loan-calculator"),
            icon: "icon-[mdi--bank-outline]",
            onClick: () => {
                showLoanCalculator();
            },
        },
        {
            key: "tags",
            label: t("edit-tags"),
            icon: "icon-[mdi--tag-outline]",
            onClick: () => {
                showTagList();
            },
        },
        {
            key: "currency",
            label: t("currency-manager"),
            icon: "icon-[mdi--currency-cny]",
            onClick: () => {
                showCurrencyList();
            },
        },
        {
            key: "data",
            label: t("data-manager"),
            icon: "icon-[mdi--database-outline]",
            onClick: () => {
                showDataManager();
            },
        },
        {
            key: "preset",
            label: t("preset"),
            icon: "icon-[mdi--palette-outline]",
            onClick: () => {
                showPreset();
            },
        },
        {
            key: "settings",
            label: t("settings"),
            icon: "icon-[mdi--cog-outline]",
            onClick: () => {
                showSettings();
            },
        },
    ];

    // 快捷记账对齐家小满：账单导入 / 自动记账 / 定时记账
    const quickActions = [
        {
            key: "import",
            label: t("import"),
            icon: "icon-[mdi--tray-arrow-down]",
            onClick: () => {
                showDataManager();
            },
        },
        {
            key: "auto-rule",
            label: t("auto-rule-manager"),
            icon: "icon-[mdi--auto-fix]",
            onClick: () => {
                showAutoRules();
            },
        },
        {
            key: "scheduled",
            label: t("scheduled-manager"),
            icon: "icon-[mdi--calendar-clock]",
            onClick: () => {
                showScheduled();
            },
        },
    ];

    return (
        <div className="flex h-full flex-col overflow-hidden bg-ground">
            {/* 用户行：头像 + 昵称 + 箭头，点击进设置（对齐家小满个人抽屉） */}
            <button
                type="button"
                className="flex flex-shrink-0 cursor-pointer items-center gap-3 px-5 pb-3 pt-[max(16px,var(--safe-area-inset-top))] text-left"
                onClick={() => {
                    showSettings();
                }}
            >
                <div className="flex size-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-ground-muted">
                    {avatar_url ? (
                        <img
                            src={avatar_url}
                            alt=""
                            className="size-full object-cover"
                        />
                    ) : (
                        <i className="icon-[mdi--account] size-6 text-ink-secondary"></i>
                    )}
                </div>
                <span className="min-w-0 flex-1 truncate text-lg font-bold">
                    {name || t("profile")}
                </span>
                <i className="icon-[mdi--chevron-right] size-5 flex-shrink-0 text-ink-secondary"></i>
            </button>

            {expired && (
                <button
                    type="button"
                    className="mx-5 mb-2 flex-shrink-0 cursor-pointer rounded-lg border border-rule bg-panel px-3 py-2 text-left text-xs text-brand"
                    onClick={() => {
                        StorageAPI.loginWith(StorageAPI.type);
                    }}
                >
                    {t("re-login")}
                </button>
            )}

            <div className="flex-1 overflow-y-auto px-4 pb-8">
                <div className="rounded-panel bg-panel p-4">
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            aria-label={t("Today")}
                            className="cursor-pointer text-lg font-bold"
                            onClick={() => {
                                setCursor(dayjs().startOf("month"));
                            }}
                        >
                            {monthLabel}
                        </button>
                        <span className="flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
                            <i className="icon-[mdi--fire] size-3.5"></i>
                            {t("streak-pill", { n: stats.streak })}
                        </span>
                    </div>

                    <div className="mt-2 grid grid-cols-7">
                        {weekdays.map((weekday) => (
                            <div
                                key={weekday}
                                className="py-1 text-center text-xs text-ink-secondary"
                            >
                                {weekday}
                            </div>
                        ))}
                    </div>
                    {/* 左右滑动切月（家小满日历无翻页按钮） */}
                    <div
                        className="touch-pan-y grid grid-cols-7 gap-y-0.5"
                        onPointerDown={(event) => {
                            swipeX.current = event.clientX;
                        }}
                        onPointerUp={(event) => {
                            if (swipeX.current === null) return;
                            const dx = event.clientX - swipeX.current;
                            swipeX.current = null;
                            if (Math.abs(dx) > 40) {
                                setCursor((v) =>
                                    v.add(dx < 0 ? 1 : -1, "month"),
                                );
                            }
                        }}
                    >
                        {calendarDays.map((day) => {
                            const key = day.format("YYYY-MM-DD");
                            const inMonth = day.isSame(cursor, "month");
                            const isToday = day.isSame(today, "day");
                            const isFuture = day.isAfter(today, "day");
                            const hasBill = stats.days.has(key);
                            // 橙点统一 23px（家小满实测内橙尺寸）：有账单=实心橙点；
                            // 今天同尺寸橙点外再加白环+橙环，用嵌套 div 而非 box-shadow
                            const cell = cn(
                                // leading-none：压掉继承的 1.6 行高，否则数字在圆内垂直偏移
                                "mx-auto flex size-9 cursor-pointer items-center justify-center rounded-full text-[13px] leading-none transition-colors",
                                !hasBill &&
                                    !isToday &&
                                    isFuture &&
                                    "text-ink-secondary/40",
                                !hasBill &&
                                    !isToday &&
                                    !isFuture &&
                                    "text-ink hover:text-brand",
                                !inMonth && "opacity-40",
                            );
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    aria-label={key}
                                    aria-current={isToday ? "date" : undefined}
                                    className={cell}
                                    onClick={() => {
                                        pickDay(day);
                                    }}
                                >
                                    {isToday ? (
                                        // 与家小满实测一致：内橙 23px + 白环 1.5px + 橙环 1.5px ≈ 总径 29px
                                        <span className="flex size-[29px] items-center justify-center rounded-full bg-brand">
                                            <span className="flex size-[26px] items-center justify-center rounded-full bg-panel">
                                                <span className="flex size-[23px] items-center justify-center rounded-full bg-brand font-medium text-on-brand">
                                                    {day.date()}
                                                </span>
                                            </span>
                                        </span>
                                    ) : hasBill ? (
                                        <span className="flex size-[23px] items-center justify-center rounded-full bg-brand font-medium text-on-brand">
                                            {day.date()}
                                        </span>
                                    ) : (
                                        day.date()
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-3 grid grid-cols-3 divide-x divide-rule border-t border-rule pt-3">
                        <Metric
                            label={t("record-days")}
                            value={
                                loadingBills && bills.length === 0
                                    ? "…"
                                    : stats.monthDays.size
                            }
                            unit={t("day-unit")}
                        />
                        <Metric
                            label={t("total-records-label")}
                            value={
                                loadingBills && bills.length === 0
                                    ? "…"
                                    : stats.monthCount
                            }
                            unit={t("bill-unit")}
                        />
                        <Metric
                            accent
                            label={t("streak-days")}
                            value={
                                loadingBills && bills.length === 0
                                    ? "…"
                                    : stats.streak
                            }
                            unit={t("day-unit")}
                        />
                    </div>
                </div>

                <div className="mt-4 rounded-panel bg-panel p-4 pb-2">
                    <div className="text-base font-bold">
                        {t("more-functions")}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-y-1">
                        {moreActions.map((action) => (
                            <GridAction
                                key={action.key}
                                icon={action.icon}
                                label={action.label}
                                onClick={action.onClick}
                            />
                        ))}
                    </div>
                </div>

                <div className="mt-4 rounded-panel bg-panel p-4 pb-2">
                    <div className="text-base font-bold">
                        {t("quick-entry-settings")}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-y-1">
                        {quickActions.map((action) => (
                            <GridAction
                                key={action.key}
                                icon={action.icon}
                                label={action.label}
                                onClick={action.onClick}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export const [ProfileProvider, showProfile] = createConfirmProvider(
    ProfileForm,
    {
        dialogTitle: "Profile",
        dialogModalClose: true,
        from: "left",
        contentClassName:
            "h-full w-[85%] max-w-[360px] max-h-full overflow-hidden rounded-[0_28px_28px_0] bg-ground sm:h-[min(820px,calc(100vh-32px))] sm:max-h-[min(820px,calc(100vh-32px))] sm:w-[400px] sm:max-w-[400px] sm:rounded-[28px]",
    },
);

export function ProfileAvatar({ className }: { className?: string }) {
    const t = useIntl();
    const avatarUrl = useUserStore((state) => state.avatar_url);
    return (
        <button
            type="button"
            aria-label={t("profile")}
            className={cn(
                "flex size-10 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-rule bg-panel text-ink shadow-panel transition-transform duration-150 hover:scale-[1.03] active:scale-95",
                className,
            )}
            onClick={() => {
                showProfile();
            }}
        >
            {avatarUrl ? (
                <img
                    src={avatarUrl}
                    alt=""
                    className="size-full object-cover"
                />
            ) : (
                <i className="icon-[mdi--account] size-5"></i>
            )}
        </button>
    );
}
