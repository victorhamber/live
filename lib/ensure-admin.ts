import bcrypt from "bcryptjs";
import { db } from "./db";

export async function ensureAdmin() {
  try {
    const email = (process.env.ADMIN_EMAIL || "admin@local.test").trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "admin123";
    const existing = await db.adminUser.findUnique({ where: { email } });
    if (existing) return;
    const any = await db.adminUser.count();
    if (any > 0) return;
    await db.adminUser.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 10),
      },
    });
  } catch {
    // Durante o build o banco ainda não existe; o entrypoint cria as tabelas no deploy.
  }
}
