import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
    getLastWebDAVAccount,
    saveWebDAVAccount,
} from "@/api/endpoints/web-dav/account";
import { BTN_PRIMARY } from "@/components/button-styles";
import { FieldRow } from "@/components/login/field-row";
import { useIntl } from "@/locale";
import { checkWebDAVConfig } from "@/tidal/web-dav";
import createConfirmProvider from "../confirm";
import { Form, FormField } from "../ui/form";
import { ProxyHelpProvider, showProxyHelp } from "./login-proxy-help";

export type WebDAVEdit = {
    remote: string;
    username: string;
    password: string;
    proxy?: string;
    customUserName?: string;
};

type LoadingState = Partial<WebDAVEdit> & {
    check?: (v: WebDAVEdit) => Promise<unknown>;
};

export const createFormSchema = (t: any) =>
    z.object({
        remote: z.string(),
        username: z.string(),
        password: z.string(),
        proxy: z.optional(z.string()),
    });

// 常用服务商：点击自动填入标准地址，用户只需再填账号密码（坚果云可直接用）。
// Nextcloud / 群晖的域名因人而异，模板里的中文占位直接改掉即可。
const WEBDAV_PRESETS = [
    { label: "坚果云", url: "https://dav.jianguoyun.com/dav/" },
    { label: "Nextcloud", url: "https://你的域名/remote.php/dav/" },
    { label: "群晖", url: "http://你的群晖地址:5005/" },
];

/**
 * 登录方式二级路由页（/login/webdav）：结构对齐登录页——无标题栏、只放品牌图标，
 * 行式下划线输入（左标签 + 右输入 + 底部细线，参考主流 iOS 登录页），「测试连接」为
 * 品牌色文字链；底部只留一颗 54px 确认按钮（返回走左上角圆钮，用户口径去掉取消）。
 * 内容不足一屏时垂直居中，超出一屏时自然滚动（按钮随内容排在末尾）。
 * 外层补 dp-drawer-surface：亮色下与登录页同一套中性灰白底（#f4f4f4），
 * 不再回落到应用暖米色；深色自动回落全局暗色令牌。
 * 路由页拿不到 edit 注入，表单自持完成链——默认值直接从 localStorage 带出上次连接信息，
 * 校验通过后自己写入端点配置并刷新。用户身份不再在这里填昵称，改由登录后的
 * 「选择账本与用户」页决定（见 book/form.tsx）。
 */
const LoadingForm = ({ onCancel }: { onCancel?: () => void }) => {
    const t = useIntl();
    const formSchema = useMemo(() => createFormSchema(t), [t]);
    // 重新登录 / token 过期后再次打开时带出上次的地址 / 账号
    const last = getLastWebDAVAccount();
    const restored = Boolean(last?.remote || last?.username);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            remote: last?.remote ?? "",
            username: last?.username ?? "",
            password: last?.password ?? "",
            proxy: last?.proxy ?? "", //"https://oncent-backend.linkai.work/proxy?url=",
        },
    });
    const [checking, setChecking] = useState(false);
    const [testing, setTesting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const errors = form.formState.errors;
    const checkConnection = async (data: z.infer<typeof formSchema>) => {
        await checkWebDAVConfig({
            remoteUrl: data.remote,
            username: data.username,
            password: data.password,
            proxy: data.proxy,
        });
    };
    // 测试连接：只校验不落库，成功 / 失败都 toast，让用户放心点确认
    const onTest = async (data: z.infer<typeof formSchema>) => {
        setTesting(true);
        try {
            await checkConnection(data);
            toast.success(t("login-test-ok"));
        } catch (error) {
            toast.error((error as Error)?.message ?? JSON.stringify(error));
        } finally {
            setTesting(false);
        }
    };
    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        data.remote = data.remote.replace(/\/$/, "");
        setChecking(true);
        try {
            await checkConnection(data);
            // 校验通过即登录成功：写入端点配置并刷新应用
            saveWebDAVAccount(data as WebDAVEdit);
        } catch (error) {
            // 校验失败留在本页，错误信息 toast（原 endpoint check 回调的行为）
            toast.error((error as Error)?.message ?? JSON.stringify(error));
        } finally {
            setChecking(false);
        }
    };
    return (
        <>
            {/* 登录页没有顶栏，返回沿用 PopupLayout 圆钮样式悬浮在左上（fixed：滚动时不随内容走） */}
            <button
                type="button"
                aria-label={t("back")}
                onClick={onCancel}
                className="fixed left-4 top-[calc(var(--safe-area-inset-top)+12px)] z-10 flex size-10 items-center justify-center rounded-full bg-panel text-ink shadow-[0_1px_6px_rgba(92,62,30,0.10)]"
            >
                <i className="icon-[lucide--chevron-left] size-5" />
            </button>
            <div className="dp-drawer-surface flex min-h-full w-full flex-col bg-ground text-ink">
                <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col px-3 pt-[calc(var(--safe-area-inset-top)+40px)]">
                    <div className="my-auto flex flex-col pb-2">
                        {/* 二级登录页只要图标，不放应用名与简介（用户口径） */}
                        <div className="flex justify-center">
                            <img
                                src="/icon.png"
                                alt=""
                                className="size-14 flex-shrink-0 rounded-[18px] shadow-[0_4px_16px_rgba(92,62,30,0.12)]"
                            />
                        </div>
                        <div className="mt-2 text-center text-[13px] text-ink-secondary/80">
                            {t("login-webdav-hint")}
                        </div>
                        {restored && (
                            <div className="mt-3 flex items-center gap-1 self-center rounded-full bg-ground-muted px-3 py-1 text-xs text-ink-secondary">
                                <i className="icon-[lucide--history] size-3.5" />
                                {t("web-dav-restored-hint")}
                            </div>
                        )}
                        <Form {...form}>
                            {/* 常用服务商与字段组包在同一张白卡里（用户口径「类似卡片」）：
                                卡宽 340、卡内 padding 16，字段细线因此不再顶到卡边，
                                比原先裸铺在灰底上更接近 iOS 分组表单 */}
                            <div
                                data-login-form-card
                                className="mx-auto mt-8 w-full max-w-[340px] rounded-[20px] bg-panel px-4 pt-4 pb-4 shadow-[0_1px_6px_rgba(92,62,30,0.06)]"
                            >
                                {/* 常用服务商：点击自动填入标准地址，整组居中 */}
                                <div className="flex flex-col items-center gap-2.5">
                                    <span className="text-[12px] text-ink-secondary/70">
                                        {t("login-providers")}
                                    </span>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {WEBDAV_PRESETS.map((preset) => (
                                            <button
                                                key={preset.label}
                                                type="button"
                                                onClick={() => {
                                                    form.setValue(
                                                        "remote",
                                                        preset.url,
                                                    );
                                                }}
                                                className="rounded-full border border-rule bg-ground px-3.5 py-1.5 text-[14px] text-ink transition-colors hover:border-brand/60 hover:text-brand"
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-5 flex w-full flex-col gap-5">
                                    <FormField
                                        control={form.control}
                                        name="remote"
                                        render={({ field }) => (
                                            <FieldRow
                                                label={t("web-dav-remote-url")}
                                                error={errors.remote?.message}
                                                required
                                            >
                                                <input
                                                    {...field}
                                                    className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-secondary/70"
                                                    placeholder="https://dav.jianguoyun.com/dav/"
                                                />
                                            </FieldRow>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="username"
                                        render={({ field }) => (
                                            <FieldRow
                                                label={t("username")}
                                                error={errors.username?.message}
                                                required
                                            >
                                                <input
                                                    {...field}
                                                    className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-secondary/70"
                                                />
                                            </FieldRow>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FieldRow
                                                label={t("password")}
                                                required
                                            >
                                                <span className="flex min-w-0 flex-1 items-center">
                                                    <input
                                                        {...field}
                                                        type={
                                                            showPassword
                                                                ? "text"
                                                                : "password"
                                                        }
                                                        className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none"
                                                    />
                                                    {/* 眼睛热区 40×40（图标仍 16），右侧 -mr-2 抵掉
                                                    圆钮内边距，输入框可点宽度不变 */}
                                                    <button
                                                        type="button"
                                                        aria-label={
                                                            showPassword
                                                                ? t(
                                                                      "hide-password",
                                                                  )
                                                                : t(
                                                                      "show-password",
                                                                  )
                                                        }
                                                        onClick={() =>
                                                            setShowPassword(
                                                                !showPassword,
                                                            )
                                                        }
                                                        className="-mr-2 flex size-10 flex-shrink-0 items-center justify-center rounded-full text-ink-secondary transition-colors active:bg-ground"
                                                    >
                                                        {showPassword ? (
                                                            <i className="icon-[lucide--eye-off] size-4" />
                                                        ) : (
                                                            <i className="icon-[lucide--eye] size-4" />
                                                        )}
                                                    </button>
                                                </span>
                                            </FieldRow>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="proxy"
                                        render={({ field }) => (
                                            <FieldRow
                                                label={t("proxy-url")}
                                                optional
                                                optionalLabel={t(
                                                    "login-optional",
                                                )}
                                            >
                                                <span className="flex min-w-0 flex-1 items-center">
                                                    <input
                                                        {...field}
                                                        className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none"
                                                    />
                                                    {/* 问号改为打开应用内说明抽屉（原来跳出应用去博客），
                                                    热区同眼睛按钮 40×40 */}
                                                    <button
                                                        type="button"
                                                        data-proxy-help
                                                        aria-label={t(
                                                            "proxy-help-title",
                                                        )}
                                                        onClick={() =>
                                                            showProxyHelp()
                                                        }
                                                        className="-mr-2 flex size-10 flex-shrink-0 items-center justify-center rounded-full text-ink-secondary transition-colors active:bg-ground"
                                                    >
                                                        <i className="icon-[lucide--circle-help] size-4" />
                                                    </button>
                                                </span>
                                            </FieldRow>
                                        )}
                                    />
                                </div>
                            </div>
                            {/* 测试连接：主流做法是品牌色文字链，只校验不落库 */}
                            <div className="mt-7 flex justify-center">
                                <button
                                    type="button"
                                    disabled={testing}
                                    onClick={() => {
                                        form.handleSubmit(onTest)();
                                    }}
                                    className="text-[14px] text-brand transition-opacity disabled:opacity-60"
                                >
                                    {t("login-test-connection")}
                                </button>
                            </div>
                        </Form>
                        <ProxyHelpProvider />
                    </div>
                </div>
                {/* 只留一颗确认按钮，作为列的兄弟节点钉在屏幕底部；
                    内容超出一屏时随内容排在末尾 */}
                <div className="mx-auto w-full max-w-[420px] px-3 pb-[calc(var(--safe-area-inset-bottom)+20px)] pt-2">
                    <button
                        type="button"
                        className={`h-[54px]! w-full ${BTN_PRIMARY}`}
                        disabled={checking}
                        onClick={() => {
                            form.handleSubmit(onSubmit)();
                        }}
                    >
                        {t("confirm")}
                    </button>
                </div>
            </div>
        </>
    );
};

export const [WebDAVAuthProvider, showWebDAVAuth] = createConfirmProvider(
    LoadingForm,
    {
        dialogTitle: "WebDAV",
        routePath: "/login/webdav",
        dialogModalClose: true,
    },
);
