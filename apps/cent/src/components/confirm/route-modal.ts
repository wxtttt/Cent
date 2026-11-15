/**
 * 二级路由页适配层：把「location 匹配」与「打开 / 关闭编排」从 createConfirmProvider
 * 里拆出来，provider 只负责渲染宿主，避免「命令式 open 状态」与「location 状态」双源
 * （URL 已变但弹层没关、弹层关了 URL 还在之类的错位都源自双源）。
 * - openRoute 进入（右滑入场）；
 * - 关闭先播右滑出场动画，动画结束才回退；回退前用 location.key 判断内部历史
 *   （react-router 只给初始条目 key="default"，pushed 条目都是新 key）：
 *   MemoryRouter 不写 window.history，后退守卫必须读 router 自己的栈，不能读 window.history.state；
 *   万一处于栈底（刷新 / 深链等理论场景），navigate(-1) 无效，改用 fallback 就地替换。
 * - 系统返回 / iOS 边缘手势走 popstate，pathname 直接变化、组件即时卸载，
 *   不经过 requestClose、没有出场动画——接受这个差异（View Transitions 收益不抵成本）。
 */
import { type AnimationEvent, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { goBack, goPage } from "./navigation";

/** 模块级入口：让路由器外的调用方（登录层、endpoint）也能进入二级路由页 */
export function openRoute(path: string) {
    goPage(path);
}

export function useRoutePage(routePath: string, fallback = "/") {
    const { pathname, key } = useLocation();
    const active = pathname === routePath;
    const [closing, setClosing] = useState(false);
    const closingRef = useRef(false);

    // 页面被外部导航关闭时复位关闭标记，下次进入动画正常
    useEffect(() => {
        if (!active && closingRef.current) {
            closingRef.current = false;
            setClosing(false);
        }
    }, [active]);

    const performClose = () => {
        if (key !== "default") {
            goBack();
        } else {
            goPage(fallback, { replace: true });
        }
    };

    const requestClose = () => {
        // 幂等：快速双击返回 / 多条关闭路径同时触发时只走一次
        if (closingRef.current) return;
        closingRef.current = true;
        // 系统开启「减少动态效果」时不播动画，直接回退
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            performClose();
            return;
        }
        setClosing(true);
    };

    // 只有宿主自身的动画结束才触发回退；animationend 会冒泡，子元素动画必须排除
    const onExitAnimationEnd = (e: AnimationEvent<HTMLElement>) => {
        if (e.target !== e.currentTarget) return;
        if (closingRef.current) {
            performClose();
        }
    };

    return { active, closing, requestClose, onExitAnimationEnd };
}
