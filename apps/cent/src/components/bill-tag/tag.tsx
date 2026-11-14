import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { Button } from "../ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
} from "../ui/form";
import { Input } from "../ui/input";
import type { EditTag } from "./type";

export type { EditTag } from "./type";

const createFormSchema = (t: any) =>
    z.object({
        name: z.string().check(
            z.maxLength(50, {
                message: t("max-name-length-limit", { n: 50 }),
            }),
        ),
        kind: z.enum(["normal", "special"]),
    });

export const EditTagForm = ({
    edit,
    onConfirm,
    onCancel,
}: {
    edit?: EditTag;
    onConfirm?: (v: EditTag | "delete") => void;
    onCancel?: () => void;
}) => {
    const t = useIntl();
    const formSchema = useMemo(() => createFormSchema(t), [t]);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: edit?.name ?? "",
            kind: edit?.kind ?? "normal",
        },
    });
    const isCreate = edit?.id === undefined;
    const name = form.watch("name");

    const toSubmit = () => {
        const onSubmit = (data: z.infer<typeof formSchema>) => {
            onConfirm?.({ ...data, id: edit?.id });
        };
        form.handleSubmit(onSubmit)();
    };
    return (
        <Form {...form}>
            <div className="flex max-h-[80dvh] flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3">
                    <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-secondary/40" />
                    <div className="text-center text-[17px] text-ink">
                        {isCreate ? t("add-new-tag") : t("edit-tag")}
                    </div>
                    <div className="mt-5 mb-2 flex flex-col gap-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("tag-name")}</FormLabel>
                                    <FormControl>
                                        <Input {...field} maxLength={50} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="kind"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("tag-kind")}</FormLabel>
                                    <div className="flex gap-2">
                                        {(
                                            [
                                                ["normal", "normal-tags"],
                                                ["special", "special-tags"],
                                            ] as const
                                        ).map(([value, labelKey]) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() =>
                                                    field.onChange(value)
                                                }
                                                className={cn(
                                                    "h-10 flex-1 rounded-xl text-[14px]",
                                                    field.value === value
                                                        ? "bg-brand text-on-brand"
                                                        : "bg-ground-muted text-ink",
                                                )}
                                            >
                                                {t(labelKey)}
                                            </button>
                                        ))}
                                    </div>
                                    <FormDescription>
                                        {t("tag-kind-description")}
                                    </FormDescription>
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
                <div className="border-t border-rule/70 bg-ground px-5 pt-3 pb-6">
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="h-12 flex-1 rounded-xl bg-ground-muted text-[15px] text-ink"
                        >
                            {t("cancel")}
                        </button>
                        <button
                            type="button"
                            disabled={!name.trim()}
                            onClick={toSubmit}
                            className={cn(
                                "h-12 flex-1 rounded-xl bg-brand text-[15px] text-on-brand",
                                !name.trim() && "opacity-50",
                            )}
                        >
                            {t("confirm")}
                        </button>
                    </div>
                    {!isCreate && (
                        <Button
                            variant="ghost"
                            className="mt-2 w-full text-red-600"
                            onClick={() => onConfirm?.("delete")}
                        >
                            {t("delete")}
                        </Button>
                    )}
                </div>
            </div>
        </Form>
    );
};
