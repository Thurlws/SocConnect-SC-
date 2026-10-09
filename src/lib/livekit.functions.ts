import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Whether real calls are available (LiveKit configured). */
export const getCallMode = createServerFn({ method: "GET" }).handler(async () => {
  const { liveKitConfig } = await import("./livekit.server");
  return { live: liveKitConfig() !== null };
});

const sha256 = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/**
 * Signed-in token: the room must be readable by the caller (RLS: member or committee of its
 * society). Name and identity come from the profile — anything the client sends is ignored.
 */
export const getCallToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ roomId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: room } = await supabase.from("call_rooms").select("id").eq("id", data.roomId).maybeSingle();
    if (!room) throw new Error("You need to be a member of this society to join its calls.");
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();
    const name = profile?.display_name || "Member";
    const identity = `u-${userId}-${crypto.randomUUID().slice(0, 6)}`;
    const { mintCallToken } = await import("./livekit.server");
    const token = await mintCallToken(room.id, name, identity);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("call_participants").insert({ room_id: room.id, user_id: userId, livekit_identity: identity });
    return { ...token, name };
  });

/** Committee only (enforced by RLS on call_invites): a guest link that expires and has a use limit. */
export const createCallInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ roomId: z.string().uuid(), hours: z.number().int().min(1).max(168), maxUses: z.number().int().min(1).max(500) }))
  .handler(async ({ data, context }) => {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    const code = Array.from(bytes, (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");
    const expires = new Date(Date.now() + data.hours * 3600_000).toISOString();
    const { error } = await context.supabase.from("call_invites").insert({
      room_id: data.roomId, code_hash: await sha256(code), created_by: context.userId, expires_at: expires, max_uses: data.maxUses,
    });
    if (error) throw new Error("Only the society's committee can create guest links.");
    return { code, expiresAt: expires };
  });

type InviteCheck =
  | { ok: true; inviteId: string; roomId: string; roomName: string; societyName: string; societyShort: string; accent: string; icon: string }
  | { ok: false; reason: string };

async function checkInvite(code: string): Promise<InviteCheck> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: inv } = await supabaseAdmin
    .from("call_invites")
    .select("id, room_id, expires_at, max_uses, uses, call_rooms(name, societies(name, short_name, accent, icon, status))")
    .eq("code_hash", await sha256(code))
    .maybeSingle();
  if (!inv) return { ok: false, reason: "This call link isn't valid. Ask whoever sent it for a new one." };
  if (new Date(inv.expires_at).getTime() < Date.now()) return { ok: false, reason: "This call link has expired. Ask the committee for a fresh one." };
  if (inv.uses >= inv.max_uses) return { ok: false, reason: "This call link has been used the maximum number of times. Ask for a new one." };
  const room = inv.call_rooms as unknown as { name: string; societies: { name: string; short_name: string; accent: string; icon: string; status: string } };
  if (room.societies.status !== "active") return { ok: false, reason: "This society's calls are no longer available." };
  return { ok: true, inviteId: inv.id, roomId: inv.room_id, roomName: room.name, societyName: room.societies.name, societyShort: room.societies.short_name, accent: room.societies.accent, icon: room.societies.icon };
}

const codeSchema = z.string().regex(/^[a-z0-9]{8,32}$/);

/** Public: what a guest link points at (no secrets, no member data). */
export const lookupGuestInvite = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: codeSchema }))
  .handler(async ({ data }) => {
    const r = await checkInvite(data.code);
    if (!r.ok) return r;
    return { ok: true as const, roomName: r.roomName, societyName: r.societyName, societyShort: r.societyShort, accent: r.accent, icon: r.icon };
  });

/** Public: a guest token for a valid code. Each join uses one of the link's uses. */
export const getGuestToken = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: codeSchema, name: z.string().trim().min(1).max(60) }))
  .handler(async ({ data }) => {
    const r = await checkInvite(data.code);
    if (!r.ok) throw new Error(r.reason);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv } = await supabaseAdmin.from("call_invites").select("uses").eq("id", r.inviteId).single();
    const { data: bumped } = await supabaseAdmin
      .from("call_invites").update({ uses: (inv?.uses ?? 0) + 1 }).eq("id", r.inviteId).eq("uses", inv?.uses ?? 0).select("id");
    if (!bumped?.length) throw new Error("Lots of people are joining at once — try again.");
    const name = `${data.name.replace(/[\u0000-\u001f\u007f]/g, "")} (guest)`;
    const identity = `g-${crypto.randomUUID().slice(0, 12)}`;
    const { mintCallToken } = await import("./livekit.server");
    const token = await mintCallToken(r.roomId, name, identity);
    await supabaseAdmin.from("call_participants").insert({ room_id: r.roomId, guest_name: name, livekit_identity: identity });
    return { ...token, name };
  });

/** Used by captions: valid for guests holding a live invite code. */
export async function inviteIsValid(code: string) {
  return (await checkInvite(code)).ok;
}
