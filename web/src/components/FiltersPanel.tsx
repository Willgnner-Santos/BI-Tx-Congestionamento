"use client";

import { useEffect, useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  comarcas: string[];
  serventias: string[];
  current: {
    scope: "unit" | "global";
    granularity: "monthly" | "annual";
    comarca: string;
    serventia: string;
    show6: boolean;
    show12: boolean;
  };
};

type FormState = Props["current"];

export function FiltersPanel({ comarcas, serventias, current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(current);

  useEffect(() => {
    setForm(current);
  }, [current]);

  function pushQuery(next: FormState, options?: { resetServentia?: boolean }) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());

      params.set("scope", next.scope);
      params.set("granularity", next.granularity);
      params.delete("ano");

      if (next.scope === "unit") {
        params.set("comarca", next.comarca);

        if (options?.resetServentia) {
          params.delete("serventia");
        } else if (next.serventia) {
          params.set("serventia", next.serventia);
        }
      } else {
        params.delete("comarca");
        params.delete("serventia");
      }

      if (next.show6) params.set("show6", "1");
      else params.delete("show6");

      if (next.show12) params.set("show12", "1");
      else params.delete("show12");

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function onScopeChange(value: "unit" | "global") {
    const next: FormState = { ...form, scope: value };
    setForm(next);
    pushQuery(next);
  }

  function onGranularityChange(value: "monthly" | "annual") {
    const next: FormState = { ...form, granularity: value };
    setForm(next);
    pushQuery(next);
  }

  function onComarcaChange(value: string) {
    const next: FormState = { ...form, comarca: value };
    setForm(next);
    pushQuery(next, { resetServentia: true });
  }

  function onServentiaChange(value: string) {
    const next: FormState = { ...form, serventia: value };
    setForm(next);
    pushQuery(next);
  }

  function onToggleForecast(key: "show6" | "show12", checked: boolean) {
    const next: FormState = { ...form, [key]: checked };
    setForm(next);
    pushQuery(next);
  }

  return (
    <aside className="glass rounded-3xl p-5 lg:sticky lg:top-6">
      <div className="mb-5">
        <h2 className="text-2xl font-semibold text-white">Filtros</h2>
        <p className="mt-1 text-sm text-slate-300">Refine a análise por recorte.</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
            Escopo
          </label>
          <select
            value={form.scope}
            onChange={(e) => onScopeChange(e.target.value as "unit" | "global")}
            disabled={isPending}
            className="w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-white outline-none transition focus:border-cyan-400 disabled:opacity-70"
          >
            <option value="unit">Unidade</option>
            <option value="global">Global</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
            Visão
          </label>
          <select
            value={form.granularity}
            onChange={(e) => onGranularityChange(e.target.value as "monthly" | "annual")}
            disabled={isPending}
            className="w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-white outline-none transition focus:border-cyan-400 disabled:opacity-70"
          >
            <option value="monthly">Mensal</option>
            <option value="annual">Anual</option>
          </select>
        </div>

        {form.scope === "unit" && (
          <>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                Comarca
              </label>
              <select
                value={form.comarca}
                onChange={(e) => onComarcaChange(e.target.value)}
                disabled={isPending}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-white outline-none transition focus:border-cyan-400 disabled:opacity-70"
              >
                {comarcas.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                Serventia
              </label>
              <select
                value={form.serventia}
                onChange={(e) => onServentiaChange(e.target.value)}
                disabled={isPending}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-white outline-none transition focus:border-cyan-400 disabled:opacity-70"
              >
                {serventias.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div>
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
            Exibir previsões
          </span>

          <label className="mb-2 flex items-center gap-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={form.show6}
              onChange={(e) => onToggleForecast("show6", e.target.checked)}
              disabled={isPending}
              className="h-4 w-4 accent-cyan-400"
            />
            Linha 6 meses
          </label>

          <label className="flex items-center gap-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={form.show12}
              onChange={(e) => onToggleForecast("show12", e.target.checked)}
              disabled={isPending}
              className="h-4 w-4 accent-cyan-400"
            />
            Linha 12 meses
          </label>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-xs text-slate-300">
          <div>
            {isPending ? (
              <span className="inline-flex items-center gap-2 text-cyan-300">
                <LoaderCircle size={14} className="animate-spin" />
                Atualizando painel...
              </span>
            ) : (
              <span>
                Atualização automática ativada. Ao trocar um filtro, o painel recarrega sozinho.
              </span>
            )}
          </div>

          <div className="mt-3 border-t border-white/10 pt-3 leading-5 text-slate-300">
            Solução desenvolvida pela <strong className="text-white">Diretoria de Inteligência Artificial, Ciência de Dados e Estatística – DIACDE</strong>.
          </div>
        </div>
      </div>
    </aside>
  );
}


// "use client";

// import { useEffect, useState, useTransition } from "react";
// import { LoaderCircle } from "lucide-react";
// import { usePathname, useRouter, useSearchParams } from "next/navigation";

// type Props = {
//     comarcas: string[];
//     serventias: string[];
//     current: {
//         scope: "unit" | "global";
//         granularity: "monthly" | "annual";
//         comarca: string;
//         serventia: string;
//         show6: boolean;
//         show12: boolean;
//     };
// };

// type FormState = Props["current"];

// function normalizeFormState(state: FormState): FormState {
//     if (state.scope === "global") {
//         return {
//             ...state,
//             show6: false,
//             show12: false,
//         };
//     }

//     return state;
// }

// export function FiltersPanel({
//     comarcas,
//     serventias,
//     current,
// }: Props) {
//     const router = useRouter();
//     const pathname = usePathname();
//     const searchParams = useSearchParams();
//     const [isPending, startTransition] = useTransition();
//     const [form, setForm] = useState<FormState>(normalizeFormState(current));

//     useEffect(() => {
//         setForm(normalizeFormState(current));
//     }, [current]);

//     const isGlobalScope = form.scope === "global";

//     function pushQuery(nextState: FormState, options?: { resetServentia?: boolean }) {
//         const next = normalizeFormState(nextState);

//         startTransition(() => {
//             const params = new URLSearchParams(searchParams.toString());

//             params.set("scope", next.scope);
//             params.set("granularity", next.granularity);

//             // Mantém o painel sempre trabalhando com toda a base histórica.
//             params.delete("ano");

//             if (next.scope === "unit") {
//                 params.set("comarca", next.comarca);

//                 if (options?.resetServentia) {
//                     params.delete("serventia");
//                 } else if (next.serventia) {
//                     params.set("serventia", next.serventia);
//                 }
//             } else {
//                 params.delete("comarca");
//                 params.delete("serventia");
//             }

//             if (next.scope === "unit" && next.show6) {
//                 params.set("show6", "1");
//             } else {
//                 params.delete("show6");
//             }

//             if (next.scope === "unit" && next.show12) {
//                 params.set("show12", "1");
//             } else {
//                 params.delete("show12");
//             }

//             const qs = params.toString();
//             router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
//         });
//     }

//     function onScopeChange(value: "unit" | "global") {
//         const next: FormState =
//             value === "global"
//                 ? {
//                     ...form,
//                     scope: value,
//                     show6: false,
//                     show12: false,
//                 }
//                 : {
//                     ...form,
//                     scope: value,
//                 };

//         setForm(next);
//         pushQuery(next);
//     }

//     function onGranularityChange(value: "monthly" | "annual") {
//         const next = normalizeFormState({ ...form, granularity: value });
//         setForm(next);
//         pushQuery(next);
//     }

//     function onComarcaChange(value: string) {
//         const next = normalizeFormState({ ...form, comarca: value });
//         setForm(next);
//         pushQuery(next, { resetServentia: true });
//     }

//     function onServentiaChange(value: string) {
//         const next = normalizeFormState({ ...form, serventia: value });
//         setForm(next);
//         pushQuery(next);
//     }

//     function onToggleForecast(key: "show6" | "show12", checked: boolean) {
//         const next = normalizeFormState({ ...form, [key]: checked });
//         setForm(next);
//         pushQuery(next);
//     }

//     return (
//         <aside className="glass rounded-3xl p-5 lg:sticky lg:top-6">
//             <div className="mb-5">
//                 <h2 className="text-2xl font-semibold text-white">Filtros</h2>
//                 <p className="mt-1 text-sm text-slate-300">
//                     Refine a análise por recorte.
//                 </p>
//             </div>

//             <div className="space-y-5">
//                 <div>
//                     <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
//                         Escopo
//                     </label>
//                     <select
//                         value={form.scope}
//                         onChange={(e) => onScopeChange(e.target.value as "unit" | "global")}
//                         disabled={isPending}
//                         className="w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-white outline-none transition focus:border-cyan-400 disabled:opacity-70"
//                     >
//                         <option value="unit">Unidade</option>
//                         <option value="global">Global</option>
//                     </select>
//                 </div>

//                 <div>
//                     <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
//                         Visão
//                     </label>
//                     <select
//                         value={form.granularity}
//                         onChange={(e) =>
//                             onGranularityChange(e.target.value as "monthly" | "annual")
//                         }
//                         disabled={isPending}
//                         className="w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-white outline-none transition focus:border-cyan-400 disabled:opacity-70"
//                     >
//                         <option value="monthly">Mensal</option>
//                         <option value="annual">Anual</option>
//                     </select>
//                 </div>

//                 {form.scope === "unit" && (
//                     <>
//                         <div>
//                             <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
//                                 Comarca
//                             </label>
//                             <select
//                                 value={form.comarca}
//                                 onChange={(e) => onComarcaChange(e.target.value)}
//                                 disabled={isPending}
//                                 className="w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-white outline-none transition focus:border-cyan-400 disabled:opacity-70"
//                             >
//                                 {comarcas.map((item) => (
//                                     <option key={item} value={item}>
//                                         {item}
//                                     </option>
//                                 ))}
//                             </select>
//                         </div>

//                         <div>
//                             <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
//                                 Serventia
//                             </label>
//                             <select
//                                 value={form.serventia}
//                                 onChange={(e) => onServentiaChange(e.target.value)}
//                                 disabled={isPending}
//                                 className="w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-white outline-none transition focus:border-cyan-400 disabled:opacity-70"
//                             >
//                                 {serventias.map((item) => (
//                                     <option key={item} value={item}>
//                                         {item}
//                                     </option>
//                                 ))}
//                             </select>
//                         </div>
//                     </>
//                 )}

//                 {!isGlobalScope ? (
//                     <div>
//                         <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
//                             Exibir previsões
//                         </span>

//                         <label className="mb-2 flex items-center gap-3 text-sm text-slate-200">
//                             <input
//                                 type="checkbox"
//                                 checked={form.show6}
//                                 onChange={(e) => onToggleForecast("show6", e.target.checked)}
//                                 disabled={isPending}
//                                 className="h-4 w-4 accent-cyan-400"
//                             />
//                             Linha 6 meses
//                         </label>

//                         <label className="flex items-center gap-3 text-sm text-slate-200">
//                             <input
//                                 type="checkbox"
//                                 checked={form.show12}
//                                 onChange={(e) => onToggleForecast("show12", e.target.checked)}
//                                 disabled={isPending}
//                                 className="h-4 w-4 accent-cyan-400"
//                             />
//                             Linha 12 meses
//                         </label>
//                     </div>
//                 ) : (
//                     <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-xs leading-5 text-slate-300">
//                         Na visão global, o painel exibe somente a série histórica
//                         consolidada de todas as comarcas e serventias.
//                         <br />
//                         As previsões continuam disponíveis apenas no escopo de unidade.
//                     </div>
//                 )}

//                 <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-xs text-slate-300">
//                     <div>
//                         {isPending ? (
//                             <span className="inline-flex items-center gap-2 text-cyan-300">
//                                 <LoaderCircle size={14} className="animate-spin" />
//                                 Atualizando painel...
//                             </span>
//                         ) : (
//                             <span>
//                                 Atualização automática ativada. Ao trocar um filtro, o painel
//                                 recarrega sozinho.
//                             </span>
//                         )}
//                     </div>

//                     <div className="mt-3 border-t border-white/10 pt-3 leading-5 text-slate-300">
//                         Solução desenvolvida pela{" "}
//                         <strong className="text-white">
//                             Diretoria de Inteligência Artificial, Ciência de Dados e
//                             Estatística – DIACDE
//                         </strong>.
//                     </div>
//                 </div>
//             </div>
//         </aside>
//     );
// }