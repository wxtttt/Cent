import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { SheetShell } from "../sheet-kit";
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
            <SheetShell
                title={isCreate ? t("add-new-tag") : t("edit-tag")}
                onCancel={isCreate ? onCancel : () => onConfirm?.("delete")}
                cancelLabel={isCreate ? undefined : t("delete")}
                cancelDanger={!isCreate}
                onConfirm={toSubmit}
                confirmDisabled={!name.trim()}
            >
                <div className="flex flex-col gap-4">
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
            </SheetShell>
        </Form>
    );
};
