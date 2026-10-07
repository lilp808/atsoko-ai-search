import type { Metadata } from "next";
import { Poppins, Prompt } from "next/font/google";
import { cookies } from "next/headers";
import LogoutButton from "@/components/LogoutButton";
import { AUTH_COOKIE, isValidAuthCookie } from "@/lib/auth";
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const authed = await isValidAuthCookie(
    cookies().get(AUTH_COOKIE)?.value,
    process.env.DEMO_PASSWORD,
  );
  return (
    <html lang="th" className={`${poppins.variable} ${prompt.variable}`}>
      <body>
        {children}
        {authed && <LogoutButton />}
      </body>
    </html>
  );
}
