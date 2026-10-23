import { Router } from "express";

import {
  deleteDepotVehicle,
  getDepots,
  patchDepot,
  patchDepotInventory,
  patchDepotVehicle,
  postDepot,
  postDepotVehicle,
} from "../controllers/inventoryController.js";

export const depotsRouter = Router();

depotsRouter.get("/", getDepots);
depotsRouter.post("/", postDepot);
depotsRouter.patch("/:id/inventory", patchDepotInventory);
depotsRouter.post("/:id/vehicles", postDepotVehicle);
depotsRouter.patch("/:id/vehicles/:vehicleId", patchDepotVehicle);
depotsRouter.delete("/:id/vehicles/:vehicleId", deleteDepotVehicle);
depotsRouter.patch("/:id", patchDepot);
