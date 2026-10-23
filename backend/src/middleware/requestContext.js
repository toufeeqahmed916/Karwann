import { randomUUID } from "node:crypto";

const REQUEST_ID_HEADER = "X-Request-Id";
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

function incomingRequestId(req) {
  const value = req.get(REQUEST_ID_HEADER)?.trim();
  return value && SAFE_REQUEST_ID.test(value) ? value : null;
}

export function requestContext(req, res, next) {
  const requestId = incomingRequestId(req) ?? randomUUID();
  req.requestId = requestId;
  res.set(REQUEST_ID_HEADER, requestId);
  next();
}

