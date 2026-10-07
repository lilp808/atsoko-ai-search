"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SparklesIcon } from "@/app/components/icons";
import {
  AREA_MAX_QUICK_PICK_OPTIONS,
  AREA_MIN_QUICK_PICK_OPTIONS,
  FACTORY_VALUE,
  SHOWROOM_COMMERCIAL_VALUE,
  WAREHOUSE_VALUE,
  formatFullCurrencyLabel,
  getPropertyTypeIconClass,
  getPropertyTypeLabel,
  quickSearchTranslations,
} from "@/lib/quickSearchUtils";
import { formatFullNumber } from "@/lib/listingUtils";

export interface HeroPillAiFill {
  n: number;
  filters: Record<string, unknown>;
}

type Lang = "th" | "en";
type PanelKind = "type" | "area" | "price" | "more" | null;

interface Props {
  lang: Lang;
  aiMode: boolean;
  setAiMode: (v: boolean) => void;
  aiText: string;
  setAiText: (v: string) => void;
  aiLoading: boolean;
  onAskAi: () => void;
  aiExplanation?: string;
  aiError?: string;
  aiExamples: string[];
  aiFill: HeroPillAiFill | null;
  onNavigate: (queryString: string) => void;
}

const PRICE_MIN_RENT = ["", "20000", "30000", "50000", "80000", "100000", "150000", "200000"];
const PRICE_MAX_RENT = ["", "30000", "50000", "80000", "100000", "150000", "200000", "300000", "500000"];
const PRICE_MIN_SALE = ["", "2000000", "3000000", "5000000", "8000000", "10000000", "15000000", "20000000"];
const PRICE_MAX_SALE = ["", "3000000", "5000000", "8000000", "10000000", "15000000", "20000000", "30000000", "50000000"];

const TYPE_VALUES = [WAREHOUSE_VALUE, FACTORY_VALUE, SHOWROOM_COMMERCIAL_VALUE];

interface NamedOption {
  value: string;
  label: string;
}

const str = (v: unknown): string =>
  typeof v === "string" ? v : v === null || v === undefined ? "" : String(v);

function toTitleCase(s: string): string {
  return s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substring(1).toLowerCase());
}

/** Defensively read option endpoints shaped like { success, data: [{name_en,name_th,name_zh}] }. */
async function fetchNamedOptions(url: string, locale: Lang): Promise<NamedOption[]> {
  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    const j = await r.json();
    const arr = Array.isArray(j?.data) ? j.data : [];
    const out: NamedOption[] = [];
    for (const item of arr) {
      const value = str(item?.name_en).trim();
      if (!value) continue;
      const localized = locale === "th" ? str(item?.name_th).trim() : "";
      out.push({ value, label: localized || toTitleCase(value) });
    }
    return out;
  } catch {
    return [];
  }
}

export default function HeroPillSearch({
  lang,
  aiMode,
  setAiMode,
  aiText,
  setAiText,
  aiLoading,
  onAskAi,
  aiExplanation,
  aiError,
  aiExamples,
  aiFill,
  onNavigate,
}: Props) {
  const qs = quickSearchTranslations[lang];
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<"rent" | "sale">("rent");
  const [propertyType, setPropertyType] = useState(WAREHOUSE_VALUE);
  const [sizeMin, setSizeMin] = useState("");
  const [sizeMax, setSizeMax] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [priceMode, setPriceMode] = useState<"month" | "sqm">("month");
  const [features, setFeatures] = useState<string[]>([]);
  const [zoneTypes, setZoneTypes] = useState<string[]>([]);
  const [featureOptions, setFeatureOptions] = useState<NamedOption[]>([]);
  const [zoneOptions, setZoneOptions] = useState<NamedOption[]>([]);
  const [openPanel, setOpenPanel] = useState<PanelKind>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // AI result fills the pill state (same contract as QuickSearchExact aiFill).
  const aiFillNonce = aiFill?.n ?? 0;
  useEffect(() => {
    if (!aiFill || aiFillNonce === 0) return;
    const f = aiFill.filters;
    const st = str(f.status).toLowerCase();
    if (st.includes("sale") && !st.includes("rent")) setStatus("sale");
    else if (st.includes("rent")) setStatus("rent");
    const tp = str(f.type).toLowerCase();
    if (tp === "factory") setPropertyType(FACTORY_VALUE);
    else if (tp === "land" || tp === "office") setPropertyType(WAREHOUSE_VALUE);
    else if (tp) setPropertyType(WAREHOUSE_VALUE);
    if (f.size_min !== undefined && f.size_min !== "") setSizeMin(str(f.size_min));
    if (f.size_max !== undefined && f.size_max !== "") setSizeMax(str(f.size_max));
    if (f.price_min !== undefined && f.price_min !== "") setPriceMin(str(f.price_min));
    if (f.price_max !== undefined && f.price_max !== "") setPriceMax(str(f.price_max));
    if (f.price_mode === "sqm" || f.price_mode === "month") setPriceMode(f.price_mode);
    if (str(f.property_id)) setKeyword(str(f.property_id));
    else if (typeof f.keyword === "string") setKeyword(f.keyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiFillNonce]);

  // Load feature/zone options lazily (same backend endpoints as the reference doc).
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      const [feat, zones] = await Promise.all([
        fetchNamedOptions("/api/options/features", lang),
        fetchNamedOptions("/api/options/zone-types", lang),
      ]);
      if (!cancelled) {
        setFeatureOptions(feat);
        setZoneOptions(zones);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [lang]);

  // Close panel on outside click / Escape.
  useEffect(() => {
    if (!openPanel) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenPanel(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenPanel(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openPanel]);

  const typeLabels = useMemo(
    () => ({
      warehouse: qs.warehouse,
      factory: qs.factory,
      showroomCommercial: qs.showroomCommercial,
    }),
    [qs],
  );

  const typeLabel = getPropertyTypeLabel(propertyType, typeLabels);

  const areaLabel = useMemo(() => {
    if (!sizeMin && !sizeMax) return qs.areaSize;
    if (sizeMin && sizeMax) return `${formatFullNumber(sizeMin)}–${formatFullNumber(sizeMax)} sqm`;
    if (sizeMin) return `${lang === "th" ? "มากกว่า" : "Above"} ${formatFullNumber(sizeMin)} sqm`;
    return `${lang === "th" ? "น้อยกว่า" : "Under"} ${formatFullNumber(sizeMax)} sqm`;
  }, [sizeMin, sizeMax, qs, lang]);

  const priceLabel = useMemo(() => {
    if (!priceMin && !priceMax) return qs.priceRange;
    const unit = priceMode === "sqm" ? "/sqm" : lang === "th" ? "/เดือน" : "/mo";
    if (priceMin && priceMax)
      return `฿${formatFullNumber(priceMin)}–฿${formatFullNumber(priceMax)}${unit}`;
    if (priceMin) return `≥ ฿${formatFullNumber(priceMin)}${unit}`;
    return `≤ ฿${formatFullNumber(priceMax)}${unit}`;
  }, [priceMin, priceMax, priceMode, qs, lang]);

  const moreCount = features.length + zoneTypes.length;
  const moreLabel =
    moreCount === 0
      ? qs.moreFilters
      : lang === "th"
        ? `ตัวกรองเพิ่มเติม (${moreCount})`
        : `More Filters (${moreCount})`;

  function buildQuery(): string {
    const p = new URLSearchParams();
    const kw = keyword.trim();
    // Backend vocabulary only (BACKEND-API-REFERENCE.md §2.1) — same mapping
    // as QuickSearchExact.navigateToListing.
    if (kw) p.set("keyword", kw);
    p.set("status", status);
    p.set("type", propertyType);
    const sMin = sizeMin.trim();
    const sMax = sizeMax.trim();
    if (sMin && sMax && Number(sMin) > Number(sMax)) {
      p.set("size_min", sMax);
      p.set("size_max", sMin);
    } else {
      if (sMin) p.set("size_min", sMin);
      if (sMax) p.set("size_max", sMax);
    }
    const pMin = priceMin.trim();
    const pMax = priceMax.trim();
    if (pMin && pMax && Number(pMin) > Number(pMax)) {
      p.set("price_min", pMax);
      p.set("price_max", pMin);
    } else {
      if (pMin) p.set("price_min", pMin);
      if (pMax) p.set("price_max", pMax);
    }
    if (pMin || pMax) p.set("price_mode", priceMode);
    if (features.length > 0) p.set("features", features.join(","));
    if (zoneTypes.length > 0) p.set("zone_types", zoneTypes.join(","));
    return p.toString();
  }

  function search() {
    setOpenPanel(null);
    onNavigate(buildQuery());
  }

  function toggleList(setter: (v: string[]) => void, current: string[], value: string) {
    setter(current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
  }

  const priceMinOpts = status === "sale" ? PRICE_MIN_SALE : PRICE_MIN_RENT;
  const priceMaxOpts = status === "sale" ? PRICE_MAX_SALE : PRICE_MAX_RENT;

  function togglePanel(k: Exclude<PanelKind, null>) {
    setOpenPanel((cur) => (cur === k ? null : k));
  }

  return (
    <div className="hp-wrap" ref={rootRef}>
      <button
        type="button"
        className={`hp-ai-float${aiMode ? " active" : ""}`}
        onClick={() => setAiMode(!aiMode)}
        aria-pressed={aiMode}
      >
        <SparklesIcon size={14} /> AI
      </button>
      <div className="hp-glass">
      {/* Row 1 — keyword (manual) or AI searchbar */}
      {aiMode ? (
        <div className="hp-ai-block">
          <div className="hp-search-row">
            <div className="hp-keyword">
              <i className="fa-solid fa-sparkles hp-keyword-icon" />
              <input
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onAskAi();
                }}
                placeholder={lang === "th" ? "โกดังให้เช่า แถวบางนา 500 ตรม…" : "Warehouse for rent near Bang Na, 500 sqm…"}
                aria-label="AI Search"
              />
            </div>
            <button className="hp-search-btn" onClick={onAskAi} disabled={aiLoading}>
              <SparklesIcon size={16} /> {aiLoading ? (lang === "th" ? "AI กำลังวิเคราะห์…" : "AI is analyzing…") : lang === "th" ? "ถาม AI" : "Ask AI"}
            </button>
          </div>
          <div className="hp-examples">
            {aiExamples.map((ex) => (
              <button key={ex} type="button" className="hp-ex-chip" onClick={() => setAiText(ex)}>
                {ex}
              </button>
            ))}
          </div>
          {aiExplanation && <p className="hp-understood">{aiExplanation}</p>}
          {aiError && <div className="hp-error">{aiError}</div>}
        </div>
      ) : (
        <div className="hp-search-row">
          <div className="hp-keyword">
            <i className="fa-light fa-magnifying-glass hp-keyword-icon" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") search();
              }}
              placeholder={qs.keywordPlaceholder}
              aria-label={qs.search}
              autoComplete="off"
            />
            {keyword && (
              <button type="button" className="hp-clear" onClick={() => setKeyword("")} aria-label={qs.clear}>
                <i className="fa-light fa-xmark" />
              </button>
            )}
          </div>
          <button className="hp-search-btn" onClick={search}>
            {qs.search}
          </button>
        </div>
      )}

      {/* Row 2 — pills (AI toggle now floats outside the blur frame) */}
      {!aiMode && (
      <div className="hp-pills" role="toolbar" aria-label={qs.filters}>
        <>
            <button
              type="button"
              className={`hp-pill${status === "rent" ? " active" : ""}`}
              onClick={() => setStatus("rent")}
              aria-pressed={status === "rent"}
            >
              <i className="fa-light fa-house" /> {qs.forRent}
            </button>
            <button
              type="button"
              className={`hp-pill${status === "sale" ? " active" : ""}`}
              onClick={() => setStatus("sale")}
              aria-pressed={status === "sale"}
            >
              <i className="fa-light fa-tag" /> {qs.forSale}
            </button>
            <button
              type="button"
              className={`hp-pill has-value${openPanel === "type" ? " open" : ""}`}
              onClick={() => togglePanel("type")}
              aria-expanded={openPanel === "type"}
            >
              <i className={`fa-light ${getPropertyTypeIconClass(propertyType)}`} /> {typeLabel}
            </button>
            <button
              type="button"
              className={`hp-pill${sizeMin || sizeMax ? " has-value" : ""}${openPanel === "area" ? " open" : ""}`}
              onClick={() => togglePanel("area")}
              aria-expanded={openPanel === "area"}
            >
              <i className="fa-light fa-ruler-combined" /> {areaLabel}
            </button>
            <button
              type="button"
              className={`hp-pill${priceMin || priceMax ? " has-value" : ""}${openPanel === "price" ? " open" : ""}`}
              onClick={() => togglePanel("price")}
              aria-expanded={openPanel === "price"}
            >
              <i className="fa-light fa-baht-sign" /> {priceLabel}
            </button>
            <button
              type="button"
              className={`hp-pill${moreCount > 0 ? " has-value" : ""}${openPanel === "more" ? " open" : ""}`}
              onClick={() => togglePanel("more")}
              aria-expanded={openPanel === "more"}
            >
              <i className="fa-light fa-sliders" /> {moreLabel}
            </button>
          </>
      </div>
      )}

      {/* Dropdown panels */}
      {openPanel === "type" && !aiMode && (
        <div className="hp-panel" role="menu">
          {TYPE_VALUES.map((v) => (
            <button
              key={v}
              type="button"
              className={`hp-opt${propertyType === v ? " active" : ""}`}
              onClick={() => {
                setPropertyType(v);
                setOpenPanel(null);
              }}
            >
              <i className={`fa-light ${getPropertyTypeIconClass(v)}`} />
              {getPropertyTypeLabel(v, typeLabels)}
              {propertyType === v && <i className="fa-solid fa-check hp-check" />}
            </button>
          ))}
        </div>
      )}

      {openPanel === "area" && !aiMode && (
        <div className="hp-panel hp-panel-wide" role="dialog" aria-label={qs.areaSize}>
          <div className="hp-range-grid">
            <label>
              <span>{lang === "th" ? "ต่ำสุด (ตร.ม.)" : "Min (sqm)"}</span>
              <input
                inputMode="numeric"
                value={sizeMin}
                onChange={(e) => setSizeMin(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="—"
              />
            </label>
            <span className="hp-range-sep">–</span>
            <label>
              <span>{lang === "th" ? "สูงสุด (ตร.ม.)" : "Max (sqm)"}</span>
              <input
                inputMode="numeric"
                value={sizeMax}
                onChange={(e) => setSizeMax(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="—"
              />
            </label>
          </div>
          <div className="hp-picks">
            {AREA_MIN_QUICK_PICK_OPTIONS.filter(Boolean).map((v) => (
              <button key={`min-${v}`} type="button" className={sizeMin === v ? "active" : ""} onClick={() => setSizeMin(v)}>
                {formatFullNumber(v)}
              </button>
            ))}
          </div>
          <div className="hp-picks">
            {AREA_MAX_QUICK_PICK_OPTIONS.filter(Boolean).map((v) => (
              <button key={`max-${v}`} type="button" className={sizeMax === v ? "active" : ""} onClick={() => setSizeMax(v)}>
                {formatFullNumber(v)}
              </button>
            ))}
          </div>
          <div className="hp-panel-actions">
            <button
              type="button"
              className="hp-link"
              onClick={() => {
                setSizeMin("");
                setSizeMax("");
              }}
            >
              {qs.clear}
            </button>
            <button type="button" className="hp-apply" onClick={() => setOpenPanel(null)}>
              {qs.apply}
            </button>
          </div>
        </div>
      )}

      {openPanel === "price" && !aiMode && (
        <div className="hp-panel hp-panel-wide" role="dialog" aria-label={qs.priceRange}>
          <div className="hp-seg" role="group" aria-label="price mode">
            <button type="button" className={priceMode === "month" ? "active" : ""} onClick={() => setPriceMode("month")}>
              {qs.perMonth}
            </button>
            <button type="button" className={priceMode === "sqm" ? "active" : ""} onClick={() => setPriceMode("sqm")}>
              {qs.perSqm}
            </button>
          </div>
          <div className="hp-range-grid">
            <label>
              <span>{lang === "th" ? "ต่ำสุด (บาท)" : "Min (THB)"}</span>
              <input
                inputMode="numeric"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="—"
              />
            </label>
            <span className="hp-range-sep">–</span>
            <label>
              <span>{lang === "th" ? "สูงสุด (บาท)" : "Max (THB)"}</span>
              <input
                inputMode="numeric"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="—"
              />
            </label>
          </div>
          <div className="hp-picks">
            {priceMinOpts.filter(Boolean).map((v) => (
              <button key={`min-${v}`} type="button" className={priceMin === v ? "active" : ""} onClick={() => setPriceMin(v)}>
                {formatFullCurrencyLabel(v)}
              </button>
            ))}
          </div>
          <div className="hp-picks">
            {priceMaxOpts.filter(Boolean).map((v) => (
              <button key={`max-${v}`} type="button" className={priceMax === v ? "active" : ""} onClick={() => setPriceMax(v)}>
                {formatFullCurrencyLabel(v)}
              </button>
            ))}
          </div>
          <div className="hp-panel-actions">
            <button
              type="button"
              className="hp-link"
              onClick={() => {
                setPriceMin("");
                setPriceMax("");
              }}
            >
              {qs.clear}
            </button>
            <button type="button" className="hp-apply" onClick={() => setOpenPanel(null)}>
              {qs.apply}
            </button>
          </div>
        </div>
      )}

      {openPanel === "more" && !aiMode && (
        <div className="hp-panel hp-panel-wide" role="dialog" aria-label={qs.moreFilters}>
          <p className="hp-group-title">{qs.zone}</p>
          <div className="hp-checks">
            {zoneOptions.length === 0 && <span className="hp-empty">—</span>}
            {zoneOptions.map((z) => (
              <label key={z.value} className="hp-check">
                <input
                  type="checkbox"
                  checked={zoneTypes.includes(z.value)}
                  onChange={() => toggleList(setZoneTypes, zoneTypes, z.value)}
                />
                <span>{z.label}</span>
              </label>
            ))}
          </div>
          <p className="hp-group-title">{qs.features}</p>
          <div className="hp-checks">
            {featureOptions.length === 0 && <span className="hp-empty">—</span>}
            {featureOptions.map((f) => (
              <label key={f.value} className="hp-check">
                <input
                  type="checkbox"
                  checked={features.includes(f.value)}
                  onChange={() => toggleList(setFeatures, features, f.value)}
                />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
          <div className="hp-panel-actions">
            <button
              type="button"
              className="hp-link"
              onClick={() => {
                setFeatures([]);
                setZoneTypes([]);
              }}
            >
              {qs.clear}
            </button>
            <button type="button" className="hp-apply" onClick={() => setOpenPanel(null)}>
              {qs.apply}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
