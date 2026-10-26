import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestContext } from "./middleware/requestContext.js";
import { responseProtection } from "./middleware/responseProtection.js";
import { allocationRouter } from "./routes/allocation.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { deliveriesRouter } from "./routes/deliveries.js";
import { depotsRouter } from "./routes/depots.js";
import { healthRouter } from "./routes/health.js";
import { requestsRouter } from "./routes/requests.js";
import { routesRouter } from "./routes/routes.js";
import { seedRouter } from "./routes/seed.js";
import { settingsRouter } from "./routes/settings.js";
import { simulateRouter } from "./routes/simulate.js";
import { stockLogRouter } from "./routes/stockLog.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(requestContext);
  app.use(responseProtection);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.clientOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(null, false);
      },
      exposedHeaders: ["X-Request-Id"],
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.use("/health", healthRouter);
  app.use("/api/allocation", allocationRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/deliveries", deliveriesRouter);
  app.use("/api/depots", depotsRouter);
  app.use("/api/requests", requestsRouter);
  app.use("/api/routes", routesRouter);
  app.use("/api/seed", seedRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/simulate", simulateRouter);
  app.use("/api/stock-log", stockLogRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

// Vercel's Node runtime imports this module and requires a default function or
// server export. Express applications are request-handler functions.
const app = createApp();

export default app;
