import { Router } from "express";

import { getStockLog } from "../controllers/inventoryController.js";

export const stockLogRouter = Router();

stockLogRouter.get("/", getStockLog);
