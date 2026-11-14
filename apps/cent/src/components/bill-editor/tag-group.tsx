/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */
import { type ReactNode, useCallback, useState } from "react";
import { type BillTagGroupDetail, useTag } from "@/hooks/use-tag";
import { cn } from "@/utils";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";

function TagTrigger({
    children,
    selected,
    color,
    onClick,
}: {
    children?: ReactNode;
    selected?: boolean;
    color?: string;
    onClick?: () => void;
}) {
    return (
        <div
            onPointerDown={(e) => {
                e.preventDefault();
            }}
            onClick={onClick}
            className={cn(
                "flex h-9 flex-shrink-0 items-center justify-center gap-1.5 bg-panel px-3 rounded-full text-sm cursor-pointer with-tag-color",
                `tag-${color}`,
            )}
        >
            <div
                className={cn(
                    "w-3 h-3 bg-[var(--current-tag-color)] rounded-full",
                    selected ? "" : "opacity-40",
                )}
            ></div>
            <div
                className={`${selected ? "text-[var(--current-tag-color)]" : "opacity-40"}`}
            >
                {children}
            </div>
        </div>
    );
}

function TagGroup({
    selected,
    group,
    onSelectChange,
}: {
    selected: string[];
    group: BillTagGroupDetail;
    onSelectChange: (v: string[], extra?: { preferCurrency?: string }) => void;
}) {
    const groupSelected = group.tags.filter((tag) => selected.includes(tag.id));
    const formatValue =
        groupSelected.length === 0
            ? group.name
            : groupSelected.length === 1
              ? `#${groupSelected[0].name}`
              : `#${groupSelected[0].name} +${groupSelected.length - 1}`;

    const [open, setOpen] = useState(false);
    if (group.tagIds?.length === 1) {
        const singleTagId = group.tagIds[0];
        const isSingleSelected = groupSelected.some(
            (v) => v.id === singleTagId,
        );
        return (
            <TagTrigger
                color={group.color}
                selected={isSingleSelected}
                onClick={() => {
                    if (isSingleSelected) {
                        onSelectChange(
                            selected.filter((v) => v !== singleTagId),
                        );
                    } else {
                        // 特殊段硬单选：先清掉同段其它标签
                        onSelectChange(
                            group.singleSelect
                                ? [
                                      ...selected.filter(
                                          (v) => !group.tagIds?.includes(v),
                                      ),
                                      singleTagId,
                                  ]
                                : [...selected, singleTagId],
                        );
                    }
                }}
            >
                {formatValue}
            </TagTrigger>
        );
    }
    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger className="flex-shrink-0">
                <TagTrigger
                    color={group.color}
                    selected={groupSelected.length > 0}
                    onClick={() => setOpen(!open)}
                >
                    {formatValue}
                </TagTrigger>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                {group.tags.map((tag) => (
                    <DropdownMenuCheckboxItem
                        key={tag.id}
                        checked={selected.includes(tag.id)}
                        onCheckedChange={(checked) => {
                            if (checked) {
                                onSelectChange(
                                    group.singleSelect
                                        ? [
                                              ...selected.filter(
                                                  (v) =>
                                                      !group.tagIds?.includes(
                                                          v,
                                                      ),
                                              ),
                                              tag.id,
                                          ]
                                        : [...selected, tag.id],
                                );
                                return;
                            }
                            onSelectChange(
                                selected.filter((v) => v !== tag.id),
                            );
                        }}
                    >
                        #{tag.name}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/** 固定「特殊 / 普通」两段；特殊段单选，避免一笔账单被两条特殊预算各计一次 */
export default function TagGroupSelector({
    selectedTags,
    onSelectChange: onChange,
    isCreate,
}: {
    selectedTags?: string[];
    onSelectChange: (v: string[], extra?: { preferCurrency?: string }) => void;
    isCreate: boolean;
}) {
    void isCreate;
    const { grouped } = useTag();
    const onSelectChange: typeof onChange = useCallback(
        (v: string[], ...args) => onChange(Array.from(new Set(v)), ...args),
        [onChange],
    );

    return (
        <>
            {grouped
                .filter((group) => group.tags.length > 0)
                .map((group) => (
                    <TagGroup
                        key={group.id}
                        group={group}
                        selected={selectedTags ?? []}
                        onSelectChange={onSelectChange}
                    />
                ))}
        </>
    );
}
