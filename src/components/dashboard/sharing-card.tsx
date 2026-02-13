"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2 } from "lucide-react";
import {
  inviteCollaborator,
  removeCollaborator,
  updateCollaboratorRole,
} from "@/lib/actions/sharing";
import type { CollaboratorRole } from "@/generated/prisma/client";

interface Collaborator {
  id: string;
  email: string;
  role: CollaboratorRole;
  acceptedAt: string | null;
}

interface SharingCardProps {
  surveyId: string;
  collaborators: Collaborator[];
}

export function SharingCard({ surveyId, collaborators }: SharingCardProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("VIEWER");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await inviteCollaborator(surveyId, email, role);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(collaboratorId: string) {
    try {
      await removeCollaborator(surveyId, collaboratorId);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRoleChange(
    collaboratorId: string,
    newRole: CollaboratorRole,
  ) {
    try {
      await updateCollaboratorRole(surveyId, collaboratorId, newRole);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Sharing</CardTitle>
        </div>
        <CardDescription>
          Invite collaborators to view or edit this survey.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleInvite} className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              type="email"
              placeholder="colleague@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={saving}
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as CollaboratorRole)}
            className="h-9 rounded-md border px-3 text-sm"
            disabled={saving}
          >
            <option value="VIEWER">Viewer</option>
            <option value="EDITOR">Editor</option>
          </select>
          <Button type="submit" disabled={saving || !email.trim()}>
            {saving ? "Inviting..." : "Invite"}
          </Button>
        </form>
        {error && <p className="text-sm text-red-500">{error}</p>}

        {collaborators.length > 0 && (
          <div className="space-y-2">
            {collaborators.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{c.email}</span>
                  {!c.acceptedAt && (
                    <Badge variant="outline" className="text-xs">
                      Pending
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={c.role}
                    onChange={(e) =>
                      handleRoleChange(
                        c.id,
                        e.target.value as CollaboratorRole,
                      )
                    }
                    className="h-8 rounded-md border px-2 text-sm"
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="EDITOR">Editor</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(c.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
