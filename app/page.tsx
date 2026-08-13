import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const admin = await getAdmin();
  redirect(admin ? "/admin" : "/login");
}
