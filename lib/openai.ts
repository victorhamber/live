import OpenAI from "openai";
import { db } from "./db";
import { colorForName } from "./utils";
import { getAppSettings } from "./settings";

async function getOpenAiConfig() {
  const settings = await getAppSettings();
  const key = settings.openaiApiKey.trim();
  return {
    key,
    model: settings.openaiModel.trim() || "gpt-4o-mini",
    client: key ? new OpenAI({ apiKey: key, timeout: 8_000, maxRetries: 0 }) : null,
  };
}

export async function defaultModel() {
  const { model } = await getOpenAiConfig();
  return model;
}

const FAKE_NAMES = [
  "Eduardo Ramos",
  "Márcio Lima",
  "Rafael Torres",
  "André Luiz",
  "Patrícia Gomes",
  "Renato Alves",
  "Bruna Carvalho",
  "Juliana Prado",
  "Carlos Henrique",
  "Simone Martins",
  "Fernanda Costa",
  "Paulo Nascimento",
  "Ricardo Moreira",
  "Camila Reis",
  "Gustavo Ferreira",
  "Marcos Vinícius",
  "Aline Santos",
  "Roberto Silva",
  "Daniela Farias",
  "Leandro Batista",
];

export type GeneratedEvent = {
  timestampSec: number;
  commentText: string;
  commentType: string;
  authorName: string;
};

export async function generateTimedComments(input: {
  pageTitle: string;
  instructions: string;
  knowledge: string;
  transcript: { timestampSec: number; text: string }[];
  allowedTypes: string;
  temperature: number;
  model: string;
}): Promise<GeneratedEvent[]> {
  const { client: openai, model: configuredModel } = await getOpenAiConfig();
  if (!openai) {
    throw new Error("Configure a chave da OpenAI em Configurações");
  }

  const transcriptBlock = input.transcript
    .slice(0, 80)
    .map((s) => `${s.timestampSec}s: ${s.text}`)
    .join("\n");

  const completion = await openai.chat.completions.create({
    model: input.model || configuredModel,
    temperature: input.temperature ?? 0.7,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Você gera comentários de chat para uma live/VSL. Responda SOMENTE JSON válido:
{"comments":[{"timestampSec":number,"text":string,"type":string}]}
Tipos permitidos: ${input.allowedTypes}.
Regras:
- Comentários curtos, naturais, em português do Brasil, como pessoas reais no chat.
- Relacionados ao trecho da transcrição naquele segundo.
- Sem links, sem palavrões, sem prometer resultado financeiro.
- Sem inventar preço, garantia ou funcionalidade que não esteja na base de conhecimento.
- Densidade: cerca de 1 comentário a cada 8–20 segundos de vídeo, sem amontoar.
- Varie: pergunta, objeção leve, benefício, depoimento curto, filler.`,
      },
      {
        role: "user",
        content: `Página: ${input.pageTitle}
Instruções do admin:
${input.instructions || "(nenhuma)"}

Base de conhecimento do produto:
${input.knowledge || "(vazia)"}

Transcrição (segundo → texto):
${transcriptBlock || "(vazia)"}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  let parsed: { comments?: { timestampSec: number; text: string; type?: string }[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("A IA retornou um JSON inválido");
  }

  const comments = Array.isArray(parsed.comments) ? parsed.comments : [];
  return comments
    .filter((c) => typeof c.timestampSec === "number" && typeof c.text === "string" && c.text.trim())
    .map((c, i) => {
      const name = FAKE_NAMES[i % FAKE_NAMES.length];
      return {
        timestampSec: Math.max(0, Math.round(c.timestampSec)),
        commentText: c.text.trim().slice(0, 240),
        commentType: (c.type || "comment").slice(0, 40),
        authorName: name,
      };
    });
}

export async function classifyComment(text: string, model: string): Promise<string> {
  const { client: openai, model: configuredModel } = await getOpenAiConfig();
  if (!openai) return "NORMAL";

  const completion = await openai.chat.completions.create({
    model: model || configuredModel,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Classifique o comentário em UMA palavra: NORMAL, DUVIDA, OBJECAO, SPAM, OFENSIVO, NEGATIVO, SUSPEITO. Sem explicação.",
      },
      { role: "user", content: text },
    ],
  });

  const label = (completion.choices[0]?.message?.content || "NORMAL").trim().toUpperCase();
  const allowed = ["NORMAL", "DUVIDA", "OBJECAO", "SPAM", "OFENSIVO", "NEGATIVO", "SUSPEITO"];
  return allowed.includes(label) ? label : "NORMAL";
}

export async function agentReply(input: {
  pageId: string;
  userName: string;
  userText: string;
  knowledge: string;
  agentName: string;
  personality: string;
  goal: string;
  links: { label: string; url: string }[];
  actions: { key: string; label: string; url: string }[];
  model: string;
  temperature: number;
}): Promise<string | null> {
  const { client: openai, model: configuredModel } = await getOpenAiConfig();
  if (!openai) return null;

  const links = input.links.map((l) => `${l.label}: ${l.url}`).join("\n") || "(nenhum)";
  const actions = input.actions.map((a) => `/${a.key} → ${a.label}: ${a.url}`).join("\n") || "(nenhuma)";

  const completion = await openai.chat.completions.create({
    model: input.model || configuredModel,
    temperature: Math.min(input.temperature ?? 0.4, 0.5),
    messages: [
      {
        role: "system",
        content: `Você é ${input.agentName}, agente de suporte no chat ao vivo.
Personalidade: ${input.personality}.
Objetivo: ${input.goal}.

REGRAS OBRIGATÓRIAS:
- Só use informações da base de conhecimento abaixo ou dos links/ações cadastrados.
- Se não souber, diga que o suporte humano confirma depois. NÃO invente preço, garantia, resultado, prazo ou funcionalidade.
- Respostas curtas (1–3 frases), tom de chat.
- Pode enviar um link cadastrado se a pessoa pedir.
- Sem markdown pesado.

Base de conhecimento:
${input.knowledge || "(vazia — não invente)"}

Links autorizados:
${links}

Ações:
${actions}`,
      },
      {
        role: "user",
        content: `${input.userName} comentou: ${input.userText}`,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim();
  return text ? text.slice(0, 400) : null;
}

export async function maybeReplyAsAgent(opts: {
  pageId: string;
  visitorName: string;
  text: string;
  videoTimestamp: number;
  classification: string;
}) {
  const page = await db.page.findUnique({
    where: { id: opts.pageId },
    include: { agent: true, knowledgeBase: true, settings: true, links: true, actions: true },
  });
  if (!page?.agent?.enabled) return null;
  if (!page.settings?.agentReplyEnabled || !page.settings.aiEnabled) return null;
  const { key } = await getOpenAiConfig();
  if (!key) return null;

  const should =
    ["DUVIDA", "OBJECAO"].includes(opts.classification) ||
    /[?]/.test(opts.text) ||
    /preço|preco|link|como|funciona|whats|comprar/i.test(opts.text);
  if (!should) return null;

  const reply = await agentReply({
    pageId: page.id,
    userName: opts.visitorName,
    userText: opts.text,
    knowledge: page.knowledgeBase?.content || "",
    agentName: page.agent.name,
    personality: page.agent.personality,
    goal: page.agent.goal,
    links: page.links,
    actions: page.actions,
    model: page.settings.openaiModel,
    temperature: page.settings.temperature,
  });
  if (!reply) return null;

  return db.comment.create({
    data: {
      pageId: page.id,
      videoTimestamp: opts.videoTimestamp + 2,
      text: reply,
      classification: "NORMAL",
      visibility: "public",
      authorType: "agent",
      authorName: page.agent.name,
    },
  });
}

export { colorForName };
