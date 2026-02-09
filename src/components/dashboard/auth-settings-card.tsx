"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Users } from "lucide-react";
import { AUTH_PROVIDERS } from "@/lib/auth-providers";
import { updateRespondentAuth } from "@/lib/actions/survey";

interface AuthSettingsCardProps {
  surveyId: string;
  requireLogin: boolean;
  authProviders: string[];
}

export function AuthSettingsCard({
  surveyId,
  requireLogin: serverRequireLogin,
  authProviders: serverProviders,
}: AuthSettingsCardProps) {
  const [requireLogin, setRequireLogin] = useState(serverRequireLogin);
  // Empty array = all providers (backward compat for existing surveys)
  const [selected, setSelected] = useState<Set<string>>(
    serverProviders.length > 0
      ? new Set(serverProviders)
      : new Set(AUTH_PROVIDERS.map((p) => p.id))
  );
  const [saving, setSaving] = useState(false);

  function toggleProvider(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const hasChanges = (() => {
    if (requireLogin !== serverRequireLogin) return true;
    const serverSet = serverProviders.length > 0
      ? new Set(serverProviders)
      : new Set(AUTH_PROVIDERS.map((p) => p.id));
    if (selected.size !== serverSet.size) return true;
    return !Array.from(serverSet).every((p) => selected.has(p));
  })();

  async function handleSave() {
    setSaving(true);
    try {
      await updateRespondentAuth(surveyId, requireLogin, Array.from(selected));
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Respondent Authentication</CardTitle>
        </div>
        <CardDescription>
          Control whether respondents must sign in before taking the survey.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="requireLogin"
            checked={requireLogin}
            onChange={(e) => setRequireLogin(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <div>
            <Label htmlFor="requireLogin" className="font-medium">
              Require sign-in to take this survey
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              When enabled, respondents must sign in before starting.
              When disabled, respondents enter only an email address, making the survey anonymous.
            </p>
          </div>
        </div>

        {requireLogin && (
          <div className="space-y-2 pl-7">
            <Label className="text-sm font-medium">Authentication Methods</Label>
            <div className="space-y-2">
              {AUTH_PROVIDERS.map((provider) => (
                <label
                  key={provider.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    provider.enabled
                      ? "cursor-pointer hover:bg-accent/50"
                      : "opacity-40 cursor-not-allowed"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={provider.enabled ? selected.has(provider.id) : false}
                    onChange={() => provider.enabled && toggleProvider(provider.id)}
                    disabled={!provider.enabled}
                    className="h-4 w-4"
                  />
                  {provider.icon}
                  <span className="text-sm font-medium">{provider.name}</span>
                  {!provider.enabled && <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              At least one method must be selected.
            </p>
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
