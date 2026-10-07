# AI Search Demo — โหมดค้นหาด้วยภาษาธรรมชาติ

โฟลเดอร์นี้คือ **สเปก + เดโม่ตั้งต้น** สำหรับฟีเจอร์ AI Search ของเว็บหลัก
ยังไม่มีโค้ดรันจริง — มีแค่ Markdown ให้ Agent (หรือคุณ) เอาไปคุยต่อและ implement

## Flow ที่จะทำ

```
[Search bar เว็บหลัก]
   │  user พิมพ์อะไรก็ได้ (ไทย/อังกฤษ) เช่น "โกดังให้เช่า บางนา 500 ตรม งบไม่เกิน 2 แสน"
   ▼
[Typhoon AI analyze]  (ดู AI-PROMPT-CONTRACT.md)
   │  output = JSON filters
   ▼
[Build querystring]  เช่น ?status=For+Rent&type=Warehouse&district=Bang+Na&size_min=400&size_max=600&price_max=200000
   │
   ├──→ redirect ไปหน้า Search Result ของเว็บหลัก (เอา querystring นี้ไปต่อท้าย URL จริง)
   └──→ (optional, ช่วงเดโม่) ยิง GET /api/properties ตรง ๆ เพื่อ preview ผลลัพธ์
```

## ไฟล์ในโฟลเดอร์นี้

| ไฟล์ | ไว้ทำอะไร | ใครอ่าน |
|------|-----------|---------|
| `BACKEND-API-REFERENCE.md` | สเปก API จริงจาก backend (params, ตัวอย่าง curl, response shape) | Agent + คน implement |
| `AI-PROMPT-CONTRACT.md` | system prompt + JSON schema + ตัวอย่าง mapping สำหรับ Typhoon | Agent ที่ทำ AI parse |
| `AGENTS.md` | กฎของโฟลเดอร์นี้ | Agent ทุกตัวที่เข้ามาทำงานที่นี่ |

## วิธีคุยกับ Agent ในโฟลเดอร์นี้ (แนะนำ)

1. สั่งให้อ่าน `AGENTS.md` ก่อนเสมอ
2. แล้วอ่าน `BACKEND-API-REFERENCE.md` + `AI-PROMPT-CONTRACT.md`
3. จากนั้นค่อยสั่งงาน เช่น:
   - "สร้างหน้า search bar plain HTML+JS ตามสเปกนี้"
   - "เพิ่ม few-shot ภาษาไทยอีก 5 เคส"
   - "ต่อ redirect ไป URL จริงของเว็บหลัก"

## สถานะปัจจุบัน

- [x] สเปก backend (อ้างอิงโค้ดจริง `backend-api-vps/routes/properties.js`, `routes/options.js`)
- [x] prompt contract สำหรับ Typhoon `typhoon-v2.5-30b-a3b-instruct`
- [ ] URL จริงของหน้า Search Result เว็บหลัก (ตอนนี้ใช้ querystring กลาง ๆ ไปก่อน)
- [ ] โค้ดเดโม่ (HTML/Next — มาทำตอนคุยกับ Agent รอบหน้า)
