import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { saveS3Account } from "@/api/endpoints/s3/account";
import { BTN_PRIMARY } from "@/components/button-styles";
import { FieldRow } from "@/components/login/field-row";
import { useIntl } from "@/locale";
import { checkS3Config } from "@/tidal/s3";
import createConfirmProvider from "../confirm";
import { Checkbox } from "../ui/checkbox";
import { Form, FormField } from "../ui/form";
import { S3HelpProvider, showS3Help } from "./login-s3-help";

export type S3Edit = {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    baseDir?: string;
    forcePathStyle?: boolean;
    sessionToken?: string;
    customUserName?: string;
};

type LoadingState = Partial<S3Edit> & {
    check?: (v: S3Edit) => Promise<unknown>;
};

export const createFormSchema = (t: any) =>
    z.object({
        endpoint: z
            .string()
            .check(z.minLength(1, { message: t("s3-endpoint-required") })),
        region: z
            .string()
            .check(z.minLength(1, { message: t("s3-region-required") })),
        accessKeyId: z
            .string()
            .check(z.minLength(1, { message: t("s3-access-key-required") })),
        secretAccessKey: z
            .string()
            .check(z.minLength(1, { message: t("s3-secret-key-required") })),
        bucket: z
            .string()
            .check(z.minLength(1, { message: t("s3-bucket-required") })),
        baseDir: z.optional(z.string()),
        forcePathStyle: z.optional(z.boolean()),
        sessionToken: z.optional(z.string()),
    });

// 常用 S3 服务商：点击自动填入标准 Endpoint（区域按需再改）
const S3_PRESETS = [
    { label: "AWS", url: "https://s3.amazonaws.com" },
    { label: "阿里云 OSS", url: "https://oss-cn-hangzhou.aliyuncs.com" },
    { label: "腾讯云 COS", url: "https://cos.ap-guangzhou.myqcloud.com" },
];

/**
 * 登录方式二级路由页（/login/s3）：结构对齐登录页——无标题栏、只放品牌图标，
 * 行式下划线输入（左标签 + 右输入 + 底部细线），「测试连接」为品牌色文字链；
 * 底部只留一颗 54px 确认按钮（返回走左上角圆钮，用户口径去掉取消）。
 * 内容不足一屏时垂直居中，超出一屏时自然滚动（按钮随内容排在末尾）。
 * 外层补 dp-drawer-surface：亮色下与登录页同一套中性灰白底（#f4f4f4）。
 * 路由页拿不到 edit 注入，表单自持完成链——zod 校验、S3 连接检查、
 * 写入端点配置并刷新都在本页完成。所有字符串字段的 defaultValues 必须给空串：
 * 缺了会是 undefined，zod 的类型校验（Invalid input…）会抢在必填校验之前触发。
 * 用户身份不再在这里填昵称，改由登录后的「选择账本与用户」页决定。
 */
const LoadingForm = ({ onCancel }: { onCancel?: () => void }) => {
    const t = useIntl();
    const formSchema = useMemo(() => createFormSchema(t), [t]);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            endpoint: "",
            region: "",
            accessKeyId: "",
            secretAccessKey: "",
            bucket: "",
            baseDir: "cent",
            forcePathStyle: false,
            sessionToken: "",
        },
    });
    const [checking, setChecking] = useState(false);
    const [testing, setTesting] = useState(false);
    // 高级选项默认折叠：baseDir / sessionToken / forcePathStyle 是少数派配置，
    // 全展开会把主表单挤到一屏之外（用户口径「能默认折叠起来吗」）
    const [advancedOpen, setAdvancedOpen] = useState(false);
    // Secret Access Key 默认掩码，眼睛按钮切明文（与 WebDAV 密码行同款）
    const [showSecret, setShowSecret] = useState(false);
    // biome 禁止静态字符串 id，勾选行用 useId 关联 label
    const checkboxId = useId();
    const errors = form.formState.errors;
    const checkConnection = async (data: z.infer<typeof formSchema>) => {
        await checkS3Config({
            endpoint: data.endpoint,
            region: data.region,
            accessKeyId: data.accessKeyId,
            secretAccessKey: data.secretAccessKey,
            bucket: data.bucket,
            forcePathStyle: data.forcePathStyle,
            sessionToken: data.sessionToken,
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
        // 移除末尾的斜杠
        data.endpoint = data.endpoint.replace(/\/$/, "");
        setChecking(true);
        try {
            await checkConnection(data);
            // 校验通过即登录成功：写入端点配置并刷新应用
            saveS3Account(data as S3Edit);
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
                        {/* 提示行右侧的「?」：整页唯一解释入口，打开应用内说明抽屉
                        （以前 S3 页没有任何说明，只能跳出应用看文档） */}
                        <div className="mt-2 flex items-center justify-center gap-0.5 text-[13px] text-ink-secondary/80">
                            <span>{t("login-s3-hint")}</span>
                            <button
                                type="button"
                                data-s3-help
                                aria-label={t("s3-help-open")}
                                onClick={() => showS3Help()}
                                className="-my-2 flex size-10 flex-shrink-0 items-center justify-center rounded-full text-ink-secondary transition-colors active:bg-ground"
                            >
                                <i className="icon-[lucide--circle-help] size-3.5" />
                            </button>
                        </div>
                        <Form {...form}>
                            {/* 常用服务商与字段组包在同一张白卡里（用户口径「类似卡片」） */}
                            <div
                                data-login-form-card
                                className="mx-auto mt-8 w-full max-w-[340px] rounded-[20px] bg-panel px-4 pt-4 pb-2 shadow-[0_1px_6px_rgba(92,62,30,0.06)]"
                            >
                                {/* 常用服务商：点击自动填入标准 Endpoint，整组居中 */}
                                <div className="flex flex-col items-center gap-2.5">
                                    <span className="text-[12px] text-ink-secondary/70">
                                        {t("login-providers")}
                                    </span>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {S3_PRESETS.map((preset) => (
                                            <button
                                                key={preset.label}
                                                type="button"
                                                onClick={() => {
                                                    form.setValue(
                                                        "endpoint",
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
                                        name="endpoint"
                                        render={({ field }) => (
                                            <FieldRow
                                                label={t("s3-endpoint")}
                                                error={errors.endpoint?.message}
                                                required
                                            >
                                                <input
                                                    {...field}
                                                    className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-secondary/70"
                                                    placeholder="https://s3.amazonaws.com"
                                                />
                                            </FieldRow>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="region"
                                        render={({ field }) => (
                                            <FieldRow
                                                label={t("s3-region")}
                                                error={errors.region?.message}
                                                required
                                            >
                                                <input
                                                    {...field}
                                                    className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-secondary/70"
                                                    placeholder="us-east-1"
                                                />
                                            </FieldRow>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="bucket"
                                        render={({ field }) => (
                                            <FieldRow
                                                label={t("s3-bucket")}
                                                error={errors.bucket?.message}
                                                required
                                            >
                                                <input
                                                    {...field}
                                                    className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-secondary/70"
                                                    placeholder="my-bucket"
                                                />
                                            </FieldRow>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="accessKeyId"
                                        render={({ field }) => (
                                            <FieldRow
                                                label={t("s3-access-key-id")}
                                                error={
                                                    errors.accessKeyId?.message
                                                }
                                                required
                                            >
                                                <input
                                                    {...field}
                                                    className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none"
                                                />
                                            </FieldRow>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="secretAccessKey"
                                        render={({ field }) => (
                                            <FieldRow
                                                label={t(
                                                    "s3-secret-access-key",
                                                )}
                                                error={
                                                    errors.secretAccessKey
                                                        ?.message
                                                }
                                                required
                                            >
                                                <span className="flex min-w-0 flex-1 items-center">
                                                    <input
                                                        {...field}
                                                        type={
                                                            showSecret
                                                                ? "text"
                                                                : "password"
                                                        }
                                                        className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none"
                                                    />
                                                    {/* 眼睛热区 40×40（图标 16），-mr-2 抵掉圆钮内边距 */}
                                                    <button
                                                        type="button"
                                                        aria-label={
                                                            showSecret
                                                                ? t(
                                                                      "hide-password",
                                                                  )
                                                                : t(
                                                                      "show-password",
                                                                  )
                                                        }
                                                        onClick={() =>
                                                            setShowSecret(
                                                                !showSecret,
                                                            )
                                                        }
                                                        className="-mr-2 flex size-10 flex-shrink-0 items-center justify-center rounded-full text-ink-secondary transition-colors active:bg-ground"
                                                    >
                                                        {showSecret ? (
                                                            <i className="icon-[lucide--eye-off] size-4" />
                                                        ) : (
                                                            <i className="icon-[lucide--eye] size-4" />
                                                        )}
                                                    </button>
                                                </span>
                                            </FieldRow>
                                        )}
                                    />
                                </div>
                                {/* 高级选项：默认折叠。整行 44px 可点，右侧 chevron 跟随展开态旋转 */}
                                <div className="mt-1">
                                    <button
                                        type="button"
                                        data-advanced-toggle
                                        aria-expanded={advancedOpen}
                                        onClick={() =>
                                            setAdvancedOpen((v) => !v)
                                        }
                                        className="flex h-11 w-full items-center justify-between text-[13px] text-ink-secondary"
                                    >
                                        <span>{t("s3-advanced-options")}</span>
                                        <i
                                            className={`icon-[lucide--chevron-down] size-4 transition-transform ${
                                                advancedOpen ? "rotate-180" : ""
                                            }`}
                                        />
                                    </button>
                                    {advancedOpen && (
                                        <div className="flex w-full flex-col gap-5 pb-3">
                                            <FormField
                                                control={form.control}
                                                name="baseDir"
                                                render={({ field }) => (
                                                    <FieldRow
                                                        label={t("s3-base-dir")}
                                                        optional
                                                        optionalLabel={t(
                                                            "login-optional",
                                                        )}
                                                    >
                                                        <input
                                                            {...field}
                                                            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none"
                                                            placeholder="cent"
                                                        />
                                                    </FieldRow>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="sessionToken"
                                                render={({ field }) => (
                                                    <FieldRow
                                                        label={t(
                                                            "s3-session-token",
                                                        )}
                                                        optional
                                                        optionalLabel={t(
                                                            "login-optional",
                                                        )}
                                                    >
                                                        <input
                                                            {...field}
                                                            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none"
                                                            placeholder={t(
                                                                "s3-session-token-placeholder",
                                                            )}
                                                        />
                                                    </FieldRow>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="forcePathStyle"
                                                render={({ field }) => (
                                                    <span className="flex cursor-pointer items-center gap-2 pb-1 text-[14px] text-ink">
                                                        <Checkbox
                                                            id={checkboxId}
                                                            checked={
                                                                field.value
                                                            }
                                                            onCheckedChange={
                                                                field.onChange
                                                            }
                                                        />
                                                        <label
                                                            htmlFor={checkboxId}
                                                            className="cursor-pointer"
                                                        >
                                                            {t(
                                                                "s3-force-path-style",
                                                            )}
                                                        </label>
                                                    </span>
                                                )}
                                            />
                                        </div>
                                    )}
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
            <S3HelpProvider />
        </>
    );
};

export const [S3AuthProvider, showS3Auth] = createConfirmProvider(LoadingForm, {
    dialogTitle: "S3",
    routePath: "/login/s3",
    dialogModalClose: true,
});
