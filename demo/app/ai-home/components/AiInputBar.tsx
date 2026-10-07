"use client";

import { SparklesIcon } from "@/app/components/icons";

type Props = {
  lang: "th" | "en";
  value: string;
  onChange: (v: string) => void;
  loading: boolean;
  onAsk: () => void;
};

const EXAMPLES: Record<"th" | "en", string[]> = {
  th: [
    "อยากได้ที่แถวเมกะบางนา ขอมากกว่า 500 ตรม",
    "โกดังให้เช่า บางนา 500 ตรม งบไม่เกิน 2 แสน",
    "หาโรงงานขาย ชลบุรี 1000 ตรม",
    "AT303R",
  ],
  en: [
    "Warehouse for rent near Bang Na, 500 sqm, max 200,000",
    "Factory for sale in Chonburi, 1000 sqm",
    "Land over 1000 sqm in Samut Prakan",
    "AT303R",
  ],
};

export default function AiInputBar({ lang, value, onChange, loading, onAsk }: Props) {
  return (
    <div>
      <div className="searchbar">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onAsk();
          }}
          placeholder={lang === "th" ? "โกดังให้เช่า แถวบางนา 500 ตรม…" : "Warehouse for rent near Bang Na, 500 sqm…"}
        />
        <button className="btn-ask" onClick={onAsk} disabled={loading}>
          <SparklesIcon /> {loading ? (lang === "th" ? "AI กำลังวิเคราะห์…" : "AI is analyzing…") : lang === "th" ? "ถาม AI" : "Ask AI"}
        </button>
      </div>
      <div className="examples">
        {EXAMPLES[lang].map((ex) => (
          <button key={ex} type="button" className="ex-chip" onClick={() => onChange(ex)}>
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
