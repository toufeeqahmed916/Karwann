import { Router } from "express";

import {
  getRequest,
  getRequests,
  patchRequest,
  postRequest,
} from "../controllers/requestController.js";

export const requestsRouter = Router();

requestsRouter.get("/", getRequests);
requestsRouter.post("/", postRequest);
requestsRouter.get("/:id", getRequest);
requestsRouter.patch("/:id", patchRequest);
