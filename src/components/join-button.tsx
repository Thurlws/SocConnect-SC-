import { Check, Clock, Plus } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/api/store";
import type { Outcome } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Society } from "@/lib/types";

const report = async (p: Promise<Outcome>, message: string, success = false) => {
  const o = await p;
  if (!o.ok) toast.error(o.error);
  else if (success) toast.success(message);
  else toast(message);
};

export function JoinButton({ society, size = "sm", full }: { society: Society; size?: "sm" | "default"; full?: boolean }) {
  const { membership, joinSociety, leaveSociety, cancelRequest } = useData();
  const status = membership(society.id);
  const cls = full ? "w-full" : undefined;
  if (status === "member")
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size={size} variant="outline" className={cls} aria-label={`Joined ${society.shortName}. Leave society`}>
            <Check />Joined
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave {society.shortName}?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll lose access to members-only discussions, calls and resources.
              {society.requiresApproval && " Rejoining needs committee approval."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={() => report(leaveSociety(society.id), `You left ${society.shortName}`)}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  if (status === "pending")
    return (
      <Button size={size} variant="outline" className={cls} title="Cancel your request" onClick={() => report(cancelRequest(society.id), "Request withdrawn")}>
        <Clock />Pending · cancel
      </Button>
    );
  return (
    <Button
      size={size}
      className={cls}
      onClick={() =>
        report(joinSociety(society.id), society.requiresApproval ? `Request sent to ${society.shortName}` : `Welcome to ${society.shortName}!`, true)
      }
    >
      <Plus />{society.requiresApproval ? "Request to join" : "Join society"}
    </Button>
  );
}
