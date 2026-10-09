import { createFileRoute, Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { pageHead } from "@/lib/seo";
import { PageHeader, SocietyCard, EmptyState } from "@/components/cards";
import { JoinButton } from "@/components/join-button";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/my-societies")({
  head: () => pageHead("My Societies", "The societies you've joined and requests you've sent."),
  component: MySocieties,
});

function MySocieties() {
  const { societies, membership } = useDemo();
  const joined = societies.filter((s) => membership(s.id) === "member");
  const pending = societies.filter((s) => membership(s.id) === "pending");
  return (
    <div className="space-y-10">
      <PageHeader title="My societies" subtitle="Your communities and pending requests." actions={<Button asChild variant="outline"><Link to="/societies">Find more</Link></Button>} />
      {joined.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{joined.map((s) => <SocietyCard key={s.id} society={s} action={<JoinButton society={s} full />} />)}</div>
      ) : (
        <EmptyState icon={Users} title="You haven't joined any societies" body="Discover communities that match your interests." action={<Button asChild size="sm"><Link to="/societies">Discover societies</Link></Button>} />
      )}
      {pending.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Pending requests</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{pending.map((s) => <SocietyCard key={s.id} society={s} action={<JoinButton society={s} full />} />)}</div>
        </section>
      )}
    </div>
  );
}
