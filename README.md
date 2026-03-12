Este é um projeto full-stack focado na visualização, análise e previsão de taxas de congestionamento. O sistema é composto por scripts de extração e carga de dados em Python (ETL) e um dashboard interativo moderno desenvolvido em Next.js para visualização dos resultados diretamente do banco de dados.

## 🚀 Tecnologias Utilizadas

- **Frontend / Dashboard**: Next.js (React 19), Tailwind CSS, Recharts (Gráficos), e Lucide-react (Ícones).
- **Backend / Script de Carga**: Python, Pandas, SQLAlchemy, e manipulação avançada de arquivos CSV.
- **Banco de Dados**: PostgreSQL.
- **Infraestrutura**: Docker e Docker Compose (para containerização do Frontend).

## 📂 Estrutura do Projeto

```text
BI_Tx_congestionamento/
├── Data/                   # Diretório onde os arquivos CSV originais devem ser colocados.
├── Scripts/                # Scripts Python (ex: Carga_banco.py para carregar CSVs no PostgreSQL).
├── venv/                   # Ambiente virtual Python (recomendado).
├── web/                    # Código fonte do dashboard interativo (Next.js).
├── docker-compose.yml      # Configuração para rodar a aplicação web via Docker.
├── .env                    # Variáveis de ambiente da raiz (usado pelos Scripts em Python).
└── .gitignore              # Configurações de arquivos a serem ignorados pelo git.
```

## 🛠 Pré-requisitos

Para rodar o projeto localmente, certifique-se de ter os seguintes pacotes instalados:
- **Node.js** (versão 18+ recomendada)
- **Python** (versão 3.8+)
- **PostgreSQL** (um banco de dados configurado e rodando localmente ou remotamente)
- **Docker e Docker Compose** (opcional, caso deseje rodar a aplicação em um contêiner)

---

## ⚙️ Como Configurar e Rodar o Projeto

Este projeto consiste de dois passos principais: preencher o banco de dados com suas informações e iniciar o servidor do painel interativo.

### Passo 1: Preparação do Banco de Dados e Carga dos Dados

O script em Python `Carga_banco.py` é responsável por ler os arquivos `.csv` da pasta `Data/` e carregá-los em um banco PostgreSQL, além de padronizar todas as colunas.

1. **Coloque os dados na pasta `Data/`**: Puxando informações do código base, certifique-se de que os seguintes arquivos existam no diretório:
   - `bi_backtest_predictions_long.csv`
   - `bi_forecast_champion_long.csv`
   - `bi_summary_wide.csv`
   - `bi_timeseries_real_long.csv`

2. **Configure as Variáveis de Ambiente do Python**:
   Na raiz do projeto (`BI_Tx_congestionamento/`), crie ou edite o arquivo `.env` indicando as suas credenciais para o banco de dados:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=sua_senha_aqui
   DB_SCHEMA=public
   CSV_DIR=Data
   ```

3. **Crie o ambiente virtual e instale as dependências** (Opcional, mas muito recomendado):
   ```bash
   python -m venv venv
   
   # No Windows (Ativação):
   venv\Scripts\activate
   
   # No Linux/Mac (Ativação):
   source venv/bin/activate
   
   # Instalando Pacotes
   pip install pandas python-dotenv sqlalchemy psycopg2
   ```

4. **Execute o script de carga**:
   ```bash
   python Scripts/Carga_banco.py
   ```
   *Após rodar o script, verifique o log no console. O processo vai ler os arquivos `.csv`, tratar dados e datas, limpar as colunas desnecessárias e gravar as tabelas no PostgreSQL definido.*

---

### Passo 2: Executando a Interface Web (Dashboard)

A interface web processa e exibe dados analíticos de forma que você visualize as métricas carregadas.

1. **Acesse a pasta da sua aplicação Frontend `web/`**:
   ```bash
   cd web
   ```

2. **Configure as Variáveis de Ambiente do Frontend**:
   Crie ou edite o arquivo `.env.local` na pasta `web/` com a string de conexão para que o projeto saiba como se conectar aos dados carregados no passo 1:
   ```env
   DATABASE_URL=postgresql://usuario:senha@localhost:5432/postgres
   DATABASE_SSL=false
   ALERT_THRESHOLD=60
   ```

3. **Instale as dependências do Node.js**:
   Dentro da pasta `web/`, rode para baixar o `node_modules`:
   ```bash
   npm install
   ```

4. **Inicie o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

5. **Acesse a aplicação**:
   Abra o seu navegador de preferência e acesse o endereço padrão: [http://localhost:3000](http://localhost:3000).

---

### Alternativa: Rodando a Interface Web com Docker

Se você preferir rodar a camada "web" contêinerizada ou for rodar esse projeto em algum servidor em produção de forma rápida:

1. Certifique-se de que você já configurou o arquivo `web/.env.local`.
2. Volte para a raiz do projeto (onde está o `docker-compose.yml`) e suba os serviços:
   ```bash
   docker-compose up -d --build
   ```
   O contêiner `tx-congestionamento-web` será criado e, assim como ao rodar manualmente, a aplicação passará a escutar exposta em [http://localhost:3000](http://localhost:3000).

---

## 📝 Documentação das Variáveis de Ambiente

### `.env` (Raiz do Projeto - Utilizado pelo Script Python)
- `DB_HOST`: Hostman/IP do banco de dados (ex: `localhost`)
- `DB_PORT`: Porta do banco de dados (ex: `5432`)
- `DB_NAME`: Nome do banco de dados (ex: `postgres`)
- `DB_USER`: Usuário com acesso de gravação ao banco
- `DB_PASSWORD`: Senha do usuário selecionado
- `DB_SCHEMA`: Schema do banco a ser utilizado (padrão: `public`)
- `CSV_DIR`: Diretório relativo à raiz onde se encontram os CSVs (padrão: `Data`)

### `web/.env.local` (Pasta do Frontend - Utilizado pelo Next.js)
- `DATABASE_URL`: URL completa de conexão no padrão URI. Exemplo: `postgresql://user:password@host:port/database`
- `DATABASE_SSL`: Determina se deve utilizar SSL na comunicação contínua com banco (`true`/`false`).
- `ALERT_THRESHOLD`: Limite em porcentagem para acionar alertas de limite no dashboard.
