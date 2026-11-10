import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import xiaoyuPeek from "@/assets/mascots/04-medical-xiaoyu-peek.webp";
import SmartImage from "@/components/image";
import {
    showMedicalMedicine,
    showMedicalProfile,
    showMedicalVisit,
} from "@/components/medical";
import modal from "@/components/modal";
import SegmentedTabs from "@/components/segmented-tabs";
import { Button } from "@/components/ui/button";
import {
    addMedicalMedicine,
    addMedicalVisit,
    removeMedicalMedicine,
    removeMedicalProfile,
    removeMedicalVisit,
    updateMedicalMedicine,
    updateMedicalProfile,
    updateMedicalVisit,
    useMedical,
} from "@/hooks/use-medical";
import { useIntl } from "@/locale";
import type {
    MedicalMedicine,
    MedicalProfile,
    MedicalVisit,
} from "@/medical/types";

type MedicalTab = "profile" | "medicine" | "visit";

const TABS = [
    { value: "profile", label: "medical-tab-profile" },
    { value: "medicine", label: "medical-tab-medicine" },
    { value: "visit", label: "medical-tab-visit" },
] as const;

const matchKeyword = (keyword: string, ...fields: (string | undefined)[]) =>
    keyword === "" ||
    fields.some((f) => f?.toLowerCase().includes(keyword.toLowerCase()));

const profileNameOf = (profiles: MedicalProfile[], id?: string) =>
    profiles.find((p) => p.id === id)?.name ?? "";

export default function MedicalPage() {
    const t = useIntl();
    const { profiles, medicines, visits } = useMedical();
    // 子页签同步到 URL：底部 dock 的加号需要按当前子页签分派行为
    const [searchParams, setSearchParams] = useSearchParams();
    const rawTab = searchParams.get("tab");
    const tab: MedicalTab =
        rawTab === "medicine" || rawTab === "visit" ? rawTab : "profile";
    const setTab = (next: MedicalTab) =>
        setSearchParams(next === "profile" ? {} : { tab: next });
    const [keyword, setKeyword] = useState("");

    const profileName = (id?: string) => profileNameOf(profiles, id);

    const search = async () => {
        try {
            const value = await modal.prompt({
                title: t("medical-search"),
                input: { defaultValue: keyword },
            });
            setKeyword(String(value ?? "").trim());
        } catch {
            // 用户取消
        }
    };

    const filteredProfiles = useMemo(
        () =>
            profiles.filter((p) =>
                matchKeyword(keyword, p.name, p.allergy, p.remark),
            ),
        [profiles, keyword],
    );
    const filteredMedicines = useMemo(
        () =>
            medicines.filter((m) =>
                matchKeyword(
                    keyword,
                    m.name,
                    m.stock,
                    m.dosage,
                    profileNameOf(profiles, m.profileId),
                ),
            ),
        [medicines, keyword, profiles],
    );
    const filteredVisits = useMemo(
        () =>
            visits
                .filter((v) =>
                    matchKeyword(
                        keyword,
                        v.hospital,
                        v.department,
                        v.diagnosis,
                        profileNameOf(profiles, v.profileId),
                    ),
                )
                .sort((a, b) => b.time - a.time),
        [visits, keyword, profiles],
    );

    const ageText = (birthday?: number) => {
        if (!birthday) return undefined;
        const months = dayjs().diff(dayjs(birthday), "month");
        if (months < 24) return t("medical-age-months", { n: months });
        return t("medical-age-years", { n: Math.floor(months / 12) });
    };

    return (
        <div className="h-full overflow-y-auto">
            <div className="mx-auto flex w-full max-w-[720px] flex-col gap-3 px-4 pb-32 pt-3">
                <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                        <SegmentedTabs
                            items={TABS.map(({ value, label }) => ({
                                value,
                                label: t(label),
                            }))}
                            value={tab}
                            onChange={(v) => setTab(v as MedicalTab)}
                        />
                    </div>
                    <button
                        type="button"
                        aria-label={t("medical-search")}
                        className="flex size-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-panel shadow-panel"
                        onClick={search}
                    >
                        <i className="icon-[apk--search] size-5 text-ink" />
                    </button>
                </div>

                {keyword && (
                    <button
                        type="button"
                        className="flex cursor-pointer items-center gap-1 self-start rounded-full bg-brand/10 px-3 py-1 text-xs text-brand"
                        onClick={() => setKeyword("")}
                    >
                        「{keyword}」
                        <i className="icon-[apk--close] size-3" />
                    </button>
                )}

                {tab === "profile" && (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-end justify-between">
                            <h2 className="dp-text-medium font-display text-[17px]">
                                {t("medical-family-profiles")}
                            </h2>
                            <img
                                src={xiaoyuPeek}
                                alt=""
                                draggable={false}
                                className="pointer-events-none h-11 w-auto select-none"
                            />
                        </div>
                        {filteredProfiles.length === 0 ? (
                            <EmptyText text={t("medical-empty-profiles")} />
                        ) : (
                            filteredProfiles.map((profile) => (
                                <ProfileCard
                                    key={profile.id}
                                    profile={profile}
                                    ageText={ageText(profile.birthday)}
                                    onEdit={() =>
                                        showMedicalProfile(profile).then(
                                            (v) =>
                                                v &&
                                                updateMedicalProfile({
                                                    ...profile,
                                                    ...v,
                                                }),
                                        )
                                    }
                                    onDelete={() =>
                                        removeMedicalProfile(profile.id)
                                    }
                                />
                            ))
                        )}
                    </div>
                )}

                {tab === "medicine" && (
                    <div className="flex flex-col gap-3">
                        <SectionHeader
                            title={t("medical-tab-medicine")}
                            addLabel={t("medical-add-medicine")}
                            onAdd={() =>
                                showMedicalMedicine({ profiles }).then(
                                    (v) => v && addMedicalMedicine(v),
                                )
                            }
                        />
                        {filteredMedicines.length === 0 ? (
                            <EmptyText text={t("medical-empty-medicine")} />
                        ) : (
                            filteredMedicines.map((medicine) => (
                                <MedicineCard
                                    key={medicine.id}
                                    medicine={medicine}
                                    profileName={profileName(
                                        medicine.profileId,
                                    )}
                                    onEdit={() =>
                                        showMedicalMedicine({
                                            profiles,
                                            medicine,
                                        }).then(
                                            (v) =>
                                                v &&
                                                updateMedicalMedicine({
                                                    ...medicine,
                                                    ...v,
                                                }),
                                        )
                                    }
                                    onDelete={() =>
                                        removeMedicalMedicine(medicine.id)
                                    }
                                />
                            ))
                        )}
                    </div>
                )}

                {tab === "visit" && (
                    <div className="flex flex-col gap-3">
                        <SectionHeader
                            title={t("medical-tab-visit")}
                            addLabel={t("medical-add-visit")}
                            onAdd={() =>
                                showMedicalVisit({ profiles }).then(
                                    (v) => v && addMedicalVisit(v),
                                )
                            }
                        />
                        {filteredVisits.length === 0 ? (
                            <EmptyText text={t("medical-empty-visit")} />
                        ) : (
                            filteredVisits.map((visit) => (
                                <VisitCard
                                    key={visit.id}
                                    visit={visit}
                                    profileName={profileName(visit.profileId)}
                                    onEdit={() =>
                                        showMedicalVisit({
                                            profiles,
                                            visit,
                                        }).then(
                                            (v) =>
                                                v &&
                                                updateMedicalVisit({
                                                    ...visit,
                                                    ...v,
                                                }),
                                        )
                                    }
                                    onDelete={() =>
                                        removeMedicalVisit(visit.id)
                                    }
                                />
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function SectionHeader({
    title,
    addLabel,
    onAdd,
}: {
    title: string;
    addLabel: string;
    onAdd: () => void;
}) {
    return (
        <div className="flex items-center justify-between">
            <h2 className="dp-text-medium font-display text-[17px]">{title}</h2>
            <Button variant="ghost" size="sm" onClick={onAdd}>
                <i className="icon-[lucide--plus]" />
                {addLabel}
            </Button>
        </div>
    );
}

function EmptyText({ text }: { text: string }) {
    // 家小满缺省态：纯文字居中、无插画与引导按钮
    return (
        <p className="py-12 text-center text-[13px] text-ink-secondary">
            {text}
        </p>
    );
}

function ProfileCard({
    profile,
    ageText,
    onEdit,
    onDelete,
}: {
    profile: MedicalProfile;
    ageText?: string;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const t = useIntl();
    return (
        <div className="flex items-center gap-3 rounded-card border border-rule bg-panel p-4 shadow-panel">
            <button
                type="button"
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                onClick={onEdit}
            >
                {profile.avatar ? (
                    <SmartImage
                        source={profile.avatar}
                        className="size-12 flex-shrink-0 rounded-2xl object-cover"
                    />
                ) : (
                    <div className="flex size-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                        <i className="icon-[lucide--user] size-6" />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium">
                            {profile.name}
                        </span>
                        {ageText && (
                            <span className="text-xs text-ink-secondary">
                                {ageText}
                            </span>
                        )}
                        {profile.gender && (
                            <span className="text-xs text-ink-secondary">
                                {profile.gender === "male"
                                    ? t("medical-gender-male")
                                    : t("medical-gender-female")}
                            </span>
                        )}
                    </div>
                    {(profile.bloodType ||
                        profile.allergy ||
                        profile.medicalHistory ||
                        profile.medications) && (
                        <div className="mt-0.5 truncate text-xs text-ink-secondary">
                            {profile.bloodType && (
                                <span>{profile.bloodType}型 </span>
                            )}
                            {profile.allergy && (
                                <span>
                                    {t("medical-allergy")}
                                    {profile.allergy}{" "}
                                </span>
                            )}
                            {profile.medicalHistory && (
                                <span>{profile.medicalHistory} </span>
                            )}
                            {profile.medications && (
                                <span>{profile.medications}</span>
                            )}
                        </div>
                    )}
                </div>
            </button>
            <DeleteButton label={t("delete")} onClick={onDelete} />
        </div>
    );
}

function MedicineCard({
    medicine,
    profileName,
    onEdit,
    onDelete,
}: {
    medicine: MedicalMedicine;
    profileName: string;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const t = useIntl();
    const expired =
        medicine.expiryDate !== undefined &&
        medicine.expiryDate < dayjs().startOf("day").valueOf();
    return (
        <div className="flex items-center gap-3 rounded-card border border-rule bg-panel p-4 shadow-panel">
            <button
                type="button"
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                onClick={onEdit}
            >
                <div className="flex size-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                    <i className="icon-[lucide--pill] size-6" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                        <span className="truncate text-sm font-medium">
                            {medicine.name}
                        </span>
                        {profileName && (
                            <span className="text-xs text-ink-secondary">
                                {profileName}
                            </span>
                        )}
                    </div>
                    {(medicine.stock || medicine.dosage) && (
                        <div className="mt-0.5 truncate text-xs text-ink-secondary">
                            {[medicine.stock, medicine.dosage]
                                .filter(Boolean)
                                .join(" · ")}
                        </div>
                    )}
                    {expired && (
                        <span className="mt-1 inline-block rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive">
                            {t("inventory-expired")}
                        </span>
                    )}
                </div>
            </button>
            <DeleteButton label={t("delete")} onClick={onDelete} />
        </div>
    );
}

function VisitCard({
    visit,
    profileName,
    onEdit,
    onDelete,
}: {
    visit: MedicalVisit;
    profileName: string;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const t = useIntl();
    return (
        <div className="rounded-card border border-rule bg-panel p-4 shadow-panel">
            <div className="flex items-center gap-3">
                <div className="flex size-12 flex-shrink-0 flex-col items-center justify-center rounded-2xl bg-brand/10 text-brand">
                    <span className="text-[10px]">
                        {dayjs(visit.time).format("MM/DD")}
                    </span>
                </div>
                <button
                    type="button"
                    className="min-w-0 flex-1 cursor-pointer text-left"
                    onClick={onEdit}
                >
                    <div className="flex items-baseline gap-2">
                        <span className="truncate text-sm font-medium">
                            {visit.diagnosis || t("medical-visit-untitled")}
                        </span>
                        {profileName && (
                            <span className="text-xs text-ink-secondary">
                                {profileName}
                            </span>
                        )}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-ink-secondary">
                        {[visit.hospital, visit.department]
                            .filter(Boolean)
                            .join(" · ")}
                    </div>
                </button>
                <div className="flex flex-shrink-0 items-center gap-1">
                    {visit.amount !== undefined && (
                        <span className="text-sm font-medium tabular-nums text-semantic-income">
                            ¥{visit.amount}
                        </span>
                    )}
                    <DeleteButton label={t("delete")} onClick={onDelete} />
                </div>
            </div>
            {visit.images && visit.images.length > 0 && (
                <div className="mt-2 flex gap-1.5 border-t border-dashed border-rule pt-2">
                    <i className="icon-[lucide--images] size-4 text-ink-secondary" />
                    <span className="text-xs text-ink-secondary">
                        {t("medical-visit-attachments", {
                            n: visit.images.length,
                        })}
                    </span>
                </div>
            )}
        </div>
    );
}

function DeleteButton({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            className="flex size-8 cursor-pointer items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-ground-muted"
            onClick={onClick}
        >
            <i className="icon-[apk--trash] size-4" />
        </button>
    );
}
