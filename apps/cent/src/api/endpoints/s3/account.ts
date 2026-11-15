import type { S3Edit } from "@/components/modal/s3";

export const s3ConfigKey = "s3-config";

export const getS3Auth = () => {
    const data = localStorage.getItem(s3ConfigKey);
    if (!data) {
        return;
    }
    return JSON.parse(data) as S3Edit;
};

/** 连接校验通过后由登录页调用：写入端点配置并刷新应用 */
export const saveS3Account = (auth: S3Edit) => {
    localStorage.setItem("SYNC_ENDPOINT", "s3");
    localStorage.setItem(s3ConfigKey, JSON.stringify(auth));
    location.reload();
};
