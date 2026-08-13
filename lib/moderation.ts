const URL_RE =
  /((https?:\/\/|www\.)[^\s]+)|([a-z0-9-]+\.(com|net|org|br|io|co|me|info|xyz|app)(\/[^\s]*)?)/i;

const PROFANITY = [
  "porra",
  "caralho",
  "puta",
  "merda",
  "foder",
  "fdp",
  "desgraça",
  "otario",
  "otário",
  "idiota",
  "imbecil",
  "lixo",
  "golpe",
  "scam",
  "fraude",
  "estelionato",
  "piramide",
  "pirâmide",
];

const NEGATIVE_PRODUCT = [
  "não funciona",
  "nao funciona",
  "é golpe",
  "e golpe",
  "não prest",
  "nao prest",
  "perdi dinheiro",
  "roubo",
  "mentira",
  "não recomendo",
  "nao recomendo",
  "pior ferramenta",
  "não compre",
  "nao compre",
];

export type RuleResult = {
  restricted: boolean;
  classification: "NORMAL" | "SPAM" | "OFENSIVO" | "NEGATIVO" | "SUSPEITO";
  reason: string;
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function moderateByRules(text: string, recentTexts: string[]): RuleResult {
  const raw = text.trim();
  const n = normalize(raw);

  if (!raw || raw.length < 2) {
    return { restricted: true, classification: "SPAM", reason: "mensagem vazia ou muito curta" };
  }

  if (raw.length > 400) {
    return { restricted: true, classification: "SPAM", reason: "mensagem longa demais" };
  }

  if (URL_RE.test(raw) || raw.includes("wa.me") || raw.includes("whatsapp")) {
    return { restricted: true, classification: "SPAM", reason: "link ou divulgação" };
  }

  if (PROFANITY.some((w) => n.includes(normalize(w)))) {
    return { restricted: true, classification: "OFENSIVO", reason: "conteúdo ofensivo" };
  }

  if (NEGATIVE_PRODUCT.some((w) => n.includes(normalize(w)))) {
    return { restricted: true, classification: "NEGATIVO", reason: "comentário negativo sobre a ferramenta" };
  }

  const repeated = raw.replace(/(.)\1{6,}/g, "$1");
  if (repeated.length < raw.length - 6) {
    return { restricted: true, classification: "SPAM", reason: "flood de caracteres" };
  }

  const similar = recentTexts.filter((t) => normalize(t) === n).length;
  if (similar >= 1) {
    return { restricted: true, classification: "SPAM", reason: "mensagem repetida" };
  }

  return { restricted: false, classification: "NORMAL", reason: "" };
}

export function looksLikeQuestion(text: string) {
  const n = normalize(text);
  return (
    text.includes("?") ||
    n.startsWith("como ") ||
    n.startsWith("qual ") ||
    n.startsWith("quanto ") ||
    n.startsWith("tem ") ||
    n.startsWith("funciona")
  );
}

export function inferLeadStatus(classification: string, text: string) {
  const n = normalize(text);
  if (["OBJECAO"].includes(classification) || n.includes("caro") || n.includes("nao tenho dinheiro")) {
    return "objection";
  }
  if (
    n.includes("preco") ||
    n.includes("preço") ||
    n.includes("comprar") ||
    n.includes("link") ||
    n.includes("checkout") ||
    n.includes("quero entrar") ||
    n.includes("como pago")
  ) {
    return "interested";
  }
  if (n.includes("contato") || n.includes("whats") || n.includes("me chama") || n.includes("telefone")) {
    return "contact";
  }
  return null;
}
