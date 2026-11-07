import type { ReactNode } from "react";
import xiaonuan from "@/assets/mascots/01-home-xiaonuan.webp";
import xiaoji from "@/assets/mascots/02-bookkeeping-xiaoji.webp";
import xiaojiPeek from "@/assets/mascots/02-bookkeeping-xiaoji-peek.webp";
import xiaoying from "@/assets/mascots/03-wealth-xiaoying.webp";
import xiaoyingPeek from "@/assets/mascots/03-wealth-xiaoying-peek.webp";
import xiaoyu from "@/assets/mascots/04-medical-xiaoyu.webp";
import xiaoyuPeek from "@/assets/mascots/04-medical-xiaoyu-peek.webp";
import xiaozhi from "@/assets/mascots/05-inventory-xiaozhi.webp";
import xiaozhiPeek from "@/assets/mascots/05-inventory-xiaozhi-peek.webp";
import xiaoqi from "@/assets/mascots/06-todo-xiaoqi.webp";
import xiaoqiPeek from "@/assets/mascots/06-todo-xiaoqi-peek.webp";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";

/** 各业务域的吉祥物立绘（源自家小满素材）。 */
export const MASCOTS = {
    home: xiaonuan,
    bookkeeping: xiaoji,
    wealth: xiaoying,
    medical: xiaoyu,
    inventory: xiaozhi,
    todo: xiaoqi,
} as const;

/** 探头姿态，用于页面底部装饰；home 无探头版，回落到立绘。 */
const MASCOT_PEEKS = {
    home: xiaonuan,
    bookkeeping: xiaojiPeek,
    wealth: xiaoyingPeek,
    medical: xiaoyuPeek,
    inventory: xiaozhiPeek,
    todo: xiaoqiPeek,
} as const;

export type MascotKey = keyof typeof MASCOTS;

/** 底部探头装饰图，不承载信息。 */
export function MascotPeek({
    mascot,
    className,
}: {
    mascot: MascotKey;
    className?: string;
}) {
    return (
        <img
            src={MASCOT_PEEKS[mascot]}
            alt=""
            draggable={false}
            loading="lazy"
            className={cn("pointer-events-none select-none", className)}
        />
    );
}

/**
 * 通用空态：柔光圆底 + 吉祥物 + 文案 + 可选行动按钮。
 * 替代各页面原先的纯虚线文字空态。
 */
export default function EmptyState({
    mascot = "bookkeeping",
    text,
    action,
    className,
    compact = false,
}: {
    mascot?: MascotKey;
    text: ReactNode;
    action?: { label: ReactNode; onClick: () => void };
    className?: string;
    compact?: boolean;
}) {
    return (
        <div
            className={cn(
                "rounded-card border border-dashed border-rule bg-panel/60 text-center",
                compact ? "py-6" : "py-10",
                className,
            )}
        >
            <div className="relative mx-auto size-24">
                <div
                    aria-hidden
                    className="absolute inset-1 rounded-full bg-brand/10 blur-lg"
                />
                <img
                    src={MASCOTS[mascot]}
                    alt=""
                    draggable={false}
                    loading="lazy"
                    className="relative size-full object-contain"
                />
            </div>
            <p
                className={cn(
                    "text-sm text-ink-secondary",
                    compact ? "mt-2" : "mt-3",
                )}
            >
                {text}
            </p>
            {action && (
                <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={action.onClick}
                >
                    {action.label}
                </Button>
            )}
        </div>
    );
}
