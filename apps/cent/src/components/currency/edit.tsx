import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useCurrency } from "@/hooks/use-currency";
import type { CustomCurrency } from "@/ledger/type";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import {
    BTN_DANGER,
    BTN_PRIMARY,
    BTN_SECONDARY,
    SHEET_FOOTER,
} from "../button-styles";
import { FormCard, FormRow, RowInput } from "../form-rows";
import { Form, FormControl, FormField, FormItem, FormLabel } from "../ui/form";
import RateInput from "./rate-input";
import { showCurrencyDelete } from "./sheets";

const createFormSchema = (t: any) =>
    z.object({
        name: z.string().check(
            z.maxLength(50, {
                message: t("max-name-length-limit", { n: 50 }),
            }),
        ),
        // 可选字符串
        symbol: z.string().check(
            z.maxLength(5, {
                message: t("max-name-length-limit", { n: 5 }),
            }),
        ),
        rateToBase: z.coerce
            .number()
            .check(z.gte(0, { message: t("rate-must-positive") })),
    });

type CurrencyEdit = Omit<CustomCurrency, "id"> & { id?: string };

export const EditCurrencyForm = ({
    edit,
    onConfirm,
    onCancel,
}: {
    edit?: CurrencyEdit;
    onConfirm?: (v: CurrencyEdit | "delete") => void;
    onCancel?: () => void;
}) => {
    const t = useIntl();
    const { baseCurrency } = useCurrency();
    const formSchema = useMemo(() => createFormSchema(t), [t]);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: edit,
    });
    const isCreate = edit === undefined;

    const toSubmit = () => {
        const onSubmit = (data: z.infer<typeof formSchema>) => {
            onConfirm?.({ ...data, id: edit?.id });
        };
        form.handleSubmit(onSubmit)();
    };

    const toDelete = () => {
        void showCurrencyDelete({
            title: t("edit-currency"),
            description: form.watch("name") || t("default-currency-name"),
            onDelete: () => onConfirm?.("delete"),
        }).catch(() => {});
    };

    return (
        <Form {...form}>
            <div className="flex max-h-[80dvh] flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3">
                    <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-secondary/40" />
                    <h2 className="text-center text-[17px] font-semibold text-ink">
                        {isCreate ? t("add-new-currency") : t("edit-currency")}
                    </h2>
                    <div className="mt-4 mb-2">
                        <FormCard>
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormRow label={t("currency-name")}>
                                            <FormControl>
                                                <RowInput
                                                    value={field.value ?? ""}
                                                    onChange={field.onChange}
                                                    placeholder={t(
                                                        "custom-currency-name-placeholder",
                                                    )}
                                                    maxLength={50}
                                                />
                                            </FormControl>
                                        </FormRow>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="symbol"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormRow label={t("currency-symbol")}>
                                            <FormControl>
                                                <RowInput
                                                    value={field.value ?? ""}
                                                    onChange={field.onChange}
                                                    placeholder={t(
                                                        "custom-currency-symbol-placeholder",
                                                    )}
                                                    maxLength={5}
                                                />
                                            </FormControl>
                                        </FormRow>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="rateToBase"
                                render={({ field }) => (
                                    <FormItem className="px-4 py-3">
                                        <FormLabel className="text-[13px] text-ink-secondary">
                                            {t("rate-to-base")}
                                        </FormLabel>
                                        <FormControl>
                                            <RateInput
                                                baseCurrencyLabel={
                                                    baseCurrency.label
                                                }
                                                targetCurrencyLabel={
                                                    form.watch("name") ||
                                                    t("default-currency-name")
                                                }
                                                value={field.value}
                                                allowClear={false}
                                                onChange={(newRate) =>
                                                    field.onChange(newRate)
                                                }
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </FormCard>
                    </div>
                </div>
                <div className={SHEET_FOOTER}>
                    <div className="flex gap-2.5">
                        {!isCreate && (
                            <button
                                type="button"
                                onClick={toDelete}
                                className={BTN_DANGER}
                            >
                                {t("delete")}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onCancel}
                            className={cn(BTN_SECONDARY, "flex-1")}
                        >
                            {t("cancel")}
                        </button>
                        <button
                            type="button"
                            onClick={toSubmit}
                            className={cn(BTN_PRIMARY, "flex-1")}
                        >
                            {t("confirm")}
                        </button>
                    </div>
                </div>
            </div>
        </Form>
    );
};
