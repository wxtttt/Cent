import { useIntl } from "@/locale";

/**
 * 登录页与登录方式二级路由页共用的品牌欢迎区：
 * 居中图标 + 应用名 + 标语，无卡片直接铺在底色上。
 * 尺寸按 402 宽（iPhone 16 Pro）对齐窄屏 360 的视觉比例：80/402 ≈ 72/360 ≈ 0.2，
 * 图标 80px、应用名 24px、标语 14px，比共享令牌大一档、只在登录相关页面使用。
 */
export function WelcomeHero() {
    const t = useIntl();
    return (
        <div className="flex flex-col items-center text-center">
            <img
                src="/icon.png"
                alt=""
                className="size-[80px] flex-shrink-0 rounded-[24px] shadow-[0_4px_16px_rgba(92,62,30,0.12)]"
            />
            <div className="mt-4 text-[24px] font-semibold text-ink">
                {t("APP_NAME")}
            </div>
            <div className="mt-1 text-[14px] text-ink-secondary">
                {t("app-introduce")}
            </div>
        </div>
    );
}
