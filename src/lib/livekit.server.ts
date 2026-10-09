// Server-only: LiveKit credentials never reach the browser.
import { AccessToken } from "livekit-server-sdk";

export function liveKitConfig() {
  const url = process.env["LIVEKIT_URL"];
  const apiKey = process.env["LIVEKIT_API_KEY"];
  const apiSecret = process.env["LIVEKIT_API_SECRET"];
  return url && apiKey && apiSecret ? { url, apiKey, apiSecret } : null;
}

/** Short-lived token that lets one browser join one SocConnect call room. */
export async function mintCallToken(roomId: string, name: string) {
  const cfg = liveKitConfig();
  if (!cfg)
    throw new Error(
      "Live calls aren't configured. Set LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET.",
    );
  // Random suffix: two laptops signed in as the same demo user must not kick each other out.
  const identity = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${crypto.randomUUID().slice(0, 8)}`;
  const token = new AccessToken(cfg.apiKey, cfg.apiSecret, { identity, name, ttl: "2h" });
  token.addGrant({
    room: `socconnect-${roomId}`,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return { url: cfg.url, token: await token.toJwt() };
}
