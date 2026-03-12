import type { BacktestRow } from "@/lib/dashboard";

type Props = {
    rows: BacktestRow[];
};

export function BacktestTable({ rows }: Props) {
    return (
        <div className="glass rounded-3xl p-5 lg:p-6">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Backtest resumido</h3>
                <p className="text-sm text-slate-400">
                    Menor MAE = melhor aderência histórica.
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-white/10 text-left text-slate-300">
                            <th className="px-3 py-3">Modelo</th>
                            <th className="px-3 py-3">MAE</th>
                            <th className="px-3 py-3">Pontos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length > 0 ? (
                            rows.map((row) => (
                                <tr key={row.model} className="border-b border-white/5 text-slate-100">
                                    <td className="px-3 py-3">{row.model}</td>
                                    <td className="px-3 py-3">{row.mae.toFixed(2)}</td>
                                    <td className="px-3 py-3">{row.pontos}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
                                    Nenhum dado de backtest encontrado para o recorte selecionado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}