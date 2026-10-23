import { advanceTime } from "../services/timeSimulationService.js";
import {
  applyScenario,
  deleteRoadBlock,
  listRoadBlocks,
  recalculateScenario,
  undoScenario,
} from "../services/scenarioService.js";

export async function postAdvanceTime(req, res, next) {
  try {
    res.json({ data: await advanceTime(req.body) });
  } catch (error) {
    next(error);
  }
}

export async function postRecalculate(req, res, next) {
  try {
    res.json({ data: await recalculateScenario(req.body) });
  } catch (error) {
    next(error);
  }
}

export async function postApply(_req, res, next) {
  try {
    res.json({ data: await applyScenario() });
  } catch (error) {
    next(error);
  }
}

export async function postUndo(_req, res, next) {
  try {
    res.json({ data: await undoScenario() });
  } catch (error) {
    next(error);
  }
}

export async function getBlocks(_req, res, next) {
  try {
    res.json({ data: await listRoadBlocks() });
  } catch (error) {
    next(error);
  }
}

export async function deleteBlock(req, res, next) {
  try {
    res.json({ data: await deleteRoadBlock(req.params.id) });
  } catch (error) {
    next(error);
  }
}
