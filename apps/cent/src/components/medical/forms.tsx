import { useState } from "react";
import { DatePicker } from "@/components/date-picker";
import {
    FORMAT_IMAGE_SUPPORTED,
    showFilePicker,
} from "@/components/file-picker";
import {
    CountedRowInput,
    FormBlock,
    FormCard,
    FormRow,
    FormSection,
    RowChevron,
    RowInput,
} from "@/components/form-rows";
import SmartImage from "@/components/image";
import PopupLayout from "@/layouts/popup-layout";
import { useIntl } from "@/locale";
import type {
    MedicalMedicine,
    MedicalProfile,
    MedicalVisit,
} from "@/medical/types";
import { cn } from "@/utils";
import createConfirmProvider from "../confirm";
import Deletable from "../deletable";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";

export type MedicalProfileValue = Omit<
    MedicalProfile,
    "id" | "userId" | "time"
>;

export default function MedicalProfileForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit?: MedicalProfile;
    onCancel?: () => void;
    onConfirm?: (v: MedicalProfileValue) => void;
}) {
    const t = useIntl();
    const [avatar, setAvatar] = useState<string | File | undefined>(
        edit?.avatar,
    );
    const [name, setName] = useState(edit?.name ?? "");
    const [birthday, setBirthday] = useState<number | undefined>(
        edit?.birthday,
    );
    const [gender, setGender] = useState<MedicalProfile["gender"]>(
        edit?.gender,
    );
    const [bloodType, setBloodType] = useState(edit?.bloodType ?? "");
    const [allergy, setAllergy] = useState(edit?.allergy ?? "");
    const [medicalHistory, setMedicalHistory] = useState(
        edit?.medicalHistory ?? "",
    );
    const [medications, setMedications] = useState(edit?.medications ?? "");
    const [remark, setRemark] = useState(edit?.remark ?? "");

    const valid = name.trim().length > 0;

    const chooseAvatar = async () => {
        const [file] = await showFilePicker({ accept: FORMAT_IMAGE_SUPPORTED });
        if (file) {
            setAvatar(file);
        }
    };

    return (
        <PopupLayout
            title={edit ? t("medical-edit-profile") : t("medical-add-profile")}
            onBack={onCancel}
            handle
            right={
                <Button
                    size="sm"
                    disabled={!valid}
                    onClick={() =>
                        onConfirm?.({
                            entity: "profile",
                            name: name.trim(),
                            avatar,
                            birthday,
                            gender,
                            bloodType: bloodType.trim() || undefined,
                            allergy: allergy.trim() || undefined,
                            medicalHistory: medicalHistory.trim() || undefined,
                            medications: medications.trim() || undefined,
                            remark: remark.trim() || undefined,
                        })
                    }
                >
                    {t("confirm")}
                </Button>
            }
        >
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-3 pb-6">
                {/* 头像：圆形 + 相机角标，与家小满建档页一致 */}
                <div className="flex justify-center pt-1">
                    <div className="relative">
                        <button
                            type="button"
                            aria-label={t("add")}
                            className="relative block cursor-pointer"
                            onClick={chooseAvatar}
                        >
                            {avatar ? (
                                <SmartImage
                                    source={avatar}
                                    className="size-24 rounded-full object-cover"
                                />
                            ) : (
                                <span className="flex size-24 items-center justify-center rounded-full bg-ground-muted text-ink-secondary">
                                    <i className="icon-[mdi--account-outline] size-10" />
                                </span>
                            )}
                            <span className="absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full bg-panel shadow-[0_2px_8px_rgba(92,62,30,0.2)]">
                                <i className="icon-[mdi--camera-outline] size-4 text-ink" />
                            </span>
                        </button>
                        {avatar && (
                            <button
                                type="button"
                                aria-label={t("delete")}
                                className="absolute -top-1 -right-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-panel text-ink-secondary shadow-[0_2px_8px_rgba(92,62,30,0.2)]"
                                onClick={() => setAvatar(undefined)}
                            >
                                <i className="icon-[mdi--close] size-3" />
                            </button>
                        )}
                    </div>
                </div>

                <FormSection title={t("medical-section-basic")} />
                <FormCard>
                    <FormRow label={t("medical-profile-name")}>
                        <RowInput
                            value={name}
                            placeholder={t("medical-profile-name-placeholder")}
                            onChange={setName}
                        />
                    </FormRow>
                    <FormRow label={t("medical-birthday")}>
                        <DatePicker
                            type="date"
                            value={birthday}
                            onChange={(v) => setBirthday(v)}
                            displayFormatter={(d) =>
                                d ? d.format("YYYY-MM-DD") : ""
                            }
                        >
                            <button
                                type="button"
                                className="flex cursor-pointer items-center gap-0.5 text-[15px]"
                            >
                                <span
                                    className={cn(
                                        birthday
                                            ? "text-ink"
                                            : "text-ink-secondary/70",
                                    )}
                                >
                                    {birthday
                                        ? new Date(
                                              birthday,
                                          ).toLocaleDateString()
                                        : t("medical-birthday-placeholder")}
                                </span>
                                <RowChevron />
                            </button>
                        </DatePicker>
                    </FormRow>
                    <FormRow label={t("medical-gender")}>
                        <Select
                            value={gender ?? ""}
                            onValueChange={(v) =>
                                setGender(
                                    v === "male" || v === "female"
                                        ? v
                                        : undefined,
                                )
                            }
                        >
                            <SelectTrigger className="w-fit gap-0.5 border-0 bg-transparent p-0 text-[15px] shadow-none [&>svg]:hidden">
                                <span
                                    className={cn(
                                        gender
                                            ? "text-ink"
                                            : "text-ink-secondary/70",
                                    )}
                                >
                                    {gender === "male"
                                        ? t("medical-gender-male")
                                        : gender === "female"
                                          ? t("medical-gender-female")
                                          : t("medical-gender-placeholder")}
                                </span>
                                <RowChevron />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="male">
                                    {t("medical-gender-male")}
                                </SelectItem>
                                <SelectItem value="female">
                                    {t("medical-gender-female")}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </FormRow>
                    <FormRow label={t("medical-blood-type")}>
                        <RowInput
                            value={bloodType}
                            placeholder={t("medical-blood-type-placeholder")}
                            onChange={setBloodType}
                        />
                    </FormRow>
                </FormCard>

                <FormSection title={t("medical-section-health")} />
                <FormCard>
                    <FormRow label={t("medical-allergy")}>
                        <RowInput
                            value={allergy}
                            placeholder={t("medical-allergy-placeholder")}
                            onChange={setAllergy}
                        />
                    </FormRow>
                    <FormRow label={t("medical-history")}>
                        <RowInput
                            value={medicalHistory}
                            placeholder={t("medical-history-placeholder")}
                            onChange={setMedicalHistory}
                        />
                    </FormRow>
                    <FormRow label={t("medical-medications")}>
                        <RowInput
                            value={medications}
                            placeholder={t("medical-medications-placeholder")}
                            onChange={setMedications}
                        />
                    </FormRow>
                    <FormRow label={t("inventory-remark")}>
                        <CountedRowInput value={remark} onChange={setRemark} />
                    </FormRow>
                </FormCard>
            </div>
        </PopupLayout>
    );
}

export type MedicalVisitValue = Omit<MedicalVisit, "id" | "userId">;

const MAX_IMAGES = 3;

export function MedicalVisitForm({
    edit,
    onCancel,
    onConfirm,
}: {
    /** profiles 为当前家庭成员列表，visit 为待编辑的就诊记录 */
    edit?: { profiles: MedicalProfile[]; visit?: MedicalVisit };
    onCancel?: () => void;
    onConfirm?: (v: MedicalVisitValue) => void;
}) {
    const t = useIntl();
    const profiles = edit?.profiles ?? [];
    const visit = edit?.visit;
    const [profileId, setProfileId] = useState(
        visit?.profileId ?? profiles[0]?.id ?? "",
    );
    const [time, setTime] = useState<number>(visit?.time ?? Date.now());
    const [hospital, setHospital] = useState(visit?.hospital ?? "");
    const [department, setDepartment] = useState(visit?.department ?? "");
    const [diagnosis, setDiagnosis] = useState(visit?.diagnosis ?? "");
    const [amountText, setAmountText] = useState(
        visit?.amount === undefined ? "" : String(visit.amount),
    );
    const [images, setImages] = useState<(File | string)[]>(
        visit?.images ?? [],
    );
    const [remark, setRemark] = useState(visit?.remark ?? "");

    const valid = profileId !== "" && profiles.length > 0;
    const amount = Number(amountText) || undefined;

    const chooseImage = async () => {
        if (images.length >= MAX_IMAGES) return;
        const [file] = await showFilePicker({ accept: FORMAT_IMAGE_SUPPORTED });
        if (file) {
            setImages((prev) => [...prev, file]);
        }
    };

    return (
        <PopupLayout
            title={visit ? t("medical-edit-visit") : t("medical-add-visit")}
            onBack={onCancel}
            handle
            right={
                <Button
                    size="sm"
                    disabled={!valid}
                    onClick={() =>
                        onConfirm?.({
                            entity: "visit",
                            profileId,
                            time,
                            hospital: hospital.trim() || undefined,
                            department: department.trim() || undefined,
                            diagnosis: diagnosis.trim() || undefined,
                            amount,
                            images: images.length > 0 ? images : undefined,
                            remark: remark.trim() || undefined,
                        })
                    }
                >
                    {t("confirm")}
                </Button>
            }
        >
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-3 pb-6">
                <FormCard>
                    {profiles.length > 0 && (
                        <FormRow label={t("stat-member")}>
                            <div className="flex flex-wrap justify-end gap-1.5">
                                {profiles.map((profile) => (
                                    <button
                                        key={profile.id}
                                        type="button"
                                        className={cn(
                                            "cursor-pointer rounded-full px-2.5 py-1 text-xs transition-colors",
                                            profileId === profile.id
                                                ? "bg-brand/10 font-medium text-brand"
                                                : "bg-ground-muted text-ink-secondary",
                                        )}
                                        onClick={() => setProfileId(profile.id)}
                                    >
                                        {profile.name}
                                    </button>
                                ))}
                            </div>
                        </FormRow>
                    )}
                    <FormRow label={t("medical-visit-date")}>
                        <DatePicker
                            type="date"
                            value={time}
                            onChange={(v) => setTime(v)}
                        >
                            <button
                                type="button"
                                className="flex cursor-pointer items-center gap-0.5 text-[15px] text-ink"
                            >
                                {new Date(time).toLocaleDateString()}
                                <RowChevron />
                            </button>
                        </DatePicker>
                    </FormRow>
                    <FormRow label={t("medical-hospital")}>
                        <RowInput value={hospital} onChange={setHospital} />
                    </FormRow>
                    <FormRow label={t("medical-department")}>
                        <RowInput value={department} onChange={setDepartment} />
                    </FormRow>
                    <FormRow label={t("medical-diagnosis")}>
                        <RowInput value={diagnosis} onChange={setDiagnosis} />
                    </FormRow>
                    <FormRow label={t("medical-amount")}>
                        <RowInput
                            value={amountText}
                            inputMode="decimal"
                            placeholder="0"
                            onChange={setAmountText}
                        />
                    </FormRow>
                </FormCard>

                <FormCard>
                    {images.length > 0 && (
                        <FormBlock>
                            {images.map((image, index) => (
                                <Deletable
                                    key={index}
                                    onDelete={() =>
                                        setImages((prev) =>
                                            prev.filter((_, i) => i !== index),
                                        )
                                    }
                                >
                                    <SmartImage
                                        source={image}
                                        className="size-16 rounded-2xl object-cover"
                                    />
                                </Deletable>
                            ))}
                        </FormBlock>
                    )}
                    {images.length < MAX_IMAGES && (
                        <FormBlock>
                            <button
                                type="button"
                                aria-label={t("add")}
                                className="flex size-14 cursor-pointer items-center justify-center rounded-2xl bg-ground-muted text-ink-secondary"
                                onClick={chooseImage}
                            >
                                <i className="icon-[mdi--camera-outline] size-5" />
                            </button>
                        </FormBlock>
                    )}
                    <FormRow label={t("inventory-remark")}>
                        <CountedRowInput value={remark} onChange={setRemark} />
                    </FormRow>
                </FormCard>
            </div>
        </PopupLayout>
    );
}

export type MedicalMedicineValue = Omit<
    MedicalMedicine,
    "id" | "userId" | "time"
>;

export function MedicalMedicineForm({
    edit,
    onCancel,
    onConfirm,
}: {
    /** profiles 为成员列表，medicine 为待编辑药品 */
    edit?: { profiles: MedicalProfile[]; medicine?: MedicalMedicine };
    onCancel?: () => void;
    onConfirm?: (v: MedicalMedicineValue) => void;
}) {
    const t = useIntl();
    const medicine = edit?.medicine;
    const profiles = edit?.profiles ?? [];
    const [name, setName] = useState(medicine?.name ?? "");
    const [profileId, setProfileId] = useState(medicine?.profileId ?? "");
    const [stock, setStock] = useState(medicine?.stock ?? "");
    const [dosage, setDosage] = useState(medicine?.dosage ?? "");
    const [expiryDate, setExpiryDate] = useState<number | undefined>(
        medicine?.expiryDate,
    );
    const [remark, setRemark] = useState(medicine?.remark ?? "");

    const valid = name.trim().length > 0;

    return (
        <PopupLayout
            title={
                medicine
                    ? t("medical-edit-medicine")
                    : t("medical-add-medicine")
            }
            onBack={onCancel}
            handle
            right={
                <Button
                    size="sm"
                    disabled={!valid}
                    onClick={() =>
                        onConfirm?.({
                            entity: "medicine",
                            name: name.trim(),
                            profileId: profileId || undefined,
                            stock: stock.trim() || undefined,
                            dosage: dosage.trim() || undefined,
                            expiryDate,
                            remark: remark.trim() || undefined,
                        })
                    }
                >
                    {t("confirm")}
                </Button>
            }
        >
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-3 pb-6">
                <FormCard>
                    <FormRow label={t("medical-medicine-name")}>
                        <RowInput
                            value={name}
                            placeholder={t("medical-medicine-name-placeholder")}
                            onChange={setName}
                        />
                    </FormRow>
                    {profiles.length > 0 && (
                        <FormRow label={t("stat-member")}>
                            <div className="flex flex-wrap justify-end gap-1.5">
                                <button
                                    type="button"
                                    className={cn(
                                        "cursor-pointer rounded-full px-2.5 py-1 text-xs transition-colors",
                                        profileId === ""
                                            ? "bg-brand/10 font-medium text-brand"
                                            : "bg-ground-muted text-ink-secondary",
                                    )}
                                    onClick={() => setProfileId("")}
                                >
                                    {t("medical-medicine-shared")}
                                </button>
                                {profiles.map((profile) => (
                                    <button
                                        key={profile.id}
                                        type="button"
                                        className={cn(
                                            "cursor-pointer rounded-full px-2.5 py-1 text-xs transition-colors",
                                            profileId === profile.id
                                                ? "bg-brand/10 font-medium text-brand"
                                                : "bg-ground-muted text-ink-secondary",
                                        )}
                                        onClick={() => setProfileId(profile.id)}
                                    >
                                        {profile.name}
                                    </button>
                                ))}
                            </div>
                        </FormRow>
                    )}
                    <FormRow label={t("medical-medicine-stock")}>
                        <RowInput
                            value={stock}
                            placeholder={t(
                                "medical-medicine-stock-placeholder",
                            )}
                            onChange={setStock}
                        />
                    </FormRow>
                    <FormRow label={t("medical-medicine-expiry")}>
                        <DatePicker
                            type="date"
                            value={expiryDate}
                            onChange={(v) => setExpiryDate(v)}
                            displayFormatter={(d) =>
                                d ? d.format("YYYY-MM-DD") : ""
                            }
                        >
                            <button
                                type="button"
                                className="flex cursor-pointer items-center gap-0.5 text-[15px]"
                            >
                                <span
                                    className={cn(
                                        expiryDate
                                            ? "text-ink"
                                            : "text-ink-secondary/70",
                                    )}
                                >
                                    {expiryDate
                                        ? new Date(
                                              expiryDate,
                                          ).toLocaleDateString()
                                        : t("medical-not-set")}
                                </span>
                                <RowChevron />
                            </button>
                        </DatePicker>
                    </FormRow>
                    <FormRow label={t("medical-medicine-dosage")}>
                        <RowInput
                            value={dosage}
                            placeholder={t(
                                "medical-medicine-dosage-placeholder",
                            )}
                            onChange={setDosage}
                        />
                    </FormRow>
                    <FormRow label={t("inventory-remark")}>
                        <CountedRowInput value={remark} onChange={setRemark} />
                    </FormRow>
                </FormCard>
            </div>
        </PopupLayout>
    );
}
