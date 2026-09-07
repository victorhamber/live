import { db } from "@/lib/db";

export const STAT_RANGES = [
  { id: "today", label: "Hoje" },
  { id: "7", label: "7 dias" },
  { id: "15", label: "15 dias" },
  { id: "30", label: "30 dias" },
  { id: "all", label: "Máximo" },
] as const;

export type StatRangeId = (typeof STAT_RANGES)[number]["id"];

const TZ = "America/Sao_Paulo";

export function parseStatRange(value?: string | null): StatRangeId {
  return STAT_RANGES.some((item) => item.id === value) ? (value as StatRangeId) : "7";
}

export function rangeSince(range: StatRangeId): Date | null {
  if (range === "all") return null;
  if (range === "today") return startOfTodayInSaoPaulo();
  const days = Number(range);
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function startOfTodayInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = parts.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 3, 0, 0));
}

export function formatDuration(totalSec: number) {
  const sec = Math.max(0, Math.round(totalSec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) return `${h}h ${m}min`;
  if (m) return `${m}min ${s}s`;
  return `${s}s`;
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

type FunnelStep = {
  key: string;
  label: string;
  count: number;
  pctOfAccess: number;
  dropFromPrev: number;
};

export type PageInsight = {
  severity: "high" | "medium" | "ok";
  title: string;
  text: string;
};

function insightFor(funnel: FunnelStep[], bounceRate: number, avgSec: number): PageInsight[] {
  const access = funnel[0]?.count || 0;
  const stay = funnel[1];
  const identified = funnel[2];
  const commented = funnel[3];
  const clicked = funnel[4];
  const items: PageInsight[] = [];

  if (!access) {
    return [
      {
        severity: "medium",
        title: "Ainda sem tráfego neste período",
        text: "Assim que a sala receber visitas, o funil mostra onde as pessoas param: abertura do vídeo, identificação, comentário e clique no CTA.",
      },
    ];
  }

  if (bounceRate >= 45) {
    items.push({
      severity: "high",
      title: "Queda no primeiro contato",
      text: `${bounceRate}% saem em menos de 15 segundos. O gancho do vídeo, o tempo de carregamento do player ou a promessa do anúncio não estão segurando a atenção.`,
    });
  }

  if (stay && stay.dropFromPrev >= 40) {
    items.push({
      severity: "high",
      title: "Pouca permanência",
      text: `${stay.dropFromPrev}% não passam de 30 segundos. Revise os primeiros 20 segundos da aula e se o layout escolhido deixa o vídeo óbvio no celular.`,
    });
  } else if (avgSec >= 180) {
    items.push({
      severity: "ok",
      title: "O conteúdo segura a sala",
      text: `Tempo médio de ${formatDuration(avgSec)}. Quem entra está assistindo. O gargalo, se houver, está mais abaixo no funil.`,
    });
  }

  if (identified && identified.dropFromPrev >= 50 && stay && stay.count > 10) {
    items.push({
      severity: "medium",
      title: "Assistem, mas não se identificam",
      text: "O pedido de nome e e-mail pode estar cedo demais, ou o chat não convida a perguntar. Teste um CTA verbal no vídeo pedindo para se apresentar no chat.",
    });
  }

  if (commented && identified && identified.count > 8 && commented.dropFromPrev >= 45) {
    items.push({
      severity: "medium",
      title: "Identificou e não comentou",
      text: "Há atrito depois do popup. Deixe uma pergunta aberta na aula (“manda no chat se você já tentou X”) para transformar cadastro em participação.",
    });
  }

  if (clicked && commented && commented.count > 5 && clicked.dropFromPrev >= 50) {
    items.push({
      severity: "high",
      title: "Participam e não clicam",
      text: "O interesse existe, mas o botão de ação está fraco ou escondido. Coloque o CTA visível no modelo da sala e repita o link na descrição e no chat do agente.",
    });
  } else if (clicked && access && clicked.pctOfAccess >= 12) {
    items.push({
      severity: "ok",
      title: "O CTA está convertendo",
      text: `${clicked.pctOfAccess}% das visitas clicam em algum botão ou link. Compare os destinos abaixo e invista no que já puxa clique.`,
    });
  }

  if (!items.length) {
    items.push({
      severity: "ok",
      title: "Funil estável neste período",
      text: "Não há um gargalo gritante. Use os cliques por URL e o tempo médio para testar um CTA mais cedo ou um modelo de sala diferente.",
    });
  }

  return items.slice(0, 4);
}

type VisitLite = {
  anonId: string;
  referrer: string;
  startedAt: Date;
  durationSec: number;
  identified: boolean;
  commented: boolean;
  clicked: boolean;
  clickCount: number;
};

function summarizeVisits(visits: VisitLite[], clickEvents: { label: string; url: string }[], range: StatRangeId) {
  const access = visits.length;
  const uniquePeople = new Set(visits.map((v) => v.anonId)).size;
  const stayed = visits.filter((v) => v.durationSec >= 30).length;
  const identified = visits.filter((v) => v.identified).length;
  const commented = visits.filter((v) => v.commented).length;
  const clicked = visits.filter((v) => v.clicked).length;
  const bounced = visits.filter((v) => v.durationSec < 15).length;
  const durations = visits.map((v) => v.durationSec);
  const avgSec = access ? Math.round(durations.reduce((a, b) => a + b, 0) / access) : 0;
  const totalWatch = durations.reduce((a, b) => a + b, 0);
  const totalClicks = visits.reduce((a, b) => a + b.clickCount, 0);

  const visitsPerPerson = new Map<string, number>();
  for (const visit of visits) {
    visitsPerPerson.set(visit.anonId, (visitsPerPerson.get(visit.anonId) || 0) + 1);
  }
  const returningPeople = [...visitsPerPerson.values()].filter((count) => count > 1).length;

  const funnelRaw = [
    { key: "access", label: "Acessaram a sala", count: access },
    { key: "stay", label: "Permaneceram 30s+", count: stayed },
    { key: "identify", label: "Informaram nome e e-mail", count: identified },
    { key: "comment", label: "Comentaram", count: commented },
    { key: "click", label: "Clicaram em botão ou link", count: clicked },
  ];

  const funnel: FunnelStep[] = funnelRaw.map((step, index) => {
    const prev = index === 0 ? step.count : funnelRaw[index - 1].count;
    const drop = prev ? Math.round(((prev - step.count) / prev) * 1000) / 10 : 0;
    return {
      ...step,
      pctOfAccess: pct(step.count, access),
      dropFromPrev: Math.max(0, drop),
    };
  });

  const clickMap = new Map<string, { label: string; url: string; count: number }>();
  for (const event of clickEvents) {
    const url = event.url || "(sem URL)";
    const key = `${event.label}||${url}`;
    const current = clickMap.get(key) || { label: event.label || "Link", url, count: 0 };
    current.count += 1;
    clickMap.set(key, current);
  }
  const clicks = [...clickMap.values()].sort((a, b) => b.count - a.count).slice(0, 12);

  const refMap = new Map<string, number>();
  for (const visit of visits) {
    const host = hostFrom(visit.referrer);
    refMap.set(host, (refMap.get(host) || 0) + 1);
  }
  const referrers = [...refMap.entries()]
    .map(([label, count]) => ({ label, count, pct: pct(count, access) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const series = buildSeries(visits, range);

  return {
    range,
    access,
    uniquePeople,
    avgSec,
    medianSec: median(durations),
    totalWatch,
    bounceRate: pct(bounced, access),
    bounced,
    totalClicks,
    clicksPerVisit: access ? Math.round((totalClicks / access) * 100) / 100 : 0,
    returningPeople,
    funnel,
    clicks,
    referrers,
    series,
    insights: insightFor(funnel, pct(bounced, access), avgSec),
  };
}

export async function getPageStats(pageId: string, range: StatRangeId) {
  const since = rangeSince(range);
  const visitWhere = since ? { pageId, startedAt: { gte: since } } : { pageId };
  const eventWhere = since ? { pageId, createdAt: { gte: since } } : { pageId };

  const visits = await db.visit.findMany({
    where: visitWhere,
    select: {
      anonId: true,
      referrer: true,
      startedAt: true,
      durationSec: true,
      identified: true,
      commented: true,
      clicked: true,
      clickCount: true,
    },
  });

  const clickEvents = await db.analyticsEvent.findMany({
    where: { ...eventWhere, type: "click" },
    select: { label: true, url: true },
  });

  return summarizeVisits(visits, clickEvents, range);
}

export async function getOverviewStats(range: StatRangeId) {
  const since = rangeSince(range);
  const visitWhere = since ? { startedAt: { gte: since } } : {};
  const eventWhere = since
    ? { type: "click" as const, createdAt: { gte: since } }
    : { type: "click" as const };

  const pages = await db.page.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, slug: true, template: true, status: true },
  });

  const visits = await db.visit.findMany({
    where: visitWhere,
    select: {
      pageId: true,
      anonId: true,
      referrer: true,
      startedAt: true,
      durationSec: true,
      identified: true,
      commented: true,
      clicked: true,
      clickCount: true,
    },
  });

  const clickEvents = await db.analyticsEvent.findMany({
    where: eventWhere,
    select: { pageId: true, label: true, url: true },
  });

  const overall = summarizeVisits(visits, clickEvents, range);
  const pageRows = pages
    .map((page) => {
      const pageVisits = visits.filter((visit) => visit.pageId === page.id);
      const pageClicks = clickEvents.filter((event) => event.pageId === page.id);
      return {
        ...page,
        stats: summarizeVisits(pageVisits, pageClicks, range),
      };
    })
    .sort((a, b) => b.stats.access - a.stats.access || a.title.localeCompare(b.title, "pt-BR"));

  return {
    ...overall,
    pageCount: pages.length,
    publishedCount: pages.filter((page) => page.status === "published").length,
    pages: pageRows,
  };
}

function hostFrom(referrer: string) {
  const value = String(referrer || "").trim();
  if (!value) return "Acesso direto / anúncio";
  try {
    return new URL(value).host.replace(/^www\./, "") || value;
  } catch {
    return value.slice(0, 48);
  }
}

function saoPauloKey(date: Date, hourly: boolean) {
  if (hourly) {
    const hour = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hour: "2-digit",
      hour12: false,
    }).format(date);
    return hour.padStart(2, "0");
  }
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function buildSeries(visits: { startedAt: Date }[], range: StatRangeId) {
  if (range === "today") {
    const buckets = new Map<string, number>();
    for (let hour = 0; hour < 24; hour++) {
      buckets.set(String(hour).padStart(2, "0") + "h", 0);
    }
    for (const visit of visits) {
      const key = `${saoPauloKey(visit.startedAt, true)}h`;
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
    return [...buckets.entries()].map(([label, count]) => ({ label, count }));
  }

  const days = range === "all" ? 30 : Number(range);
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    buckets.set(saoPauloKey(date, false), 0);
  }
  for (const visit of visits) {
    const key = saoPauloKey(visit.startedAt, false);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
  }
  return [...buckets.entries()].map(([label, count]) => ({ label, count }));
}
