import {
  approveAllocation,
  generateAllocation,
  getAllocation,
} from "../services/allocationService.js";

export async function postGenerateAllocation(req, res, next) {
  try {
    res.json({ data: await generateAllocation(req.body) });
  } catch (error) {
    next(error);
  }
}

export async function postApproveAllocation(req, res, next) {
  try {
    res.json({ data: await approveAllocation(req.body) });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentAllocation(_req, res, next) {
  try {
    res.json({ data: await getAllocation() });
  } catch (error) {
    next(error);
  }
}
