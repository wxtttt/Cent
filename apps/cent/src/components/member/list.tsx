import { useState } from "react";
import { useMembers } from "@/hooks/use-member";
import PopupLayout from "@/layouts/popup-layout";
import { useIntl } from "@/locale";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export default function MemberList({
    onCancel,
}: {
    edit?: any;
    onCancel?: () => void;
    onConfirm?: (v: any) => void;
}) {
    const t = useIntl();
    const { members, addMember, updateMember } = useMembers();
    const [creating, setCreating] = useState(false);
    const [draft, setDraft] = useState("");
    const [editing, setEditing] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    const submitCreate = async () => {
        const name = draft.trim();
        if (name) {
            await addMember(name);
        }
        setDraft("");
        setCreating(false);
    };

    const submitRename = async (id: string) => {
        const name = editName.trim();
        if (name) {
            await updateMember(id, { name });
        }
        setEditing(null);
    };

    return (
        <PopupLayout
            onBack={onCancel}
            className="overflow-hidden h-full"
            title={t("member-management")}
            right={
                <Button variant="secondary" onClick={() => setCreating(true)}>
                    <i className="icon-[lucide--user-plus]" />
                    {t("add")}
                </Button>
            }
        >
            <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2">
                <div className="px-2 text-xs text-foreground/60">
                    {t("member-description")}
                </div>
                {creating && (
                    <div className="rounded-panel border border-rule bg-panel shadow-panel p-3 flex gap-2">
                        <Input
                            autoFocus
                            value={draft}
                            placeholder={t("member-name")}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") void submitCreate();
                            }}
                        />
                        <Button onClick={() => void submitCreate()}>
                            {t("confirm")}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => setCreating(false)}
                        >
                            {t("cancel")}
                        </Button>
                    </div>
                )}
                <div className="rounded-panel border border-rule bg-panel shadow-panel divide-y divide-rule">
                    {members.map((member) => (
                        <div
                            key={member.id}
                            className="flex items-center gap-2 px-3 py-2"
                        >
                            {editing === member.id ? (
                                <>
                                    <Input
                                        autoFocus
                                        value={editName}
                                        onChange={(e) =>
                                            setEditName(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                void submitRename(member.id);
                                            }
                                        }}
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            void submitRename(member.id)
                                        }
                                    >
                                        {t("confirm")}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="flex-1 min-w-0 truncate">
                                        {member.name}
                                    </div>
                                    {!member.active && (
                                        <span className="text-xs opacity-50">
                                            {t("member-inactive")}
                                        </span>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            setEditing(member.id);
                                            setEditName(member.name);
                                        }}
                                    >
                                        <i className="icon-[lucide--pencil]" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                            void updateMember(member.id, {
                                                active: !member.active,
                                            })
                                        }
                                    >
                                        {member.active
                                            ? t("member-disable")
                                            : t("member-enable")}
                                    </Button>
                                </>
                            )}
                        </div>
                    ))}
                    {members.length === 0 && (
                        <div className="p-4 text-sm text-center opacity-60">
                            {t("none")}
                        </div>
                    )}
                </div>
            </div>
        </PopupLayout>
    );
}
