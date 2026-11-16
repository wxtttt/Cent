import { toast } from "sonner";
import { t } from "@/locale";
import { asyncOnce } from "@/utils/async";
import { LOGIN_API_HOST } from "../oauth-host";

const LOCAL_TOKEN_KEY = "gitee_user_token";

const { promise: loginFinished, resolve: resolveLoginFinished } =
    Promise.withResolvers<void>();

export const createLoginAPI = () => {
    const login = () => {
        window.open(
            `${LOGIN_API_HOST}/api/gitee-oauth/authorize?redirect_uri=${encodeURIComponent(`${window.origin}`)}`,
            "_self",
        );
    };

    // 与 GitHub 同一套回跳解析：任何一步抛错都要保证 `loginFinished` 已 resolve，
    // 否则 getToken 永久挂起（表现为「点登录闪一下就没反应」）
    const afterLogin = async () => {
        try {
            const resText = localStorage.getItem("_oauth_res");
            if (!resText) {
                return;
            }
            const res = JSON.parse(resText);
            if (res?.type !== "gitee") {
                return;
            }
            localStorage.removeItem("_oauth_res");
            const url = new URL(res.url);
            const tokenData = JSON.parse(
                url.searchParams.get("gitee_authorized") || "{}",
            );
            const accessToken = tokenData["access_token"];
            // 后端给的过期时间是「秒」，落库存毫秒时间戳（漏乘 1000 会每次登录都触发刷新）
            const expiresIn = tokenData["expires_in"];
            const refreshToken = tokenData["refresh_token"];
            const refreshTokenExpiresIn = tokenData["refresh_token_expires_in"];
            const tokenType = tokenData["token_type"];
            const scope = tokenData["scope"];

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
                    `${LOGIN_API_HOST}/api/gitee-oauth/refresh-token`,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            refreshToken: token.refreshToken,
                        }),
                    },
                );
                const tokenData = (await res.json()) as GiteeTokenResponse;
                const accessToken = tokenData["access_token"];
                const expiresIn = tokenData["expires_in"];
                const refreshToken = tokenData["refresh_token"];
                const refreshTokenExpiresIn =
                    tokenData["refresh_token_expires_in"];
                const tokenType = tokenData["token_type"];
                const scope = tokenData["scope"];
                const newToken = {
                    accessToken,
                    expiresIn: Date.now() + expiresIn * 1000,
                    refreshToken,
                    refreshTokenExpiresIn:
                        Date.now() +
                        (refreshTokenExpiresIn ?? 60 * 24 * 60 * 60) * 1000,
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
        localStorage.setItem("SYNC_ENDPOINT", "gitee");
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

type GiteeTokenResponse = {
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
