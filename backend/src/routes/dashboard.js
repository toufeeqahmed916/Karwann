import { Router } from "express";

import { getDashboardSummary } from "../controllers/dashboardController.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", getDashboardSummary);
