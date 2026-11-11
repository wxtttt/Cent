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
import CategoryIcon from "./icon";
import { CATEGORY_ILLUSTRATIONS } from "./illustrations";

const createFormSchema = (t: any) =>
    z.object({
        name: z.string().check(
            z.minLength(1, { message: t("category-name-placeholder") }),
            z.maxLength(50, {
                message: t("max-name-length-limit", { n: 50 }),
            }),
        ),
        parent: z.optional(z.string()),
    });

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
    const namePlaceholder = t("category-name-placeholder");
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
        },
    });
    const { expenses, incomes, update, add } = useCategory();
    const parentOptions = (
        category.type === "expense" ? expenses : incomes
    ).filter((p) => p.id !== edit?.id);
    // 一级分组固定，不再允许把分类挂到顶层
    const resolveParent = (value?: string) =>
        value && parentOptions.some((p) => p.id === value)
            ? value
            : parentOptions[0]?.id;

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        const parent = resolveParent(data.parent);
        if (edit === undefined || edit.id === undefined) {
            const newId = await add({ ...category, ...data, parent });
            onConfirm?.(newId);
            return;
        }
        const formattedData = { ...data, parent, icon: category.icon };
        const unchanged =
            edit.icon === formattedData.icon &&
            edit.name === formattedData.name &&
            edit.parent === formattedData.parent;
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
                                        <div className="relative flex h-9 w-full items-center gap-2">
                                            <span
                                                aria-hidden
                                                className="invisible max-w-full truncate whitespace-pre text-[14px]"
                                            >
                                                {field.value || namePlaceholder}
                                            </span>
                                            <i className="icon-[lucide--pencil] pointer-events-none relative z-10 size-3 shrink-0 text-[#c4c4c9]" />
                                            <Input
                                                type="text"
                                                maxLength={50}
                                                placeholder={namePlaceholder}
                                                className="absolute inset-0 h-9 border-0 bg-transparent px-0 text-[14px] font-normal text-ink shadow-none placeholder:text-[#b9b9be] focus-visible:ring-0"
                                                {...field}
                                            />
                                        </div>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <div className="mt-2 flex h-8 w-fit items-center rounded-lg bg-panel px-2.5 text-[12px] text-ink-secondary">
                            <FormField
                                control={form.control}
                                name="parent"
                                render={({ field }) => {
                                    const value =
                                        resolveParent(field.value) ?? "";
                                    return (
                                        <FormItem className="flex h-full min-w-0 items-center gap-1.5 space-y-0">
                                            <span className="shrink-0">
                                                {t("category-parent")}
                                            </span>
                                            <FormControl>
                                                <Select
                                                    value={value}
                                                    onValueChange={
                                                        field.onChange
                                                    }
                                                >
                                                    <SelectTrigger className="h-7 w-fit min-w-0 gap-1 rounded-md border-0 bg-transparent px-0 text-[12px] font-normal text-ink shadow-none [&_svg]:size-3 [&_svg]:opacity-60 focus-visible:ring-0">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent
                                                        align="start"
                                                        className="rounded-xl border-rule bg-panel p-1 shadow-lg"
                                                    >
                                                        {parentOptions.map(
                                                            (p) => (
                                                                <SelectItem
                                                                    key={p.id}
                                                                    value={p.id}
                                                                >
                                                                    {p.name}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                        </FormItem>
                                    );
                                }}
                            />
                        </div>
                    </div>
                </div>

                {!isGroup && (
                    <>
                        <div className="px-6 pb-3">
                            <span className="text-[13px] text-[#71717a]">
                                {t("category-icon-label")}
                            </span>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hidden px-6">
                            <div className="grid grid-cols-5 gap-3 pb-4">
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
