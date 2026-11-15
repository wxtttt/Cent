/**
 * iOS 主屏幕 PWA 视口兼容层（全局安装一次，见 main.tsx 的 installViewportCompat）：
 *
 * 1. 底部安全区校准：部分 iOS 版本把底部 home 指示条区域从网页可视区里扣掉
 *    （layout 视口矮于 screen.height），但 env(safe-area-inset-bottom) 仍按整屏
 *    报告，安全区留白被双重补偿——#root / dock / 抽屉 footer 整体悬空在可视区
 *    底边之上（实测 iPhone 16 Pro：可视区 812pt、仍报 34pt inset，dock 底部
 *    悬空 96pt）。启动时一次性测出「视口缺口」并从报告的底部 inset 里扣掉。
 * 2. 键盘视口守卫：iOS 键盘收起后有时把可视视口卡在上移状态
 *    （visualViewport.offsetTop > 0），整页 / 抽屉停留在被键盘顶起的样子。
 *    本应用的根滚动已锁死（html fixed + overflow hidden），document 自身永远
 *    在原点，offsetTop > 0 只可能是键盘 / 捏合的残余平移——监听到「没有聚焦
 *    输入框却仍有平移」时拉回原点；聚焦期间不平移（iOS 正借平移露出输入框）。
 * 3. 画布底色跟随（pushCanvasSurface / popCanvasSurface，由全屏灰面组件开合时
 *    调用）：系统扣掉的那段底部条带只能显示 html 画布底色，灰面打开期间把
 *    画布同步成抽屉灰，条带才不会在灰面下露出一截暖米。
 * 4. useScrollableX：iOS 对 overflow-x-auto 容器的怪癖——内容没溢出也能横向
 *    拖动回弹。横向滚动区只在真实溢出时才可滚，据此切换 overflow 类。
 *
 * 视口正常的设备（含桌面浏览器、非独立模式）上全部 no-op，等价原生行为。
 */

import { type RefObject, useCallback, useEffect, useState } from "react";

/** 底部安全区校准：缺口超过 120pt 视为 iPad 分屏等异形窗口，不做校准 */
function calibrateSafeAreaInsets() {
    try {
        const nav = navigator as Navigator & { standalone?: boolean };
        if (nav.standalone !== true) return;
        const strip = window.screen.height - window.innerHeight;
        if (strip <= 0 || strip > 120) return;
        // env() 无法从 JS 直接读，用探针元素把报告的底部 inset 量出来
        const probe = document.createElement("div");
        probe.style.cssText =
            "position:fixed;visibility:hidden;pointer-events:none;height:env(safe-area-inset-bottom)";
        document.body.appendChild(probe);
        const reported = probe.getBoundingClientRect().height;
        probe.remove();
        const effective = Math.max(0, reported - strip);
        document.documentElement.style.setProperty(
            "--safe-area-inset-bottom",
            `${effective}px`,
        );
    } catch {
        // 测量失败时保持浏览器报告的原始 inset
    }
}

/** 键盘视口守卫：无焦点却仍有可视视口平移时拉回原点 */
function installKeyboardViewportGuard() {
    const vv = window.visualViewport;
    if (!vv) return;
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
    const reset = () => {
        if (isEditing()) return;
        if (vv.offsetTop > 0) {
            window.scrollTo(0, 0);
        }
    };
    vv.addEventListener("resize", reset);
    vv.addEventListener("scroll", reset);
    // 键盘收起的那一刻可能不再派发视口事件，补一个失焦后的延迟复位
    document.addEventListener("focusout", () => {
        window.setTimeout(reset, 250);
    });
}

export function installViewportCompat() {
    calibrateSafeAreaInsets();
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
