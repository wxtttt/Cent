import { Suspense, useEffect } from "react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { setAppNavigator } from "@/components/confirm/navigation";
import TabPager from "@/components/tab-pager";
import { LoadingSkeleton } from "./components/loading";
import MainLayout from "./layouts/main-layout";
import { lazyWithReload } from "./utils/lazy";

const Search = lazyWithReload(() => import("@/pages/search"));

function RootRoute() {
    const navigate = useNavigate();
    useEffect(() => {
        setAppNavigator(navigate);
        return () => setAppNavigator(null);
    }, [navigate]);
    return (
        <Routes>
            <Route element={<MainLayout />}>
                {/* 四个页签共用同一个 TabPager 元素类型：路由切换时组件实例
                    与已访问页签的挂载状态都保留，横滑动画才能连续 */}
                <Route index element={<TabPager />} />
                <Route path="/ledger" element={<TabPager />} />
                <Route path="/medical" element={<TabPager />} />
                <Route path="/inventory" element={<TabPager />} />
                <Route
                    path="/search"
                    element={
                        <Suspense fallback={<LoadingSkeleton />}>
                            <Search />
                        </Suspense>
                    }
                />
                {/* 二级路由页（FromRight 右滑）由各自的 Provider 覆盖在 TabPager 之上；
                    这里保留 TabPager 实例，返回时首页不会重新挂载 */}
                <Route path="*" element={<TabPager />} />
            </Route>
        </Routes>
    );
}

export default function Rooot() {
    return (
        <MemoryRouter>
            <RootRoute />
        </MemoryRouter>
    );
}
