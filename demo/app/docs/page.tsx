import Link from "next/link";

const DOCS = [
  {
    href: "/docs/AI-PROMPT-CONTRACT.md",
    title: "AI Prompt Contract",
    desc: "System prompt + JSON schema + few-shot สำหรับ Typhoon (ตัวเดียวกับที่ /api/ai-search ใช้)",
  },
  {
    href: "/docs/BACKEND-API-REFERENCE.md",
    title: "Backend API Reference",
    desc: "สเปก GET /api/properties, options, redirect contract — อ้างอิงโค้ด backend จริง",
  },
];

export const metadata = {
  title: "Docs — AI Search Demo",
  description: "Prompt contract และ API reference ของเดโม่ AI Search",
};

export default function DocsPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 20px", fontFamily: "var(--font-th), sans-serif" }}>
      <p>
        <Link href="/">← กลับหน้าเดโม่</Link>
      </p>
      <h1>Docs — AI Search Demo</h1>
      <p style={{ color: "#64748b" }}>
        ไฟล์สเปกเดียวกับใน repo (single source) — เปลี่ยน env อย่างเดียวพอ ไม่ต้องแก้โค้ด
      </p>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 16 }}>
        {DOCS.map((d) => (
          <li key={d.href} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
            <h2 style={{ margin: "0 0 8px" }}>
              <a href={d.href} target="_blank" rel="noreferrer">
                {d.title}
              </a>
            </h2>
            <p style={{ margin: 0, color: "#475569" }}>{d.desc}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
