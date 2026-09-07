export const PAGE_TEMPLATES = [
  {
    id: "youtube",
    name: "YouTube Live",
    description: "O layout clássico de live do YouTube, com vídeo à esquerda e chat à direita.",
    badge: "Ao vivo",
    chatTitle: "Chat ao vivo",
    stageLabel: "",
    inputPlaceholder: "Envie uma mensagem...",
    viewsLabel: "visualizações ao vivo",
  },
  {
    id: "classroom",
    name: "Sala de aula",
    description: "Cabeçalho de aula, chat de perguntas e visual mais institucional.",
    badge: "Aula ao vivo",
    chatTitle: "Perguntas da aula",
    stageLabel: "Sala de aula",
    inputPlaceholder: "Pergunte sobre a aula...",
    viewsLabel: "alunos assistindo",
  },
  {
    id: "webinar",
    name: "Webinar",
    description: "Palco profissional, faixa de marca e CTA em destaque para conversão.",
    badge: "Webinar",
    chatTitle: "Perguntas",
    stageLabel: "Webinar ao vivo",
    inputPlaceholder: "Envie sua pergunta...",
    viewsLabel: "participantes",
  },
  {
    id: "theater",
    name: "Cinema",
    description: "Vídeo dominante, ambiente escuro e chat estreito, no estilo sessão.",
    badge: "Ao vivo",
    chatTitle: "Chat",
    stageLabel: "Sessão",
    inputPlaceholder: "Comente...",
    viewsLabel: "assistindo",
  },
  {
    id: "meetup",
    name: "Reunião",
    description: "Cartões arredondados e conversa à vista, no estilo encontro ao vivo.",
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
