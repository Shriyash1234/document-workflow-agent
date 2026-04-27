export function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeComparable(value: string) {
  return normalizeText(value).replace(/[.,]/g, "");
}

export function valuesMatch(found: string, expected: string) {
  const normalizedFound = normalizeComparable(found);
  const normalizedExpected = normalizeComparable(expected);

  return normalizedFound === normalizedExpected || normalizedFound.includes(normalizedExpected);
}
