/** 家庭成员医疗档案，随账本云同步（entry: medical） */
export type MedicalProfile = {
    entity: "profile";
    id: string;
    userId: string | number;
    /** 建档时间（毫秒） */
    time: number;
    name: string;
    /** 头像：本地为 File，同步后被资产通道替换为 assets/<id> key */
    avatar?: string | File;
    /** 生日（毫秒，按日），用于展示年龄 */
    birthday?: number;
    /** 性别：male / female */
    gender?: "male" | "female";
    bloodType?: string;
    /** 过敏提示，如「青霉素」 */
    allergy?: string;
    /** 既往病史，如「慢性胃炎」 */
    medicalHistory?: string;
    /** 长期服药，如「降压药」 */
    medications?: string;
    remark?: string;
};

/** 一次就诊记录，随账本云同步（entry: medical） */
export type MedicalVisit = {
    entity: "visit";
    id: string;
    userId: string | number;
    /** 就诊日期（毫秒，按日） */
    time: number;
    /** 关联的 MedicalProfile id */
    profileId: string;
    hospital?: string;
    department?: string;
    diagnosis?: string;
    /** 自费金额（元） */
    amount?: number;
    images?: (File | string)[];
    remark?: string;
};

/** 药箱里的药品，随账本云同步（entry: medical） */
export type MedicalMedicine = {
    entity: "medicine";
    id: string;
    userId: string | number;
    time: number;
    name: string;
    /** 归属成员（可选） */
    profileId?: string;
    /** 余量描述，如「剩 2 盒」 */
    stock?: string;
    /** 用法，如「每日 2 次，每次 1 片」 */
    dosage?: string;
    /** 过期日期（毫秒，按日） */
    expiryDate?: number;
    remark?: string;
};

export type MedicalEntity = MedicalProfile | MedicalVisit | MedicalMedicine;
