import { getRoute } from "../services/routeService.js";

export async function getRoutePreview(req, res, next) {
  try {
    res.json({ data: await getRoute(req.query) });
  } catch (error) {
    next(error);
  }
}
