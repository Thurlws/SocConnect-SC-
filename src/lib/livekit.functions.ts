import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Whether real multi-person calls are available. Without LiveKit env vars, calls use simulated participants. */
export const getCallMode = createServerFn({ method: "GET" }).handler(async () => {
  const { liveKitConfig } = await import("./livekit.server");
  return { live: liveKitConfig() !== null };
});

export const getCallToken = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      roomId: z
        .string()
        .regex(/^[a-z0-9-]+$/i)
        .max(80),
      name: z.string().trim().min(1).max(60),
    }),
  )
  .handler(async ({ data }) => {
    const { mintCallToken } = await import("./livekit.server");
    return mintCallToken(data.roomId, data.name);
  });
