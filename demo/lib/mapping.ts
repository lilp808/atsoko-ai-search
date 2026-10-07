// Mapping layer: Typhoon AI filters (API vocabulary) -> website listing slugs.
// AI contract (AI-PROMPT-CONTRACT.md) emits API values like "For Rent"/"Warehouse".
// The main site (/th/listing) uses lowercase slugs like "rent"/"warehouse".

export type AiFilters = {
  status?: string;
  type?: string;
  province?: string;
  district?: string;
  sub_district?: string;
  size_min?: number;
  size_max?: number;
  price_min?: number;
  price_max?: number;
  price_mode?: string;
  features?: string[];
  zone_types?: string[];
  min_height?: number;
  max_height?: number;
  floor_load?: number;
  clear_height?: string;
  keyword?: string;
  property_id?: string;
  sort?: string;
  confidence?: number;
  explanation_th?: string;
  [k: string]: unknown;
};

// Keys the AI is allowed to emit (AI-PROMPT-CONTRACT.md allowlist).
export const FILTER_ALLOWLIST = [
  "status",
  "type",
  "province",
  "district",
  "sub_district",
  "size_min",
  "size_max",
  "price_min",
  "price_max",
  "price_mode",
  "features",
  "zone_types",
  "min_height",
  "max_height",
  "floor_load",
  "clear_height",
  "keyword",
  "property_id",
  "sort",
] as const;

// Product defaults (confirmed): status -> rent, type -> warehouse.
// Applied in code post-processing, NOT in the prompt — AI still omits when unsure.
export const DEFAULT_STATUS_API = "For Rent";
export const DEFAULT_TYPE_API = "Warehouse";

export function stripToAllowlist(raw: Record<string, unknown>): AiFilters {
  const out: AiFilters = {};
  for (const k of FILTER_ALLOWLIST) {
    const v = raw[k];
    if (v !== undefined && v !== null && v !== "") out[k] = v as never;
  }
  return out;
}

// Safety net: backend location match is exact LOWER(TRIM()) on English dropdown
// values — a Thai-script value guarantees zero results. Drop it and keep the
// text in keyword (fuzzy search) instead of sending a doomed query.
export function sanitizeLocations(f: AiFilters): AiFilters {
  const out = { ...f };
  const thai = /[\u0E00-\u0E7F]/;
  const dropped: string[] = [];
  for (const k of ["province", "district", "sub_district"] as const) {
    const v = out[k];
    if (typeof v === "string" && thai.test(v)) {
      dropped.push(v);
      delete out[k];
    }
  }
  if (dropped.length > 0) {
    const kw = typeof out.keyword === "string" ? out.keyword : "";
    out.keyword = [kw, ...dropped].filter(Boolean).join(" ").slice(0, 200) || undefined;
  }
  return out;
}

export function applyDefaults(f: AiFilters): { filters: AiFilters; defaultedKeys: string[] } {
  const filters = { ...f };
  const defaultedKeys: string[] = [];
  // Forced default rent: covers missing/uncertain AND explicit "For Rent & Sale"
  // (website has no rent&sale listing filter).
  if (!filters.status || filters.status === "For Rent & Sale") {
    filters.status = DEFAULT_STATUS_API;
    defaultedKeys.push("status");
  }
  if (!filters.type) {
    filters.type = DEFAULT_TYPE_API;
    defaultedKeys.push("type");
  }
  return { filters, defaultedKeys };
}

const STATUS_TO_SLUG: Record<string, string> = {
  "for rent": "rent",
  "for sale": "sale",
};

const TYPE_TO_SLUG: Record<string, string> = {
  warehouse: "warehouse",
  factory: "factory",
  land: "land",
  // Main site nav has no "office" type (only warehouse/factory/showroom).
  // Fall back to default warehouse instead of sending a slug the site ignores.
  office: "warehouse",
};

// Querystring for verifying against GET /api/properties (API vocabulary).
// Arrays (features/zone_types) serialize comma-separated — backend accepts
// comma-separated or JSON array for both.
export function buildApiQuery(f: AiFilters): string {
  const p = new URLSearchParams();
  for (const k of FILTER_ALLOWLIST) {
    const v = f[k];
    if (v !== undefined && v !== null && v !== "")
      p.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

// Querystring for redirecting to the main site (slug vocabulary).
export function buildWebsiteQuery(f: AiFilters): string {
  const p = new URLSearchParams();
  if (f.status) {
    const slug = STATUS_TO_SLUG[String(f.status).toLowerCase()] ?? "rent";
    p.set("status", slug);
  }
  if (f.type) {
    const slug = TYPE_TO_SLUG[String(f.type).toLowerCase()] ?? "warehouse";
    p.set("type", slug);
  }
  for (const k of [
    "province",
    "district",
    "sub_district",
    "size_min",
    "size_max",
    "price_min",
    "price_max",
    "features",
    "zone_types",
    "min_height",
    "max_height",
    "clear_height",
    "keyword",
    "sort",
  ] as const) {
    const v = f[k];
    if (v !== undefined && v !== null && v !== "")
      p.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  // floor_load: website example format is "1 ton per sqm" — backend parseFloat()
  // reads the leading number, so this form satisfies both sides.
  const flv: unknown = f.floor_load;
  if (flv !== undefined && flv !== null && flv !== "") {
    const raw = String(flv).trim();
    p.set("floor_load", /^\d+(\.\d+)?$/.test(raw) ? `${raw} ton per sqm` : raw);
  }
  // Full property-ID match goes to the listing via keyword for now
  // (main-site detail URL pattern is still unknown).
  if (f.property_id) p.set("keyword", String(f.property_id));
  const s = p.toString();
  return s ? `?${s}` : "";
}
