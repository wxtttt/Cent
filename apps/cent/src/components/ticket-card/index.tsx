import type { ReactNode } from "react";
import { cn } from "@/utils";

/**
 * 家小满式票券卡：白底大圆角卡 + 中部打孔虚线（两侧半圆缺口）+
 * 顶部胶带贴纸 + 角落柔色装饰 + 可选吉祥物探头。
 */
export default function TicketCard({
    top,
    bottom,
    mascot,
    mascotPos = "center",
    tape = true,
    className,
    topClassName,
    bottomClassName,
}: {
    /** 打孔虚线上方内容 */
    top?: ReactNode;
    /** 打孔虚线下方内容 */
    bottom?: ReactNode;
    /** 吉祥物立绘 */
    mascot?: ReactNode;
    /** center：peek 探头图从卡顶中央探出；right：完整坐姿挂在卡右上角（家小满今日总结卡样式） */
    mascotPos?: "center" | "right";
    /** 是否显示顶部胶带贴纸 */
    tape?: boolean;
    className?: string;
    topClassName?: string;
    bottomClassName?: string;
}) {
    return (
        <div className={cn("relative", className)}>
            <div
                className={cn(
                    "relative overflow-hidden rounded-[24px] border border-rule bg-panel shadow-card",
                )}
            >
                {/* 角落柔色装饰 */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute -left-10 -top-10 size-28 rounded-full bg-[#f3e2b8]/50 blur-xl"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute -bottom-12 -right-8 size-32 rounded-full bg-[#dfe6cd]/50 blur-xl"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute right-4 top-3 text-[#e8c66a]"
                >
                    <i className="icon-[mdi--star-four-points-outline] size-3.5" />
                </div>
                {tape && (
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -left-3 top-3 h-6 w-24 -rotate-3 rounded-[3px] bg-[#ead9a8]/60 shadow-sm"
                    />
                )}

                <div className={cn("relative px-5 pt-6", topClassName)}>
                    {top}
                </div>

                <div
                    aria-hidden
                    className="relative my-3 flex items-center px-5"
                >
                    <span className="absolute -left-[11px] size-[22px] rounded-full bg-ground" />
                    <span className="flex-1 border-t border-dashed border-rule" />
                    <span className="absolute -right-[11px] size-[22px] rounded-full bg-ground" />
                </div>

                <div className={cn("relative px-5 pb-5", bottomClassName)}>
                    {bottom}
                </div>
            </div>
            {mascot && (
                // 吉祥物在卡片主体之后渲染：absolute 元素按 DOM 顺序绘制，
                // 这样探入卡内的部分不会被卡片背景盖住；不设 z-index，
                // 高 z 值会盖过 confirm 弹层（其基准 z 只有 4）
                <div
                    aria-hidden
                    className={cn(
                        "pointer-events-none absolute",
                        mascotPos === "right"
                            ? "-top-[22px] right-[14px]"
                            : "-top-[52px] left-1/2 -translate-x-1/2",
                    )}
                >
                    {mascot}
                </div>
            )}
        </div>
    );
}
