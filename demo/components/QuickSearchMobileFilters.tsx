"use client";

import React, { Dispatch, SetStateAction } from "react";
import { createPortal } from "react-dom";
import SingleSelectDropdown from "@/components/SingleSelectDropdown";
import { formatFullNumber, formatFloorLoadLabel } from "@/lib/listingUtils";
import {
  MobileFilterSection,
  FeatureOption,
  AREA_MIN_QUICK_PICK_OPTIONS,
  AREA_MAX_QUICK_PICK_OPTIONS,
  formatFullCurrencyLabel,
  formatFullAreaLabel,
  formatAreaRangeDisplay,
  formatPriceRangeDisplay,
  type QsStrings,
  SHOWROOM_COMMERCIAL_VALUE,
  getPropertyTypeIconClass,
  getPropertyTypeLabel,
} from "@/lib/quickSearchUtils";

export interface QuickSearchMobileFiltersProps {
  qs: QsStrings;
  keyword: string;
  setKeyword: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  isIdKeyword: boolean;
  idImpliedStatus: "" | "rent" | "sale";
  mounted: boolean;
  isMobileFiltersPanelOpen: boolean;
  isMobileFiltersPanelClosing: boolean;
  setIsMobileFiltersPanelOpen: Dispatch<SetStateAction<boolean>>;
  setIsMobileFiltersPanelClosing: Dispatch<SetStateAction<boolean>>;
  mobileFilterCount: number;
  openMobileFiltersPanel: () => void;
  closeMobileFiltersPanel: () => void;
  mobileFiltersOpenSections: Set<MobileFilterSection>;
  toggleMobileFilterSection: (s: MobileFilterSection) => void;
  draftPropertyType: string;
  setDraftPropertyType: (v: string) => void;
  draftSizeMin: string;
  setDraftSizeMin: (v: string) => void;
  draftSizeMax: string;
  setDraftSizeMax: (v: string) => void;
  primarySizeRangeError: boolean;
  draftPriceMin: string;
  setDraftPriceMin: (v: string) => void;
  draftPriceMax: string;
  setDraftPriceMax: (v: string) => void;
  draftPriceMode: "month" | "sqm";
  handlePrimaryPopupPriceModeChange: (mode: "month" | "sqm") => void;
  draftPriceMinQuickPickOptions: string[];
  draftPriceMaxQuickPickOptions: string[];
  primaryPriceRangeError: boolean;
  draftSelectedZoneTypes: string[];
  setDraftSelectedZoneTypes: Dispatch<SetStateAction<string[]>>;
  translateZoneLabel: (v: string) => string;
  draftSelectedFeatures: string[];
  setDraftSelectedFeatures: Dispatch<SetStateAction<string[]>>;
  featureOptions: FeatureOption[];
  translateFeatureLabel: (v: string) => string;
  draftFloorLoad: string;
  setDraftFloorLoad: (v: string) => void;
  floorLoadOptions: string[];
  draftClearHeightMin: string;
  setDraftClearHeightMin: (v: string) => void;
  draftClearHeightMax: string;
  setDraftClearHeightMax: (v: string) => void;
  clearHeightNumericOptions: string[];
  advancedHeightRangeError: boolean;
  handleMobileFiltersClear: () => void;
  handleMobileFiltersApply: () => void;
  mobileHasRangeError: boolean;
}

export default function QuickSearchMobileFilters({
  qs, keyword, setKeyword, status, setStatus, isIdKeyword, idImpliedStatus, mounted,
  isMobileFiltersPanelOpen, isMobileFiltersPanelClosing,
  setIsMobileFiltersPanelOpen, setIsMobileFiltersPanelClosing,
  mobileFilterCount, openMobileFiltersPanel, closeMobileFiltersPanel,
  mobileFiltersOpenSections, toggleMobileFilterSection,
  draftPropertyType, setDraftPropertyType,
  draftSizeMin, setDraftSizeMin, draftSizeMax, setDraftSizeMax, primarySizeRangeError,
  draftPriceMin, setDraftPriceMin, draftPriceMax, setDraftPriceMax,
  draftPriceMode, handlePrimaryPopupPriceModeChange,
  draftPriceMinQuickPickOptions, draftPriceMaxQuickPickOptions, primaryPriceRangeError,
  draftSelectedZoneTypes, setDraftSelectedZoneTypes, translateZoneLabel,
  draftSelectedFeatures, setDraftSelectedFeatures, featureOptions, translateFeatureLabel,
  draftFloorLoad, setDraftFloorLoad, floorLoadOptions,
  draftClearHeightMin, setDraftClearHeightMin, draftClearHeightMax, setDraftClearHeightMax,
  clearHeightNumericOptions, advancedHeightRangeError,
  handleMobileFiltersClear, handleMobileFiltersApply, mobileHasRangeError,
}: QuickSearchMobileFiltersProps) {
  return (
      <div className={`quick-search-mobile-filters-shell${isIdKeyword ? " quick-search-filters-disabled" : ""}`}>
        <div className="quick-search-mobile-filters-toolbar">
          <div className={`quick-search-status-toggle quick-search-status-toggle-inline quick-search-mobile-status-toggle${isIdKeyword ? " quick-status-multi-id-locked" : ""}`}>
            <input
              className="hidden radio-label"
              type="radio"
              name="status-mobile"
              id="hero-rent-mobile"
              value="rent"
              checked={isIdKeyword ? idImpliedStatus === "rent" : status === "rent"}
              onChange={(e) => { if (!isIdKeyword) setStatus(e.target.value); }}
              disabled={isIdKeyword}
            />
            <label className="quick-status-btn" htmlFor="hero-rent-mobile">
                <span className="quick-status-btn-icon"><i className="fa-light fa-house" /></span>
                <span className="quick-status-btn-text">{qs.forRent}</span>
            </label>
            <input
              className="hidden radio-label"
              type="radio"
              name="status-mobile"
              id="hero-sale-mobile"
              value="sale"
              checked={isIdKeyword ? idImpliedStatus === "sale" : status === "sale"}
              onChange={(e) => { if (!isIdKeyword) setStatus(e.target.value); }}
              disabled={isIdKeyword}
            />
            <label className="quick-status-btn" htmlFor="hero-sale-mobile">
                <span className="quick-status-btn-icon"><i className="fa-light fa-tag" /></span>
                <span className="quick-status-btn-text">{qs.forSale}</span>
            </label>
          </div>

          <button
            type="button"
            className={`quick-search-mobile-filter-toggle ${isMobileFiltersPanelOpen ? "is-open" : ""} ${mobileFilterCount > 0 ? "has-value" : ""}`}
            onClick={() => (isMobileFiltersPanelOpen ? closeMobileFiltersPanel() : openMobileFiltersPanel())}
            aria-expanded={isMobileFiltersPanelOpen}
            aria-controls="quick-search-mobile-filters-panel"
            disabled={isIdKeyword}
          >
            <i className="fa-light fa-sliders"></i>
            <span>{qs.filters}</span>
            {mobileFilterCount > 0 && <span className="quick-search-mobile-filter-badge">{mobileFilterCount}</span>}
          </button>
        </div>

        {mounted && (isMobileFiltersPanelOpen || isMobileFiltersPanelClosing) && createPortal(
          <div
            className={`quick-search-primary-popup-overlay${isMobileFiltersPanelClosing ? " is-closing" : ""}`}
            onAnimationEnd={(e) => {
              if (e.target === e.currentTarget && isMobileFiltersPanelClosing) {
                setIsMobileFiltersPanelOpen(false);
                setIsMobileFiltersPanelClosing(false);
              }
            }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeMobileFiltersPanel();
              }
            }}
          >
            <div className="quick-search-primary-popup-modal">
              <div className="quick-search-primary-popup-head">
                <i className="fa-light fa-sliders quick-search-popup-head-icon"></i>
                <h3>{qs.searchFilters}</h3>
                <button
                  type="button"
                  className="quick-search-primary-popup-close"
                  onClick={closeMobileFiltersPanel}
                  aria-label={qs.hideAdvanced}
                >
                  <i className="fa-light fa-xmark"></i>
                </button>
              </div>

              <div className="quick-search-primary-popup-body">
                {/* Keyword search */}
                <div className="qs-popup-search-wrap">
                  <i className="fa-light fa-magnifying-glass qs-popup-search-icon"></i>
                  <input
                    type="text"
                    className="qs-popup-search-input"
                    placeholder={qs.searchPlaceholder}
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    disabled={isIdKeyword}
                  />
                  {keyword && !isIdKeyword && (
                    <button
                      type="button"
                      className="qs-popup-search-clear"
                      onClick={() => setKeyword("")}
                      aria-label={qs.clear}
                    >
                      <i className="fa-light fa-xmark"></i>
                    </button>
                  )}
                </div>

                {/* For Rent / For Sale toggle */}
                <div className={`quick-search-status-toggle quick-search-status-toggle-inline qs-popup-status-toggle${isIdKeyword ? " quick-status-multi-id-locked" : ""}`}>
                  <input
                    className="hidden radio-label"
                    type="radio"
                    name="status-popup"
                    id="popup-rent"
                    value="rent"
                    checked={isIdKeyword ? idImpliedStatus === "rent" : status === "rent"}
                    onChange={(e) => { if (!isIdKeyword) setStatus(e.target.value); }}
                    disabled={isIdKeyword}
                  />
                  <label className="quick-status-btn" htmlFor="popup-rent">
                    <span className="quick-status-btn-icon"><i className="fa-light fa-house" /></span>
                    <span className="quick-status-btn-text">{qs.forRent}</span>
                  </label>
                  <input
                    className="hidden radio-label"
                    type="radio"
                    name="status-popup"
                    id="popup-sale"
                    value="sale"
                    checked={isIdKeyword ? idImpliedStatus === "sale" : status === "sale"}
                    onChange={(e) => { if (!isIdKeyword) setStatus(e.target.value); }}
                    disabled={isIdKeyword}
                  />
                  <label className="quick-status-btn" htmlFor="popup-sale">
                    <span className="quick-status-btn-icon"><i className="fa-light fa-tag" /></span>
                    <span className="quick-status-btn-text">{qs.forSale}</span>
                  </label>
                </div>

                <div className="qs-accordion quick-search-mobile-filters-accordion">
                  {/* Property type */}
                  <div className="qs-accordion-section">
                    <button
                      type="button"
                      className={`qs-accordion-header ${mobileFiltersOpenSections.has("type") ? "is-open" : ""}`}
                      onClick={() => toggleMobileFilterSection("type")}
                    >
                      <span className="qs-accordion-header__icon"><i className={`fa-light ${getPropertyTypeIconClass(draftPropertyType)}`} /></span>
                      <span className="qs-accordion-header__label">{qs.propertyTypeLabel}</span>
                      <span className="qs-accordion-badge">{getPropertyTypeLabel(draftPropertyType, qs)}</span>
                      <i className="fa-light fa-chevron-down qs-accordion-chevron" />
                    </button>
                    <div className={`qs-accordion-body ${mobileFiltersOpenSections.has("type") ? "is-open" : ""}`}>
                      <div className="qs-accordion-body-inner">
                        <div className="qs-accordion-content">
                          <div className="qs-radio-list qs-radio-list--compact">
                            <button type="button" className={`qs-radio-item ${draftPropertyType === "warehouse" ? "is-active" : ""}`} onClick={() => setDraftPropertyType("warehouse")}>
                              <span className="qs-radio-item__icon"><i className="fa-light fa-warehouse" /></span>
                              <span className="qs-radio-item__label">{qs.warehouse}</span>
                              <span className="qs-radio-item__dot" />
                            </button>
                            <button type="button" className={`qs-radio-item ${draftPropertyType === "factory" ? "is-active" : ""}`} onClick={() => setDraftPropertyType("factory")}>
                              <span className="qs-radio-item__icon"><i className="fa-light fa-industry" /></span>
                              <span className="qs-radio-item__label">{qs.factory}</span>
                              <span className="qs-radio-item__dot" />
                            </button>
                            <button type="button" className={`qs-radio-item ${draftPropertyType === SHOWROOM_COMMERCIAL_VALUE ? "is-active" : ""}`} onClick={() => setDraftPropertyType(SHOWROOM_COMMERCIAL_VALUE)}>
                              <span className="qs-radio-item__icon"><i className="fa-light fa-store" /></span>
                              <span className="qs-radio-item__label">{qs.showroomCommercial}</span>
                              <span className="qs-radio-item__dot" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Area */}
                  <div className="qs-accordion-section">
                    <button type="button" className={`qs-accordion-header ${mobileFiltersOpenSections.has("area") ? "is-open" : ""}`} onClick={() => toggleMobileFilterSection("area")}>
                      <span className="qs-accordion-header__icon"><i className="fa-light fa-ruler-combined" /></span>
                      <span className="qs-accordion-header__label">{qs.areaSize}</span>
                      {(draftSizeMin || draftSizeMax) && <span className="qs-accordion-badge">1</span>}
                      <i className="fa-light fa-chevron-down qs-accordion-chevron" />
                    </button>
                    <div className={`qs-accordion-body ${mobileFiltersOpenSections.has("area") ? "is-open" : ""}`}>
                      <div className="qs-accordion-body-inner">
                        <div className="mobile-price-inline-fields">
                          <div className="mobile-price-inline-col">
                            <SingleSelectDropdown options={[{ value: "", label: qs.noMin }, ...AREA_MIN_QUICK_PICK_OPTIONS.filter(Boolean).map((v) => ({ value: v, label: formatFullAreaLabel(v) }))]} value={draftSizeMin} onChange={setDraftSizeMin} placeholder={qs.noMin} compact allowCustomInput customDisplayFormatter={formatAreaRangeDisplay} />
                          </div>
                          <div className="mobile-price-inline-col">
                            <SingleSelectDropdown options={[{ value: "", label: qs.noMax }, ...AREA_MAX_QUICK_PICK_OPTIONS.filter(Boolean).map((v) => ({ value: v, label: formatFullAreaLabel(v) }))]} value={draftSizeMax} onChange={setDraftSizeMax} placeholder={qs.noMax} compact allowCustomInput customDisplayFormatter={formatAreaRangeDisplay} />
                          </div>
                        </div>
                        {primarySizeRangeError && <p className="quick-search-range-error" style={{ padding: "0 10px 8px" }}>{qs.rangeMinMaxError}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="qs-accordion-section">
                    <button type="button" className={`qs-accordion-header ${mobileFiltersOpenSections.has("price") ? "is-open" : ""}`} onClick={() => toggleMobileFilterSection("price")}>
                      <span className="qs-accordion-header__icon"><i className="fa-light fa-baht-sign" /></span>
                      <span className="qs-accordion-header__label">{qs.priceRange}</span>
                      {(draftPriceMin || draftPriceMax) && <span className="qs-accordion-badge">1</span>}
                      <i className="fa-light fa-chevron-down qs-accordion-chevron" />
                    </button>
                    <div className={`qs-accordion-body ${mobileFiltersOpenSections.has("price") ? "is-open" : ""}`}>
                      <div className="qs-accordion-body-inner">
                        <div className={`price-range-card${primaryPriceRangeError ? " has-error" : ""}`} style={{ margin: "0 0 10px" }}>
                          <div className="price-mode-tabs">
                            <button type="button" className={`price-mode-tab${draftPriceMode === "month" ? " is-active" : ""}`} onClick={() => handlePrimaryPopupPriceModeChange("month")}>{qs.perMonth}</button>
                            <button type="button" className={`price-mode-tab${draftPriceMode === "sqm" ? " is-active" : ""}`} onClick={() => handlePrimaryPopupPriceModeChange("sqm")}>{qs.perSqm}</button>
                          </div>
                          <div className="mobile-price-inline-fields">
                            <div className="mobile-price-inline-col">
                              <SingleSelectDropdown
                                options={[{ value: "", label: qs.noMin }, ...draftPriceMinQuickPickOptions.filter(Boolean).map((optionValue) => ({ value: optionValue, label: draftPriceMode === "sqm" ? `฿${formatFullNumber(optionValue)}/sqm` : formatFullCurrencyLabel(optionValue) }))]}
                                value={draftPriceMin}
                                onChange={setDraftPriceMin}
                                placeholder={qs.noMin}
                                compact allowCustomInput
                                customDisplayFormatter={(v) => draftPriceMode === "sqm" ? `฿${formatFullNumber(v)}/sqm` : formatPriceRangeDisplay(v)}
                              />
                            </div>
                            <div className="mobile-price-inline-col">
                              <SingleSelectDropdown
                                options={[{ value: "", label: qs.noMax }, ...draftPriceMaxQuickPickOptions.filter(Boolean).map((optionValue) => ({ value: optionValue, label: draftPriceMode === "sqm" ? `฿${formatFullNumber(optionValue)}/sqm` : formatFullCurrencyLabel(optionValue) }))]}
                                value={draftPriceMax}
                                onChange={setDraftPriceMax}
                                placeholder={qs.noMax}
                                compact allowCustomInput
                                customDisplayFormatter={(v) => draftPriceMode === "sqm" ? `฿${formatFullNumber(v)}/sqm` : formatPriceRangeDisplay(v)}
                              />
                            </div>
                          </div>
                          {primaryPriceRangeError && <p className="quick-search-range-error" style={{ padding: "0 10px 8px" }}>{qs.rangeMinMaxError}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                            {/* Zone */}
                            <div className="qs-accordion-section">
                              <button type="button" className={`qs-accordion-header ${mobileFiltersOpenSections.has("zone") ? "is-open" : ""}`} onClick={() => toggleMobileFilterSection("zone") }>
                                <span className="qs-accordion-header__icon"><i className="fa-light fa-map-location-dot" /></span>
                                <span className="qs-accordion-header__label">{qs.zone}</span>
                                {draftSelectedZoneTypes.length > 0 && <span className="qs-accordion-badge">{draftSelectedZoneTypes.length}</span>}
                                <i className="fa-light fa-chevron-down qs-accordion-chevron" />
                              </button>
                              <div className={`qs-accordion-body ${mobileFiltersOpenSections.has("zone") ? "is-open" : ""}`}>
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
                                      <label className="qs-accordion-checkbox" id="estateToggleMobile">
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
                                          <input type="radio" name="estate-type-mobile" checked={draftSelectedZoneTypes.includes("Industrial Estate Zone")} readOnly />
                                          <span className="qs-estate-radio-dot" />
                                          <span className="qs-estate-radio-label">{qs.allIndustrialEstateZone}</span>
                                        </div>
                                        <div className={`qs-estate-radio-item ${draftSelectedZoneTypes.includes("IEAT") ? "is-active" : ""}`} onClick={() => {
                                          setDraftSelectedZoneTypes(prev => prev.includes("IEAT") ? prev : [...prev.filter(z => z !== "Industrial Estate Zone"), "IEAT"]);
                                        }}>
                                          <input type="radio" name="estate-type-mobile" checked={draftSelectedZoneTypes.includes("IEAT")} readOnly />
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
                            <button type="button" className={`qs-accordion-header ${mobileFiltersOpenSections.has("features") ? "is-open" : ""}`} onClick={() => toggleMobileFilterSection("features") }>
                              <span className="qs-accordion-header__icon"><i className="fa-light fa-list-check" /></span>
                              <span className="qs-accordion-header__label">{qs.features}</span>
                              {draftSelectedFeatures.length > 0 && <span className="qs-accordion-badge">{draftSelectedFeatures.length}</span>}
                              <i className="fa-light fa-chevron-down qs-accordion-chevron" />
                            </button>
                            <div className={`qs-accordion-body ${mobileFiltersOpenSections.has("features") ? "is-open" : ""}`}>
                              <div className="qs-accordion-body-inner">
                                <div className="qs-accordion-content">
                                  {featureOptions.length === 0 ? (
                                    <div className="quick-search-multi-empty">{qs.noFeaturesFound}</div>
                                  ) : (
                                    featureOptions.map((item) => (
                                      <label key={`feature-mobile-${item.value}`} className="qs-accordion-checkbox">
                                        <input type="checkbox" checked={draftSelectedFeatures.includes(item.value)} onChange={() => setDraftSelectedFeatures(prev => prev.includes(item.value) ? prev.filter(f => f !== item.value) : [...prev, item.value])} />
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
                            <button type="button" className={`qs-accordion-header ${mobileFiltersOpenSections.has("floorLoad") ? "is-open" : ""}`} onClick={() => toggleMobileFilterSection("floorLoad") }>
                              <span className="qs-accordion-header__icon"><i className="fa-light fa-weight-hanging" /></span>
                              <span className="qs-accordion-header__label">{qs.floorLoadingCapacity}</span>
                              {draftFloorLoad && <span className="qs-accordion-badge">1</span>}
                              <i className="fa-light fa-chevron-down qs-accordion-chevron" />
                            </button>
                            <div className={`qs-accordion-body ${mobileFiltersOpenSections.has("floorLoad") ? "is-open" : ""}`}>
                              <div className="qs-accordion-body-inner">
                                <div className="qs-accordion-content">
                                  <div className="qs-radio-list qs-radio-list--compact">
                                    <button type="button" className={`qs-radio-item ${draftFloorLoad === "" ? "is-active" : ""}`} onClick={() => setDraftFloorLoad("") }>
                                      <span className="qs-radio-item__icon"><i className="fa-light fa-circle-minus" /></span>
                                      <span className="qs-radio-item__label">{qs.noMin}</span>
                                      <span className="qs-radio-item__dot" />
                                    </button>
                                    {floorLoadOptions.map(item => (
                                      <button key={`floorLoad-mobile-${item}`} type="button" className={`qs-radio-item ${draftFloorLoad === item ? "is-active" : ""}`} onClick={() => setDraftFloorLoad(item)}>
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
                            <button type="button" className={`qs-accordion-header ${mobileFiltersOpenSections.has("clearHeight") ? "is-open" : ""}`} onClick={() => toggleMobileFilterSection("clearHeight") }>
                              <span className="qs-accordion-header__icon"><i className="fa-light fa-ruler-vertical" /></span>
                              <span className="qs-accordion-header__label">{qs.clearHeight}</span>
                              {(draftClearHeightMin || draftClearHeightMax) && <span className="qs-accordion-badge">1</span>}
                              <i className="fa-light fa-chevron-down qs-accordion-chevron" />
                            </button>
                            <div className={`qs-accordion-body ${mobileFiltersOpenSections.has("clearHeight") ? "is-open" : ""}`}>
                              <div className="qs-accordion-body-inner">
                                <div className="qs-accordion-content qs-accordion-content--range">
                                  <div className="quick-search-primary-popup-range-fields">
                                    <div className="quick-search-range-popup-input-wrap">
                                      <SingleSelectDropdown options={[{ value: "", label: qs.noMin }, ...clearHeightNumericOptions.map((value) => ({ value, label: `${value} m` }))]} value={draftClearHeightMin} onChange={setDraftClearHeightMin} placeholder={qs.noMin} compact allowCustomInput customDisplayFormatter={(value) => `${value} m`} suffix="m" />
                                    </div>
                                    <span className="quick-search-size-separator">-</span>
                                    <div className="quick-search-range-popup-input-wrap">
                                      <SingleSelectDropdown options={[{ value: "", label: qs.noMax }, ...clearHeightNumericOptions.map((value) => ({ value, label: `${value} m` }))]} value={draftClearHeightMax} onChange={setDraftClearHeightMax} placeholder={qs.noMax} compact allowCustomInput customDisplayFormatter={(value) => `${value} m`} suffix="m" />
                                    </div>
                                  </div>
                                  {advancedHeightRangeError && <p className="quick-search-range-error">{qs.rangeMinMaxError}</p>}
                                </div>
                              </div>
                            </div>
                          </div>
                </div>
              </div>

              <div className="quick-search-primary-popup-footer">
                <button type="button" className="quick-search-mobile-filters-clear" onClick={handleMobileFiltersClear}>{qs.clear}</button>
                <button type="button" className="quick-search-mobile-filters-apply" onClick={handleMobileFiltersApply} disabled={mobileHasRangeError}>{qs.apply}</button>
              </div>
            </div>
          </div>
        , document.body)}

      </div>
  );
}
