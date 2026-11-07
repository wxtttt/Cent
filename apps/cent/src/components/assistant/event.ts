export const OPEN_ASSISTANT_EVENT = "cent:open-assistant";

/** 供顶部 AI 按钮、底部输入条、个人中心等任意入口唤起同一个助理 */
export const openAssistant = () => {
    window.dispatchEvent(new Event(OPEN_ASSISTANT_EVENT));
};
