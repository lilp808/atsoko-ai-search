"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={logout}
      title="ออกจากระบบ"
      style={{
        position: "fixed",
        right: 14,
        bottom: 14,
        zIndex: 50,
        padding: "8px 14px",
        borderRadius: 999,
        border: "1px solid #e2e8f0",
        background: "rgba(255,255,255,.92)",
        color: "#475569",
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      ออกจากระบบ
    </button>
  );
}
