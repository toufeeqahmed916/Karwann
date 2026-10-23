import { Router } from "express";

import {
  deleteBlock,
  getBlocks,
  postAdvanceTime,
  postApply,
  postRecalculate,
  postUndo,
} from "../controllers/simulationController.js";

export const simulateRouter = Router();

simulateRouter.post("/advance-time", postAdvanceTime);
simulateRouter.post("/recalculate", postRecalculate);
simulateRouter.post("/apply", postApply);
simulateRouter.post("/undo", postUndo);
simulateRouter.get("/blocks", getBlocks);
simulateRouter.delete("/blocks/:id", deleteBlock);
