"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@ru/ui";
import { toast } from "@/hooks/use-toast";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { updateUser, updateUserRole, deleteUser } from "../actions";

interface UserActionsProps {
  userId: string;
  currentRole: string;
  currentName: string | null;
  currentPhone: string | null;
  currentEmail: string;
  clerkId: string | null;
  marketingOptIn: boolean;
  whatsappOptIn: boolean;
  isSelf: boolean;
}

const ROLES = ["USER", "COACH", "OPS", "ADMIN"] as const;

export function UserActions({
  userId,
  currentRole,
  currentName,
  currentPhone,
  currentEmail,
  clerkId,
  marketingOptIn: initialMarketing,
  whatsappOptIn: initialWhatsapp,
  isSelf,
}: UserActionsProps) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState(currentName || "");
  const [editPhone, setEditPhone] = useState(currentPhone || "");
  const [editMarketing, setEditMarketing] = useState(initialMarketing);
  const [editWhatsapp, setEditWhatsapp] = useState(initialWhatsapp);

  // Delete form state
  const [confirmEmail, setConfirmEmail] = useState("");

  // Transitions for pending states
  const [saving, startSaving] = useTransition();
  const [editSaving, startEditSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();

  function handleRoleChange(newRole: string) {
    if (newRole === role) return;
    if (
      !confirm(
        `Change role from ${role} to ${newRole}? This takes effect immediately.`,
      )
    )
      return;

    startSaving(async () => {
      const result = await updateUserRole({ id: userId, role: newRole as "USER" | "COACH" | "OPS" | "ADMIN" });

      if (!result.success) {
        toast({
          title: "Update failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      setRole(newRole);
      toast({ title: `Role changed to ${newRole}` });
      router.refresh();
    });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();

    startEditSaving(async () => {
      const result = await updateUser({
        id: userId,
        name: editName.trim() || null,
        phone: editPhone.trim() || null,
        marketingOptIn: editMarketing,
        whatsappOptIn: editWhatsapp,
      });

      if (!result.success) {
        toast({
          title: "Update failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "User updated" });
      setEditOpen(false);
      router.refresh();
    });
  }

  function handleDelete() {
    startDeleting(async () => {
      const result = await deleteUser({ id: userId });

      if (!result.success) {
        toast({
          title: "Delete failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "User deleted" });
      router.push("/admin/users");
    });
  }

  return (
    <div className="flex items-center gap-3">
      {/* Role Selector */}
      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground">Role:</Label>
        <select
          value={role}
          onChange={(e) => handleRoleChange(e.target.value)}
          disabled={saving}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Clerk status */}
      {clerkId ? (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
          Clerk linked
        </Badge>
      ) : (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
          No auth
        </Badge>
      )}

      {/* Edit button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setEditOpen(true)}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      {/* Delete button */}
      {!isSelf && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => {
            setConfirmEmail("");
            setDeleteOpen(true);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      {/* ─── Edit Dialog ─── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Changes to name are synced to Clerk.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                placeholder="Full name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                placeholder="+91..."
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={editMarketing}
                  onChange={(e) => setEditMarketing(e.target.checked)}
                  className="rounded border-border"
                />
                Marketing opt-in
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={editWhatsapp}
                  onChange={(e) => setEditWhatsapp(e.target.checked)}
                  className="rounded border-border"
                />
                WhatsApp opt-in
              </label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditOpen(false)}
                disabled={editSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Dialog ─── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{currentEmail}</strong>
              {clerkId ? " from both Clerk and the database" : " from the database"}.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="confirm-email" className="text-sm">
                Type <code className="text-foreground">{currentEmail}</code> to
                confirm
              </Label>
              <Input
                id="confirm-email"
                placeholder={currentEmail}
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting || confirmEmail !== currentEmail}
              onClick={handleDelete}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
