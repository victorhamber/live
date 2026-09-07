import Link from "next/link";
import { formatDuration, getOverviewStats, parseStatRange, STAT_RANGES } from "@/lib/page-stats";
import { getPageTemplate } from "@/lib/templates";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ range?: string }> };

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

export default async function StatsDashboard({ searchParams }: Props) {
  const query = await searchParams;
  const range = parseStatRange(query.range);
  const stats = await getOverviewStats(range);
  const maxFunnel = stats.funnel[0]?.count || 1;
  const maxSeries = Math.max(1, ...stats.series.map((point) => point.count));

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-[#9aa0a6]">
            Visão geral de todas as salas · {stats.publishedCount} publicadas · {stats.pageCount} páginas
          </p>
        </div>
        <Link href="/admin" className="rounded-lg border border-[#2a2f3a] px-3 py-2 text-sm">
          Ver páginas
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {STAT_RANGES.map((item) => (
          <Link
            key={item.id}
            href={`/admin/stats?range=${item.id}`}
            className={`rounded-full px-3 py-1 text-sm ${
              range === item.id ? "bg-[#3ea6ff] text-[#0f1115]" : "bg-[#171a21] text-[#9aa0a6]"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Pessoas" value={formatNumber(stats.uniquePeople)} hint="visitantes únicos em todas as salas" />
        <Kpi label="Acessos" value={formatNumber(stats.access)} hint="sessões somadas" />
        <Kpi label="Tempo médio" value={formatDuration(stats.avgSec)} hint={`mediana ${formatDuration(stats.medianSec)}`} />
        <Kpi label="Cliques" value={formatNumber(stats.totalClicks)} hint={`${stats.clicksPerVisit} por acesso`} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Kpi label="Saída rápida" value={`${stats.bounceRate}%`} hint={`${formatNumber(stats.bounced)} saíram em menos de 15s`} />
        <Kpi label="Tempo total" value={formatDuration(stats.totalWatch)} hint="soma das permanências" />
        <Kpi label="Voltaram" value={formatNumber(stats.returningPeople)} hint="pessoas com mais de um acesso" />
      </div>

      <section className="mt-8 rounded-xl border border-[#2a2f3a] p-5">
        <h2 className="text-lg font-semibold">Funil geral</h2>
        <p className="mt-1 text-sm text-[#9aa0a6]">Todas as lives juntas: de quem entrou até quem clicou.</p>
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
        <h2 className="text-lg font-semibold">Leitura</h2>
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

      <section className="mt-6 overflow-hidden rounded-xl border border-[#2a2f3a]">
        <div className="border-b border-[#2a2f3a] px-5 py-4">
          <h2 className="text-lg font-semibold">Desempenho por sala</h2>
          <p className="text-sm text-[#9aa0a6]">Compare acessos, tempo e conversão de cada live.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#171a21] text-[#9aa0a6]">
              <tr>
                <th className="px-4 py-3 font-medium">Sala</th>
                <th className="px-4 py-3 font-medium">Modelo</th>
                <th className="px-4 py-3 font-medium">Pessoas</th>
                <th className="px-4 py-3 font-medium">Acessos</th>
                <th className="px-4 py-3 font-medium">Tempo médio</th>
                <th className="px-4 py-3 font-medium">Identificou</th>
                <th className="px-4 py-3 font-medium">Clicou</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {stats.pages.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[#9aa0a6]">
                    Nenhuma página ainda.
                  </td>
                </tr>
              ) : (
                stats.pages.map((page) => (
                  <tr key={page.id} className="border-t border-[#2a2f3a]">
                    <td className="px-4 py-3">
                      <div className="font-medium">{page.title}</div>
                      <div className="text-xs text-[#9aa0a6]">/{page.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-[#9aa0a6]">{getPageTemplate(page.template).name}</td>
                    <td className="px-4 py-3">{formatNumber(page.stats.uniquePeople)}</td>
                    <td className="px-4 py-3">{formatNumber(page.stats.access)}</td>
                    <td className="px-4 py-3">{formatDuration(page.stats.avgSec)}</td>
                    <td className="px-4 py-3">{page.stats.funnel[2]?.pctOfAccess ?? 0}%</td>
                    <td className="px-4 py-3">{page.stats.funnel[4]?.pctOfAccess ?? 0}%</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/pages/${page.id}/stats?range=${range}`} className="text-[#3ea6ff]">
                        Detalhe
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
