import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SurveySealLogo } from "@/components/logo";
import { AUTH_PROVIDERS } from "@/lib/auth-providers";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <SurveySealLogo className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl">Sign in to SurveySeal</CardTitle>
          <CardDescription>
            Sign in to create and manage verified surveys.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {AUTH_PROVIDERS.map((provider) => (
            <form
              key={provider.id}
              action={async () => {
                "use server";
                await signIn(provider.id, { redirectTo: "/dashboard" });
              }}
            >
              <Button
                variant="outline"
                className={`w-full ${!provider.enabled ? "opacity-40 pointer-events-none" : ""}`}
                type="submit"
                disabled={!provider.enabled}
              >
                {provider.icon}
                Continue with {provider.name}
                {!provider.enabled && <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>}
              </Button>
            </form>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
