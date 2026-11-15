import modal from "@/components/modal";

/**
 * 退出登录回到登录页（设置页与登录后引导页共用）：prompt 确认（取消静默返回 false），
 * beforeLogout 快照 → 端点 logout → 清空本地存储 → afterLogout（恢复上次连接信息）→ reload。
 * 确认标题由调用方传入（logout-warning 文案要用组件里的 useIntl 取）。
 */
export const logoutWithConfirm = async (
    warningTitle: React.ReactNode,
): Promise<boolean> => {
    try {
        await modal.prompt({ title: warningTitle });
    } catch {
        // 取消 = 留在原地
        return false;
    }
    const { StorageAPI } = await import("@/api/storage");
    StorageAPI.beforeLogout?.();
    await Promise.all([
        StorageAPI.logout(),
        new Promise<void>((res) => {
            setTimeout(() => {
                res();
            }, 100);
        }),
    ]);
    localStorage.clear();
    sessionStorage.clear();
    StorageAPI.afterLogout?.();
    location.reload();
    return true;
};
