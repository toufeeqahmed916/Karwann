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

  async function refresh(mode = realtimeReady ? "realtime" : "polling") {
    if (refreshing) return;
    refreshing = true;
    try {
      const deliveries = await getDeliveries(vehicleId);
      if (!stopped) {
        onData(deliveries);
        onConnectionChange?.({ paused: false, mode });
      }
    } catch (error) {
      if (!stopped) onConnectionChange?.({ paused: true, mode: "polling", error });
    } finally {
      refreshing = false;
    }
  }

  refresh("polling");
  const fallbackTimer = window.setInterval(() => {
    // Keep polling even while Realtime is connected. Delivery progress is
    // calculated by the server from elapsed time, so polling also advances it.
    refresh(realtimeReady ? "realtime" : "polling");
  }, 2000);

  const channel = realtimeClient
    ?.channel(`delivery-updates-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, () => refresh("realtime"))
    .on("postgres_changes", { event: "*", schema: "public", table: "allocations" }, () => refresh("realtime"))
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
    window.clearInterval(fallbackTimer);
    if (channel && realtimeClient) realtimeClient.removeChannel(channel);
  };
}
