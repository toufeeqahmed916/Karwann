import { resetDemo } from "../services/resetService.js";

export async function postResetDemo(req, res, next) {
  try {
    res.json({ data: await resetDemo(req.body) });
  } catch (error) {
    next(error);
  }
}
