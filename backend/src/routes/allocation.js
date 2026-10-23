import { Router } from "express";

import {
  getCurrentAllocation,
  postApproveAllocation,
  postGenerateAllocation,
} from "../controllers/allocationController.js";

export const allocationRouter = Router();

allocationRouter.get("/", getCurrentAllocation);
allocationRouter.post("/generate", postGenerateAllocation);
allocationRouter.post("/approve", postApproveAllocation);
