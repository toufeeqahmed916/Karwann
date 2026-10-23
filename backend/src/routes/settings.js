import { Router } from "express";

import {
  getPriorityWeights,
  putPriorityWeights,
} from "../controllers/weightController.js";

export const settingsRouter = Router();

settingsRouter.get("/weights", getPriorityWeights);
settingsRouter.put("/weights", putPriorityWeights);
