"use client";

import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

const normalizeSearchText = (text: string) =>
  text
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .trim();

interface SingleSelectOption {
  value: string;
  label: string;
}

interface SingleSelectDropdownProps {
  options: SingleSelectOption[] | string[];
  value: string;
  onChange: (value: string) => void;
  // Fired only on a discrete "done" event: picking an option from the list,
  // or finishing manual typing (blur / Enter). Use this (not onChange) for
  // side effects like closing a parent popup — onChange alone fires on every
  // keystroke when allowCustomInput is set, so wiring popup-close to onChange
  // closes the popup after the first typed character.
  onCommit?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noOptionsText?: string;
  searchable?: boolean;
  allowCustomInput?: boolean;
  customDisplayFormatter?: (value: string) => string;
  icon?: React.ReactNode;
  suffix?: string;
  disabled?: boolean;
  compact?: boolean;
}

export default function SingleSelectDropdown({
  options,
  value,
  onChange,
  onCommit,
  placeholder = "Select item",
  searchPlaceholder = "Search province",
  noOptionsText = "No options found",
  searchable = false,
  allowCustomInput = false,
  customDisplayFormatter,
  icon,
  suffix,
  disabled = false,
  compact = false,
}: SingleSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [menuPlacement, setMenuPlacement] = useState<"bottom" | "top">("bottom");
  // Portal coords for compact mode (escapes overflow clipping in scroll containers)
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalMenuRef = useRef<HTMLDivElement>(null);
  const menuPlacementRef = useRef<"bottom" | "top">("bottom");
  // Stable ref so the portal native click handler always calls the latest onChange
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });
  // Stable ref so the portal native click handler always calls the latest onCommit
  const onCommitRef = useRef(onCommit);
  useEffect(() => { onCommitRef.current = onCommit; });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    menuPlacementRef.current = menuPlacement;
  }, [menuPlacement]);

  // Normalize options to object format
  const normalizedOptions: SingleSelectOption[] = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );

  // Close dropdown when clicking outside (include portal menu ref for compact mode)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inTrigger = dropdownRef.current?.contains(target);
      const inPortal = portalMenuRef.current?.contains(target);
      if (!inTrigger && !inPortal) {
        setIsOpen(false);
      }
    };

    if (!disabled) {
      document.addEventListener("mousedown", handleClickOutside, true);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside, true);
  }, [disabled]);

  // Native click handler for compact portal options — bypasses React root-container delegation
  // (portals at document.body are outside #__next so React synthetic events don't reach them)
  useEffect(() => {
    if (!isOpen || !compact) return;
    const portal = portalMenuRef.current;
    if (!portal) return;
    const handlePortalClick = (e: MouseEvent) => {
      const optionEl = (e.target as HTMLElement).closest("[data-option-value]") as HTMLElement | null;
      if (optionEl) {
        const selectedValue = optionEl.getAttribute("data-option-value") ?? "";
        onChangeRef.current(selectedValue);
        onCommitRef.current?.(selectedValue);
        setIsOpen(false);
      }
    };
    portal.addEventListener("click", handlePortalClick);
    return () => portal.removeEventListener("click", handlePortalClick);
  }, [isOpen, compact]);

  // Filter options based on search term
  const normalizedSearchTerm = normalizeSearchText(searchTerm);
  const filteredOptions = searchable
    ? normalizedOptions.filter((option) => {
      const labelLower = option.label.toLowerCase();
      if (labelLower.includes(searchTerm.toLowerCase())) {
        return true;
      }

      return normalizeSearchText(option.label).includes(normalizedSearchTerm);
    })
    : normalizedOptions;

  // Clear search when dropdown closes
  useEffect(() => {
    if (!isOpen) setSearchTerm("");
  }, [isOpen]);

  // Handle selection
  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    onCommit?.(selectedValue);
    setIsOpen(false);
  };

  // Get display text
  const getDisplayText = () => {
    if (!value) return placeholder;
    const selectedOption = normalizedOptions.find((opt) => opt.value === value);
    if (selectedOption) return selectedOption.label;
    if (allowCustomInput) {
      return customDisplayFormatter ? customDisplayFormatter(value) : value;
    }
    return placeholder;
  };

  const computePortalStyle = (triggerRect: DOMRect, placement: "top" | "bottom") => {
    if (placement === "top") {
      setPortalStyle({ bottom: window.innerHeight - triggerRect.top + 6, top: "auto", left: triggerRect.left, width: triggerRect.width });
    } else {
      setPortalStyle({ top: triggerRect.bottom + 6, bottom: "auto", left: triggerRect.left, width: triggerRect.width });
    }
  };

  const estimatePlacementBeforeOpen = (): "bottom" | "top" => {
    const root = dropdownRef.current;
    if (!root) return "bottom";

    const trigger = root.querySelector(".single-select-trigger") as HTMLElement | null;
    if (!trigger) return "bottom";

    const rect = trigger.getBoundingClientRect();
    const estimatedMenuHeight = compact ? 220 : 280;
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const placement: "top" | "bottom" = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow ? "top" : "bottom";
    if (compact) computePortalStyle(rect, placement);
    return placement;
  };

  useLayoutEffect(() => {
    if (!isOpen || !dropdownRef.current) return;

    const updatePlacement = () => {
      const root = dropdownRef.current;
      if (!root) return;

      const trigger = root.querySelector(".single-select-trigger") as HTMLElement | null;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();

      // Compact mode: re-compute portal position on every scroll/resize
      if (compact) {
        computePortalStyle(rect, menuPlacementRef.current);
        return;
      }

      // Non-compact: use the in-place menu for placement detection
      const menu = root.querySelector(".single-select-menu") as HTMLElement | null;
      if (!menu) return;

      const menuRect = menu.getBoundingClientRect();
      const computed = window.getComputedStyle(menu);
      const configuredMaxHeight = Number.parseFloat(computed.maxHeight || "0");
      const fallbackHeight = 300;
      const measuredHeight = menuRect.height || fallbackHeight;
      const menuHeight = configuredMaxHeight > 0
        ? Math.min(measuredHeight, configuredMaxHeight)
        : measuredHeight;
      const spaceBelow = window.innerHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const hasEnoughSpaceBelow = spaceBelow >= menuHeight;
      const hasEnoughSpaceAbove = spaceAbove >= menuHeight;

      const switchToTop = spaceBelow < menuHeight - 8 && (hasEnoughSpaceAbove || spaceAbove > spaceBelow + 8);
      const switchToBottom = spaceBelow >= menuHeight + 16;

      const currentPlacement = menuPlacementRef.current;
      let nextPlacement = currentPlacement;
      if (currentPlacement === "bottom" && switchToTop) nextPlacement = "top";
      else if (currentPlacement === "top" && switchToBottom) nextPlacement = "bottom";

      if (!hasEnoughSpaceBelow && !hasEnoughSpaceAbove) nextPlacement = "top";

      if (nextPlacement !== currentPlacement) {
        menuPlacementRef.current = nextPlacement;
        setMenuPlacement(nextPlacement);
      }
    };

    updatePlacement();
    const rafId = window.requestAnimationFrame(updatePlacement);
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact, isOpen]);

  return (
    <div className={`single-select-dropdown ${disabled ? "disabled" : ""} ${compact ? "compact" : ""}`} ref={dropdownRef}>
      <div
        className={`single-select-trigger ${isOpen ? "open" : ""}`}
        onClick={() => {
          if (disabled) return;
          if (!isOpen) {
            const estimatedPlacement = estimatePlacementBeforeOpen();
            menuPlacementRef.current = estimatedPlacement;
            setMenuPlacement(estimatedPlacement);
          }
          setIsOpen((prev) => !prev);
        }}
      >
        <div className="trigger-content">
          {icon && <span className="trigger-icon">{icon}</span>}
          {allowCustomInput ? (
            <>
              <input
                className={`trigger-input ${!value ? "placeholder" : ""}`}
                type="text"
                inputMode="decimal"
                value={value}
                placeholder={placeholder}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  const normalized = digits === "" ? "" : String(Number(digits));
                  onChange(normalized);
                }}
                onClick={(e) => e.stopPropagation()}
                onFocus={() => {
                  if (!isOpen && !disabled) {
                    const estimatedPlacement = estimatePlacementBeforeOpen();
                    menuPlacementRef.current = estimatedPlacement;
                    setMenuPlacement(estimatedPlacement);
                    setIsOpen(true);
                  }
                }}
                onBlur={(e) => onCommit?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
              />
              {suffix && value && (
                <span className="trigger-suffix">{suffix}</span>
              )}
            </>
          ) : (
            <span className={`trigger-text ${!value ? "placeholder" : ""}`}>
              {getDisplayText()}
            </span>
          )}
        </div>
        <i className="fa-light fa-chevron-down chevron-icon" />
      </div>

      {/* Non-compact: normal in-place absolute menu */}
      {isOpen && !disabled && !compact && (
        <div className={`single-select-menu ${menuPlacement === "top" ? "top" : "bottom"}`}>
          {searchable && (
            <div className="single-select-search">
              <div className="single-select-search-inner">
                <i className="fa-light fa-magnifying-glass single-select-search-icon" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
          <div className="single-select-options">
            {filteredOptions.length === 0 ? (
              <div className="single-select-no-results">{noOptionsText}</div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={`single-select-option ${value === option.value ? "selected" : ""}`}
                  onClick={() => handleSelect(option.value)}
                >
                  <span>{option.label}</span>
                  {value === option.value && <i className="fa-solid fa-check" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Compact: portal to document.body — escapes overflow clipping in scroll containers */}
      {isOpen && !disabled && compact && mounted && createPortal(
        <div ref={portalMenuRef} className="ssd-compact-portal" style={portalStyle}>
          {searchable && (
            <div className="ssd-compact-search">
              <i className="fa-light fa-magnifying-glass ssd-compact-search-icon" />
              <input
                className="ssd-compact-search-input"
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                autoComplete="off"
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
          <div className="ssd-compact-options">
            {filteredOptions.length === 0 ? (
              <div className="ssd-compact-no-results">{noOptionsText}</div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  data-option-value={option.value}
                  className={`ssd-compact-option ${value === option.value ? "is-selected" : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <span>{option.label}</span>
                  {value === option.value && <i className="fa-solid fa-check" style={{ fontSize: 11, marginLeft: "auto", color: "var(--main-color,#f59e0b)" }} />}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}

      <style jsx>{`
        .single-select-dropdown {
          position: relative;
          width: 100%;
          min-width: 0;
        }

        .single-select-dropdown.disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .single-select-dropdown.compact .single-select-trigger {
          min-height: 42px;
          padding: 0 30px 0 10px;
          border-radius: 10px;
          font-size: 13px;
          justify-content: flex-start;
          position: relative;
        }

        .single-select-dropdown.compact .trigger-content {
          gap: 7px;
          width: 100%;
        }

        .single-select-dropdown.compact .trigger-input {
          min-width: 0;
          width: 100%;
          font-size: 13px;
          letter-spacing: -0.01em;
          text-align: left;
        }

        .single-select-dropdown.compact .chevron-icon {
          font-size: 11px;
          margin-left: 0;
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
        }

        .single-select-dropdown.compact .single-select-menu {
          top: calc(100% + 6px);
          min-width: 100%;
          width: 100%;
          max-width: none;
          border-radius: 10px;
          box-shadow: 0 12px 24px rgba(17, 24, 39, 0.14);
        }

        .single-select-dropdown.compact .single-select-menu.top {
          top: auto;
          bottom: calc(100% + 6px);
        }

        .single-select-dropdown.compact .single-select-menu.bottom {
          top: calc(100% + 6px);
          bottom: auto;
        }

        .single-select-dropdown.compact .single-select-option {
          padding: 8px 10px;
          font-size: 12px;
        }

        .single-select-trigger {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 14px 0 12px;
          min-height: 46px;
          background: #f9fafb;
          border: 1px solid #d9dee7;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
          color: #111827;
          font-weight: 500;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
        }

        .single-select-dropdown.disabled .single-select-trigger {
            background-color: #f3f4f6;
            cursor: not-allowed;
            border-color: #e5e7eb;
        }

        .single-select-trigger:hover, .single-select-trigger.open {
          border-color: #d1d5db;
          background: #fff;
          color: #111827;
        }
        
        .single-select-dropdown.disabled .single-select-trigger:hover {
            border-color: #e5e5e5;
            color: #888da0;
        }

        .trigger-content {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
            overflow: hidden;
            min-width: 0;
        }

        .trigger-text {
            
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .trigger-input,
        .single-select-trigger input.trigger-input[type="text"] {
          flex: 1;
          min-width: 0;
          width: 100%;
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          outline: none;
          font: inherit;
          color: inherit;
          padding: 0 !important;
          margin: 0;
          height: auto !important;
          line-height: 1.2;
          text-align: left !important;
          text-indent: 0 !important;
          -webkit-appearance: none;
          appearance: none;
        }

        .trigger-input::placeholder,
        .single-select-trigger input.trigger-input[type="text"]::placeholder {
          color: #6b7280;
          opacity: 1;
          font-weight: 400;
          text-indent: 0;
          text-align: left;
        }

        .trigger-suffix {
            font-size: 11px;
            color: #9ca3af;
            flex-shrink: 0;
            padding-left: 3px;
            white-space: nowrap;
            pointer-events: none;
            line-height: 1;
        }

        .trigger-icon {
            color: #fbbf24;
            
            font-weight: 300;
            width: 18px;
            text-align: center;
            flex-shrink: 0;
            display: inline-block;
        }

        .trigger-icon i {
            font-weight: 300;
            color: inherit;
            font-size: inherit;
        }

        .single-select-dropdown.disabled .trigger-icon {
            color: #aaa;
        }

        .single-select-trigger .placeholder {
          color: #6b7280;
          font-weight: 400;
        }

        .chevron-icon {
          font-size: 14px;
          color: #9ca3af;
          margin-left: 10px;
          flex-shrink: 0;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          transition: transform 0.2s ease;
          pointer-events: none;
        }

        .single-select-trigger.open .chevron-icon {
          transform: rotate(180deg);
        }

        .single-select-dropdown.disabled .chevron-icon {
          color: #d1d5db;
        }

        .single-select-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          min-width: max(100%, 225px);
          width: min(230px, calc(100vw - 24px));
          max-width: calc(100vw - 24px);
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          box-shadow: 0 12px 28px rgba(17, 24, 39, 0.12);
          z-index: 1000;
          max-height: 300px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .single-select-menu.top {
          top: auto;
          bottom: calc(100% + 8px);
        }

        .single-select-menu.bottom {
          top: calc(100% + 8px);
          bottom: auto;
        }

        .single-select-search {
          padding: 10px;
          border-bottom: 1px solid #eef2f7;
        }

        .single-select-search-inner {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 10px;
          height: 34px;
          border: 1px solid #d9dee7;
          border-radius: 7px;
          background: #f9fafb;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
        }

        .single-select-search-inner:focus-within {
          border-color: var(--main-color);
          background: #fff;
          box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.12);
        }

        .single-select-search-icon {
          color: #9ca3af;
          font-size: 12px;
          flex-shrink: 0;
          line-height: 1;
        }

        .single-select-search input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 12px;
          color: #111827;
          padding: 0;
          height: 100%;
        }

        .single-select-search input::placeholder {
          color: #9ca3af;
        }

        .single-select-options {
          overflow-y: auto;
          max-height: 220px;
          padding: 6px;
        }

        .single-select-option {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          cursor: pointer;
          transition: background 0.2s;
          font-size: 13px;
          color: #374151;
          font-weight: 500;
          border-radius: 8px;
          text-align: left;
          width: 100%;
        }

        .single-select-option span {
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          text-align: left;
        }

        .single-select-option:hover {
          background: #f9fafb;
          color: var(--main-color);
        }

        .single-select-option.selected {
          background: rgba(226, 168, 47, 0.1);
          color: var(--main-color);
        }

        .single-select-option i {
          font-size: 12px;
          flex-shrink: 0;
          margin-left: auto;
        }

        .single-select-no-results {
          padding: 18px;
          text-align: center;
          color: #6b7280;
          font-size: 13px;
        }

        @media (max-width: 991px) {
          .single-select-trigger {
            min-height: 46px;
          }

          .single-select-dropdown.compact .single-select-trigger {
            height: 40px;
            min-height: 40px;
            padding-top: 0;
            padding-bottom: 0;
            font-size: 13px;
          }

          .single-select-dropdown.compact .trigger-content {
            align-items: center;
          }

          .single-select-dropdown.compact .trigger-input {
            line-height: 1.2;
            min-width: 76px;
            font-size: 13px;
          }

          .single-select-dropdown.compact .trigger-text {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.2;
          }

          .chevron-icon {
            line-height: 1;
            transform: translateY(0);
          }

          .single-select-search {
            padding: 8px;
          }

          .single-select-search-inner {
            height: 30px;
            padding: 0 9px;
            border-radius: 6px;
          }

          .single-select-search input {
            font-size: 12px;
          }

          .single-select-menu {
            left: 0;
            right: 0;
            min-width: 0;
            width: auto;
            max-width: 100%;
            max-height: min(45vh, 260px);
          }

          .single-select-options {
            max-height: min(34vh, 180px);
          }
        }
      `}</style>

      <style jsx global>{`
        .ssd-compact-portal {
          position: fixed;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          box-shadow: 0 12px 28px rgba(17, 24, 39, 0.12);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          z-index: 1200000;
        }

        .ssd-compact-search {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 10px;
          height: 34px;
          margin: 8px 8px 0;
          flex-shrink: 0;
          border: 1px solid #d9dee7;
          border-radius: 7px;
          background: #f9fafb;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
        }

        .ssd-compact-search:focus-within {
          border-color: var(--main-color, #fbbf24);
          background: #fff;
          box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.12);
        }

        .ssd-compact-search-icon {
          color: #9ca3af;
          font-size: 12px;
          flex-shrink: 0;
          line-height: 1;
          display: flex;
          align-items: center;
        }

        .ssd-compact-search-input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 12px;
          color: #111827;
          padding: 0;
          line-height: 1;
          display: block;
        }

        .ssd-compact-search-input::placeholder {
          color: #9ca3af;
        }

        @media (max-width: 1024px) {
          .ssd-compact-search-input {
            font-size: 10px;
          }
        }

        .ssd-compact-search + .ssd-compact-options {
          border-top: 1px solid #e5e7eb;
          margin-top: 8px;
          padding-top: 4px;
        }

        .ssd-compact-options {
          overflow-y: auto;
          
          max-height: min(45vh, 220px);
          scrollbar-width: thin;
          scrollbar-color: #e5e7eb transparent;
        }

        .ssd-compact-option {
          display: flex;
          align-items: center;
          padding: 8px 10px;
          border-radius: 7px;
          cursor: pointer;
          font-size: 13px;
          color: #374151;
          transition: background 0.15s, color 0.15s;
        }

        .ssd-compact-option:hover {
          background: #f9fafb;
          color: var(--main-color, #fbbf24);
        }

        .ssd-compact-option.is-selected {
          background: rgba(226, 168, 47, 0.1);
          color: var(--main-color, #fbbf24);
        }

        .ssd-compact-option .ssd-option-check {
          margin-left: auto;
          font-size: 11px;
        }

        .ssd-compact-no-results {
          padding: 18px;
          text-align: center;
          color: #6b7280;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}
