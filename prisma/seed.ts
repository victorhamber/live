import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@local.test").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(password, 10);

  await db.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  const existing = await db.page.findUnique({ where: { slug: "trend-ao-vivo" } });
  if (!existing) {
    await db.page.create({
      data: {
        slug: "trend-ao-vivo",
        title: "Sistema Trend Ao Vivo",
        status: "published",
        mode: "simulation",
        videoTitle: "Está liberado: Sistema Trend para operar com automação no mercado financeiro",
        channelName: "Victor Hamber · AutoFintech",
        channelHandle: "Sistema de automação financeira",
        channelAvatar: "AT",
        brandName: "AutoFintech",
        vturbPlayerId: "vid-696a0804aa04a0fb00f89685",
        vturbScriptUrl:
          "https://scripts.converteai.net/97052772-3f64-4280-87a7-ea6ecc250ed5/players/696a0804aa04a0fb00f89685/v4/player.js",
        viewersBase: 2284,
        description:
          "Fale investidor, fala investidora. As vagas para o Sistema Trend foram oficialmente liberadas.\n\nNeste vídeo, eu explico para quem o sistema é indicado, para quem ele NÃO é indicado e por que operar com automação no mercado financeiro exige disciplina, controle emocional e gerenciamento correto.",
        chatNote: "Use o chat para tirar dúvidas sobre o sistema. Mercado financeiro envolve risco.",
        aiInstructions:
          "Comentários naturais, curtos, em PT-BR. Fale de disciplina, gerenciamento e automação. Não prometa lucro.",
        agent: {
          create: {
            name: "Suporte EA Trend",
            avatar: "ST",
            personality: "técnico/comercial",
            goal: "responder dúvidas com a base de conhecimento",
            enabled: true,
          },
        },
        knowledgeBase: {
          create: {
            content:
              "Sistema Trend: automação no mercado financeiro. Inclui área de membros, suporte via WhatsApp, ranking de setups e IA integrada. Mercado envolve risco. Resultados passados não garantem resultados futuros.",
          },
        },
        settings: { create: {} },
        transcript: {
          create: [
            { timestampSec: 5, text: "Abertura das vagas para o Sistema Trend" },
            { timestampSec: 60, text: "Para quem o sistema NÃO é indicado" },
            { timestampSec: 180, text: "História e credibilidade" },
            { timestampSec: 300, text: "O que está incluso: membros, suporte, ranking e IA" },
            { timestampSec: 600, text: "Formas de pagamento e CTA" },
          ],
        },
        commentEvents: {
          create: [
            { timestampSec: 8, commentText: "chegando aqui agora, que horas começa?", authorName: "Eduardo Ramos", authorColor: "#1e6b45", commentType: "filler" },
            { timestampSec: 22, commentText: "finalmente, aguardava essa live", authorName: "Patrícia Gomes", authorColor: "#5c1d8a", commentType: "filler" },
            { timestampSec: 70, commentText: "essa parte de filtro de perfil é necessária demais", authorName: "Carlos Henrique", authorColor: "#1a4a7a", commentType: "benefit" },
            { timestampSec: 190, commentText: "quem tá há anos nisso fala diferente", authorName: "Fernanda Costa", authorColor: "#0f766e", commentType: "benefit" },
            { timestampSec: 310, commentText: "suporte no WhatsApp faz diferença na configuração", authorName: "Ricardo Moreira", authorColor: "#01579b", commentType: "question" },
          ],
        },
        links: { create: [{ label: "Área de membros", url: "https://example.com/membros" }] },
        actions: {
          create: [
            { key: "checkout", label: "Checkout", url: "https://example.com/checkout" },
            { key: "suporte", label: "Suporte", url: "https://example.com/suporte" },
          ],
        },
      },
    });
  }

  console.log(`Admin pronto: ${email}`);
  console.log("Página demo: /p/trend-ao-vivo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
