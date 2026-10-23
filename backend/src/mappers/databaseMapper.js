function snakeToCamelKey(key) {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function camelToSnakeKey(key) {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function mapObjectKeys(value, keyMapper) {
  if (Array.isArray(value)) {
    return value.map((item) => mapObjectKeys(item, keyMapper));
  }

  if (value === null || typeof value !== "object" || value instanceof Date) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      keyMapper(key),
      mapObjectKeys(item, keyMapper),
    ]),
  );
}

export function mapDatabaseRow(row) {
  return mapObjectKeys(row, snakeToCamelKey);
}

export function mapDatabaseRows(rows = []) {
  return rows.map(mapDatabaseRow);
}

export function mapApiInput(input) {
  return mapObjectKeys(input, camelToSnakeKey);
}
