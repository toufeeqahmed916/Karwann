import { getRoute } from "../src/services/routeService.js";
import { listDepots } from "../src/services/inventoryService.js";
import { listRequests } from "../src/services/requestService.js";

const [depots, requests] = await Promise.all([listDepots(), listRequests()]);
let completed = 0;

for (const depot of depots) {
  for (const request of requests) {
    const route = await getRoute({ depotId: depot.id, requestId: request.id });
    completed += 1;
    console.log(
      `${completed}/${depots.length * requests.length} ${depot.id}/${request.id} estimated=${route.estimated}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

console.log(`Route cache ready: ${completed} depot/request pairs.`);
