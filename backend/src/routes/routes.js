import { Router } from "express";

import { getRoutePreview } from "../controllers/routeController.js";

export const routesRouter = Router();

routesRouter.get("/", getRoutePreview);
