// Minimal subset of public-frontend/lib/listingUtils.ts — pure helpers only.
// Verbatim implementations; the full file pulls provinceLandingPages (not needed here).
// Needed by: lib/quickSearchUtils.ts (formatFullNumber) and
// components/QuickSearchMobileFilters.tsx (formatFullNumber, formatFloorLoadLabel).

export const toSafeString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
};

export const toSafeTrimmedString = (value: unknown): string =>
  toSafeString(value).trim();

export const extractNumericParts = (value: string): string[] => {
  const matches = value.match(/\d+(?:\.\d+)?/g);
  return matches ? matches : [];
};

export const formatFullNumber = (value: string): string => {
  const trimmed = toSafeTrimmedString(value);
  if (!trimmed) return "";
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return trimmed;
  return Math.abs(num).toLocaleString("en-US");
};

export const formatFloorLoadLabel = (value: string): string => {
  const normalized = toSafeTrimmedString(value);
  if (!normalized) return "";

  const directMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:tons?|ton|t)?\s*(?:per|\/)\s*(?:sq\.?\s*m|sqm|sq\.m\.?|m2|m²)/i,
  );
  if (directMatch?.[1]) {
    return `${directMatch[1]} ton/sqm`;
  }

  const numberOnly = normalized.match(/\d+(?:\.\d+)?/);
  if (
    numberOnly?.[0] &&
    /tons?|ton|t/i.test(normalized) &&
    /(sq\.?\s*m|sqm|m2|m²)/i.test(normalized)
  ) {
    return `${numberOnly[0]} ton/sqm`;
  }

  return normalized;
};
