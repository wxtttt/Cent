import { useEffect, useState } from "react";

type VisualViewportState = {
    /** 可视视口高度（键盘弹出时会缩小） */
    height: number;
    /** 可视视口相对布局视口的偏移 */
    offsetTop: number;
    /** 被键盘等遮挡的高度 */
    keyboard: number;
};

function read(): VisualViewportState {
    const vv = window.visualViewport;
    const height = vv?.height ?? window.innerHeight;
    const offsetTop = vv?.offsetTop ?? 0;
    return {
        height,
        offsetTop,
        keyboard: Math.max(0, window.innerHeight - height - offsetTop),
    };
}

/** 跟踪 visualViewport，供底部抽屉在软键盘弹出时限高并上移 */
export function useVisualViewport(): VisualViewportState {
    const [state, setState] = useState<VisualViewportState>(read);
    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;
        const update = () => setState(read());
        vv.addEventListener("resize", update);
        vv.addEventListener("scroll", update);
        return () => {
            vv.removeEventListener("resize", update);
            vv.removeEventListener("scroll", update);
        };
    }, []);
    return state;
}
