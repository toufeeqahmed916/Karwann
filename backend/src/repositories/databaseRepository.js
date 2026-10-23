import { supabaseAdmin } from "../config/supabase.js";
import { TABLES } from "../constants/database.js";
import { AppError } from "../errors/AppError.js";

function databaseFailure(operation, error) {
  return new AppError({
    code: "DATABASE_ERROR",
    message: `Database operation failed: ${operation}`,
    statusCode: 500,
    cause: error,
  });
}

export function unwrapSupabaseResult(result, operation) {
  if (result.error) {
    throw databaseFailure(operation, result.error);
  }

  return result.data;
}

export async function checkDatabaseConnection() {
  const result = await supabaseAdmin
    .from(TABLES.settings)
    .select("key")
    .limit(1);

  unwrapSupabaseResult(result, "check connection");
  return true;
}

export async function getSeedCounts() {
  const targets = [
    ["depots", TABLES.depots],
    ["requests", TABLES.requests],
    ["aiMetadata", TABLES.requestAiMetadata],
    ["vehicles", TABLES.vehicles],
    ["requestItems", TABLES.requestItems],
  ];

  const counts = await Promise.all(
    targets.map(async ([label, table]) => {
      const result = await supabaseAdmin
        .from(table)
        .select("*", { count: "exact", head: true });

      if (result.error) {
        throw databaseFailure(`count ${table}`, result.error);
      }

      return [label, result.count ?? 0];
    }),
  );

  return Object.fromEntries(counts);
}
