import {
  addVehicle,
  adjustInventory,
  createDepot,
  listDepots,
  listStockLog,
  removeVehicle,
  updateDepot,
  updateVehicle,
} from "../services/inventoryService.js";

export async function postDepot(req, res, next) {
  try {
    res.status(201).json({ data: await createDepot(req.body) });
  } catch (error) {
    next(error);
  }
}

export async function getDepots(_req, res, next) {
  try {
    res.json({ data: await listDepots() });
  } catch (error) {
    next(error);
  }
}

export async function patchDepotInventory(req, res, next) {
  try {
    res.json({ data: await adjustInventory(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
}

export async function patchDepot(req, res, next) {
  try {
    res.json({ data: await updateDepot(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
}

export async function getStockLog(req, res, next) {
  try {
    res.json({ data: await listStockLog(req.query) });
  } catch (error) {
    next(error);
  }
}

export async function postDepotVehicle(req, res, next) {
  try {
    res.status(201).json({ data: await addVehicle(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
}

export async function patchDepotVehicle(req, res, next) {
  try {
    res.json({ data: await updateVehicle(req.params.id, req.params.vehicleId, req.body) });
  } catch (error) {
    next(error);
  }
}

export async function deleteDepotVehicle(req, res, next) {
  try {
    res.json({ data: await removeVehicle(req.params.id, req.params.vehicleId) });
  } catch (error) {
    next(error);
  }
}
