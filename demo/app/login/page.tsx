"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!password) return;
    setLoading(true);
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { error?: string; detail?: string } | null;
        if (r.status === 500) throw new Error(j?.detail ?? "เซิร์ฟเวอร์ยังไม่ได้ตั้ง DEMO_PASSWORD");
        throw new Error("รหัสผ่านไม่ถูกต้อง");
      }
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: "var(--font-th), sans-serif",
        background: "#f8fafc",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: 360,
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          padding: 28,
        }}
      >
        <h1 style={{ margin: "0 0 4px", fontSize: 20 }}>AI Search Demo</h1>
        <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 14 }}>ใส่รหัสผ่านเพื่อเข้าเดโม่</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="รหัสผ่าน"
          autoFocus
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            fontSize: 15,
          }}
        />
        {error && <p style={{ color: "#dc2626", fontSize: 13, margin: "10px 0 0" }}>{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          style={{
            width: "100%",
            marginTop: 14,
            padding: "10px 12px",
            borderRadius: 8,
            border: "none",
            background: loading || !password ? "#94a3b8" : "#0f172a",
            color: "#fff",
            fontSize: 15,
            cursor: loading || !password ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "กำลังเข้า…" : "เข้าสู่เดโม่"}
        </button>
      </form>
    </main>
  );
}
