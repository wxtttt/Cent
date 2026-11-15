import {
    type DetailedHTMLProps,
    type InputHTMLAttributes,
    type ReactNode,
    useEffect,
    useRef,
} from "react";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/button-styles";
import { useIntl } from "@/locale";
import createConfirmProvider from "../confirm";
import IOSUnscrolledInput from "../input";

// 简易对话框，调用后弹出对话框，包含取消和确定按钮，点击取消将会reject promise，点击确认则会resolve，值取决于对话框中input的值
type PromptOptions = {
    title: ReactNode;
    // 可以指定input的属性，如果input为undefined，则不会显示input
    input?: DetailedHTMLProps<
        InputHTMLAttributes<HTMLInputElement>,
        HTMLInputElement
    >;
    onConfirm?: (v: HTMLInputElement | null) => Promise<void> | void;
    cancellable?: boolean;
};

const PromptForm = ({
    edit,
    onConfirm,
    onCancel,
}: {
    edit?: PromptOptions;
    onCancel?: () => void;
    onConfirm?: (v?: unknown) => void;
}) => {
    const t = useIntl();
    const inputRef = useRef<HTMLInputElement>(null);
    const autoFocus = edit?.input?.autoFocus !== false;
    useEffect(() => {
        if (autoFocus) {
            inputRef.current?.focus();
        }
    }, [autoFocus]);
    return (
        // 全应用共用的确认 prompt：按钮走 button-styles 的 48px 双态常量（r20 约定），
        // 取消/确认等宽成对，样式与登录页等弹层入口保持一致
        <div className="flex w-full flex-col p-5">
            <div className="min-w-0 text-[16px] font-semibold leading-relaxed text-ink">
                {edit?.title}
            </div>
            {edit?.input && (
                <IOSUnscrolledInput
                    ref={inputRef}
                    className="mt-3 flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-[15px] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    {...edit.input}
                />
            )}
            <div className="mt-4 flex w-full gap-3">
                {edit?.cancellable !== false && (
                    <button
                        type="button"
                        onClick={() => {
                            onCancel?.();
                        }}
                        className={`${BTN_SECONDARY} flex-1`}
                    >
                        {t("cancel")}
                    </button>
                )}
                <button
                    type="button"
                    className={`${BTN_PRIMARY} flex-1`}
                    onClick={async () => {
                        const value = await edit?.onConfirm?.(inputRef.current);
                        onConfirm?.(value ?? inputRef.current?.value);
                    }}
                >
                    {t("confirm")}
                </button>
            </div>
        </div>
    );
};

export const [PromptProvider, showPrompt] = createConfirmProvider(PromptForm, {
    dialogTitle: "prompt",
    dialogModalClose: false,
    contentClassName: "w-[360px] h-fit",
    fade: true,
});

export const prompt = (v: PromptOptions) => {
    return showPrompt(v);
};
