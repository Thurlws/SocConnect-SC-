// @vitest-environment node
import { decodeJwt } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";

import { liveKitConfig, mintCallToken } from "@/lib/livekit.server";

describe("LiveKit call tokens", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("reports live calls as unavailable without credentials", () => {
    vi.stubEnv("LIVEKIT_URL", "");
    expect(liveKitConfig()).toBeNull();
  });

  it("mints a token for the society room with the server-chosen identity and a 1 hour expiry", async () => {
    vi.stubEnv("LIVEKIT_URL", "wss://example.livekit.cloud");
    vi.stubEnv("LIVEKIT_API_KEY", "APIkey");
    vi.stubEnv("LIVEKIT_API_SECRET", "a-test-secret-that-is-long-enough-for-hs256");

    const a = await mintCallToken("room-1", "Test Person", "u-1-aaa");
    const claims = decodeJwt(a.token) as {
      sub: string;
      name: string;
      video: Record<string, unknown>;
    };

    expect(a.url).toBe("wss://example.livekit.cloud");
    expect(claims.name).toBe("Test Person");
    expect(claims.video).toMatchObject({
      room: "socconnect-room-1",
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
    });
    expect(claims.sub).toBe("u-1-aaa");
    expect((decodeJwt(a.token) as { exp: number; nbf?: number; iat?: number }).exp).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 3600 + 5);
  });
});
