"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@ru/ui";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { promoteCoach, updateCoachModalities, demoteCoach } from "./actions";

interface Coach {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  coachModalities: string[];
  createdAt: string;
  _count: { coachedSessions: number };
}

interface CoachManagerProps {
  initialCoaches: Coach[];
  allModalities: string[];
  defaultCoachEmail: string;
}

export function CoachManager({
  initialCoaches,
  allModalities,
  defaultCoachEmail,
}: CoachManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addModalities, setAddModalities] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  function handleAddCoach() {
    if (!addEmail.trim()) return;
    startTransition(async () => {
      const result = await promoteCoach({
        email: addEmail.trim(),
        modalities: addModalities,
      });

      if (result.success) {
        setAddEmail("");
        setAddModalities([]);
        setShowAdd(false);
        toast({ title: "Coach added" });
        router.refresh();
      } else {
        toast({
          title: "Failed to add coach",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  function handleUpdateModalities(coachId: string, modalities: string[]) {
    setSavingId(coachId);
    startTransition(async () => {
      const result = await updateCoachModalities({ id: coachId, modalities });

      if (result.success) {
        toast({ title: "Modalities updated" });
        router.refresh();
      } else {
        toast({
          title: "Update failed",
          description: result.error,
          variant: "destructive",
        });
      }
      setSavingId(null);
    });
  }

  function handleRemoveCoach(coachId: string) {
    const coach = initialCoaches.find((c) => c.id === coachId);
    const msg =
      coach?.role === "ADMIN"
        ? `Clear coaching modalities for ${coach?.name || coach?.email}?`
        : `Remove ${coach?.name || coach?.email} as coach? They'll be demoted to USER role.`;
    if (!confirm(msg)) return;

    setRemovingId(coachId);
    startTransition(async () => {
      const result = await demoteCoach({ id: coachId });

      if (result.success) {
        toast({ title: "Coach removed" });
        router.refresh();
      } else {
        toast({
          title: "Failed to remove coach",
          description: result.error,
          variant: "destructive",
        });
      }
      setRemovingId(null);
    });
  }

  function toggleModality(
    current: string[],
    modality: string,
    coachId: string,
  ) {
    const updated = current.includes(modality)
      ? current.filter((m) => m !== modality)
      : [...current, modality];
    handleUpdateModalities(coachId, updated);
  }

  return (
    <div>
      {/* Add Coach */}
      <div className="mb-6">
        {showAdd ? (
          <Card glass>
            <CardHeader>
              <CardTitle className="text-base">Add Coach</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="coach-email" className="text-sm">
                    User Email
                  </Label>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    The user must already exist. They will be promoted to COACH role.
                  </p>
                  <Input
                    id="coach-email"
                    type="email"
                    placeholder="coach@example.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">Modalities</Label>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Select what this coach can teach.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {allModalities.map((mod) => (
                      <button
                        key={mod}
                        type="button"
                        onClick={() =>
                          setAddModalities((prev) =>
                            prev.includes(mod)
                              ? prev.filter((m) => m !== mod)
                              : [...prev, mod],
                          )
                        }
                        className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                          addModalities.includes(mod)
                            ? "bg-primary/20 text-primary border-primary/40"
                            : "bg-muted/50 text-muted-foreground border-border hover:border-primary/30"
                        }`}
                      >
                        {mod}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={isPending || !addEmail.trim()}
                    onClick={handleAddCoach}
                  >
                    {isPending && showAdd && (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    )}
                    Add Coach
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAdd(false);
                      setAddEmail("");
                      setAddModalities([]);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Coach
          </Button>
        )}
      </div>

      {/* Coach Cards */}
      {initialCoaches.length === 0 ? (
        <Card glass>
          <CardContent className="py-12 text-center text-muted-foreground">
            No coaches yet. Click &ldquo;Add Coach&rdquo; to promote a user.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {initialCoaches.map((coach) => {
            const isDefault = coach.email === defaultCoachEmail;
            return (
              <Card glass key={coach.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                        {coach.name?.charAt(0) || "C"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {coach.name || "Unnamed"}
                          </span>
                          {coach.role === "ADMIN" && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 h-4"
                            >
                              admin
                            </Badge>
                          )}
                          {isDefault && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-4 text-primary border-primary/40"
                            >
                              default
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {coach._count.coachedSessions} session
                            {coach._count.coachedSessions !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {coach.email}
                          {coach.phone ? ` · ${coach.phone}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Right: Remove */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      disabled={removingId === coach.id}
                      onClick={() => handleRemoveCoach(coach.id)}
                    >
                      {removingId === coach.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Modalities */}
                  <div className="mt-3 pt-3 border-t border-border/40">
                    <p className="text-xs text-muted-foreground mb-2">
                      Modalities
                      {savingId === coach.id && (
                        <Loader2 className="inline h-3 w-3 animate-spin ml-1" />
                      )}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {allModalities.map((mod) => {
                        const active = coach.coachModalities.includes(mod);
                        return (
                          <button
                            key={mod}
                            type="button"
                            disabled={savingId === coach.id}
                            onClick={() =>
                              toggleModality(
                                coach.coachModalities,
                                mod,
                                coach.id,
                              )
                            }
                            className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                              active
                                ? "bg-primary/20 text-primary border-primary/40"
                                : "bg-transparent text-muted-foreground/60 border-border/50 hover:border-primary/30 hover:text-muted-foreground"
                            }`}
                          >
                            {active && <span className="mr-0.5">·</span>}
                            {mod}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
