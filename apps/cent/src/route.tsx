import { Suspense } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import TabPager from "@/components/tab-pager";
import { LoadingSkeleton } from "./components/loading";
import MainLayout from "./layouts/main-layout";
import { lazyWithReload } from "./utils/lazy";

const Search = lazyWithReload(() => import("@/pages/search"));

const VehiclePage = lazyWithReload(() => import("@/pages/vehicle"));

function RootRoute() {
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
                <Route
                    path="/vehicle"
                    element={
                        <Suspense fallback={<LoadingSkeleton />}>
                            <VehiclePage />
                        </Suspense>
                    }
                />
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
