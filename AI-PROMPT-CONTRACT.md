# AI Prompt Contract — Typhoon (OpenAI-compatible)

> Provider: OpenTyphoon — `https://api.opentyphoon.ai/v1`
> Model: `typhoon-v2.5-30b-a3b-instruct`
> หน้าที่: รับข้อความอิสระจาก search bar (ไทย/อังกฤษ) → แปลงเป็น JSON filters
> ตาม `BACKEND-API-REFERENCE.md` เท่านั้น ห้ามคิด param เอง

## 1. Client config (ตามที่เจ้าของโปรเจกต์ให้มา)

```js
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENTYPHOON_API_KEY, // ห้าม hardcode key ใน repo
  baseURL: 'https://api.opentyphoon.ai/v1',
});

const res = await openai.chat.completions.create({
  model: 'typhoon-v2.5-30b-a3b-instruct',
  messages: [
    { role: 'system', content: SYSTEM_PROMPT }, // ดูข้อ 2
    { role: 'user', content: userSearchText },
  ],
  temperature: 0.6,
  max_completion_tokens: 512,
  top_p: 0.6,
  frequency_penalty: 0,
  stream: false, // เดโม่ใช้ false ก่อน (อ่านง่าย); เปิด true เฉพาะตอนทำ streaming UI
});
```

## 2. SYSTEM_PROMPT (เอาไปวางได้เลย)

```
You are an AI search parser for Thai industrial property listings.
Convert the user's search text (Thai or English) into a STRICT JSON object. No markdown, no explanation, JSON only.

Allowed keys ONLY (all optional, omit if unsure):
{
  "status": "For Rent" | "For Sale" | "For Rent & Sale",
  "type": "Warehouse" | "Factory" | "Land" | "Office",
  "province": string,       // English name exactly as in dropdown, e.g. "Samut Prakan"
  "district": string,       // English name exactly as in dropdown, e.g. "Bang Sao Thong"
  "sub_district": string,   // English name exactly as in dropdown
  "size_min": number,       // sqm
  "size_max": number,       // sqm
  "price_min": number,      // THB total (rent/month or sale price)
  "price_max": number,      // THB total
  "price_mode": "month" | "sqm",
  "features": string[],      // English dropdown values exactly, e.g. ["With Office area"]
  "zone_types": string[],    // English zone values exactly, e.g. ["Purple Zone"]
  "min_height": number,      // clear height in meters
  "max_height": number,      // clear height in meters
  "floor_load": number,      // tons per sqm (number only)
  "clear_height": string,    // exact value only when min/max not given
  "keyword": string,        // fallback free text (use when nothing else matches)
  "property_id": string,    // e.g. "AT123R" — set ONLY when text contains AT + digits
  "sort": "price_asc" | "price_desc" | "size_asc" | "size_desc" | "updated_desc" | "created_desc",
  "confidence": number,     // 0-1
  "explanation_th": string  // 1 ประโยค บอกว่าเข้าใจว่าอะไร
}

RULES:
1. "เช่า" → status "For Rent". "ซื้อ/ขาย" → "For Sale". "เช่าหรือซื้อ/เช่าซื้อ" → "For Rent & Sale".
2. "โกดัง" → type "Warehouse". "โรงงาน" → "Factory". "ที่ดิน" → "Land". "ออฟฟิศ/สำนักงาน" → "Office".
3. Location MUST be the English dropdown value exactly (ASCII only — NEVER Thai script in province/district/sub_district). If unsure, omit the field and put the Thai text in keyword instead — EXCEPT rule 4b (vague coastal). Never guess.
4. KNOWN LANDMARKS (use these exact English values):
   - "เมกะบางนา/Mega Bangna/อิเกียบางนา" → province "Samut Prakan", district "Bang Phli", sub_district "Bang Kaeo".
   - "สนามบินสุวรรณภูมิ/Suvarnabhumi Airport" → province "Samut Prakan", district "Bang Phli" (omit sub_district).
   - "นิคมบางปู/Bang Pu Industrial Estate" → province "Samut Prakan", district "Mueang Samut Prakan" (omit sub_district).
   Other landmarks NOT in this list → omit location fields, put the landmark name in keyword. Never guess.
4b. VAGUE COASTAL AREA (single-province default — website ignores keyword, so AI must assign a location):
   - "ใกล้ทะเล/ติดทะเล/ริมทะเล/sea side" → province "Chonburi" ONLY (default: most coastal industrial stock).
   - Set confidence ≤ 0.5, explain the assumption in explanation_th (e.g. "สมมติเป็นชลบุรี — กดเปลี่ยนจังหวัดได้").
   - NEVER put the vague coastal text in keyword (drop it — the listing page does not read keyword).
4c. FEATURES & ZONES (Thai → exact English dropdown value, ASCII only):
   - "มีออฟฟิศ/มีสำนักงาน/ออฟฟิศในตัว" → features ["With Office area"]. ("มี" = the unit HAS an office = feature, NOT type Office.)
   - "ฟรีเทรด/เขตปลอดภาษี/Free Trade" → zone_types ["Free Trade Zone"].
   - "โซนสีม่วง/ผังเมืองสีม่วง/Purple" → zone_types ["Purple Zone"].
   - "นิคมอุตสาหกรรม/Industrial Estate" (generic, NOT a named estate like Bang Pu) → zone_types ["Industrial Estate Zone"].
   Multiple matches → array them (backend AND-logic: unit must have ALL). Captured words NEVER go in keyword.
5. "งบไม่เกิน X / ไม่เกิน X บาท" → price_max. "เริ่ม X / ตั้งแต่ X" → price_min. "เช่าต่อเดือน" = monthly rent → omit price_mode (default).
6. "X ตรม/ตร.ม./sqm" ตัวเดียว → size_min = X*0.8, size_max = X*1.2 (ปัดเป็นจำนวนเต็ม). "400-600 ตรม" → size_min/size_max ตรง ๆ. "มากกว่า/เกิน X ตรม" → size_min = X อย่างเดียว. "ไม่เกิน X ตรม" → size_max = X อย่างเดียว (ห้ามทำ ±20%).
7. price_mode "sqm" ONLY when the text explicitly says per-sqm ("ตรม.ละ/ต่อตรม/per sqm"). "ต่อเดือน" or no unit → omit price_mode entirely. NEVER invent it.
8. keyword holds ONLY leftover text not captured by other filters. NEVER repeat values already in filters (no sizes, prices, or location names in keyword). Vague coastal text from rule 4b is dropped entirely, never in keyword. Feature/zone words captured by rule 4c are dropped too, never in keyword.
8b. CLEAR HEIGHT & FLOOR LOAD:
   - "สูง X-Y เมตร/ม." → min_height = X, max_height = Y. "สูงไม่เกิน X เมตร" → max_height = X only. "สูง X เมตร" (single) → min_height = X.
   - "รับน้ำหนัก X ตัน (ต่อตรม)" → floor_load = X (number only, e.g. 1).
13. sort DEFAULTS to "created_desc" unless the text asks for a specific ordering ("ถูกสุด/ราคาถูก" → price_asc, "แพงสุด" → price_desc, "ใหญ่สุด" → size_desc).
14. ข้อความมี "AT" + ตัวเลข (เช่น AT123R, at 50 s) → ตั้ง property_id เป็นตัวพิมพ์ใหญ่ติดกัน (AT123R, AT50S) และไม่ต้องตั้ง keyword ซ้ำ.
15. ถ้าไม่เข้าใจเลย → {"keyword": "<ข้อความเดิม>", "confidence": 0.1, "explanation_th": "ไม่เข้าใจ ขอค้นแบบคำอิสระ"}.
16. ตัวเลขไทย (๑๒๓) หรือ "แสน/ล้าน" → แปลงเป็น number ก่อน ("2 แสน" → 200000, "1.5 ล้าน" → 1500000).
17. Output must be valid JSON only. No code fence.
```

## 2b. EXAMPLE (landmark)

Input "อยากได้ที่แถวเมกะบางนา ขอมากกว่า 500 ตรม"
→ `{"type":"Warehouse","province":"Samut Prakan","district":"Bang Phli","sub_district":"Bang Kaeo","size_min":500,"confidence":0.85,"explanation_th":"โกดังแถวเมกะบางนา (บางพลี สมุทรปราการ) มากกว่า 500 ตรม."}`

## 3. Post-processing (ทำในโค้ด ห้ามให้ AI ทำ)

1. `JSON.parse` — ถ้า fail → fallback `{ keyword: userText }`
2. ลบ key ที่ไม่อยู่ใน allowlist ทิ้ง (กัน AI แต่ง `remarks/landlord_*` เอง)
2b. `sanitizeLocations` — ถ้า `province/district/sub_district` มีอักษรไทยปนมา ให้ทิ้ง field นั้นแล้วย้ายข้อความไป `keyword` (กัน query ที่การันตี 0 ผลลัพธ์เพราะ location เป็น exact match)
3. ถ้ามี `property_id` เต็ม (`/^AT\d+(R|S|SR)$/i`) → ตั้ง `is_property_id_search=true` (เว็บหลักพาไป detail)
4. สร้าง `redirect_querystring` จาก key ที่เหลือ (ข้าม `confidence/explanation_th`):

```js
function buildQuery(filters) {
  const p = new URLSearchParams();
  for (const k of ["status","type","province","district","sub_district","size_min","size_max","price_min","price_max","price_mode","features","zone_types","min_height","max_height","floor_load","clear_height","keyword","property_id","sort"])
    if (filters[k] !== undefined && filters[k] !== null && filters[k] !== "") {
      const v = filters[k];
      p.set(k, Array.isArray(v) ? v.join(",") : String(v)); // arrays → comma-separated
    }
  return "?" + p.toString();
}
```

## 4. Few-shot examples (ใส่เป็น few-shot หรือเก็บไว้เทส)

| user input | expected JSON |
|------------|---------------|
| อยากได้ที่แถวเมกะบางนา ขอมากกว่า 500 ตรม | `{"type":"Warehouse","province":"Samut Prakan","district":"Bang Phli","sub_district":"Bang Kaeo","size_min":500,"confidence":0.85,"explanation_th":"โกดังแถวเมกะบางนา (บางพลี สมุทรปราการ) มากกว่า 500 ตรม."}` |
| โกดังให้เช่า บางนา 500 ตรม งบไม่เกิน 2 แสน | `{"status":"For Rent","type":"Warehouse","district":"Bang Na","size_min":400,"size_max":600,"price_max":200000,"confidence":0.85,"explanation_th":"โกดังเช่าย่านบางนาขนาด ~500 ตรม. งบไม่เกิน 2 แสน"}` |
| หาโรงงานขาย ชลบุรี 1000 ตรม | `{"status":"For Sale","type":"Factory","province":"Chonburi","size_min":800,"size_max":1200,"confidence":0.8,"explanation_th":"โรงงานขายที่ชลบุรีขนาด ~1000 ตรม."}` |
| AT303R | `{"property_id":"AT303R","confidence":0.99,"explanation_th":"ค้นหารหัสทรัพย์ AT303R โดยตรง"}` |
| ที่ดินบางเสาธง 2 ไร่ | `{"type":"Land","district":"Bang Sao Thong","keyword":"2 ไร่","confidence":0.6,"explanation_th":"ที่ดินย่านบางเสาธง (ขนาดเป็นไร่ เก็บเป็น keyword)"}` |
| โกดัง 3000 บาทต่อตรม | `{"type":"Warehouse","price_max":3000,"price_mode":"sqm","confidence":0.7,"explanation_th":"โกดังราคาไม่เกิน 3000 บาทต่อตรม."}` |
| อยากได้ที่แถวใกล้ทะเล ไม่เกิน 500 ตรม | `{"province":"Chonburi","size_max":500,"confidence":0.5,"explanation_th":"สมมติเป็นชลบุรี (ใกล้ทะเล) ไม่เกิน 500 ตรม. — กดเปลี่ยนจังหวัดได้"}` |
| อยากได้โกดัง มีออฟฟิศ ใกล้นิคมบางปู เช่าต่อเดือนไม่เกินแสน | `{"status":"For Rent","type":"Warehouse","province":"Samut Prakan","district":"Mueang Samut Prakan","price_max":100000,"features":["With Office area"],"sort":"created_desc","confidence":0.85,"explanation_th":"โกดังเช่าใกล้นิคมบางปู มีออฟฟิศ ไม่เกิน 1 แสน/เดือน"}` |
| สวัสดี | `{"keyword":"สวัสดี","confidence":0.1,"explanation_th":"ไม่เข้าใจ ขอค้นแบบคำอิสระ"}` |

## 5. Test checklist ก่อนเอาไปต่อเว็บหลัก

- [ ] พิมพ์ไทยล้วน / อังกฤษล้วน / ผสม ได้ JSON valid ทุกครั้ง
- [ ] คำที่ไม่ใช่ที่อยู่ (เช่น "สวัสดี", "xxx") ตกไป `keyword` ไม่ crash
- [ ] `AT123R` ได้ `property_id` ตัวพิมพ์ใหญ่ ไม่มี `keyword` ซ้ำ
- [ ] "2 แสน" → `200000` (ไม่ใช่ string)
- [ ] ไม่มี `remarks/landlord_name/landlord_contact` หลุดออกมาเด็ดขาด
- [ ] `redirect_querystring` ยิง `GET /api/properties` แล้วได้ `success:true`
