import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useCurrency } from "@/hooks/use-currency";
import type { CustomCurrency } from "@/ledger/type";
import { useIntl } from "@/locale";
import { RowInput } from "../form-rows";
import { SheetCard, SheetRow, SheetShell } from "../sheet-kit";
import { Form, FormControl, FormField } from "../ui/form";
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
            <SheetShell
                title={isCreate ? t("add-new-currency") : t("edit-currency")}
                onCancel={isCreate ? onCancel : toDelete}
                cancelLabel={isCreate ? undefined : t("delete")}
                cancelDanger={!isCreate}
                onConfirm={toSubmit}
            >
                <SheetCard>
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <SheetRow label={t("currency-name")}>
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
                            </SheetRow>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="symbol"
                        render={({ field }) => (
                            <SheetRow label={t("currency-symbol")}>
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
                            </SheetRow>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="rateToBase"
                        render={({ field }) => (
                            <div className="px-4 py-3">
                                <span className="text-[13px] text-ink-secondary">
                                    {t("rate-to-base")}
                                </span>
                                <FormControl>
                                    <RateInput
                                        baseCurrencyLabel={baseCurrency.label}
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
                            </div>
                        )}
                    />
                </SheetCard>
            </SheetShell>
        </Form>
    );
};
