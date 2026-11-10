/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
import { useMemo } from "react";
import type { BillTag } from "@/components/bill-tag/type";
import useCategory from "@/hooks/use-category";
import { useCreators } from "@/hooks/use-creator";
import { useCurrency } from "@/hooks/use-currency";
import { useTag } from "@/hooks/use-tag";
import { amountToNumber } from "@/ledger/bill";
import type { Bill, BillCategory } from "@/ledger/type";
import { useIntl } from "@/locale";
import { useBookStore } from "@/store/book";
import { useUserStore } from "@/store/user";
import { cn } from "@/utils";
import { denseTime } from "@/utils/time";
import CategoryIcon from "../category/icon";
import SmartImage from "../image";
import Money from "../money";

interface BaseBillItemProps {
    /** 已解析好（且已做 i18n）的分类 */
    category?: Pick<BillCategory, "icon" | "name">;
    /** 已解析好的标签列表 */
    tags?: Pick<BillTag, "id" | "name">[];
    /** 创建者展示文案（"我"/创建者名/unknown-user，由调用方决定） */
    creatorLabel: string;
    creatorAvatar?: string;
    /** 非本位币时传入的目标币种 */
    targetCurrency?: { symbol: string };
    /** 本位币符号 */
    currencySymbol?: string;
    /** 所属账本，作为卡片底部的归属信息 */
    bookName?: string;
    /** 账单基础字段 */
    type: Bill["type"];
    amount: Bill["amount"];
    time: Bill["time"];
    comment?: Bill["comment"];
    images?: Bill["images"];
    currencyAmount?: number;
    onClick?: () => void;
    className?: string;
    showTime?: boolean;
    showAssets?: boolean;
}

/** 纯展示组件，接收已解析好的数据，不依赖任何 store hook */
export function BaseBillItem({
    category,
    tags,
    creatorLabel,
    creatorAvatar,
    targetCurrency,
    currencySymbol,
    bookName,
    type,
    amount,
    time,
    comment,
    images,
    currencyAmount,
    onClick,
    className,
    showTime,
    showAssets,
}: BaseBillItemProps) {
    return (
        <button
            type="button"
            className={cn(
                "bill-item w-full cursor-pointer rounded-3xl border border-rule bg-panel p-4 text-left shadow-panel transition-[background-color,transform] duration-[var(--dp-motion-interaction)] ease-[var(--dp-motion-easing)] hover:bg-ground-muted/40 active:scale-[0.995]",
                className,
            )}
            data-bill-tags={tags?.map((v) => v.name).join(" ")}
            onClick={onClick}
        >
            <div className="flex items-start gap-3">
                <div className="flex size-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                    {category?.icon && <CategoryIcon icon={category.icon} />}
                </div>
                <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="truncate text-base font-semibold">
                            {category ? category.name : ""}
                        </div>
                        {showTime && (
                            <div className="mt-0.5 text-xs text-ink-secondary">
                                {denseTime(time)}
                            </div>
                        )}
                    </div>
                    <div
                        className={cn(
                            "flex flex-shrink-0 flex-col items-end font-display text-lg font-bold tabular-nums",
                            type === "expense"
                                ? "text-semantic-expense"
                                : type === "income"
                                  ? "text-semantic-income"
                                  : "",
                        )}
                    >
                        <div className="flex items-baseline">
                            <span>
                                {type === "income" ? "+" : "-"}
                                {currencySymbol}
                            </span>
                            <Money value={amountToNumber(amount)} accurate />
                        </div>
                        {targetCurrency && currencyAmount !== undefined && (
                            <div className="text-xs font-normal text-ink-secondary">
                                {targetCurrency.symbol}
                                <Money
                                    value={amountToNumber(currencyAmount)}
                                    accurate
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {comment && (
                <div className="mt-2 flex items-start gap-1.5 text-sm text-ink-secondary">
                    <i className="icon-[lucide--message-square] mt-0.5 size-4 flex-shrink-0"></i>
                    <span className="line-clamp-2">{comment}</span>
                </div>
            )}

            {showAssets && images && images.length > 0 && (
                <div className="mt-2 flex gap-2">
                    {images.map((img, i) => (
                        <SmartImage
                            key={i}
                            source={img}
                            alt=""
                            className="size-10 rounded-lg object-cover data-[state=loading]:animate-pulse bg-primary/10"
                        />
                    ))}
                </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-rule/60 pt-2 text-xs text-ink-secondary">
                <div className="flex min-w-0 items-center gap-1.5">
                    <i
                        className={cn(
                            "size-4 flex-shrink-0",
                            tags && tags.length > 0
                                ? "icon-[lucide--tag]"
                                : "icon-[lucide--book]",
                        )}
                    ></i>
                    <span className="truncate">
                        {tags && tags.length > 0
                            ? tags.map((tag) => tag.name).join(" · ")
                            : bookName}
                    </span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5">
                    {creatorAvatar ? (
                        <img
                            src={creatorAvatar}
                            alt=""
                            className="size-5 rounded-full object-cover"
                        />
                    ) : (
                        <i className="icon-[lucide--circle-user] size-4"></i>
                    )}
                    <span className="max-w-[80px] truncate">
                        {creatorLabel}
                    </span>
                </div>
            </div>
        </button>
    );
}

interface BillItemProps {
    bill: Bill;
    onClick?: () => void;
    className?: string;
    showTime?: boolean;
    showAssets?: boolean;
}

export default function BillItem({
    bill,
    className,
    onClick,
    showTime,
    showAssets,
}: BillItemProps) {
    const t = useIntl();
    const { categories } = useCategory();
    const { tags: allTags } = useTag();
    const category = useMemo(
        () => categories.find((c) => c.id === bill.categoryId),
        [bill.categoryId, categories],
    );

    const { id: selfId } = useUserStore();
    const creators = useCreators();
    const creator = creators.find((c) => c.id === bill.creatorId);
    const isMe = creator?.id === selfId;
    const tags = bill.tagIds
        ?.map((id) => allTags.find((t) => t.id === id))
        .filter((v) => v !== undefined);

    const bookName = useBookStore((state) => {
        return state.books.find((book) => book.id === state.currentBookId)
            ?.name;
    });

    const { baseCurrency, allCurrencies } = useCurrency();
    const currency =
        bill.currency?.target === baseCurrency.id
            ? undefined
            : allCurrencies.find((c) => c.id === bill.currency?.target);

    return (
        <BaseBillItem
            category={category}
            tags={tags}
            creatorLabel={isMe ? t("me") : (creator?.name ?? "unknown-user")}
            creatorAvatar={creator?.avatar_url}
            targetCurrency={currency}
            currencyAmount={bill.currency?.amount}
            currencySymbol={baseCurrency.symbol}
            bookName={bookName}
            type={bill.type}
            amount={bill.amount}
            time={bill.time}
            comment={bill.comment}
            images={bill.images}
            onClick={onClick}
            className={className}
            showTime={showTime}
            showAssets={showAssets}
        />
    );
}
