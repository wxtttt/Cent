import { toast } from "sonner";
import { t } from "@/locale";
import { asyncOnce } from "@/utils/async";
import { LOGIN_API_HOST } from "../oauth-host";

const LOCAL_TOKEN_KEY = "github_user_token";

const { promise: loginFinished, resolve: resolveLoginFinished } =
    Promise.withResolvers<void>();

export const createLoginAPI = () => {
    const login = () => {
        window.open(
            `${LOGIN_API_HOST}/api/github-oauth/authorize?redirect_uri=${encodeURIComponent(`${window.origin}`)}`,
            "_self",
        );
    };

    // OAuth 回跳后由 index.html 把完整地址写进 localStorage._oauth_res，
    // 这里解析出 token 落库。全链路必须保证 `loginFinished` 一定会 resolve：
    // 任何一步抛出（地址被截断、payload 不是 JSON）否则 getToken 会永久挂起，
    // 表现为「点登录闪一下，页面一直转圈 / 停在登录页」。
    const afterLogin = async () => {
        try {
            const resText = localStorage.getItem("_oauth_res");
            if (!resText) {
                return;
            }
            const res = JSON.parse(resText);
            if (res?.type !== "github") {
                return;
            }
            localStorage.removeItem("_oauth_res");
            const url = new URL(res.url);
            const githubTokenData = JSON.parse(
                url.searchParams.get("github_authorized") || "{}",
            );
            const accessToken = githubTokenData["access_token"];
            // expires_in / refresh_token_expires_in 后端给的是「秒」，落库统一存毫秒时间戳；
            // 少乘 1000 会被当成 8 秒后就过期，每次登录都白跑一次 refresh
            const expiresIn = githubTokenData["expires_in"];
            const refreshToken = githubTokenData["refresh_token"];
            const refreshTokenExpiresIn =
                githubTokenData["refresh_token_expires_in"];
            const tokenType = githubTokenData["token_type"];
            const scope = githubTokenData["scope"];

            if (accessToken) {
                localStorage.setItem(
                    LOCAL_TOKEN_KEY,
                    JSON.stringify({
                        accessToken,
                        expiresIn: expiresIn
                            ? Date.now() + expiresIn * 1000
                            : undefined,
                        refreshToken,
                        refreshTokenExpiresIn: refreshTokenExpiresIn
                            ? Date.now() + refreshTokenExpiresIn * 1000
                            : undefined,
                        tokenType,
                        scope,
                    }),
                );
            } else {
                // 后端没换到 token（多为登录接口报错 / 用户取消授权），
                // 不提示的话只是回到登录页，用户只会觉得「闪了一下没了」
                toast.error(t("login-oauth-failed"));
            }
        } catch {
            toast.error(t("login-oauth-failed"));
        } finally {
            resolveLoginFinished();
        }
    };

    const _getToken = async () => {
        await loginFinished;
        const token = getLocalToken();
        if (!token) {
            throw new Error("token not found");
        }
        if (token.expiresIn) {
            const now = Date.now();
            const diff = token.expiresIn - now;
            // 小于2小时 刷新token
            if (diff < 2 * 60 * 60 * 1000) {
                // to refresh
                const res = await fetch(
                    `${LOGIN_API_HOST}/api/github-oauth/refresh-token`,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            refreshToken: token.refreshToken,
                        }),
                    },
                );
                if (!res.ok) {
                    throw new Error("refresh token: Bad credentials");
                }
                const githubTokenData =
                    (await res.json()) as GithubTokenResponse;
                const accessToken = githubTokenData["access_token"];
                const expiresIn = githubTokenData["expires_in"];
                const refreshToken = githubTokenData["refresh_token"];
                const refreshTokenExpiresIn =
                    githubTokenData["refresh_token_expires_in"];
                const tokenType = githubTokenData["token_type"];
                const scope = githubTokenData["scope"];
                const newToken = {
                    accessToken,
                    expiresIn: Date.now() + expiresIn * 1000,
                    refreshToken,
                    refreshTokenExpiresIn:
                        Date.now() + refreshTokenExpiresIn * 1000,
                    tokenType,
                    scope,
                };
                if (accessToken) {
                    localStorage.setItem(
                        LOCAL_TOKEN_KEY,
                        JSON.stringify(newToken),
                    );
                    return newToken;
                }
            }
        }
        return token;
    };

    const getToken = asyncOnce(_getToken);

    const manuallySetToken = (token: string) => {
        localStorage.setItem("SYNC_ENDPOINT", "github");
        localStorage.setItem(
            LOCAL_TOKEN_KEY,
            JSON.stringify({
                accessToken: token,
            }),
        );
    };

    const getLocalToken = () => {
        const item = localStorage.getItem(LOCAL_TOKEN_KEY);
        if (!item) {
            return undefined;
        }
        return JSON.parse(item) as Token;
    };

    return {
        login,
        getToken,
        manuallySetToken,
        getLocalToken,
        afterLogin,
    };
};

type GithubTokenResponse = {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    refresh_token_expires_in: number;
    scope: string;
    token_type: string;
};

export type Token = {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    refreshTokenExpiresIn?: number;
};
