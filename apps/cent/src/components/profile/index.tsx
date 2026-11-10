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
import { AboutSettingsProvider, showAboutSettings } from "../settings/about";
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
            className="flex min-h-[67px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl px-0.5 transition-colors duration-150 hover:bg-ground-muted active:bg-rule/60"
        >
            <i className={cn(icon, "size-5 text-ink")}></i>
            {/* APK 宫格标签实测约 12px；360px 窄视口再降一档避免折行 */}
            <span className="max-w-full whitespace-nowrap text-center text-[12px] leading-tight text-ink max-[375px]:text-[11px]">
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
        <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-baseline gap-0.5">
                <span
                    className={cn(
                        "font-display text-base font-bold leading-none tabular-nums",
                        accent && "text-brand",
                    )}
                >
                    {value}
                </span>
                {unit && (
                    <span className="text-[11px] text-ink-secondary">
                        {unit}
                    </span>
                )}
            </div>
            <div className="text-[13px] text-ink-secondary">{label}</div>
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
            icon: "icon-[lucide--wallet]",
            onClick: () => {
                showBudget();
            },
        },
        {
            key: "category",
            label: t("edit-categories"),
            icon: "icon-[lucide--layout-grid]",
            onClick: () => {
                showCategoryList();
            },
        },
        {
            key: "widget",
            label: t("widget-settings"),
            icon: "icon-[lucide--layout-dashboard]",
            onClick: () => {
                showWidgetList();
            },
        },
        {
            key: "books",
            label: t("books"),
            icon: "icon-[lucide--book-open-text]",
            onClick: showBookGuide,
        },
        {
            key: "vehicle",
            label: t("vehicle-title"),
            icon: "icon-[lucide--car]",
            onClick: () => {
                navigate("/vehicle");
            },
        },
        {
            key: "tags",
            label: t("edit-tags"),
            icon: "icon-[lucide--tag]",
            onClick: () => {
                showTagList();
            },
        },
        {
            // APK 的「贷款计算」独占第三行首位，把当前产品多出的功能排在其后，
            // 前 3 行（3+3+1）与 APK 宫格结构一致
            key: "loan",
            label: t("loan-calculator"),
            icon: "icon-[lucide--landmark]",
            onClick: () => {
                showLoanCalculator();
            },
        },
        {
            key: "currency",
            label: t("currency-manager"),
            icon: "icon-[lucide--japanese-yen]",
            onClick: () => {
                showCurrencyList();
            },
        },
        {
            key: "data",
            label: t("data-manager"),
            icon: "icon-[lucide--database]",
            onClick: () => {
                showDataManager();
            },
        },
        {
            key: "preset",
            label: t("preset"),
            icon: "icon-[lucide--palette]",
            onClick: () => {
                showPreset();
            },
        },
        {
            key: "settings",
            label: t("settings"),
            icon: "icon-[lucide--settings]",
            onClick: () => {
                showSettings();
            },
        },
    ];

    // 快捷记账对齐家小满：账单导入 / 自动记账 / 定时记账
    const quickActions = [
        {
            key: "import",
            label: t("quick-bill-import"),
            icon: "icon-[lucide--download]",
            onClick: () => {
                showDataManager();
            },
        },
        {
            key: "auto-rule",
            label: t("auto-rule-manager"),
            icon: "icon-[lucide--wand-sparkles]",
            onClick: () => {
                showAutoRules();
            },
        },
        {
            key: "scheduled",
            label: t("quick-scheduled"),
            icon: "icon-[lucide--calendar-clock]",
            onClick: () => {
                showScheduled();
            },
        },
    ];

    return (
        <div className="dp-drawer-surface flex h-full flex-col overflow-hidden bg-ground">
            {/* 用户行：头像 + 昵称 + 箭头，点击进设置（对齐家小满个人抽屉）
                APK 现场实测（1080→393 CSS）：头像圆 x24..65 直径 42px、昵称 16px、
                箭头 20px；状态栏 24px 之下头像上留 12px、下留 21px，日历卡顶部 y=98，
                即内容区净高 74px。网页无系统状态栏，故 pt=12 + 42 + pb=20 = 74px。
                抽屉卡片左边界 x=20，头像左 x=24，故用户行单独左内缩 24px。 */}
            <button
                type="button"
                className="flex flex-shrink-0 cursor-pointer items-center gap-3 pl-6 pr-5 pb-5 pt-[max(12px,var(--safe-area-inset-top))] text-left"
                onClick={() => {
                    showSettings();
                }}
            >
                <div className="flex size-[42px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-ground-muted">
                    {avatar_url ? (
                        <img
                            src={avatar_url}
                            alt=""
                            className="size-full object-cover"
                        />
                    ) : (
                        <i className="icon-[lucide--user] size-6 text-ink-secondary"></i>
                    )}
                </div>
                <span className="min-w-0 flex-1 truncate text-[16px] text-ink">
                    {name || t("profile")}
                </span>
                <i className="icon-[lucide--chevron-right] size-5 flex-shrink-0 text-ink-secondary"></i>
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

            <div className="flex-1 overflow-y-auto px-5 pb-6">
                <div className="rounded-panel bg-panel p-3.5">
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            aria-label={t("Today")}
                            className="cursor-pointer text-[15px] font-bold"
                            onClick={() => {
                                setCursor(dayjs().startOf("month"));
                            }}
                        >
                            {monthLabel}
                        </button>
                        {/* 连续记录 1 天及以上才显示徽章，0 天时整块隐藏 */}
                        {stats.streak > 0 && (
                            <span className="flex items-center gap-1 rounded-full bg-[#fff1e7] px-2 py-0.5 text-[11px] font-medium text-[#d9631e] dark:bg-brand/10 dark:text-brand">
                                <i className="icon-[lucide--flame] size-3"></i>
                                {t("streak-pill", { n: stats.streak })}
                            </span>
                        )}
                    </div>

                    <div className="mt-1.5 grid grid-cols-7">
                        {weekdays.map((weekday) => (
                            <div
                                key={weekday}
                                className="py-0.5 text-center text-xs text-[#b3ada8] dark:text-ink-secondary"
                            >
                                {weekday}
                            </div>
                        ))}
                    </div>
                    {/* 左右滑动切月（家小满日历无翻页按钮） */}
                    <div
                        className="touch-pan-y grid grid-cols-7"
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
                            // 橙色内圈只在当天有记账时出现；今天额外保留白环+橙环，
                            // 所以当天没记账时只剩空心外圈。橙点统一 23px（实测内橙尺寸），
                            // 用嵌套 div 而非 box-shadow。
                            // 三层直径 31/27/23：每档差 4px = 每边 2px 整数。
                            // 之前 29/26/23 的 1.5px 环在 DPR=1 下被取整成
                            // 「1px 实色 + 1px 半透明」，左上半圈明显发淡、白环也会断开。
                            const cell = cn(
                                // leading-none：压掉继承的 1.6 行高，否则数字在圆内垂直偏移
                                // APK 实测日格与行距均约 31px。31px 格配 31px 环，
                                // 360px 窄视口下七列（每列约 31.4px）也不会溢出
                                "mx-auto flex size-[31px] cursor-pointer items-center justify-center rounded-full text-[13px] leading-none transition-colors",
                                // APK 现场取色：普通日期 #5f5955，非本月/未来日期
                                // #d3cec9（比 ink 淡一档，不用 opacity 以免连带淡化橙圈）
                                !inMonth || (!hasBill && !isToday && isFuture)
                                    ? "text-[#d3cec9] dark:text-ink-secondary/40"
                                    : "text-[#5f5955] hover:text-brand dark:text-ink",
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
                                        // 外圈恒在（橙环 2px + 白环 2px，总径 31px）；
                                        // 23px 内圈只有当天有账单才填橙，否则与卡片同色，只剩空心外圈
                                        <span className="flex size-[31px] items-center justify-center rounded-full bg-brand">
                                            <span className="flex size-[27px] items-center justify-center rounded-full bg-panel">
                                                <span
                                                    className={cn(
                                                        "flex size-[23px] items-center justify-center rounded-full font-medium leading-none",
                                                        hasBill
                                                            ? "bg-brand text-on-brand"
                                                            : "bg-panel text-brand",
                                                    )}
                                                >
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

                    <div className="mt-2.5 grid grid-cols-3 divide-x divide-rule border-t border-rule pt-2.5">
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

                <div className="mt-4 rounded-panel bg-panel px-5 pb-2.5 pt-3.5">
                    <div className="text-[15px] font-bold">
                        {t("more-functions")}
                    </div>
                    <div className="-mx-5 mt-1.5 grid grid-cols-3">
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

                <div className="mt-4 rounded-panel bg-panel px-5 pb-2.5 pt-3.5">
                    <div className="text-[15px] font-bold">
                        {t("quick-entry-settings")}
                    </div>
                    <div className="-mx-5 mt-1.5 grid grid-cols-3">
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
                {/* 关于置于抽屉最底部，对齐家小满个人页的底部入口行 */}
                <button
                    type="button"
                    className="mt-4 flex w-full cursor-pointer items-center gap-3 rounded-panel bg-panel px-3.5 py-3 text-left transition-colors hover:bg-ground-muted"
                    onClick={() => {
                        showAboutSettings();
                    }}
                >
                    <i className="icon-[lucide--info] size-[18px] text-ink-secondary" />
                    <span className="flex-1 text-[14px] text-ink">
                        {t("about-cent")}
                    </span>
                    <i className="icon-[lucide--chevron-right] size-[18px] text-ink-secondary" />
                </button>
                <AboutSettingsProvider />
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
            // APK 实测抽屉右边界在原图 x≈870/1080 ≈ 80% 视口宽，
            // 白卡左右各留 20px（原图 x=55 / 809）
            "dp-drawer-surface h-full w-[80%] max-w-[340px] max-h-full overflow-hidden rounded-[0_28px_28px_0] bg-ground sm:h-[min(820px,calc(100vh-32px))] sm:max-h-[min(820px,calc(100vh-32px))] sm:w-[400px] sm:max-w-[400px] sm:rounded-[28px]",
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
                <i className="icon-[lucide--user] size-5"></i>
            )}
        </button>
    );
}
