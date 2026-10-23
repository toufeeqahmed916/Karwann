import { getWeights, updateWeights } from "../services/weightService.js";

export async function getPriorityWeights(_req, res, next) {
  try {
    const weights = await getWeights();
    res.json({ data: weights });
  } catch (error) {
    next(error);
  }
}

export async function putPriorityWeights(req, res, next) {
  try {
    const result = await updateWeights(req.body);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}
