import { formatFullNumber } from "./listingUtils";

// Pure utility functions for QuickSearch ID-search mode detection.

export const PROPERTY_ID_RE = /^at\d+(?:sr|s|r)$/i;
// Partial match: keeps ID mode active while user is mid-typing the next ID
export const PROPERTY_ID_PARTIAL_RE = /^at\d*(?:sr|s|r)?$/i;

// Property type filter values — must match the backend's `type ILIKE <value>`
// case-insensitive match against the DB `type` column (see AGENTS.md / backend
// filter contract). Keep in lowercase.
export const FACTORY_VALUE = "factory";
export const WAREHOUSE_VALUE = "warehouse";
export const SHOWROOM_COMMERCIAL_VALUE = "showroom & commercial";

export const getPropertyTypeIconClass = (type: string): string => {
  const normalized = (type || "").toLowerCase();
  if (normalized === FACTORY_VALUE) return "fa-industry";
  if (normalized === SHOWROOM_COMMERCIAL_VALUE) return "fa-store";
  return "fa-warehouse";
};

export interface PropertyTypeLabels {
  warehouse: string;
  factory: string;
  showroomCommercial: string;
}

export const getPropertyTypeLabel = (type: string, labels: PropertyTypeLabels): string => {
  const normalized = (type || "").toLowerCase();
  if (normalized === FACTORY_VALUE) return labels.factory;
  if (normalized === SHOWROOM_COMMERCIAL_VALUE) return labels.showroomCommercial;
  return labels.warehouse;
};

export type IdImpliedStatus = "" | "rent" | "sale";

export interface QuickSearchIdAnalysis {
  isIdKeyword: boolean;
  completeParts: string[];
  impliedStatus: IdImpliedStatus;
}

/**
 * Analyze keyword for Property ID search mode.
 * - Supports single or comma-separated IDs (e.g. "AT12R, AT34S")
 * - Partial-match rule: if the trailing part looks like an in-progress ID (starts with "at"),
 *   keep ID mode active so the banner doesn't flash off mid-typing.
 */
export const analyzeQuickSearchKeyword = (keyword: string): QuickSearchIdAnalysis => {
  const trimmed = keyword.trim();
  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);

  if (parts.length === 0) {
    return { isIdKeyword: false, completeParts: [], impliedStatus: "rent" };
  }

  const lastPart = parts[parts.length - 1];
  const isLastFull = PROPERTY_ID_RE.test(lastPart);
  const isLastPartial = !isLastFull && PROPERTY_ID_PARTIAL_RE.test(lastPart);
  const completeParts = isLastFull ? parts : parts.slice(0, -1);

  if (completeParts.length === 0) {
    return { isIdKeyword: false, completeParts: [], impliedStatus: "rent" };
  }
  if (!completeParts.every((p) => PROPERTY_ID_RE.test(p))) {
    return { isIdKeyword: false, completeParts: [], impliedStatus: "rent" };
  }
  if (!isLastFull && !isLastPartial) {
    return { isIdKeyword: false, completeParts: [], impliedStatus: "rent" };
  }

  const hasSR = completeParts.some((id) => /sr$/i.test(id));
  const hasR = completeParts.some((id) => /r$/i.test(id) && !/sr$/i.test(id));
  const hasS = completeParts.some((id) => /s$/i.test(id));

  let impliedStatus: IdImpliedStatus = "";
  if (!hasSR && hasR && !hasS) impliedStatus = "rent";
  else if (!hasSR && !hasR && hasS) impliedStatus = "sale";

  return { isIdKeyword: true, completeParts, impliedStatus };
};

export const quickSearchTranslations = {
  en: {
    filters: "Filters",
    searchFilters: "Search Filters",
    propertyTypeLabel: "Property Type",
    close: "Close",
    forRent: "For Rent",
    forSale: "For Sale",
    warehouse: "Warehouse",
    factory: "Factory",
    showroomCommercial: "Showroom & Commercial",
    keywordPlaceholder: "Location, Property ID, Keyword",
    searchByProvince: "Search by Province",
    searchProvince: "Search province",
    filterByProvince: "Filter By Province",
    changeLocation: "Change location",
    chooseOneDistrictForSubDistrict: "Available when exactly 1 district is selected",
    back: "Back",
    clear: "Clear",
    apply: "Apply",
    searching: "Searching...",
    noSuggestions: "No suggestions found",
    allProvinces: "All Provinces",
    allDistricts: "All Districts",
    districtPlural: "Districts",
    allSubDistricts: "All Sub-districts",
    subDistrictPlural: "Sub-districts",
    features: "Features",
    featuresPlural: "Features",
    zone: "Zone",
    zones: "Zones",
    areaSize: "Area Size",
    priceRange: "Price Range",
    clearHeight: "Clear Height",
    searchDistrict: "Search district",
    searchSubDistrict: "Search sub-district",
    noDistrictsFound: "No districts found",
    noSubDistrictsFound: "No sub-districts found",
    noZonesFound: "No zones found",
    noFeaturesFound: "No features found",
    searchPlaceholder: "Location, Property ID, Keyword",
    noOptionsFound: "No options found",
    noMin: "No Min",
    noMax: "No Max",
    floorLoadingCapacity: "Floor Load",
    search: "Search",
    selectDistricts: "Select districts",
    selectSubDistricts: "Select sub-districts",
    subDistrictGuide: "Tap here to select sub-districts",
    selectAreaRange: "Select area size range",
    selectPriceRange: "Select price range",
    selectZones: "Select zones",
    selectFeatures: "Select features",
    selectClearHeightRange: "Select clear height range",
    hideAdvanced: "Hide advanced",
    showAdvanced: "Show advanced",
    moreFilters: "More Filters",
    above: "Above",
    under: "Under",
    perMonth: "Per Month",
    perSqm: "Per Sqm",
    perMonthHint: "Rental per month",
    perSqmHint: "Rental price per square meter",
    exactPropertySearchMode: "Property ID Search Mode",
    exactMultiPropertySearchMode: "Property ID Search Mode",
    exitSearchMode: "Clear",
    filtersDisabled: "Filters are disabled",
    rangeMinMaxError: "Min value cannot be greater than max value",
    searchFiltersPlaceholder: "Search filters...",
    selectAll: "Select all",
    industrialEstate: "Industrial Estate",
    allIndustrialEstateZone: "All Industrial Estate Zone",
    ieatRegisteredOnly: "IEAT Registered Only",
  },
  th: {
    filters: "ตัวกรอง",
    searchFilters: "ค้นหาและกรอง",
    propertyTypeLabel: "ประเภทอสังหา",
    close: "ปิด",
    forRent: "สำหรับเช่า",
    forSale: "สำหรับขาย",
    warehouse: "โกดัง",
    factory: "โรงงาน",
    showroomCommercial: "โชว์รูม และ อาคารพาณิชย์",
    keywordPlaceholder: "ตำแหน่ง, รหัสอสังหาฯ, คีย์เวิร์ด",
    searchByProvince: "ค้นหาด้วยจังหวัด",
    searchProvince: "ค้นหาจังหวัด",
    filterByProvince: "ค้นหาด้วยจังหวัด",
    changeLocation: "เปลี่ยนพื้นที่ค้นหา",
    chooseOneDistrictForSubDistrict: "ใช้งานได้เมื่อเลือกอำเภอเพียง 1 แห่ง",
    back: "ย้อนกลับ",
    clear: "ล้างค่า",
    apply: "นำไปใช้",
    searching: "กำลังค้นหา...",
    noSuggestions: "ไม่พบคำแนะนำที่ตรงกัน",
    allProvinces: "ทุกจังหวัด",
    allDistricts: "ทุกอำเภอ/เขต",
    districtPlural: "อำเภอ/เขต",
    allSubDistricts: "ทุกตำบล",
    subDistrictPlural: "ตำบล",
    features: "คุณสมบัติ",
    featuresPlural: "คุณสมบัติ",
    zone: "โซน",
    zones: "โซน",
    areaSize: "ขนาดพื้นที่",
    priceRange: "ช่วงราคา",
    clearHeight: "ความสูง",
    searchDistrict: "ค้นหาอำเภอ/เขต",
    searchSubDistrict: "ค้นหาตำบล",
    noDistrictsFound: "ไม่พบอำเภอ/เขต",
    noSubDistrictsFound: "ไม่พบตำบล",
    noZonesFound: "ไม่พบโซน",
    noFeaturesFound: "ไม่พบคุณสมบัติ",
    searchPlaceholder: "ตำแหน่ง, รหัสอสังหาฯ, คีย์เวิร์ด",
    noOptionsFound: "ไม่พบตัวเลือก",
    noMin: "ไม่ระบุต่ำสุด",
    noMax: "ไม่ระบุสูงสุด",
    floorLoadingCapacity: "รับน้ำหนักพื้น",
    search: "ค้นหา",
    selectDistricts: "เลือกอำเภอ/เขต",
    selectSubDistricts: "เลือกตำบล",
    subDistrictGuide: "กดที่นี่เพื่อเลือกตำบล",
    selectAreaRange: "เลือกช่วงขนาดพื้นที่",
    selectPriceRange: "เลือกช่วงราคา",
    selectZones: "เลือกโซน",
    selectFeatures: "เลือกคุณสมบัติ",
    selectClearHeightRange: "เลือกช่วงความสูง",
    hideAdvanced: "ซ่อนตัวเลือกขั้นสูง",
    showAdvanced: "แสดงตัวเลือกขั้นสูง",
    moreFilters: "ตัวกรองเพิ่มเติม",
    above: "มากกว่า",
    under: "น้อยกว่า",
    perMonth: "ต่อเดือน",
    perSqm: "ต่อ ตร.ม.",
    perMonthHint: "ราคาเช่ารวมต่อเดือน",
    perSqmHint: "ราคาเช่าต่อตารางเมตร",
    exactPropertySearchMode: "โหมดค้นหา Property ID",
    exactMultiPropertySearchMode: "โหมดค้นหา Property ID",
    exitSearchMode: "ล้างการค้นหา",
    filtersDisabled: "ตัวกรองถูกปิดใช้งาน",
    rangeMinMaxError: "ค่าต่ำสุดต้องไม่มากกว่าค่าสูงสุด",
    searchFiltersPlaceholder: "ค้นหาตัวกรอง...",
    selectAll: "เลือกทั้งหมด",
    industrialEstate: "นิคมอุตสาหกรรม",
    allIndustrialEstateZone: "โซนนิคมอุตสาหกรรมทั้งหมด",
    ieatRegisteredOnly: "เฉพาะที่ขึ้นทะเบียนกับ กนอ.",
  },
  zh: {
    filters: "筛选",
    searchFilters: "搜索筛选",
    propertyTypeLabel: "物业类型",
    close: "关闭",
    forRent: "出租",
    forSale: "出售",
    warehouse: "仓库",
    factory: "工厂",
    showroomCommercial: "展厅/商业",
    keywordPlaceholder: "位置、房产编号、关键词",
    searchByProvince: "按府搜索",
    searchProvince: "搜索府",
    filterByProvince: "按府筛选",
    changeLocation: "更改位置",
    chooseOneDistrictForSubDistrict: "仅选择1个区县时可用",
    back: "返回",
    clear: "清除",
    apply: "应用",
    searching: "搜索中...",
    noSuggestions: "未找到相关建议",
    allProvinces: "全部府",
    allDistricts: "全部区县",
    districtPlural: "个区县",
    allSubDistricts: "所有街道",
    subDistrictPlural: "个街道",
    features: "配套",
    featuresPlural: "项配套",
    zone: "区域",
    zones: "个区域",
    areaSize: "面积范围",
    priceRange: "价格区间",
    clearHeight: "净高",
    searchDistrict: "搜索区",
    searchSubDistrict: "搜索街道",
    noDistrictsFound: "未找到区",
    noSubDistrictsFound: "未找到街道",
    noZonesFound: "未找到区域",
    noFeaturesFound: "未找到配套",
    searchPlaceholder: "位置、房产编号、关键词",
    noOptionsFound: "未找到选项",
    noMin: "不限最小值",
    noMax: "不限最大值",
    floorLoadingCapacity: "地面载重",
    search: "搜索",
    selectDistricts: "选择区",
    selectSubDistricts: "选择街道",
    subDistrictGuide: "点击此处选择街道",
    selectAreaRange: "选择面积范围",
    selectPriceRange: "选择价格区间",
    selectZones: "选择区域",
    selectFeatures: "选择配套",
    selectClearHeightRange: "选择净高范围",
    hideAdvanced: "隐藏高级选项",
    showAdvanced: "显示高级选项",
    moreFilters: "更多筛选",
    above: "高于",
    under: "低于",
    perMonth: "每月",
    perSqm: "每平米",
    perMonthHint: "每月总租金",
    perSqmHint: "每平方米租金",
    exactPropertySearchMode: "房源ID搜索模式",
    exactMultiPropertySearchMode: "房源ID搜索模式",
    exitSearchMode: "清除搜索",
    filtersDisabled: "筛选功能已禁用",
    rangeMinMaxError: "最小值不能大于最大值",
    searchFiltersPlaceholder: "搜索筛选...",
    selectAll: "全选",
    industrialEstate: "工业园区",
    allIndustrialEstateZone: "所有工业园区",
    ieatRegisteredOnly: "仅IEAT注册",
  },
} as const;

export type QsStrings = { readonly [K in keyof typeof quickSearchTranslations["en"]]: string };

export type MobileFilterSection = "type" | "area" | "price" | "zone" | "features" | "floorLoad" | "clearHeight";
export type PrimaryFilterTab = "type" | "area" | "price";

export interface FeatureOption {
  value: string;
  label: string;
}

export const AREA_MIN_QUICK_PICK_OPTIONS = ["", "500", "1000", "2000", "3000", "5000", "10000"];
export const AREA_MAX_QUICK_PICK_OPTIONS = ["", "1000", "3000", "5000", "10000", "15000", "20000"];

export const formatFullCurrencyLabel = (value: string): string => {
  const full = formatFullNumber(value);
  return full ? `฿${full}` : "";
};
export const formatFullAreaLabel = (value: string): string => {
  const full = formatFullNumber(value);
  return full ? `${full} sqm` : "";
};
export const formatAreaRangeDisplay = (value: string): string => formatFullAreaLabel(value) || value;
export const formatPriceRangeDisplay = (value: string): string => formatFullCurrencyLabel(value) || value;
