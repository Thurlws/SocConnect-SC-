import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { CallExperience } from "@/components/call-experience";
import { EmptyState } from "@/components/cards";
import { JoinButton } from "@/components/join-button";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/call/$roomId")({
  head: () => ({
    meta: [
      { title: "Call · SocConnect" },
      { name: "description", content: "Join a society voice and video call with live captions and an AI recap." },
      { property: "og:title", content: "Call · SocConnect" },
      { property: "og:description", content: "Join a society voice and video call with live captions and an AI recap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CallPage,
});

function CallPage() {
  const { roomId } = Route.useParams();
  const { getRoom, getSociety, membership, user } = useDemo();
  const room = getRoom(roomId);
  const society = room ? getSociety(room.societyId) : undefined;

  if (!room || !society) return <EmptyState title="Call not found" body="This room may have been removed." action={<Button asChild><Link to="/calls">Back to calls</Link></Button>} />;
  if (membership(society.id) !== "member") return <EmptyState icon={Lock} title="Calls are for members" body={`Join ${society.shortName} to hop into its rooms.`} action={<JoinButton society={society} />} />;

  return <CallExperience room={room} society={society} defaultName={user.name} />;
}
