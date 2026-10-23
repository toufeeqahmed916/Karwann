import {
  checkDatabaseConnection,
  getSeedCounts,
} from "../src/repositories/databaseRepository.js";

const EXPECTED_SEED_COUNTS = {
  depots: 3,
  requests: 12,
  vehicles: 6,
  requestItems: 41,
};

try {
  await checkDatabaseConnection();
  const actual = await getSeedCounts();
  const mismatches = Object.entries(EXPECTED_SEED_COUNTS).filter(
    ([name, expected]) => actual[name] !== expected,
  );

  if (mismatches.length > 0) {
    console.error("Supabase connected, but the demo seed counts do not match.");
    console.error({ expected: EXPECTED_SEED_COUNTS, actual });
    process.exitCode = 1;
  } else {
    console.log("Supabase connection and Karwan demo seed verified.");
    console.log(actual);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
