import { useIntl } from "@/locale";
import { useBookStore } from "@/store/book";
import { useIsLogin } from "@/store/user";
import { BookForm, hasUserIdentity } from "./form";

/**
 * 登录后引导页入口：登录后没有选中账本，或（WebDAV / S3 共享账号）尚未选定
 * 身份时自动出现。页面本体在 BookForm（全屏、账本 + 身份合并的分组列表），
 * 这里只负责出现条件。
 */
export default function BookGuide() {
    const t = useIntl();
    const isLogin = useIsLogin();
    const { currentBookId } = useBookStore();
    if (!isLogin) {
        return null;
    }
    // 已选账本且身份已定才不显示：共享账号还要补选身份（缺失时账单 creatorId 会混在一起）
    if (currentBookId !== undefined && hasUserIdentity()) {
        return null;
    }
    return (
        <div className="contents">
            <span className="sr-only">{t("select-a-book")}</span>
            <BookForm />
        </div>
    );
}
