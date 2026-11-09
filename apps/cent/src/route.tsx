import { Suspense } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import Home from "@/pages/home";
import { LoadingSkeleton } from "./components/loading";
import { ensureFullBills } from "./hooks/use-full-bills";
import MainLayout from "./layouts/main-layout";
import { lazyWithReload } from "./utils/lazy";

const loadFullBills = async () => {
    await ensureFullBills();
};

const LedgerPage = lazyWithReload(
    () => import("@/pages/ledger"),
    loadFullBills,
);

const Search = lazyWithReload(() => import("@/pages/search"));

const InventoryPage = lazyWithReload(() => import("@/pages/inventory"));

const MedicalPage = lazyWithReload(() => import("@/pages/medical"));

const VehiclePage = lazyWithReload(() => import("@/pages/vehicle"));

function RootRoute() {
    return (
        <Routes>
            <Route element={<MainLayout />}>
                <Route index element={<Home />} />
                <Route
                    path="/ledger"
                    element={
                        <Suspense fallback={<LoadingSkeleton />}>
                            <LedgerPage />
                        </Suspense>
                    }
                />
                <Route
                    path="/search"
                    element={
                        <Suspense fallback={<LoadingSkeleton />}>
                            <Search />
                        </Suspense>
                    }
                />
                <Route
                    path="/inventory"
                    element={
                        <Suspense fallback={<LoadingSkeleton />}>
                            <InventoryPage />
                        </Suspense>
                    }
                />
                <Route
                    path="/medical"
                    element={
                        <Suspense fallback={<LoadingSkeleton />}>
                            <MedicalPage />
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
