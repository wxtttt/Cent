import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import xiaonuan from "@/assets/mascots/01-home-xiaonuan.webp";
import xiaoji from "@/assets/mascots/02-bookkeeping-xiaoji.webp";
import xiaoyu from "@/assets/mascots/04-medical-xiaoyu.webp";
import xiaozhi from "@/assets/mascots/05-inventory-xiaozhi.webp";
import AssistantButton from "@/components/assistant";
import { openAssistant } from "@/components/assistant/event";
import { goAddBill } from "@/components/bill-editor";
import { isCancelError } from "@/components/confirm/state";
import { showDataManager } from "@/components/data-manager";
import { showInventoryItem } from "@/components/inventory";
import {
    showMedicalMedicine,
    showMedicalProfile,
    showMedicalVisit,
} from "@/components/medical";
import { ProfileAvatar } from "@/components/profile";
import { showScheduledEdit } from "@/components/scheduled";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
} from "@/components/ui/dialog";
import { quickAddInventory } from "@/hooks/use-inventory";
import {
    addMedicalMedicine,
    addMedicalProfile,
    addMedicalVisit,
    useMedical,
} from "@/hooks/use-medical";
import { useScheduled } from "@/hooks/use-scheduled";
import { useIntl } from "@/locale";
import { measure } from "@/measurement";
import { useBookStore } from "@/store/book";
import { useLedgerStore } from "@/store/ledger";
import { useIsLogin } from "@/store/user";
import { cn } from "@/utils";

// dock 左侧吉祥物随页签切换（对应家小满：首页=小暖 / 记账=小鸡 / 归医=小雨 / 知物=小智）
const DOCK_MASCOTS: Record<string, string> = {
    "/": xiaonuan,
    "/ledger": xiaoji,
    "/medical": xiaoyu,
    "/inventory": xiaozhi,
};

const DOCK_TABS = ["/ledger", "/medical", "/inventory"];

// 启动即预热页签吉祥物：首个会话 SW 尚未接管时，避免切页签后
// 底栏立绘等网络请求完成才显示（图片均 <50KB，预热成本可忽略）
for (const src of Object.values(DOCK_MASCOTS)) {
    const img = new Image();
    img.src = src;
}

type PlusMode = "home" | "ledger" | "medical" | "inventory";
type HomeAction = "manual" | "scheduled" | "asset" | "inventory-item" | "visit";
type LedgerAction = "import" | "manual";

function AssistantDock() {
    const t = useIntl();
    const isLogin = useIsLogin();
    const currentBookId = useBookStore((state) => state.currentBookId);
    const location = useLocation();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    // 菜单归属页签：换页签的渲染期就视为关闭（effect 在绘制后才跑，
    // 残留 open 态会让新页签的抽屉带着 open=true 挂载，Radix Presence
    // 在"挂载即关闭"竞态下会卡住不卸载）；effect 再清掉状态，
    // 切回原页签时也不会重新弹出
    const [menuPath, setMenuPath] = useState("");
    const menuVisible = menuOpen && menuPath === location.pathname;
    const { add: addScheduled } = useScheduled();
    const { profiles: medicalProfiles } = useMedical();
    // 页签一切换即清掉开启态：这里 pathname 是变化信号而非数据依赖
    // biome-ignore lint/correctness/useExhaustiveDependencies: 以 pathname 变化为收起信号
    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);
    const show =
        location.pathname === "/" ||
        DOCK_TABS.some((tab) => location.pathname.startsWith(tab));
    if (!show || !isLogin || !currentBookId) return null;

    const mascot = DOCK_MASCOTS[location.pathname];

    // 加号行为随页签不同（与家小满一致）：
    // 首页=快捷新建抽屉 / 记账=导入与手记卡片 / 归医=直接添加成员 / 知物=直接添加物品
    const plusMode: PlusMode = location.pathname.startsWith("/ledger")
        ? "ledger"
        : location.pathname.startsWith("/medical")
          ? "medical"
          : location.pathname.startsWith("/inventory")
            ? "inventory"
            : "home";

    const toHomeAction = (action: HomeAction) => {
        setMenuOpen(false);
        if (action === "manual") {
            goAddBill();
        } else if (action === "scheduled") {
            // 与周期记账列表页同一套保存流程（含补生成的账单）
            showScheduledEdit()
                .then(async (newOne) => {
                    if (!newOne) return;
                    const needBills = [...(newOne.needBills ?? [])];
                    delete newOne.needBills;
                    useLedgerStore.getState().updateBills(needBills);
                    await addScheduled(newOne);
                    measure("feature_config_changed", {
                        feature: "scheduled",
                        action: "create",
                    });
                })
                .catch((e) => {
                    if (!isCancelError(e)) throw e;
                });
        } else if (action === "inventory-item") {
            showInventoryItem()
                .then((v) => v && quickAddInventory(v))
                .catch((e) => {
                    if (!isCancelError(e)) throw e;
                });
        } else if (action === "asset") {
            // 项目没有独立资产表单：资产总览即知物页，落到该页由加号新建
            navigate("/inventory");
        } else if (action === "visit") {
            if (medicalProfiles.length === 0) {
                toast(t("medical-need-profile-first"));
                return;
            }
            showMedicalVisit({ profiles: medicalProfiles })
                .then((v) => v && addMedicalVisit(v))
                .catch((e) => {
                    if (!isCancelError(e)) throw e;
                });
        }
    };

    const toLedgerAction = (action: LedgerAction) => {
        setMenuOpen(false);
        if (action === "import") {
            showDataManager();
        } else {
            goAddBill();
        }
    };

    // 归医的加号随子页签分派（与家小满一致）：档案=添加成员 / 药箱=添加药品 / 就诊=添加就诊（需先有成员）
    const medicalTab =
        new URLSearchParams(location.search).get("tab") ?? "profile";

    const openMedicalAdd = () => {
        if (medicalTab === "medicine") {
            showMedicalMedicine({ profiles: medicalProfiles })
                .then((v) => v && addMedicalMedicine(v))
                .catch((e) => {
                    if (!isCancelError(e)) throw e;
                });
            return;
        }
        if (medicalTab === "visit") {
            if (medicalProfiles.length === 0) {
                toast(t("medical-need-profile-first"));
                return;
            }
            showMedicalVisit({ profiles: medicalProfiles })
                .then((v) => v && addMedicalVisit(v))
                .catch((e) => {
                    if (!isCancelError(e)) throw e;
                });
            return;
        }
        showMedicalProfile()
            .then((v) => v && addMedicalProfile(v))
            .catch((e) => {
                if (!isCancelError(e)) throw e;
            });
    };

    // APK 折叠态快捷新建：5 项 2 列，末行只有左侧一个，纯文字无图标
    const homeActions: [HomeAction, string][] = [
        ["manual", "add-bill"],
        ["scheduled", "quick-new-scheduled"],
        ["asset", "quick-add-asset"],
        ["inventory-item", "quick-add-item"],
        ["visit", "quick-add-visit"],
    ];

    const ledgerActions: [LedgerAction, string, string][] = [
        ["import", "icon-[apk--bill-import]", "bill-import"],
        ["manual", "icon-[apk--square-pen]", "add-bill"],
    ];

    // 归医/知物的加号直接开表单，没有菜单态
    const hasMenu = plusMode === "home" || plusMode === "ledger";

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[3] px-[21px] pb-[max(12px,var(--safe-area-inset-bottom))]">
            {/* 首页：快捷新建底部抽屉（纯文字按钮，与家小满一致） */}
            {plusMode === "home" && (
                <Dialog open={menuVisible} onOpenChange={setMenuOpen}>
                    <DialogPortal>
                        <DialogOverlay className="fixed inset-0 z-40 bg-black/50" />
                        <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center">
                            <DialogContent
                                from="bottom"
                                className="dp-sheet-surface pointer-events-auto w-full rounded-t-[28px] border border-b-0 border-rule bg-ground pb-[max(20px,var(--safe-area-inset-bottom))] shadow-panel sm:w-[90vw] sm:max-w-[500px] sm:rounded-[28px] sm:border-b"
                            >
                                <DialogTitle className="sr-only">
                                    {t("quick-create")}
                                </DialogTitle>
                                <DialogDescription className="sr-only">
                                    {t("quick-create")}
                                </DialogDescription>
                                <div data-sheet-drag className="px-4 pb-2 pt-3">
                                    <div className="mx-auto h-1 w-10 rounded-full bg-ink/15" />
                                    <div className="pt-3 text-center text-lg font-semibold text-ink">
                                        {t("quick-create")}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 px-4 pt-1">
                                    {homeActions.map(([action, labelKey]) => (
                                        <button
                                            key={action}
                                            type="button"
                                            className="flex h-12 items-center justify-center rounded-2xl border border-rule bg-panel text-[15px] font-medium text-ink transition-colors hover:border-ink-secondary/40"
                                            onClick={() => toHomeAction(action)}
                                        >
                                            {t(labelKey)}
                                        </button>
                                    ))}
                                </div>
                            </DialogContent>
                        </div>
                    </DialogPortal>
                </Dialog>
            )}
            {/* 记账：dock 上方一排图标卡（与家小满记账页一致）。整页透明拦截层：
                菜单开着时页面按钮不可点，点外部任意区域即收起 */}
            {plusMode === "ledger" && menuVisible && (
                <>
                    <button
                        type="button"
                        aria-label={t("close")}
                        className="pointer-events-auto fixed inset-0 cursor-default"
                        onClick={() => {
                            setMenuOpen(false);
                        }}
                    />
                    <div className="pointer-events-auto absolute inset-x-4 bottom-[calc(max(12px,var(--safe-area-inset-bottom))+76px)] z-20 mx-auto grid max-w-[560px] grid-cols-2 gap-3">
                        {ledgerActions.map(([action, icon, labelKey]) => (
                            <button
                                key={action}
                                type="button"
                                className="flex flex-col items-center gap-1.5 rounded-2xl bg-panel p-4 shadow-panel transition-colors hover:bg-ground-muted"
                                onClick={() => toLedgerAction(action)}
                            >
                                <i className={cn(icon, "size-6 text-ink")} />
                                <span className="text-xs text-ink">
                                    {t(labelKey)}
                                </span>
                            </button>
                        ))}
                    </div>
                </>
            )}
            <div className="dp-dock-surface pointer-events-auto relative mx-auto flex w-full max-w-[560px] items-center gap-2 rounded-full bg-panel p-[9px] pl-4 pr-[11px] shadow-panel">
                {mascot ? (
                    <img
                        src={mascot}
                        alt=""
                        draggable={false}
                        className="size-[32px] flex-shrink-0 select-none object-contain"
                    />
                ) : (
                    <i className="icon-[apk--ai] size-5 flex-shrink-0 text-brand"></i>
                )}
                <button
                    type="button"
                    className="min-w-0 flex-1 cursor-pointer truncate px-2 text-left text-[15px] text-ink-secondary"
                    onClick={() => {
                        openAssistant();
                    }}
                >
                    {t("ask-ai-placeholder", { name: t("APP_NAME") })}
                </button>
                <button
                    type="button"
                    aria-label={
                        hasMenu && menuVisible ? t("close") : t("add-bill")
                    }
                    className="flex size-[36px] flex-shrink-0 cursor-pointer items-center justify-center rounded-full border border-rule bg-ground-muted text-ink transition-transform hover:scale-[1.04] active:scale-95"
                    onClick={() => {
                        if (plusMode === "medical") {
                            openMedicalAdd();
                        } else if (plusMode === "inventory") {
                            showInventoryItem().then(
                                (v) => v && quickAddInventory(v),
                            );
                        } else {
                            setMenuPath(location.pathname);
                            setMenuOpen((v) => !v);
                        }
                    }}
                >
                    {hasMenu && menuVisible ? (
                        // APK 展开态的叉比 apk--close 更粗更圆（实测 glyph 9px / 笔画 1.5px），
                        // iconify 的 mask 图标改不了笔画粗细，这里直接画
                        <svg
                            aria-hidden
                            role="presentation"
                            viewBox="0 0 11 11"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.7}
                            strokeLinecap="round"
                            className="size-[11px]"
                        >
                            <path d="M2.2 2.2l6.6 6.6M8.8 2.2L2.2 8.8" />
                        </svg>
                    ) : (
                        <i className="icon-[lucide--plus] size-[18px]" />
                    )}
                </button>
            </div>
        </div>
    );
}

export default function AppChrome() {
    const t = useIntl();
    const navigate = useNavigate();
    const location = useLocation();
    const navRef = useRef<HTMLElement>(null);
    const indicatorRef = useRef<HTMLSpanElement>(null);

    // 页签与家小满对齐：首页 / 记账 / 归医 / 知物
    const tabs = [
        { path: "/", label: t("home"), active: location.pathname === "/" },
        {
            path: "/ledger",
            label: t("ledger"),
            active: location.pathname.startsWith("/ledger"),
        },
        {
            path: "/medical",
            label: t("medical-title"),
            active: location.pathname.startsWith("/medical"),
        },
        {
            path: "/inventory",
            label: t("inventory-title"),
            active: location.pathname.startsWith("/inventory"),
        },
    ];
    const activePath = tabs.find((tab) => tab.active)?.path ?? "/";

    // 选中下划线是单条滑动指示器（与记一笔一级分类同款）：量激活按钮
    // 中心写入 translateX，切页签 / 横滑落位时滑过去而不是瞬间跳变
    const syncIndicator = useCallback(() => {
        const nav = navRef.current;
        const indicator = indicatorRef.current;
        if (!nav || !indicator) return;
        const btn = nav.querySelector<HTMLElement>(
            `[data-tab="${activePath}"]`,
        );
        if (!btn) return;
        indicator.style.transform = `translateX(${
            btn.offsetLeft + btn.offsetWidth / 2 - 8
        }px)`;
    }, [activePath]);
    useLayoutEffect(() => {
        syncIndicator();
    }, [syncIndicator]);
    useEffect(() => {
        window.addEventListener("resize", syncIndicator);
        return () => window.removeEventListener("resize", syncIndicator);
    }, [syncIndicator]);

    // 分析与筛选等二级页面，用自己的返回头部，不再叠加全局壳层
    if (
        location.pathname.startsWith("/stat") ||
        location.pathname.startsWith("/search") ||
        location.pathname.startsWith("/vehicle")
    ) {
        return null;
    }

    return (
        <>
            {/* iOS 状态栏区域由 #root 顶部安全区染色（见 index.css 的 #root 背景），
                这里不再用 ::before 向上出血：MainLayout 的 overflow:hidden 容器会把它裁掉。 */}
            <header className="relative flex-shrink-0 bg-header">
                <div className="mx-auto flex w-full max-w-[960px] items-center gap-3 px-[18px] pt-3 sm:px-6">
                    <ProfileAvatar />
                    {/* 顶栏中间是搜索胶囊（参考图样式）：点击进搜索页，
                        不再显示应用名 */}
                    <button
                        type="button"
                        aria-label={t("search")}
                        className="flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-full border border-rule bg-panel px-3.5 transition-colors hover:bg-ground-muted"
                        onClick={() => {
                            navigate("/search");
                        }}
                    >
                        <i className="icon-[lucide--search] size-4 flex-shrink-0 text-ink-secondary" />
                        <span className="min-w-0 flex-1 truncate text-left text-[14px] text-ink-secondary">
                            {t("search-placeholder")}
                        </span>
                        <span className="h-4 w-px flex-shrink-0 bg-rule" />
                        <span className="flex-shrink-0 text-[14px] font-medium text-brand">
                            {t("search")}
                        </span>
                    </button>
                    {/* APK 实测：35px 纯白圆、无描边无阴影，内 16px 黑色线稿 */}
                    <AssistantButton className="size-[35px] flex-shrink-0 rounded-full bg-panel text-ink hover:bg-ground-muted" />
                </div>
                {/* 页签按需居中、对称间距，不铺满整行（参考微博式居中 tab） */}
                <nav
                    ref={navRef}
                    className="relative mx-auto flex w-full max-w-[720px] items-center justify-center gap-8 px-2 sm:px-10"
                >
                    {tabs.map((tab) => (
                        <button
                            key={tab.path}
                            type="button"
                            data-tab={tab.path}
                            className="relative cursor-pointer px-1 pb-3 pt-2 text-center text-[16px] transition-colors"
                            onClick={() => {
                                navigate(tab.path);
                            }}
                        >
                            <span
                                className={cn(
                                    // APK 实测：激活项是粗黑体、未激活是中黑浅灰，
                                    // 之前两者都偏细（激活 font-medium / 未激活 400）
                                    tab.active
                                        ? "font-bold text-ink"
                                        : "dp-text-medium text-ink-tab",
                                )}
                            >
                                {tab.label}
                            </span>
                        </button>
                    ))}
                    <span
                        ref={indicatorRef}
                        className="pointer-events-none absolute bottom-1 left-0 h-[3px] w-4 rounded-full bg-brand transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    />
                </nav>
            </header>
            <AssistantDock />
        </>
    );
}
