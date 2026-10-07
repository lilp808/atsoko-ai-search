import type { Metadata } from "next";
import { Poppins, Prompt } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-en",
});

const prompt = Prompt({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-th",
});

export const metadata: Metadata = {
  title: "AI Search Demo — Thai Industrial Property",
  description: "พิมพ์ภาษาธรรมชาติ แล้วให้ AI แปลงเป็นฟิลเตอร์ค้นหา",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${poppins.variable} ${prompt.variable}`}>
      <body>{children}</body>
    </html>
  );
}
