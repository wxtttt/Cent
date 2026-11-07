"use client";

import {
    AnimatePresence,
    type HTMLMotionProps,
    motion,
    type PanInfo,
    type Transition,
    usePresence,
} from "motion/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsDesktop } from "@/hooks/use-media-query";
import { cn } from "@/utils";
import { registerSlideGesture } from "./gesture";
import { getStrictContext } from "./get-strict-context";
import { useControlledState } from "./use-controlled-state";

// component/DialogAnimation.jsx

// 1. 定义动画变体
const animationVariants = {
    // --- 桌面动画 (从下到上) ---
    desktop: {
        // 隐藏状态 (未打开)
        initial: {
            transform: "translateY(100vh)",
            boxShadow: "0 0 0 150vmax rgba(0, 0, 0, 0)",
        },
        // 动画状态 (打开时)
        animate: {
            transform: "translateY(0px)",
            boxShadow: "0 0 0 150vmax rgba(0, 0, 0, 0.5)",
        },
        // 退出状态 (关闭时)
        exit: {
            transform: "translateY(100vh)",
            boxShadow: "0 0 0 150vmax rgba(0, 0, 0, 0)",
        }, // 保持 y 轴运动
    },

    // --- 左侧抽屉 (从左往右) ---
    left: {
        // 隐藏状态 (未打开)
        initial: {
            transform: "translateX(-110%)",
            boxShadow: "0 0 0 150vmax rgba(0, 0, 0, 0)",
        },
        // 动画状态 (打开时)
        animate: {
            transform: "translateX(0px)",
            boxShadow: "0 0 0 150vmax rgba(0, 0, 0, 0.5)",
        },
        // 退出状态 (关闭时)
        exit: {
            transform: "translateX(-110%)",
            boxShadow: "0 0 0 150vmax rgba(0, 0, 0, 0)",
        },
    },

    // --- 移动端动画 (从右到左) ---
    mobile: {
        // 隐藏状态 (未打开)
        initial: {
            transform: `translateX(${window.innerWidth}px)`,
            boxShadow: "0 0 0 150vmax rgba(0, 0, 0, 0)",
        },
        // 动画状态 (打开时)
        animate: {
            transform: `translateX(0px)`,
            boxShadow: "0 0 0 150vmax rgba(0, 0, 0, 0.5)",
        },
        // 退出状态 (关闭时)
        exit: {
            transform: `translateX(${window.innerWidth}px)`,
            boxShadow: "0 0 0 150vmax rgba(0, 0, 0, 0)",
        }, // 保持 x 轴运动
    },
    // --- 底部抽屉 (从下往上) ---
    bottom: {
        // 隐藏状态 (未打开)
        initial: {
            transform: "translateY(100%)",
            boxShadow: "0 0 0 150vmax rgba(0, 0, 0, 0)",
        },
        // 动画状态 (打开时)
        animate: {
            transform: "translateY(0px)",
            boxShadow: "0 0 0 150vmax rgba(0, 0, 0, 0.5)",
        },
        // 退出状态 (关闭时)
        exit: {
            transform: "translateY(100%)",
            boxShadow: "0 0 0 150vmax rgba(0, 0, 0, 0)",
        },
    },
    fade: {
        // 隐藏状态 (未打开)
        initial: {
            opacity: "0",
            transform: `scale(0.9)`,
            boxShadow: "0 0 0 150vmax rgba(0, 0, 0, 0)",
        },
        // 动画状态 (打开时)
        animate: {
            opacity: "1",
            transform: `scale(1)`,
            boxShadow: "0 0 0 150vmax rgba(0, 0, 0, 0.5)",
        },
        // 退出状态 (关闭时)
        exit: {
            opacity: "0",
            transform: `scale(0.9)`,
            boxShadow: "0 0 0 150vmax rgba(0, 0, 0, 0)",
        },
    },
};

const TRANSITION_DURATION = 400;
const TRANSITION_EASING = "ease";

/** 元素可能在动画结束前已被移出 DOM（快速关闭/抽屉销毁），此时 commitStyles 会抛 InvalidStateError。 */
function commitStylesSafe(ani: Animation) {
    const target = (ani.effect as KeyframeEffect | null)?.target;
    if (!(target instanceof Element) || !target.isConnected) {
        ani.cancel();
        return;
    }
    ani.commitStyles();
    ani.cancel();
}

// 2. 定义过渡属性 (Transition)
const transitionProps: Transition = {
    type: "tween", // "tween" 类型允许使用 cubic-bezier
    ease: [0.32, 0.72, 0, 1], // 这是 iOS "push" 动画的精确贝塞尔曲线
    duration: 0.4, // iOS 动画通常在 0.35s - 0.4s 之间
};

/**
 * 将 Motion.js 风格的 transition 转换为 Web Animations API 的参数
 */
function transformMotionToNative(transition: Transition) {
    const {
        duration = 0.3,
        ease = "easeOut",
        delay = 0,
        times,
        repeat = 0,
        repeatType = "loop",
    } = transition;

    // 1. 处理缓动函数 (Easing)
    let easing = "ease";
    if (Array.isArray(ease)) {
        // 处理 cubic-bezier 数组 [x1, y1, x2, y2]
        easing = `cubic-bezier(${ease.join(", ")})`;
    } else if (typeof ease === "string") {
        // 映射一些 Motion 常见的命名（如需扩展可在此添加）
        easing = ease === "linear" ? "linear" : ease;
    }

    // 2. 构建原生配置项
    const options = {
        duration: duration * 1000, // 秒转毫秒
        delay: delay * 1000,
        easing: easing,
        // WAAPI 的 iterations: Infinity 对应 Framer 的 repeat: Infinity
        iterations: repeat === Infinity ? Infinity : repeat + 1,
        // 处理循环方向
        direction: repeatType === "reverse" ? "alternate" : "normal",
        fill: "forwards", // 默认保留动画结束状态
    } as KeyframeAnimationOptions;

    return options;
}

type DialogContextType = {
    isOpen: boolean;
    setIsOpen: DialogProps["onOpenChange"];
    progress: number | undefined;
    setProgress: (v: number | undefined) => void;
};

const [DialogProvider, useDialog] =
    getStrictContext<DialogContextType>("DialogContext");

type DialogProps = React.ComponentProps<typeof DialogPrimitive.Root>;

function Dialog(props: DialogProps) {
    const [isOpen, setIsOpen] = useControlledState({
        value: props?.open,
        defaultValue: props?.defaultOpen,
        onChange: props?.onOpenChange,
    });
    const [progress, setProgress] = useState<number>();

    const onOpenChange = useCallback(
        (v: boolean) => {
            setIsOpen(v);
            if (!v) {
                setProgress(0);
            }
        },
        [setIsOpen],
    );

    return (
        <DialogProvider
            value={{
                isOpen,
                setIsOpen,
                progress,
                setProgress,
            }}
        >
            <DialogPrimitive.Root
                data-slot="dialog"
                {...props}
                onOpenChange={onOpenChange}
            />
        </DialogProvider>
    );
}

type DialogTriggerProps = React.ComponentProps<typeof DialogPrimitive.Trigger>;

function DialogTrigger(props: DialogTriggerProps) {
    return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

type DialogPortalProps = Omit<
    React.ComponentProps<typeof DialogPrimitive.Portal>,
    "forceMount"
>;

function DialogPortal(props: DialogPortalProps) {
    const { isOpen } = useDialog();

    return (
        <AnimatePresence>
            {isOpen && (
                <DialogPrimitive.Portal
                    data-slot="dialog-portal"
                    forceMount
                    {...props}
                />
            )}
        </AnimatePresence>
    );
}

type DialogOverlayProps = Omit<
    React.ComponentProps<typeof DialogPrimitive.Overlay>,
    "forceMount" | "asChild"
> &
    HTMLMotionProps<"div">;

function DialogOverlay({
    transition = { duration: 0.2, ease: "easeInOut" },
    ...props
}: DialogOverlayProps) {
    return (
        <DialogPrimitive.Overlay data-slot="dialog-overlay" asChild forceMount>
            <div
                key="dialog-overlay"
                {...props}
                style={{ ...props.style }}
                className={cn("!transition-none opacity-0", props.className)}
                // initial={{ opacity: 0 }}
                // animate={{ opacity: 1 }}
                // exit={{ opacity: 0 }}
                // transition={transition}
            />
        </DialogPrimitive.Overlay>
    );
}

type DialogFlipDirection = "top" | "bottom" | "left" | "right";
type DialogContentProps = Omit<
    React.ComponentProps<typeof DialogPrimitive.Content>,
    "forceMount" | "asChild"
> &
    HTMLMotionProps<"div"> & {
        from?: DialogFlipDirection;
    } & {
        swipe?: boolean;
        fade?: boolean;
    };

const toPx = (v: string) => {
    const p = ["vw", "vh"].find((x) => v.includes(x));
    if (!p) {
        return Number(v);
    }
    const W = p === "vw" ? window.innerWidth : window.innerHeight;
    const [w, x] = v.split(p).map((c) => (!c ? 0 : Number(c)));
    return x + (w / 100) * W;
};

function DialogContent({
    onOpenAutoFocus,
    onCloseAutoFocus,
    onEscapeKeyDown,
    onPointerDownOutside,
    onInteractOutside,
    transition = transitionProps,
    fade,
    swipe,
    from,
    ...props
}: DialogContentProps) {
    const isDesktop = useIsDesktop();
    const contentRef = useRef<HTMLDivElement>(null);
    const [isPresent, safeToRemove] = usePresence(); // 关键：获取是否正在被销毁

    // 动态选择变体
    const currentVariant =
        from === "left"
            ? animationVariants.left
            : from === "bottom"
              ? animationVariants.bottom
              : fade
                ? animationVariants.fade
                : isDesktop
                  ? animationVariants.desktop
                  : animationVariants.mobile;
    const transitionNative = useMemo(
        () => transformMotionToNative(transition),
        [transition],
    );

    const { setIsOpen, setProgress } = useDialog();
    const onClose = useCallback(() => {
        setIsOpen?.(false);
    }, [setIsOpen]);

    const dragDismiss = useRef(false);

    // 3. 定义拖拽结束时的处理逻辑（保持不变）
    const handleDragEnd = useCallback(
        (event: PointerEvent, info: PanInfo) => {
            const { offset, velocity } = info;
            console.log("drag stopped");
            // ... (拖拽结束逻辑与原先保持一致) ...

            const dismissThreshold = 200;
            const velocityThreshold = 500;

            const shouldDismiss =
                offset.x > dismissThreshold || velocity.x > velocityThreshold;

            if (shouldDismiss && offset.x > 0) {
                contentRef.current
                    ?.animate(
                        [
                            {
                                transform: `translateX(100vw)`,
                            },
                        ],
                        {
                            easing: "cubic-bezier(0, 0, 0.58, 1)",
                            duration: 300,
                            fill: "forwards",
                        },
                    )
                    .finished.then(() => {
                        dragDismiss.current = true;
                        onClose();
                    });
            } else {
                contentRef.current
                    ?.animate(
                        [
                            {
                                transform: `translateX(0px)`,
                            },
                        ],
                        {
                            easing: "cubic-bezier(0, 0, 0.58, 1)",
                            duration: 300,
                            fill: "forwards",
                        },
                    )
                    .finished.then((ani) => {
                        commitStylesSafe(ani);
                        contentRef.current?.style.removeProperty("transform");
                    });
            }
        },
        [onClose],
    );

    useEffect(() => {
        // 左侧抽屉的关闭方向与右滑手势相反，交给遮罩点击和关闭按钮处理
        if (isDesktop || fade || from === "left" || from === "bottom") return;
        const root = contentRef.current;
        if (!root) {
            return;
        }
        const stop = registerSlideGesture(root, {
            onStart: ({ direction }) => {
                const bounds = root.getBoundingClientRect();
                if (direction === "y") return;
                return {
                    fullWidth: bounds.width,
                    fullHeight: bounds.height,
                };
            },
            onProgress(offset, { fullWidth }) {
                const offsetX = Math.max(0, Math.min(fullWidth, offset.x));
                root.style.transform = `translate3d(${offsetX}px,0,0)`;
                const p = offsetX / fullWidth;
                root.style.boxShadow = `0 0 0 150vmax rgba(0, 0, 0, ${0.5 - 0.5 * p})`;
            },
            onEnd: (offset, { fullWidth }) => {
                const offsetX = Math.max(0, Math.min(fullWidth, offset.x));
                const swProgress = offsetX / fullWidth;
                const acc = offset.accX();
                const leftTime = Math.max(
                    200,
                    (1 - swProgress) * TRANSITION_DURATION,
                );
                if (swProgress >= 0.5 || acc > 0.5) {
                    const ani1 = root.animate(
                        [
                            {
                                transform: "translate3d(100%,0,0)",
                                boxShadow: "0 0 0 150vmax rgba(0,0,0,0)",
                            },
                        ],
                        {
                            duration: leftTime,
                            iterations: 1,
                            fill: "forwards",
                            easing: "ease-out",
                        },
                    );

                    ani1.finished.then(async () => {
                        commitStylesSafe(ani1);
                        dragDismiss.current = true;
                        onClose();
                    });
                } else {
                    // cancel back
                    const ani1 = root.animate(
                        [
                            {
                                transform: "translate3d(0,0,0)",
                                boxShadow: "0 0 0 150vmax rgba(0,0,0,0.5)",
                            },
                        ],
                        {
                            duration: leftTime,
                            iterations: 1,
                            fill: "forwards",
                            easing: TRANSITION_EASING,
                        },
                    );
                    ani1.finished.then(() => {
                        commitStylesSafe(ani1);
                    });
                }
            },
        });
        return stop;
    }, [isDesktop, fade, from, onClose]);

    // 底部抽屉：从标记了 data-sheet-drag 的区域向下拖动收起。
    // 位移超过 6px 才接管指针，保证拖动区域内的按钮仍可正常点击。
    useEffect(() => {
        if (from !== "bottom") return;
        const root = contentRef.current;
        if (!root) return;

        let startY = 0;
        let startX = 0;
        let startTime = 0;
        let lastY = 0;
        let lastTime = 0;
        let active = false;
        let capturing = false;

        const onDown = (event: PointerEvent) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            const target = event.target as Element | null;
            if (!target?.closest("[data-sheet-drag]")) return;
            if (target.closest("input, textarea, select, [data-sheet-no-drag]"))
                return;
            active = true;
            capturing = false;
            startY = lastY = event.clientY;
            startX = event.clientX;
            startTime = lastTime = event.timeStamp;
        };

        const onMove = (event: PointerEvent) => {
            if (!active) return;
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;
            if (!capturing) {
                if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
                // 横向移动是滚动，不抢手势
                if (Math.abs(dy) <= Math.abs(dx)) {
                    active = false;
                    return;
                }
                capturing = true;
                try {
                    root.setPointerCapture(event.pointerId);
                } catch {
                    // 指针已释放时忽略
                }
            }
            lastY = event.clientY;
            lastTime = event.timeStamp;
            const offset = Math.max(0, dy);
            const progress = Math.min(offset / (root.offsetHeight || 1), 1);
            root.style.transform = `translate3d(0, ${offset}px, 0)`;
            root.style.boxShadow = `0 0 0 150vmax rgba(0, 0, 0, ${0.5 * (1 - progress)})`;
        };

        const suppressClick = () => {
            const suppress = (event: Event) => {
                event.stopPropagation();
                event.preventDefault();
            };
            root.addEventListener("click", suppress, {
                capture: true,
                once: true,
            });
            window.setTimeout(
                () => root.removeEventListener("click", suppress, true),
                120,
            );
        };

        const onUp = (event: PointerEvent) => {
            if (!active) return;
            active = false;
            if (!capturing) return;
            capturing = false;

            const dy = Math.max(0, event.clientY - startY);
            const elapsed = Math.max(1, event.timeStamp - startTime);
            const velocity = dy / elapsed;
            const shouldDismiss =
                dy > Math.min(120, root.offsetHeight * 0.25) || velocity > 0.5;

            if (shouldDismiss) {
                // 由拖动动画接管关闭，跳过默认的退出动画
                dragDismiss.current = true;
                root.animate(
                    [
                        {
                            transform: `translate3d(0, ${dy}px, 0)`,
                            boxShadow: root.style.boxShadow,
                        },
                        {
                            transform: "translate3d(0, 100%, 0)",
                            boxShadow: "0 0 0 150vmax rgba(0, 0, 0, 0)",
                        },
                    ],
                    {
                        duration: 220,
                        easing: "cubic-bezier(0.32, 0.72, 0, 1)",
                        fill: "forwards",
                    },
                ).finished.then(() => onClose());
                return;
            }

            const settle = root.animate(
                [
                    {
                        transform: `translate3d(0, ${dy}px, 0)`,
                        boxShadow: root.style.boxShadow,
                    },
                    {
                        transform: "translate3d(0, 0, 0)",
                        boxShadow: "0 0 0 150vmax rgba(0, 0, 0, 0.5)",
                    },
                ],
                {
                    duration: 220,
                    easing: "cubic-bezier(0.32, 0.72, 0, 1)",
                    fill: "forwards",
                },
            );
            settle.finished.then(() => {
                settle.cancel();
                root.style.transform = "";
                root.style.boxShadow = "0 0 0 150vmax rgba(0, 0, 0, 0.5)";
            });
            if (dy > 6) suppressClick();
        };

        const onCancel = () => {
            if (!capturing) {
                active = false;
                return;
            }
            active = false;
            capturing = false;
            const settle = root.animate(
                [
                    { transform: root.style.transform },
                    {
                        transform: "translate3d(0, 0, 0)",
                        boxShadow: "0 0 0 150vmax rgba(0, 0, 0, 0.5)",
                    },
                ],
                { duration: 200, fill: "forwards" },
            );
            settle.finished.then(() => {
                settle.cancel();
                root.style.transform = "";
                root.style.boxShadow = "0 0 0 150vmax rgba(0, 0, 0, 0.5)";
            });
        };

        const onRelease = () => {
            if (active && !capturing) active = false;
        };

        root.addEventListener("pointerdown", onDown);
        root.addEventListener("pointermove", onMove);
        root.addEventListener("pointerup", onUp);
        root.addEventListener("pointercancel", onCancel);
        window.addEventListener("pointerup", onRelease);
        return () => {
            root.removeEventListener("pointerdown", onDown);
            root.removeEventListener("pointermove", onMove);
            root.removeEventListener("pointerup", onUp);
            root.removeEventListener("pointercancel", onCancel);
            window.removeEventListener("pointerup", onRelease);
        };
    }, [from, onClose]);

    const initialPlayed = useRef(false);
    const exitPlayed = useRef(false);

    useEffect(() => {
        if (isPresent) {
            if (initialPlayed.current) {
                return;
            }
            initialPlayed.current = true;
            exitPlayed.current = false;
            // 执行“进入”动画
            Array.from(Object.entries(currentVariant.animate)).forEach(
                ([prop, value]) => {
                    contentRef.current!.style[prop as any] = value;
                },
            );
            contentRef.current
                ?.animate([currentVariant.initial, currentVariant.animate], {
                    ...transitionNative,
                    fill: "forwards",
                })
                .finished.then((ani) => {
                    commitStylesSafe(ani);
                });
        } else {
            if (exitPlayed.current) {
                return;
            }
            if (dragDismiss.current) {
                safeToRemove?.();
                return;
            }
            exitPlayed.current = true;
            initialPlayed.current = false;
            // 执行“退出”动画
            const exitAnimation = async () => {
                await contentRef.current?.animate(
                    [currentVariant.animate, currentVariant.exit],
                    transitionNative,
                ).finished;
                safeToRemove?.(); // 动画结束后，手动通知 React 真正销毁 DOM
            };
            exitAnimation();
        }
    }, [isPresent, currentVariant, transitionNative, safeToRemove]);

    return (
        <DialogPrimitive.Content
            asChild
            forceMount
            onOpenAutoFocus={onOpenAutoFocus}
            onCloseAutoFocus={onCloseAutoFocus}
            onEscapeKeyDown={onEscapeKeyDown}
            onPointerDownOutside={onPointerDownOutside}
            onInteractOutside={onInteractOutside}
        >
            <motion.div
                ref={contentRef} // 绑定 ref 以获取 DOM 边界
                key="dialog-content"
                data-slot="dialog-content"
                {...props}
            />
        </DialogPrimitive.Content>
    );
}

type DialogCloseProps = React.ComponentProps<typeof DialogPrimitive.Close>;

function DialogClose(props: DialogCloseProps) {
    return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

type DialogHeaderProps = React.ComponentProps<"div">;

function DialogHeader(props: DialogHeaderProps) {
    return <div data-slot="dialog-header" {...props} />;
}

type DialogFooterProps = React.ComponentProps<"div">;

function DialogFooter(props: DialogFooterProps) {
    return <div data-slot="dialog-footer" {...props} />;
}

type DialogTitleProps = React.ComponentProps<typeof DialogPrimitive.Title>;

function DialogTitle(props: DialogTitleProps) {
    return <DialogPrimitive.Title data-slot="dialog-title" {...props} />;
}

type DialogDescriptionProps = React.ComponentProps<
    typeof DialogPrimitive.Description
>;

function DialogDescription(props: DialogDescriptionProps) {
    return (
        <DialogPrimitive.Description
            data-slot="dialog-description"
            {...props}
        />
    );
}

export {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogClose,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
    useDialog,
    type DialogProps,
    type DialogTriggerProps,
    type DialogPortalProps,
    type DialogCloseProps,
    type DialogOverlayProps,
    type DialogContentProps,
    type DialogHeaderProps,
    type DialogFooterProps,
    type DialogTitleProps,
    type DialogDescriptionProps,
    type DialogContextType,
    type DialogFlipDirection,
};
