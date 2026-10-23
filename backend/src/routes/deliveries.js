import { Router } from "express";

import {
  getDeliveries,
  postCompleteDelivery,
  postStartDeliveries,
} from "../controllers/deliveryController.js";

export const deliveriesRouter = Router();

deliveriesRouter.get("/", getDeliveries);
deliveriesRouter.post("/start", postStartDeliveries);
deliveriesRouter.post("/:allocationId/complete", postCompleteDelivery);
