"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";
import { AUTH_PROVIDERS } from "@/lib/auth-providers";
import { updateAuthProviders } from "@/lib/actions/survey";

interface AuthMethodsCardProps {
  surveyId: string;
  authProviders: string[];
}

export function AuthMethodsCard({ surveyId, authProviders: serverProviders }: AuthMethodsCardProps) {
  // Empty array means "all providers"
  const [selected, setSelected] = useState<Set<string>>(
    serverProviders.length > 0
      ? new Set(serverProviders)
      : new Set(AUTH_PROVIDERS.map((p) => p.id))
  );
  const [saving, setSaving] = useState(false);

  const allSelected = selected.size === AUTH_PROVIDERS.length;

  function toggleProvider(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Don't allow deselecting all
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      // If all are selected, save empty array (= no restriction)
      const providers = allSelected ? [] : Array.from(selected);
      await updateAuthProviders(surveyId, providers);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = (() => {
    if (serverProviders.length === 0) {
      return !allSelected;
    }
    if (selected.size !== serverProviders.length) return true;
    return !serverProviders.every((p) => selected.has(p));
  })();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Authentication Methods</CardTitle>
        </div>
        <CardDescription>
          Choose which sign-in options respondents can use. At least one must be selected.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          size="sm"
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
