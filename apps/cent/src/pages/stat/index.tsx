import { lazy, Suspense } from "react";
import createConfirmProvider from "@/components/confirm";
import { isCancelError } from "@/components/confirm/state";
import { LoadingSkeleton } from "@/components/loading";

// 分析页是二级页：按家小满的交互从右侧滑入（Dialog 默认移动端变体），
// 惰性加载保持 echarts 等重依赖不进首屏
const StatContent = lazy(() => import("./content"));

function StatForm(props: { edit?: string; onCancel?: () => void }) {
    return (
        <Suspense fallback={<LoadingSkeleton />}>
            <StatContent {...props} />
        </Suspense>
    );
}

const [StatProvider, rawShowStat] = createConfirmProvider<
    string | undefined,
    void
>(StatForm, {
    dialogTitle: "stat-title",
    dialogModalClose: false,
    // rounded-panel 是自定义工具类，tailwind-merge 无法识别去重，
    // 用 important 压掉基类的圆角/边框，保证分析页铺满屏幕
    contentClassName:
        "h-full w-full max-h-full max-w-full rounded-none! border-0!",
});

/** 打开分析页；返回手势/关闭按钮触发的取消是正常流程，静默处理 */
export const showStat = (filterViewId?: string) => {
    rawShowStat(filterViewId).catch((e) => {
        if (!isCancelError(e)) throw e;
    });
};

export { StatProvider };
