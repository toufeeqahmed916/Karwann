# Karwan frontend demo runbook

## Before presenting

1. Start the Vite app and open `/dashboard`.
2. Press **Reset demo** and confirm the SQL seed state is restored.
3. Check that map tiles load and the Need heat layer is visible.
4. Keep `/driver` and `/tracker` ready in separate tabs.
5. Record one backup screen capture after the full rehearsal succeeds.

## Three to four minute flow

1. **Dashboard:** show KPIs, marker colours and switch heat layers.
2. **Requester:** submit a request and show its priority score.
3. **Allocation:** generate the plan, explain one reason and approve it.
4. **Driver:** start the trip and show the moving truck and progress bar.
5. **Tracker:** show the same delivery from the community view.
6. **Simulator:** reduce water stock, recalculate and show gained/lost requests.
7. **Dashboard:** return to Supply gap and close with the baseline comparison.

## Failure checks

- If live updates fail, the yellow paused banner appears and polling retries.
- If routes are unavailable, dashed estimated routes remain visible.
- If stock changes before approval, regenerate the allocation.
