import { Suspense } from "react";
import "../globals.css";

export const dynamic = "force-dynamic";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<main className="min-h-screen grid place-items-center">Carregando...</main>}>
      {children}
    </Suspense>
  );
}
