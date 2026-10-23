import { Router } from "express";

import {
  checkDatabaseConnection,
  getSeedCounts,
} from "../repositories/databaseRepository.js";
import { AI_INTEGRATION_CONTRACT } from "../constants/integration.js";

export const healthRouter = Router();

healthRouter.get("/live", (_req, res) => {
  res.json({
    data: {
      status: "ok",
      service: "karwan-backend",
    },
  });
});

healthRouter.get("/ready", async (_req, res, next) => {
  try {
    await checkDatabaseConnection();
    const seedCounts = await getSeedCounts();

    res.json({
      data: {
        status: "ready",
        database: "connected",
        seedCounts,
        aiIntegration: AI_INTEGRATION_CONTRACT,
      },
    });
  } catch (error) {
    next(error);
  }
});
