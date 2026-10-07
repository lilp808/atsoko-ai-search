"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createPortal, flushSync } from "react-dom";
import SingleSelectDropdown from "@/components/SingleSelectDropdown";
import {
  MobileFilterSection,
  PrimaryFilterTab,
  FeatureOption,
  AREA_MIN_QUICK_PICK_OPTIONS,
  AREA_MAX_QUICK_PICK_OPTIONS,
  quickSearchTranslations,
  formatFullCurrencyLabel,
  formatFullAreaLabel,
  formatAreaRangeDisplay,
  formatPriceRangeDisplay,
  analyzeQuickSearchKeyword,
  FACTORY_VALUE,
  WAREHOUSE_VALUE,
  SHOWROOM_COMMERCIAL_VALUE,
  getPropertyTypeIconClass,
  getPropertyTypeLabel,
} from "@/lib/quickSearchUtils";
import QuickSearchMobileFilters from "@/components/QuickSearchMobileFilters";
import QuickSearchDesktopFilters from "@/components/QuickSearchDesktopFilters";

const MOBILE_SEARCH_BREAKPOINT_PX = 1024;

const zoneDisplayMap = {
  en: {
    "industrial estate zone": "Industrial Estate Zone",
    "industrial estate zone ieat": "Industrial Estate Zone",
    "ieat industrial estate": "Industrial Estate Zone",
  },
  th: {
    "free trade zone": "เขตปลอดอากร",
    "free-trade zone": "เขตปลอดอากร",
    "industrial estate zone": "เขตนิคมอุตสาหกรรม",
    "industrial estate zone ieat": "เขตนิคมอุตสาหกรรม",
    "ieat industrial estate": "เขตนิคมอุตสาหกรรม",
    "ieat": "นิคมอุตสาหกรรม (กนอ.)",
    "general zone": "เขตทั่วไป",
    "purple zone": "เขตสีม่วง",
    "yellow zone": "เขตสีเหลือง",
    "orange zone": "เขตสีส้ม",
    "eec zone": "เขต EEC",
  },
  zh: {
    "free trade zone": "保税区",
    "free-trade zone": "保税区",
    "industrial estate zone": "工业园区",
    "industrial estate zone ieat": "工业园区",
    "ieat industrial estate": "工业园区",
    "ieat": "工业园区（IEAT）",
    "general zone": "一般区域",
    "purple zone": "紫色工业用地区",
    "yellow zone": "黄色区域",
    "orange zone": "橙色区域",
    "eec zone": "EEC 区域",
  },
} as const;


const featureDisplayMap = {
  th: {
    office: "สำนักงาน",
    "loading dock": "ท่าขนถ่ายสินค้า",
    "dock leveler": "สะพานปรับระดับท่าเทียบ",
    "raised floor": "พื้นยกระดับ",
    "fire sprinkler": "ระบบสปริงเกลอร์",
    "fire alarm": "ระบบแจ้งเหตุเพลิงไหม้",
    cctv: "กล้องวงจรปิด",
    security: "ระบบรักษาความปลอดภัย",
    "24 hours access": "เข้า-ออกได้ 24 ชั่วโมง",
    "high voltage electricity": "ไฟฟ้าแรงสูง",
    crane: "เครน",
    "near expressway": "ใกล้ทางด่วน",
    "near airport": "ใกล้สนามบิน",
    "near seaport": "ใกล้ท่าเรือ",
  },
  zh: {
    office: "办公室",
    "loading dock": "装卸月台",
    "dock leveler": "升降平台",
    "raised floor": "高台地面",
    "fire sprinkler": "喷淋系统",
    "fire alarm": "消防报警系统",
    cctv: "监控系统",
    security: "安保系统",
    "24 hours access": "24小时通行",
    "high voltage electricity": "高压供电",
    crane: "起重机",
    "near expressway": "靠近高速",
    "near airport": "靠近机场",
    "near seaport": "靠近港口",
  },
} as const;


interface PublicSearchAutocompleteGroupPayload {
  field?: string;
  field_label?: string;
  items?: Array<{
    value?: unknown;
    parent_province?: unknown;
    parent_district?: unknown;
  }>;
}

interface KeywordSuggestionItem {
  flatIndex: number;
  value: string;
  parentProvince?: string;
  parentDistrict?: string;
}

interface KeywordSuggestionGroup {
  field: string;
  fieldLabel: string;
  items: KeywordSuggestionItem[];
}

interface LocationOption {
  nameEn: string;
  nameTh: string;
  nameZh: string | null;
}

interface ClearHeightOption {
  value: string;
  label: string;
}

const parseLocationOption = (item: {
  name_en?: unknown;
  name_th?: unknown;
  name_zh?: unknown;
}): LocationOption => ({
  nameEn: toSafeTrimmedString(item?.name_en),
  nameTh: toSafeTrimmedString(item?.name_th),
  nameZh: item?.name_zh ? toSafeTrimmedString(item.name_zh) : null,
});

const getLocalizedLocationName = (opt: LocationOption, locale: "en" | "th" | "zh"): string => {
  if (locale === "th") return opt.nameTh || opt.nameEn;
  if (locale === "zh") return opt.nameZh || opt.nameEn;
  return opt.nameEn;
};

type RangePickerKind = "area" | "price" | "clearHeight";
type QuickSearchDropdownKind = "district" | "subDistrict" | "feature" | "zone";
type LocationPickerView = "province" | "district" | "subdistrict";
type PopupPlacement = "bottom" | "top";
type PopupAlign = "left" | "right";

interface NavigateOverrides {
  keyword?: string;
  province?: string;
  district?: string[];
  sub_district?: string[];
  type?: string;
  status?: string;
}

const PROPERTY_ID_RE = /^at\d+(?:sr|s|r)$/i;
// Partial match: keeps ID mode active while user is mid-typing the next comma-separated ID
const PROPERTY_ID_PARTIAL_RE = /^at\d*(?:sr|s|r)?$/i;

const AUTOCOMPLETE_MIN_CHARS = 1;
const AUTOCOMPLETE_API_MIN_CHARS = 1;
const AUTOCOMPLETE_GROUP_ORDER = [
  "title",
  "status",
  "type",
  "province",
  "district",
  "sub_district",
  "usable_area_sqm",
  "size",
] as const;
const PRICE_MIN_QUICK_PICK_OPTIONS_RENT = ["", "20000", "30000", "50000", "80000", "100000", "150000", "200000"];
const PRICE_MAX_QUICK_PICK_OPTIONS_RENT = ["", "30000", "50000", "80000", "100000", "150000", "200000", "300000", "500000"];
const PRICE_MIN_QUICK_PICK_OPTIONS_SALE = ["", "2000000", "3000000", "5000000", "8000000", "10000000", "15000000", "20000000"];
const PRICE_MAX_QUICK_PICK_OPTIONS_SALE = ["", "3000000", "5000000", "8000000", "10000000", "15000000", "20000000", "30000000", "50000000"];
const PRICE_MIN_QUICK_PICK_OPTIONS_ALL = ["", "50000", "100000", "200000", "500000", "1000000", "3000000", "5000000"];
const PRICE_MAX_QUICK_PICK_OPTIONS_ALL = ["", "100000", "300000", "500000", "1000000", "3000000", "5000000", "10000000"];
const PRICE_MIN_QUICK_PICK_OPTIONS_SQM = ["", "50", "80", "100", "150", "200", "300"];
const PRICE_MAX_QUICK_PICK_OPTIONS_SQM = ["", "100", "150", "200", "300", "500", "800"];
const CLEAR_HEIGHT_FALLBACK_QUICK_PICK_OPTIONS = ["3", "4", "6", "8", "10"];

const toSafeString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
};

const toSafeTrimmedString = (value: unknown): string => toSafeString(value).trim();

const toLabelKey = (value: string): string =>
  toSafeTrimmedString(value)
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const translateLabelWithMap = (
  value: string,
  locale: "en" | "th" | "zh",
  dictionary: {
    en?: Readonly<Record<string, string>>;
    th: Readonly<Record<string, string>>;
    zh: Readonly<Record<string, string>>;
  }
): string => {
  const key = toLabelKey(value);
  if (locale === "en") {
    return dictionary.en?.[key] || value;
  }
  return dictionary[locale][key] || value;
};


const sanitizeApiOptionLabel = (value: unknown): string =>
  toSafeString(value)
    .replace(/^["{\[\s]+|["\}\]\s]+$/g, "")
    .replace(/^"|"$/g, "")
    .trim();

const getAutocompleteFieldOrder = (field: string): number => {
  const normalizedField = toSafeTrimmedString(field).toLowerCase();
  const order = AUTOCOMPLETE_GROUP_ORDER.indexOf(
    normalizedField as (typeof AUTOCOMPLETE_GROUP_ORDER)[number]
  );
  return order >= 0 ? order : AUTOCOMPLETE_GROUP_ORDER.length;
};

const groupFlatAutocompleteData = (
  flatData: unknown
): PublicSearchAutocompleteGroupPayload[] => {
  if (!Array.isArray(flatData)) return [];
  const groupMap = new Map<string, PublicSearchAutocompleteGroupPayload>();
  for (const item of flatData) {
    const field = toSafeTrimmedString(item?.field);
    const fieldLabel = toSafeTrimmedString(item?.field_label) || field;
    if (!field) continue;
    if (!groupMap.has(field)) {
      groupMap.set(field, { field, field_label: fieldLabel, items: [] });
    }
    groupMap.get(field)!.items!.push({
      value: item?.value,
      parent_province: item?.parent_province,
      parent_district: item?.parent_district,
    });
  }
  return Array.from(groupMap.values());
};

const normalizeAutocompleteGroups = (
  payloadGroups: unknown,
): KeywordSuggestionGroup[] => {
  if (!Array.isArray(payloadGroups)) return [];

  let flatIndex = 0;

  return payloadGroups
    .map((group) => {
      const typedGroup = group as PublicSearchAutocompleteGroupPayload;
      const field = toSafeTrimmedString(typedGroup.field);
      const fieldLabel = toSafeTrimmedString(typedGroup.field_label) || field;
      const items: KeywordSuggestionItem[] = Array.isArray(typedGroup.items)
        ? typedGroup.items
            .map((item) => {
              const value = toSafeTrimmedString(item?.value);
              if (!value) return null;
              const parsed: KeywordSuggestionItem = {
                flatIndex: flatIndex++,
                value,
                parentProvince: toSafeTrimmedString(item?.parent_province) || undefined,
                parentDistrict: toSafeTrimmedString(item?.parent_district) || undefined,
              };
              return parsed;
            })
            .filter((item): item is KeywordSuggestionItem => item !== null)
        : [];

      if (!field || !fieldLabel || items.length === 0) return null;

      const result: KeywordSuggestionGroup = { field, fieldLabel, items };
      return result;
    })
    .filter((group): group is KeywordSuggestionGroup => group !== null)
    .sort((left, right) => {
      const fieldOrderDiff =
        getAutocompleteFieldOrder(left.field) -
        getAutocompleteFieldOrder(right.field);
      if (fieldOrderDiff !== 0) return fieldOrderDiff;
      return left.fieldLabel.localeCompare(right.fieldLabel);
    });
};

const extractNumericParts = (value: string): string[] => {
  const matches = value.match(/\d+(?:\.\d+)?/g);
  return matches ? matches : [];
};

const getCompactNumericQuickPicks = (
  values: string[],
  maxItems = 5,
  fallbackValues: string[] = []
): string[] => {
  const uniqueSorted = Array.from(new Set([...values.filter(Boolean), ...fallbackValues])).sort(
    (a, b) => Number(a) - Number(b)
  );

  if (uniqueSorted.length <= maxItems) {
    return uniqueSorted;
  }

  const sampled = new Set<string>();
  const lastIndex = uniqueSorted.length - 1;

  for (let index = 0; index < maxItems; index += 1) {
    const ratio = maxItems === 1 ? 0 : index / (maxItems - 1);
    const pickIndex = Math.round(lastIndex * ratio);
    sampled.add(uniqueSorted[pickIndex]);
  }

  return uniqueSorted.filter((value) => sampled.has(value));
};

const normalizeNumericRange = (min: string, max: string): { min: string; max: string } => {
  const normalizedMin = toSafeTrimmedString(min);
  const normalizedMax = toSafeTrimmedString(max);

  if (!normalizedMin || !normalizedMax) {
    return { min: normalizedMin, max: normalizedMax };
  }

  const minNumber = Number(normalizedMin);
  const maxNumber = Number(normalizedMax);

  if (Number.isFinite(minNumber) && Number.isFinite(maxNumber) && minNumber > maxNumber) {
    return { min: normalizedMax, max: normalizedMin };
  }

  return { min: normalizedMin, max: normalizedMax };
};

const isRangeInvalid = (min: string, max: string): boolean => {
  if (!min || !max) return false;
  const minNum = Number(min);
  const maxNum = Number(max);
  return Number.isFinite(minNum) && Number.isFinite(maxNum) && minNum > maxNum;
};

const formatFullNumber = (value: string): string => {
  const trimmed = toSafeTrimmedString(value);
  if (!trimmed) return "";
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return trimmed;
  return Math.abs(num).toLocaleString("en-US");
};

const formatFloorLoadLabel = (value: string): string => {
  const normalized = toSafeTrimmedString(value);
  if (!normalized) return "";

  const directMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:tons?|ton|t)?\s*(?:per|\/)\s*(?:sq\.?\s*m|sqm|sq\.m\.?|m2|m²)/i);
  if (directMatch?.[1]) {
    return `${directMatch[1]} ton per sqm`;
  }

  const numberOnly = normalized.match(/\d+(?:\.\d+)?/);
  if (numberOnly?.[0] && /tons?|ton|t/i.test(normalized) && /(sq\.?\s*m|sqm|m2|m²)/i.test(normalized)) {
    return `${numberOnly[0]} ton per sqm`;
  }

  return normalized;
};

const buildRangeLabel = (
  min: string,
  max: string,
  options: { placeholder: string; unit?: string; prefix?: string; aboveLabel?: string; underLabel?: string }
): string => {
  const normalizedMin = toSafeTrimmedString(min);
  const normalizedMax = toSafeTrimmedString(max);
  const prefix = options.prefix || "";
  const unit = options.unit || "";
  const aboveLabel = options.aboveLabel || "Above";
  const underLabel = options.underLabel || "Under";

  if (!normalizedMin && !normalizedMax) {
    return options.placeholder;
  }

  if (normalizedMin && normalizedMax) {
    const minText = `${prefix}${formatFullNumber(normalizedMin)}`;
    const maxText = `${prefix}${formatFullNumber(normalizedMax)}`;
    return unit ? `${minText}-${maxText} ${unit}` : `${minText}-${maxText}`;
  }

  if (normalizedMin) {
    const minText = `${prefix}${formatFullNumber(normalizedMin)}`;
    return unit ? `${aboveLabel} ${minText} ${unit}` : `${aboveLabel} ${minText}`;
  }

  const maxText = `${prefix}${formatFullNumber(normalizedMax)}`;
  return unit ? `${underLabel} ${maxText} ${unit}` : `${underLabel} ${maxText}`;
};

export type AiFillFilters = Record<string, unknown>;

// DEMO-ONLY PROPS (ai-search-demo): localeOverride feeds translations without a
// [locale] route, onNavigate replaces router.push to the listing page, and
// aiFill lets the AI result fill the real filter state (bump n to re-apply).
export default function QuickSearch({ variant, localeOverride, onNavigate, aiFill }: {
  variant?: "home";
  localeOverride?: "en" | "th" | "zh";
  onNavigate?: (queryString: string) => void;
  aiFill?: { n: number; filters: AiFillFilters } | null;
} = {}) {
  const router = useRouter();
  const params = useParams();
  const localeParam = params?.locale;
  const routeLocale = Array.isArray(localeParam) ? localeParam[0] : localeParam || "en";
  const locale = localeOverride ?? routeLocale;
  const normalizedLocale = locale === "th" || locale === "zh" ? locale : "en";
  const qs = quickSearchTranslations[normalizedLocale];
  const translateZoneLabel = useCallback(
    (name: string): string => translateLabelWithMap(name, normalizedLocale, zoneDisplayMap),
    [normalizedLocale]
  );
  const translateFeatureLabel = useCallback(
    (name: string): string => translateLabelWithMap(name, normalizedLocale, featureDisplayMap),
    [normalizedLocale]
  );

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("rent");
  const [isKeywordFieldFocused, setIsKeywordFieldFocused] = useState(false);

  const mobileLockedScrollYRef = useRef<number | null>(null);
  const didLockBodyRef = useRef(false);
  const scrollLockModeRef = useRef<"fixed" | "overflow" | null>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);
  const prevLocationSummaryRef = useRef("");
  const scrollLockPreviousStylesRef = useRef<{
    body: {
      position: string;
      top: string;
      left: string;
      right: string;
      width: string;
      overflow: string;
    };
    html: {
      overflow: string;
    };
  } | null>(null);

  const searchParams = useSearchParams();

  const isMobileSearchViewport = useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia
      ? window.matchMedia(`(max-width: ${MOBILE_SEARCH_BREAKPOINT_PX}px)`).matches
      : window.innerWidth <= MOBILE_SEARCH_BREAKPOINT_PX;
  }, []);

  const getCurrentScrollY = useCallback(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return 0;
    }

    return (
      window.scrollY ||
      document.scrollingElement?.scrollTop ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0
    );
  }, []);

  const captureMobileScrollPosition = useCallback(() => {
    if (
      typeof document === "undefined" ||
      !isMobileSearchViewport() ||
      didLockBodyRef.current ||
      document.body.style.position === "fixed"
    ) {
      return;
    }

    mobileLockedScrollYRef.current = getCurrentScrollY();
  }, [getCurrentScrollY, isMobileSearchViewport]);

  const getLockedScrollTarget = useCallback(() => {
    if (typeof document === "undefined") {
      return mobileLockedScrollYRef.current ?? 0;
    }

    const bodyTop = document.body.style.top;
    const topOffset = bodyTop ? Math.abs(Number.parseFloat(bodyTop)) : 0;

    if (Number.isFinite(topOffset) && topOffset > 0) {
      return topOffset;
    }

    return mobileLockedScrollYRef.current ?? getCurrentScrollY();
  }, [getCurrentScrollY]);

  const restoreScrollPosition = useCallback((scrollTarget: number) => {
    if (typeof window === "undefined") return;

    window.scrollTo(0, scrollTarget);
    window.requestAnimationFrame(() => {
      window.scrollTo(0, scrollTarget);
      window.requestAnimationFrame(() => {
        window.scrollTo(0, scrollTarget);
      });
    });
  }, []);

  const lockQuickSearchMobileScroll = useCallback((mode: "fixed" | "overflow") => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const bodyStyle = document.body.style;
    const htmlStyle = document.documentElement.style;

    if (bodyStyle.position === "fixed" && !didLockBodyRef.current) {
      document.body.classList.add("quick-search-mobile-filters-open");
      return;
    }

    if (didLockBodyRef.current && scrollLockModeRef.current === mode) {
      document.body.classList.add("quick-search-mobile-filters-open");
      return;
    }

    const scrollY = mobileLockedScrollYRef.current ?? getCurrentScrollY();
    mobileLockedScrollYRef.current = scrollY;
    scrollLockPreviousStylesRef.current = {
      body: {
        position: bodyStyle.position,
        top: bodyStyle.top,
        left: bodyStyle.left,
        right: bodyStyle.right,
        width: bodyStyle.width,
        overflow: bodyStyle.overflow,
      },
      html: {
        overflow: htmlStyle.overflow,
      },
    };

    htmlStyle.overflow = "hidden";
    bodyStyle.overflow = "hidden";

    if (mode === "fixed") {
      bodyStyle.position = "fixed";
      bodyStyle.top = `-${scrollY}px`;
      bodyStyle.left = "0";
      bodyStyle.right = "0";
      bodyStyle.width = "100%";
    }

    didLockBodyRef.current = true;
    scrollLockModeRef.current = mode;
    document.body.classList.add("quick-search-mobile-filters-open");
  }, [getCurrentScrollY]);

  const unlockQuickSearchMobileScroll = useCallback(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    if (didLockBodyRef.current) {
      const previousStyles = scrollLockPreviousStylesRef.current;
      const scrollTarget = getLockedScrollTarget();

      document.body.style.position = previousStyles?.body.position || "";
      document.body.style.top = previousStyles?.body.top || "";
      document.body.style.left = previousStyles?.body.left || "";
      document.body.style.right = previousStyles?.body.right || "";
      document.body.style.width = previousStyles?.body.width || "";
      document.body.style.overflow = previousStyles?.body.overflow || "";
      document.documentElement.style.overflow =
        previousStyles?.html.overflow || "";

      didLockBodyRef.current = false;
      scrollLockModeRef.current = null;
      mobileLockedScrollYRef.current = null;
      scrollLockPreviousStylesRef.current = null;
      restoreScrollPosition(scrollTarget);
    }

    document.body.classList.remove("quick-search-mobile-filters-open");
  }, [getLockedScrollTarget, restoreScrollPosition]);

  useEffect(() => {
    if (!searchParams) return;

    const getParam = (key: string) => searchParams.get(key);

    const kw = getParam("keyword") || "";
    // If URL has no keyword but we already have a location label in memory
    // (user navigated via Search button without changing location), preserve
    // the location display so the input does not flash empty.
    const currentLocationLabel = prevLocationSummaryRef.current;
    setKeyword(kw === "" && currentLocationLabel !== "" ? currentLocationLabel : kw);

    const st = getParam("status");
    if (st && (st === "rent" || st === "sale")) setStatus(st);

    const ty = getParam("type");
    if (ty && (ty === WAREHOUSE_VALUE || ty === FACTORY_VALUE || ty === SHOWROOM_COMMERCIAL_VALUE)) setPropertyType(ty);

    const pv = getParam("province");
    if (pv !== null) setProvince(pv);

    const dsStr = getParam("district");
    if (dsStr !== null) {
      setSelectedDistricts(dsStr ? dsStr.split(",").filter(Boolean) : []);
    }

    const sdsStr = getParam("sub_district");
    if (sdsStr !== null) {
      setSelectedSubDistricts(sdsStr ? sdsStr.split(",").filter(Boolean) : []);
    }

    const sMin = getParam("size_min") || "";
    setSizeMin(sMin);
    const sMax = getParam("size_max") || "";
    setSizeMax(sMax);

    const pMin = getParam("price_min") || "";
    setPriceMin(pMin);
    const pMax = getParam("price_max") || "";
    setPriceMax(pMax);

    const pMode = getParam("price_mode");
    if (pMode === "month" || pMode === "sqm") setPriceMode(pMode);

    const ftStr = getParam("features");
    if (ftStr !== null) {
      setSelectedFeatures(ftStr ? ftStr.split(",").filter(Boolean) : []);
    }

    const fl = getParam("floor_load") || "";
    setFloorLoad(fl);

    const chMin = getParam("min_height") || "";
    setClearHeightMin(chMin);
    const chMax = getParam("max_height") || "";
    setClearHeightMax(chMax);

    const ztStr = getParam("zone_types");
    if (ztStr !== null) {
      setSelectedZoneTypes(ztStr ? ztStr.split(",").filter(Boolean) : []);
    }
  }, [searchParams, locale]);

  // DEMO-ONLY (ai-search-demo): apply an AI result to the real filter state.
  // API vocabulary in (BACKEND-API-REFERENCE.md §2.1), slug state out.
  const aiFillNonce = aiFill?.n ?? 0;
  useEffect(() => {
    if (!aiFill || aiFillNonce === 0) return;
    const f = aiFill.filters;
    const str = (v: unknown): string =>
      typeof v === "string" ? v : v === null || v === undefined ? "" : String(v);
    const st = str(f.status).toLowerCase();
    if (st.includes("sale") && !st.includes("rent")) setStatus("sale");
    else if (st.includes("rent")) setStatus("rent");
    const tp = str(f.type).toLowerCase();
    if (tp === "factory") setPropertyType("factory");
    else if (tp === "land") setPropertyType("land");
    else if (tp) setPropertyType("warehouse");
    if (str(f.province)) setProvince(str(f.province));
    if (str(f.district)) setSelectedDistricts([str(f.district)]);
    if (str(f.sub_district)) setSelectedSubDistricts([str(f.sub_district)]);
    if (f.size_min !== undefined && f.size_min !== "") setSizeMin(str(f.size_min));
    if (f.size_max !== undefined && f.size_max !== "") setSizeMax(str(f.size_max));
    if (f.price_min !== undefined && f.price_min !== "") setPriceMin(str(f.price_min));
    if (f.price_max !== undefined && f.price_max !== "") setPriceMax(str(f.price_max));
    if (f.price_mode === "sqm" || f.price_mode === "month") setPriceMode(f.price_mode);
    if (str(f.property_id)) setKeyword(str(f.property_id));
    else if (typeof f.keyword === "string") setKeyword(f.keyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiFillNonce]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Derive ID-search state from keyword in real-time (single or comma-separated IDs).
  // Partial-match rule: if the trailing part looks like an in-progress ID (starts with "at"),
  // keep ID mode active so the banner doesn't flash off mid-typing.
  const keywordParts = useMemo(() => {
    const trimmed = toSafeTrimmedString(keyword);
    const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return null;
    const lastPart = parts[parts.length - 1];
    const isLastFull = PROPERTY_ID_RE.test(lastPart);
    const isLastPartial = !isLastFull && PROPERTY_ID_PARTIAL_RE.test(lastPart);
    const completeParts = isLastFull ? parts : parts.slice(0, -1);
    if (completeParts.length === 0) return null;
    if (!completeParts.every((p) => PROPERTY_ID_RE.test(p))) return null;
    if (!isLastFull && !isLastPartial) return null;
    return completeParts;
  }, [keyword]);
  const isIdKeyword = keywordParts !== null;
  const idImpliedStatus = useMemo((): "" | "rent" | "sale" => {
    if (!keywordParts) return "rent";
    const hasSR = keywordParts.some((id) => /sr$/i.test(id));
    const hasR = keywordParts.some((id) => /r$/i.test(id) && !/sr$/i.test(id));
    const hasS = keywordParts.some((id) => /s$/i.test(id));
    if (!hasSR && hasR && !hasS) return "rent";
    if (!hasSR && !hasR && hasS) return "sale";
    return "";
  }, [keywordParts]);
  const [propertyType, setPropertyType] = useState("warehouse");
  const [province, setProvince] = useState("");
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedSubDistricts, setSelectedSubDistricts] = useState<string[]>([]);
  const [provinceQuery, setProvinceQuery] = useState("");
  const [sizeMin, setSizeMin] = useState("");
  const [sizeMax, setSizeMax] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedZoneTypes, setSelectedZoneTypes] = useState<string[]>([]);
  const [floorLoad, setFloorLoad] = useState("");
  const [clearHeightMin, setClearHeightMin] = useState("");
  const [clearHeightMax, setClearHeightMax] = useState("");
  const [priceMode, setPriceMode] = useState<"month" | "sqm">("month");
  const [isPrimaryFilterPopupOpen, setIsPrimaryFilterPopupOpen] = useState(false);
  const [primaryFilterTab, setPrimaryFilterTab] = useState<PrimaryFilterTab>("type");
  const [draftPropertyType, setDraftPropertyType] = useState("warehouse");
  const [draftSizeMin, setDraftSizeMin] = useState("");
  const [draftSizeMax, setDraftSizeMax] = useState("");
  const [draftPriceMin, setDraftPriceMin] = useState("");
  const [draftPriceMax, setDraftPriceMax] = useState("");
  const [draftPriceMode, setDraftPriceMode] = useState<"month" | "sqm">("month");

  const [isMobileFiltersPanelOpen, setIsMobileFiltersPanelOpen] = useState(false);
  const [isMobileFiltersPanelClosing, setIsMobileFiltersPanelClosing] = useState(false);
  const [isMobileSearchSheetOpen, setIsMobileSearchSheetOpen] = useState(false);
  const [isMobileSearchSheetClosing, setIsMobileSearchSheetClosing] = useState(false);
  const [mobileFiltersOpenSections, setMobileFiltersOpenSections] = useState<Set<MobileFilterSection>>(new Set<MobileFilterSection>(["type"]));

  const [isAdvancedFilterPopupOpen, setIsAdvancedFilterPopupOpen] = useState(false);
  const [advancedOpenSections, setAdvancedOpenSections] = useState<Set<string>>(
    new Set(["zone", "feature", "floorLoad", "clearHeight"])
  );
  const [draftSelectedZoneTypes, setDraftSelectedZoneTypes] = useState<string[]>([]);
  const [draftSelectedFeatures, setDraftSelectedFeatures] = useState<string[]>([]);
  const [draftFloorLoad, setDraftFloorLoad] = useState("");
  const [draftClearHeightMin, setDraftClearHeightMin] = useState("");
  const [draftClearHeightMax, setDraftClearHeightMax] = useState("");

  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [isLocationPickerClosing, setIsLocationPickerClosing] = useState(false);
  const [isPrimaryFilterClosing, setIsPrimaryFilterClosing] = useState(false);
  const [isAdvancedFilterClosing, setIsAdvancedFilterClosing] = useState(false);
  const [locationPickerView, setLocationPickerView] = useState<LocationPickerView>("province");
  const [locationSlideDirection, setLocationSlideDirection] = useState<"forward" | "back">("forward");

  const [provinceOptions, setProvinceOptions] = useState<LocationOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<LocationOption[]>([]);
  const [subDistrictOptions, setSubDistrictOptions] = useState<LocationOption[]>([]);
  const [featureOptions, setFeatureOptions] = useState<FeatureOption[]>([]);
  const [floorLoadOptions, setFloorLoadOptions] = useState<string[]>([]);
  const [clearHeightOptions, setClearHeightOptions] = useState<ClearHeightOption[]>([]);

  const [keywordSuggestionGroups, setKeywordSuggestionGroups] = useState<
    KeywordSuggestionGroup[]
  >([]);
  const [showKeywordSuggestions, setShowKeywordSuggestions] = useState(false);
  const [keywordSuggestionsLoading, setKeywordSuggestionsLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  const [activeRangePicker, setActiveRangePicker] = useState<RangePickerKind | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<QuickSearchDropdownKind | null>(null);
  const [rangePopupPlacement, setRangePopupPlacement] = useState<Record<RangePickerKind, PopupPlacement>>({
    area: "bottom",
    price: "bottom",
    clearHeight: "bottom",
  });
  const [rangePopupAlign, setRangePopupAlign] = useState<Record<RangePickerKind, PopupAlign>>({
    area: "left",
    price: "left",
    clearHeight: "left",
  });
  const [multiMenuPlacement, setMultiMenuPlacement] = useState<Record<QuickSearchDropdownKind, PopupPlacement>>({
    district: "bottom",
    subDistrict: "bottom",
    feature: "bottom",
    zone: "bottom",
  });
  const [districtQuery, setDistrictQuery] = useState("");
  const [subDistrictQuery, setSubDistrictQuery] = useState("");
  const [hasSeenSubDistrictGuide, setHasSeenSubDistrictGuide] = useState(false);
  const [showSubDistrictGuide, setShowSubDistrictGuide] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);


  const normalizedDistrictQuery = useMemo(
    () => districtQuery.trim().toLowerCase(),
    [districtQuery]
  );

  const flattenedKeywordSuggestions = useMemo(
    () =>
      keywordSuggestionGroups.flatMap((group) =>
        group.items.map((item) => ({
          field: group.field,
          fieldLabel: group.fieldLabel,
          flatIndex: item.flatIndex,
          value: item.value,
          parentProvince: item.parentProvince,
          parentDistrict: item.parentDistrict,
        })),
      ),
    [keywordSuggestionGroups],
  );

  const normalizedSubDistrictQuery = useMemo(
    () => subDistrictQuery.trim().toLowerCase(),
    [subDistrictQuery]
  );

  const visibleDistricts = useMemo(() => {
    if (!normalizedDistrictQuery) return districtOptions;
    return districtOptions.filter((item) => {
      const label = getLocalizedLocationName(item, normalizedLocale);
      return label.toLowerCase().includes(normalizedDistrictQuery) ||
        item.nameEn.toLowerCase().includes(normalizedDistrictQuery);
    });
  }, [districtOptions, normalizedDistrictQuery, normalizedLocale]);

  const visibleSubDistricts = useMemo(() => {
    if (!normalizedSubDistrictQuery) return subDistrictOptions;
    return subDistrictOptions.filter((item) => {
      const label = getLocalizedLocationName(item, normalizedLocale);
      return label.toLowerCase().includes(normalizedSubDistrictQuery) ||
        item.nameEn.toLowerCase().includes(normalizedSubDistrictQuery);
    });
  }, [subDistrictOptions, normalizedSubDistrictQuery, normalizedLocale]);

  const normalizedProvinceQuery = useMemo(
    () => provinceQuery.trim().toLowerCase(),
    [provinceQuery]
  );

  const visibleProvinces = useMemo(() => {
    if (!normalizedProvinceQuery) return provinceOptions;
    return provinceOptions.filter((item) => {
      const label = getLocalizedLocationName(item, normalizedLocale);
      return label.toLowerCase().includes(normalizedProvinceQuery) ||
        item.nameEn.toLowerCase().includes(normalizedProvinceQuery);
    });
  }, [provinceOptions, normalizedProvinceQuery, normalizedLocale]);

  const selectedProvinceOption = useMemo(() => {
    if (!province) return null;
    return provinceOptions.find((item) => item.nameEn === province) ?? null;
  }, [province, provinceOptions]);

  const selectedDistrictLabels = useMemo(() => {
    return selectedDistricts
      .map((districtName) => {
        const district = districtOptions.find((item) => item.nameEn === districtName);
        return district ? getLocalizedLocationName(district, normalizedLocale) : districtName;
      })
      .filter(Boolean);
  }, [districtOptions, normalizedLocale, selectedDistricts]);

  const selectedSubDistrictLabels = useMemo(() => {
    return selectedSubDistricts
      .map((subDistrictName) => {
        const subDistrict = subDistrictOptions.find((item) => item.nameEn === subDistrictName);
        return subDistrict ? getLocalizedLocationName(subDistrict, normalizedLocale) : subDistrictName;
      })
      .filter(Boolean);
  }, [normalizedLocale, selectedSubDistricts, subDistrictOptions]);

  const selectedProvinceLabel = useMemo(() => {
    if (!province) return "";
    return selectedProvinceOption
      ? getLocalizedLocationName(selectedProvinceOption, normalizedLocale)
      : province;
  }, [province, selectedProvinceOption, normalizedLocale]);

  const locationSummaryLabel = useMemo(() => {
    const summaryParts: string[] = [];

    if (selectedSubDistrictLabels.length > 0) {
      summaryParts.push(selectedSubDistrictLabels.join(", "));
    }

    if (selectedDistrictLabels.length > 0) {
      summaryParts.push(selectedDistrictLabels.join(", "));
    }

    if (selectedProvinceLabel) {
      summaryParts.push(selectedProvinceLabel);
    }

    return summaryParts.join(", ");
  }, [selectedDistrictLabels, selectedProvinceLabel, selectedSubDistrictLabels]);

  // Sync location selection into the keyword input field.
  // Skip the very first run when locationSummaryLabel is empty so a keyword
  // loaded from URL params (e.g. ?keyword=test) is not wiped on mount.
  useEffect(() => {
    const prev = prevLocationSummaryRef.current;
    prevLocationSummaryRef.current = locationSummaryLabel;
    // Don't overwrite a property ID keyword when location state is cleared
    if (isIdKeyword) return;
    if (locationSummaryLabel === "" && prev === "") return;
    setKeyword(locationSummaryLabel);
  }, [locationSummaryLabel, isIdKeyword]);

  // Strip the location prefix before sending to API — only the extra text the user typed is the real keyword
  const keywordForSearch = useMemo(() => {
    if (!locationSummaryLabel) return keyword;
    if (keyword === locationSummaryLabel) return "";
    if (keyword.startsWith(locationSummaryLabel + " ")) return keyword.slice(locationSummaryLabel.length).trim();
    return keyword;
  }, [keyword, locationSummaryLabel]);

  const [isCompactViewport, setIsCompactViewport] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_SEARCH_BREAKPOINT_PX}px)`);
    setIsCompactViewport(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsCompactViewport(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const keywordInputPlaceholder = isCompactViewport ? qs.searchPlaceholder : qs.keywordPlaceholder;

  const isKeywordDropdownVisible = isKeywordFieldFocused || showKeywordSuggestions;

  const featuresSummaryLabel = useMemo(() => {
    if (selectedFeatures.length === 0) return qs.features;
    if (selectedFeatures.length === 1) {
      const selectedFeature = featureOptions.find((item) => item.value === selectedFeatures[0]);
      return translateFeatureLabel(selectedFeature?.label || selectedFeatures[0]);
    }
    return `${selectedFeatures.length} ${qs.featuresPlural}`;
  }, [featureOptions, qs.features, qs.featuresPlural, selectedFeatures, translateFeatureLabel]);

  const zoneSummaryLabel = useMemo(() => {
    if (selectedZoneTypes.length === 0) return qs.zone;
    if (selectedZoneTypes.length === 1) return translateZoneLabel(selectedZoneTypes[0]);
    return `${selectedZoneTypes.length} ${qs.zones}`;
  }, [qs.zone, qs.zones, selectedZoneTypes, translateZoneLabel]);

  const clearHeightNumericOptions = useMemo(() => {
    const values = new Set<string>();
    clearHeightOptions.forEach((item) => {
      extractNumericParts(item.value || item.label).forEach((num) => values.add(num));
    });
    return getCompactNumericQuickPicks(
      Array.from(values),
      5,
      CLEAR_HEIGHT_FALLBACK_QUICK_PICK_OPTIONS
    );
  }, [clearHeightOptions]);

  const areaSummaryLabel = useMemo(() => {
    return buildRangeLabel(sizeMin, sizeMax, {
      placeholder: qs.areaSize,
      unit: "sqm",
      aboveLabel: qs.above,
      underLabel: qs.under,
    });
  }, [qs.above, qs.areaSize, qs.under, sizeMax, sizeMin]);

  const priceSummaryLabel = useMemo(() => {
    const base = buildRangeLabel(priceMin, priceMax, {
      placeholder: qs.priceRange,
      prefix: "฿",
      aboveLabel: qs.above,
      underLabel: qs.under,
    });
    if (base !== qs.priceRange) {
      return priceMode === "sqm" ? `${base}/sqm` : `${base}/Month`;
    }
    return base;
  }, [priceMax, priceMin, priceMode, qs.above, qs.priceRange, qs.under]);

  const priceMinQuickPickOptions = useMemo(() => {
    if (priceMode === "sqm") return PRICE_MIN_QUICK_PICK_OPTIONS_SQM;
    if (status === "rent") return PRICE_MIN_QUICK_PICK_OPTIONS_RENT;
    if (status === "sale") return PRICE_MIN_QUICK_PICK_OPTIONS_SALE;
    return PRICE_MIN_QUICK_PICK_OPTIONS_ALL;
  }, [priceMode, status]);

  const priceMaxQuickPickOptions = useMemo(() => {
    if (priceMode === "sqm") return PRICE_MAX_QUICK_PICK_OPTIONS_SQM;
    if (status === "rent") return PRICE_MAX_QUICK_PICK_OPTIONS_RENT;
    if (status === "sale") return PRICE_MAX_QUICK_PICK_OPTIONS_SALE;
    return PRICE_MAX_QUICK_PICK_OPTIONS_ALL;
  }, [priceMode, status]);

  const draftPriceMinQuickPickOptions = useMemo(() => {
    if (draftPriceMode === "sqm") return PRICE_MIN_QUICK_PICK_OPTIONS_SQM;
    if (status === "rent") return PRICE_MIN_QUICK_PICK_OPTIONS_RENT;
    if (status === "sale") return PRICE_MIN_QUICK_PICK_OPTIONS_SALE;
    return PRICE_MIN_QUICK_PICK_OPTIONS_ALL;
  }, [draftPriceMode, status]);

  const draftPriceMaxQuickPickOptions = useMemo(() => {
    if (draftPriceMode === "sqm") return PRICE_MAX_QUICK_PICK_OPTIONS_SQM;
    if (status === "rent") return PRICE_MAX_QUICK_PICK_OPTIONS_RENT;
    if (status === "sale") return PRICE_MAX_QUICK_PICK_OPTIONS_SALE;
    return PRICE_MAX_QUICK_PICK_OPTIONS_ALL;
  }, [draftPriceMode, status]);

  const clearHeightSummaryLabel = useMemo(() => {
    return buildRangeLabel(clearHeightMin, clearHeightMax, {
      placeholder: qs.clearHeight,
      unit: "m",
      aboveLabel: qs.above,
      underLabel: qs.under,
    });
  }, [clearHeightMax, clearHeightMin, qs.above, qs.clearHeight, qs.under]);

  const primarySizeRangeError = isRangeInvalid(draftSizeMin, draftSizeMax);
  const primaryPriceRangeError = isRangeInvalid(draftPriceMin, draftPriceMax);
  const advancedHeightRangeError = isRangeInvalid(draftClearHeightMin, draftClearHeightMax);
  const primaryHasRangeError = (primaryFilterTab === "area" && primarySizeRangeError) || (primaryFilterTab === "price" && primaryPriceRangeError);
  const advancedHasRangeError = advancedHeightRangeError;

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const res = await fetch("/api/options/all");
        if (!res.ok) return;
        const json = await res.json();
        if (!json?.success) return;
        const opts = json.data as Record<string, unknown[]>;

        type OptionItem = { name_en?: unknown; name_th?: unknown; name_zh?: unknown; value?: unknown };

        if (Array.isArray(opts.provinces)) {
          const deduped = new Map<string, LocationOption>();
          for (const raw of opts.provinces as OptionItem[]) {
            const opt = parseLocationOption(raw);
            if (!opt.nameEn) continue;
            const existing = deduped.get(opt.nameEn);
            if (!existing || (!existing.nameTh && opt.nameTh)) {
              deduped.set(opt.nameEn, opt);
            }
          }
          setProvinceOptions(Array.from(deduped.values()));
        }

        if (Array.isArray(opts.features)) {
          const featuresMap = new Map<string, string>();
          (opts.features as OptionItem[]).forEach((item) => {
            const optionValue = sanitizeApiOptionLabel(item?.name_en);
            if (!optionValue) return;
            const localizedFromApi =
              normalizedLocale === "th"
                ? sanitizeApiOptionLabel(item?.name_th)
                : normalizedLocale === "zh"
                  ? sanitizeApiOptionLabel(item?.name_zh)
                  : "";
            const fallbackEnglish = optionValue.replace(/\w\S*/g, (text) =>
              text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
            );
            featuresMap.set(optionValue, localizedFromApi || translateFeatureLabel(fallbackEnglish));
          });
          setFeatureOptions(
            Array.from(featuresMap.entries())
              .map(([value, label]) => ({ value, label }))
              .sort((a, b) => a.label.localeCompare(b.label))
          );
        }

        if (Array.isArray(opts.clear_height)) {
          setClearHeightOptions(
            (opts.clear_height as OptionItem[])
              .map((item) => ({
                value: toSafeTrimmedString(item?.value),
                label: toSafeTrimmedString(item?.name_en),
              }))
              .filter((item: ClearHeightOption) => item.value || item.label)
          );
        }

        if (Array.isArray(opts.floor_load)) {
          setFloorLoadOptions(
            (opts.floor_load as OptionItem[])
              .map((item) => toSafeTrimmedString(item?.value))
              .filter(Boolean)
              .sort((a: string, b: string) => {
                const numA = parseFloat(a);
                const numB = parseFloat(b);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.localeCompare(b);
              }) as string[]
          );
        }

      } catch (error) {
        console.error("Error loading quick-search options:", error);
      }
    };

    type RicWindow = Window & {
      requestIdleCallback: (cb: () => void, opts: { timeout: number }) => number;
      cancelIdleCallback: (id: number) => void;
    };
    if (typeof (window as unknown as RicWindow).requestIdleCallback === "function") {
      const ric = window as unknown as RicWindow;
      const id = ric.requestIdleCallback(() => { loadOptions(); }, { timeout: 2000 });
      return () => ric.cancelIdleCallback(id);
    }
    const timer = setTimeout(loadOptions, 500);
    return () => clearTimeout(timer);
  }, [normalizedLocale, translateFeatureLabel]);

  useEffect(() => {
    if (!isLocationPickerOpen) return;
    const targetView = !province
      ? "province"
      : selectedSubDistricts.length > 0 && selectedDistricts.length === 1
        ? "subdistrict"
        : "district";
    setLocationPickerView(targetView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocationPickerOpen, province]);

  const prevProvinceRef = useRef(province);
  useEffect(() => {
    // Only reset districts if province actually changed from a previous non-empty value
    if (prevProvinceRef.current && prevProvinceRef.current !== province) {
      setSelectedDistricts([]);
      setSelectedSubDistricts([]);
      setDistrictQuery("");
      setSubDistrictQuery("");
      setDistrictOptions([]);
      setSubDistrictOptions([]);
    }
    prevProvinceRef.current = province;

    if (!province) return;

    const controller = new AbortController();
    fetch(`/api/options/districts?province=${encodeURIComponent(province)}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!payload?.success || !Array.isArray(payload.data)) return;
        const deduped = new Map<string, LocationOption>();
        for (const raw of payload.data) {
          const opt = parseLocationOption(raw);
          if (!opt.nameEn) continue;
          const existing = deduped.get(opt.nameEn);
          if (!existing || (!existing.nameTh && opt.nameTh)) deduped.set(opt.nameEn, opt);
        }
        setDistrictOptions(Array.from(deduped.values()));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [province]);

  const prevDistrictsRef = useRef(selectedDistricts);
  useEffect(() => {
    const isInitialLoad = prevDistrictsRef.current.length === 0;
    const districtsChanged = JSON.stringify(prevDistrictsRef.current) !== JSON.stringify(selectedDistricts);

    if (districtsChanged && !isInitialLoad) {
      setSelectedSubDistricts([]);
      setSubDistrictQuery("");
    }
    prevDistrictsRef.current = selectedDistricts;

    setSubDistrictOptions([]);

    if (selectedDistricts.length !== 1) {
      if (activeDropdown === "subDistrict") setActiveDropdown(null);
      setLocationPickerView(prev => prev === "subdistrict" ? "district" : prev);
      return;
    }

    if (!province) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ province, district: selectedDistricts[0] });
    fetch(`/api/options/subdistricts?${params.toString()}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!payload?.success || !Array.isArray(payload.data)) return;
        const deduped = new Map<string, LocationOption>();
        for (const raw of payload.data) {
          const opt = parseLocationOption(raw);
          if (!opt.nameEn) continue;
          const existing = deduped.get(opt.nameEn);
          if (!existing || (!existing.nameTh && opt.nameTh)) deduped.set(opt.nameEn, opt);
        }
        setSubDistrictOptions(Array.from(deduped.values()));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [activeDropdown, selectedDistricts, province]);

  const priceMinRef = useRef(priceMin);
  priceMinRef.current = priceMin;
  const priceMaxRef = useRef(priceMax);
  priceMaxRef.current = priceMax;

  // Refs let the effect read current price values without re-running on every keystroke.
  useEffect(() => {
    const allowedMin = new Set(priceMinQuickPickOptions);
    const allowedMax = new Set(priceMaxQuickPickOptions);

    const nextMin = allowedMin.has(priceMinRef.current) ? priceMinRef.current : "";
    const nextMax = allowedMax.has(priceMaxRef.current) ? priceMaxRef.current : "";
    const normalized = normalizeNumericRange(nextMin, nextMax);

    if (normalized.min !== priceMinRef.current) {
      setPriceMin(normalized.min);
    }
    if (normalized.max !== priceMaxRef.current) {
      setPriceMax(normalized.max);
    }
  }, [priceMinQuickPickOptions, priceMaxQuickPickOptions]);

  useEffect(() => {
    if (activeDropdown !== "district") {
      setDistrictQuery("");
    }
    if (activeDropdown !== "subDistrict") {
      setSubDistrictQuery("");
    }
  }, [activeDropdown]);

  useEffect(() => {
    if (locationPickerView !== "district") {
      setShowSubDistrictGuide(false);
      return;
    }

    if (selectedDistricts.length > 1) {
      setShowSubDistrictGuide(true);
    } else if (selectedDistricts.length === 1) {
      // Show the guide for 8 seconds whenever we hit exactly 1 selected district
      setShowSubDistrictGuide(true);
      const timer = setTimeout(() => setShowSubDistrictGuide(false), 8000);
      return () => clearTimeout(timer);
    } else {
      setShowSubDistrictGuide(false);
    }
  }, [selectedDistricts.length, locationPickerView]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Ignore clicks inside the keyword search area OR the mobile portals
      const isSearchArea = target.closest(".quick-search-autocomplete");
      const isMobilePortal = target.closest(".quick-search-mobile-search-overlay") || target.closest(".quick-search-location-overlay");

      if (!isSearchArea && !isMobilePortal) {
        setShowKeywordSuggestions(false);
        setIsKeywordFieldFocused(false);
        setActiveSuggestionIndex(-1);
      }

      if (!target.closest(".quick-search-range-picker") && !target.closest(".quick-search-location-overlay")) {
        setActiveRangePicker(null);
      }

      if (!target.closest(".quick-search-multi-select") && !target.closest(".quick-search-location-overlay")) {
        setActiveDropdown(null);
      }
    };

    const handleAdvancedToggleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const trigger = target.closest(".js-quick-advanced-toggle");
      if (!trigger) return;
      event.preventDefault();
      // Advanced panel is now a popup — no accordion toggle needed
    };

    document.addEventListener("mousedown", handleOutsideClick, true);
    document.addEventListener("click", handleAdvancedToggleClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick, true);
      document.removeEventListener("click", handleAdvancedToggleClick);
    };
  }, []);

  useEffect(() => {
    if (activeRangePicker) {
      document.body.classList.add("quick-search-range-open");
    } else {
      document.body.classList.remove("quick-search-range-open");
    }

    return () => {
      document.body.classList.remove("quick-search-range-open");
    };
  }, [activeRangePicker]);

  useEffect(() => {
    if (isKeywordFieldFocused && mobileSearchInputRef.current) {
      // Small delay to ensure the portal is fully mounted and animation is starting
      const timer = setTimeout(() => {
        mobileSearchInputRef.current?.focus({ preventScroll: true });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isKeywordFieldFocused]);

  useLayoutEffect(() => {
    const shouldUseFixedLock =
      isMobileFiltersPanelOpen || isMobileFiltersPanelClosing ||
      isMobileSearchSheetOpen || isMobileSearchSheetClosing;
    const shouldUseOverflowLock =
      !shouldUseFixedLock && isKeywordFieldFocused && isMobileSearchViewport();

    if (shouldUseFixedLock) lockQuickSearchMobileScroll("fixed");
    else if (shouldUseOverflowLock) lockQuickSearchMobileScroll("overflow");
    else unlockQuickSearchMobileScroll();
  }, [
    isMobileFiltersPanelClosing,
    isMobileFiltersPanelOpen,
    isMobileSearchSheetOpen,
    isMobileSearchSheetClosing,
    isKeywordFieldFocused,
    isMobileSearchViewport,
    lockQuickSearchMobileScroll,
    unlockQuickSearchMobileScroll,
  ]);

  useLayoutEffect(() => {
    return () => {
      unlockQuickSearchMobileScroll();
    };
  }, [unlockQuickSearchMobileScroll]);

  useEffect(() => {
    if (!activeDropdown && !activeRangePicker) return;

    const calculatePlacement = (
      trigger: HTMLElement | null,
      menu: HTMLElement | null,
      currentPlacement: PopupPlacement
    ): PopupPlacement => {
      if (!trigger || !menu) return "bottom";

      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const computed = window.getComputedStyle(menu);
      const configuredMaxHeight = Number.parseFloat(computed.maxHeight || "0");
      const measuredHeight = menuRect.height || 280;
      const menuHeight = configuredMaxHeight > 0
        ? Math.min(measuredHeight, configuredMaxHeight)
        : measuredHeight;

      const spaceBelow = window.innerHeight - triggerRect.bottom - 12;
      const spaceAbove = triggerRect.top - 12;

      const switchToTop = spaceBelow < menuHeight - 8 && spaceAbove > spaceBelow + 8;
      const switchToBottom = spaceBelow >= menuHeight + 20;

      if (currentPlacement === "bottom" && switchToTop) return "top";
      if (currentPlacement === "top" && switchToBottom) return "bottom";
      return currentPlacement;
    };

    const calculateAlign = (
      trigger: HTMLElement | null,
      menu: HTMLElement | null,
      currentAlign: PopupAlign
    ): PopupAlign => {
      if (!trigger || !menu) return currentAlign;

      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const menuWidth = menuRect.width || 360;
      const spaceRight = window.innerWidth - triggerRect.left - 12;
      const spaceLeft = triggerRect.right - 12;

      if (spaceRight < menuWidth && spaceLeft > spaceRight) return "right";
      if (spaceRight >= menuWidth + 18) return "left";
      return currentAlign;
    };

    const updatePlacement = () => {
      if (activeDropdown) {
        const dropdownRoot = document.querySelector(
          `.quick-search-multi-select[data-dropdown-kind="${activeDropdown}"]`
        ) as HTMLElement | null;
        const trigger = dropdownRoot?.querySelector(".quick-search-multi-trigger") as HTMLElement | null;
        const menu = dropdownRoot?.querySelector(".quick-search-multi-menu") as HTMLElement | null;
        const currentPlacement = multiMenuPlacement[activeDropdown];
        const nextPlacement = calculatePlacement(trigger, menu, currentPlacement);

        setMultiMenuPlacement((prev) =>
          prev[activeDropdown] === nextPlacement
            ? prev
            : { ...prev, [activeDropdown]: nextPlacement }
        );
      }

      if (activeRangePicker) {
        const pickerRoot = document.querySelector(
          `.quick-search-range-picker[data-range-kind="${activeRangePicker}"]`
        ) as HTMLElement | null;
        const trigger = pickerRoot?.querySelector(".quick-search-range-trigger") as HTMLElement | null;
        const menu = pickerRoot?.querySelector(".quick-search-area-popup") as HTMLElement | null;
        const currentPlacement = rangePopupPlacement[activeRangePicker];
        const nextPlacement = calculatePlacement(trigger, menu, currentPlacement);
        const currentAlign = rangePopupAlign[activeRangePicker];
        const nextAlign = calculateAlign(trigger, menu, currentAlign);

        setRangePopupPlacement((prev) =>
          prev[activeRangePicker] === nextPlacement
            ? prev
            : { ...prev, [activeRangePicker]: nextPlacement }
        );
        setRangePopupAlign((prev) =>
          prev[activeRangePicker] === nextAlign
            ? prev
            : { ...prev, [activeRangePicker]: nextAlign }
        );
      }
    };

    const rafId = window.requestAnimationFrame(updatePlacement);
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [activeDropdown, activeRangePicker, multiMenuPlacement, rangePopupAlign, rangePopupPlacement]);

  useEffect(() => {
    if (!isPrimaryFilterPopupOpen) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPrimaryFilterClosing(true);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isPrimaryFilterPopupOpen]);

  useEffect(() => {
    const query = toSafeTrimmedString(keywordForSearch);

    if (!isKeywordFieldFocused) {
      setShowKeywordSuggestions(false);
      setKeywordSuggestionsLoading(false);
      return;
    }

    if (query.length < AUTOCOMPLETE_MIN_CHARS) {
      setKeywordSuggestionGroups([]);
      setKeywordSuggestionsLoading(false);
      setShowKeywordSuggestions(true);
      setActiveSuggestionIndex(-1);
      return;
    }

    if (query.length < AUTOCOMPLETE_API_MIN_CHARS) {
      setKeywordSuggestionGroups([]);
      setKeywordSuggestionsLoading(false);
      setShowKeywordSuggestions(true);
      setActiveSuggestionIndex(-1);
      return;
    }

    const abortController = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setKeywordSuggestionsLoading(true);

        const searchParams = new URLSearchParams();
        searchParams.set("q", query);
        searchParams.set("limit", "10");

        const response = await fetch(`/api/properties/autocomplete?${searchParams.toString()}`, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch keyword suggestions");
        }

        const payload = await response.json();
        setKeywordSuggestionGroups(
          normalizeAutocompleteGroups(groupFlatAutocompleteData(payload?.data)),
        );
        setShowKeywordSuggestions(true);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setKeywordSuggestionGroups([]);
        setShowKeywordSuggestions(true);
      } finally {
        setKeywordSuggestionsLoading(false);
        setActiveSuggestionIndex(-1);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [keywordForSearch, isKeywordFieldFocused]);

  const toggleDistrictSelection = (districtName: string) => {
    setSelectedDistricts((prev) => {
      if (prev.includes(districtName)) {
        return prev.filter((item) => item !== districtName);
      }
      return [...prev, districtName];
    });
  };

  const toggleSubDistrictSelection = (subDistrictName: string) => {
    setSelectedSubDistricts((prev) => {
      if (prev.includes(subDistrictName)) {
        return prev.filter((item) => item !== subDistrictName);
      }
      return [...prev, subDistrictName];
    });
  };

  const toggleFeatureSelection = (featureValue: string) => {
    setSelectedFeatures((prev) => {
      if (prev.includes(featureValue)) {
        return prev.filter((item) => item !== featureValue);
      }
      return [...prev, featureValue];
    });
  };

  const toggleZoneSelection = (zoneValue: string) => {
    setSelectedZoneTypes((prev) => {
      if (prev.includes(zoneValue)) {
        return prev.filter((item) => item !== zoneValue);
      }
      return [...prev, zoneValue];
    });
  };

  const renderHighlightedText = (text: string, query: string): React.ReactNode => {
    const normalized = toSafeTrimmedString(query);
    if (!normalized) return text;

    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "ig");
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (part.toLowerCase() === normalized.toLowerCase()) {
        return (
          <span key={`${part}-${index}`} className="quick-search-autocomplete-highlight">
            {part}
          </span>
        );
      }
      return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
    });
  };

  const handleKeywordInputChange = (value: string) => {
    const normalizedValue = toSafeString(value);

    // When transitioning into ID mode, wipe all filters so they can't suppress the result
    if (!isIdKeyword && analyzeQuickSearchKeyword(normalizedValue).isIdKeyword) {
      setPropertyType("warehouse");
      setDraftPropertyType("warehouse");
      setProvince("");
      setProvinceQuery("");
      setSelectedDistricts([]);
      setSelectedSubDistricts([]);
      setDistrictQuery("");
      setSubDistrictQuery("");
      setLocationPickerView("province");
      setSizeMin(""); setSizeMax("");
      setDraftSizeMin(""); setDraftSizeMax("");
      setPriceMin(""); setPriceMax("");
      setDraftPriceMin(""); setDraftPriceMax("");
      setPriceMode("month"); setDraftPriceMode("month");
      setSelectedFeatures([]); setDraftSelectedFeatures([]);
      setSelectedZoneTypes([]); setDraftSelectedZoneTypes([]);
      setFloorLoad(""); setDraftFloorLoad("");
      setClearHeightMin(""); setClearHeightMax("");
      setDraftClearHeightMin(""); setDraftClearHeightMax("");
    }

    setKeyword(normalizedValue);
    setActiveSuggestionIndex(-1);
    setShowKeywordSuggestions(toSafeTrimmedString(normalizedValue).length >= AUTOCOMPLETE_MIN_CHARS);
  };

  const openKeywordSearchOverlay = () => {
    captureMobileScrollPosition();
    setIsKeywordFieldFocused(true);
    setShowKeywordSuggestions(true);
  };

  const closeKeywordSearchOverlay = () => {
    const scrollTarget = getLockedScrollTarget();

    setIsKeywordFieldFocused(false);
    setShowKeywordSuggestions(false);
    setActiveSuggestionIndex(-1);

    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    restoreScrollPosition(scrollTarget);
  };

  const handleKeywordInputPointerDown = (event: React.PointerEvent<HTMLInputElement>) => {
    if (!isMobileSearchViewport()) return;

    event.preventDefault();
    // flushSync forces React to render the overlay portal synchronously so
    // mobileSearchInputRef.current is set before we call .focus() — iOS Safari
    // only opens the keyboard when .focus() is called within the same gesture.
    flushSync(() => {
      openKeywordSearchOverlay();
    });
    mobileSearchInputRef.current?.focus({ preventScroll: true });
  };

  const handleKeywordInputFocus = () => {
    openKeywordSearchOverlay();
  };

  const handleKeywordInputBlur = () => {
    // On mobile, we don't want the blur event of the hero input to close the overlay,
    // because the overlay has its own input that should remain active.
    if (isMobileSearchViewport()) {
      return;
    }

    window.setTimeout(() => {
      setIsKeywordFieldFocused(false);
      setShowKeywordSuggestions(false);
      setActiveSuggestionIndex(-1);
    }, 120);
  };

  const openLocationPicker = () => {
    setIsLocationPickerOpen(true);
    const targetView = !province
      ? "province"
      : selectedSubDistricts.length > 0 && selectedDistricts.length === 1
        ? "subdistrict"
        : "district";
    setLocationPickerView(targetView);

    // On mobile, keep the keyword focus state (and thus the portal) active
    // so the location picker can overlay it correctly.
    if (!isMobileSearchViewport()) {
      setIsKeywordFieldFocused(false);
      setShowKeywordSuggestions(false);
    }

    setActiveSuggestionIndex(-1);
    setActiveDropdown(null);
    setActiveRangePicker(null);

    // Force keyboard dismissal on mobile
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const closeLocationPicker = () => {
    setIsLocationPickerClosing(true);
  };

  const handleProvinceSelection = (value: string) => {
    const nextProvince = toSafeTrimmedString(value);
    setLocationSlideDirection("forward");
    setProvince(nextProvince);
    setProvinceQuery("");
    setSelectedDistricts([]);
    setSelectedSubDistricts([]);
    setDistrictQuery("");
    setSubDistrictQuery("");
    setLocationPickerView("district");
  };

  const handleLocationBack = () => {
    setLocationSlideDirection("back");
    if (locationPickerView === "subdistrict") {
      setLocationPickerView("district");
      return;
    }
    setProvince("");
    setProvinceQuery("");
    setSelectedDistricts([]);
    setSelectedSubDistricts([]);
    setDistrictQuery("");
    setSubDistrictQuery("");
    setLocationPickerView("province");
  };

  const handleLocationClear = () => {
    setProvince("");
    setProvinceQuery("");
    setSelectedDistricts([]);
    setSelectedSubDistricts([]);
    setDistrictQuery("");
    setSubDistrictQuery("");
    setLocationPickerView("province");
  };

  const handleNavigateToSubDistrict = () => {
    setLocationSlideDirection("forward");
    setLocationPickerView("subdistrict");
    setShowSubDistrictGuide(false);
  };

  const handleLocationApply = () => {
    setIsLocationPickerClosing(true);
    if (isMobileSearchViewport()) {
      setIsKeywordFieldFocused(false);
      setShowKeywordSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  };

  const handleKeywordInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showKeywordSuggestions) {
      if (event.key === "Enter") {
        event.preventDefault();
        if (isMobileSearchViewport()) {
          closeKeywordSearchOverlay();
          navigateToListing();
        } else {
          (event.currentTarget.form as HTMLFormElement)?.requestSubmit();
        }
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((prev) =>
        Math.min(prev + 1, flattenedKeywordSuggestions.length - 1),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (
        activeSuggestionIndex >= 0 &&
        flattenedKeywordSuggestions[activeSuggestionIndex]
      ) {
        handleAutocompleteSelect(
          flattenedKeywordSuggestions[activeSuggestionIndex].field,
          flattenedKeywordSuggestions[activeSuggestionIndex].value,
          {
            parentProvince: flattenedKeywordSuggestions[activeSuggestionIndex].parentProvince,
            parentDistrict: flattenedKeywordSuggestions[activeSuggestionIndex].parentDistrict,
          },
        );
        return;
      }
      setShowKeywordSuggestions(false);
      setActiveSuggestionIndex(-1);
      if (isMobileSearchViewport()) closeKeywordSearchOverlay();
      navigateToListing();
      return;
    }

    if (event.key === "Escape") {
      setShowKeywordSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  };

  const handleRangeInputChange = (kind: RangePickerKind, field: "min" | "max", value: string) => {
    const normalizedValue = toSafeTrimmedString(value);

    if (kind === "area") {
      if (field === "min") {
        setSizeMin(normalizedValue);
      } else {
        setSizeMax(normalizedValue);
      }
      return;
    }

    if (kind === "price") {
      if (field === "min") {
        setPriceMin(normalizedValue);
      } else {
        setPriceMax(normalizedValue);
      }
      return;
    }

    handleClearHeightChange(field, normalizedValue);
  };

  const handlePriceModeChange = (mode: "month" | "sqm") => {
    setPriceMode(mode);
    setPriceMin("");
    setPriceMax("");
  };

  const openPrimaryFilterPopup = (tab: PrimaryFilterTab) => {
    setDraftPropertyType(propertyType || "warehouse");
    setDraftSizeMin(sizeMin);
    setDraftSizeMax(sizeMax);
    setDraftPriceMin(priceMin);
    setDraftPriceMax(priceMax);
    setDraftPriceMode(priceMode);
    setPrimaryFilterTab(tab);
    setIsPrimaryFilterPopupOpen(true);
    setActiveDropdown(null);
    setActiveRangePicker(null);
  };

  const closePrimaryFilterPopup = () => {
    setIsPrimaryFilterClosing(true);
  };

  const handlePrimaryPopupPriceModeChange = (mode: "month" | "sqm") => {
    setDraftPriceMode(mode);
    setDraftPriceMin("");
    setDraftPriceMax("");
  };

  const handlePrimaryFilterClear = () => {
    if (primaryFilterTab === "type") {
      setDraftPropertyType("warehouse");
      return;
    }

    if (primaryFilterTab === "area") {
      setDraftSizeMin("");
      setDraftSizeMax("");
      return;
    }

    setDraftPriceMin("");
    setDraftPriceMax("");
  };

  const handlePrimaryFilterApply = () => {
    const normalizedSize = normalizeNumericRange(draftSizeMin, draftSizeMax);
    const normalizedPrice = normalizeNumericRange(draftPriceMin, draftPriceMax);

    setPropertyType(draftPropertyType || "warehouse");
    setSizeMin(normalizedSize.min);
    setSizeMax(normalizedSize.max);
    setPriceMode(draftPriceMode);
    setPriceMin(normalizedPrice.min);
    setPriceMax(normalizedPrice.max);
    setIsPrimaryFilterClosing(true);
  };

  const openAdvancedFilterPopup = () => {
    setDraftSelectedZoneTypes([...selectedZoneTypes]);
    setDraftSelectedFeatures([...selectedFeatures]);
    setDraftFloorLoad(floorLoad);
    setDraftClearHeightMin(clearHeightMin);
    setDraftClearHeightMax(clearHeightMax);
    setIsAdvancedFilterPopupOpen(true);
    setActiveDropdown(null);
    setActiveRangePicker(null);
  };

  const toggleAdvancedSection = (section: string) => {
    setAdvancedOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const closeAdvancedFilterPopup = () => {
    setIsAdvancedFilterClosing(true);
  };

  const handleAdvancedFilterClear = () => {
    setDraftSelectedZoneTypes([]);
    setDraftSelectedFeatures([]);
    setDraftFloorLoad("");
    setDraftClearHeightMin("");
    setDraftClearHeightMax("");
  };

  const handleAdvancedFilterApply = () => {
    const normalizedHeight = normalizeNumericRange(draftClearHeightMin, draftClearHeightMax);
    setSelectedZoneTypes([...draftSelectedZoneTypes]);
    setSelectedFeatures([...draftSelectedFeatures]);
    setFloorLoad(draftFloorLoad);
    setClearHeightMin(normalizedHeight.min);
    setClearHeightMax(normalizedHeight.max);
    setIsAdvancedFilterClosing(true);
  };

  const openMobileFiltersPanel = () => {
    setDraftPropertyType(propertyType || "warehouse");
    setDraftSizeMin(sizeMin);
    setDraftSizeMax(sizeMax);
    setDraftPriceMin(priceMin);
    setDraftPriceMax(priceMax);
    setDraftPriceMode(priceMode);
    setDraftSelectedZoneTypes([...selectedZoneTypes]);
    setDraftSelectedFeatures([...selectedFeatures]);
    setDraftFloorLoad(floorLoad);
    setDraftClearHeightMin(clearHeightMin);
    setDraftClearHeightMax(clearHeightMax);

    const nextSections = new Set<MobileFilterSection>(["type"]);
    if (sizeMin || sizeMax) nextSections.add("area");
    if (priceMin || priceMax) nextSections.add("price");
    if (selectedZoneTypes.length > 0) nextSections.add("zone");
    if (selectedFeatures.length > 0) nextSections.add("features");
    if (floorLoad) nextSections.add("floorLoad");
    if (clearHeightMin || clearHeightMax) nextSections.add("clearHeight");

    setMobileFiltersOpenSections(nextSections);
    setIsMobileFiltersPanelClosing(false);
    setIsMobileFiltersPanelOpen(true);
    setIsPrimaryFilterPopupOpen(false);
    setIsAdvancedFilterPopupOpen(false);
  };

  const closeMobileFiltersPanel = () => {
    setIsMobileFiltersPanelClosing(true);
  };

  const openMobileSearchSheet = () => {
    setIsMobileSearchSheetClosing(false);
    setIsMobileSearchSheetOpen(true);
  };

  const closeMobileSearchSheet = () => {
    setIsMobileSearchSheetClosing(true);
  };

  const toggleMobileFilterSection = (section: MobileFilterSection) => {
    setMobileFiltersOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleMobileFiltersClear = () => {
    setDraftPropertyType("warehouse");
    setDraftSizeMin("");
    setDraftSizeMax("");
    setDraftPriceMin("");
    setDraftPriceMax("");
    setDraftPriceMode("month");
    setDraftSelectedZoneTypes([]);
    setDraftSelectedFeatures([]);
    setDraftFloorLoad("");
    setDraftClearHeightMin("");
    setDraftClearHeightMax("");
  };

  const handleMobileFiltersApply = () => {
    const normalizedSize = normalizeNumericRange(draftSizeMin, draftSizeMax);
    const normalizedPrice = normalizeNumericRange(draftPriceMin, draftPriceMax);

    setPropertyType(draftPropertyType || "warehouse");
    setSizeMin(normalizedSize.min);
    setSizeMax(normalizedSize.max);
    setPriceMode(draftPriceMode);
    setPriceMin(normalizedPrice.min);
    setPriceMax(normalizedPrice.max);
    setSelectedZoneTypes([...draftSelectedZoneTypes]);
    setSelectedFeatures([...draftSelectedFeatures]);
    setFloorLoad(draftFloorLoad);
    setClearHeightMin(draftClearHeightMin);
    setClearHeightMax(draftClearHeightMax);

    setIsMobileFiltersPanelClosing(true);
  };

  const handleClearHeightChange = (field: "min" | "max", value: string) => {
    const nextMin = field === "min" ? value : clearHeightMin;
    const nextMax = field === "max" ? value : clearHeightMax;
    const normalized = normalizeNumericRange(nextMin, nextMax);
    setClearHeightMin(normalized.min);
    setClearHeightMax(normalized.max);
  };

  const navigateToListing = (overrides?: NavigateOverrides) => {
    const normalizedSize = normalizeNumericRange(sizeMin, sizeMax);
    const normalizedPrice = normalizeNumericRange(priceMin, priceMax);
    const normalizedHeight = normalizeNumericRange(clearHeightMin, clearHeightMax);

    const effectiveKeyword = overrides?.keyword !== undefined ? overrides.keyword : keywordForSearch;
    const keywordQuery = toSafeTrimmedString(effectiveKeyword);
    const effectiveStatus = overrides?.status !== undefined
      ? overrides.status
      : (isIdKeyword ? idImpliedStatus : status);
    const effectiveType = overrides?.type !== undefined ? overrides.type : propertyType;
    const effectiveProvince = overrides?.province !== undefined ? overrides.province : province;
    const effectiveDistricts = overrides?.district !== undefined ? overrides.district : selectedDistricts;
    const effectiveSubDistricts = overrides?.sub_district !== undefined ? overrides.sub_district : selectedSubDistricts;

    const nextParams = new URLSearchParams();
    if (keywordQuery) nextParams.set("keyword", keywordQuery);
    if (effectiveStatus) nextParams.set("status", effectiveStatus);
    if (effectiveType) nextParams.set("type", effectiveType);
    if (effectiveProvince) nextParams.set("province", effectiveProvince);
    if (effectiveDistricts.length > 0) nextParams.set("district", effectiveDistricts.join(","));
    if (effectiveSubDistricts.length > 0) {
      nextParams.set("sub_district", effectiveSubDistricts.join(","));
    }
    if (normalizedSize.min) nextParams.set("size_min", normalizedSize.min);
    if (normalizedSize.max) nextParams.set("size_max", normalizedSize.max);
    if (normalizedPrice.min) nextParams.set("price_min", normalizedPrice.min);
    if (normalizedPrice.max) nextParams.set("price_max", normalizedPrice.max);
    if (normalizedPrice.min || normalizedPrice.max) nextParams.set("price_mode", priceMode);
    if (selectedFeatures.length > 0) nextParams.set("features", selectedFeatures.join(","));
    if (selectedZoneTypes.length > 0) nextParams.set("zone_types", selectedZoneTypes.join(","));
    if (floorLoad) nextParams.set("floor_load", floorLoad);
    if (normalizedHeight.min) nextParams.set("min_height", normalizedHeight.min);
    if (normalizedHeight.max) nextParams.set("max_height", normalizedHeight.max);

    const queryString = nextParams.toString();
    // DEMO-ONLY (ai-search-demo): open the real public listing URL instead.
    if (onNavigate) {
      onNavigate(queryString);
      return;
    }
    // Stamp filters onto the current history entry so Back navigation restores state.
    // Uses native replaceState (synchronous) to avoid racing with the router.push below.
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/${locale}${queryString ? `?${queryString}` : ""}`);
    }
    router.push(`/${locale}/listing${queryString ? `?${queryString}` : ""}`);  };

  const handleAutocompleteSelect = (
    field: string,
    value: string,
    meta?: { parentProvince?: string; parentDistrict?: string },
  ) => {
    const safeValue = toSafeTrimmedString(value);
    setShowKeywordSuggestions(false);
    setActiveSuggestionIndex(-1);
    setIsKeywordFieldFocused(false); // Close mobile search overlay if open

    switch (field) {
      case "province":
        setProvince(safeValue);
        setSelectedDistricts([]);
        setSelectedSubDistricts([]);
        setKeyword(safeValue);
        break;
      case "district": {
        const parentProv = meta?.parentProvince ?? "";
        if (parentProv) setProvince(parentProv);
        setSelectedDistricts((prev) => 
          (parentProv && parentProv !== province) 
            ? [safeValue] 
            : (prev.includes(safeValue) ? prev : [...prev, safeValue])
        );
        setSelectedSubDistricts([]);
        setKeyword(safeValue);
        break;
      }
      case "sub_district": {
        const parentProv = meta?.parentProvince ?? "";
        const parentDist = meta?.parentDistrict ?? "";
        if (parentProv) setProvince(parentProv);
        if (parentDist) {
          setSelectedDistricts((prev) => 
            (parentProv && parentProv !== province) || (prev.length === 1 && prev[0] !== parentDist)
              ? [parentDist] 
              : prev
          );
        }
        setSelectedSubDistricts((prev) => 
          (parentProv && parentProv !== province) || (parentDist && selectedDistricts[0] !== parentDist)
            ? [safeValue]
            : (prev.includes(safeValue) ? prev : [...prev, safeValue])
        );
        setKeyword(safeValue);
        break;
      }
      case "type":
        setPropertyType(safeValue);
        setKeyword(safeValue);
        break;
      case "status":
        setStatus(safeValue as "" | "rent" | "sale");
        setKeyword(safeValue);
        break;
      default:
        setKeyword(safeValue);
        break;
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateToListing();
  };

  const advancedFilterCount =
    selectedZoneTypes.length +
    selectedFeatures.length +
    (floorLoad ? 1 : 0) +
    (clearHeightMin || clearHeightMax ? 1 : 0);

  const mobileFilterCount =
    (sizeMin || sizeMax ? 1 : 0) +
    (priceMin || priceMax ? 1 : 0) +
    (propertyType && propertyType !== "warehouse" ? 1 : 0) +
    advancedFilterCount;

  const mobileHasRangeError = primarySizeRangeError || primaryPriceRangeError || advancedHeightRangeError;

  const renderAdvancedFilterTooltip = () => {
    return (
      <div className="quick-search-more-filters-tooltip-content">
        {selectedZoneTypes.length > 0 && (
          <div className="tooltip-row">
            <span className="tooltip-label">{qs.zone}:</span>
            <span className="tooltip-value">{selectedZoneTypes.map(translateZoneLabel).join(", ")}</span>
          </div>
        )}
        {selectedFeatures.length > 0 && (
          <div className="tooltip-row">
            <span className="tooltip-label">{qs.features}:</span>
            <span className="tooltip-value">{selectedFeatures.map(translateFeatureLabel).join(", ")}</span>
          </div>
        )}
        {floorLoad && (
          <div className="tooltip-row">
            <span className="tooltip-label">{qs.floorLoadingCapacity}:</span>
            <span className="tooltip-value">{formatFloorLoadLabel(floorLoad)}</span>
          </div>
        )}
        {(clearHeightMin || clearHeightMax) && (
          <div className="tooltip-row">
            <span className="tooltip-label">{qs.clearHeight}:</span>
            <span className="tooltip-value">
              {clearHeightMin ? `${clearHeightMin}m` : qs.noMin} - {clearHeightMax ? `${clearHeightMax}m` : qs.noMax}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <form ref={formRef} className={`custom-form quick-search-form-v2${variant === "home" ? " qs-form--home" : ""}`} onSubmit={handleSubmit} data-id-mode={isIdKeyword ? "true" : undefined}>
      <div className="quick-search-v2-grid">
        {isIdKeyword && (
          <div className="quick-search-id-mode-banner">
            <div className="quick-search-id-mode-banner-left">
              <span className="quick-search-id-mode-lock-wrap">
                <i className="fa-light fa-lock-keyhole"></i>
              </span>
              <div className="quick-search-id-mode-banner-text">
                <span className="quick-search-id-mode-banner-title">{qs.exactPropertySearchMode}</span>
                <span className="quick-search-id-mode-banner-sub">{qs.filtersDisabled}</span>
              </div>
            </div>
            <button
              type="button"
              className="quick-search-id-mode-exit"
              onClick={() => { setKeyword(""); }}
            >
              <i className="fa-light fa-xmark"></i>
              <span>{qs.exitSearchMode}</span>
            </button>
          </div>
        )}

        {/* Mobile pill trigger — shown via listing page CSS on mobile only */}
        <div className="qs-mobile-pill-wrap">
          <button type="button" className="qs-mobile-pill" onClick={openMobileSearchSheet}>
            <i className="fa-light fa-magnifying-glass qs-mobile-pill__search-icon" />
            <span className="qs-mobile-pill__text">
              {keyword || qs.searchFiltersPlaceholder}
            </span>
            <span className={`qs-mobile-pill__filter-icon${mobileFilterCount > 0 ? " has-value" : ""}`}>
              <i className="fa-light fa-sliders" />
              {mobileFilterCount > 0 && <span className="qs-mobile-pill__badge">{mobileFilterCount}</span>}
            </span>
          </button>
        </div>

        <div className="quick-search-hero-row">
          <div className="cs-intputwrap quick-search-input-wrap quick-search-autocomplete quick-search-keyword-cell quick-search-keyword-full">
              <i className="fa-light fa-magnifying-glass"></i>

              <input
                id="hero-keyword"
                name="keyword"
                type="text"
                placeholder={keywordInputPlaceholder}
                value={keyword}
                onChange={(e) => handleKeywordInputChange(e.target.value)}
                onPointerDown={handleKeywordInputPointerDown}
                onFocus={handleKeywordInputFocus}
                onBlur={handleKeywordInputBlur}
                onKeyDown={handleKeywordInputKeyDown}
                autoComplete="off"
                readOnly={mounted ? isMobileSearchViewport() : undefined}
                onClick={() => {
                  if (mounted && isMobileSearchViewport()) {
                    handleKeywordInputFocus();
                  }
                }}
              />

              {/* Clear — clears keyword text and location filter together */}
              {keyword && (
                <button
                  type="button"
                  className="quick-search-keyword-clear-btn"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setKeyword(""); handleLocationClear(); setShowKeywordSuggestions(false); }}
                  aria-label={qs.clear}
                >
                  <i className="fa-light fa-xmark"></i>
                </button>
              )}

              {isKeywordDropdownVisible && (
                isMobileSearchViewport() ? (
                  mounted && createPortal(
                    <div className="quick-search-mobile-search-overlay">
                      <div className="quick-search-mobile-search-header">
                        <div className="quick-search-mobile-search-input-box">
                          <i className="fa-light fa-magnifying-glass"></i>
                          <input
                            ref={mobileSearchInputRef}
                            type="text"
                            placeholder={keywordInputPlaceholder}
                            value={keyword}
                            onChange={(e) => handleKeywordInputChange(e.target.value)}
                            onKeyDown={handleKeywordInputKeyDown}
                            autoComplete="off"
                          />
                          {keyword && (
                            <button
                              type="button"
                              className="quick-search-mobile-search-clear"
                              onClick={() => { setKeyword(""); handleLocationClear(); }}
                            >
                              <i className="fa-light fa-circle-xmark"></i>
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          className="quick-search-mobile-search-close"
                          onPointerDown={(event) => event.preventDefault()}
                          onClick={closeKeywordSearchOverlay}
                        >
                          <i className="fa-light fa-xmark"></i>
                        </button>
                      </div>

                      <div className="quick-search-mobile-search-body">
                        <div className="quick-search-search-mode-launcher">
                          <button
                            type="button"
                            className="quick-search-search-mode-button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={openLocationPicker}
                          >
                            <span className="quick-search-search-mode-icon">
                              <i className="fa-light fa-location-dot"></i>
                            </span>
                            <span className="quick-search-search-mode-text">
                              <span className="quick-search-search-mode-text-main">
                                {qs.searchByProvince}
                              </span>
                              <span className="quick-search-search-mode-text-sub">
                                {locationSummaryLabel || qs.changeLocation}
                              </span>
                            </span>
                          </button>
                        </div>

                        {keywordSuggestionsLoading ? (
                          <div className="quick-search-autocomplete-state">{qs.searching}</div>
                        ) : toSafeTrimmedString(keyword).length >= AUTOCOMPLETE_MIN_CHARS && keywordSuggestionGroups.length === 0 ? (
                          <div className="quick-search-autocomplete-state">{qs.noSuggestions}</div>
                        ) : (
                          keywordSuggestionGroups.flatMap((group) =>
                            group.items.map((item) => (
                              <button
                                key={`${group.field}-${item.value}-${item.flatIndex}`}
                                type="button"
                                className={`quick-search-autocomplete-item ${activeSuggestionIndex === item.flatIndex ? "active" : ""}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleAutocompleteSelect(group.field, item.value, {
                                  parentProvince: item.parentProvince,
                                  parentDistrict: item.parentDistrict,
                                })}
                              >
                                <span className="quick-search-autocomplete-content">
                                  <span className="quick-search-autocomplete-title">
                                    {renderHighlightedText(item.value, keyword)}
                                  </span>
                                  {(item.parentDistrict || item.parentProvince) && (
                                    <span className="quick-search-autocomplete-subtitle">
                                      {[item.parentDistrict, item.parentProvince].filter(Boolean).join(", ")}
                                    </span>
                                  )}
                                </span>
                                <span className="quick-search-autocomplete-type">{group.fieldLabel}</span>
                              </button>
                            ))
                          )
                        )}
                      </div>
                    </div>
                  , document.body)
                ) : (
                  <div className="quick-search-autocomplete-dropdown">
                    <div className="quick-search-search-mode-launcher">
                      <button
                        type="button"
                        className="quick-search-search-mode-button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={openLocationPicker}
                      >
                        <span className="quick-search-search-mode-icon">
                          <i className="fa-light fa-location-dot"></i>
                        </span>
                        <span className="quick-search-search-mode-text">
                          <span className="quick-search-search-mode-text-main">
                            {qs.searchByProvince}
                          </span>
                          <span className="quick-search-search-mode-text-sub">
                            {locationSummaryLabel || qs.changeLocation}
                          </span>
                        </span>
                      </button>
                    </div>

                    {keywordSuggestionsLoading ? (
                      <div className="quick-search-autocomplete-state">{qs.searching}</div>
                    ) : toSafeTrimmedString(keyword).length >= AUTOCOMPLETE_MIN_CHARS && keywordSuggestionGroups.length === 0 ? (
                      <div className="quick-search-autocomplete-state">{qs.noSuggestions}</div>
                    ) : (
                      keywordSuggestionGroups.flatMap((group) =>
                        group.items.map((item) => (
                          <button
                            key={`${group.field}-${item.value}-${item.flatIndex}`}
                            type="button"
                            className={`quick-search-autocomplete-item ${activeSuggestionIndex === item.flatIndex ? "active" : ""}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleAutocompleteSelect(group.field, item.value, {
                              parentProvince: item.parentProvince,
                              parentDistrict: item.parentDistrict,
                            })}
                          >
                            <span className="quick-search-autocomplete-content">
                              <span className="quick-search-autocomplete-title">
                                {renderHighlightedText(item.value, keyword)}
                              </span>
                              {(item.parentDistrict || item.parentProvince) && (
                                <span className="quick-search-autocomplete-subtitle">
                                  {[item.parentDistrict, item.parentProvince].filter(Boolean).join(", ")}
                                </span>
                              )}
                            </span>
                            <span className="quick-search-autocomplete-type">{group.fieldLabel}</span>
                          </button>
                        ))
                      )
                    )}
                  </div>
                )
              )}
            </div>

          <button
            type="submit"
            className="quick-search-hero-submit"
          >
            <i className="fa-light fa-magnifying-glass"></i>
            <span>{qs.search}</span>
          </button>
        </div>

        {variant === "home" && (
          <div className={`qs-home-compact${isIdKeyword ? " quick-search-filters-disabled" : ""}`}>
            {/* Rent / Sale toggle row */}
            <div className={`qs-hc-status-row${isIdKeyword ? " quick-status-multi-id-locked" : ""}`}>
              <input className="hidden radio-label" type="radio" name="status-hc" id="hc-rent"
                value="rent"
                checked={isIdKeyword ? idImpliedStatus === "rent" : status === "rent"}
                onChange={(e) => { if (!isIdKeyword) setStatus(e.target.value); }}
                disabled={isIdKeyword}
              />
              <label className="qs-hc-status-btn" htmlFor="hc-rent">
                <i className="fa-light fa-house" />
                <span>{qs.forRent}</span>
              </label>
              <input className="hidden radio-label" type="radio" name="status-hc" id="hc-sale"
                value="sale"
                checked={isIdKeyword ? idImpliedStatus === "sale" : status === "sale"}
                onChange={(e) => { if (!isIdKeyword) setStatus(e.target.value); }}
                disabled={isIdKeyword}
              />
              <label className="qs-hc-status-btn" htmlFor="hc-sale">
                <i className="fa-light fa-tag" />
                <span>{qs.forSale}</span>
              </label>
            </div>

            {/* Type row */}
            <div className="qs-hc-row">
              <button type="button"
                className="qs-hc-row__trigger"
                onClick={() => openPrimaryFilterPopup("type")}
                disabled={isIdKeyword}
              >
                <span className="qs-hc-row__icon">
                  <i className={`fa-light ${getPropertyTypeIconClass(propertyType)}`} />
                </span>
                <span className={`qs-hc-row__label${propertyType ? " has-value" : ""}`}>
                  {getPropertyTypeLabel(propertyType, qs)}
                </span>
                <i className="fa-light fa-chevron-right qs-hc-row__chevron" />
              </button>
            </div>

            {/* Area Size row */}
            <div className="qs-hc-row">
              <button type="button"
                className="qs-hc-row__trigger"
                onClick={() => openPrimaryFilterPopup("area")}
                disabled={isIdKeyword}
              >
                <span className="qs-hc-row__icon"><i className="fa-light fa-ruler-combined" /></span>
                <span className={`qs-hc-row__label${sizeMin || sizeMax ? " has-value" : ""}`}>{areaSummaryLabel}</span>
                <i className="fa-light fa-chevron-right qs-hc-row__chevron" />
              </button>
            </div>

            {/* Price Range row */}
            <div className="qs-hc-row">
              <button type="button"
                className="qs-hc-row__trigger"
                onClick={() => openPrimaryFilterPopup("price")}
                disabled={isIdKeyword}
              >
                <span className="qs-hc-row__icon"><i className="fa-light fa-baht-sign" /></span>
                <span className={`qs-hc-row__label${priceMin || priceMax ? " has-value" : ""}`}>{priceSummaryLabel}</span>
                <i className="fa-light fa-chevron-right qs-hc-row__chevron" />
              </button>
            </div>

            {/* More Filters row */}
            <div className="qs-hc-row qs-hc-row--more-filters">
              <button
                type="button"
                className="qs-hc-more-filters-btn"
                onClick={() => openMobileFiltersPanel()}
                disabled={isIdKeyword}
              >
                <i className="fa-light fa-sliders" />
                <span>{qs.moreFilters}</span>
                {advancedFilterCount > 0 && <span className="qs-hc-badge">{advancedFilterCount}</span>}
              </button>
            </div>

            {/* Bottom bar */}
            <div className="qs-hc-bottom-bar">
              <button type="submit" className="qs-hc-search-btn qs-hc-search-btn--full" disabled={isRangeInvalid(sizeMin, sizeMax) || isRangeInvalid(priceMin, priceMax) || isRangeInvalid(clearHeightMin, clearHeightMax)}>
                <i className="fa-light fa-magnifying-glass" />
                <span>{qs.search}</span>
              </button>
            </div>
          </div>
        )}

        {mounted && (isPrimaryFilterPopupOpen || isPrimaryFilterClosing) && createPortal(
          <div
            className={`quick-search-primary-popup-overlay${isPrimaryFilterClosing ? " is-closing" : ""}`}
            onAnimationEnd={(e) => {
              if (e.target === e.currentTarget && isPrimaryFilterClosing) {
                setIsPrimaryFilterPopupOpen(false);
                setIsPrimaryFilterClosing(false);
              }
            }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closePrimaryFilterPopup();
              }
            }}
          >
            <div className="quick-search-primary-popup-modal">
              <div className="quick-search-primary-popup-head">
                <h3>{qs.filters}</h3>
                <button
                  type="button"
                  className="quick-search-primary-popup-close"
                  onClick={closePrimaryFilterPopup}
                  aria-label={qs.close}
                >
                  <i className="fa-light fa-xmark"></i>
                </button>
              </div>

              <div className="quick-search-primary-popup-tabs">
                <button
                  type="button"
                  className={`quick-search-primary-popup-tab ${primaryFilterTab === "type" ? "is-active" : ""}`}
                  onClick={() => setPrimaryFilterTab("type")}
                  disabled={primaryHasRangeError}
                >
                  {qs.propertyTypeLabel}
                </button>
                <button
                  type="button"
                  className={`quick-search-primary-popup-tab ${primaryFilterTab === "area" ? "is-active" : ""}`}
                  onClick={() => setPrimaryFilterTab("area")}
                  disabled={primaryHasRangeError && primaryFilterTab !== "area"}
                >
                  {qs.areaSize}
                </button>
                <button
                  type="button"
                  className={`quick-search-primary-popup-tab ${primaryFilterTab === "price" ? "is-active" : ""}`}
                  onClick={() => setPrimaryFilterTab("price")}
                  disabled={primaryHasRangeError && primaryFilterTab !== "price"}
                >
                  {qs.priceRange}
                </button>
              </div>

              <div className="quick-search-primary-popup-body">
                {primaryFilterTab === "type" && (
                  <div className="qs-radio-list">
                    <button
                      type="button"
                      className={`qs-radio-item ${draftPropertyType === "warehouse" ? "is-active" : ""}`}
                      onClick={() => setDraftPropertyType("warehouse")}
                    >
                      <span className="qs-radio-item__icon">
                        <i className="fa-light fa-warehouse" />
                      </span>
                      <span className="qs-radio-item__label">{qs.warehouse}</span>
                      <span className="qs-radio-item__dot" />
                    </button>
                    <button
                      type="button"
                      className={`qs-radio-item ${draftPropertyType === "factory" ? "is-active" : ""}`}
                      onClick={() => setDraftPropertyType("factory")}
                    >
                      <span className="qs-radio-item__icon">
                        <i className="fa-light fa-industry" />
                      </span>
                      <span className="qs-radio-item__label">{qs.factory}</span>
                      <span className="qs-radio-item__dot" />
                    </button>
                    <button
                      type="button"
                      className={`qs-radio-item ${draftPropertyType === SHOWROOM_COMMERCIAL_VALUE ? "is-active" : ""}`}
                      onClick={() => setDraftPropertyType(SHOWROOM_COMMERCIAL_VALUE)}
                    >
                      <span className="qs-radio-item__icon">
                        <i className="fa-light fa-store" />
                      </span>
                      <span className="qs-radio-item__label">{qs.showroomCommercial}</span>
                      <span className="qs-radio-item__dot" />
                    </button>
                  </div>
                )}

                {primaryFilterTab === "area" && (
                  <>
                    <div className="quick-search-range-field-labels">
                      <span>Min</span>
                      <span>Max</span>
                    </div>
                    <div className="quick-search-primary-popup-range-fields">
                      <div className="quick-search-range-popup-input-wrap">
                        <SingleSelectDropdown
                          options={[
                            { value: "", label: qs.noMin },
                            ...AREA_MIN_QUICK_PICK_OPTIONS.filter(Boolean).map((optionValue) => ({
                              value: optionValue,
                              label: formatFullAreaLabel(optionValue),
                            })),
                          ]}
                          value={draftSizeMin}
                          onChange={setDraftSizeMin}
                          placeholder={qs.noMin}
                          compact
                          allowCustomInput
                          customDisplayFormatter={formatAreaRangeDisplay}
                          suffix="sqm"
                        />
                      </div>
                      <span className="quick-search-size-separator">-</span>
                      <div className="quick-search-range-popup-input-wrap">
                        <SingleSelectDropdown
                          options={[
                            { value: "", label: qs.noMax },
                            ...AREA_MAX_QUICK_PICK_OPTIONS.filter(Boolean).map((optionValue) => ({
                              value: optionValue,
                              label: formatFullAreaLabel(optionValue),
                            })),
                          ]}
                          value={draftSizeMax}
                          onChange={setDraftSizeMax}
                          placeholder={qs.noMax}
                          compact
                          allowCustomInput
                          customDisplayFormatter={formatAreaRangeDisplay}
                          suffix="sqm"
                        />
                      </div>
                    </div>
                    {primarySizeRangeError && (
                      <p className="quick-search-range-error">{qs.rangeMinMaxError}</p>
                    )}
                  </>
                )}

                {primaryFilterTab === "price" && (
                  <>
                    <div className={`price-range-card${primaryPriceRangeError ? " has-error" : ""}`}>
                      <div className="price-mode-tabs price-mode-tabs--popup">
                        <button
                          type="button"
                          className={`price-mode-tab ${draftPriceMode === "month" ? "is-active" : ""}`}
                          onClick={() => handlePrimaryPopupPriceModeChange("month")}
                        >
                          {qs.perMonth}
                        </button>
                        <button
                          type="button"
                          className={`price-mode-tab ${draftPriceMode === "sqm" ? "is-active" : ""}`}
                          onClick={() => handlePrimaryPopupPriceModeChange("sqm")}
                        >
                          {qs.perSqm}
                        </button>
                      </div>

                      <p className="quick-search-primary-price-hint">
                        {draftPriceMode === "month" ? qs.perMonthHint : qs.perSqmHint}
                      </p>

                      <div className="quick-search-primary-popup-range-fields">
                        <div className="quick-search-range-popup-input-wrap">
                          <SingleSelectDropdown
                            options={[
                              { value: "", label: qs.noMin },
                              ...draftPriceMinQuickPickOptions.filter(Boolean).map((optionValue) => ({
                                value: optionValue,
                                label: draftPriceMode === "sqm"
                                  ? `฿${formatFullNumber(optionValue)}/sqm`
                                  : formatFullCurrencyLabel(optionValue),
                              })),
                            ]}
                            value={draftPriceMin}
                            onChange={setDraftPriceMin}
                            placeholder={qs.noMin}
                            compact
                            allowCustomInput
                            customDisplayFormatter={(v) => draftPriceMode === "sqm" ? `฿${formatFullNumber(v)}/sqm` : formatPriceRangeDisplay(v)}
                            icon={<span>฿</span>}
                            suffix={draftPriceMode === "sqm" ? "/sqm" : undefined}
                          />
                        </div>
                        <span className="quick-search-size-separator">-</span>
                        <div className="quick-search-range-popup-input-wrap">
                          <SingleSelectDropdown
                            options={[
                              { value: "", label: qs.noMax },
                              ...draftPriceMaxQuickPickOptions.filter(Boolean).map((optionValue) => ({
                                value: optionValue,
                                label: draftPriceMode === "sqm"
                                  ? `฿${formatFullNumber(optionValue)}/sqm`
                                  : formatFullCurrencyLabel(optionValue),
                              })),
                            ]}
                            value={draftPriceMax}
                            onChange={setDraftPriceMax}
                            placeholder={qs.noMax}
                            compact
                            allowCustomInput
                            customDisplayFormatter={(v) => draftPriceMode === "sqm" ? `฿${formatFullNumber(v)}/sqm` : formatPriceRangeDisplay(v)}
                            icon={<span>฿</span>}
                            suffix={draftPriceMode === "sqm" ? "/sqm" : undefined}
                          />
                        </div>
                      </div>
                      {primaryPriceRangeError && (
                        <p className="quick-search-range-error">{qs.rangeMinMaxError}</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="quick-search-primary-popup-footer">
                <button type="button" className="quick-search-primary-popup-clear" onClick={handlePrimaryFilterClear}>
                  {qs.clear}
                </button>
                <button type="button" className="quick-search-primary-popup-apply" onClick={handlePrimaryFilterApply} disabled={primaryHasRangeError}>
                  {qs.apply}
                </button>
              </div>
            </div>
          </div>
        , document.body)}

        {mounted && (isAdvancedFilterPopupOpen || isAdvancedFilterClosing) && createPortal(
          <div
            className={`quick-search-primary-popup-overlay${isAdvancedFilterClosing ? " is-closing" : ""}`}
            onAnimationEnd={(e) => {
              if (e.target === e.currentTarget && isAdvancedFilterClosing) {
                setIsAdvancedFilterPopupOpen(false);
                setIsAdvancedFilterClosing(false);
              }
            }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeAdvancedFilterPopup();
              }
            }}
          >
            <div className="quick-search-primary-popup-modal">
              <div className="quick-search-primary-popup-head">
                <h3>{qs.moreFilters}</h3>
                <button
                  type="button"
                  className="quick-search-primary-popup-close"
                  onClick={closeAdvancedFilterPopup}
                  aria-label={qs.close}
                >
                  <i className="fa-light fa-xmark"></i>
                </button>
              </div>

              <div className="qs-accordion">

                {/* Zone */}
                <div className="qs-accordion-section">
                  <button type="button" className={`qs-accordion-header ${advancedOpenSections.has("zone") ? "is-open" : ""}`} onClick={() => toggleAdvancedSection("zone")}>
                    <span className="qs-accordion-header__icon"><i className="fa-light fa-map-location-dot" /></span>
                    <span className="qs-accordion-header__label">{qs.zone}</span>
                    {draftSelectedZoneTypes.length > 0 && <span className="qs-accordion-badge">{draftSelectedZoneTypes.length}</span>}
                    <i className="fa-light fa-chevron-down qs-accordion-chevron" />
                  </button>
                  <div className={`qs-accordion-body ${advancedOpenSections.has("zone") ? "is-open" : ""}`}>
                    <div className="qs-accordion-body-inner">
                      <div className="qs-accordion-content">
                        {/* Free Trade Zone */}
                        <label className="qs-accordion-checkbox">
                          <input type="checkbox" checked={draftSelectedZoneTypes.includes("Free Trade Zone")} onChange={() => setDraftSelectedZoneTypes(prev => prev.includes("Free Trade Zone") ? prev.filter(z => z !== "Free Trade Zone") : [...prev, "Free Trade Zone"])} />
                          <span className="qs-accordion-checkbox__box"><i className="fa-solid fa-check" /></span>
                          <span className="qs-accordion-checkbox__label">{translateZoneLabel("Free Trade Zone")}</span>
                        </label>
                        {/* Purple Zone */}
                        <label className="qs-accordion-checkbox">
                          <input type="checkbox" checked={draftSelectedZoneTypes.includes("Purple Zone")} onChange={() => setDraftSelectedZoneTypes(prev => prev.includes("Purple Zone") ? prev.filter(z => z !== "Purple Zone") : [...prev, "Purple Zone"])} />
                          <span className="qs-accordion-checkbox__box"><i className="fa-solid fa-check" /></span>
                          <span className="qs-accordion-checkbox__label">{translateZoneLabel("Purple Zone")}</span>
                        </label>

                        {/* Nested: Industrial Estate toggle + radios */}
                        <div className="qs-accordion-checkbox-nested-wrap">
                          <label className="qs-accordion-checkbox" id="estateToggle">
                            <input type="checkbox" checked={draftSelectedZoneTypes.includes("Industrial Estate Zone") || draftSelectedZoneTypes.includes("IEAT")} onChange={() => {
                              if (draftSelectedZoneTypes.includes("Industrial Estate Zone") || draftSelectedZoneTypes.includes("IEAT")) {
                                setDraftSelectedZoneTypes(prev => prev.filter(z => z !== "Industrial Estate Zone" && z !== "IEAT"));
                              } else {
                                setDraftSelectedZoneTypes(prev => [...prev, "Industrial Estate Zone"]);
                              }
                            }} />
                            <span className="qs-accordion-checkbox__box"><i className="fa-solid fa-check" /></span>
                            <span className="qs-accordion-checkbox__label">{qs.industrialEstate}</span>
                          </label>
                          <div className={`qs-estate-radio-group ${(draftSelectedZoneTypes.includes("Industrial Estate Zone") || draftSelectedZoneTypes.includes("IEAT")) ? "is-enabled" : ""}`}>
                            <div className={`qs-estate-radio-item ${draftSelectedZoneTypes.includes("Industrial Estate Zone") ? "is-active" : ""}`} onClick={() => {
                              setDraftSelectedZoneTypes(prev => prev.includes("Industrial Estate Zone") ? prev : [...prev.filter(z => z !== "IEAT"), "Industrial Estate Zone"]);
                            }}>
                              <input type="radio" name="estate-type-adv" checked={draftSelectedZoneTypes.includes("Industrial Estate Zone")} readOnly />
                              <span className="qs-estate-radio-dot" />
                              <span className="qs-estate-radio-label">{qs.allIndustrialEstateZone}</span>
                            </div>
                            <div className={`qs-estate-radio-item ${draftSelectedZoneTypes.includes("IEAT") ? "is-active" : ""}`} onClick={() => {
                              setDraftSelectedZoneTypes(prev => prev.includes("IEAT") ? prev : [...prev.filter(z => z !== "Industrial Estate Zone"), "IEAT"]);
                            }}>
                              <input type="radio" name="estate-type-adv" checked={draftSelectedZoneTypes.includes("IEAT")} readOnly />
                              <span className="qs-estate-radio-dot" />
                              <span className="qs-estate-radio-label">{qs.ieatRegisteredOnly}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="qs-accordion-section">
                  <button type="button" className={`qs-accordion-header ${advancedOpenSections.has("feature") ? "is-open" : ""}`} onClick={() => toggleAdvancedSection("feature")}>
                    <span className="qs-accordion-header__icon"><i className="fa-light fa-list-check" /></span>
                    <span className="qs-accordion-header__label">{qs.features}</span>
                    {draftSelectedFeatures.length > 0 && <span className="qs-accordion-badge">{draftSelectedFeatures.length}</span>}
                    <i className="fa-light fa-chevron-down qs-accordion-chevron" />
                  </button>
                  <div className={`qs-accordion-body ${advancedOpenSections.has("feature") ? "is-open" : ""}`}>
                    <div className="qs-accordion-body-inner">
                      <div className="qs-accordion-content">
                        {featureOptions.length === 0 ? (
                          <div className="quick-search-multi-empty">{qs.noFeaturesFound}</div>
                        ) : (
                          featureOptions.map((item) => (
                            <label key={`feature-${item.value}`} className="qs-accordion-checkbox">
                              <input
                                type="checkbox"
                                checked={draftSelectedFeatures.includes(item.value)}
                                onChange={() => setDraftSelectedFeatures(prev => prev.includes(item.value) ? prev.filter(f => f !== item.value) : [...prev, item.value])}
                              />
                              <span className="qs-accordion-checkbox__box"><i className="fa-solid fa-check" /></span>
                              <span className="qs-accordion-checkbox__label">{translateFeatureLabel(item.label)}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floor Load */}
                <div className="qs-accordion-section">
                  <button type="button" className={`qs-accordion-header ${advancedOpenSections.has("floorLoad") ? "is-open" : ""}`} onClick={() => toggleAdvancedSection("floorLoad")}>
                    <span className="qs-accordion-header__icon"><i className="fa-light fa-weight-hanging" /></span>
                    <span className="qs-accordion-header__label">{qs.floorLoadingCapacity}</span>
                    {draftFloorLoad && <span className="qs-accordion-badge">1</span>}
                    <i className="fa-light fa-chevron-down qs-accordion-chevron" />
                  </button>
                  <div className={`qs-accordion-body ${advancedOpenSections.has("floorLoad") ? "is-open" : ""}`}>
                    <div className="qs-accordion-body-inner">
                      <div className="qs-accordion-content">
                        <div className="qs-radio-list">
                          <button type="button" className={`qs-radio-item ${draftFloorLoad === "" ? "is-active" : ""}`} onClick={() => setDraftFloorLoad("")}>
                            <span className="qs-radio-item__icon"><i className="fa-light fa-circle-minus" /></span>
                            <span className="qs-radio-item__label">{qs.noMin}</span>
                            <span className="qs-radio-item__dot" />
                          </button>
                          {floorLoadOptions.map(item => (
                            <button key={`floorLoad-${item}`} type="button" className={`qs-radio-item ${draftFloorLoad === item ? "is-active" : ""}`} onClick={() => setDraftFloorLoad(item)}>
                              <span className="qs-radio-item__icon"><i className="fa-light fa-weight-hanging" /></span>
                              <span className="qs-radio-item__label">{formatFloorLoadLabel(item)}</span>
                              <span className="qs-radio-item__dot" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clear Height */}
                <div className="qs-accordion-section">
                  <button type="button" className={`qs-accordion-header ${advancedOpenSections.has("clearHeight") ? "is-open" : ""}`} onClick={() => toggleAdvancedSection("clearHeight")}>
                    <span className="qs-accordion-header__icon"><i className="fa-light fa-ruler-vertical" /></span>
                    <span className="qs-accordion-header__label">{qs.clearHeight}</span>
                    {(draftClearHeightMin || draftClearHeightMax) && <span className="qs-accordion-badge">1</span>}
                    <i className="fa-light fa-chevron-down qs-accordion-chevron" />
                  </button>
                  <div className={`qs-accordion-body ${advancedOpenSections.has("clearHeight") ? "is-open" : ""}`}>
                    <div className="qs-accordion-body-inner">
                      <div className="qs-accordion-content">
                        <div className="quick-search-primary-popup-range-fields">
                          <div className="quick-search-range-popup-input-wrap">
                            <SingleSelectDropdown
                              options={[{ value: "", label: qs.noMin }, ...clearHeightNumericOptions.map((value) => ({ value, label: `${value} m` }))]}
                              value={draftClearHeightMin}
                              onChange={setDraftClearHeightMin}
                              placeholder={qs.noMin}
                              compact allowCustomInput
                              customDisplayFormatter={(value) => `${value} m`}
                              suffix="m"
                            />
                          </div>
                          <span className="quick-search-size-separator">-</span>
                          <div className="quick-search-range-popup-input-wrap">
                            <SingleSelectDropdown
                              options={[{ value: "", label: qs.noMax }, ...clearHeightNumericOptions.map((value) => ({ value, label: `${value} m` }))]}
                              value={draftClearHeightMax}
                              onChange={setDraftClearHeightMax}
                              placeholder={qs.noMax}
                              compact allowCustomInput
                              customDisplayFormatter={(value) => `${value} m`}
                              suffix="m"
                            />
                          </div>
                        </div>
                        {advancedHeightRangeError && (
                          <p className="quick-search-range-error">{qs.rangeMinMaxError}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="quick-search-primary-popup-footer">
                <button type="button" className="quick-search-primary-popup-clear" onClick={handleAdvancedFilterClear}>
                  {qs.clear}
                </button>
                <button type="button" className="quick-search-primary-popup-apply" onClick={handleAdvancedFilterApply} disabled={advancedHasRangeError}>
                  {qs.apply}
                </button>
              </div>
            </div>
          </div>
        , document.body)}

        {mounted && (isLocationPickerOpen || isLocationPickerClosing) && createPortal(
          <div
            className={`quick-search-location-overlay${isLocationPickerClosing ? " is-closing" : ""}`}
            onAnimationEnd={(e) => {
              if (e.target === e.currentTarget && isLocationPickerClosing) {
                setIsLocationPickerOpen(false);
                setIsLocationPickerClosing(false);
              }
            }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeLocationPicker();
              }
            }}
          >
            <div className="quick-search-location-modal">
              <div className="quick-search-location-modal-head">
                {locationPickerView !== "province" ? (
                  <button
                    type="button"
                    className="quick-search-location-modal-back"
                    onClick={handleLocationBack}
                    aria-label={qs.back}
                  >
                    <i className="fa-light fa-arrow-left"></i>
                  </button>
                ) : (
                  <span className="quick-search-location-modal-back-spacer" />
                )}
                <h3>
                  {locationPickerView === "province" && qs.filterByProvince}
                  {locationPickerView === "district" && selectedProvinceLabel}
                  {locationPickerView === "subdistrict" && (() => {
                    const d = districtOptions.find(x => x.nameEn === selectedDistricts[0]);
                    return d ? getLocalizedLocationName(d, normalizedLocale) : qs.selectSubDistricts;
                  })()}
                </h3>
                <button
                  type="button"
                  className="quick-search-location-modal-close"
                  onClick={closeLocationPicker}
                  aria-label={qs.hideAdvanced}
                >
                  <i className="fa-light fa-xmark"></i>
                </button>
              </div>

              <div className={`quick-search-location-modal-body slide-${locationSlideDirection}`} key={locationPickerView}>
                {locationPickerView === "province" && (
                  <>
                    <div className="quick-search-location-search-wrap">
                      <i className="fa-light fa-magnifying-glass"></i>
                      <input
                        type="text"
                        placeholder={qs.searchProvince}
                        value={provinceQuery}
                        onChange={(event) => setProvinceQuery(event.target.value)}
                      />
                    </div>

                    <div className="quick-search-location-list">
                      {visibleProvinces.length === 0 ? (
                        <div className="quick-search-location-empty">{qs.noOptionsFound}</div>
                      ) : (
                        visibleProvinces.map((item) => (
                          <button
                            key={`province-${item.nameEn}`}
                            type="button"
                            className={`quick-search-location-item ${province === item.nameEn ? "is-active" : ""}`}
                            onClick={() => handleProvinceSelection(item.nameEn)}
                          >
                            <span>{getLocalizedLocationName(item, normalizedLocale)}</span>
                            <i className="fa-light fa-chevron-right"></i>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}

                {locationPickerView === "district" && (
                  <>
                    <div className="quick-search-location-search-wrap">
                      <i className="fa-light fa-magnifying-glass"></i>
                      <input
                        type="text"
                        placeholder={qs.searchDistrict}
                        value={districtQuery}
                        onChange={(event) => setDistrictQuery(event.target.value)}
                      />
                    </div>

                    <div className="quick-search-location-list">
                      <button
                        type="button"
                        className={`quick-search-location-item quick-search-location-radio ${selectedDistricts.length === 0 ? "is-active" : ""}`}
                        onClick={() => {
                          setSelectedDistricts([]);
                          setSelectedSubDistricts([]);
                          setSubDistrictQuery("");
                        }}
                      >
                        <span>{qs.allDistricts}</span>
                        <i className={`fa-regular ${selectedDistricts.length === 0 ? "fa-circle-dot" : "fa-circle"}`}></i>
                      </button>

                      {visibleDistricts.length === 0 ? (
                        <div className="quick-search-location-empty">{qs.noDistrictsFound}</div>
                      ) : (
                        visibleDistricts.map((item) => {
                          const isSelectedDistrict = selectedDistricts.includes(item.nameEn);
                          const isAllDistrictMode = selectedDistricts.length === 0;
                          const isEffectivelySelected = isAllDistrictMode || isSelectedDistrict;

                          return (
                            <button
                              key={`district-${item.nameEn}`}
                              type="button"
                              className={`quick-search-location-item quick-search-location-checkbox ${isEffectivelySelected ? "is-active" : ""} ${isAllDistrictMode ? "is-all-mode" : ""}`}
                              onClick={() => toggleDistrictSelection(item.nameEn)}
                            >
                              <span>{getLocalizedLocationName(item, normalizedLocale)}</span>
                              <i className={`fa-regular ${isEffectivelySelected ? "fa-circle-check" : "fa-circle"}`}></i>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}

                {locationPickerView === "subdistrict" && (
                  <>
                    <div className="quick-search-location-search-wrap">
                      <i className="fa-light fa-magnifying-glass"></i>
                      <input
                        type="text"
                        placeholder={qs.searchSubDistrict}
                        value={subDistrictQuery}
                        onChange={(event) => setSubDistrictQuery(event.target.value)}
                      />
                    </div>

                    <div className="quick-search-location-list">
                      <button
                        type="button"
                        className={`quick-search-location-item quick-search-location-radio ${selectedSubDistricts.length === 0 ? "is-active" : ""}`}
                        onClick={() => setSelectedSubDistricts([])}
                      >
                        <span>{qs.allSubDistricts}</span>
                        <i className={`fa-regular ${selectedSubDistricts.length === 0 ? "fa-circle-dot" : "fa-circle"}`}></i>
                      </button>
                      {visibleSubDistricts.length === 0 ? (
                        <div className="quick-search-location-empty">{qs.noSubDistrictsFound}</div>
                      ) : (
                        visibleSubDistricts.map((subDistrictItem) => {
                          const isExplicit = selectedSubDistricts.includes(subDistrictItem.nameEn);
                          const isAllMode = selectedSubDistricts.length === 0;
                          return (
                            <button
                              key={`sub-district-${subDistrictItem.nameEn}`}
                              type="button"
                              className={`quick-search-location-item quick-search-location-checkbox ${(isAllMode || isExplicit) ? "is-active" : ""} ${isAllMode ? "is-all-mode" : ""}`}
                              onClick={() => toggleSubDistrictSelection(subDistrictItem.nameEn)}
                            >
                              <span>{getLocalizedLocationName(subDistrictItem, normalizedLocale)}</span>
                              <i className={`fa-regular ${(isAllMode || isExplicit) ? "fa-circle-check" : "fa-circle"}`}></i>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Sub-district navigation CTA — always visible in district view */}
              {locationPickerView === "district" && (
                <div className="qs-subdistrict-nav-bar">
                  <div className={`qs-subdistrict-nav-wrap${selectedDistricts.length !== 1 ? " is-disabled" : ""}`}>
                    <button
                      type="button"
                      className="qs-subdistrict-nav-btn"
                      onClick={handleNavigateToSubDistrict}
                      disabled={selectedDistricts.length !== 1}
                    >
                      <i className="fa-light fa-location-dot qs-subdistrict-nav-btn__icon" />
                      <span className="qs-subdistrict-nav-btn__label">{qs.selectSubDistricts}</span>
                      {selectedSubDistricts.length > 0 && (
                        <span className="qs-subdistrict-nav-btn__badge">{selectedSubDistricts.length}</span>
                      )}
                      <i className="fa-light fa-chevron-right qs-subdistrict-nav-btn__arrow" />
                    </button>
                    <div className={`qs-subdistrict-nav-tooltip${showSubDistrictGuide ? " is-guide-visible" : ""}`} role="tooltip">
                      <span>{showSubDistrictGuide ? (selectedDistricts.length > 1 ? qs.chooseOneDistrictForSubDistrict : qs.subDistrictGuide) : qs.chooseOneDistrictForSubDistrict}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="quick-search-location-modal-footer">
                <button type="button" className="quick-search-location-clear" onClick={handleLocationClear}>
                  {qs.clear}
                </button>
                <button type="button" className="quick-search-location-apply" onClick={handleLocationApply}>
                  {qs.apply}
                </button>
              </div>
            </div>
          </div>
        , document.body)}

        {/* Mobile full-screen search & filter sheet */}
        {mounted && (isMobileSearchSheetOpen || isMobileSearchSheetClosing) && createPortal(
          <div
            className={`qs-mobile-search-sheet-overlay${isMobileSearchSheetClosing ? " is-closing" : ""}`}
            onAnimationEnd={(e) => {
              if (e.target === e.currentTarget && isMobileSearchSheetClosing) {
                setIsMobileSearchSheetOpen(false);
                setIsMobileSearchSheetClosing(false);
              }
            }}
          >
            <div className="qs-mobile-search-sheet">
              <div className="qs-mobile-search-sheet__head">
                <span className="qs-mobile-search-sheet__title">{qs.filters}</span>
                <button type="button" className="qs-mobile-search-sheet__close" onClick={closeMobileSearchSheet} aria-label={qs.close}>
                  <i className="fa-light fa-xmark" />
                </button>
              </div>

              <div className="qs-mobile-search-sheet__body">
                {/* Keyword search input */}
                <div className="qs-mobile-search-sheet__search-row">
                  <div className="cs-intputwrap quick-search-input-wrap qs-sheet-input-wrap">
                    <i className="fa-light fa-magnifying-glass" />
                    <input
                      type="text"
                      placeholder={keywordInputPlaceholder}
                      value={keyword}
                      onChange={(e) => handleKeywordInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          closeMobileSearchSheet();
                          navigateToListing();
                        }
                      }}
                      autoComplete="off"
                    />
                    {keyword && (
                      <button
                        type="button"
                        className="quick-search-keyword-clear-btn"
                        onClick={() => { setKeyword(""); handleLocationClear(); }}
                      >
                        <i className="fa-light fa-xmark" />
                      </button>
                    )}
                  </div>
                </div>

                {/* For Rent / For Sale toggle */}
                <div className={`qs-mobile-search-sheet__status-row${isIdKeyword ? " quick-search-filters-disabled" : ""}`}>
                  <div className={`quick-search-status-toggle quick-search-status-toggle-inline${isIdKeyword ? " quick-status-multi-id-locked" : ""}`}>
                    <input className="hidden radio-label" type="radio" name="status-sheet" id="sheet-rent"
                      value="rent"
                      checked={isIdKeyword ? idImpliedStatus === "rent" : status === "rent"}
                      onChange={(e) => { if (!isIdKeyword) setStatus(e.target.value); }}
                      disabled={isIdKeyword}
                    />
                    <label className="quick-status-btn" htmlFor="sheet-rent">
                      <span className="quick-status-btn-icon"><i className="fa-light fa-house" /></span>
                      <span className="quick-status-btn-text">{qs.forRent}</span>
                    </label>
                    <input className="hidden radio-label" type="radio" name="status-sheet" id="sheet-sale"
                      value="sale"
                      checked={isIdKeyword ? idImpliedStatus === "sale" : status === "sale"}
                      onChange={(e) => { if (!isIdKeyword) setStatus(e.target.value); }}
                      disabled={isIdKeyword}
                    />
                    <label className="quick-status-btn" htmlFor="sheet-sale">
                      <span className="quick-status-btn-icon"><i className="fa-light fa-tag" /></span>
                      <span className="quick-status-btn-text">{qs.forSale}</span>
                    </label>
                  </div>
                </div>

                {/* Desktop-style filter buttons */}
                <div className={`qs-mobile-search-sheet__filter-row${isIdKeyword ? " quick-search-filters-disabled" : ""}`}>
                  <button
                    type="button"
                    className={`quick-search-primary-popup-trigger${isPrimaryFilterPopupOpen && primaryFilterTab === "type" ? " is-active" : ""}`}
                    onClick={() => openPrimaryFilterPopup("type")}
                    disabled={isIdKeyword}
                  >
                    <i className={`fa-light ${getPropertyTypeIconClass(propertyType)} quick-search-location-icon`} />
                    <span className="quick-search-range-trigger-text with-icon">
                      {getPropertyTypeLabel(propertyType, qs)}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`quick-search-primary-popup-trigger${isPrimaryFilterPopupOpen && primaryFilterTab === "area" ? " is-active" : ""}${sizeMin || sizeMax ? " has-value" : ""}`}
                    onClick={() => openPrimaryFilterPopup("area")}
                    disabled={isIdKeyword}
                  >
                    <i className="fa-light fa-ruler-combined quick-search-location-icon" />
                    <span className="quick-search-range-trigger-text with-icon">{areaSummaryLabel}</span>
                  </button>

                  <button
                    type="button"
                    className={`quick-search-primary-popup-trigger${isPrimaryFilterPopupOpen && primaryFilterTab === "price" ? " is-active" : ""}${priceMin || priceMax ? " has-value" : ""}`}
                    onClick={() => openPrimaryFilterPopup("price")}
                    disabled={isIdKeyword}
                  >
                    <i className="fa-light fa-baht-sign quick-search-location-icon" />
                    <span className="quick-search-range-trigger-text with-icon">{priceSummaryLabel}</span>
                  </button>

                  <button
                    type="button"
                    className={`quick-search-more-filters-btn${isAdvancedFilterPopupOpen ? " is-active" : ""}${advancedFilterCount > 0 ? " has-value" : ""}`}
                    onClick={() => openAdvancedFilterPopup()}
                    disabled={isIdKeyword}
                  >
                    <i className="fa-light fa-sliders" />
                    <span>{advancedFilterCount > 0 ? `${qs.moreFilters} (${advancedFilterCount})` : qs.moreFilters}</span>
                  </button>
                </div>
              </div>

              <div className="qs-mobile-search-sheet__footer">
                <button
                  type="button"
                  className="qs-mobile-search-sheet__search-btn"
                  onClick={() => { closeMobileSearchSheet(); navigateToListing(); }}
                >
                  <i className="fa-light fa-magnifying-glass" />
                  <span>{qs.search}</span>
                </button>
              </div>
            </div>
          </div>
        , document.body)}

      </div>

      <QuickSearchMobileFilters
        qs={qs}
        keyword={keyword}
        setKeyword={setKeyword}
        status={status}
        setStatus={setStatus}
        isIdKeyword={isIdKeyword}
        idImpliedStatus={idImpliedStatus}
        mounted={mounted}
        isMobileFiltersPanelOpen={isMobileFiltersPanelOpen}
        isMobileFiltersPanelClosing={isMobileFiltersPanelClosing}
        setIsMobileFiltersPanelOpen={setIsMobileFiltersPanelOpen}
        setIsMobileFiltersPanelClosing={setIsMobileFiltersPanelClosing}
        mobileFilterCount={mobileFilterCount}
        openMobileFiltersPanel={openMobileFiltersPanel}
        closeMobileFiltersPanel={closeMobileFiltersPanel}
        mobileFiltersOpenSections={mobileFiltersOpenSections}
        toggleMobileFilterSection={toggleMobileFilterSection}
        draftPropertyType={draftPropertyType}
        setDraftPropertyType={setDraftPropertyType}
        draftSizeMin={draftSizeMin}
        setDraftSizeMin={setDraftSizeMin}
        draftSizeMax={draftSizeMax}
        setDraftSizeMax={setDraftSizeMax}
        primarySizeRangeError={primarySizeRangeError}
        draftPriceMin={draftPriceMin}
        setDraftPriceMin={setDraftPriceMin}
        draftPriceMax={draftPriceMax}
        setDraftPriceMax={setDraftPriceMax}
        draftPriceMode={draftPriceMode}
        handlePrimaryPopupPriceModeChange={handlePrimaryPopupPriceModeChange}
        draftPriceMinQuickPickOptions={draftPriceMinQuickPickOptions}
        draftPriceMaxQuickPickOptions={draftPriceMaxQuickPickOptions}
        primaryPriceRangeError={primaryPriceRangeError}
        draftSelectedZoneTypes={draftSelectedZoneTypes}
        setDraftSelectedZoneTypes={setDraftSelectedZoneTypes}

        translateZoneLabel={translateZoneLabel}
        draftSelectedFeatures={draftSelectedFeatures}
        setDraftSelectedFeatures={setDraftSelectedFeatures}
        featureOptions={featureOptions}
        translateFeatureLabel={translateFeatureLabel}
        draftFloorLoad={draftFloorLoad}
        setDraftFloorLoad={setDraftFloorLoad}
        floorLoadOptions={floorLoadOptions}
        draftClearHeightMin={draftClearHeightMin}
        setDraftClearHeightMin={setDraftClearHeightMin}
        draftClearHeightMax={draftClearHeightMax}
        setDraftClearHeightMax={setDraftClearHeightMax}
        clearHeightNumericOptions={clearHeightNumericOptions}
        advancedHeightRangeError={advancedHeightRangeError}
        handleMobileFiltersClear={handleMobileFiltersClear}
        handleMobileFiltersApply={handleMobileFiltersApply}
        mobileHasRangeError={mobileHasRangeError}
      />

      <QuickSearchDesktopFilters
        qs={qs}
        status={status}
        setStatus={setStatus}
        isIdKeyword={isIdKeyword}
        idImpliedStatus={idImpliedStatus}
        isPrimaryFilterPopupOpen={isPrimaryFilterPopupOpen}
        primaryFilterTab={primaryFilterTab}
        openPrimaryFilterPopup={openPrimaryFilterPopup}
        propertyType={propertyType}
        sizeMin={sizeMin}
        sizeMax={sizeMax}
        priceMin={priceMin}
        priceMax={priceMax}
        areaSummaryLabel={areaSummaryLabel}
        priceSummaryLabel={priceSummaryLabel}
        isAdvancedFilterPopupOpen={isAdvancedFilterPopupOpen}
        advancedFilterCount={advancedFilterCount}
        openAdvancedFilterPopup={openAdvancedFilterPopup}
        renderAdvancedFilterTooltip={renderAdvancedFilterTooltip}
      />
    </form>
  );
}
