/**
 * iOS 主屏幕 PWA 视口兼容层（全局安装一次，见 main.tsx 的 installViewportCompat）：
 *
 * 1. 视口缺口（--viewport-bottom-gap）：部分 iOS 版本把底部 home 指示条区域从
 *    网页可视区里扣掉（layout 视口矮于 screen.height，iPhone 16 Pro 实测
 *    812 / 874，缺口 62pt），但 env(safe-area-inset-bottom) 仍按整屏报告 34pt，
 *    安全区留白被双重补偿——#root / dock / 抽屉 footer 整体悬空在可视区底边之上。
 *    启动时一次性测出缺口：① 从报告的底部 inset 里扣掉，安全区不再叠加；
 *    ② 把缺口长度写进 --viewport-bottom-gap，全屏面（个人抽屉 / 二级路由页 /
 *    底部抽屉 / #root）自己往下延伸这一段，把系统底那一条也涂成自己的底色，
 *    否则表现为「下面一块空」（CSS 见 index.css 的 #root 与 .dp-screen-fill*）。
 * 2. 键盘视口守卫：iOS 键盘收起后有时把可视视口卡在上移状态
 *    （visualViewport.offsetTop > 0），整页 / 抽屉停留在被键盘顶起的样子。
 *    复位只在「聚焦过输入框且已全部失焦」后做一次——**不能常驻监听
 *    visualViewport 事件**：实测设备静息时 offsetTop 本身就不是 0（视口被系统
 *    扣过一截），常驻监听会把用户的正常滚动一并清掉，表现为页面滑不动、
 *    顶部卡片永远停在原位。window.scrollTo(0, 0) 不影响内层滚动容器，
 *    视口正常的设备上 document 恒在原点，等价 no-op。
 * 3. 画布底色跟随（pushCanvasSurface / popCanvasSurface，由全屏灰面组件开合时
 *    调用）：没被全屏面盖住的那段系统底只能显示 html 画布底色，灰面打开期间把
 *    画布同步成抽屉灰，条带才不会在灰面下露出一截暖米。全屏面已按缺口下探，
 *    这一层是「面没铺到底」时的兜底。
 * 4. useScrollableX：iOS 对 overflow-x-auto 容器的怪癖——内容没溢出也能横向
 *    拖动回弹。横向滚动区只在真实溢出时才可滚，据此切换 overflow 类。
 *
 * 视口正常的设备（含桌面浏览器、非独立模式）上全部 no-op，等价原生行为。
 */

import { type RefObject, useCallback, useEffect, useState } from "react";

/**
 * 视口缺口 = screen.height - innerHeight：屏幕比网页可视区高出来的那一条
 * （底部 home 指示条区域）。非独立模式（Safari 标签页 / 桌面）返回 0——
 * 那时两者的差额是浏览器工具栏，往下延伸会把内容顶到工具栏后面。
 * 缺口超过 120pt 视为 iPad 分屏等异形窗口，同样不做补偿。
 */
function measureViewportBottomGap() {
    const nav = navigator as Navigator & { standalone?: boolean };
    if (nav.standalone !== true) return 0;
    const gap = window.screen.height - window.innerHeight;
    if (gap <= 0 || gap > 120) return 0;
    return gap;
}

/** 底部安全区校准：可视区已扣掉缺口时，把报告的 inset 里重复的那一截减掉 */
function calibrateSafeAreaInsets(gap: number) {
    if (!gap) return;
    try {
        // env() 无法从 JS 直接读，用探针元素把报告的底部 inset 量出来
        const probe = document.createElement("div");
        probe.style.cssText =
            "position:fixed;visibility:hidden;pointer-events:none;height:env(safe-area-inset-bottom)";
        document.body.appendChild(probe);
        const reported = probe.getBoundingClientRect().height;
        probe.remove();
        const effective = Math.max(0, reported - gap);
        document.documentElement.style.setProperty(
            "--safe-area-inset-bottom",
            `${effective}px`,
        );
    } catch {
        // 测量失败时保持浏览器报告的原始 inset
    }
}

/** 键盘视口守卫：真实出现过键盘、且全部失焦后，把可视视口复位一次 */
function installKeyboardViewportGuard() {
    const isEditing = () => {
        const el = document.activeElement;
        return (
            el instanceof HTMLElement &&
            (el.tagName === "INPUT" ||
                el.tagName === "TEXTAREA" ||
                el.tagName === "SELECT" ||
                el.isContentEditable)
        );
    };
    let keyboardSeen = false;
    document.addEventListener("focusin", () => {
        if (isEditing()) keyboardSeen = true;
    });
    document.addEventListener("focusout", () => {
        if (!keyboardSeen) return;
        // 键盘收起动画期间可能还有输入框在焦点上，延迟到完全失焦再复位
        window.setTimeout(() => {
            if (isEditing()) return;
            keyboardSeen = false;
            window.scrollTo(0, 0);
        }, 250);
    });
}

export function installViewportCompat() {
    const gap = measureViewportBottomGap();
    document.documentElement.style.setProperty(
        "--viewport-bottom-gap",
        `${gap}px`,
    );
    calibrateSafeAreaInsets(gap);
    installKeyboardViewportGuard();
}

let canvasDepth = 0;

/** 全屏灰面打开时调用；多个灰面叠开按引用计数，最后一个关闭才还原画布 */
export function pushCanvasSurface() {
    canvasDepth += 1;
    document.documentElement.classList.add("dp-canvas-surface");
}

export function popCanvasSurface() {
    canvasDepth = Math.max(0, canvasDepth - 1);
    if (canvasDepth === 0) {
        document.documentElement.classList.remove("dp-canvas-surface");
    }
}

/**
 * 横向滚动区是否真的溢出：iOS 对 overflow-x-auto 容器内容不溢出也允许横向
 * 拖动回弹，调用方据此在 overflow-x-auto / overflow-hidden 之间切换。
 * 每次渲染后重测（数据变化会带来新渲染），容器自身尺寸变化由 ResizeObserver 兜底。
 */
export function useScrollableX(ref: RefObject<HTMLElement | null>) {
    const [scrollable, setScrollable] = useState(false);
    const update = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        setScrollable(el.scrollWidth > el.clientWidth + 1);
    }, [ref]);
    useEffect(() => {
        update();
    });
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [ref, update]);
    return scrollable;
}
