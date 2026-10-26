import { createClient } from "@supabase/supabase-js";
import { getDeliveries } from "./api.js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const realtimeClient =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export function subscribeToDeliveryUpdates({ vehicleId, onData, onConnectionChange }) {
  let stopped = false;
  let realtimeReady = false;
  let refreshing = false;
  let hasActiveDelivery = false;
  let fallbackTimer = null;
  let lastRefreshAt = 0;

  function nextDelay() {
    if (document.hidden) return 30000;
    return hasActiveDelivery ? 2000 : 12000;
  }

  function schedule() {
    window.clearTimeout(fallbackTimer);
    if (!stopped) fallbackTimer = window.setTimeout(() => refresh(), nextDelay());
  }

  async function refresh(mode = realtimeReady ? "realtime" : "polling") {
    if (refreshing) return;
    refreshing = true;
    lastRefreshAt = Date.now();
    try {
      const deliveries = await getDeliveries(vehicleId);
      hasActiveDelivery = deliveries.some((delivery) => delivery.status === "in_transit");
      if (!stopped) {
        onData(deliveries);
        onConnectionChange?.({ paused: false, mode });
      }
    } catch (error) {
      if (!stopped) onConnectionChange?.({ paused: true, mode: "polling", error });
    } finally {
      refreshing = false;
      schedule();
    }
  }

  refresh("polling");

  function refreshNow(mode) {
    window.clearTimeout(fallbackTimer);
    // A delivery GET persists elapsed progress, which itself emits a Supabase
    // allocation event. Ignore that immediate echo to avoid a request loop.
    if (mode === "realtime" && Date.now() - lastRefreshAt < 1000) {
      schedule();
      return;
    }
    refresh(mode);
  }

  function onVisibilityChange() {
    if (document.hidden) schedule();
    else refreshNow(realtimeReady ? "realtime" : "polling");
  }
  document.addEventListener("visibilitychange", onVisibilityChange);

  const channel = realtimeClient
    ?.channel(`delivery-updates-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, () => refreshNow("realtime"))
    .on("postgres_changes", { event: "*", schema: "public", table: "allocations" }, () => refreshNow("realtime"))
    .subscribe((status) => {
      if (stopped) return;
      if (status === "SUBSCRIBED") {
        realtimeReady = true;
        onConnectionChange?.({ paused: false, mode: "realtime" });
      } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
        realtimeReady = false;
        onConnectionChange?.({ paused: true, mode: "polling" });
      }
    });

  return () => {
    stopped = true;
    window.clearTimeout(fallbackTimer);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    if (channel && realtimeClient) realtimeClient.removeChannel(channel);
  };
}
