import dayjs from "dayjs";
import { toast } from "sonner";
import {
    calcNextDate,
    fillScheduledBills,
    scheduledEndCap,
    useScheduled,
} from "@/hooks/use-scheduled";
import PopupLayout from "@/layouts/popup-layout";
import { useIntl } from "@/locale";
import { measure } from "@/measurement";
import { useLedgerStore } from "@/store/ledger";
import { cn } from "@/utils";
import { BTN_TAP } from "../button-styles";
import { isCancelError } from "../confirm/state";
import modal from "../modal";
import { ListCard, PlaceholderCard } from "../sheet-kit";
import { Switch } from "../ui/switch";
import { showScheduledEdit } from ".";

const toDay = (v: number) => dayjs.unix(v / 1000).format("YYYY-MM-DD");

export default function ScheduledListForm({
    onCancel,
}: {
    onCancel?: () => void;
}) {
    const t = useIntl();
    const { scheduleds, add, update } = useScheduled();

    /** 新增：抽屉返回后把待生成账单补进账本，再落库 */
    const create = async () => {
        const newOne = await showScheduledEdit();
        if (!newOne) return;
        const needBills = [...(newOne.needBills ?? [])];
        delete newOne.needBills;
        useLedgerStore.getState().updateBills(needBills);
        await add(newOne);
        measure("feature_config_changed", {
            feature: "scheduled",
            action: "create",
        });
    };

    /** 编辑：同一条记录就地覆盖 */
    const edit = async (target: (typeof scheduleds)[number]) => {
        const id = target.id;
        const newOne = await showScheduledEdit(target);
        if (!newOne) return;
        const needBills = [...(newOne.needBills ?? [])];
        delete newOne.needBills;
        useLedgerStore.getState().updateBills(needBills);
        await update(id, newOne);
        measure("feature_config_changed", {
            feature: "scheduled",
            action: "update",
        });
    };

    return (
        <PopupLayout
            onBack={onCancel}
            backStyle="circle"
            className="dp-drawer-surface h-full bg-ground"
            title={
                <span className="text-[18px] font-semibold text-ink">
                    {t("scheduled-manager")}
                </span>
            }
            right={
                <button
                    type="button"
                    data-scheduled-add
                    aria-label={t("add-a-scheduled")}
                    onClick={() => void create()}
                    className="flex size-10 items-center justify-center rounded-full bg-panel text-ink shadow-[0_1px_6px_rgba(92,62,30,0.10)] transition-colors hover:text-brand active:bg-ground-muted"
                >
                    <i className="icon-[lucide--plus] size-5" />
                </button>
            }
        >
            <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-3 pt-1 pb-6">
                {scheduleds.length === 0 ? (
                    <PlaceholderCard>
                        {t("scheduled-description")}
                    </PlaceholderCard>
                ) : (
                    <ListCard>
                        {scheduleds.map((s) => {
                            const to = [s.end, scheduledEndCap(s)].filter(
                                (v): v is number => v !== undefined,
                            );
                            const next = calcNextDate(
                                s.repeat.value,
                                s.repeat.unit,
                                Date.now(),
                                s.start,
                                to.length > 0 ? Math.min(...to) : undefined,
                            );
                            return (
                                <div
                                    key={s.id}
                                    className="flex min-h-[58px] items-center gap-2 px-4 py-2"
                                >
                                    <button
                                        type="button"
                                        onClick={() => void edit(s)}
                                        className="flex min-w-0 flex-1 flex-col text-left"
                                    >
                                        <span className="block truncate text-[15px] text-ink">
                                            {s.title}
                                        </span>
                                        <div className="mt-0.5 flex flex-col">
                                            <div className="flex items-center gap-2 text-[11px] text-ink-secondary">
                                                <div>{toDay(s.start)}</div>
                                                {s.end && (
                                                    <>
                                                        <div>-</div>
                                                        <div>
                                                            {toDay(s.end)}
                                                        </div>
                                                    </>
                                                )}
                                                {s.endCount && (
                                                    <div>
                                                        {t(
                                                            "scheduled-end-count-display",
                                                            { n: s.endCount },
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {next && (
                                                <div className="text-[11px] text-ink-secondary">
                                                    {t(
                                                        "next-schedule-date-at",
                                                        {
                                                            date: toDay(next),
                                                        },
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <div>
                                            <Switch
                                                checked={Boolean(s.enabled)}
                                                onCheckedChange={async (v) => {
                                                    if (v) {
                                                        const needBills =
                                                            await fillScheduledBills(
                                                                s,
                                                            );
                                                        if (
                                                            needBills.length > 0
                                                        ) {
                                                            try {
                                                                await modal.prompt(
                                                                    {
                                                                        title: t(
                                                                            "scheduled-lack-bills",
                                                                            {
                                                                                n: needBills.length,
                                                                            },
                                                                        ),
                                                                    },
                                                                );
                                                                useLedgerStore
                                                                    .getState()
                                                                    .updateBills(
                                                                        needBills,
                                                                    );
                                                            } catch (err) {
                                                                console.log(
                                                                    isCancelError(
                                                                        err,
                                                                    ),
                                                                    "isCancelError(err)",
                                                                );
                                                                if (
                                                                    !isCancelError(
                                                                        err,
                                                                    )
                                                                ) {
                                                                    throw err;
                                                                }

                                                                toast.warning(
                                                                    "已忽略此前的账单",
                                                                );
                                                            }
                                                        }
                                                    }
                                                    await update(s.id, {
                                                        ...s,
                                                        enabled: !!v,
                                                        latest: Date.now() + 1,
                                                    });
                                                    measure(
                                                        "feature_config_changed",
                                                        {
                                                            feature:
                                                                "scheduled",
                                                            action: v
                                                                ? "enable"
                                                                : "disable",
                                                        },
                                                    );
                                                }}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            aria-label={t("edit")}
                                            className={BTN_TAP}
                                            onClick={() => void edit(s)}
                                        >
                                            <i className="icon-[apk--edit] size-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={t("delete")}
                                            className={cn(
                                                BTN_TAP,
                                                "text-red-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600",
                                            )}
                                            onClick={async () => {
                                                const ok = await modal
                                                    .prompt({
                                                        title: t(
                                                            "scheduled-delete-warning",
                                                        ),
                                                    })
                                                    .then(() => true)
                                                    .catch(() => false);
                                                if (!ok) return;
                                                await update(s.id, undefined);
                                                measure(
                                                    "feature_config_changed",
                                                    {
                                                        feature: "scheduled",
                                                        action: "delete",
                                                    },
                                                );
                                            }}
                                        >
                                            <i className="icon-[apk--trash] size-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </ListCard>
                )}
            </div>
        </PopupLayout>
    );
}
