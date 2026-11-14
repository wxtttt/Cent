import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { LoadingSkeleton } from "@/components/loading";
import { ensureFullBills } from "@/hooks/use-full-bills";
import Home from "@/pages/home";
import { cn } from "@/utils";
import { lazyWithReload } from "@/utils/lazy";

const LedgerPage = lazyWithReload(
    () => import("@/pages/ledger"),
    async () => {
        await ensureFullBills();
    },
);
const MedicalPage = lazyWithReload(() => import("@/pages/medical"));
const InventoryPage = lazyWithReload(() => import("@/pages/inventory"));

export const TAB_PATHS = ["/", "/ledger", "/medical", "/inventory"];

export function tabIndexFor(pathname: string) {
    if (pathname.startsWith("/ledger")) return 1;
    if (pathname.startsWith("/medical")) return 2;
    if (pathname.startsWith("/inventory")) return 3;
    return 0;
}

// 四个页签常驻同一条横向轨道：跟手拖动 + 松手吸附，页签与路由双向同步。
// 已访问过的页签保持挂载（滚动位置不丢），未访问的拖到时才挂载，避免启动即拉全量账单。
export default function TabPager() {
    const location = useLocation();
    const navigate = useNavigate();
    const index = tabIndexFor(location.pathname);
    const rootRef = useRef<HTMLDivElement>(null);
    const indexRef = useRef(index);
    indexRef.current = index;
    const [visited, setVisited] = useState(() =>
        TAB_PATHS.map((_, i) => i === index),
    );
    const [dx, setDx] = useState<number | null>(null);

    useEffect(() => {
        setVisited((v) => (v[index] ? v : v.map((x, i) => x || i === index)));
    }, [index]);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        let startX = 0;
        let startY = 0;
        let delta = 0;
        let width = 0;
        let startIdx = 0;
        let axis: "" | "h" | "v" = "";
        let tracking = false;
        let suppressClickUntil = 0;

        const markVisited = (i: number) => {
            if (i < 0 || i >= TAB_PATHS.length) return;
            setVisited((v) => (v[i] ? v : v.map((x, j) => x || j === i)));
        };
        const onStart = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;
            // 页内横向滚动条（筛选 chips 等）自己消费横滑，不触发页签切换
            if (
                (e.target as HTMLElement).closest(
                    ".overflow-x-auto,[data-no-swipe]",
                )
            ) {
                return;
            }
            tracking = true;
            axis = "";
            delta = 0;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            width = root.clientWidth;
            startIdx = indexRef.current;
        };
        const onMove = (e: TouchEvent) => {
            if (!tracking) return;
            const mx = e.touches[0].clientX - startX;
            const my = e.touches[0].clientY - startY;
            if (!axis) {
                if (Math.abs(mx) > 8 && Math.abs(mx) > Math.abs(my) * 1.2) {
                    axis = "h";
                    markVisited(startIdx + (mx < 0 ? 1 : -1));
                } else if (Math.abs(my) > 8) {
                    axis = "v";
                    tracking = false;
                    return;
                } else {
                    return;
                }
            }
            delta = mx;
            // 首尾页边界橡皮筋阻尼
            if (
                (startIdx === 0 && delta > 0) ||
                (startIdx === TAB_PATHS.length - 1 && delta < 0)
            ) {
                delta /= 3;
            }
            setDx(delta);
        };
        const onEnd = () => {
            if (!tracking) return;
            tracking = false;
            if (axis !== "h") {
                axis = "";
                return;
            }
            axis = "";
            // 横滑松手后浏览器仍可能派发 click，吞掉避免误触滑动起点下的按钮
            suppressClickUntil = Date.now() + 400;
            const threshold = Math.max(48, width * 0.22);
            let target = startIdx;
            if (delta <= -threshold) {
                target = Math.min(TAB_PATHS.length - 1, startIdx + 1);
            } else if (delta >= threshold) {
                target = Math.max(0, startIdx - 1);
            }
            setDx(null);
            if (target !== startIdx) navigate(TAB_PATHS[target]);
            delta = 0;
        };
        const onClick = (e: MouseEvent) => {
            if (Date.now() < suppressClickUntil) {
                e.stopPropagation();
                e.preventDefault();
            }
        };
        root.addEventListener("touchstart", onStart, { passive: true });
        root.addEventListener("touchmove", onMove, { passive: true });
        root.addEventListener("touchend", onEnd);
        root.addEventListener("touchcancel", onEnd);
        root.addEventListener("click", onClick, true);
        return () => {
            root.removeEventListener("touchstart", onStart);
            root.removeEventListener("touchmove", onMove);
            root.removeEventListener("touchend", onEnd);
            root.removeEventListener("touchcancel", onEnd);
            root.removeEventListener("click", onClick, true);
        };
    }, [navigate]);

    // 元素引用稳定：跟手拖动每帧只改轨道 transform，不重渲染四个页面
    const pages = useMemo(
        () => [
            <Home key="home" />,
            <Suspense key="ledger" fallback={<LoadingSkeleton />}>
                <LedgerPage />
            </Suspense>,
            <Suspense key="medical" fallback={<LoadingSkeleton />}>
                <MedicalPage />
            </Suspense>,
            <Suspense key="inventory" fallback={<LoadingSkeleton />}>
                <InventoryPage />
            </Suspense>,
        ],
        [],
    );

    return (
        <div
            ref={rootRef}
            className="h-full w-full overflow-hidden"
            style={{ touchAction: "pan-y" }}
        >
            <div
                className="flex h-full w-full will-change-transform"
                style={{
                    // 轨道自身宽 = 一屏（w-full），四个滑片 shrink-0 溢出排列，
                    // 故 translateX 百分比相对轨道宽：每移一屏 = 100%
                    transform:
                        dx === null
                            ? `translateX(${-index * 100}%)`
                            : `translateX(calc(${-index * 100}% + ${dx}px))`,
                    transition:
                        dx === null
                            ? "transform 320ms cubic-bezier(0.22,1,0.36,1)"
                            : "none",
                }}
            >
                {TAB_PATHS.map((path, i) => (
                    <div
                        key={path}
                        inert={i !== index}
                        className={cn(
                            "h-full w-full shrink-0 overflow-hidden",
                            i === 0 ? "bg-ground" : "page-top-fade",
                        )}
                    >
                        {visited[i] ? pages[i] : null}
                    </div>
                ))}
            </div>
        </div>
    );
}
