import { supabaseAdmin } from "../config/supabase.js";
import { TABLES } from "../constants/database.js";
import { unwrapSupabaseResult } from "./databaseRepository.js";

export async function findRecentAuthenticityCandidates(since) {
  const requestResult = await supabaseAdmin
    .from(TABLES.requests)
    .select("id,area,lat,lng,created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });
  const requests = unwrapSupabaseResult(requestResult, "read recent requests for authenticity review");
  if (!requests.length) return [];

  const metadataResult = await supabaseAdmin
    .from(TABLES.requestAiMetadata)
    .select("request_id,raw_text,ip_hash")
    .in("request_id", requests.map((request) => request.id));
  const metadata = unwrapSupabaseResult(metadataResult, "read authenticity metadata");
  const byRequestId = new Map(metadata.map((row) => [row.request_id, row]));

  return requests.map((request) => {
    const detail = byRequestId.get(request.id) ?? {};
    return {
      id: request.id,
      area: request.area,
      lat: request.lat,
      lng: request.lng,
      createdAt: request.created_at,
      complaintText: detail.raw_text ?? "",
      ipHash: detail.ip_hash ?? null,
    };
  });
}

export async function saveAuthenticityReview(requestId, source, review) {
  const result = await supabaseAdmin.from(TABLES.requestAiMetadata).upsert({
    request_id: requestId,
    raw_text: source.complaintText || null,
    ip_hash: source.ipHash,
    credibility_score: review.score,
    credibility_band: review.band,
    credibility_flags: review.flags,
    credibility_reasons: review.reasons,
    matched_request_ids: review.matchedRequestIds,
    verification_status: review.verificationStatus,
    updated_at: new Date().toISOString(),
  }, { onConflict: "request_id" });

  unwrapSupabaseResult(result, "save request authenticity review");
}

export async function findAuthenticityReviewsByRequestIds(requestIds) {
  if (!requestIds.length) return [];
  const result = await supabaseAdmin
    .from(TABLES.requestAiMetadata)
    .select("request_id,credibility_score,credibility_band,credibility_flags,credibility_reasons,matched_request_ids,verification_status")
    .in("request_id", requestIds);
  return unwrapSupabaseResult(result, "read request authenticity reviews");
}
