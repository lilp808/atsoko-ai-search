import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import {
  applyDefaults,
  buildApiQuery,
  buildWebsiteQuery,
  sanitizeLocations,
  stripToAllowlist,
  type AiFilters,
} from "@/lib/mapping";

// SYSTEM_PROMPT lives in @/lib/systemPrompt (single source;
// spec: public/docs/AI-PROMPT-CONTRACT.md §2 — contract wins for prompt text).

// Tiny rule-based fallback so the demo works with no API key.
// Uses REAL backend vocabulary only (BACKEND-API-REFERENCE.md §2.1):
// size_min/size_max, price_min/price_max, price_mode, status "For Rent"/"For Sale",
// features, zone_types, min/max_height, floor_load, sort (default created_desc).
// Uncertain Thai location stays in known-district map only — never guess.
function thaiDigitsToArabic(s: string): string {
  const map: Record<string, string> = { "๐": "0", "๑": "1", "๒": "2", "๓": "3", "๔": "4", "๕": "5", "๖": "6", "๗": "7", "๘": "8", "๙": "9" };
  return s.replace(/[๐-๙]/g, (d) => map[d] ?? d);
}

function parseThaiMoney(numStr: string, unit?: string): number {
  let v = parseFloat(numStr.replace(/,/g, ""));
  if (unit === "ล้าน") v *= 1_000_000;
  else if (unit === "แสน") v *= 100_000;
  return v;
}

function mockParse(text: string): AiFilters {
  const t = thaiDigitsToArabic(text);
  const out: AiFilters = {};
  if (/ซื้อ|ขาย|buy|purchase|for sale|\bsale\b/i.test(t)) out.status = "For Sale";
  else if (/เช่า|rent|for rent/i.test(t)) out.status = "For Rent";
  // "มีออฟฟิศ/มีสำนักงาน" = the unit HAS an office → feature, NOT type Office.
  const hasOfficeFeature = /มี\s*(ออฟฟิศ|สำนักงาน|office)/i.test(t);
  if (hasOfficeFeature) out.features = ["With Office area"];
  if (/โรงงาน/.test(t)) out.type = "Factory";
  else if (/ที่ดิน/.test(t)) out.type = "Land";
  else if (!hasOfficeFeature && /ออฟฟิศ|สำนักงาน/.test(t)) out.type = "Office";
  else if (/โกดัง/.test(t)) out.type = "Warehouse";

  // Small Thai→EN zone table (generic terms only — named estates stay in landmarks).
  const zones: string[] = [];
  if (/ฟรีเทรด|ปลอดภาษี|free[\s-]?trade/i.test(t)) zones.push("Free Trade Zone");
  if (/โซนสีม่วง|ผังเมืองสีม่วง|purple/i.test(t)) zones.push("Purple Zone");
  if (/นิคมอุตสาหกรรม|industrial\s*estate/i.test(t)) zones.push("Industrial Estate Zone");
  if (zones.length > 0) out.zone_types = zones;

  const at = t.toUpperCase().replace(/\s+/g, "").match(/AT\d+(?:SR|R|S)?/);
  const isCoastal = /ใกล้.*ทะเล|ติด.*ทะเล|ริมทะเล|sea\s*side/i.test(t);
  if (at) {
    out.property_id = at[0];
  } else {
    if (/บางนา/.test(t)) out.district = "Bang Na";
    if (/บางเสาธง/.test(t)) out.district = "Bang Sao Thong";
    if (/ชลบุรี/.test(t)) out.province = "Chonburi";
    if (/สมุทรปราการ/.test(t)) out.province = "Samut Prakan";
    if (/กรุงเทพ|กทม/.test(t)) out.province = "Bangkok";
    // Vague coastal → single-province default (website ignores keyword).
    // NEVER keep the vague text in keyword.
    if (isCoastal && !out.province) out.province = "Chonburi";
  }

  const range = t.match(/(\d[\d,]*)\s*[-–—~]\s*(\d[\d,]*)\s*(ตร\.?ม\.?|sqm)/i);
  const lessThan = t.match(/(ไม่เกิน)\s*(\d[\d,]*)\s*(ตร\.?ม\.?|sqm)/i);
  const moreThan = t.match(/(มากกว่า|เกิน|ตั้งแต่|ขั้นต่ำ)\s*(\d[\d,]*)\s*(ตร\.?ม\.?|sqm)/i);
  const single = t.match(/(\d[\d,]*)\s*(ตร\.?ม\.?|sqm)/i);
  const num = (s: string) => parseInt(s.replace(/,/g, ""), 10);
  if (range) {
    out.size_min = num(range[1]);
    out.size_max = num(range[2]);
  } else if (lessThan) {
    out.size_max = num(lessThan[2]);
  } else if (moreThan) {
    out.size_min = num(moreThan[2]);
  } else if (single) {
    const x = num(single[1]);
    out.size_min = Math.round(x * 0.8);
    out.size_max = Math.round(x * 1.2);
  }
  // Clear height ("สูง X-Y เมตร", "สูงไม่เกิน X เมตร", "สูง X เมตร" → min).
  const hRange = t.match(/สูง\s*(\d[\d,.]*)\s*[-–—~]\s*(\d[\d,.]*)\s*(เมตร|ม\.)/i);
  const hMax = t.match(/สูง(?:ไม่เกิน|ไม่เกิน)\s*(\d[\d,.]*)\s*(เมตร|ม\.)/i);
  const hSingle = t.match(/สูง\s*(\d[\d,.]*)\s*(เมตร|ม\.)/i);
  const fnum = (s: string) => parseFloat(s.replace(/,/g, ""));
  if (hRange) {
    out.min_height = fnum(hRange[1]);
    out.max_height = fnum(hRange[2]);
  } else if (hMax) {
    out.max_height = fnum(hMax[1]);
  } else if (hSingle) {
    out.min_height = fnum(hSingle[1]);
  }

  // Floor load ("รับน้ำหนัก X ตัน") → number; website formats "N ton per sqm".
  const fl = t.match(/รับน้ำหนัก\s*(\d[\d,.]*)\s*ตัน/i);
  if (fl) out.floor_load = fnum(fl[1]);

  // "ไม่เกินแสน" (bare unit = 1×unit) as well as "ไม่เกิน 2 แสน" / "ไม่เกิน 100000".
  // Guard: a number followed by a size/height unit belongs to that filter, not money.
  const afterIsMeasure = (m: RegExpMatchArray | null) =>
    !!m && m.index !== undefined && /^\s*(ตร\.?ม\.?|sqm|เมตร|ม\.)/i.test(t.slice(m.index + m[0].length));
  const budget = t.match(/(ไม่เกิน|งบ(?:\s*ไม่เกิน)?)\s*(?:(\d[\d,.]*)\s*(ล้าน|แสน)?|(ล้าน|แสน))/);
  if (budget && !afterIsMeasure(budget)) {
    const digits = budget[2] ?? "1";
    const unit = budget[3] ?? budget[4];
    out.price_max = parseThaiMoney(digits, unit);
  }
  const budgetMin = t.match(/(ตั้งแต่|เริ่ม(?:ต้น)?|ขั้นต่ำ)\s*(\d[\d,.]*)\s*(ล้าน|แสน)?\s*(บาท)?/);
  if (budgetMin && !/ตร\.?ม\.?|sqm/i.test(budgetMin[0]) && !afterIsMeasure(budgetMin)) {
    out.price_min = parseThaiMoney(budgetMin[2], budgetMin[3]);
  }

  // price_mode=sqm only on explicit per-sqm phrasing (backend divides priceField/size).
  if (/ต่อ\s*ตร\.?ม\.?|ตร\.?ม\.?\s*ละ|ต่อ\s*ตารางเมตร|\/\s*sqm|per\s*sqm/i.test(t)) {
    out.price_mode = "sqm";
  }

  // sort hints (backend: sort=price_asc|price_desc|size_asc|size_desc|updated_desc)
  if (/ถูกสุด|ราคาถูก|น้อยไปมาก|เรียง.*ถูก/i.test(t)) out.sort = "price_asc";
  else if (/แพงสุด|ราคาแพง|มากไปน้อย/i.test(t)) out.sort = "price_desc";
  else if (/ใหญ่สุด|กว้างสุด/i.test(t)) out.sort = "size_desc";

  if (Object.keys(out).length === 0) {
    return { keyword: text, confidence: 0.1, explanation_th: "โหมดทดลอง (ไม่มี API key) — ค้นแบบคำอิสระ" };
  }
  // Default ordering for every parsed query (locked decision): newest first.
  if (!out.sort) out.sort = "created_desc";
  out.confidence = 0.5;
  out.explanation_th = isCoastal
    ? "โหมดทดลอง (ไม่มี API key) — สมมติใกล้ทะเลเป็นชลบุรี ไม่เกิน 500 ตรม. — กดเปลี่ยนจังหวัดได้"
    : "โหมดทดลอง (ไม่มี API key) — แยกคำสำคัญเบื้องต้น";
  return out;
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "").slice(0, 500);
  if (!text.trim()) {
    return NextResponse.json({ error: "empty text" }, { status: 400 });
  }

  const apiKey = process.env.OPENTYPHOON_API_KEY;
  let aiRaw: Record<string, unknown>;
  let mode: "typhoon" | "mock" = "mock";

  if (apiKey) {
    mode = "typhoon";
    let content: string;
    try {
      const client = new OpenAI({ apiKey, baseURL: "https://api.opentyphoon.ai/v1" });
      const res = await client.chat.completions.create({
        model: "typhoon-v2.5-30b-a3b-instruct",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
        temperature: 0.6,
        max_tokens: 512,
        top_p: 0.6,
        frequency_penalty: 0,
        stream: false,
      });
      content = res.choices[0]?.message?.content ?? "";
    } catch (e) {
      // Key exists but Typhoon is unreachable/failed → loud error, never silent mock.
      const msg = e instanceof Error ? e.message : "unknown typhoon error";
      return NextResponse.json(
        { error: "typhoon_failed", detail: msg.slice(0, 300) },
        { status: 502 },
      );
    }
    try {
      aiRaw = JSON.parse(content);
    } catch {
      aiRaw = { keyword: text };
    }
  } else {
    aiRaw = mockParse(text);
  }

  const stripped = sanitizeLocations(stripToAllowlist(aiRaw));
  const { filters, defaultedKeys } = applyDefaults(stripped);
  // Full property-ID match → backend returns exactly 1 row (properties.js:1257-1269).
  // Frontend should go to detail page instead of the result list.
  const is_property_id_search =
    typeof stripped.property_id === "string" && /^AT\d+(R|S|SR)$/i.test(stripped.property_id.trim());
  const apiQuery = buildApiQuery(filters);
  const websiteQuery = buildWebsiteQuery(filters);
  const listingBase =
    process.env.NEXT_PUBLIC_SITE_LISTING_BASE ?? "https://www.thaiindustrialproperty.com/th/listing";

  // Server-side preview count only (guest, no auth). Never blocks the redirect.
  let preview: { total: number | null; ok: boolean } = { total: null, ok: false };
  try {
    const base = (process.env.PROPERTIES_API_BASE ?? "https://api.thaiindustrialproperty.com").replace(/\/+$/, "");
    const r = await fetch(`${base}/api/properties${apiQuery}${apiQuery.includes("limit") ? "" : "&limit=1"}`, {
      cache: "no-store",
    });
    if (r.ok) {
      const j = await r.json();
      preview = { total: j?.pagination?.total ?? null, ok: j?.success === true };
    }
  } catch {
    // ignore — preview is best-effort
  }

  return NextResponse.json({
    mode,
    filters,
    defaultedKeys,
    is_property_id_search,
    apiQuery,
    websiteQuery,
    redirectUrl: `${listingBase}${websiteQuery}`,
    preview,
    explanation_th: typeof aiRaw.explanation_th === "string" ? aiRaw.explanation_th : undefined,
    confidence: typeof aiRaw.confidence === "number" ? aiRaw.confidence : undefined,
    latencyMs: Date.now() - t0,
    rawAi: aiRaw,
  });
}
