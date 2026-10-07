"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import HeroPillSearch from "@/components/HeroPillSearch";
import LangDropdown from "@/components/LangDropdown";
import ResultLogs, { type AiResult } from "@/app/ai-home/components/ResultLogs";
import "./public-home.css";
import "./ai-home/qs-exact.css";

type Lang = "th" | "en";

const LISTING_BASE =
  process.env.NEXT_PUBLIC_SITE_LISTING_BASE ?? "https://www.thaiindustrialproperty.com/th/listing";
const SITE = "https://www.thaiindustrialproperty.com";
const LOGO = `${SITE}/images/logo.png`;
const HERO_BG = `${SITE}/assets/slide/parallax.webp`;
const HERO_BG_MOBILE = `${SITE}/assets/slide/mobile_parallax.webp`;
const WHY_IMG = `${SITE}/assets/why_choose_us/1.webp`;

const STR: Record<Lang, {
  nav: { label: string; href: string; children?: { label: string; href: string }[] }[];
  heroTitle1: string;
  heroTitle2: string;
  heroSub: string;
  aiExamples: string[];
  notifier: string;
  advanced: string;
  scrollDown: string;
  stepsTitle: string;
  steps: { title: string; desc: string; icon: string }[];
  whyKicker: string;
  whyTitle: string;
  whyDesc: string;
  whyCards: { title: string; desc: string; icon: string }[];
  certKicker: string;
  certTitle: string;
  certs: { title: string; desc: string; img: string }[];
  backTop: string;
  footerProps: string;
  footerCompany: string;
  footerContact: string;
  demoNote: string;
}> = {
  th: {
    nav: [
      { label: "โกดัง", href: `${SITE}/th/listing?type=warehouse` },
      { label: "โรงงาน", href: `${SITE}/th/listing?type=factory` },
      { label: "โชว์รูม และ อาคารพาณิชย์", href: `${SITE}/th/listing?type=showroom%20%26%20commercial` },
      { label: "บทความ", href: `${SITE}/th/guides` },
      { label: "คำถามที่พบบ่อย", href: `${SITE}/th/faq` },
      { label: "ติดต่อ", href: `${SITE}/th/contact` },
      { label: "เกี่ยวกับเรา", href: `${SITE}/th/about-us` },
    ],
    heroTitle1: "ค้นหาโกดังที่เหมาะกับคุณ",
    heroTitle2: "หรือโรงงานทั่วประเทศไทย",
    heroSub: "เราเชื่อมต่อนักลงทุนต่างชาติกับตลาดอสังหาริมทรัพย์อุตสาหกรรมไทยมาตั้งแต่ปี 2019",
    aiExamples: [
      "อยากได้ที่แถวเมกะบางนา ขอมากกว่า 500 ตรม",
      "โกดังให้เช่า บางนา 500 ตรม งบไม่เกิน 2 แสน",
      "หาโรงงานขาย ชลบุรี 1000 ตรม",
      "AT303R",
    ],
    notifier: "ต้องการตัวเลือกการค้นหาเพิ่มเติม?",
    advanced: "ค้นหาแบบละเอียด",
    scrollDown: "สำรวจอสังหาริมทรัพย์อุตสาหกรรม",
    stepsTitle: "ค้นหาสังหาใน 4 ขั้นตอนง่ายๆ",
    steps: [
      { title: "บอกความต้องการของคุณ", desc: "แจ้งพื้นที่ที่ต้องการ ขนาด และงบประมาณ แล้วเราจะช่วยจัดการต่อให้", icon: "fa-light fa-comments" },
      { title: "รับรายการที่ตรงเงื่อนไข", desc: "ทีมผู้เชี่ยวชาญจะคัดทรัพย์ที่เหมาะสมและส่งตัวเลือกที่ตรงกับความต้องการของคุณ", icon: "fa-light fa-clipboard-list-check" },
      { title: "นัดเข้าชมสถานที่", desc: "เราตรวจสอบความพร้อมและประสานนัดหมายกับเจ้าของทรัพย์ให้ครบถ้วน", icon: "fa-light fa-calendar-check" },
      { title: "ปิดดีลอย่างมั่นใจ", desc: "คุณเลือกทรัพย์ที่ดีที่สุด แล้วให้เราดูแลการเจรจาและเอกสารทั้งหมด", icon: "fa-light fa-handshake" },
    ],
    whyKicker: "ทำไมต้องเลือกเรา",
    whyTitle: "เหตุผลที่ลูกค้าเลือกเรา",
    whyDesc: "เราได้รับความไว้วางใจจากทั้งนักลงทุนต่างชาติและเจ้าของทรัพย์ไทย ด้วยความเชี่ยวชาญ ความโปร่งใส และเทคโนโลยีที่ช่วยให้ทุกดีลเดินหน้าได้จริง",
    whyCards: [
      { title: "จดทะเบียนถูกต้องและได้รับการรับรอง", desc: "บริษัทจดทะเบียนกับ DBD อย่างถูกต้อง มีนายหน้าที่ผ่านการรับรอง และเป็นสมาชิก TREBA พร้อมประสบการณ์จริงในดีลอุตสาหกรรม", icon: "fa-light fa-building-columns" },
      { title: "รองรับหลายภาษา", desc: "เราสื่อสารได้ทั้งจีน อังกฤษ และไทย เพื่อลดช่องว่างด้านภาษาและวัฒนธรรมระหว่างเจ้าของทรัพย์กับผู้เช่าหรือผู้ซื้อต่างชาติ", icon: "fa-light fa-language" },
      { title: "เข้าใจทั้งสองฝั่ง", desc: "เราเข้าใจมุมมองของทั้งเจ้าของทรัพย์และผู้เช่า จึงเจรจาได้อย่างเป็นธรรมและเกิดประโยชน์ร่วมกัน", icon: "fa-light fa-scale-balanced" },
      { title: "ประกาศทรัพย์ใช้งานจริงกว่า 2,000 รายการ", desc: "ร่วมงานกับดีเวลลอปเปอร์และเจ้าของทรัพย์ชั้นนำของไทย พร้อมพอร์ตทรัพย์อุตสาหกรรมขนาดใหญ่ที่เชื่อถือได้", icon: "fa-light fa-buildings" },
      { title: "ราคาโปร่งใส", desc: "ไม่มีการบวกราคาเหนือเรทเจ้าของทรัพย์ เพื่อสร้างความเชื่อมั่นให้ผู้เช่าและผู้ซื้อที่จริงจัง", icon: "fa-light fa-badge-check" },
      { title: "ขับเคลื่อนด้วยเทคโนโลยี", desc: "ระบบอัตโนมัติและเครื่องมือ AI ช่วยให้บริการได้รวดเร็ว แม่นยำ และตอบโจทย์ได้ตรงขึ้น", icon: "fa-light fa-microchip-ai" },
    ],
    certKicker: "ความน่าเชื่อถือและการยืนยัน",
    certTitle: "ใบรับรองและการกำกับดูแล",
    certs: [
      { title: "สมาชิกสมาคมนายหน้าอสังหาริมทรัพย์ไทย", desc: "เป็นสมาชิกวิชาชีพและมีความเกี่ยวข้องกับภาคอุตสาหกรรมอย่างต่อเนื่อง", img: `${SITE}/assets/logo_partners/1.webp` },
      { title: "จดทะเบียนกับกรมพัฒนาธุรกิจการค้า", desc: "บริษัทจดทะเบียนถูกต้องตามกฎหมายกับกรมพัฒนาธุรกิจการค้า", img: `${SITE}/assets/logo_partners/2.webp` },
      { title: "ผ่านการอบรมและรับรองจากโรงเรียนธุรกิจอสังหาริมทรัพย์ไทย", desc: "ผ่านหลักสูตรอบรมและการรับรองด้านอสังหาริมทรัพย์อย่างเป็นทางการ", img: `${SITE}/assets/logo_partners/3.webp` },
    ],
    backTop: "กลับขึ้นด้านบน",
    footerProps: "อสังหาริมทรัพย์",
    footerCompany: "บริษัท",
    footerContact: "ข้อมูลติดต่อ",
    demoNote: "AI Search demo — โคลน UX เว็บจริง",
  },
  en: {
    nav: [
      { label: "Warehouse", href: `${SITE}/en/listing?type=warehouse` },
      { label: "Factory", href: `${SITE}/en/listing?type=factory` },
      { label: "Showroom & Commercial", href: `${SITE}/en/listing?type=showroom%20%26%20commercial` },
      { label: "Guides", href: `${SITE}/en/guides` },
      { label: "FAQ", href: `${SITE}/en/faq` },
      { label: "Contact", href: `${SITE}/en/contact` },
      { label: "About us", href: `${SITE}/en/about-us` },
    ],
    heroTitle1: "Find the right warehouse",
    heroTitle2: "or factory across Thailand",
    heroSub: "Connecting foreign investors with Thailand's industrial property market since 2019",
    aiExamples: [
      "Warehouse for rent near Bang Na, 500 sqm, max 200,000",
      "Factory for sale in Chonburi, 1000 sqm",
      "Land over 1000 sqm in Samut Prakan",
      "AT303R",
    ],
    notifier: "Need more search options?",
    advanced: "Advanced search",
    scrollDown: "Explore industrial properties",
    stepsTitle: "Find property in 4 easy steps",
    steps: [
      { title: "Tell us your needs", desc: "Share your area, size and budget — we handle the rest", icon: "fa-light fa-comments" },
      { title: "Get matching listings", desc: "Our experts shortlist the options that fit your requirements", icon: "fa-light fa-clipboard-list-check" },
      { title: "Visit the site", desc: "We check availability and arrange viewings with owners", icon: "fa-light fa-calendar-check" },
      { title: "Close with confidence", desc: "Pick the best property — we handle negotiation and paperwork", icon: "fa-light fa-handshake" },
    ],
    whyKicker: "Why choose us",
    whyTitle: "Why clients choose us",
    whyDesc: "Trusted by foreign investors and Thai owners alike — expertise, transparency and tech that move every deal forward.",
    whyCards: [
      { title: "Licensed & certified", desc: "Registered with the DBD, certified agents and TREBA member with real industrial deal experience", icon: "fa-light fa-building-columns" },
      { title: "Multilingual", desc: "We speak Chinese, English and Thai to bridge owners and foreign tenants/buyers", icon: "fa-light fa-language" },
      { title: "Both sides understood", desc: "We see the owner's and tenant's view, so negotiations stay fair", icon: "fa-light fa-scale-balanced" },
      { title: "2,000+ live listings", desc: "Working with top Thai developers and owners with a large trusted industrial portfolio", icon: "fa-light fa-buildings" },
      { title: "Transparent pricing", desc: "No markups over owner rates — confidence for serious tenants and buyers", icon: "fa-light fa-badge-check" },
      { title: "Tech-driven", desc: "Automation and AI tools for faster, more accurate matching", icon: "fa-light fa-microchip-ai" },
    ],
    certKicker: "Trust & verification",
    certTitle: "Certifications & governance",
    certs: [
      { title: "Thai Real Estate Broker Association member", desc: "Professional member with ongoing industry involvement", img: `${SITE}/assets/logo_partners/1.webp` },
      { title: "Registered with the DBD", desc: "Legally registered with the Department of Business Development", img: `${SITE}/assets/logo_partners/2.webp` },
      { title: "Trained & certified by TREBS", desc: "Completed official real-estate training and certification", img: `${SITE}/assets/logo_partners/3.webp` },
    ],
    backTop: "Back to top",
    footerProps: "Properties",
    footerCompany: "Company",
    footerContact: "Contact",
    demoNote: "AI Search demo — real-site UX clone",
  },
};

export default function Page() {
  const [lang, setLang] = useState<Lang>("th");
  const [menuOpen, setMenuOpen] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [aiText, setAiText] = useState(STR.th.aiExamples[1]);
  const [aiFill, setAiFill] = useState<{ n: number; filters: Record<string, unknown> } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [popupOpen, setPopupOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const t = STR[lang];

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  useEffect(() => {
    if (!popupOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPopupOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [popupOpen]);

  function switchLang(l: Lang) {
    setLang(l);
    setAiText(STR[l].aiExamples[1]);
  }

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
      // เติมผล AI กลับลงฟิลเตอร์จริง (เหมือน /ai-home) แล้วเปิด logs + นับถอยหลังไป listing
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

  return (
    <div className="ph-page">
      {/* Font Awesome — same icon font as the public website */}
      <link rel="stylesheet" href="/qs-assets/css/plugins-async.css" />

      <header className="ph-header">
        <div className="ph-header-inner">
          <a className="ph-logo" href={`${SITE}/${lang}`} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="Thai Industrial Property" width={180} height={45} />
          </a>
          <div className="ph-divider" />
          <nav className="ph-nav" aria-label="main">
            <ul>
              {t.nav.map((n) => (
                <li key={n.label}>
                  <a href={n.href} target="_blank" rel="noreferrer">{n.label}</a>
                </li>
              ))}
            </ul>
          </nav>
          <LangDropdown lang={lang} onChange={switchLang} />
          <button className="ph-burger" onClick={() => setMenuOpen((v) => !v)} aria-label="menu">
            <i className="fa-solid fa-bars" />
          </button>
        </div>
        {menuOpen && (
          <nav className="ph-nav" aria-label="mobile" style={{ padding: "0 20px 14px" }}>
            <ul style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
              {t.nav.map((n) => (
                <li key={n.label}>
                  <a href={n.href} target="_blank" rel="noreferrer">{n.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <section className="ph-hero">
        <div className="ph-hero-bg" aria-hidden="true">
          <picture>
            <source media="(max-width: 767px)" srcSet={HERO_BG_MOBILE} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={HERO_BG} alt="" loading="eager" fetchPriority="high" />
          </picture>
        </div>

        <div className="ph-hero-inner">
          <h2 className="ph-hero-title">
            {t.heroTitle1} {t.heroTitle2}
          </h2>
          <p className="ph-hero-sub">{t.heroSub}</p>

          <HeroPillSearch
            lang={lang}
            aiMode={aiMode}
            setAiMode={setAiMode}
            aiText={aiText}
            setAiText={setAiText}
            aiLoading={loading}
            onAskAi={askAi}
            aiExplanation={result?.explanation_th}
            aiError={error || undefined}
            aiExamples={t.aiExamples}
            aiFill={aiFill}
            onNavigate={(qs) => openListing(`${LISTING_BASE}${qs ? `?${qs}` : ""}`)}
          />

          <p className="ph-notifier">
            {t.notifier}{" "}
            <button type="button" onClick={() => setAiMode(false)}>{t.advanced}</button>
          </p>
          <div className="ph-scrolldown">
            <span><i className="ph-mouse" /> {t.scrollDown}</span>
          </div>
        </div>
      </section>

      <section className="ph-section">
        <div className="ph-container">
          <div className="ph-section-title"><h2>{t.stepsTitle}</h2></div>
          <div className="ph-steps">
            {t.steps.map((s, i) => (
              <div key={s.title} className="ph-step-card">
                <div className="ph-step-num">{i + 1}</div>
                <div className="ph-step-icon"><i className={s.icon} /></div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ph-section ph-why">
        <div className="ph-container">
          <div className="ph-why-top">
            <div className="ph-why-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={WHY_IMG} alt="AT Soko Team" loading="lazy" />
            </div>
            <div>
              <div className="ph-section-title" style={{ textAlign: "left", marginBottom: 0 }}>
                <p className="kicker" style={{ textAlign: "left" }}>{t.whyKicker}</p>
                <h2 style={{ textAlign: "left" }}>{t.whyTitle}</h2>
              </div>
              <p style={{ color: "#64748b", lineHeight: 1.6 }}>{t.whyDesc}</p>
            </div>
          </div>
          <div className="ph-why-grid">
            {t.whyCards.map((c) => (
              <div key={c.title} className="ph-why-card">
                <div className="ph-why-ic"><i className={c.icon} /></div>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ph-section">
        <div className="ph-container">
          <div className="ph-section-title">
            <p className="kicker">{t.certKicker}</p>
            <h2>{t.certTitle}</h2>
          </div>
          <div className="ph-certs-grid">
            {t.certs.map((c) => (
              <div key={c.title} className="ph-cert">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.img} alt="" loading="lazy" />
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="ph-totop-row">
        <button className="ph-totop" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          {t.backTop} <i className="fa-solid fa-arrow-up" />
        </button>
      </div>

      <footer className="ph-footer">
        <div className="ph-footer-inner">
          <div className="ph-footer-grid">
            <div>
              <h4>{t.footerProps}</h4>
              <ul>
                <li><Link href="/ai-home">AI Search demo (/ai-home)</Link></li>
                <li><Link href="/docs">Prompt + API docs (/docs)</Link></li>
                <li><a href={`${SITE}/${lang}/listing?type=warehouse&status=rent`} target="_blank" rel="noreferrer">{lang === "th" ? "โกดังให้เช่า" : "Warehouses for rent"}</a></li>
                <li><a href={`${SITE}/${lang}/listing?type=factory&status=sale`} target="_blank" rel="noreferrer">{lang === "th" ? "โรงงานขาย" : "Factories for sale"}</a></li>
              </ul>
            </div>
            <div>
              <h4>{t.footerCompany}</h4>
              <ul>
                {t.nav.slice(3).map((n) => (
                  <li key={n.label}><a href={n.href} target="_blank" rel="noreferrer">{n.label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4>{t.footerContact}</h4>
              <div className="ph-contact-list">
                <div><span className="lbl">Email:</span><a href="mailto:atsokoproperty.sales@gmail.com">atsokoproperty.sales@gmail.com</a></div>
                <div><span className="lbl">{lang === "th" ? "โทร" : "Tel"}:</span><a href="tel:+66808304005">+66 80-830-4005</a> (English / ไทย) | <a href="tel:+66902174005">+66 90-217-4005</a> (中文)</div>
              </div>
            </div>
          </div>
          <div className="ph-footer-bottom">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="AT Soko logo" width={160} height={40} />
            <span className="ph-copy">© 2026 AT Soko Property Co. Ltd.</span>
            <span className="ph-demo-note">{t.demoNote} · <Link href="/ai-home">/ai-home</Link></span>
          </div>
        </div>
      </footer>

      <ResultLogs
        lang={lang}
        result={result}
        popupOpen={popupOpen}
        setPopupOpen={setPopupOpen}
        countdown={countdown}
        onCancel={cancelRedirect}
        onGoNow={() => result && openListing(result.redirectUrl)}
      />
    </div>
  );
}
