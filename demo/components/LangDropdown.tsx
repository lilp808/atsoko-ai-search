"use client";

import { useEffect, useRef, useState } from "react";

export type SiteLang = "th" | "en";

const LANGS: { code: SiteLang; label: string; fullLabel: string; flag: string }[] = [
  { code: "th", label: "ไทย", fullLabel: "ไทย (TH)", flag: "https://flagcdn.com/w40/th.png" },
  { code: "en", label: "EN", fullLabel: "English (EN)", flag: "https://flagcdn.com/w40/gb.png" },
];

interface Props {
  lang: SiteLang;
  onChange: (l: SiteLang) => void;
}

/** Language selector as a tap-to-open dropdown (mobile-friendly).
 *  Replaces the side-by-side TH/EN pill pair that was cramped on small screens. */
export default function LangDropdown({ lang, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const cur = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  return (
    <div className="lang-dd" ref={ref}>
      <button
        type="button"
        className="lang-dd-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="language / ภาษา"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cur.flag} alt="" width={22} height={15} />
        <span>{cur.label}</span>
        <i className={`fa-light fa-chevron-down lang-dd-chev${open ? " open" : ""}`} />
      </button>
      {open && (
        <ul className="lang-dd-menu" role="listbox" aria-label="language">
          {LANGS.map((o) => (
            <li key={o.code} role="option" aria-selected={o.code === lang}>
              <button
                type="button"
                className={`lang-dd-opt${o.code === lang ? " active" : ""}`}
                onClick={() => {
                  onChange(o.code);
                  setOpen(false);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.flag} alt="" width={22} height={15} />
                <span>{o.fullLabel}</span>
                {o.code === lang && <i className="fa-solid fa-check" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      <style jsx>{`
        .lang-dd {
          position: relative;
          flex-shrink: 0;
        }
        .lang-dd-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1px solid #e5e7eb;
          background: #fff;
          border-radius: 999px;
          padding: 6px 12px 6px 7px;
          min-height: 40px;
          font-size: 12.5px;
          font-weight: 700;
          color: #374151;
          cursor: pointer;
          font-family: inherit;
        }
        .lang-dd-btn:hover {
          border-color: #edaf39;
        }
        .lang-dd-btn img {
          width: 22px;
          height: 15px;
          border-radius: 3px;
          object-fit: cover;
          display: block;
        }
        .lang-dd-chev {
          font-size: 11px;
          color: #9ca3af;
          transition: transform 0.2s ease;
        }
        .lang-dd-chev.open {
          transform: rotate(180deg);
        }
        .lang-dd-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 172px;
          margin: 0;
          padding: 6px;
          list-style: none;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
          z-index: 1200;
        }
        .lang-dd-opt {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          border: none;
          background: transparent;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          font-family: inherit;
          text-align: left;
        }
        .lang-dd-opt img {
          width: 22px;
          height: 15px;
          border-radius: 3px;
          object-fit: cover;
          display: block;
        }
        .lang-dd-opt:hover {
          background: #f9fafb;
        }
        .lang-dd-opt.active {
          background: #fff8e6;
          color: #92600a;
        }
        .lang-dd-opt i {
          margin-left: auto;
          font-size: 12px;
        }
        @media (max-width: 991px) {
          .lang-dd-btn {
            min-height: 44px;
            padding: 8px 14px 8px 9px;
            font-size: 13.5px;
          }
          .lang-dd-menu {
            min-width: 192px;
          }
          .lang-dd-opt {
            padding: 13px 12px;
            font-size: 14.5px;
          }
        }
      `}</style>
    </div>
  );
}
