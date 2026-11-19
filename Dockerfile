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
