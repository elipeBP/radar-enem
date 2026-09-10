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

# Exposição da porta padrão solicitada na atividade da disciplina (8080)
EXPOSE 8080

# Inicialização da API FastAPI ouvindo na porta 8080
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8080"]
