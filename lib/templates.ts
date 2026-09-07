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
  {
    id: "custom",
    name: "Personalizado",
    description: "Envie um HTML ou o ZIP do site inteiro. A sala usa o seu layout, não os modelos prontos.",
    badge: "Ao vivo",
    chatTitle: "Chat",
    stageLabel: "",
    inputPlaceholder: "Envie uma mensagem...",
    viewsLabel: "visualizações",
  },
] as const;

export const CUSTOM_STARTER_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{{title}}</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: #0f0f0f; color: #f1f1f1; }
    .wrap { max-width: 960px; margin: 0 auto; padding: 24px 16px 48px; }
    .player { background: #000; border-radius: 12px; overflow: hidden; aspect-ratio: 16 / 9; }
    .cta { display: block; margin: 20px 0; background: #e11d48; color: #fff; text-align: center; text-decoration: none; font-weight: 700; padding: 14px 20px; border-radius: 10px; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>{{title}}</h1>
    <div class="player">{{player}}</div>
    {{cta}}
    <div>{{description}}</div>
  </div>
</body>
</html>
`;

export type PageTemplateId = (typeof PAGE_TEMPLATES)[number]["id"];

export function isPageTemplate(value: unknown): value is PageTemplateId {
  return PAGE_TEMPLATES.some((item) => item.id === value);
}

export function getPageTemplate(id?: string | null) {
  return PAGE_TEMPLATES.find((item) => item.id === id) || PAGE_TEMPLATES[0];
}
