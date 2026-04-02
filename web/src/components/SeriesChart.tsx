"use client";

import type { ChartPoint, GranularityMode, ScopeMode } from "@/lib/dashboard";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  data: ChartPoint[];
  threshold: number;
  show6: boolean;
  show12: boolean;
  showThreshold: boolean;
  description: string;
  scope: ScopeMode;
  granularity: GranularityMode;
};

type ChartDotProps = {
  cx?: number;
  cy?: number;
  value?: number | string | null;
  dataKey?: string | number | ((obj: any) => any);
  stroke?: string;
  fill?: string;
  payload?: ChartPoint;
};

function formatPercent(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "-";
  return `${Number(value).toFixed(2)}%`;
}

function LegendItem({ color, label, dashed = false, subtle = false }: { color: string; label: string; dashed?: boolean; subtle?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2 text-sm ${subtle ? "text-slate-400" : "text-slate-200"}`}>
      <span
        className="inline-block h-3 w-3 rounded-full"
        style={{
          backgroundColor: color,
          opacity: subtle ? 0.65 : 1,
          boxShadow: subtle ? "none" : `0 0 12px ${color}`,
          border: dashed ? "2px dashed rgba(255,255,255,0.45)" : "none",
        }}
      />
      <span>{label}</span>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey?: string; name?: string; value?: number | string | null; color?: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;

  const filtered = payload.filter(
    (item) => item.value !== null && item.value !== undefined && item.dataKey !== "connector6" && item.dataKey !== "connector12"
  );

  if (filtered.length === 0) return null;

  const order = ["real", "prev6", "prev12"];
  filtered.sort((a, b) => order.indexOf(String(a.dataKey)) - order.indexOf(String(b.dataKey)));

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 shadow-2xl">
      <div className="mb-2 text-base font-semibold text-white">{label}</div>
      <div className="space-y-1.5">
        {filtered.map((item) => (
          <div key={`${item.dataKey}-${item.name}`} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: item.color || "#fff" }} />
              <span className="text-sm text-slate-200">{item.name}</span>
            </div>
            <span className="text-sm font-semibold text-white">{formatPercent(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SeriesChart({ data, threshold, show6, show12, showThreshold, description, scope, granularity }: Props) {
  const isGlobalScope = scope === "global";
  const annualExecutive = isGlobalScope && granularity === "annual";

  const chartData = isGlobalScope
    ? data.filter((d) => d.real !== null || d.prev6 !== null || d.prev12 !== null)
    : data;

  const realPointCount = chartData.filter((d) => d.real !== null && d.real !== undefined).length;
  const hasSingleRealPoint = realPointCount === 1;

  const show6Line = show6;
  const show12Line = show12;
  const showThresholdLine = showThreshold;

  const chartTitle = isGlobalScope
    ? granularity === "annual"
      ? "Série anual consolidada do tribunal"
      : "Série mensal consolidada do tribunal"
    : "Série temporal (real x previsão)";

  const chartDescription = isGlobalScope
    ? granularity === "annual"
      ? "Visão global consolidada do tribunal, em base anual, com projeções próprias do escopo global."
      : "Visão global consolidada do tribunal, em base mensal, com projeções próprias do escopo global."
    : description;

  const lastPrev6Date = [...data].filter((d) => d.prev6 !== null && d.prev6 !== undefined).at(-1)?.date ?? null;
  const lastPrev12Date = [...data].filter((d) => d.prev12 !== null && d.prev12 !== undefined).at(-1)?.date ?? null;

  function renderDot(series: "real" | "prev6" | "prev12") {
    return (props: ChartDotProps) => {
      const { cx, cy, value, dataKey, stroke, fill, payload } = props;

      if (cx === undefined || cy === undefined || value === null || value === undefined || !payload) return null;

      const numericValue = Number(value);
      const color = stroke || fill || "#ffffff";
      const pointDate = payload.date;
      const key = String(dataKey ?? series);

      if (!isGlobalScope) {
        const isForecast = key === "prev6" || key === "prev12";
        const isAlert = isForecast && numericValue > threshold;

        if (isAlert) {
          return (
            <g>
              <circle cx={cx} cy={cy} r={7} fill={color} opacity={0.95} />
              <circle cx={cx} cy={cy} r={10} fill="none" stroke={color} strokeWidth={2} opacity={0.7}>
                <animate attributeName="r" values="10;18;10" dur="1.3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0.05;0.7" dur="1.3s" repeatCount="indefinite" />
              </circle>
              <circle cx={cx} cy={cy} r={14} fill="none" stroke={color} strokeWidth={1.5} opacity={0.35}>
                <animate attributeName="r" values="14;24;14" dur="1.7s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.35;0.03;0.35" dur="1.7s" repeatCount="indefinite" />
              </circle>
            </g>
          );
        }

        if (isForecast) {
          return <circle cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={1.5} />;
        }

        return <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="white" strokeWidth={1} />;
      }

      if (series === "real") {
        if (hasSingleRealPoint) {
          return <circle cx={cx} cy={cy} r={6} fill={color} stroke="white" strokeWidth={1.5} />;
        }
        return annualExecutive ? null : <circle cx={cx} cy={cy} r={2.5} fill={color} opacity={0.65} />;
      }

      const isLastForecast = (series === "prev6" && pointDate === lastPrev6Date) || (series === "prev12" && pointDate === lastPrev12Date);
      if (!isLastForecast) return null;

      const isAlert = numericValue > threshold;
      if (isAlert) {
        return (
          <g>
            <circle cx={cx} cy={cy} r={7} fill={color} opacity={0.98} />
            <circle cx={cx} cy={cy} r={10} fill="none" stroke={color} strokeWidth={2} opacity={0.7}>
              <animate attributeName="r" values="10;18;10" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0.04;0.7" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx={cx} cy={cy} r={15} fill="none" stroke={color} strokeWidth={1.5} opacity={0.28}>
              <animate attributeName="r" values="15;26;15" dur="1.9s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.28;0.03;0.28" dur="1.9s" repeatCount="indefinite" />
            </circle>
          </g>
        );
      }

      return <circle cx={cx} cy={cy} r={6} fill={color} stroke="white" strokeWidth={1.5} />;
    };
  }

  return (
    <div className="glass rounded-3xl p-5 lg:p-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{chartTitle}</h3>
          <p className="text-sm text-slate-400">{chartDescription}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <LegendItem color="#34d399" label="Real" />
          {show6Line && <LegendItem color="#38bdf8" label="Prev. 6m" dashed />}
          {show12Line && <LegendItem color="#a78bfa" label="Prev. 12m" dashed />}
        </div>
      </div>

      <div className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" />

            <XAxis dataKey="label" tick={{ fill: "#cbd5e1", fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: "#cbd5e1", fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />

            {showThresholdLine && (
              <ReferenceLine
                y={threshold}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                label={{ value: `Alerta ${threshold}%`, fill: "#fbbf24", fontSize: 12 }}
              />
            )}

            <Line type="monotone" dataKey="real" name="Real" stroke="#34d399" strokeWidth={isGlobalScope ? 3.5 : 3} dot={renderDot("real")} activeDot={{ r: hasSingleRealPoint ? 7 : 5 }} connectNulls />

            {show6Line && (
              <Line type="linear" dataKey="connector6" stroke="#38bdf8" strokeWidth={2} strokeDasharray="3 4" dot={false} activeDot={false} connectNulls isAnimationActive={false} />
            )}

            {show6Line && (
              <Line type="monotone" dataKey="prev6" name="Prev. 6m" stroke="#38bdf8" strokeWidth={3} strokeDasharray="6 4" dot={renderDot("prev6")} activeDot={{ r: 6 }} connectNulls />
            )}

            {show12Line && (
              <Line type="linear" dataKey="connector12" stroke="#a78bfa" strokeWidth={2} strokeDasharray="3 4" dot={false} activeDot={false} connectNulls isAnimationActive={false} />
            )}

            {show12Line && (
              <Line type="monotone" dataKey="prev12" name="Prev. 12m" stroke="#a78bfa" strokeWidth={3} strokeDasharray="6 4" dot={renderDot("prev12")} activeDot={{ r: 6 }} connectNulls />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


// "use client";

// import type { ChartPoint, GranularityMode, ScopeMode } from "@/lib/dashboard";
// import {
//     CartesianGrid,
//     Line,
//     LineChart,
//     ReferenceLine,
//     ResponsiveContainer,
//     Tooltip,
//     XAxis,
//     YAxis,
// } from "recharts";

// type Props = {
//     data: ChartPoint[];
//     threshold: number;
//     show6: boolean;
//     show12: boolean;
//     showThreshold: boolean;
//     description: string;
//     scope: ScopeMode;
//     granularity: GranularityMode;
// };

// type ChartDotProps = {
//     cx?: number;
//     cy?: number;
//     value?: number | string | null;
//     dataKey?: string | number | ((obj: any) => any);
//     stroke?: string;
//     fill?: string;
//     payload?: ChartPoint;
// };

// function formatPercent(value: number | string | null | undefined) {
//     if (value === null || value === undefined) return "-";
//     return `${Number(value).toFixed(2)}%`;
// }

// function LegendItem({
//     color,
//     label,
//     dashed = false,
//     subtle = false,
// }: {
//     color: string;
//     label: string;
//     dashed?: boolean;
//     subtle?: boolean;
// }) {
//     return (
//         <div
//             className={`inline-flex items-center gap-2 text-sm ${subtle ? "text-slate-400" : "text-slate-200"
//                 }`}
//         >
//             <span
//                 className="inline-block h-3 w-3 rounded-full"
//                 style={{
//                     backgroundColor: color,
//                     opacity: subtle ? 0.65 : 1,
//                     boxShadow: subtle ? "none" : `0 0 12px ${color}`,
//                     border: dashed ? "2px dashed rgba(255,255,255,0.45)" : "none",
//                 }}
//             />
//             <span>{label}</span>
//         </div>
//     );
// }

// function CustomTooltip({
//     active,
//     payload,
//     label,
// }: {
//     active?: boolean;
//     payload?: Array<{
//         dataKey?: string;
//         name?: string;
//         value?: number | string | null;
//         color?: string;
//     }>;
//     label?: string;
// }) {
//     if (!active || !payload || payload.length === 0) return null;

//     const filtered = payload.filter(
//         (item) =>
//             item.value !== null &&
//             item.value !== undefined &&
//             item.dataKey !== "connector6" &&
//             item.dataKey !== "connector12"
//     );

//     if (filtered.length === 0) return null;

//     const order = ["real", "prev6", "prev12"];
//     filtered.sort(
//         (a, b) => order.indexOf(String(a.dataKey)) - order.indexOf(String(b.dataKey))
//     );

//     return (
//         <div className="rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 shadow-2xl">
//             <div className="mb-2 text-base font-semibold text-white">{label}</div>

//             <div className="space-y-1.5">
//                 {filtered.map((item) => (
//                     <div
//                         key={`${item.dataKey}-${item.name}`}
//                         className="flex items-center justify-between gap-4"
//                     >
//                         <div className="flex items-center gap-2">
//                             <span
//                                 className="inline-block h-3 w-3 rounded-full"
//                                 style={{ backgroundColor: item.color || "#fff" }}
//                             />
//                             <span className="text-sm text-slate-200">{item.name}</span>
//                         </div>
//                         <span className="text-sm font-semibold text-white">
//                             {formatPercent(item.value)}
//                         </span>
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// }

// export function SeriesChart({
//     data,
//     threshold,
//     show6,
//     show12,
//     showThreshold,
//     description,
//     scope,
//     granularity,
// }: Props) {
//     const isGlobalScope = scope === "global";
//     const annualExecutive = isGlobalScope && granularity === "annual";

//     const chartData = isGlobalScope
//         ? data.filter((d) => d.real !== null && d.real !== undefined)
//         : data;

//     const realPointCount = chartData.filter(
//         (d) => d.real !== null && d.real !== undefined
//     ).length;

//     const hasSingleRealPoint = realPointCount === 1;

//     const show6Line = !isGlobalScope && show6;
//     const show12Line = !isGlobalScope && show12;
//     const showThresholdLine = !isGlobalScope && showThreshold;

//     const chartTitle = isGlobalScope
//         ? granularity === "annual"
//             ? "Série anual consolidada"
//             : "Série mensal consolidada"
//         : "Série temporal (real x previsão)";

//     const chartDescription = isGlobalScope
//         ? granularity === "annual"
//             ? "Visão global consolidada de todas as comarcas e serventias, em base anual."
//             : "Visão global consolidada de todas as comarcas e serventias, em base mensal."
//         : description;

//     const lastPrev6Date =
//         [...data].filter((d) => d.prev6 !== null && d.prev6 !== undefined).at(-1)
//             ?.date ?? null;

//     const lastPrev12Date =
//         [...data].filter((d) => d.prev12 !== null && d.prev12 !== undefined).at(-1)
//             ?.date ?? null;

//     function renderDot(series: "real" | "prev6" | "prev12") {
//         return (props: ChartDotProps) => {
//             const { cx, cy, value, dataKey, stroke, fill, payload } = props;

//             if (
//                 cx === undefined ||
//                 cy === undefined ||
//                 value === null ||
//                 value === undefined ||
//                 !payload
//             ) {
//                 return null;
//             }

//             const numericValue = Number(value);
//             const color = stroke || fill || "#ffffff";
//             const pointDate = payload.date;
//             const key = String(dataKey ?? series);

//             if (!isGlobalScope) {
//                 const isForecast = key === "prev6" || key === "prev12";
//                 const isAlert = isForecast && numericValue > threshold;

//                 if (isAlert) {
//                     return (
//                         <g>
//                             <circle cx={cx} cy={cy} r={7} fill={color} opacity={0.95} />
//                             <circle
//                                 cx={cx}
//                                 cy={cy}
//                                 r={10}
//                                 fill="none"
//                                 stroke={color}
//                                 strokeWidth={2}
//                                 opacity={0.7}
//                             >
//                                 <animate
//                                     attributeName="r"
//                                     values="10;18;10"
//                                     dur="1.3s"
//                                     repeatCount="indefinite"
//                                 />
//                                 <animate
//                                     attributeName="opacity"
//                                     values="0.7;0.05;0.7"
//                                     dur="1.3s"
//                                     repeatCount="indefinite"
//                                 />
//                             </circle>
//                             <circle
//                                 cx={cx}
//                                 cy={cy}
//                                 r={14}
//                                 fill="none"
//                                 stroke={color}
//                                 strokeWidth={1.5}
//                                 opacity={0.35}
//                             >
//                                 <animate
//                                     attributeName="r"
//                                     values="14;24;14"
//                                     dur="1.7s"
//                                     repeatCount="indefinite"
//                                 />
//                                 <animate
//                                     attributeName="opacity"
//                                     values="0.35;0.03;0.35"
//                                     dur="1.7s"
//                                     repeatCount="indefinite"
//                                 />
//                             </circle>
//                         </g>
//                     );
//                 }

//                 if (isForecast) {
//                     return (
//                         <circle
//                             cx={cx}
//                             cy={cy}
//                             r={5}
//                             fill={color}
//                             stroke="white"
//                             strokeWidth={1.5}
//                         />
//                     );
//                 }

//                 return (
//                     <circle
//                         cx={cx}
//                         cy={cy}
//                         r={3.5}
//                         fill={color}
//                         stroke="white"
//                         strokeWidth={1}
//                     />
//                 );
//             }

//             if (series === "real") {
//                 if (hasSingleRealPoint) {
//                     return (
//                         <circle
//                             cx={cx}
//                             cy={cy}
//                             r={6}
//                             fill={color}
//                             stroke="white"
//                             strokeWidth={1.5}
//                         />
//                     );
//                 }

//                 return annualExecutive ? null : (
//                     <circle cx={cx} cy={cy} r={2.5} fill={color} opacity={0.65} />
//                 );
//             }

//             const isLastForecast =
//                 (series === "prev6" && pointDate === lastPrev6Date) ||
//                 (series === "prev12" && pointDate === lastPrev12Date);

//             if (!isLastForecast) {
//                 return null;
//             }

//             const isAlert = numericValue > threshold;

//             if (isAlert) {
//                 return (
//                     <g>
//                         <circle cx={cx} cy={cy} r={7} fill={color} opacity={0.98} />
//                         <circle
//                             cx={cx}
//                             cy={cy}
//                             r={10}
//                             fill="none"
//                             stroke={color}
//                             strokeWidth={2}
//                             opacity={0.7}
//                         >
//                             <animate
//                                 attributeName="r"
//                                 values="10;18;10"
//                                 dur="1.5s"
//                                 repeatCount="indefinite"
//                             />
//                             <animate
//                                 attributeName="opacity"
//                                 values="0.7;0.04;0.7"
//                                 dur="1.5s"
//                                 repeatCount="indefinite"
//                             />
//                         </circle>
//                         <circle
//                             cx={cx}
//                             cy={cy}
//                             r={15}
//                             fill="none"
//                             stroke={color}
//                             strokeWidth={1.5}
//                             opacity={0.28}
//                         >
//                             <animate
//                                 attributeName="r"
//                                 values="15;26;15"
//                                 dur="1.9s"
//                                 repeatCount="indefinite"
//                             />
//                             <animate
//                                 attributeName="opacity"
//                                 values="0.28;0.03;0.28"
//                                 dur="1.9s"
//                                 repeatCount="indefinite"
//                             />
//                         </circle>
//                     </g>
//                 );
//             }

//             return (
//                 <circle
//                     cx={cx}
//                     cy={cy}
//                     r={6}
//                     fill={color}
//                     stroke="white"
//                     strokeWidth={1.5}
//                 />
//             );
//         };
//     }

//     return (
//         <div className="glass rounded-3xl p-5 lg:p-6">
//             <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
//                 <div>
//                     <h3 className="text-lg font-semibold text-white">{chartTitle}</h3>
//                     <p className="text-sm text-slate-400">{chartDescription}</p>
//                 </div>

//                 <div className="flex flex-wrap items-center gap-4">
//                     <LegendItem color="#34d399" label="Real" />
//                     {show6Line && <LegendItem color="#38bdf8" label="Prev. 6m" dashed />}
//                     {show12Line && (
//                         <LegendItem color="#a78bfa" label="Prev. 12m" dashed />
//                     )}
//                 </div>
//             </div>

//             <div className="h-[420px] w-full">
//                 <ResponsiveContainer width="100%" height="100%">
//                     <LineChart
//                         data={chartData}
//                         margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
//                     >
//                         <CartesianGrid
//                             stroke="rgba(148,163,184,0.12)"
//                             strokeDasharray="3 3"
//                         />

//                         <XAxis
//                             dataKey="label"
//                             tick={{ fill: "#cbd5e1", fontSize: 12 }}
//                             tickLine={false}
//                             axisLine={false}
//                         />

//                         <YAxis
//                             domain={[0, 100]}
//                             tickFormatter={(value) => `${value}%`}
//                             tick={{ fill: "#cbd5e1", fontSize: 12 }}
//                             tickLine={false}
//                             axisLine={false}
//                         />

//                         <Tooltip content={<CustomTooltip />} />

//                         {showThresholdLine && (
//                             <ReferenceLine
//                                 y={threshold}
//                                 stroke="#f59e0b"
//                                 strokeDasharray="5 5"
//                                 label={{
//                                     value: `Alerta ${threshold}%`,
//                                     fill: "#fbbf24",
//                                     fontSize: 12,
//                                 }}
//                             />
//                         )}

//                         <Line
//                             type="monotone"
//                             dataKey="real"
//                             name="Real"
//                             stroke="#34d399"
//                             strokeWidth={isGlobalScope ? 3.5 : 3}
//                             dot={renderDot("real")}
//                             activeDot={{ r: hasSingleRealPoint ? 7 : 5 }}
//                             connectNulls
//                         />

//                         {show6Line && !isGlobalScope && (
//                             <Line
//                                 type="linear"
//                                 dataKey="connector6"
//                                 stroke="#38bdf8"
//                                 strokeWidth={2}
//                                 strokeDasharray="3 4"
//                                 dot={false}
//                                 activeDot={false}
//                                 connectNulls
//                                 isAnimationActive={false}
//                             />
//                         )}

//                         {show6Line && (
//                             <Line
//                                 type="monotone"
//                                 dataKey="prev6"
//                                 name="Prev. 6m"
//                                 stroke="#38bdf8"
//                                 strokeWidth={3}
//                                 strokeDasharray="6 4"
//                                 dot={renderDot("prev6")}
//                                 activeDot={{ r: 6 }}
//                                 connectNulls
//                             />
//                         )}

//                         {show12Line && !isGlobalScope && (
//                             <Line
//                                 type="linear"
//                                 dataKey="connector12"
//                                 stroke="#a78bfa"
//                                 strokeWidth={2}
//                                 strokeDasharray="3 4"
//                                 dot={false}
//                                 activeDot={false}
//                                 connectNulls
//                                 isAnimationActive={false}
//                             />
//                         )}

//                         {show12Line && (
//                             <Line
//                                 type="monotone"
//                                 dataKey="prev12"
//                                 name="Prev. 12m"
//                                 stroke="#a78bfa"
//                                 strokeWidth={3}
//                                 strokeDasharray="6 4"
//                                 dot={renderDot("prev12")}
//                                 activeDot={{ r: 6 }}
//                                 connectNulls
//                             />
//                         )}
//                     </LineChart>
//                 </ResponsiveContainer>
//             </div>
//         </div>
//     );
// }