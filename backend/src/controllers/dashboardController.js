import { getDashboard } from "../services/dashboardService.js";

export async function getDashboardSummary(_req, res, next) {
  try {
    res.json({ data: await getDashboard() });
  } catch (error) {
    next(error);
  }
}
