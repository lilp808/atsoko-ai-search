"use client";

import Link from "next/link";
import React, { Suspense, useEffect, useRef, useState } from "react";
import { SparklesIcon } from "@/app/components/icons";
import LangDropdown from "@/components/LangDropdown";
import QuickSearchExact from "@/components/QuickSearchExact";
import AiInputBar from "./components/AiInputBar";
import ResultLogs, { type AiResult } from "./components/ResultLogs";
import "./ai-home.css";
import "./qs-exact.css";

type Lang = "th" | "en";

const LISTING_BASE =
  process.env.NEXT_PUBLIC_SITE_LISTING_BASE ?? "https://www.thaiindustrialproperty.com/th/listing";

export default function AiHomePage() {
  const [lang, setLang] = useState<Lang>("th");
  const [aiMode, setAiMode] = useState(false);
  const [aiFill, setAiFill] = useState<{ n: number; filters: Record<string, unknown> } | null>(null);
  const [aiText, setAiText] = useState("โกดังให้เช่า บางนา 500 ตรม งบไม่เกิน 2 แสน");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [popupOpen, setPopupOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  useEffect(() => {
    if (!popupOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPopupOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [popupOpen]);

  function cancelRedirect() {
    if (timer.current) clearInterval(timer.current);
    setCountdown(0);
  }

  function openListing(url: string) {
    cancelRedirect();
    window.open(url, "_blank", "noopener");
  }

  function startCountdown(url: string) {
    setCountdown(3);
    timer.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (timer.current) clearInterval(timer.current);
          window.open(url, "_blank", "noopener");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function askAi() {
    cancelRedirect();
    setError("");
    setResult(null);
    if (!aiText.trim()) return;
    setLoading(true);
    try {
      const r = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      });
      if (!r.ok) {
        const err = (await r.json().catch(() => null)) as { error?: string; detail?: string } | null;
        throw new Error(`${err?.error ?? `server ${r.status}`}${err?.detail ? `: ${err.detail}` : ""}`);
      }
      const j = (await r.json()) as AiResult;
      setAiFill((prev) => ({ n: (prev?.n ?? 0) + 1, filters: j.filters }));
      setResult(j);
      setPopupOpen(true);
      startCountdown(j.redirectUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  const t =
    lang === "th"
      ? {
          back: "← กลับ demo เดิม",
          title1: "ค้นหาโกดัง โรงงาน ที่ดิน",
          title2: "ทั่วประเทศไทย",
          sub: "ฟิลเตอร์เดียวกับหน้า Homepage + ปุ่ม AI Mode — ผล AI เติมกลับลงฟิลเตอร์จริง",
          filterTitle: "ค้นหาด่วน (แบบ Homepage)",
          aiOpen: "เปิด AI Mode",
          aiClose: "ปิด AI Mode",
          understood: "AI เข้าใจว่า",
          refine: "ปรับฟิลเตอร์ต่อ →",
          error: "ผิดพลาด:",
        }
      : {
          back: "← Back to original demo",
          title1: "Find warehouses, factories, land",
          title2: "across Thailand",
          sub: "Same filters as the Homepage + AI Mode button — AI fills the real filters",
          filterTitle: "Quick search (Homepage style)",
          aiOpen: "Open AI Mode",
          aiClose: "Close AI Mode",
          understood: "AI understood",
          refine: "Refine in filters →",
          error: "Error:",
        };

  return (
    <>
      {/* Font Awesome Pro 6.4.2 — same icon font as the public website */}
      <link rel="stylesheet" href="/qs-assets/css/plugins-async.css" />

      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">THAIINDUSTRIAL · AI-HOME DEMO</div>
          <LangDropdown lang={lang} onChange={setLang} />
        </div>
      </header>

      <section className="ai-home-hero">
        <Link href="/" className="ai-home-back">
          {t.back}
        </Link>
        <h1>
          {t.title1}
          <br />
          {t.title2}
        </h1>
        <p className="ai-home-sub">{t.sub}</p>

        <div className="ai-home-card">
          <div className="ai-home-filtertitle">
            <span>◈</span>
            <span>{t.filterTitle}</span>
            <span style={{ flex: 1 }} />
            <button type="button" className={`btn-aimode ${aiMode ? "on" : ""}`} onClick={() => setAiMode((v) => !v)}>
              <SparklesIcon /> {aiMode ? t.aiClose : t.aiOpen}
            </button>
          </div>

          {aiMode ? (
            <div className="ai-home-ai-only">
              <AiInputBar lang={lang} value={aiText} onChange={setAiText} loading={loading} onAsk={askAi} />
              {result && (
                <>
                  <p className="ai-home-understood ai-line">
                    <span className="who">{t.understood}:</span> {result.explanation_th ?? "—"}
                    <span className={result.mode === "typhoon" ? "mode-badge" : "mode-badge mock"}>{result.mode}</span>
                  </p>
                  <div className="chips">
                    {Object.entries(result.filters).map(([k, v]) => (
                      <span
                        key={k}
                        className={
                          k === "property_id"
                            ? "f-chip property"
                            : result.defaultedKeys.includes(k)
                              ? "f-chip defaulted"
                              : "f-chip"
                        }
                      >
                        {k}={String(v)}
                        {result.defaultedKeys.includes(k) ? " *" : ""}
                      </span>
                    ))}
                  </div>
                  <div className="actions">
                    <button type="button" className="btn-manual-search" onClick={() => setAiMode(false)}>
                      {t.refine}
                    </button>
                  </div>
                </>
              )}
              {error && (
                <div className="error-box" style={{ marginTop: 12 }}>
                  {t.error} {error}
                </div>
              )}
            </div>
          ) : (
            <div className="ai-home-qs">
              <Suspense fallback={null}>
                <QuickSearchExact
                  variant="home"
                  localeOverride={lang}
                  aiFill={aiFill}
                  onNavigate={(qs) => openListing(`${LISTING_BASE}${qs ? `?${qs}` : ""}`)}
                />
              </Suspense>
            </div>
          )}
        </div>
      </section>

      <main className="wrap">
        <p className="footer">/ai-home · exact Homepage filter + AI Mode · FAB + logs เหมือนหน้าเดิม</p>
      </main>

      <ResultLogs
        lang={lang}
        result={result}
        popupOpen={popupOpen}
        setPopupOpen={setPopupOpen}
        countdown={countdown}
        onCancel={cancelRedirect}
        onGoNow={() => result && openListing(result.redirectUrl)}
      />
    </>
  );
}
