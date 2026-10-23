import {
  completeDelivery,
  listDeliveries,
  startDeliveries,
} from "../services/deliveryService.js";

export async function getDeliveries(req, res, next) {
  try {
    res.json({ data: await listDeliveries(req.query) });
  } catch (error) {
    next(error);
  }
}

export async function postStartDeliveries(req, res, next) {
  try {
    res.json({ data: await startDeliveries(req.body) });
  } catch (error) {
    next(error);
  }
}

export async function postCompleteDelivery(req, res, next) {
  try {
    res.json({
      data: await completeDelivery(req.params.allocationId, req.body),
    });
  } catch (error) {
    next(error);
  }
}
