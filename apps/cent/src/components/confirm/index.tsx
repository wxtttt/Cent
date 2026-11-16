import { VisuallyHidden } from "radix-ui";
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { useShallow } from "zustand/shallow";
import { useVisualViewport } from "@/hooks/use-visual-viewport";
import { cn } from "@/utils";
import { popCanvasSurface, pushCanvasSurface } from "@/utils/viewport";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
} from "../ui/dialog";
import { goBack } from "./navigation";
import { openRoute, useRoutePage } from "./route-modal";
import { useGlobalConfirmStore } from "./state"; // 引入上面创建的全局 store

export default function createConfirmProvider<Value, Returned = Value>(
    Form: (props: {
        edit?: Value;
        onCancel?: () => void;
        onConfirm?: (v: Returned) => void;
    }) => ReactNode,
    {
        dialogTitle,
        dialogDescription = dialogTitle,
        dialogModalClose,
        contentClassName,
        fade,
        swipe,
        from,
        initialFocus,
        routePath,
    }: {
        dialogTitle: string | ReactNode;
        dialogDescription?: string | ReactNode;
        dialogModalClose?: boolean;
        contentClassName?: string;
        fade?: boolean;
        swipe?: boolean;
        from?: "left" | "bottom";
        initialFocus?: string;
        /**
         * 配了路径就不再开 Dialog，改成由 location 驱动的独立二级路由页：
         * 从右侧滑入（等价 UWP 的 SlideNavigationTransitionEffect.FromRight），
         * 返回走 navigate(-1)，是一个真实导航层级而不是全屏弹窗。
         * 底部抽屉类不要配置，继续用弹层。
         */
        routePath?: string;
    },
) {
    // 1. 为每个 Provider 实例生成一个唯一的 ID (在闭包中唯一)
    const instanceId = `confirm_${Math.random().toString(36).slice(2, 9)}`;

    function Confirm() {
        const returnFocusRef = useRef<HTMLElement | null>(null);
        // 2. 仅监听属于自己 ID 的那部分状态
        const state = useGlobalConfirmStore(
            useShallow((s) => s.instances[instanceId]),
        );
        const layerStyle = useMemo(
            () =>
                state?.zIndex != null
                    ? { zIndex: `${state.zIndex}` }
                    : undefined,
            [state?.zIndex],
        );
        const viewport = useVisualViewport();
        // 路由页适配层：location 匹配与开/关编排收敛在 useRoutePage，provider 只做渲染宿主；
        // 未配置 routePath 时 active 恒为 false，hook 仍无条件调用以满足 hooks 规则
        const routePage = useRoutePage(routePath ?? "", "/");
        // 3. 组件卸载时清理全局 Store 中的数据，避免内存泄漏
        useEffect(() => {
            return () => useGlobalConfirmStore.getState().remove(instanceId);
        }, []);
        // iOS 26 PWA 底部 home 条区域画布色跟随：全屏抽屉（左侧/底部）与二级路由页
        // 打开期间把 html 画布涂成抽屉灰，条带才不会在灰面下露出暖米断层
        useEffect(() => {
            if (!state?.visible) return;
            if (from !== "left" && from !== "bottom") return;
            pushCanvasSurface();
            return popCanvasSurface;
        }, [state?.visible, from]);
        useEffect(() => {
            if (!(routePath && routePage.active)) return;
            pushCanvasSurface();
            return popCanvasSurface;
        }, [routePath, routePage.active]);
        // 二级路由页：由 URL 驱动、无遮罩、右侧滑入；关闭先播右滑出场动画再回退
        if (routePath && routePage.active) {
            return (
                <div
                    data-route-page
                    data-route-path={routePath}
                    onAnimationEnd={routePage.onExitAnimationEnd}
                    className={cn(
                        // 内容块用 min-h-full + my-auto 居中（登录页同款），长表单靠这里滚动
                        // 二级路由页是全屏面：按 --viewport-bottom-gap 往下延伸，铺满系统底
                        "dp-screen-fill-inset fixed inset-0 z-[3] flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain bg-ground",
                        routePage.closing
                            ? "dp-route-to-right"
                            : "dp-route-from-right",
                    )}
                >
                    <Form onCancel={routePage.requestClose} />
                </div>
            );
        }

        // 如果该实例还未初始化（从未调用过 open），则不渲染
        if (!state) return null;

        const { visible, edit, controller, openId } = state;

        const onCancel = () => {
            controller?.cancel();
        };

        const onConfirm = (v: Returned) => {
            controller?.resolve(v);
            useGlobalConfirmStore.getState().update(instanceId, {
                visible: false,
                controller: undefined,
            });
        };

        return (
            <Dialog
                key={openId}
                open={visible}
                onOpenChange={(v) => {
                    if (!v) onCancel();
                }}
            >
                <DialogPortal>
                    <DialogOverlay
                        className="fixed inset-0 bg-black/50"
                        style={layerStyle}
                    />
                    <div
                        className={cn(
                            // 宿主壳按 --viewport-bottom-gap 下探：左侧抽屉 / 底部抽屉 /
                            // 居中弹层都要能铺到 iOS 主屏幕 PWA 的系统底那一条
                            "dp-screen-fill fixed top-0 left-0 w-full h-full flex justify-center items-center pointer-events-none",
                            from === "left" &&
                                "justify-start items-stretch sm:items-center sm:pl-4",
                            from === "bottom" && "items-end sm:items-center",
                        )}
                        style={layerStyle}
                    >
                        <DialogContent
                            data-confirm-id={instanceId}
                            fade={fade}
                            swipe={swipe}
                            from={from}
                            className={cn(
                                "dp-sheet-surface pointer-events-auto bg-panel border border-rule shadow-panel",
                                from === "left"
                                    ? "rounded-none"
                                    : from === "bottom"
                                      ? "flex flex-col overflow-hidden rounded-t-[28px] sm:rounded-panel"
                                      : "max-h-[55vh] w-[90vw] max-w-[500px] rounded-panel overflow-y-auto",
                                contentClassName,
                            )}
                            style={
                                from === "bottom"
                                    ? {
                                          // 软键盘弹出时把抽屉压回可视区域，内容靠内部滚动
                                          maxHeight: `calc(${viewport.height}px - 8px)`,
                                          marginBottom: viewport.keyboard,
                                      }
                                    : undefined
                            }
                            onOpenAutoFocus={(e) => {
                                returnFocusRef.current =
                                    document.activeElement instanceof
                                    HTMLElement
                                        ? document.activeElement
                                        : null;
                                e.preventDefault();
                                const content = e.target as HTMLElement;
                                const target = initialFocus
                                    ? content.querySelector<HTMLElement>(
                                          initialFocus,
                                      )
                                    : null;
                                (target ?? content).focus({
                                    preventScroll: true,
                                });
                            }}
                            onCloseAutoFocus={(e) => {
                                e.preventDefault();
                                const target = returnFocusRef.current;
                                if (
                                    !target?.isConnected ||
                                    target.closest(
                                        '[inert], [hidden], [aria-hidden="true"]',
                                    ) ||
                                    target.matches(":disabled")
                                )
                                    return;
                                const instances =
                                    useGlobalConfirmStore.getState().instances;
                                const ownerId = target
                                    .closest("[data-confirm-id]")
                                    ?.getAttribute("data-confirm-id");
                                const owner = ownerId
                                    ? instances[ownerId]
                                    : undefined;
                                if (ownerId && !owner?.visible) return;
                                const covered = Object.entries(instances).some(
                                    ([id, instance]) =>
                                        id !== ownerId &&
                                        instance.visible &&
                                        (!owner ||
                                            (instance.zIndex ?? 0) >=
                                                (owner.zIndex ?? 0)),
                                );
                                if (!covered)
                                    target.focus({ preventScroll: true });
                            }}
                            onInteractOutside={(e) => {
                                if (!dialogModalClose) e.preventDefault();
                            }}
                        >
                            <VisuallyHidden.Root>
                                <DialogTitle>{dialogTitle}</DialogTitle>
                                <DialogDescription>
                                    {dialogDescription}
                                </DialogDescription>
                            </VisuallyHidden.Root>
                            <Form
                                edit={edit}
                                onCancel={onCancel}
                                onConfirm={onConfirm}
                            />
                        </DialogContent>
                    </div>
                </DialogPortal>
            </Dialog>
        );
    }

    // 4. 暴露的 open 方法封装了 instanceId
    const confirm = (value?: Value) => {
        if (routePath) {
            openRoute(routePath);
            return Promise.resolve(undefined as Returned);
        }
        const [promise, cancel] = useGlobalConfirmStore
            .getState()
            .open<Value, Returned>(instanceId, value);
        // 进入二级路由页时会主动 cancel 抽屉；附着静默 catch，
        // 避免无人 await 的调用点产生 unhandledrejection
        void promise.catch(() => {});
        return promise;
    };

    const withController = (value?: Value) => {
        if (routePath) {
            openRoute(routePath);
            return {
                promise: Promise.resolve(undefined as Returned),
                cancel: () => goBack(),
            };
        }
        const [promise, cancel] = useGlobalConfirmStore
            .getState()
            .open<Value, Returned>(instanceId, value);
        return { promise, cancel };
    };

    return [Confirm, confirm, withController] as const;
}
