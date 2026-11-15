import type { WebDAVEdit } from "@/components/modal/web-dav";

const key = "web-dav-config";
/** 退出登录后仍保留的「上次连接信息」：地址 / 账号 / 昵称，不含密码 */
const lastAccountKey = "web-dav-last-account";

export const getWebDAVAuth = () => {
    const data = localStorage.getItem(key);
    if (!data) {
        return;
    }
    return JSON.parse(data) as WebDAVEdit;
};

/** 登录页恢复默认值用：带出上次的地址 / 账号 / 昵称（config 优先，其次登出暂存） */
export const getLastWebDAVAccount = () => {
    const data =
        localStorage.getItem(key) ?? localStorage.getItem(lastAccountKey);
    if (!data) {
        return;
    }
    try {
        return JSON.parse(data) as WebDAVEdit;
    } catch {
        return;
    }
};

/** 连接校验通过后由登录页调用：写入端点配置并刷新应用 */
export const saveWebDAVAccount = (auth: WebDAVEdit) => {
    localStorage.setItem("SYNC_ENDPOINT", "webdav");
    localStorage.setItem(key, JSON.stringify(auth));
    location.reload();
};

export { key as webDAVConfigKey, lastAccountKey as webDAVLastAccountKey };

/** 读取当前选中的账本 id（book-store 是 zustand persist：真实数据在 state 里） */
export const getCurrentBookId = () => {
    try {
        const data = JSON.parse(localStorage.getItem("book-store") ?? "{}") as {
            state?: { currentBookId?: string };
        };
        return data?.state?.currentBookId;
    } catch {
        return;
    }
};
