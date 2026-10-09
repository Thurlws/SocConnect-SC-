import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getCallMode } from "@/lib/livekit.functions";

export type CallMode = "checking" | "live" | "simulated";

// One request per page load, shared by every component that asks.
let cached: Promise<boolean> | null = null;

/** "live" when LiveKit is configured (real multi-person calls), otherwise "simulated". */
export function useCallMode(): CallMode {
  const fetchMode = useServerFn(getCallMode);
  const [mode, setMode] = useState<CallMode>("checking");
  useEffect(() => {
    let cancelled = false;
    cached ??= fetchMode()
      .then((r) => r.live)
      .catch(() => {
        cached = null;
        return false;
      });
    cached.then((live) => !cancelled && setMode(live ? "live" : "simulated"));
    return () => {
      cancelled = true;
    };
  }, [fetchMode]);
  return mode;
}
