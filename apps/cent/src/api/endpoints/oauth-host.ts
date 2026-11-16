/**
 * GitHub / Gitee 快捷登录后端地址。
 *
 * 线上由构建环境注入 `VITE_LOGIN_API_HOST`；本地 / 未注入时若不兜底，
 * 拼出来的会是 `undefined/api/gitee-oauth/authorize?...`——
 * 这种「相对路径」会被解析成当前源下的地址，点登录只是把页面刷回登录页
 * （用户反馈「点 GitHub 和 Gitee 登录都是闪一下就没了，没法登录」）。
 * 所以这里回落到线上同一个后端，保证 dev 与线上行为一致。
 */
const FALLBACK_LOGIN_API_HOST = "https://oncent-backend.linkai.work";

/** 只接受 absolute http(s) 地址，避免 `.env` 写错（如漏协议）时又退回相对路径跳转 */
const normalize = (value?: string) => {
    const trimmed = value?.trim();
    if (!trimmed) return undefined;
    try {
        const url = new URL(trimmed);
        if (url.protocol !== "http:" && url.protocol !== "https:")
            return undefined;
        return url.toString().replace(/\/$/, "");
    } catch {
        return undefined;
    }
};

export const LOGIN_API_HOST =
    normalize(import.meta.env.VITE_LOGIN_API_HOST) ?? FALLBACK_LOGIN_API_HOST;
