# Backend API Reference — สำหรับ AI Search Demo

> อ้างอิงโค้ดจริง ณ 2026-09-14:
> - `backend-api-vps/routes/properties.js` (บรรทัด ~1091–2036 = `GET /`)
> - `backend-api-vps/routes/properties.js` (บรรทัด ~448 = `/suggestions`, ~680 = `/autocomplete`)
> - `backend-api-vps/routes/options.js` (dropdown ทั้งหมด)
> - `backend-api-vps/server.js` (mount path + port)
>
> ถ้าโค้ดเปลี่ยน ให้ยึดโค้ดเป็นหลัก ไม่ยึดไฟล์นี้

## 1. Base URL

| env | URL |
|-----|-----|
| Production (เว็บหลักเรียกอันนี้) | `https://api.thaiindustrialproperty.com` |
| Local dev | `http://127.0.0.1:3000` |

ที่มา: `dashboard-admin-panel/src/lib/api.js:22` (`NEXT_PUBLIC_API_URL` fallback คือ prod URL),
`backend-api-vps/server.js:18-19` (`PORT`/`HOST`)

## 2. Endpoint หลัก: `GET /api/properties`

ไม่ต้องใช้ token สำหรับเดโม่ (guest) — จะเห็นเฉพาะ `publication_status = 'published'`
และถูกตัด secret fields (`landlord_name`, `landlord_contact`, `remarks` บางส่วน) ออกอัตโนมัติ
ที่มา: `properties.js:1199-1202`, `properties.js:1983-1984`

### 2.1 Query params ทั้งหมด

| param | ตัวอย่าง | หมายเหตุ (จากโค้ด) |
|-------|---------|---------------------|
| `keyword` | `?keyword=โกดังบางนา` | fuzzy search: full-text + trigram + ILIKE ครอบ `property_id, title, title_th/en/zh, remarks` (`properties.js:1282-1411`) |
| `property_id` | `?property_id=AT123` | partial match `ILIKE %..%` (`properties.js:1419-1426`) |
| `status` | `?status=For Rent` | `ILIKE %..%`, normalize `for-rent → For Rent`, `for-sale → For Sale` (`properties.js:138-150, 1504-1512`) |
| `type` | `?type=Warehouse` | **พิเศษ:** `warehouse` = `Warehouse OR Factory` (`properties.js:1516-1522`) |
| `province` | `?province=Samut Prakan` | exact match case-insensitive, รองรับ comma multi-select (`properties.js:1533-1556`) |
| `district` | `?district=Bang Na` | เหมือน province (`properties.js:1558-1581`) |
| `sub_district` | `?sub_district=Bang Kaeo` | เหมือน province (`properties.js:1583-1606`) |
| `size_min` / `size_max` | `?size_min=400&size_max=600` | ตรม., `>=` / `<=` (`properties.js:1608-1626`) |
| `price_min` / `price_max` | `?price_max=200000` | ดูข้อ 2.3 เรื่องเลือก price field + sqm |
| `price_mode` | `?price_mode=sqm` | `month` (default) หรือ `sqm` (หารด้วย size) (`properties.js:1631`) |
| `features` | `?features=["Office","Dock Leveler"]` | JSON array หรือ comma-separated, ต้องมีครบทุกตัว (`@>` operator) (`properties.js:1667-1678`) |
| `feature` | `?feature=Office` | single ILIKE, ใช้เมื่อไม่มี `features` (`properties.js:1700-1708`) |
| `labels` / `zone_type` / `zone_types` | `?zone_type=Industrial` | alias กันหมด, AND logic ต้องมีครบทุก zone (`properties.js:1680-1698`) |
| `min_height` / `max_height` | `?min_height=6` | ดึงตัวเลขจาก string เช่น `"6m"` (`properties.js:1710-1729`) |
| `clear_height` | `?clear_height=6m` | exact ILIKE, ใช้เมื่อไม่มี min/max (`properties.js:1731-1739`) |
| `floor_load` | `?floor_load=3` | `>=` หลังดึงตัวเลขจาก string เช่น `"3 Ton/sqm"` (`properties.js:1741-1752`) |
| `sort` / `order` | `?sort=price_asc` | ดูข้อ 2.5 |
| `page` / `limit` | `?page=1&limit=20` | `limit` 1–1000, `limit=0` หรือไม่ส่ง = เอาทั้งหมด (`properties.js:1169-1174`) |
| `lang` | `?lang=th` | `en/th/zh`, มีผลกับ `title` ที่ decorate กลับมา (`properties.js:261-300`) |
| `remarks`, `landlord_name`, `landlord_contact` | — | **ต้อง login เท่านั้น** (guest เรียกจะโดน 401) — เดโม่ public **ห้ามใช้** (`properties.js:1428-1501`) |

### 2.2 Property ID format `AT[number][S|R|SR]`

- `S` = sale, `R` = rent, `SR` = ทั้งคู่ (ที่มา: `dashboard-admin-panel/AGENTS.md`)
- ใส่ `keyword=AT123R` (ครบ suffix) → **exact match ตัวเดียว** ควร redirect ไปหน้า detail (`properties.js:1257-1269`)
- ใส่ `keyword=AT123` (ไม่มี suffix) → **prefix match** `AT123%` ได้ AT123R/S/SR (`properties.js:1270-1281`)
- ใส่หลายตัว `keyword=at1s, at2r` → `IN (...)` exact (`properties.js:1235-1248`)

### 2.3 Price field logic (สำคัญ!)

```js
// properties.js:1630
const priceField = status && status.toLowerCase().includes('sale') ? 'price_alternative' : 'price';
```

- `status` มีคำว่า sale → filter/เรียงด้วย `price_alternative` (ราคาขาย)
- อย่างอื่น → ใช้ `price` (ราคาเช่า/เดือน)
- `price_mode=sqm` → เปรียบเทียบ `(priceField / size)` และบังคับ `size > 0` (`properties.js:1634-1637`)

### 2.4 Location = exact match (ไม่ใช่ LIKE)

`LOWER(TRIM(province)) = LOWER(TRIM($1))` — สะกดต้องตรงกับค่าใน DB
ดังนั้น AI ควรส่งค่าอังกฤษตาม dropdown (ดูข้อ 3) ไม่ใช่คำไทยดิบ ๆ
ถ้ามีหลายค่า: `?province=Samut Prakan,Chonburi` (comma-separated → OR)

### 2.5 Sort

- แบบรวม (แนะนำ): `?sort=price_asc`, `price_desc`, `size_asc`, `size_desc`, `updated_desc`, `created_desc`, `published_desc`, `id_desc`
- แบบแยก (legacy): `?sort=price&order=asc`
- field ที่อนุญาต: `created_at, updated_at, published_at, price, size, id` นอกนั้น fallback `updated_at DESC` (`properties.js:1860-1863`)
- ถ้ามี `keyword` และไม่ระบุ sort → เรียง relevance ก่อน (`properties.js:1886-1893`)

### 2.6 Response shape

```json
{
  "success": true,
  "data": [ { "id": 1, "property_id": "AT123R", "title": "...", "type": "Warehouse", "status": "For Rent", "province": "Samut Prakan", "district": "Bang Sao Thong", "size": 500, "price": 150000, "price_alternative": null, "slug": "..." } ],
  "pagination": { "page": 1, "limit": 20, "total": 132, "pages": 7 },
  "filters": { "keyword": null, "status": "For Rent", "...": "..." },
  "sorting": { "sort": "updated_at", "order": "DESC" },
  "meta": { "is_exact_property_id_search": false },
  "language": "th"
}
```

### 2.7 ตัวอย่าง curl (เดโม่ยิงได้เลย ไม่ต้องมี token)

```bash
# โกดังให้เช่า บางเสาธง 400-600 ตรม. ไม่เกิน 2 แสน เรียงราคาถูกก่อน
curl "https://api.thaiindustrialproperty.com/api/properties?status=For%20Rent&type=Warehouse&district=Bang%20Sao%20Thong&size_min=400&size_max=600&price_max=200000&sort=price_asc&limit=20"

# หา property ID ตรง ๆ
curl "https://api.thaiindustrialproperty.com/api/properties?keyword=AT123R"

# คำค้นทั่วไป (fuzzy)
curl "https://api.thaiindustrialproperty.com/api/properties?keyword=%E0%B9%82%E0%B8%81%E0%B8%94%E0%B8%B1%E0%B8%87%E0%B8%9A%E0%B8%B2%E0%B8%87%E0%B8%99%E0%B8%B2&limit=10"
```

## 3. Options endpoints (เอาไว้เติม dropdown + validate ค่าให้ AI)

| endpoint | ใช้ทำอะไร |
|----------|-----------|
| `GET /api/options/all` | **แนะนำ:** ได้ types, statuses, features, zone_types, electricity, provinces, teams ในคำขอเดียว (`options.js:640`) |
| `GET /api/options/types` | ค่า `type` ที่ถูกต้อง |
| `GET /api/options/statuses` | ค่า `status` ที่ถูกต้อง |
| `GET /api/options/provinces` | ค่า `province` ที่ถูกต้อง (เฉพาะ published) |
| `GET /api/options/districts?province=Samut Prakan` | districts ของจังหวัดนั้น |
| `GET /api/options/subdistricts?province=Samut Prakan&district=Bang Sao Thong` | subdistricts |
| `GET /api/options/features` | ค่า `features` ที่ถูกต้อง |
| `GET /api/options/zone-types` | ค่า `zone_type` ที่ถูกต้อง |

response ทุกตัวทรงเดียวกัน: `{ "success": true, "data": [ { "id": 1, "name_en": "...", "name_th": "...", "name_zh": "..." } ] }`

## 4. Suggest endpoints (เอาไว้ทำ search-as-you-type ในเดโม่ ถ้าต้องการ)

- `GET /api/properties/suggestions?q=บางนา&limit=8` — ต้อง `q` ยาว ≥ 2 ตัวอักษร, รับ `status/type/province/district/sub_district` เป็น context filter (`properties.js:448-675`)
- `GET /api/properties/autocomplete?q=bang&limit=10` — starts-with match ล้วน (ไม่มี landlord/remarks สำหรับ guest) (`properties.js:680-1087`)

## 5. Redirect contract ไปเว็บหลัก (ตกลงกันไว้: ส่ง querystring กลาง ๆ)

AI output สุดท้ายต้องมี `redirect_querystring` ที่ประกอบจาก filters ที่มั่นใจเท่านั้น:

```
?status=For+Rent&type=Warehouse&district=Bang+Sao+Thong&size_min=400&size_max=600&price_max=200000&sort=price_asc
```

- เว็บหลักเอา querystring นี้ไปต่อท้าย Search Result URL จริง แล้วให้หน้านั้นยิง `GET /api/properties` ตามข้อ 2
- ถ้า AI เจอ property ID เต็ม (`AT\d+[SR]{1,2}`) ให้ตั้ง flag `is_property_id_search=true` — เว็บหลักควรพาไปหน้า detail แทนหน้าผลลัพธ์ (เพราะ backend จะคืนแค่ 1 ตัว)
- ห้ามใส่ `remarks/landlord_name/landlord_contact` ใน querystring public เด็ดขาด (ต้อง login)
