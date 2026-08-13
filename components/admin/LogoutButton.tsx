"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="w-full rounded-lg border border-[#2a2f3a] px-3 py-2 text-sm text-[#9aa0a6] hover:bg-[#1d222c]"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      Sair
    </button>
  );
}
