import { Check, Clock, Plus } from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "@/lib/demo-store";
import { Button } from "@/components/ui/button";
import type { Society } from "@/lib/types";

export function JoinButton({ society, size = "sm", full }: { society: Society; size?: "sm" | "default"; full?: boolean }) {
  const { membership, joinSociety, leaveSociety } = useDemo();
  const status = membership(society.id);
  const cls = full ? "w-full" : undefined;
  if (status === "member")
    return (
      <Button size={size} variant="outline" className={cls} onClick={() => { leaveSociety(society.id); toast(`You left ${society.shortName}`); }}>
        <Check />Joined
      </Button>
    );
  if (status === "pending")
    return (
      <Button size={size} variant="outline" className={cls} onClick={() => { leaveSociety(society.id); toast("Request withdrawn"); }}>
        <Clock />Request pending
      </Button>
    );
  return (
    <Button
      size={size}
      className={cls}
      onClick={() => {
        joinSociety(society.id);
        toast.success(society.requiresApproval ? `Request sent to ${society.shortName}` : `Welcome to ${society.shortName}!`);
      }}
    >
      <Plus />{society.requiresApproval ? "Request to join" : "Join society"}
    </Button>
  );
}
