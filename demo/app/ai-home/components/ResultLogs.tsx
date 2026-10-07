"use client";

import { BrainIcon, CloseIcon, CopyIcon, ExternalIcon } from "@/app/components/icons";

export type AiResult = {
  mode: "typhoon" | "mock";
  filters: Record<string, unknown>;
  defaultedKeys: string[];
  is_property_id_search?: boolean;
  apiQuery: string;
  websiteQuery: string;
  redirectUrl: string;
  preview: { total: number | null; ok: boolean };
  explanation_th?: string;
  confidence?: number;
  latencyMs?: number;
  rawAi?: Record<string, unknown>;
};

function copyText(t: string) {
  try {
    void navigator.clipboard.writeText(t);
  } catch {
    /* clipboard unavailable — ignore */
  }
}

function LogBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="log-block">
      <h4>
        {title}
        <button className="copy-btn" onClick={() => copyText(body)} aria-label={`Copy ${title}`}>
          <CopyIcon /> copy
        </button>
      </h4>
      <pre className="log-pre">{body}</pre>
    </div>
  );
}

type Props = {
  lang: "th" | "en";
  result: AiResult | null;
  popupOpen: boolean;
  setPopupOpen: (v: boolean) => void;
  countdown: number;
  onCancel: () => void;
  onGoNow: () => void;
};

/** Floating Brain FAB + result/logs modal — same UX as the original demo page. */
export default function ResultLogs({ lang, result, popupOpen, setPopupOpen, countdown, onCancel, onGoNow }: Props) {
  if (!result) return null;

  const conf = typeof result.confidence === "number" ? Math.max(0, Math.min(1, result.confidence)) : null;
  const logBlocks = [
    { title: "RAW AI OUTPUT", body: JSON.stringify(result.rawAi ?? result.filters, null, 2) },
    { title: "FILTERS (strip + sanitize + defaults)", body: JSON.stringify(result.filters, null, 2) },
    {
      title: "META",
      body: JSON.stringify(
        {
          mode: result.mode,
          defaultedKeys: result.defaultedKeys,
          is_property_id_search: result.is_property_id_search ?? false,
          latencyMs: result.latencyMs ?? null,
        },
        null,
        2,
      ),
    },
    { title: "API QUERY", body: result.apiQuery || "(empty)" },
    { title: "WEBSITE QUERY", body: result.websiteQuery || "(empty)" },
    { title: "REDIRECT URL", body: result.redirectUrl },
    { title: "PREVIEW", body: JSON.stringify(result.preview, null, 2) },
  ];

  const t =
    lang === "th"
      ? {
          popupTitle: "ผลลัพธ์ + Logs",
          resultSection: "AI เข้าใจว่า",
          logsSection: "Logs — ดูว่า AI คิดอะไร",
          close: "ปิด",
          cancel: "ยกเลิก",
          goNow: "ไปเลย",
          openListing: "ไปหน้า listing (แท็บใหม่)",
          exactId: "รหัสทรัพย์ตรง 1 รายการ — ควรพาไปหน้า detail",
          confidence: "ความมั่นใจ",
        }
      : {
          popupTitle: "Result + Logs",
          resultSection: "Result",
          logsSection: "Logs — see what the AI thinks",
          close: "Close",
          cancel: "Cancel",
          goNow: "Go now",
          openListing: "Open listing (new tab)",
          exactId: "Exact property ID match — should go to the detail page",
          confidence: "Confidence",
        };

  return (
    <>
      {!popupOpen && (
        <button className="fab-log" onClick={() => setPopupOpen(true)} aria-label={t.popupTitle}>
          <BrainIcon />
          <span className="count">{logBlocks.length}</span>
        </button>
      )}

      {popupOpen && (
        <div className="modal-backdrop" onClick={() => setPopupOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label={t.popupTitle} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">
                <BrainIcon size={20} /> {t.popupTitle}
              </span>
              <button onClick={() => setPopupOpen(false)} aria-label={t.close}>
                <CloseIcon />
              </button>
            </div>
            <div className="modal-body">
              <h3 className="section-title">{t.resultSection}</h3>
              <p className="ai-line">
                <span className="who">{t.resultSection}:</span> {result.explanation_th ?? "—"}
                <span className={result.mode === "typhoon" ? "mode-badge" : "mode-badge mock"}>
                  {result.mode === "typhoon" ? "Typhoon AI" : "mock"}
                </span>
              </p>
              {conf !== null && (
                <p className="conf-sub">
                  {t.confidence} {Math.round(conf * 100)}%
                  {typeof result.latencyMs === "number" && <> · {result.latencyMs} ms</>}
                </p>
              )}
              {result.is_property_id_search && <p className="notice">{t.exactId}</p>}

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

              <div className="dest">
                <code>{result.redirectUrl}</code>
                <br />
                <code>/api/properties{result.apiQuery}</code>
                {result.preview.ok && result.preview.total !== null && <> — found {result.preview.total}</>}
              </div>

              {countdown > 0 ? (
                <>
                  <div className="actions">
                    <button className="btn-cancel" onClick={onCancel}>
                      {t.cancel}
                    </button>
                    <button className="btn-go" onClick={onGoNow}>
                      <ExternalIcon /> {t.goNow}
                    </button>
                  </div>
                  <div className="progress">
                    <i style={{ width: `${(countdown / 3) * 100}%` }} />
                  </div>
                </>
              ) : (
                <div className="actions">
                  <button className="btn-go" onClick={onGoNow}>
                    <ExternalIcon /> {t.openListing}
                  </button>
                </div>
              )}

              <h3 className="section-title logs">{t.logsSection}</h3>
              {logBlocks.map((b) => (
                <LogBlock key={b.title} title={b.title} body={b.body} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
