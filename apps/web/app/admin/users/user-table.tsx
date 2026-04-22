"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import Link from "next/link";
import { createUser } from "./actions";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Search,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  clerkId: string | null;
  marketingOptIn: boolean;
  whatsappOptIn: boolean;
  createdAt: string;
  _count: { orders: number; memberships: number; bookings: number };
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ROLES = ["", "USER", "COACH", "OPS", "ADMIN"] as const;
const ROLE_LABELS: Record<string, string> = {
  "": "All Roles",
  USER: "User",
  COACH: "Coach",
  OPS: "Ops",
  ADMIN: "Admin",
};

const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-accent/20 text-accent",
  OPS: "bg-primary/20 text-primary",
  COACH: "bg-info/20 text-info",
  USER: "bg-muted text-muted-foreground",
};

export function UserTable({ initialData }: { initialData: UsersResponse }) {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // Create form state
  const [createEmail, setCreateEmail] = useState("");
  const [createName, setCreateName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("USER");
  const [creating, startCreating] = useTransition();

  const fetchUsers = useCallback(
    async (s: string, r: string, p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (s) params.set("search", s);
        if (r) params.set("role", r);
        params.set("page", String(p));
        params.set("limit", "50");

        const res = await fetch(`/api/admin/users?${params}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json: UsersResponse = await res.json();
        setData(json);
      } catch {
        toast({ title: "Failed to load users", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchUsers(search, roleFilter, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, roleFilter, fetchUsers]);

  function handlePageChange(newPage: number) {
    setPage(newPage);
    fetchUsers(search, roleFilter, newPage);
  }

  function resetCreateForm() {
    setCreateEmail("");
    setCreateName("");
    setCreatePhone("");
    setCreatePassword("");
    setCreateRole("USER");
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!createEmail.trim()) return;

    startCreating(async () => {
      const result = await createUser({
        email: createEmail.trim(),
        name: createName.trim() || undefined,
        phone: createPhone.trim() || undefined,
        password: createPassword || undefined,
        role: createRole as "USER" | "COACH" | "OPS" | "ADMIN",
      });

      if (!result.success) {
        toast({
          title: "Failed to create user",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "User created" });
      resetCreateForm();
      setCreateOpen(false);
      // Refetch current page data
      fetchUsers(search, roleFilter, page);
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-light">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data.total} total user{data.total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Create User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search email, name, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card glass>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Users
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3 hidden md:table-cell">Name</th>
                  <th className="text-left p-3">Role</th>
                  <th className="text-left p-3 hidden md:table-cell">Orders</th>
                  <th className="text-left p-3 hidden md:table-cell">Subs</th>
                  <th className="text-left p-3 hidden md:table-cell">Opt-in</th>
                  <th className="text-left p-3 hidden lg:table-cell">Auth</th>
                  <th className="text-left p-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {data.users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-8 text-center text-muted-foreground"
                    >
                      {search || roleFilter
                        ? "No users match your filters."
                        : "No users yet."}
                    </td>
                  </tr>
                ) : (
                  data.users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <td className="p-3">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="text-primary hover:underline"
                        >
                          {user.email}
                        </Link>
                      </td>
                      <td className="p-3 hidden md:table-cell">{user.name || "-"}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${ROLE_STYLES[user.role] || ROLE_STYLES.USER}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3 hidden md:table-cell">{user._count.orders}</td>
                      <td className="p-3 hidden md:table-cell">{user._count.memberships}</td>
                      <td className="p-3 hidden md:table-cell">
                        {user.marketingOptIn && (
                          <span className="text-xs mr-1" title="Email opt-in">
                            M
                          </span>
                        )}
                        {user.whatsappOptIn && (
                          <span className="text-xs" title="WhatsApp opt-in">
                            W
                          </span>
                        )}
                        {!user.marketingOptIn && !user.whatsappOptIn && "-"}
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        {user.clerkId ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 h-4"
                          >
                            linked
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">
                            no auth
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border/40 mt-4">
              <p className="text-xs text-muted-foreground">
                Page {data.page} of {data.totalPages} ({data.total} users)
              </p>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= data.totalPages}
                  onClick={() => handlePageChange(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Create User Dialog ─── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Creates a new account in both Clerk (auth) and the database.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <Label htmlFor="create-email">Email *</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="user@example.com"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  placeholder="Full name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="create-phone">Phone</Label>
                <Input
                  id="create-phone"
                  placeholder="+91..."
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="create-password">Password</Label>
                <Input
                  id="create-password"
                  type="password"
                  placeholder="Optional"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Leave blank to send an invite email.
                </p>
              </div>
              <div>
                <Label htmlFor="create-role">Role</Label>
                <select
                  id="create-role"
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="USER">USER</option>
                  <option value="COACH">COACH</option>
                  <option value="OPS">OPS</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !createEmail.trim()}>
                {creating && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
