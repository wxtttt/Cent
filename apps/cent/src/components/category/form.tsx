import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import useCategory from "@/hooks/use-category";
import PopupLayout from "@/layouts/popup-layout";
import type { BillCategory, BillType } from "@/ledger/type";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { Switch } from "../ui/switch";
import CategoryIcon from "./icon";
import { ICONS } from "./icons";
import { CATEGORY_ILLUSTRATIONS } from "./illustrations";

const NO_PARENT = "__noparent";

const createFormSchema = (t: any) =>
    z.object({
        name: z.string().check(
            z.minLength(1, { message: t("category-name-placeholder") }),
            z.maxLength(50, {
                message: t("max-name-length-limit", { n: 50 }),
            }),
        ),
        parent: z.optional(z.string()),
        defaultSelect: z.optional(z.boolean()),
    });

const validSvgText = (text: string) =>
    text.startsWith("<svg") && text.endsWith("</svg>");

type IconTab = "illustrations" | "icons" | "custom";

export default function CategoryEditForm({
    onCancel,
    onConfirm,
    edit,
}: {
    edit?: BillCategory | { id: undefined; parent?: string; type: BillType };
    onCancel?: () => void;
    onConfirm?: (v: any) => void;
}) {
    const t = useIntl();
    const [iconTab, setIconTab] = useState<IconTab>("illustrations");
    const [category, setCategory] = useState<Omit<BillCategory, "id">>(() => {
        if (edit === undefined || edit.id === undefined) {
            return {
                name: "",
                type: edit?.type ?? "expense",
                color: "#fff",
                icon: edit?.parent ? CATEGORY_ILLUSTRATIONS[0] : "",
                ...edit,
            };
        }
        return { ...edit };
    });

    const isGroup = category.parent === undefined;
    const isEdit = edit !== undefined && edit.id !== undefined;
    const title = isEdit
        ? t(isGroup ? "edit-group" : "edit-category")
        : t(
              category.type === "expense"
                  ? "add-expense-category"
                  : "add-income-category",
          );

    const formSchema = useMemo(() => createFormSchema(t), [t]);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: category.name,
            parent: category.parent,
            defaultSelect: category.defaultSelect,
        },
    });
    const { expenses, incomes, update, add } = useCategory();

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        if (edit === undefined || edit.id === undefined) {
            const newId = await add({ ...category, ...data });
            onConfirm?.(newId);
            return;
        }
        const formattedData = { ...data, icon: category.icon };
        const unchanged =
            edit.icon === formattedData.icon &&
            edit.name === formattedData.name &&
            edit.parent === formattedData.parent &&
            edit.defaultSelect === formattedData.defaultSelect;
        if (unchanged) {
            onCancel?.();
            return;
        }
        await update(edit.id, formattedData);
        onConfirm?.(edit.id);
    };

    const selectIcon = (icon: string) => setCategory((v) => ({ ...v, icon }));

    return (
        <Form {...form}>
            <PopupLayout
                handle
                hideBack
                className="h-full overflow-hidden bg-ground"
                onBack={onCancel}
                title={
                    <span className="text-[18px] font-semibold text-ink">
                        {title}
                    </span>
                }
                right={
                    <button
                        type="button"
                        aria-label="close"
                        onClick={onCancel}
                        className="flex size-8 items-center justify-center rounded-full text-[#71717a] hover:bg-black/5 dark:text-ink-secondary"
                    >
                        <i className="icon-[lucide--x] size-5" />
                    </button>
                }
            >
                <div className="flex items-center gap-5 px-6 pb-4 pt-3">
                    {!isGroup && (
                        <span className="flex size-[76px] shrink-0 items-center justify-center rounded-full bg-panel">
                            {category.icon && (
                                <CategoryIcon
                                    icon={category.icon}
                                    className="size-12"
                                />
                            )}
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="sr-only">
                                        {t("category-name")}
                                    </FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-2 border-b border-rule pb-1">
                                            <Input
                                                type="text"
                                                maxLength={50}
                                                placeholder={t(
                                                    "category-name-placeholder",
                                                )}
                                                className="h-10 border-0 bg-transparent px-0 text-[16px] shadow-none focus-visible:ring-0"
                                                {...field}
                                            />
                                            <i className="icon-[lucide--pencil] size-4 shrink-0 text-[#a1a1aa]" />
                                        </div>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <div className="mt-2 flex items-center justify-between gap-2 text-[12px] text-ink-secondary">
                            <FormField
                                control={form.control}
                                name="parent"
                                render={({ field }) => {
                                    const value =
                                        field.value === undefined ||
                                        field.value === null
                                            ? NO_PARENT
                                            : field.value;
                                    return (
                                        <FormItem className="flex min-w-0 items-center gap-1">
                                            <span className="shrink-0">
                                                {t("category-parent")}:
                                            </span>
                                            <FormControl>
                                                <Select
                                                    value={value}
                                                    onValueChange={(v) =>
                                                        field.onChange(
                                                            v === NO_PARENT
                                                                ? undefined
                                                                : v,
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="h-6 min-w-0 border-0 bg-transparent px-0 text-[12px] shadow-none">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent align="start">
                                                        <SelectItem
                                                            value={NO_PARENT}
                                                        >
                                                            {t(
                                                                "no-parent-category",
                                                            )}
                                                        </SelectItem>
                                                        {(category.type ===
                                                        "expense"
                                                            ? expenses
                                                            : incomes
                                                        )
                                                            .filter(
                                                                (p) =>
                                                                    p.id !==
                                                                    edit?.id,
                                                            )
                                                            .map((p) => (
                                                                <SelectItem
                                                                    key={p.id}
                                                                    value={p.id}
                                                                >
                                                                    {p.name}
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                        </FormItem>
                                    );
                                }}
                            />
                            <FormField
                                control={form.control}
                                name="defaultSelect"
                                render={({ field }) => (
                                    <FormItem className="flex shrink-0 items-center gap-1">
                                        <span>
                                            {t("sub-category-default-select")}
                                        </span>
                                        <FormControl>
                                            <Switch
                                                className="scale-75"
                                                checked={Boolean(field.value)}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </div>

                {!isGroup && (
                    <>
                        <div className="flex items-center justify-between px-6 pb-3">
                            <span className="text-[13px] text-[#71717a]">
                                {t("category-icon-label")}
                            </span>
                            <div className="flex items-center gap-0.5 rounded-full bg-panel p-0.5 text-[11px]">
                                {(
                                    [
                                        ["illustrations", "illustrations-tab"],
                                        ["icons", "icons-tab"],
                                        ["custom", "custom-tab"],
                                    ] as const
                                ).map(([value, labelKey]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setIconTab(value)}
                                        className={cn(
                                            "rounded-full px-2.5 py-1 text-ink-secondary",
                                            iconTab === value &&
                                                "bg-ground-muted font-medium text-ink",
                                        )}
                                    >
                                        {t(labelKey)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hidden px-6">
                            {iconTab === "illustrations" && (
                                <div className="grid grid-cols-5 gap-3 pb-4">
                                    <button
                                        type="button"
                                        aria-label="custom"
                                        onClick={() => setIconTab("custom")}
                                        className="flex aspect-square items-center justify-center rounded-full border border-rule bg-panel"
                                    >
                                        <i className="icon-[lucide--plus] size-5 text-[#a1a1aa]" />
                                    </button>
                                    {CATEGORY_ILLUSTRATIONS.map((src) => (
                                        <button
                                            key={src}
                                            type="button"
                                            aria-label="illustration"
                                            onClick={() => selectIcon(src)}
                                            className={cn(
                                                "flex aspect-square items-center justify-center rounded-full border p-1.5",
                                                category.icon === src
                                                    ? "border-brand bg-[#f6e0d2]"
                                                    : "border-transparent bg-panel",
                                            )}
                                        >
                                            <img
                                                src={src}
                                                alt=""
                                                className="size-full object-contain"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                            {iconTab === "icons" && (
                                <div className="grid grid-cols-5 gap-3 pb-4">
                                    {ICONS.flatMap((set) =>
                                        set.icons.map((icon) => (
                                            <button
                                                key={set.labelKey + icon.name}
                                                type="button"
                                                aria-label="icon"
                                                onClick={() =>
                                                    selectIcon(icon.className)
                                                }
                                                className={cn(
                                                    "flex aspect-square items-center justify-center rounded-full border bg-panel p-2",
                                                    category.icon ===
                                                        icon.className
                                                        ? "border-brand bg-[#f6e0d2]"
                                                        : "border-transparent",
                                                )}
                                            >
                                                <i className={icon.className} />
                                            </button>
                                        )),
                                    )}
                                </div>
                            )}
                            {iconTab === "custom" && (
                                <div className="flex flex-col gap-2 pb-4">
                                    <div className="text-[12px] text-ink-secondary">
                                        {t("copy-and-paste-svg-below")}
                                    </div>
                                    <textarea
                                        className="h-32 w-full rounded-lg border border-rule bg-panel p-2 text-[12px]"
                                        placeholder={`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"></svg>`}
                                        onChange={(e) => {
                                            const svgText =
                                                e.currentTarget.value;
                                            if (
                                                svgText &&
                                                validSvgText(svgText)
                                            ) {
                                                selectIcon(svgText);
                                            }
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </>
                )}

                {isGroup && <div className="min-h-0 flex-1" />}

                <div className="px-5 pb-5 pt-3">
                    <button
                        type="button"
                        onClick={() => form.handleSubmit(onSubmit)()}
                        className="h-[52px] w-full rounded-xl bg-brand text-[15px] font-medium text-on-brand"
                    >
                        {t("confirm")}
                    </button>
                </div>
            </PopupLayout>
        </Form>
    );
}
