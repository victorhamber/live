export const PAGE_TEMPLATES = [
  {
    id: "youtube",
    name: "YouTube Live",
    description: "Vídeo à esquerda e chat alto à direita, no formato clássico de live.",
    badge: "Ao vivo",
    chatTitle: "Chat ao vivo",
    stageLabel: "",
    inputPlaceholder: "Envie uma mensagem...",
    viewsLabel: "visualizações ao vivo",
  },
  {
    id: "classroom",
    name: "Sala de aula",
    description: "Vídeo em tela cheia no topo; material da aula à esquerda e perguntas embaixo, à direita.",
    badge: "Aula ao vivo",
    chatTitle: "Perguntas da aula",
    stageLabel: "Sala de aula",
    inputPlaceholder: "Pergunte sobre a aula...",
    viewsLabel: "alunos assistindo",
  },
  {
    id: "webinar",
    name: "Webinar",
    description: "Palco centralizado, CTA largo e perguntas embaixo do vídeo — não ao lado.",
    badge: "Webinar",
    chatTitle: "Perguntas",
    stageLabel: "Webinar ao vivo",
    inputPlaceholder: "Envie sua pergunta...",
    viewsLabel: "participantes",
  },
  {
    id: "theater",
    name: "Cinema",
    description: "Vídeo em tela cheia; chat flutua por cima do player, como numa sessão de cinema.",
    badge: "Ao vivo",
    chatTitle: "Chat",
    stageLabel: "Sessão",
    inputPlaceholder: "Comente...",
    viewsLabel: "assistindo",
  },
  {
    id: "meetup",
    name: "Reunião",
    description: "Vídeo e conversa lado a lado, do mesmo tamanho, no estilo reunião.",
    badge: "Ao vivo",
    chatTitle: "Conversa",
    stageLabel: "Encontro",
    inputPlaceholder: "Participe da conversa...",
    viewsLabel: "pessoas na sala",
  },
] as const;

export type PageTemplateId = (typeof PAGE_TEMPLATES)[number]["id"];

export function isPageTemplate(value: unknown): value is PageTemplateId {
  return PAGE_TEMPLATES.some((item) => item.id === value);
}

export function getPageTemplate(id?: string | null) {
  return PAGE_TEMPLATES.find((item) => item.id === id) || PAGE_TEMPLATES[0];
}
