import { Suspense } from "react";
import { ensureAdmin } from "@/lib/ensure-admin";
import "../globals.css";

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  await ensureAdmin();
  return (
    <Suspense fallback={<main className="min-h-screen grid place-items-center">Carregando...</main>}>
      {children}
    </Suspense>
  );
}
