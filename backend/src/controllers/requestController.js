import {
  createRequest,
  getRequestById,
  listRequests,
  updateRequest,
} from "../services/requestService.js";

export async function getRequests(req, res, next) {
  try {
    const requests = await listRequests(req.query);
    res.json({ data: requests });
  } catch (error) {
    next(error);
  }
}

export async function postRequest(req, res, next) {
  try {
    const request = await createRequest(req.body);
    res.status(201).json({ data: request });
  } catch (error) {
    next(error);
  }
}

export async function getRequest(req, res, next) {
  try {
    const request = await getRequestById(req.params.id);
    res.json({ data: request });
  } catch (error) {
    next(error);
  }
}

export async function patchRequest(req, res, next) {
  try {
    const request = await updateRequest(req.params.id, req.body);
    res.json({ data: request });
  } catch (error) {
    next(error);
  }
}
