import { pool } from "@/lib/db";

export type ScopeMode = "unit" | "global";
export type GranularityMode = "monthly" | "annual";
export type DashboardMode = "forecast" | "backtest";

export type Filters = {
    scope: ScopeMode;
    granularity: GranularityMode;
    comarca: string;
    serventia: string;
    ano: string;
    show6: boolean;
    show12: boolean;
};

export type FilterOptions = {
    comarcas: string[];
    serventias: string[];
    anos: string[];
    effectiveComarca: string;
};

export type SummaryData = {
    mode: DashboardMode;
    base_date: string | null;
    unit_label: string;
    model_6: string;
    model_12: string;
    real_m1: number | null;
    real_m2: number | null;
    real_m3: number | null;
    metric_6: number | null;
    metric_12: number | null;
};

export type ChartPoint = {
    date: string;
    label: string;
    real: number | null;
    prev6: number | null;
    prev12: number | null;
    connector6: number | null;
    connector12: number | null;
};

export type BacktestRow = {
    model: string;
    mae: number;
    pontos: number;
};

const tableColumnsCache = new Map<string, string[]>();

function toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function toISODate(value: string | Date): string {
    return new Date(value).toISOString().slice(0, 10);
}

function formatBucketLabel(
    value: string | Date,
    granularity: GranularityMode
): string {
    const date = new Date(value);

    if (granularity === "annual") {
        return String(date.getUTCFullYear());
    }

    return new Intl.DateTimeFormat("pt-BR", {
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}

function quoteIdent(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}

function getBucketExpr(granularity: GranularityMode): string {
    if (granularity === "annual") {
        return `date_trunc('year', ds)::date`;
    }

    return `date_trunc('month', ds)::date`;
}

function createEmptyChartPoint(
    value: string | Date,
    granularity: GranularityMode
): ChartPoint {
    return {
        date: toISODate(value),
        label: formatBucketLabel(value, granularity),
        real: null,
        prev6: null,
        prev12: null,
        connector6: null,
        connector12: null,
    };
}

function sortByBucketAsc<T extends { bucket: string | Date }>(a: T, b: T) {
    return (
        new Date(String(a.bucket)).getTime() -
        new Date(String(b.bucket)).getTime()
    );
}

async function getTableColumns(tableName: string): Promise<string[]> {
    const cached = tableColumnsCache.get(tableName);
    if (cached) return cached;

    const result = await pool.query<{ column_name: string }>(
        `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    ORDER BY ordinal_position
    `,
        [tableName]
    );

    const columns = result.rows.map((r) => r.column_name);
    tableColumnsCache.set(tableName, columns);
    return columns;
}

function pickColumn(
    columns: string[],
    candidates: string[],
    tableName: string,
    label: string
): string {
    const found = candidates.find((candidate) => columns.includes(candidate));

    if (!found) {
        throw new Error(
            `Não encontrei a coluna de ${label} na tabela ${tableName}. Colunas disponíveis: ${columns.join(", ")}`
        );
    }

    return found;
}

async function getRealValueColumn(): Promise<string> {
    const columns = await getTableColumns("bi_timeseries_real_long");
    return pickColumn(
        columns,
        ["y_real", "y"],
        "bi_timeseries_real_long",
        "valor real"
    );
}

async function getForecastMeta() {
    const columns = await getTableColumns("bi_forecast_champion_long");

    return {
        horizonColumn: pickColumn(
            columns,
            ["horizon"],
            "bi_forecast_champion_long",
            "horizonte"
        ),
        predColumn: pickColumn(
            columns,
            ["y_pred", "pred", "forecast", "yhat"],
            "bi_forecast_champion_long",
            "previsão"
        ),
    };
}

async function getBacktestMeta() {
    const columns = await getTableColumns("bi_backtest_predictions_long");

    return {
        modelColumn: pickColumn(
            columns,
            ["model_group_id", "model_used", "model", "modelo", "model_name"],
            "bi_backtest_predictions_long",
            "modelo"
        ),
        horizonColumn: pickColumn(
            columns,
            ["horizon"],
            "bi_backtest_predictions_long",
            "horizonte"
        ),
        trueColumn: pickColumn(
            columns,
            ["y_true", "y_real", "real", "target"],
            "bi_backtest_predictions_long",
            "valor real"
        ),
        predColumn: pickColumn(
            columns,
            ["y_pred", "pred", "forecast", "yhat"],
            "bi_backtest_predictions_long",
            "valor previsto"
        ),
    };
}

function buildScopeWhere(filters: Filters) {
    const params: Array<string | number> = [];
    const whereParts: string[] = [];

    if (filters.scope === "unit") {
        params.push(filters.comarca);
        whereParts.push(`comarca = $${params.length}`);

        params.push(filters.serventia);
        whereParts.push(`serventia = $${params.length}`);
    }

    if (filters.ano !== "Todos") {
        params.push(Number(filters.ano));
        whereParts.push(`EXTRACT(YEAR FROM ds)::int = $${params.length}`);
    }

    const where =
        whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    return { where, params };
}

async function getRecentRealTriplet(filters: Filters) {
    const realValueColumn = await getRealValueColumn();
    const { where, params } = buildScopeWhere(filters);

    const result = await pool.query<{ bucket: string; y: number | string }>(
        `
    SELECT
      date_trunc('month', ds)::date AS bucket,
      AVG(${quoteIdent(realValueColumn)}) AS y
    FROM public.bi_timeseries_real_long
    ${where}
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 3
    `,
        params
    );

    const rows = [...result.rows].reverse();

    return {
        real_m1: rows[0] ? toNumber(rows[0].y) : null,
        real_m2: rows[1] ? toNumber(rows[1].y) : null,
        real_m3: rows[2] ? toNumber(rows[2].y) : null,
        last_date: rows[rows.length - 1]?.bucket ?? null,
    };
}

async function getBacktestBestMetrics(filters: Filters) {
    const { modelColumn, horizonColumn, trueColumn, predColumn } =
        await getBacktestMeta();

    const { where, params } = buildScopeWhere(filters);

    const result = await pool.query<{
        horizon: number | string;
        model: string;
        mae: number | string;
    }>(
        `
    WITH base AS (
      SELECT
        ${quoteIdent(horizonColumn)}::int AS horizon,
        ${quoteIdent(modelColumn)} AS model,
        AVG(ABS(${quoteIdent(trueColumn)} - ${quoteIdent(predColumn)})) AS mae
      FROM public.bi_backtest_predictions_long
      ${where
            ? `${where} AND ${quoteIdent(horizonColumn)} IN (6, 12)`
            : `WHERE ${quoteIdent(horizonColumn)} IN (6, 12)`
        }
      GROUP BY 1, 2
    ),
    ranked AS (
      SELECT
        horizon,
        model,
        mae,
        ROW_NUMBER() OVER (PARTITION BY horizon ORDER BY mae ASC) AS rn
      FROM base
    )
    SELECT horizon, model, mae
    FROM ranked
    WHERE rn = 1
    ORDER BY horizon
    `,
        params
    );

    const row6 = result.rows.find((r) => Number(r.horizon) === 6);
    const row12 = result.rows.find((r) => Number(r.horizon) === 12);

    return {
        model6: row6?.model ?? "-",
        model12: row12?.model ?? "-",
        mae6: row6 ? toNumber(row6.mae) : null,
        mae12: row12 ? toNumber(row12.mae) : null,
    };
}

export async function getFilterOptions(
    selectedComarca?: string
): Promise<FilterOptions> {
    const comarcasResult = await pool.query<{ comarca: string }>(`
    SELECT DISTINCT comarca
    FROM public.bi_summary_wide
    ORDER BY comarca
  `);

    const comarcas = comarcasResult.rows.map((r) => r.comarca);
    const effectiveComarca = selectedComarca || comarcas[0] || "";

    if (!effectiveComarca) {
        return {
            comarcas: [],
            serventias: [],
            anos: ["Todos"],
            effectiveComarca: "",
        };
    }

    const serventiasResult = await pool.query<{ serventia: string }>(
        `
    SELECT DISTINCT serventia
    FROM public.bi_summary_wide
    WHERE comarca = $1
    ORDER BY serventia
    `,
        [effectiveComarca]
    );

    const yearsResult = await pool.query<{ ano: number }>(`
    SELECT DISTINCT EXTRACT(YEAR FROM ds)::int AS ano
    FROM public.bi_timeseries_real_long
    ORDER BY ano
  `);

    return {
        comarcas,
        serventias: serventiasResult.rows.map((r) => r.serventia),
        anos: ["Todos", ...yearsResult.rows.map((r) => String(r.ano))],
        effectiveComarca,
    };
}

export async function getSummary(filters: Filters): Promise<SummaryData | null> {
    const realTriplet = await getRecentRealTriplet(filters);

    if (filters.ano === "Todos") {
        if (filters.scope === "global") {
            const result = await pool.query<{
                base_date: string | null;
                metric_6: number | string;
                metric_12: number | string;
            }>(`
        SELECT
          MAX(last_date)::text AS base_date,
          AVG(pred_6m) AS metric_6,
          AVG(pred_12m) AS metric_12
        FROM public.bi_summary_wide
      `);

            const row = result.rows[0];

            return {
                mode: "forecast",
                base_date: row?.base_date ?? realTriplet.last_date,
                unit_label: "Visão global • média simples das unidades",
                model_6: "média das unidades",
                model_12: "média das unidades",
                real_m1: realTriplet.real_m1,
                real_m2: realTriplet.real_m2,
                real_m3: realTriplet.real_m3,
                metric_6: row ? toNumber(row.metric_6) : null,
                metric_12: row ? toNumber(row.metric_12) : null,
            };
        }

        const result = await pool.query<{
            comarca: string;
            serventia: string;
            last_date: string;
            model_used: string;
            pred_6m: number | string;
            pred_12m: number | string;
        }>(
            `
      SELECT
        comarca,
        serventia,
        last_date::text,
        model_used,
        pred_6m,
        pred_12m
      FROM public.bi_summary_wide
      WHERE comarca = $1
        AND serventia = $2
      ORDER BY last_date DESC
      LIMIT 1
      `,
            [filters.comarca, filters.serventia]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];

        return {
            mode: "forecast",
            base_date: row.last_date,
            unit_label: `${row.comarca} • ${row.serventia}`,
            model_6: row.model_used,
            model_12: row.model_used,
            real_m1: realTriplet.real_m1,
            real_m2: realTriplet.real_m2,
            real_m3: realTriplet.real_m3,
            metric_6: toNumber(row.pred_6m),
            metric_12: toNumber(row.pred_12m),
        };
    }

    const best = await getBacktestBestMetrics(filters);

    return {
        mode: "backtest",
        base_date: filters.ano,
        unit_label:
            filters.scope === "global"
                ? "Visão global • backtest histórico"
                : `${filters.comarca} • ${filters.serventia}`,
        model_6: best.model6,
        model_12: best.model12,
        real_m1: realTriplet.real_m1,
        real_m2: realTriplet.real_m2,
        real_m3: realTriplet.real_m3,
        metric_6: best.mae6,
        metric_12: best.mae12,
    };
}

export async function getChartData(filters: Filters): Promise<ChartPoint[]> {
    const realValueColumn = await getRealValueColumn();
    const bucketExpr = getBucketExpr(filters.granularity);
    const { where, params } = buildScopeWhere(filters);

    const realResult = await pool.query<{ bucket: string; y: number | string }>(
        `
    SELECT
      ${bucketExpr} AS bucket,
      AVG(${quoteIdent(realValueColumn)}) AS y
    FROM public.bi_timeseries_real_long
    ${where}
    GROUP BY 1
    ORDER BY 1
    `,
        params
    );

    const map = new Map<string, ChartPoint>();

    for (const row of realResult.rows) {
        const key = toISODate(row.bucket);
        map.set(key, {
            ...createEmptyChartPoint(row.bucket, filters.granularity),
            real: toNumber(row.y),
        });
    }

    if (filters.ano === "Todos" && realResult.rows.length > 0) {
        const { horizonColumn, predColumn } = await getForecastMeta();

        const forecastParams: Array<string | number> = [];
        const forecastWhereParts: string[] = [];

        if (filters.scope === "unit") {
            forecastParams.push(filters.comarca);
            forecastWhereParts.push(`comarca = $${forecastParams.length}`);

            forecastParams.push(filters.serventia);
            forecastWhereParts.push(`serventia = $${forecastParams.length}`);
        }

        forecastWhereParts.push(`${quoteIdent(horizonColumn)} IN (6, 12)`);

        const forecastResult = await pool.query<{
            bucket: string;
            horizon: number | string;
            y_pred: number | string;
        }>(
            `
      SELECT
        ${getBucketExpr(filters.granularity)} AS bucket,
        ${quoteIdent(horizonColumn)}::int AS horizon,
        AVG(${quoteIdent(predColumn)}) AS y_pred
      FROM public.bi_forecast_champion_long
      WHERE ${forecastWhereParts.join(" AND ")}
      GROUP BY 1, 2
      ORDER BY 1
      `,
            forecastParams
        );

        const lastReal = realResult.rows[realResult.rows.length - 1];
        const lastRealKey = toISODate(lastReal.bucket);
        const lastRealValue = toNumber(lastReal.y);

        function applyFutureSeries(
            rows: Array<{ bucket: string; y_pred: number | string }>,
            kind: "6" | "12"
        ) {
            if (rows.length === 0 || lastRealValue === null) return;

            const firstValue = toNumber(rows[0].y_pred);
            const lastPoint = map.get(lastRealKey);

            if (lastPoint) {
                if (kind === "6") lastPoint.connector6 = lastRealValue;
                if (kind === "12") lastPoint.connector12 = lastRealValue;
                map.set(lastRealKey, lastPoint);
            }

            rows.forEach((row, index) => {
                const key = toISODate(row.bucket);
                const existing =
                    map.get(key) ?? createEmptyChartPoint(row.bucket, filters.granularity);
                const value = toNumber(row.y_pred);

                if (kind === "6") {
                    existing.prev6 = value;
                    if (index === 0) existing.connector6 = firstValue;
                }

                if (kind === "12") {
                    existing.prev12 = value;
                    if (index === 0) existing.connector12 = firstValue;
                }

                map.set(key, existing);
            });
        }

        if (filters.show6) {
            applyFutureSeries(
                forecastResult.rows
                    .filter((r) => Number(r.horizon) === 6)
                    .sort(sortByBucketAsc),
                "6"
            );
        }

        if (filters.show12) {
            applyFutureSeries(
                forecastResult.rows
                    .filter((r) => Number(r.horizon) === 12)
                    .sort(sortByBucketAsc),
                "12"
            );
        }
    }

    if (filters.ano !== "Todos") {
        const { modelColumn, horizonColumn, predColumn } = await getBacktestMeta();
        const best = await getBacktestBestMetrics(filters);

        async function getBacktestSeries(
            horizon: 6 | 12,
            modelName: string
        ): Promise<Array<{ bucket: string; y_pred: number | string }>> {
            if (!modelName || modelName === "-") return [];

            const seriesParams: Array<string | number> = [];
            const whereParts: string[] = [];

            if (filters.scope === "unit") {
                seriesParams.push(filters.comarca);
                whereParts.push(`comarca = $${seriesParams.length}`);

                seriesParams.push(filters.serventia);
                whereParts.push(`serventia = $${seriesParams.length}`);
            }

            seriesParams.push(Number(filters.ano));
            whereParts.push(`EXTRACT(YEAR FROM ds)::int = $${seriesParams.length}`);

            seriesParams.push(horizon);
            whereParts.push(
                `${quoteIdent(horizonColumn)}::int = $${seriesParams.length}`
            );

            seriesParams.push(modelName);
            whereParts.push(`${quoteIdent(modelColumn)} = $${seriesParams.length}`);

            const result = await pool.query<{ bucket: string; y_pred: number | string }>(
                `
        SELECT
          ${bucketExpr} AS bucket,
          AVG(${quoteIdent(predColumn)}) AS y_pred
        FROM public.bi_backtest_predictions_long
        WHERE ${whereParts.join(" AND ")}
        GROUP BY 1
        ORDER BY 1
        `,
                seriesParams
            );

            return result.rows;
        }

        function applyHistoricalSeries(
            rows: Array<{ bucket: string; y_pred: number | string }>,
            kind: "6" | "12"
        ) {
            rows.forEach((row) => {
                const key = toISODate(row.bucket);
                const existing =
                    map.get(key) ?? createEmptyChartPoint(row.bucket, filters.granularity);
                const value = toNumber(row.y_pred);

                if (kind === "6") existing.prev6 = value;
                if (kind === "12") existing.prev12 = value;

                map.set(key, existing);
            });
        }

        if (filters.show6 && best.model6 !== "-") {
            applyHistoricalSeries(
                (await getBacktestSeries(6, best.model6)).sort(sortByBucketAsc),
                "6"
            );
        }

        if (filters.show12 && best.model12 !== "-") {
            applyHistoricalSeries(
                (await getBacktestSeries(12, best.model12)).sort(sortByBucketAsc),
                "12"
            );
        }
    }

    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function getBacktestRanking(
    filters: Filters
): Promise<BacktestRow[]> {
    const { modelColumn, trueColumn, predColumn } = await getBacktestMeta();

    const params: Array<string | number> = [];
    const whereParts: string[] = [];

    if (filters.scope === "unit") {
        params.push(filters.comarca);
        whereParts.push(`comarca = $${params.length}`);

        params.push(filters.serventia);
        whereParts.push(`serventia = $${params.length}`);
    }

    if (filters.ano !== "Todos") {
        params.push(Number(filters.ano));
        whereParts.push(`EXTRACT(YEAR FROM ds)::int = $${params.length}`);
    }

    const where =
        whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    const result = await pool.query<{
        model: string;
        mae: string | number;
        pontos: string | number;
    }>(
        `
    SELECT
      ${quoteIdent(modelColumn)} AS model,
      ROUND(AVG(ABS(${quoteIdent(trueColumn)} - ${quoteIdent(predColumn)}))::numeric, 2) AS mae,
      COUNT(*)::int AS pontos
    FROM public.bi_backtest_predictions_long
    ${where}
    GROUP BY ${quoteIdent(modelColumn)}
    ORDER BY AVG(ABS(${quoteIdent(trueColumn)} - ${quoteIdent(predColumn)})) ASC
    LIMIT 5
    `,
        params
    );

    return result.rows.map((row) => ({
        model: row.model,
        mae: Number(row.mae),
        pontos: Number(row.pontos),
    }));
}