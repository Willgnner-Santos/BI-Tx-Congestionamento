import { AlertTriangle, CalendarDays, MapPin, Scale } from "lucide-react";
import { FiltersPanel } from "@/components/FiltersPanel";
import { SeriesChart } from "@/components/SeriesChart";
import { BacktestTable } from "@/components/BacktestTable";
import {
  getBacktestRanking,
  getChartData,
  getFilterOptions,
  getSummary,
  type Filters,
  type GranularityMode,
  type ScopeMode,
} from "@/lib/dashboard";

type SearchParams = Promise<{
  scope?: string | string[];
  granularity?: string | string[];
  comarca?: string | string[];
  serventia?: string | string[];
  ano?: string | string[];
  show6?: string | string[];
  show12?: string | string[];
}>;

function getSingle(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function formatPercent(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return `${value.toFixed(2)}%`;
}

function formatPp(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return `${value.toFixed(2)} p.p.`;
}

function formatMonthYear(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function alertClass(value: number | null, threshold: number) {
  if (value === null || value === undefined) return "border-white/10";
  return value > threshold
    ? "alert-glow border-amber-400/40"
    : "border-white/10";
}

export default async function Page({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const rawScope = getSingle(params.scope);
  const scope: ScopeMode = rawScope === "global" ? "global" : "unit";
  const isGlobalScope = scope === "global";

  const rawGranularity = getSingle(params.granularity);
  const granularity: GranularityMode =
    rawGranularity === "annual" ? "annual" : "monthly";

  const requestedComarca = getSingle(params.comarca);
  const filterOptions = await getFilterOptions(requestedComarca);

  const comarca = requestedComarca || filterOptions.effectiveComarca;
  const rawServentia = getSingle(params.serventia);
  const serventia =
    rawServentia && filterOptions.serventias.includes(rawServentia)
      ? rawServentia
      : filterOptions.serventias[0] || "";

  const ano = getSingle(params.ano) || "Todos";

  const hasForecastParams =
    params.show6 !== undefined || params.show12 !== undefined;

  const parsedShow6 = hasForecastParams ? getSingle(params.show6) === "1" : true;
  const parsedShow12 = hasForecastParams
    ? getSingle(params.show12) === "1"
    : scope === "global"
      ? false
      : true;

  const show6 = isGlobalScope ? false : parsedShow6;
  const show12 = isGlobalScope ? false : parsedShow12;

  const filters: Filters = {
    scope,
    granularity,
    comarca,
    serventia,
    ano,
    show6,
    show12,
  };

  const threshold = Number(process.env.ALERT_THRESHOLD || 60);
  const isBacktest = ano !== "Todos";

  const canLoad =
    scope === "global" || (Boolean(comarca) && Boolean(serventia));

  const [summary, chartData, backtestRows] = canLoad
    ? await Promise.all([
      getSummary(filters),
      getChartData(filters),
      getBacktestRanking(filters),
    ])
    : [null, [], []];

  const badgeText = isBacktest
    ? scope === "global"
      ? `Global • Backtest ${ano}`
      : `Backtest ${ano}`
    : scope === "global"
      ? `Global • Base até ${formatMonthYear(summary?.base_date)}`
      : `Base até ${formatMonthYear(summary?.base_date)}`;

  const chartDescription = isBacktest
    ? "Ano específico mostra o backtest histórico da IA para o recorte selecionado."
    : scope === "global"
      ? "Visão global consolidada de todas as comarcas e serventias, com foco apenas na série histórica."
      : "O ponto da previsão pulsa quando ultrapassa o limite de alerta.";

  const cardLabel6 = isBacktest ? "MAE backtest 6m" : "Previsão 6 meses";
  const cardLabel12 = isBacktest ? "MAE backtest 12m" : "Previsão 12 meses";

  const cardValue6 = isBacktest
    ? formatPp(summary?.metric_6)
    : formatPercent(summary?.metric_6);

  const cardValue12 = isBacktest
    ? formatPp(summary?.metric_12)
    : formatPercent(summary?.metric_12);

  const showAlert6 = !isBacktest && (summary?.metric_6 ?? 0) > threshold;
  const showAlert12 = !isBacktest && (summary?.metric_12 ?? 0) > threshold;

  const effectiveShow6 = !isGlobalScope && show6;
  const effectiveShow12 = !isGlobalScope && show12;
  const effectiveShowThreshold = !isGlobalScope && !isBacktest;

  return (
    <main className="min-h-screen px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/40 px-5 py-5 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Tx Congestionamento
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Painel Executivo • Real x Previsão
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
            <CalendarDays size={16} />
            {badgeText}
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <FiltersPanel
            comarcas={filterOptions.comarcas}
            serventias={filterOptions.serventias}
            anos={filterOptions.anos}
            current={{
              scope,
              granularity,
              comarca,
              serventia,
              ano,
              show6,
              show12,
            }}
          />

          <div className="space-y-6">
            {!isGlobalScope && (
              <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
                <div className="glass rounded-3xl p-5 lg:p-6">
                  <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                    Últimos 3 meses (real)
                  </div>

                  <div className="text-4xl font-bold tracking-tight text-white">
                    {`${formatPercent(summary?.real_m1)} | ${formatPercent(summary?.real_m2)} | ${formatPercent(summary?.real_m3)}`}
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                    <MapPin size={15} />
                    {summary?.unit_label || "Selecione um recorte"}
                  </div>
                </div>

                <div
                  className={`glass rounded-3xl border p-5 lg:p-6 ${isBacktest
                      ? "border-white/10"
                      : alertClass(summary?.metric_6 ?? null, threshold)
                    }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                      {cardLabel6}
                    </div>
                    {showAlert6 && (
                      <span className="alert-badge inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-200">
                        <AlertTriangle size={14} />
                        ALERTA
                      </span>
                    )}
                  </div>

                  <div
                    className={`text-5xl font-bold tracking-tight ${isBacktest ? "text-cyan-300" : "text-amber-300"
                      }`}
                  >
                    {cardValue6}
                  </div>

                  <div className="mt-3 text-sm text-slate-300">
                    {isBacktest ? "melhor modelo: " : "modelo: "}
                    <span className="text-white">{summary?.model_6 || "-"}</span>
                  </div>
                </div>

                <div
                  className={`glass rounded-3xl border p-5 lg:p-6 ${isBacktest
                      ? "border-white/10"
                      : alertClass(summary?.metric_12 ?? null, threshold)
                    }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                      {cardLabel12}
                    </div>
                    {showAlert12 && (
                      <span className="alert-badge inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-200">
                        <AlertTriangle size={14} />
                        ALERTA
                      </span>
                    )}
                  </div>

                  <div
                    className={`text-5xl font-bold tracking-tight ${isBacktest ? "text-cyan-300" : "text-violet-300"
                      }`}
                  >
                    {cardValue12}
                  </div>

                  <div className="mt-3 text-sm text-slate-300">
                    {isBacktest ? "melhor modelo: " : "modelo: "}
                    <span className="text-white">{summary?.model_12 || "-"}</span>
                  </div>
                </div>
              </div>
            )}

            <SeriesChart
              data={chartData}
              threshold={threshold}
              show6={effectiveShow6}
              show12={effectiveShow12}
              showThreshold={effectiveShowThreshold}
              description={chartDescription}
              scope={scope}
              granularity={granularity}
            />

            <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
              <BacktestTable rows={backtestRows} />

              <div className="glass rounded-3xl p-5 lg:p-6">
                <div className="mb-4 flex items-center gap-2 text-white">
                  <Scale size={18} />
                  <h3 className="text-lg font-semibold">Leitura do painel</h3>
                </div>

                <div className="space-y-3 text-sm leading-6 text-slate-300">
                  {isBacktest ? (
                    <>
                      <p>
                        Em ano específico, o painel entra em modo{" "}
                        <strong>backtest</strong>. Os cards de 6m e 12m mostram{" "}
                        <strong>erro absoluto médio</strong>, não projeção futura.
                      </p>
                      <p>
                        As linhas do gráfico mostram como a IA se comportou no
                        histórico daquele recorte.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        Em <strong>Todos</strong>, o painel mostra a previsão
                        atual/futura a partir da base mais recente.
                      </p>
                      <p>
                        O destaque visual e a bolinha pulsante aparecem quando a
                        previsão ultrapassa <strong>{threshold}%</strong>.
                      </p>
                    </>
                  )}

                  {scope === "global" && (
                    <p>
                      Na visão global, o gráfico usa{" "}
                      <strong>média simples das unidades</strong> e prioriza
                      leitura executiva, com menos ruído visual do que a visão
                      micro.
                    </p>
                  )}

                  <p>
                    A tabela de backtest resume os modelos com menor erro no
                    recorte selecionado.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}