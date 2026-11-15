/** 记忆式路由的全局导航桥：让模块级的 showXxx() 也能触发 MemoryRouter 跳转。 */
import type { NavigateFunction } from "react-router";

let appNavigate: NavigateFunction | null = null;

export function setAppNavigator(fn: NavigateFunction | null) {
    appNavigate = fn;
}

/** 进入一个二级路由页（FromRight 右滑）；replace 用于栈底 fallback 就地替换 */
export function goPage(path: string, options?: { replace?: boolean }) {
    appNavigate?.(path, options);
}

/** 二级路由页返回上一个导航层级 */
export function goBack() {
    appNavigate?.(-1);
}
