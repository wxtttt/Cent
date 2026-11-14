import type { ReactNode } from "react";
import { cn } from "@/utils";

/**
 * 家小满式票券卡：对角渐变底 + 中部打孔虚线（两侧半圆缺口）+
 * 顶部和纸胶带 + 柔边扇形装饰角 + 可选吉祥物探头。
 *
 * APK 里每个 tab 的统计卡渐变与装饰角并不相同（1080×2340 原图逐点取样）：
 * 记账暖米起点在左下、右上淡黄 / 右下淡绿；知物与财富整体镜像，暖米起点在
 * 右下、左上淡黄 / 左下淡绿；首页今日总结纯奶白无扇形；有期是右下淡黄 +
 * 卡顶中央淡绿。故用 variant 选择卡底渐变与角落位置，色值统一由 index.css
 * 的 --dp-* 令牌提供，暗色主题自动切换。
 *
 * 吉祥物的大小、水平位置、叠放也按 tab 区分（APK 原图 1080→393 CSS px 折算）：
 * - 首页今日总结卡是唯一「压在卡片上」的：完整坐姿立绘约 51×58px，跨在卡片
 *   右上角（中心约卡片宽 89%），卡外露 22px、探入卡内 37px。
 * - 记账/知物/财富/有期都是半身探头图，约 45×46px，切口正好贴卡片顶边，
 *   **不覆盖**卡片；水平位置分别约 50% / 79% / 40% / 68%。
 */
type TicketVariant = "home" | "ledger" | "inventory" | "wealth" | "todo";

/** 圆形元素圆心即 radial-gradient 圆心，靠定位把圆心放到卡片指定位置 */
const VARIANTS: Record<
    TicketVariant,
    {
        surface: string;
        yellow: string;
        green: string;
        /** 猫容器：anchor = 水平位置 + 相对卡顶偏移，height = 立绘框高 */
        mascot: { anchor: string; height: string };
    }
> = {
    home: {
        surface: "var(--dp-gradient-ticket-plain)",
        yellow: "",
        green: "",
        mascot: {
            anchor: "left-[89%] -translate-x-1/2 -top-[26px]",
            height: "h-[64px]",
        },
    },
    ledger: {
        surface: "var(--dp-gradient-ticket-ledger)",
        yellow: "-right-20 -top-20 size-40",
        green: "-bottom-12 -right-12 size-24",
        mascot: {
            anchor: "left-1/2 -translate-x-1/2 -top-[54px]",
            height: "h-[54px]",
        },
    },
    inventory: {
        surface: "var(--dp-gradient-ticket-inventory)",
        yellow: "-left-20 -top-20 size-40",
        green: "-bottom-12 -left-12 size-24",
        mascot: {
            anchor: "left-[79%] -translate-x-1/2 -top-[54px]",
            height: "h-[54px]",
        },
    },
    wealth: {
        surface: "var(--dp-gradient-ticket-wealth)",
        yellow: "-left-20 -top-20 size-40",
        green: "-bottom-12 -left-12 size-24",
        mascot: {
            anchor: "left-[40%] -translate-x-1/2 -top-[52px]",
            height: "h-[52px]",
        },
    },
    todo: {
        surface: "var(--dp-gradient-ticket-plain)",
        yellow: "-bottom-20 -right-20 size-40",
        green: "-top-12 left-1/2 -translate-x-1/2 size-24",
        mascot: {
            anchor: "left-[68%] -translate-x-1/2 -top-[54px]",
            height: "h-[54px]",
        },
    },
};

/** 单颗四角芒星（APK 1080×2340 逐点取样）：凹边四角星而非 lucide 的多星簇。
    尺寸与相对卡片位置实测：右上约 9.5px、中心距卡右 17px / 卡顶 10px；
    左下约 7px、中心距卡左 16px / 卡底 9px。 */
function CornerStar({ className }: { className?: string }) {
    return (
        <svg
            aria-hidden
            role="presentation"
            viewBox="0 0 24 24"
            className={cn("pointer-events-none text-ticket-star", className)}
        >
            <path
                d="M12 0 C12.9 6.5 17.5 11.1 24 12 C17.5 12.9 12.9 17.5 12 24 C11.1 17.5 6.5 12.9 0 12 C6.5 11.1 11.1 6.5 12 0 Z"
                fill="currentColor"
            />
        </svg>
    );
}

export default function TicketCard({
    top,
    bottom,
    mascot,
    tape = true,
    decorations = true,
    divider = true,
    variant = "ledger",
    className,
    topClassName,
    bottomClassName,
}: {
    /** 打孔虚线上方内容 */
    top?: ReactNode;
    /** 打孔虚线下方内容 */
    bottom?: ReactNode;
    /** 吉祥物立绘；请用 h-full w-auto 让尺寸交给 variant 统一控制 */
    mascot?: ReactNode;
    /** 是否显示顶部胶带贴纸 */
    tape?: boolean;
    /** 是否显示扇形装饰角与星形；首页今日总结卡为 false */
    decorations?: boolean;
    /** 是否显示中部打孔虚线；APK 首页今日总结卡没有这条带 */
    divider?: boolean;
    /** 按 tab 选择卡底渐变与装饰角布局 */
    variant?: TicketVariant;
    className?: string;
    topClassName?: string;
    bottomClassName?: string;
}) {
    const layout = VARIANTS[variant];
    const showCorners = decorations && variant !== "home";

    return (
        <div className={cn("relative", className)}>
            <div
                className="relative overflow-hidden rounded-[24px] border border-rule shadow-card"
                style={{ background: layout.surface }}
            >
                {/* 柔边扇形装饰角：角落实色、向内渐隐，弧边由卡片圆角裁出 */}
                {showCorners && (
                    <>
                        <div
                            aria-hidden
                            className={cn(
                                "pointer-events-none absolute rounded-full",
                                layout.yellow,
                            )}
                            style={{
                                background: "var(--dp-ticket-yellow-corner)",
                            }}
                        />
                        <div
                            aria-hidden
                            className={cn(
                                "pointer-events-none absolute rounded-full",
                                layout.green,
                            )}
                            style={{
                                background: "var(--dp-ticket-green-corner)",
                            }}
                        />
                        <CornerStar className="absolute right-3 top-[5px] size-2.5" />
                        <CornerStar className="absolute bottom-1.5 left-3 size-[7px]" />
                    </>
                )}
                <div className={cn("relative px-4 pt-6", topClassName)}>
                    {top}
                </div>

                {divider && (
                    <div
                        aria-hidden
                        className="relative my-2.5 flex items-center px-4"
                    >
                        <span className="absolute -left-[9px] size-[18px] rounded-full bg-ground" />
                        <span className="flex-1 border-t border-dashed border-rule" />
                        <span className="absolute -right-[9px] size-[18px] rounded-full bg-ground" />
                    </div>
                )}

                <div className={cn("relative px-4 pb-4", bottomClassName)}>
                    {bottom}
                </div>
            </div>
            {/* 和纸胶带：半透明浅黄、骑跨在卡片上沿。
                形状按 APK 原图倾斜校正后逐行取轮廓：上下边缘是两条平直直线
                （校正后波动 < 1px），左右两端各有 2 个 V 形凹口、中间夹一个尖角；
                撕口只在两端，上下缘不加锯齿。
                尺寸按 APK 实测折算：原图胶带 181×58px、卡片宽 964px（三页一致），
                换算到 360px 卡片即约 68×21px，左端距卡片左沿约 23px；
                路径端点铺满 viewBox 后需把框收到 66×17px，旋转后包围盒才约 67×22px。
                放在卡片之后渲染，但不设 z-index 以免盖住 confirm / 登录弹层。
                折痕是卡顶边透过半透明胶带显出的底色分界——它是屏幕水平的，
                故在 SVG 内按 -4° 旋转的反向补偿画成斜线，旋转后正好水平。 */}
            {tape && (
                <svg
                    aria-hidden
                    role="presentation"
                    viewBox="0 0 180 57"
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute -top-[9px] left-5 h-[17px] w-[66px] -rotate-4"
                >
                    <path
                        d="M0 0 L180 0 L171 14 L178 30 L170 43 L180 57 L0 57 L10 43 L2 30 L9 14 Z"
                        fill="var(--dp-ticket-tape)"
                    />
                    <path
                        d="M8 21 L172 36"
                        fill="none"
                        stroke="var(--dp-ticket-tape-crease)"
                        strokeWidth="2.5"
                    />
                </svg>
            )}
            {mascot && (
                // 在卡片主体之后渲染，absolute 元素按 DOM 顺序绘制在上层：
                // home 的完整立绘因此压进卡片内；其余 variant 的探头图底边
                // 正好贴合卡片顶边，不会覆盖卡片。不设 z-index，高 z 值会
                // 盖过 confirm 弹层（其基准 z 只有 4）
                <div
                    aria-hidden
                    className={cn(
                        // w-max：绝对定位元素默认 shrink-to-fit，靠右的猫会被
                        // 右侧剩余宽度压扁（left-[89%] 时仅剩约 40px），必须让
                        // 宽度按内容算，img 才能保持正方形
                        "pointer-events-none absolute w-max",
                        layout.mascot.anchor,
                        layout.mascot.height,
                    )}
                >
                    {mascot}
                </div>
            )}
        </div>
    );
}
