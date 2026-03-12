from pathlib import Path
from urllib.parse import quote_plus
import os
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
CSV_DIR = BASE_DIR / os.getenv("CSV_DIR", "Data")

ARQUIVOS_TABELAS = {
    "bi_backtest_predictions_long.csv": "bi_backtest_predictions_long",
    "bi_forecast_champion_long.csv": "bi_forecast_champion_long",
    "bi_summary_wide.csv": "bi_summary_wide",
    "bi_timeseries_real_long.csv": "bi_timeseries_real_long",
}


# =========================================================
# FUNÇÕES AUXILIARES
# =========================================================
def validar_variaveis():
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

    if not CSV_DIR.exists():
        raise FileNotFoundError(f"Pasta de dados não encontrada: {CSV_DIR}")


def criar_engine():
    senha_codificada = quote_plus(DB_PASSWORD)
    url = (
        f"postgresql+psycopg2://{DB_USER}:{senha_codificada}"
        f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    engine = create_engine(url, pool_pre_ping=True)
    return engine


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
            df = pd.read_csv(
                caminho_csv,
                sep=",",
                encoding=encoding,
                low_memory=False
            )
            return df
        except UnicodeDecodeError:
            continue

    raise UnicodeDecodeError(
        "encoding",
        b"",
        0,
        1,
        f"Não foi possível ler o arquivo {caminho_csv.name} com os encodings testados."
    )


def tratar_tipos(df: pd.DataFrame) -> pd.DataFrame:
    # Colunas de data mais prováveis no seu caso
    colunas_data = ["ds", "last_date"]

    for col in colunas_data:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")

    return df


def carregar_tabela(engine, arquivo_csv: str, nome_tabela: str):
    caminho_csv = CSV_DIR / arquivo_csv

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
        if_exists="replace",   # substitui a tabela se já existir
        index=False,
        chunksize=1000,
        method="multi"
    )

    print(f"Tabela carregada com sucesso: {DB_SCHEMA}.{nome_tabela}")


# =========================================================
# EXECUÇÃO PRINCIPAL
# =========================================================
def main():
    validar_variaveis()
    engine = criar_engine()

    try:
        with engine.begin() as conn:
            conn.execute(text("SELECT 1"))
        print("Conexão com PostgreSQL OK.")

        for arquivo_csv, nome_tabela in ARQUIVOS_TABELAS.items():
            carregar_tabela(engine, arquivo_csv, nome_tabela)

        print("\nCarga finalizada com sucesso.")

    except Exception as e:
        print(f"\nErro durante a carga: {e}")
        raise


if __name__ == "__main__":
    main()