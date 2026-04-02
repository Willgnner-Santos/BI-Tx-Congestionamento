from __future__ import annotations

from pathlib import Path
from urllib.parse import quote_plus
import os
from typing import Iterable

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# =========================================================
# CONFIGURAÇÃO BASE
# =========================================================
BASE_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = BASE_DIR / ".env"

load_dotenv(ENV_PATH)

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_SCHEMA = os.getenv("DB_SCHEMA", "public")
BI_REPORTS_DIR = os.getenv("BI_REPORTS_DIR")

ARQUIVOS_OBRIGATORIOS = {
    "bi_backtest_predictions_long.csv": "bi_backtest_predictions_long",
    "bi_forecast_champion_long.csv": "bi_forecast_champion_long",
    "bi_summary_wide.csv": "bi_summary_wide",
    "bi_timeseries_real_long.csv": "bi_timeseries_real_long",
}

ARQUIVOS_OPCIONAIS = {
    "bi_forecast_tribunal_long.csv": "bi_forecast_tribunal_long",
    "bi_summary_tribunal.csv": "bi_summary_tribunal",
    "bi_timeseries_tribunal_long.csv": "bi_timeseries_tribunal_long",
}


# =========================================================
# FUNÇÕES AUXILIARES
# =========================================================
def validar_variaveis() -> None:
    obrigatorias = {
        "DB_HOST": DB_HOST,
        "DB_PORT": DB_PORT,
        "DB_NAME": DB_NAME,
        "DB_USER": DB_USER,
        "DB_PASSWORD": DB_PASSWORD,
    }

    faltando = [chave for chave, valor in obrigatorias.items() if not valor]
    if faltando:
        raise ValueError(f"Variáveis ausentes no .env: {', '.join(faltando)}")


def criar_engine():
    senha_codificada = quote_plus(DB_PASSWORD)
    url = (
        f"postgresql+psycopg2://{DB_USER}:{senha_codificada}"
        f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    return create_engine(url, pool_pre_ping=True)


def normalizar_colunas(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [
        col.strip()
        .lower()
        .replace(" ", "_")
        .replace("-", "_")
        .replace("/", "_")
        .replace("(", "")
        .replace(")", "")
        .replace(".", "")
        for col in df.columns
    ]
    return df


def tentar_ler_csv(caminho_csv: Path) -> pd.DataFrame:
    encodings = ["utf-8", "utf-8-sig", "latin1"]

    for encoding in encodings:
        try:
            return pd.read_csv(
                caminho_csv,
                sep=",",
                encoding=encoding,
                low_memory=False,
            )
        except UnicodeDecodeError:
            continue

    raise UnicodeDecodeError(
        "encoding",
        b"",
        0,
        1,
        f"Não foi possível ler o arquivo {caminho_csv.name} com os encodings testados.",
    )


def tratar_tipos(df: pd.DataFrame) -> pd.DataFrame:
    colunas_data = ["ds", "last_date", "base_date"]

    for col in colunas_data:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")

    return df


def resolve_reports_dir() -> Path:
    if BI_REPORTS_DIR:
        candidato = Path(BI_REPORTS_DIR)
        if not candidato.is_absolute():
            candidato = BASE_DIR / candidato
        if candidato.exists():
            return candidato
        raise FileNotFoundError(f"BI_REPORTS_DIR informado não existe: {candidato}")

    outputs_dir = BASE_DIR / "Notebooks" / "Modelagem" / "outputs"
    if outputs_dir.exists():
        runs = [p for p in outputs_dir.iterdir() if p.is_dir()]
        runs = sorted(runs, key=lambda p: p.stat().st_mtime, reverse=True)
        for run_dir in runs:
            reports_dir = run_dir / "reports"
            if reports_dir.exists():
                return reports_dir

    data_dir = BASE_DIR / "Data"
    if data_dir.exists():
        return data_dir

    raise FileNotFoundError(
        "Não encontrei a pasta de reports do BI. Verifique Notebooks/Modelagem/outputs/<run>/reports ou BI_REPORTS_DIR."
    )


def arquivos_presentes(base_dir: Path, arquivos: Iterable[str]) -> list[str]:
    return [nome for nome in arquivos if (base_dir / nome).exists()]


def carregar_tabela(engine, origem_dir: Path, arquivo_csv: str, nome_tabela: str) -> None:
    caminho_csv = origem_dir / arquivo_csv

    if not caminho_csv.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {caminho_csv}")

    print(f"\nLendo arquivo: {arquivo_csv}")
    df = tentar_ler_csv(caminho_csv)
    df = normalizar_colunas(df)
    df = tratar_tipos(df)

    print(f"Linhas: {len(df):,} | Colunas: {len(df.columns)}")
    print(f"Gravando tabela: {DB_SCHEMA}.{nome_tabela}")

    df.to_sql(
        name=nome_tabela,
        con=engine,
        schema=DB_SCHEMA,
        if_exists="replace",
        index=False,
        chunksize=1000,
        method="multi",
    )

    print(f"Tabela carregada com sucesso: {DB_SCHEMA}.{nome_tabela}")


def criar_indices(engine) -> None:
    comandos = [
        f'CREATE INDEX IF NOT EXISTS ix_bi_real_ds ON {DB_SCHEMA}.bi_timeseries_real_long (ds)',
        f'CREATE INDEX IF NOT EXISTS ix_bi_real_comarca_serventia ON {DB_SCHEMA}.bi_timeseries_real_long (comarca, serventia)',
        f'CREATE INDEX IF NOT EXISTS ix_bi_fc_ds ON {DB_SCHEMA}.bi_forecast_champion_long (ds)',
        f'CREATE INDEX IF NOT EXISTS ix_bi_fc_horizon ON {DB_SCHEMA}.bi_forecast_champion_long (horizon)',
        f'CREATE INDEX IF NOT EXISTS ix_bi_fc_comarca_serventia ON {DB_SCHEMA}.bi_forecast_champion_long (comarca, serventia)',
        f'CREATE INDEX IF NOT EXISTS ix_bi_bt_ds ON {DB_SCHEMA}.bi_backtest_predictions_long (ds)',
        f'CREATE INDEX IF NOT EXISTS ix_bi_bt_horizon ON {DB_SCHEMA}.bi_backtest_predictions_long (horizon)',
        f'CREATE INDEX IF NOT EXISTS ix_bi_bt_comarca_serventia ON {DB_SCHEMA}.bi_backtest_predictions_long (comarca, serventia)',
        f'CREATE INDEX IF NOT EXISTS ix_bi_sw_comarca_serventia ON {DB_SCHEMA}.bi_summary_wide (comarca, serventia)',
        f'CREATE INDEX IF NOT EXISTS ix_bi_sw_last_date ON {DB_SCHEMA}.bi_summary_wide (last_date)',
        f'CREATE INDEX IF NOT EXISTS ix_bi_summary_tribunal_last_date ON {DB_SCHEMA}.bi_summary_tribunal (last_date)',
        f'CREATE INDEX IF NOT EXISTS ix_bi_forecast_tribunal_ds ON {DB_SCHEMA}.bi_forecast_tribunal_long (ds)',
        f'CREATE INDEX IF NOT EXISTS ix_bi_forecast_tribunal_horizon ON {DB_SCHEMA}.bi_forecast_tribunal_long (horizon)',
    ]

    with engine.begin() as conn:
        for sql in comandos:
            try:
                conn.execute(text(sql))
            except Exception:
                pass


# =========================================================
# EXECUÇÃO PRINCIPAL
# =========================================================
def main() -> None:
    validar_variaveis()
    origem_dir = resolve_reports_dir()
    engine = criar_engine()

    print(f"Origem dos CSVs do BI: {origem_dir}")

    obrigatorios_faltando = [
        nome for nome in ARQUIVOS_OBRIGATORIOS if not (origem_dir / nome).exists()
    ]
    if obrigatorios_faltando:
        raise FileNotFoundError(
            f"Arquivos obrigatórios ausentes em {origem_dir}: {', '.join(obrigatorios_faltando)}"
        )

    opcionais_presentes = arquivos_presentes(origem_dir, ARQUIVOS_OPCIONAIS.keys())

    try:
        with engine.begin() as conn:
            conn.execute(text("SELECT 1"))
        print("Conexão com PostgreSQL OK.")

        for arquivo_csv, nome_tabela in ARQUIVOS_OBRIGATORIOS.items():
            carregar_tabela(engine, origem_dir, arquivo_csv, nome_tabela)

        for arquivo_csv in opcionais_presentes:
            carregar_tabela(engine, origem_dir, arquivo_csv, ARQUIVOS_OPCIONAIS[arquivo_csv])

        criar_indices(engine)
        print("\nCarga finalizada com sucesso.")

    except Exception as e:
        print(f"\nErro durante a carga: {e}")
        raise


if __name__ == "__main__":
    main()
