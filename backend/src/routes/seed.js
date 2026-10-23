import { Router } from "express";

import { postResetDemo } from "../controllers/resetController.js";

export const seedRouter = Router();

seedRouter.post("/reset", postResetDemo);
