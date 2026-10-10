import { createFileRoute, Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { useData } from "@/lib/api/store";
import { pageHead } from "@/lib/seo";
import { PageHeader, SocietyCard, EmptyState } from "@/components/cards";
import { JoinButton } from "@/components/join-button";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/my-societies")({
  head: () => pageHead("My Societies", "The societies you've joined and requests you've sent."),
  component: MySocieties,
});

function MySocieties() {
  const { societies, membership } = useData();
  const joined = societies.filter((s) => membership(s.id) === "member");
  const pending = societies.filter((s) => membership(s.id) === "pending");
  return (
    <div className="space-y-10">
      <PageHeader title="My societies" subtitle="Societies you've joined, and any requests still waiting on a committee." actions={<Button asChild variant="outline"><Link to="/societies">Find more</Link></Button>} />
      {joined.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{joined.map((s) => <SocietyCard key={s.id} society={s} action={<JoinButton society={s} full />} />)}</div>
      ) : (
        <EmptyState icon={Users} title="You haven't joined any societies" body="Find a society that does something you're into and join it here." action={<Button asChild size="sm"><Link to="/societies">Find societies</Link></Button>} />
      )}
      {pending.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Waiting for approval</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{pending.map((s) => <SocietyCard key={s.id} society={s} action={<JoinButton society={s} full />} />)}</div>
        </section>
      )}
    </div>
  );
}
