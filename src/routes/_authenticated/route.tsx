import { createFileRoute, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/welcome" });
  },
  component: Gate,
});

function Gate() {
  const { ready, session, profile } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const needsOnboarding = ready && !!profile && !profile.onboarded_at && pathname !== "/onboarding";

  useEffect(() => {
    if (ready && !session) navigate({ to: "/welcome" });
    else if (needsOnboarding) navigate({ to: "/onboarding" });
  }, [ready, session, needsOnboarding, navigate]);

  if (!ready || !session || needsOnboarding) {
    return (
      <div className="space-y-4 p-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }
  return <Outlet />;
}
