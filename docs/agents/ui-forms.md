# 生活模块与通用表单规范

> 由根目录 `AGENTS.md` 拆分而来，属于功能级文档（渐进式披露）。先读 `AGENTS.md` 了解全局约定，改到本模块时再读本文；本模块有新口径 / 新规则时，同步更新 `AGENTS.md` 索引与本文。

## 表单域

- **添加物品表单**（`inventory/item-form.tsx`）：APK 折叠态是居中加粗标题、**无返回 / 无右上确认**，底部一个全宽橙色「确定添加」按钮（名称为空时 disabled）；`PopupLayout` 用 `hideBack`、不传 `right`，提交逻辑抽成 `submit()`。抽屉 `dialogModalClose: true`，点遮罩即可取消。其它表单的标题栏不受影响。

- 生活模块表单抽屉底色用 `bg-ground!`（provider 的 `contentClassName` 追加）+ 白色 FormCard，与家小满「灰底白卡」同构；记一笔的分段控件是**外层白胶囊、选中浅色凸起**（与直觉相反，勿改回）。

> 记一笔编辑器的表单规范见 `docs/agents/ui-bill-editor.md`。
