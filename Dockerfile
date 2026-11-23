# =============================================================================
# Stage 1: Build da interface frontend (React + Vite)
# =============================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# =============================================================================
# Stage 2: Ambiente de execução com Python, FastAPI e Uvicorn
# =============================================================================
FROM python:3.11-slim
WORKDIR /app/Backend

# Instalação das dependências Python
COPY Backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Cópia do código-fonte do Backend
COPY Backend/ .

# Download dos Parquets de produção (gerados pelo ETL, ver etl/ingestion.py).
# Não são commitados no repositório (arquivo de dados, não código -- ver
# .gitignore), então não vêm pela COPY acima: o build do Render clona o
# repo do GitHub, que nunca os tem. Ficam hospedados como asset de uma
# GitHub Release (https://github.com/elipeBP/radar-enem/releases/tag/
# dados-producao-v1) e são baixados aqui, uma vez por build -- não a cada
# vez que a instância acorda do soneca do free tier, o que gastaria banda
# à toa. O caminho etl/producao/ é o default que core/dados.py,
# core/escola.py e core/nota_uf.py já esperam, sem precisar configurar
# nenhuma variável de ambiente.
#
# 2024 (#17): a Trilha de Gênero passou a suportar os dois anos
# (core/genero.py ANOS_DISPONIVEIS). Os Parquets de 2024 também baixam
# aqui, mas NÃO ficam residentes em memória o tempo todo -- só o ano
# padrão (2025) é pré-carregado no startup; 2024 é lido do disco sob
# demanda e fica em cache até outro ano ser pedido (core/dados.py
# obter_dados_do_ano). Isso evita estourar os 512MB de RAM do free tier
# do Render com os dois anos residentes ao mesmo tempo (medido:
# ~285MB/ano em memória).
RUN mkdir -p etl/producao && \
    python -c "import urllib.request; urllib.request.urlretrieve('https://github.com/elipeBP/radar-enem/releases/download/dados-producao-v1/resultados_2025.parquet', 'etl/producao/resultados_2025.parquet')" && \
    python -c "import urllib.request; urllib.request.urlretrieve('https://github.com/elipeBP/radar-enem/releases/download/dados-producao-v1/participantes_2025.parquet', 'etl/producao/participantes_2025.parquet')" && \
    python -c "import urllib.request; urllib.request.urlretrieve('https://github.com/elipeBP/radar-enem/releases/download/dados-producao-v1/resultados_2024.parquet', 'etl/producao/resultados_2024.parquet')" && \
    python -c "import urllib.request; urllib.request.urlretrieve('https://github.com/elipeBP/radar-enem/releases/download/dados-producao-v1/participantes_2024.parquet', 'etl/producao/participantes_2024.parquet')"

# Cópia do build de produção do frontend para servir estaticamente na API
COPY --from=frontend-builder /app/frontend/dist ./api/static

# Exposição da porta padrão solicitada na atividade da disciplina (8080).
# Documental apenas -- não é o que decide em qual porta o processo escuta.
EXPOSE 8080

# Porta de escuta via variável de ambiente PORT, com 8080 como padrão local.
# Necessário porque plataformas de container (ex: Render, Cloud Run) injetam
# a própria porta em PORT na hora do deploy -- se o CMD estivesse travado em
# 8080, o serviço poderia não ser alcançado. Forma shell (sem colchetes) é
# obrigatória aqui: só ela expande variável de ambiente; a forma exec
# (["uvicorn", ...]) não passa pelo shell e trataria "${PORT:-8080}" como
# texto literal, não como substituição.
CMD uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8080}
