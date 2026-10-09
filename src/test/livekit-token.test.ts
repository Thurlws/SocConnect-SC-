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

  it("mints a token for the society room with a unique identity", async () => {
    vi.stubEnv("LIVEKIT_URL", "wss://example.livekit.cloud");
    vi.stubEnv("LIVEKIT_API_KEY", "APIkey");
    vi.stubEnv("LIVEKIT_API_SECRET", "a-test-secret-that-is-long-enough-for-hs256");

    const a = await mintCallToken("compsoc-huddle", "Alex Morgan");
    const b = await mintCallToken("compsoc-huddle", "Alex Morgan");
    const claims = decodeJwt(a.token) as {
      sub: string;
      name: string;
      video: Record<string, unknown>;
    };

    expect(a.url).toBe("wss://example.livekit.cloud");
    expect(claims.name).toBe("Alex Morgan");
    expect(claims.video).toMatchObject({
      room: "socconnect-compsoc-huddle",
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
    });
    // Same person on two laptops must not share an identity, or LiveKit kicks the first one out.
    expect(claims.sub).not.toBe((decodeJwt(b.token) as { sub: string }).sub);
  });
});
