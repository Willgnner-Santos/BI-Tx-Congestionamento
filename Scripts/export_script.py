import os

files_to_export = [
    "docker-compose.yml",
    ".env",
    "Scripts/Carga_banco.py",
    "web/Dockerfile",
    "web/package.json",
    "web/next.config.ts",
    "web/tsconfig.json",
    "web/postcss.config.mjs",
    "web/eslint.config.mjs",
    "web/.env.local",
    "web/src/app/globals.css",
    "web/src/app/layout.tsx",
    "web/src/app/page.tsx",
    "web/src/components/BacktestTable.tsx",
    "web/src/components/FiltersPanel.tsx",
    "web/src/components/SeriesChart.tsx",
    "web/src/lib/dashboard.ts",
    "web/src/lib/db.ts"
]

output_file = "codigo_aplicacao.txt"

with open(output_file, "w", encoding="utf-8") as out:
    for filepath in files_to_export:
        if os.path.exists(filepath):
            out.write(f"{'='*80}\n")
            out.write(f"ARQUIVO: {filepath}\n")
            out.write(f"{'='*80}\n\n")
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    out.write(f.read())
            except Exception as e:
                out.write(f"Erro ao ler arquivo: {e}\n")
            out.write("\n\n")
        else:
            print(f"Arquivo não encontrado: {filepath}")

print("Exportação concluída com sucesso!")
