import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDuration, getPageStats, parseStatRange, STAT_RANGES } from "@/lib/page-stats";
import { getPageTemplate } from "@/lib/templates";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
};

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

export default async function PageStats({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const range = parseStatRange(query.range);
  const page = await db.page.findUnique({ where: { id } });
  if (!page) notFound();

  const stats = await getPageStats(id, range);
  const tpl = getPageTemplate(page.template);
  const maxFunnel = stats.funnel[0]?.count || 1;
  const maxSeries = Math.max(1, ...stats.series.map((point) => point.count));

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#9aa0a6]">
            <Link href={`/admin/pages/${page.id}`} className="hover:text-[#3ea6ff]">
              Editar página
            </Link>
            {" · "}
            {page.status === "published" ? (
              <a href={`/${page.slug}`} target="_blank" rel="noreferrer" className="hover:text-[#3ea6ff]">
                Abrir sala
              </a>
            ) : (
              "Rascunho"
            )}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{page.title}</h1>
          <p className="text-sm text-[#9aa0a6]">
            Modelo {tpl.name} · /{page.slug} · funil da sala de aula/live
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {STAT_RANGES.map((item) => (
          <Link
            key={item.id}
            href={`/admin/pages/${page.id}/stats?range=${item.id}`}
            className={`rounded-full px-3 py-1 text-sm ${
              range === item.id ? "bg-[#3ea6ff] text-[#0f1115]" : "bg-[#171a21] text-[#9aa0a6]"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Pessoas" value={formatNumber(stats.uniquePeople)} hint="visitantes únicos" />
        <Kpi label="Acessos" value={formatNumber(stats.access)} hint="sessões na sala" />
        <Kpi label="Tempo médio" value={formatDuration(stats.avgSec)} hint={`mediana ${formatDuration(stats.medianSec)}`} />
        <Kpi label="Cliques" value={formatNumber(stats.totalClicks)} hint={`${stats.clicksPerVisit} por acesso`} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Kpi label="Saída rápida" value={`${stats.bounceRate}%`} hint={`${formatNumber(stats.bounced)} saíram em menos de 15s`} />
        <Kpi label="Tempo total" value={formatDuration(stats.totalWatch)} hint="soma das permanências" />
        <Kpi label="Voltaram" value={formatNumber(stats.returningPeople)} hint="pessoas com mais de um acesso" />
      </div>

      <section className="mt-8 rounded-xl border border-[#2a2f3a] p-5">
        <h2 className="text-lg font-semibold">Funil da sala</h2>
        <p className="mt-1 text-sm text-[#9aa0a6]">
          Onde a pessoa para, da entrada até o clique. Use isso para corrigir o gancho, o popup e o botão de ação.
        </p>
        <div className="mt-5 grid gap-4">
          {stats.funnel.map((step, index) => (
            <div key={step.key}>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">
                  {index + 1}. {step.label}
                </span>
                <span className="text-[#9aa0a6]">
                  {formatNumber(step.count)} · {step.pctOfAccess}% dos acessos
                  {index > 0 ? ` · queda ${step.dropFromPrev}%` : ""}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#171a21]">
                <div
                  className="h-full rounded-full bg-[#3ea6ff]"
                  style={{ width: `${Math.max(step.count ? 4 : 0, (step.count / maxFunnel) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-[#2a2f3a] p-5">
        <h2 className="text-lg font-semibold">Leitura do funil</h2>
        <div className="mt-4 grid gap-3">
          {stats.insights.map((item) => (
            <div
              key={item.title}
              className={`rounded-lg border px-4 py-3 ${
                item.severity === "high"
                  ? "border-[#f87171]/40 bg-[#f87171]/10"
                  : item.severity === "ok"
                    ? "border-[#34d399]/30 bg-[#34d399]/10"
                    : "border-[#2a2f3a] bg-[#171a21]"
              }`}
            >
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-sm text-[#c5c9d1]">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-[#2a2f3a] p-5">
          <h2 className="text-lg font-semibold">{range === "today" ? "Acessos por hora" : "Acessos por dia"}</h2>
          <div className="mt-4 flex h-40 items-end gap-1">
            {stats.series.length === 0 ? (
              <p className="text-sm text-[#9aa0a6]">Sem dados neste período.</p>
            ) : (
              stats.series.map((point) => (
                <div key={point.label} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                  <div
                    className="w-full rounded-t bg-[#3ea6ff]"
                    style={{ height: `${Math.max(point.count ? 6 : 2, (point.count / maxSeries) * 100)}%` }}
                    title={`${point.label}: ${point.count}`}
                  />
                </div>
              ))
            )}
          </div>
          {stats.series.length > 0 ? (
            <div className="mt-2 flex justify-between text-[11px] text-[#9aa0a6]">
              <span>{stats.series[0]?.label}</span>
              <span>{stats.series[stats.series.length - 1]?.label}</span>
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-[#2a2f3a] p-5">
          <h2 className="text-lg font-semibold">Origem do acesso</h2>
          <div className="mt-3 grid gap-2 text-sm">
            {stats.referrers.length === 0 ? (
              <p className="text-[#9aa0a6]">Ainda sem origens registradas.</p>
            ) : (
              stats.referrers.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3">
                  <span className="truncate">{item.label}</span>
                  <span className="shrink-0 text-[#9aa0a6]">
                    {formatNumber(item.count)} · {item.pct}%
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-[#2a2f3a] p-5">
        <h2 className="text-lg font-semibold">Cliques em botões e links</h2>
        <p className="mt-1 text-sm text-[#9aa0a6]">CTA da sala, links da descrição e links enviados pelo agente.</p>
        {stats.clicks.length === 0 ? (
          <p className="mt-4 text-sm text-[#9aa0a6]">Nenhum clique neste período.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[#9aa0a6]">
                <tr>
                  <th className="pb-2 font-medium">Rótulo</th>
                  <th className="pb-2 font-medium">Destino</th>
                  <th className="pb-2 font-medium">Cliques</th>
                </tr>
              </thead>
              <tbody>
                {stats.clicks.map((item) => (
                  <tr key={`${item.label}-${item.url}`} className="border-t border-[#2a2f3a]">
                    <td className="py-2 pr-3">{item.label}</td>
                    <td className="max-w-xs truncate py-2 pr-3 text-[#9aa0a6]">{item.url}</td>
                    <td className="py-2">{formatNumber(item.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-[#2a2f3a] bg-[#12151b] p-4">
      <p className="text-xs uppercase tracking-wide text-[#9aa0a6]">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-[#9aa0a6]">{hint}</p>
    </div>
  );
}
