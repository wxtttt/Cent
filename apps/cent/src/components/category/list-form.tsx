import createConfirmProvider from "../confirm";
import CategoryList from "./list";

export const [CategoryListProvider, showCategoryList] = createConfirmProvider(
    CategoryList,
    {
        dialogTitle: "Category",
        routePath: "/category",
        dialogModalClose: true,
        // 分类管理走 routePath 分支：作用域类必须给 routeClassName，
        // 否则路由页容器退回全局暖米底（用户看到「偏黄」）
        routeClassName: "dp-category-surface",
        contentClassName:
            "h-full w-full max-h-full max-w-full rounded-none sm:rounded-md sm:max-h-[min(520px,calc(100vh-32px))] sm:w-[90vw] sm:max-w-[500px]",
    },
);
