"use client";

import React from "react";
import { PrimaryFilterTab, type QsStrings, getPropertyTypeIconClass, getPropertyTypeLabel } from "@/lib/quickSearchUtils";

export interface QuickSearchDesktopFiltersProps {
  qs: QsStrings;
  status: string;
  setStatus: (v: string) => void;
  isIdKeyword: boolean;
  idImpliedStatus: "" | "rent" | "sale";
  isPrimaryFilterPopupOpen: boolean;
  primaryFilterTab: PrimaryFilterTab;
  openPrimaryFilterPopup: (tab: PrimaryFilterTab) => void;
  propertyType: string;
  sizeMin: string;
  sizeMax: string;
  priceMin: string;
  priceMax: string;
  areaSummaryLabel: string;
  priceSummaryLabel: string;
  isAdvancedFilterPopupOpen: boolean;
  advancedFilterCount: number;
  openAdvancedFilterPopup: () => void;
  renderAdvancedFilterTooltip: () => React.ReactNode;
}

export default function QuickSearchDesktopFilters({
  qs, status, setStatus, isIdKeyword, idImpliedStatus,
  isPrimaryFilterPopupOpen, primaryFilterTab, openPrimaryFilterPopup,
  propertyType, sizeMin, sizeMax, priceMin, priceMax,
  areaSummaryLabel, priceSummaryLabel,
  isAdvancedFilterPopupOpen, advancedFilterCount, openAdvancedFilterPopup,
  renderAdvancedFilterTooltip,
}: QuickSearchDesktopFiltersProps) {
  return (
      <div className={`quick-search-filters-bar-row${isIdKeyword ? " quick-search-filters-disabled" : ""}`}>
        <div className={`quick-search-status-toggle quick-search-status-toggle-inline${isIdKeyword ? " quick-status-multi-id-locked" : ""}`}>
          <input
            className="hidden radio-label"
            type="radio"
            name="status"
            id="hero-rent"
            value="rent"
            checked={isIdKeyword ? idImpliedStatus === "rent" : status === "rent"}
            onChange={(e) => { if (!isIdKeyword) setStatus(e.target.value); }}
            disabled={isIdKeyword}
          />
          <label className="quick-status-btn" htmlFor="hero-rent">
            <span className="quick-status-btn-icon"><i className="fa-light fa-house" /></span>
            <span className="quick-status-btn-text">{qs.forRent}</span>
          </label>
          <input
            className="hidden radio-label"
            type="radio"
            name="status"
            id="hero-sale"
            value="sale"
            checked={isIdKeyword ? idImpliedStatus === "sale" : status === "sale"}
            onChange={(e) => { if (!isIdKeyword) setStatus(e.target.value); }}
            disabled={isIdKeyword}
          />
          <label className="quick-status-btn" htmlFor="hero-sale">
            <span className="quick-status-btn-icon"><i className="fa-light fa-tag" /></span>
            <span className="quick-status-btn-text">{qs.forSale}</span>
          </label>
        </div>

        <button
          type="button"
          className={`quick-search-primary-popup-trigger ${isPrimaryFilterPopupOpen && primaryFilterTab === "type" ? "is-active" : ""}`}
          onClick={() => openPrimaryFilterPopup("type")}
          aria-expanded={isPrimaryFilterPopupOpen && primaryFilterTab === "type"}
          aria-label={qs.propertyTypeLabel}
        >
          <i className={`fa-light ${getPropertyTypeIconClass(propertyType)} quick-search-location-icon`}></i>
          <span className="quick-search-range-trigger-text with-icon">
            {getPropertyTypeLabel(propertyType, qs)}
          </span>
        </button>

        <button
          type="button"
          className={`quick-search-primary-popup-trigger ${isPrimaryFilterPopupOpen && primaryFilterTab === "area" ? "is-active" : ""} ${sizeMin || sizeMax ? "has-value" : ""}`}
          onClick={() => openPrimaryFilterPopup("area")}
          aria-expanded={isPrimaryFilterPopupOpen && primaryFilterTab === "area"}
          aria-label={qs.selectAreaRange}
        >
          <i className="fa-light fa-ruler-combined quick-search-location-icon"></i>
          <span className="quick-search-range-trigger-text with-icon">{areaSummaryLabel}</span>
        </button>

        <button
          type="button"
          className={`quick-search-primary-popup-trigger ${isPrimaryFilterPopupOpen && primaryFilterTab === "price" ? "is-active" : ""} ${priceMin || priceMax ? "has-value" : ""}`}
          onClick={() => openPrimaryFilterPopup("price")}
          aria-expanded={isPrimaryFilterPopupOpen && primaryFilterTab === "price"}
          aria-label={qs.selectPriceRange}
        >
          <i className="fa-light fa-baht-sign quick-search-location-icon"></i>
          <span className="quick-search-range-trigger-text with-icon">{priceSummaryLabel}</span>
        </button>

        <div className="quick-search-more-filters-wrap">
          <button
            type="button"
            className={`quick-search-more-filters-btn ${isAdvancedFilterPopupOpen ? "is-active" : ""} ${advancedFilterCount > 0 ? "has-value" : ""}`}
            onClick={() => openAdvancedFilterPopup()}
            aria-expanded={isAdvancedFilterPopupOpen}
            aria-label={qs.moreFilters}
          >
            <i className="fa-light fa-sliders"></i>
            <span>{advancedFilterCount > 0 ? `${qs.moreFilters} (${advancedFilterCount})` : qs.moreFilters}</span>
          </button>

          {advancedFilterCount > 0 && (
            <div className="quick-search-more-filters-tooltip">
              {renderAdvancedFilterTooltip()}
            </div>
          )}
        </div>
      </div>
  );
}
